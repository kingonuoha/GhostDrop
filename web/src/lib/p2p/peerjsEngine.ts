/**
 * PeerJS signaling engine (0.peerjs.com by default).
 * Source: docs/06-protocol-and-tech-spec.md section 2 and decisions.md D-002, D-003.
 *
 * Host id: ghostdrop-room-CODE
 * Guest id: ghostdrop-peer-uuid8
 * Host relays every control packet and every D-011 header plus binary pair to
 * the other peers in the room, under the same drain gate as streamFile.
 */

import Peer from 'peerjs'
import type { DataConnection, PeerOptions } from 'peerjs'

import {
  BUFFERED_LOW_THRESHOLD,
  CHUNK_SIZE_BYTES,
  isDeviceType,
  isWirePacket,
  parseWirePacket,
  PEER_PREFIX,
  ROOM_PREFIX,
  serializeWirePacket,
  toBinaryFrame,
} from '../../types/protocol'
import type {
  DeviceType,
  FileChunkPacket,
  HelloPeerPacket,
  TransferProgress,
  WirePacket,
} from '../../types/protocol'
import type {
  P2PConnectOptions,
  P2PEventListener,
  P2PEventMap,
  P2PEventName,
  P2PSendOptions,
  P2PSignalingAdapter,
  P2PStatus,
  P2PTransport,
  PeerInfo,
  PeerRole,
} from './adapter'
import {
  createAbortError,
  P2PError,
  toP2PError,
  type P2PErrorCode,
} from './errors'
import { isValidRoomCode, normalizeRoomCode, peerPeerId, roomPeerId } from './roomCode'
import { waitForBufferDrain } from './fileStreamer'
import { unmaskLocalIceIps } from './iceUnmask'

const DEFAULT_CONNECT_TIMEOUT_MS = 15000
const DEFAULT_MAX_QUEUED_FRAMES = 128
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 15000
/**
 * Per tier signaling budget. Every tier except the last gets this short window
 * so an unreachable endpoint cannot hold the room hostage (decisions.md D-014
 * item 2, tightened to 2200 ms by D-016 item 4).
 */
const SIGNALING_TIER_TIMEOUT_MS = 2200
/**
 * Final tier cap when the caller passed no explicit `connectTimeoutMs`.
 *
 * `navigator.onLine` is `true` on a Wi-Fi router with no internet and on a
 * phone hotspot with mobile data off, so the cloud tier is still tried. Capping
 * it at 3200 ms lets a room fail over to the Offline Direct engine in about
 * three seconds instead of freezing for 18.5 s (decisions.md D-016 item 4).
 * An explicit `connectTimeoutMs` from a caller or a unit test always wins.
 */
const CLOUD_SIGNALING_TIMEOUT_MS = 3200

const DEFAULT_STUN_URLS: readonly string[] = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
]

export interface PeerJsEngineOptions {
  /** Injectable Peer factory, default is the real PeerJS client. */
  createPeer?: (id: string, options: PeerOptions) => Peer
  iceServers?: readonly RTCIceServer[]
  /** Overrides VITE_PEER_* discovery, used by tests and local signaling. */
  serverOptions?: PeerServerOptions
  connectTimeoutMs?: number
  maxQueuedFrames?: number
  maxReconnectAttempts?: number
  now?: () => number
}

/** Subset of PeerJS options that selects the signaling server. */
export interface PeerServerOptions {
  host?: string
  port?: number
  path?: string
  key?: string
  secure?: boolean
}

type Listener = (payload: unknown) => void

type OutboundFrame =
  | { kind: 'text'; text: string }
  | { kind: 'binary'; data: ArrayBuffer }
  | { kind: 'frame'; headerText: string; data: ArrayBuffer }

function readEnv(): Record<string, string | undefined> {
  const env: unknown = import.meta.env
  if (typeof env !== 'object' || env === null) return {}
  return env as Record<string, string | undefined>
}

/**
 * True while the browser reports no network at all. Offline signaling and ICE
 * both depend on this, so it lives in one place.
 */
function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.onLine === false
}

/**
 * True for a loopback, RFC1918, link-local or mDNS hostname. Used twice:
 * signaling falls back to the same-origin Vite proxy on these origins, and ICE
 * skips public STUN because two devices on one Wi-Fi or hotspot are already in
 * the same local routing domain (decisions.md D-014 item 2).
 */
export function isPrivateLanHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase()
  if (host.length === 0) return false
  const bare = host.replace(/^\[/, '').replace(/\]$/, '')

  if (bare === 'localhost' || bare === '127.0.0.1' || bare === '::1' || bare === '0.0.0.0') return true
  if (bare.endsWith('.localhost') || bare.endsWith('.local')) return true
  if (bare.startsWith('fe80:') || bare.startsWith('fc') || bare.startsWith('fd')) return true

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(bare)
  if (!ipv4) return false

  const first = Number(ipv4[1])
  const second = Number(ipv4[2])
  if (first === 10) return true
  if (first === 192 && second === 168) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 169 && second === 254) return true
  return false
}

function buildTurnServer(env: Record<string, string | undefined>, url: string): RTCIceServer {
  const server: RTCIceServer = { urls: url }
  const username = env.VITE_TURN_USERNAME?.trim()
  const credential = env.VITE_TURN_CREDENTIAL?.trim()
  if (username) server.username = username
  if (credential) server.credential = credential
  return server
}

/**
 * STUN defaults plus optional VITE_TURN_* credentials for symmetric NATs.
 *
 * Offline sessions, and sessions on a private LAN or hotspot origin, return an
 * empty list (or TURN only when VITE_TURN_URL is set). Two devices behind the
 * same Wi-Fi or hotspot reach each other with `host` candidates, so an
 * unreachable `stun.l.google.com` lookup would only add a 5 to 10 second DNS
 * stall before ICE gathers anything at all.
 */
export function buildIceServers(
  env: Record<string, string | undefined> = readEnv(),
  hostname?: string,
): RTCIceServer[] {
  const turnUrl = env.VITE_TURN_URL?.trim()
  const host = hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname)
  const localOnly = isOffline() || isPrivateLanHost(host)

  if (localOnly) {
    return turnUrl ? [buildTurnServer(env, turnUrl)] : []
  }

  const servers: RTCIceServer[] = [{ urls: [...DEFAULT_STUN_URLS] }]
  if (turnUrl) servers.push(buildTurnServer(env, turnUrl))
  return servers
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError('Connection attempt aborted')
}

const LOCAL_PEER_PORT_DEFAULT = 9000
const REMOTE_PEER_PORT_DEFAULT = 443
const PEER_KEY_DEFAULT = 'peerjs'
const PEER_PATH_DEFAULT = '/'
const CLOUD_PEER_HOST = '0.peerjs.com'

/** Public PeerJS cloud defaults, used last and only while online. */
const CLOUD_PEER_OPTIONS: PeerServerOptions = {
  host: CLOUD_PEER_HOST,
  port: REMOTE_PEER_PORT_DEFAULT,
  secure: true,
  path: PEER_PATH_DEFAULT,
  key: PEER_KEY_DEFAULT,
}

function readPort(raw: string | undefined, fallback: number): number {
  const trimmed = raw?.trim()
  if (!trimmed) return fallback
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.trunc(value)
}

function readFlag(raw: string | undefined, fallback: boolean): boolean {
  const trimmed = raw?.trim().toLowerCase()
  if (!trimmed) return fallback
  if (trimmed === '1' || trimmed === 'true' || trimmed === 'yes') return true
  if (trimmed === '0' || trimmed === 'false' || trimmed === 'no') return false
  return fallback
}

/**
 * Same-origin signaling options.
 *
 * PeerJS appends `peerjs` to `path`, so `path: '/'` plus `key: 'peerjs'` hits
 * `/peerjs` on the current origin, which the Vite dev and preview server proxy
 * to the embedded PeerJS server on 127.0.0.1:9000. One port, one firewall rule
 * (decisions.md D-014 item 2).
 */
function buildSameOriginOptions(
  env: Record<string, string | undefined>,
): PeerServerOptions | null {
  if (typeof window === 'undefined') return null

  const { hostname, port, protocol } = window.location
  if (!hostname) return null

  return {
    host: hostname,
    port: readPort(port, protocol === 'https:' ? REMOTE_PEER_PORT_DEFAULT : 80),
    secure: protocol === 'https:',
    path: env.VITE_PEER_PATH?.trim() || PEER_PATH_DEFAULT,
    key: env.VITE_PEER_KEY?.trim() || PEER_KEY_DEFAULT,
  }
}

/**
 * Signaling server discovery.
 *
 * `VITE_PEER_HOST=auto`, a private LAN or hotspot origin, and an offline browser
 * all resolve to same-origin signaling first, in dev, preview and production
 * alike. A concrete `VITE_PEER_HOST` is still honored for a deployed self hosted
 * PeerJS server, and no configuration at all keeps the cloud defaults.
 */
export function buildPeerServerOptions(
  env: Record<string, string | undefined> = readEnv(),
): PeerServerOptions {
  const host = env.VITE_PEER_HOST?.trim()
  const path = env.VITE_PEER_PATH?.trim() || PEER_PATH_DEFAULT
  const key = env.VITE_PEER_KEY?.trim() || PEER_KEY_DEFAULT

  if (host && host !== 'auto') {
    return {
      host,
      port: readPort(env.VITE_PEER_PORT, REMOTE_PEER_PORT_DEFAULT),
      secure: readFlag(env.VITE_PEER_SECURE, true),
      path,
      key,
    }
  }

  const localOrigin = typeof window !== 'undefined' && isPrivateLanHost(window.location.hostname)
  if (host === 'auto' || localOrigin || isOffline()) {
    const sameOrigin = buildSameOriginOptions(env)
    if (sameOrigin) return sameOrigin
  }

  return {}
}

function sameEndpoint(left: PeerServerOptions, right: PeerServerOptions): boolean {
  return (
    (left.host ?? '') === (right.host ?? '') &&
    (left.port ?? 0) === (right.port ?? 0) &&
    (left.secure ?? false) === (right.secure ?? false) &&
    (left.path ?? PEER_PATH_DEFAULT) === (right.path ?? PEER_PATH_DEFAULT) &&
    (left.key ?? PEER_KEY_DEFAULT) === (right.key ?? PEER_KEY_DEFAULT)
  )
}

/**
 * Ordered signaling fallback for `PeerJsEngine.connect()`:
 * 1. Same-origin Vite proxy, which works offline on Wi-Fi and on a hotspot.
 * 2. Direct LAN port 9000, for a manual `npm run signal` terminal.
 * 3. Cloud PeerJS, only while the browser reports a connection.
 *
 * A concrete `VITE_PEER_HOST` short circuits the list: an explicitly configured
 * server is authoritative and must never be silently replaced.
 */
export function buildPeerServerCandidates(
  env: Record<string, string | undefined> = readEnv(),
): PeerServerOptions[] {
  const configured = env.VITE_PEER_HOST?.trim()
  if (configured && configured !== 'auto') return [buildPeerServerOptions(env)]

  const offline = isOffline()
  const localOrigin = typeof window !== 'undefined' && isPrivateLanHost(window.location.hostname)
  const ordered: PeerServerOptions[] = []

  if (localOrigin || offline) {
    const sameOrigin = buildSameOriginOptions(env)
    if (sameOrigin) ordered.push(sameOrigin)

    if (typeof window !== 'undefined' && window.location.hostname) {
      ordered.push({
        host: window.location.hostname,
        port: LOCAL_PEER_PORT_DEFAULT,
        secure: false,
        path: PEER_PATH_DEFAULT,
        key: PEER_KEY_DEFAULT,
      })
    }
  }

  if (!offline) ordered.push(CLOUD_PEER_OPTIONS)

  const unique: PeerServerOptions[] = []
  for (const candidate of ordered) {
    if (!unique.some((existing) => sameEndpoint(existing, candidate))) unique.push(candidate)
  }

  return unique.length > 0 ? unique : [CLOUD_PEER_OPTIONS]
}

/**
 * D-011 frame budget: every binary frame carries 1 to 16384 bytes.
 * Returns the typed error instead of throwing so callers can reject cleanly.
 */
function frameBudgetError(data: ArrayBuffer): P2PError | null {
  if (data.byteLength === 0) {
    return new P2PError('PROTOCOL_ERROR', 'Binary frame must not be empty')
  }
  if (data.byteLength > CHUNK_SIZE_BYTES) {
    return new P2PError('PROTOCOL_ERROR', 'Binary frame exceeded the 16KB budget')
  }
  return null
}

/**
 * RTCDataChannel transport with a FIFO frame queue.
 * Text frames sent before the channel opens are queued so the handshake
 * survives slow ICE negotiation. Binary frames reject instead of buffering
 * because the streamer owns backpressure, and every binary frame is checked
 * against the 16384-byte D-011 budget before it is queued.
 */
class DataChannelTransport implements P2PTransport {
  readonly peerId: string
  private readonly connection: DataConnection
  private readonly maxQueuedFrames: number
  private readonly onError: (error: P2PError) => void
  private readonly pending: OutboundFrame[] = []
  private chain: Promise<void> = Promise.resolve()
  private closed = false
  private threshold = BUFFERED_LOW_THRESHOLD

  constructor(
    connection: DataConnection,
    maxQueuedFrames: number,
    onError: (error: P2PError) => void,
  ) {
    this.connection = connection
    this.peerId = connection.peer
    this.maxQueuedFrames = maxQueuedFrames
    this.onError = onError
    this.applyThreshold()
  }

  get isOpen(): boolean {
    return !this.closed && this.connection.open
  }

  get bufferedAmount(): number {
    return this.connection.dataChannel?.bufferedAmount ?? 0
  }

  get bufferedAmountLowThreshold(): number {
    return this.connection.dataChannel?.bufferedAmountLowThreshold ?? this.threshold
  }

  set bufferedAmountLowThreshold(value: number) {
    this.threshold = value
    this.applyThreshold()
  }

  sendText(text: string): void {
    if (this.closed) throw new P2PError('NO_OPEN_CHANNEL', 'Channel is closed')
    if (this.isOpen) {
      void this.schedule({ kind: 'text', text }).catch((error: unknown) => {
        if (this.closed) return
        this.onError(toP2PError(error, 'SIGNALING_ERROR'))
      })
      return
    }
    if (this.pending.length >= this.maxQueuedFrames) {
      throw new P2PError('QUEUE_OVERFLOW', 'Outbound frame queue is full')
    }
    this.pending.push({ kind: 'text', text })
  }

  sendBinary(data: ArrayBuffer): Promise<void> {
    const budget = frameBudgetError(data)
    if (budget) return Promise.reject(budget)
    if (!this.isOpen) {
      return Promise.reject(new P2PError('NO_OPEN_CHANNEL', 'Channel is not open'))
    }
    return this.schedule({ kind: 'binary', data })
  }

  sendFrame(headerText: string, data: ArrayBuffer): Promise<void> {
    const budget = frameBudgetError(data)
    if (budget) return Promise.reject(budget)
    if (!this.isOpen) {
      return Promise.reject(new P2PError('NO_OPEN_CHANNEL', 'Channel is not open'))
    }
    return this.schedule({ kind: 'frame', headerText, data })
  }

  onBufferedAmountLow(listener: () => void): () => void {
    const channel = this.connection.dataChannel
    if (!channel) return () => undefined

    const handler = () => listener()
    channel.addEventListener('bufferedamountlow', handler)
    return () => channel.removeEventListener('bufferedamountlow', handler)
  }

  /** Flushes text frames queued before the channel opened. */
  pump(): void {
    if (!this.isOpen) return
    const queued = this.pending.splice(0, this.pending.length)
    for (const frame of queued) {
      void this.schedule(frame).catch((error: unknown) => {
        if (this.closed) return
        this.onError(toP2PError(error, 'SIGNALING_ERROR'))
      })
    }
  }

  close(): void {
    this.closed = true
    this.pending.length = 0
    this.chain = Promise.resolve()
  }

  private applyThreshold(): void {
    const channel = this.connection.dataChannel
    if (channel) channel.bufferedAmountLowThreshold = this.threshold
  }

  private schedule(frame: OutboundFrame): Promise<void> {
    const run = () => this.write(frame)
    const next = this.chain.then(run, run)
    this.chain = next.catch(() => undefined)
    return next
  }

  private async write(frame: OutboundFrame): Promise<void> {
    if (!this.isOpen) throw new P2PError('NO_OPEN_CHANNEL', 'Channel is not open')

    if (frame.kind === 'text') {
      await this.connection.send(frame.text)
      return
    }
    if (frame.kind === 'binary') {
      await this.connection.send(frame.data)
      return
    }
    await this.connection.send(frame.headerText)
    await this.connection.send(frame.data)
  }
}

export class PeerJsEngine implements P2PSignalingAdapter {
  private readonly createPeer: (id: string, options: PeerOptions) => Peer
  private readonly iceServers: readonly RTCIceServer[]
  private readonly serverOptions: PeerServerOptions | null
  private readonly connectTimeoutMs: number
  private readonly hasExplicitConnectTimeout: boolean
  private readonly maxQueuedFrames: number
  private readonly maxReconnectAttempts: number
  private readonly now: () => number

  private peer: Peer | null = null
  private peerCleanups: Array<() => void> = []
  private currentRole: PeerRole | null = null
  private currentRoomCode = ''
  private currentPeerId = ''
  private deviceNameValue = 'GhostDrop device'
  private deviceTypeValue: DeviceType = 'desktop'
  private currentStatus: P2PStatus = 'idle'

  private readonly connections = new Map<string, DataConnection>()
  private readonly transports = new Map<string, DataChannelTransport>()
  private readonly peerInfos = new Map<string, PeerInfo>()
  private readonly connectionCleanups = new Map<string, Array<() => void>>()
  private readonly listeners = new Map<P2PEventName, Set<Listener>>()
  /** FILE_CHUNK header held until its binary frame lands, keyed by source peer. */
  private readonly pendingRelayHeaders = new Map<string, FileChunkPacket>()
  /** Per-target relay chain so one drain gate runs at a time per channel. */
  private readonly relayChains = new Map<string, Promise<void>>()

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private destroyed = false
  private intentionalDisconnect = false
  /**
   * True while a non-final signaling tier is being tried. Intermediate
   * `server-error` style failures are expected during fallback, so they are not
   * surfaced as user facing errors until every tier has failed.
   */
  private suppressPeerErrors = false

  constructor(options: PeerJsEngineOptions = {}) {
    this.createPeer = options.createPeer ?? ((id, peerOptions) => new Peer(id, peerOptions))
    this.iceServers = options.iceServers ?? buildIceServers()
    this.serverOptions = options.serverOptions ?? null
    this.connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
    this.hasExplicitConnectTimeout = options.connectTimeoutMs !== undefined
    this.maxQueuedFrames = options.maxQueuedFrames ?? DEFAULT_MAX_QUEUED_FRAMES
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS
    this.now = options.now ?? (() => Date.now())
  }

  get role(): PeerRole | null {
    return this.currentRole
  }

  get roomCode(): string {
    return this.currentRoomCode
  }

  get localPeerId(): string {
    return this.currentPeerId
  }

  get status(): P2PStatus {
    return this.currentStatus
  }

  get peers(): readonly PeerInfo[] {
    return [...this.peerInfos.values()]
  }

  isConnected(): boolean {
    return this.currentStatus === 'connected'
  }

  async connect(options: P2PConnectOptions): Promise<void> {
    if (this.destroyed) throw new P2PError('DESTROYED', 'Adapter already destroyed')
    if (
      this.currentStatus === 'connecting' ||
      this.currentStatus === 'connected' ||
      this.currentStatus === 'reconnecting'
    ) {
      throw new P2PError('ALREADY_CONNECTED', 'A signaling session is already active')
    }

    const code = normalizeRoomCode(options.roomCode)
    if (!isValidRoomCode(code)) {
      throw new P2PError('INVALID_ROOM_CODE', 'Room code must be 6 valid characters')
    }

    throwIfAborted(options.signal)

    this.intentionalDisconnect = false
    this.currentRole = options.role
    this.currentRoomCode = code
    this.deviceNameValue = options.deviceName
    this.deviceTypeValue = options.deviceType
    this.currentPeerId = options.role === 'host' ? roomPeerId(code) : peerPeerId()
    this.setStatus('connecting')

    // Reveal raw RFC1918 hotspot and LAN IPv4 candidates before ICE gathering
    // starts, so a phone hotspot never depends on `.local` mDNS hostnames that
    // it drops. Never throws and never prompts on its own (decisions.md D-016).
    await unmaskLocalIceIps()

    const candidates = this.serverOptions ? [this.serverOptions] : buildPeerServerCandidates()
    let openedPeer: Peer | null = null
    let lastError: unknown = null

    for (let index = 0; index < candidates.length; index += 1) {
      const isLast = index === candidates.length - 1
      if (options.signal?.aborted) {
        lastError = createAbortError('Connection attempt aborted')
        break
      }

      const peer = this.createPeer(this.currentPeerId, {
        debug: 0,
        config: { iceServers: [...this.iceServers] },
        // Server discovery spreads last so host, port, path, secure and key win.
        ...candidates[index],
      })
      this.peer = peer
      this.attachPeer(peer)
      // Only the final tier may report a signaling error to the UI.
      this.suppressPeerErrors = !isLast

      try {
        await this.waitForSignaling(peer, options.signal, this.tierTimeoutMs(isLast))
        openedPeer = peer
        break
      } catch (error) {
        lastError = error
        this.teardownPeer()
        if (options.signal?.aborted) break
      }
    }

    this.suppressPeerErrors = false

    if (!openedPeer) {
      this.teardownPeer()
      this.setStatus('disconnected', 'Connection attempt failed')
      throw toP2PError(lastError, 'SIGNALING_ERROR')
    }

    try {
      if (options.role === 'peer') {
        const connection = openedPeer.connect(roomPeerId(code), {
          serialization: 'binary',
          reliable: true,
          metadata: {
            deviceName: options.deviceName,
            deviceType: options.deviceType,
          },
        })
        await this.attachConnection(connection, options.signal)
      }

      this.reconnectAttempt = 0
      this.setStatus('connected')
    } catch (error) {
      this.teardownPeer()
      this.setStatus('disconnected', 'Connection attempt failed')
      throw toP2PError(error, 'SIGNALING_ERROR')
    }
  }

  disconnect(): void {
    this.intentionalDisconnect = true
    this.clearReconnectTimer()
    this.dropAllConnections('disconnect')
    this.teardownPeer()
    this.setStatus('disconnected')
  }

  destroy(): void {
    if (this.destroyed) return
    this.intentionalDisconnect = true
    this.destroyed = true
    this.clearReconnectTimer()
    this.dropAllConnections('destroy')
    this.teardownPeer()
    this.setStatus('destroyed')
    this.listeners.clear()
  }

  send(packet: WirePacket, options?: P2PSendOptions): void {
    if (!isWirePacket(packet)) {
      this.emitError(new P2PError('PROTOCOL_ERROR', 'Refused to send an invalid packet'))
      return
    }
    const raw = serializeWirePacket(packet)
    for (const transport of this.resolveTargets(options)) {
      try {
        transport.sendText(raw)
      } catch (error) {
        this.emitError(toP2PError(error, 'QUEUE_OVERFLOW'))
      }
    }
  }

  broadcast(packet: WirePacket): void {
    this.send(packet)
  }

  async sendBinary(data: ArrayBuffer, options?: P2PSendOptions): Promise<void> {
    const budget = frameBudgetError(data)
    if (budget) throw budget

    const targets = this.resolveTargets(options)
    if (targets.length === 0) {
      throw new P2PError('NO_OPEN_CHANNEL', 'No open channel for a binary frame')
    }

    const results = await Promise.allSettled(
      targets.map((transport) => transport.sendBinary(data)),
    )
    const failure = results.find((result) => result.status === 'rejected')
    if (failure && failure.status === 'rejected') {
      throw toP2PError(failure.reason, 'NO_OPEN_CHANNEL')
    }
  }

  getTransport(peerId: string): P2PTransport | null {
    return this.transports.get(peerId) ?? null
  }

  reportTransferProgress(progress: TransferProgress): void {
    this.emit('transfer:progress', progress)
  }

  on<K extends P2PEventName>(event: K, listener: P2PEventListener<K>): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener>()
    set.add(listener as Listener)
    this.listeners.set(event, set)
    return () => this.off(event, listener)
  }

  off<K extends P2PEventName>(event: K, listener: P2PEventListener<K>): void {
    const set = this.listeners.get(event)
    if (!set) return
    set.delete(listener as Listener)
    if (set.size === 0) this.listeners.delete(event)
  }

  /**
   * Per tier signaling budget.
   *
   * Non final tiers always use the short window. The final tier keeps an
   * explicit `connectTimeoutMs` so a caller or a unit test stays in control,
   * and otherwise drops to the cloud cap so an unreachable signaling server
   * fails over to the Offline Direct engine in about three seconds
   * (decisions.md D-016 item 4).
   */
  private tierTimeoutMs(isLast: boolean): number {
    if (!isLast) return SIGNALING_TIER_TIMEOUT_MS
    if (this.hasExplicitConnectTimeout) return this.connectTimeoutMs
    return Math.min(this.connectTimeoutMs, CLOUD_SIGNALING_TIMEOUT_MS)
  }

  private attachPeer(peer: Peer): void {
    const onOpen = () => {
      this.reconnectAttempt = 0
      this.clearReconnectTimer()
      if (this.currentStatus === 'reconnecting') this.setStatus('connected')
    }
    const onConnection = (connection: DataConnection) => {
      if (this.currentRole !== 'host') return
      void this.attachConnection(connection).catch((error: unknown) => {
        this.emitError(toP2PError(error, 'SIGNALING_ERROR'))
      })
    }
    const onError = (error: unknown) => {
      const typed = toP2PError(error, 'SIGNALING_ERROR')
      // A failed non-final signaling tier is expected during fallback.
      if (this.suppressPeerErrors) return
      this.emitError(typed)
    }
    const onDisconnected = () => {
      this.handleSignalingLost()
    }
    const onClose = () => {
      if (this.intentionalDisconnect || this.destroyed) return
      this.setStatus('disconnected', 'Signaling connection closed')
    }

    peer.on('open', onOpen)
    peer.on('connection', onConnection)
    peer.on('error', onError)
    peer.on('disconnected', onDisconnected)
    peer.on('close', onClose)

    this.peerCleanups = [
      () => peer.off('open', onOpen),
      () => peer.off('connection', onConnection),
      () => peer.off('error', onError),
      () => peer.off('disconnected', onDisconnected),
      () => peer.off('close', onClose),
    ]
  }

  private waitForSignaling(peer: Peer, signal?: AbortSignal, timeoutMs?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false
      let cleanup: () => void = () => undefined

      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        cleanup()
        if (error) reject(error)
        else resolve()
      }

      const onOpen = () => finish()
      const onError = (error: unknown) => {
        finish(toP2PError(error, 'SIGNALING_ERROR'))
      }
      const onClose = () => {
        finish(new P2PError('SIGNALING_ERROR', 'Signaling closed before it opened'))
      }
      const onAbort = () => finish(createAbortError('Connection attempt aborted'))

      const timer = setTimeout(() => {
        finish(new P2PError('CONNECT_TIMEOUT', 'Signaling did not open in time'))
      }, timeoutMs ?? this.connectTimeoutMs)

      cleanup = () => {
        clearTimeout(timer)
        peer.off('open', onOpen)
        peer.off('error', onError)
        peer.off('close', onClose)
        signal?.removeEventListener('abort', onAbort)
      }

      peer.on('open', onOpen)
      peer.on('error', onError)
      peer.on('close', onClose)
      signal?.addEventListener('abort', onAbort, { once: true })
      if (signal?.aborted) onAbort()
    })
  }

  private attachConnection(connection: DataConnection, signal?: AbortSignal): Promise<void> {
    const peerId = connection.peer
    this.connections.set(peerId, connection)
    this.transports.set(
      peerId,
      new DataChannelTransport(connection, this.maxQueuedFrames, (error) => {
        this.emitError(error)
      }),
    )
    this.peerInfos.set(peerId, this.readMetadata(connection, peerId))

    const onOpen = () => this.afterConnectionOpen(peerId)
    const onData = (data: unknown) => this.handleData(peerId, data)
    const onClose = () => this.dropConnection(peerId, 'closed')
    const onError = (error: unknown) => this.emitError(toP2PError(error, 'PROTOCOL_ERROR'))

    connection.on('open', onOpen)
    connection.on('data', onData)
    connection.on('close', onClose)
    connection.on('error', onError)

    this.connectionCleanups.set(peerId, [
      () => connection.off('open', onOpen),
      () => connection.off('data', onData),
      () => connection.off('close', onClose),
      () => connection.off('error', onError),
    ])

    if (connection.open) {
      this.afterConnectionOpen(peerId)
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      let settled = false
      let cleanup: () => void = () => undefined

      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        cleanup()
        if (error) reject(error)
        else resolve()
      }

      const handleOpen = () => finish()
      const handleClose = () => {
        finish(new P2PError('SIGNALING_ERROR', 'Peer channel closed before it opened'))
      }
      const handleError = (error: unknown) => {
        finish(toP2PError(error, 'SIGNALING_ERROR'))
      }
      const handleAbort = () => finish(createAbortError('Connection attempt aborted'))

      const timer = setTimeout(() => {
        finish(new P2PError('CONNECT_TIMEOUT', 'Peer channel did not open in time'))
      }, this.connectTimeoutMs)

      cleanup = () => {
        clearTimeout(timer)
        connection.off('open', handleOpen)
        connection.off('close', handleClose)
        connection.off('error', handleError)
        signal?.removeEventListener('abort', handleAbort)
      }

      connection.on('open', handleOpen)
      connection.on('close', handleClose)
      connection.on('error', handleError)
      signal?.addEventListener('abort', handleAbort, { once: true })
      if (signal?.aborted) handleAbort()
    })
  }

  private afterConnectionOpen(peerId: string): void {
    const transport = this.transports.get(peerId)
    const info = this.peerInfos.get(peerId)
    if (!transport) return

    transport.pump()
    if (info) this.emit('peer:join', info)

    const hello: HelloPeerPacket = {
      type: 'HELLO_PEER',
      peerId: this.currentPeerId,
      deviceName: this.deviceNameValue,
      deviceType: this.deviceTypeValue,
    }

    try {
      transport.sendText(serializeWirePacket(hello))
    } catch (error) {
      this.emitError(toP2PError(error, 'QUEUE_OVERFLOW'))
    }
  }

  private handleData(fromPeerId: string, data: unknown): void {
    if (typeof data === 'string') {
      const packet = parseWirePacket(data)
      if (!packet) {
        this.emitError(new P2PError('PROTOCOL_ERROR', 'Malformed packet dropped'))
        return
      }
      this.handlePacket(fromPeerId, packet)
      return
    }

    const frame = toBinaryFrame(data)
    if (!frame) {
      this.emitError(new P2PError('PROTOCOL_ERROR', 'Unsupported binary frame dropped'))
      return
    }
    this.handleBinary(fromPeerId, frame)
  }

  private handlePacket(fromPeerId: string, packet: WirePacket): void {
    if (packet.type === 'HELLO_PEER') {
      // A HELLO is only authoritative for the peer on the other end of this
      // connection. A relayed HELLO would relabel the host with a third peer
      // name, so it is dropped here and never forwarded.
      if (packet.peerId !== fromPeerId) return
      this.updatePeerInfo(fromPeerId, packet)
    }

    this.emit('packet', { packet, from: fromPeerId })

    if (this.currentRole !== 'host' || this.transports.size <= 1) return
    // Guests announce themselves directly on connect, so relaying HELLO_PEER
    // would only duplicate presence and risk a relay loop.
    if (packet.type === 'HELLO_PEER') return

    if (packet.type === 'FILE_CHUNK') {
      // Hold the header until its binary frame arrives so the relay can emit an
      // atomic D-011 pair through the drain gate instead of two loose frames.
      this.pendingRelayHeaders.set(fromPeerId, packet)
      return
    }

    const raw = serializeWirePacket(packet)
    for (const [peerId, transport] of this.transports) {
      if (peerId === fromPeerId) continue
      try {
        transport.sendText(raw)
      } catch (error) {
        this.emitError(toP2PError(error, 'QUEUE_OVERFLOW'))
      }
    }
  }

  private handleBinary(fromPeerId: string, data: ArrayBuffer): void {
    this.emit('binary', { data, from: fromPeerId })

    const header = this.pendingRelayHeaders.get(fromPeerId)
    if (header) this.pendingRelayHeaders.delete(fromPeerId)

    if (this.currentRole !== 'host' || this.transports.size <= 1) return

    if (!header) {
      this.emitError(
        new P2PError('PROTOCOL_ERROR', 'Binary frame arrived without a FILE_CHUNK header'),
      )
      return
    }

    const headerText = serializeWirePacket(header)
    for (const [peerId, transport] of this.transports) {
      if (peerId === fromPeerId) continue
      this.enqueueRelayPair(peerId, transport, headerText, data)
    }
  }

  /**
   * Relays one D-011 header plus binary pair to a single target after the
   * channel has drained below MAX_BUFFERED_AMOUNT, exactly like the local
   * streamFile path. Pairs to the same target run one at a time, so a relaying
   * host never grows the PeerJS buffer without bound and never pauses between
   * a FILE_CHUNK header and its binary frame.
   */
  private enqueueRelayPair(
    peerId: string,
    transport: DataChannelTransport,
    headerText: string,
    data: ArrayBuffer,
  ): void {
    const previous = this.relayChains.get(peerId) ?? Promise.resolve()
    const write = () => this.writeRelayPair(transport, headerText, data)
    const next = previous.then(write, write)
    const guarded = next.catch((error: unknown) => {
      if (!transport.isOpen) return
      this.emitError(toP2PError(error, 'NO_OPEN_CHANNEL'))
    })

    this.relayChains.set(peerId, guarded)
    void guarded.finally(() => {
      if (this.relayChains.get(peerId) === guarded) this.relayChains.delete(peerId)
    })
  }

  private async writeRelayPair(
    transport: DataChannelTransport,
    headerText: string,
    data: ArrayBuffer,
  ): Promise<void> {
    await waitForBufferDrain(transport)
    await transport.sendFrame(headerText, data)
  }

  private updatePeerInfo(fromPeerId: string, packet: HelloPeerPacket): void {
    const previous = this.peerInfos.get(fromPeerId)
    const next: PeerInfo = {
      peerId: fromPeerId,
      deviceName: packet.deviceName,
      deviceType: packet.deviceType,
      connectedAt: previous?.connectedAt ?? this.now(),
    }
    this.peerInfos.set(fromPeerId, next)

    if (
      !previous ||
      previous.deviceName !== next.deviceName ||
      previous.deviceType !== next.deviceType
    ) {
      this.emit('peer:join', next)
    }
  }

  private readMetadata(connection: DataConnection, peerId: string): PeerInfo {
    const metadata: unknown = connection.metadata
    let deviceName = peerId
    let deviceType: DeviceType = 'desktop'

    if (typeof metadata === 'object' && metadata !== null) {
      const record = metadata as Record<string, unknown>
      if (typeof record.deviceName === 'string' && record.deviceName.length > 0) {
        deviceName = record.deviceName
      }
      if (isDeviceType(record.deviceType)) deviceType = record.deviceType
    }

    return { peerId, deviceName, deviceType, connectedAt: this.now() }
  }

  private dropConnection(peerId: string, reason: string): void {
    this.pendingRelayHeaders.delete(peerId)
    this.relayChains.delete(peerId)

    const cleanups = this.connectionCleanups.get(peerId)
    if (cleanups) {
      for (const cleanup of cleanups) cleanup()
      this.connectionCleanups.delete(peerId)
    }

    const transport = this.transports.get(peerId)
    if (transport) {
      transport.close()
      this.transports.delete(peerId)
    }

    const connection = this.connections.get(peerId)
    if (connection) {
      this.connections.delete(peerId)
      try {
        connection.close()
      } catch {
        // The channel may already be torn down by the browser.
      }
    }

    if (!this.peerInfos.delete(peerId)) return
    this.emit('peer:leave', { peerId, reason })
  }

  private dropAllConnections(reason: string): void {
    for (const peerId of [...this.peerInfos.keys()]) this.dropConnection(peerId, reason)
    this.pendingRelayHeaders.clear()
    this.relayChains.clear()
  }

  private teardownPeer(): void {
    for (const cleanup of this.peerCleanups) cleanup()
    this.peerCleanups = []

    const peer = this.peer
    this.peer = null
    if (!peer) return
    try {
      peer.destroy()
    } catch {
      // Destroying an already closed peer is safe to ignore.
    }
  }

  private handleSignalingLost(): void {
    if (this.destroyed || this.intentionalDisconnect) return
    const peer = this.peer
    if (!peer || peer.destroyed) return

    this.setStatus('reconnecting', 'Signaling link dropped, reconnecting')
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()

    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.setStatus('disconnected', 'Signaling reconnect gave up')
      return
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_DELAY_MS,
    )
    this.reconnectAttempt += 1

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      const peer = this.peer
      if (!peer || this.destroyed || this.intentionalDisconnect || peer.destroyed) return
      try {
        peer.reconnect()
      } catch (error) {
        this.emitError(toP2PError(error, 'SIGNALING_ERROR'))
        this.scheduleReconnect()
      }
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) return
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private resolveTargets(options?: P2PSendOptions): DataChannelTransport[] {
    if (options?.to) {
      const transport = this.transports.get(options.to)
      return transport ? [transport] : []
    }
    if (options?.toMany) {
      const targets: DataChannelTransport[] = []
      for (const peerId of options.toMany) {
        const transport = this.transports.get(peerId)
        if (transport) targets.push(transport)
      }
      return targets
    }
    return [...this.transports.values()]
  }

  private setStatus(status: P2PStatus, detail?: string): void {
    this.currentStatus = status
    this.emit('status', detail === undefined ? { status } : { status, detail })
  }

  private emitError(error: P2PError): void {
    const payload: { code: P2PErrorCode; message: string } = {
      code: error.code,
      message: error.message,
    }
    this.emit('error', payload)
  }

  private emit<K extends P2PEventName>(event: K, payload: P2PEventMap[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of [...set]) listener(payload)
  }
}

export function isHostId(peerId: string): boolean {
  return peerId.startsWith(ROOM_PREFIX)
}

export function isGuestId(peerId: string): boolean {
  return peerId.startsWith(PEER_PREFIX)
}
