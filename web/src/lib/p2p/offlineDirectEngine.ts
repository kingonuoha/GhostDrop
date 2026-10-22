/**
 * Serverless Offline Direct engine.
 * Source: decisions.md D-016 items 1 and 2,
 * plans/total-offline-and-hotspot-bridge-plan.md section 3 layer 1.
 *
 * This is a full `P2PSignalingAdapter` with no signaling server at all. The
 * host gathers one offer, compresses it into a `GD1...` token and shows it as a
 * QR code or copyable code. The guest turns that invite into a reply token the
 * host reads back. Once both sides hold each other's description, a native
 * `RTCPeerConnection({ iceServers: [] })` opens one `RTCDataChannel('ghostdrop')`
 * and the exact D-011 wire protocol of `PeerJsEngine` runs over it.
 *
 * A `BroadcastChannel` shortcut links two tabs of the same browser in well
 * under a second, with no scan at all, which is also the fastest way to prove
 * an offline build works. The shortcut is request driven: a tab that joins
 * after the host already posted its invite asks for it and the host re-posts,
 * so the link never depends on which tab opened first.
 *
 * Rules kept here:
 * - every binary frame stays inside the 16384-byte budget
 * - `FILE_CHUNK` header plus its binary frame are sent as one atomic pair
 * - `bufferedAmountLowThreshold` is 65536 so the streamer owns backpressure
 * - no relay, no fan out: one offline link, one channel
 * - no emojis, no em dashes
 */

import {
  BUFFERED_LOW_THRESHOLD,
  CHUNK_SIZE_BYTES,
  isWirePacket,
  parseWirePacket,
  serializeWirePacket,
  toBinaryFrame,
} from '../../types/protocol'
import type {
  DeviceType,
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
  decodeCompactSdp,
  encodeCompactSdp,
  extractCompactSdpPayload,
  extractCompactTokenFromInput,
  reconstructSdpFromCompact,
} from './compactSdp'
import type { CompactSdpPayload } from './compactSdp'
import { createAbortError, P2PError, toP2PError, type P2PErrorCode } from './errors'
import { unmaskLocalIceIps } from './iceUnmask'
import { isValidRoomCode, normalizeRoomCode, peerPeerId, roomPeerId } from './roomCode'

export const DIRECT_CHANNEL_LABEL = 'ghostdrop'
export const DIRECT_BROADCAST_PREFIX = 'ghostdrop-direct-'

const DEFAULT_MAX_QUEUED_FRAMES = 128
/** Once one candidate is in hand, one more second is plenty for the rest. */
const FIRST_CANDIDATE_GRACE_MS = 1200
/** Hard cap so a sluggish interface can never stall the invite QR. */
const ICE_GATHER_HARD_CAP_MS = 1500
const DATA_CHANNEL_OPEN_TIMEOUT_MS = 10000
/** One requester can pull at most one re-post per cooldown window. */
const OFFER_REPOST_COOLDOWN_MS = 500
/** Used only when the remote peer id has not been decoded yet. */
const OFFLINE_PEER_FALLBACK = 'ghostdrop-peer-direct'
/** Bounds for the tiny control strings carried on the room channel. */
const MAX_CONTROL_ROOM_LENGTH = 32
const MAX_CONTROL_FROM_LENGTH = 96
const MAX_CONTROL_TOKEN_LENGTH = 4096

type Listener = (payload: unknown) => void

type OutboundFrame =
  | { kind: 'text'; text: string }
  | { kind: 'binary'; data: ArrayBuffer }
  | { kind: 'frame'; headerText: string; data: ArrayBuffer }

/**
 * Room channel control frames.
 *
 * `offer` and `answer` carry one compact `GD1` token. `want-offer` is the
 * replay request a late joining tab posts, shaped as
 * `{ kind: 'want-offer', room: '<CODE>', from: '<peerId>' }`.
 *
 * The kinds are open: a build that does not know `want-offer` simply drops it,
 * and this build drops any kind it does not know, so both directions of a mixed
 * version pair stay silent instead of failing.
 */
type DirectBroadcastMessage =
  | { kind: 'offer'; token: string }
  | { kind: 'answer'; token: string }
  | { kind: 'want-offer'; room: string; from: string }

type DirectWantOfferMessage = Extract<DirectBroadcastMessage, { kind: 'want-offer' }>

function isControlText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

/**
 * Runtime guard for the room channel. Anything unknown, malformed, or from a
 * future build returns null, and the caller drops it without a throw and
 * without a log line.
 */
function parseDirectBroadcastMessage(data: unknown): DirectBroadcastMessage | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as Record<string, unknown>

  if (record.kind === 'want-offer') {
    const room = record.room
    const from = record.from
    if (!isControlText(room, MAX_CONTROL_ROOM_LENGTH)) return null
    if (!isControlText(from, MAX_CONTROL_FROM_LENGTH)) return null
    return { kind: 'want-offer', room, from }
  }

  if (record.kind !== 'offer' && record.kind !== 'answer') return null
  const token = record.token
  if (!isControlText(token, MAX_CONTROL_TOKEN_LENGTH)) return null
  return { kind: record.kind, token }
}

/** True when this browser can open a direct link at all. */
export function isOfflineDirectSupported(): boolean {
  return typeof RTCPeerConnection === 'function'
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError('Connection attempt aborted')
}

/** D-011 frame budget: every binary frame carries 1 to 16384 bytes. */
function frameBudgetError(data: ArrayBuffer): P2PError | null {
  if (data.byteLength === 0) {
    return new P2PError('PROTOCOL_ERROR', 'Binary frame must not be empty')
  }
  if (data.byteLength > CHUNK_SIZE_BYTES) {
    return new P2PError('PROTOCOL_ERROR', 'Binary frame exceeded the 16KB budget')
  }
  return null
}

export interface OfflineDirectEngineOptions {
  /** Injectable factory, default is the native `RTCPeerConnection`. */
  createPeerConnection?: (config: RTCConfiguration) => RTCPeerConnection
  maxQueuedFrames?: number
  now?: () => number
  /** Set to false to disable the same device tab shortcut. */
  enableBroadcastChannel?: boolean
}

/**
 * `P2PTransport` over a native `RTCDataChannel`.
 * Mirrors `DataChannelTransport` in `peerjsEngine.ts`: text frames queue until
 * the channel opens, binary frames reject instead of buffering, and every
 * binary frame is checked against the 16384-byte D-011 budget before it is
 * queued. `sendFrame` keeps a `FILE_CHUNK` header and its binary payload
 * adjacent on the wire, so nothing can interleave between them.
 */
export class RtcDataChannelTransport implements P2PTransport {
  readonly peerId: string

  private readonly channel: RTCDataChannel
  private readonly maxQueuedFrames: number
  private readonly onError: (error: P2PError) => void
  private readonly pending: OutboundFrame[] = []
  private chain: Promise<void> = Promise.resolve()
  private closed = false
  private threshold = BUFFERED_LOW_THRESHOLD

  constructor(
    channel: RTCDataChannel,
    peerId: string,
    maxQueuedFrames: number,
    onError: (error: P2PError) => void,
  ) {
    this.channel = channel
    this.peerId = peerId
    this.maxQueuedFrames = maxQueuedFrames
    this.onError = onError
    this.channel.binaryType = 'arraybuffer'
    this.applyThreshold()
  }

  get isOpen(): boolean {
    return !this.closed && this.channel.readyState === 'open'
  }

  get bufferedAmount(): number {
    return this.channel.bufferedAmount
  }

  get bufferedAmountLowThreshold(): number {
    return this.channel.bufferedAmountLowThreshold
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
    const handler = () => listener()
    this.channel.addEventListener('bufferedamountlow', handler)
    return () => this.channel.removeEventListener('bufferedamountlow', handler)
  }

  /** Flushes text frames that were queued before the channel opened. */
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
    try {
      this.channel.bufferedAmountLowThreshold = this.threshold
    } catch {
      // Some engines refuse the write before the channel is open.
    }
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
      this.channel.send(frame.text)
      return
    }
    if (frame.kind === 'binary') {
      this.channel.send(frame.data)
      return
    }
    // D-011: the header and its single binary frame leave back to back.
    this.channel.send(frame.headerText)
    this.channel.send(frame.data)
  }
}

/**
 * Full signaling adapter over a direct `RTCDataChannel`.
 *
 * Typical host: `connect()` then `startHostOffer()`, show the token, then
 * `acceptAnswerToken()` when the reply comes back.
 * Typical guest: `acceptOfferAndCreateAnswer()` from the scanned invite, show
 * the reply token, and the link opens on its own.
 */
export class OfflineDirectEngine implements P2PSignalingAdapter {
  private readonly createPeerConnection: ((config: RTCConfiguration) => RTCPeerConnection) | null
  private readonly maxQueuedFrames: number
  private readonly clock: () => number
  private readonly broadcastEnabled: boolean

  private pc: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private transport: RtcDataChannelTransport | null = null
  private broadcastBus: BroadcastChannel | null = null
  private broadcastListener: ((event: MessageEvent) => void) | null = null
  private broadcastRoomCode = ''
  private channelOpened = false
  /** True while the guest is building an answer from a room channel offer. */
  private guestHandshakeActive = false
  /** Last re-post per requester, so a replay storm cannot answer twice. */
  private readonly offerRepostTimes = new Map<string, number>()

  private currentRole: PeerRole | null = null
  private currentRoomCode = ''
  private currentPeerId = ''
  private deviceNameValue = 'GhostDrop device'
  private deviceTypeValue: DeviceType = 'desktop'
  private currentStatus: P2PStatus = 'idle'

  private localCandidates: RTCIceCandidateInit[] = []
  private remotePayload: CompactSdpPayload | null = null
  private answerApplied = false
  private inviteToken: string | null = null
  private replyToken: string | null = null

  private readonly peerInfos = new Map<string, PeerInfo>()
  private readonly listeners = new Map<P2PEventName, Set<Listener>>()
  private destroyed = false

  constructor(options: OfflineDirectEngineOptions = {}) {
    this.createPeerConnection =
      options.createPeerConnection ??
      (isOfflineDirectSupported() ? (config) => new RTCPeerConnection(config) : null)
    this.maxQueuedFrames = options.maxQueuedFrames ?? DEFAULT_MAX_QUEUED_FRAMES
    this.clock = options.now ?? (() => Date.now())
    this.broadcastEnabled = options.enableBroadcastChannel !== false
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

  /** The invite token to render as a QR code, null before an offer exists. */
  get hostInviteToken(): string | null {
    return this.inviteToken
  }

  /** The reply token a guest shows back to the host. */
  get guestReplyToken(): string | null {
    return this.replyToken
  }

  isConnected(): boolean {
    return this.currentStatus === 'connected' && this.transport?.isOpen === true
  }

  /**
   * Prepares the room and the same device shortcut. No offer is gathered here:
   * a host calls `startHostOffer()` so one offer serves both the QR code and
   * the `BroadcastChannel` handshake.
   *
   * A guest also asks the room for the invite that may already be on the air,
   * because the host posted it before this tab existed.
   */
  async connect(options: P2PConnectOptions): Promise<void> {
    if (this.destroyed) throw new P2PError('DESTROYED', 'Adapter already destroyed')
    if (
      this.currentStatus === 'connecting' ||
      this.currentStatus === 'connected' ||
      this.currentStatus === 'reconnecting'
    ) {
      throw new P2PError('ALREADY_CONNECTED', 'A direct link is already active')
    }

    const code = this.resolveRoomCode(options.roomCode)
    throwIfAborted(options.signal)

    this.applyIdentity(options, code)
    this.setStatus('connecting')
    this.openBroadcastChannel(code)
    this.requestCurrentOffer()
  }

  /**
   * Host step 1. Gathers an offer, waits at most 1200 ms after the first
   * candidate for the rest, and returns the compact invite token. The token is
   * also posted on the room `BroadcastChannel`, so a second tab can answer
   * without any scanning.
   */
  async startHostOffer(options: P2PConnectOptions): Promise<string> {
    if (this.destroyed) throw new P2PError('DESTROYED', 'Adapter already destroyed')

    const code = this.resolveRoomCode(options.roomCode)
    throwIfAborted(options.signal)

    this.applyIdentity({ ...options, role: 'host' }, code)
    this.setStatus('connecting')
    this.openBroadcastChannel(code)
    this.releaseConnection()
    await unmaskLocalIceIps()

    const pc = this.createConnection()
    this.pc = pc
    this.localCandidates = []
    this.remotePayload = null
    this.answerApplied = false
    this.replyToken = null

    pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) return
      this.localCandidates.push(event.candidate.toJSON())
    })

    this.attachChannel(pc.createDataChannel(DIRECT_CHANNEL_LABEL, { ordered: true }))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await this.waitForIceGathering(pc, options.signal)

    const token = await encodeCompactSdp(this.collectLocalPayload(code))
    this.inviteToken = token
    this.postBroadcast({ kind: 'offer', token })
    return token
  }

  /**
   * Guest step 1. Decodes the host invite, answers it, and returns the reply
   * token the host has to read back. The reply is also posted on the room
   * `BroadcastChannel` for the same device case.
   */
  async acceptOfferAndCreateAnswer(
    offerToken: string,
    options: P2PConnectOptions,
  ): Promise<string> {
    if (this.destroyed) throw new P2PError('DESTROYED', 'Adapter already destroyed')

    const token = extractCompactTokenFromInput(offerToken)
    if (!token) throw new P2PError('INVALID_ARGUMENT', 'That offline code is not valid')

    const payload = await decodeCompactSdp(token)
    if (payload.t !== 'o') {
      throw new P2PError('INVALID_ARGUMENT', 'That is a reply code, not an invite code')
    }

    throwIfAborted(options.signal)

    const code = this.resolveRoomCode(payload.r.length > 0 ? payload.r : options.roomCode)
    // The invite is authoritative for the peer id and labels of the host.
    this.applyIdentity({ ...options, role: 'peer' }, code)
    this.setStatus('connecting')
    this.openBroadcastChannel(code)
    this.releaseConnection()
    this.remotePayload = payload
    await unmaskLocalIceIps()

    const pc = this.createConnection()
    this.pc = pc
    this.localCandidates = []

    pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) return
      this.localCandidates.push(event.candidate.toJSON())
    })
    pc.addEventListener('datachannel', (event: RTCDataChannelEvent) => {
      this.attachChannel(event.channel)
    })

    const reconstruction = reconstructSdpFromCompact(payload)
    await pc.setRemoteDescription(reconstruction.description)
    await this.addRemoteCandidates(pc, reconstruction.candidates)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await this.waitForIceGathering(pc, options.signal)

    const reply = await encodeCompactSdp(this.collectLocalPayload(code))
    this.replyToken = reply
    this.postBroadcast({ kind: 'answer', token: reply })
    return reply
  }

  /**
   * Host step 2. Applies the guest reply and resolves once the data channel is
   * open, which is the moment the room counts as connected.
   */
  async acceptAnswerToken(answerToken: string): Promise<void> {
    if (this.destroyed) throw new P2PError('DESTROYED', 'Adapter already destroyed')

    const pc = this.pc
    if (!pc) throw new P2PError('NO_OPEN_CHANNEL', 'Create an invite before reading a reply')

    const token = extractCompactTokenFromInput(answerToken)
    if (!token) throw new P2PError('INVALID_ARGUMENT', 'That offline code is not valid')

    const payload = await decodeCompactSdp(token)
    if (payload.t !== 'a') {
      throw new P2PError('INVALID_ARGUMENT', 'That is an invite code, not a reply code')
    }
    if (this.answerApplied) return

    // The peer id must be known before the datachannel event fires.
    this.remotePayload = payload
    if (!this.channelOpened && this.channel && this.transport?.peerId !== payload.p) {
      this.bindTransport(this.channel, payload.p)
    }
    const reconstruction = reconstructSdpFromCompact(payload)
    this.answerApplied = true

    try {
      await pc.setRemoteDescription(reconstruction.description)
      await this.addRemoteCandidates(pc, reconstruction.candidates)
      await this.waitForChannelOpen()
    } catch (error) {
      this.answerApplied = false
      throw toP2PError(error, 'SIGNALING_ERROR')
    }
  }

  disconnect(): void {
    if (this.destroyed) return
    this.guestHandshakeActive = false
    this.releaseConnection()
    this.closeBroadcastChannel()
    this.setStatus('disconnected')
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.guestHandshakeActive = false
    this.releaseConnection()
    this.closeBroadcastChannel()
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
    const transport = this.transport
    if (!transport || transport.peerId !== peerId) return null
    return transport
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

  /* ---------------------------------------------------------------------- */
  /* Connection plumbing                                                     */
  /* ---------------------------------------------------------------------- */

  private createConnection(): RTCPeerConnection {
    const create = this.createPeerConnection
    if (!create) {
      throw new P2PError('SIGNALING_ERROR', 'This browser cannot open a direct link')
    }

    // No STUN, no TURN: every candidate is a local host candidate, which is
    // exactly what an offline Wi-Fi or hotspot bridge needs.
    const pc = create({ iceServers: [] })
    pc.addEventListener('connectionstatechange', () => this.handleConnectionState(pc))
    return pc
  }

  private handleConnectionState(pc: RTCPeerConnection): void {
    if (this.pc !== pc) return
    const state = pc.connectionState
    if (state === 'failed') {
      this.emitError(
        new P2PError('SIGNALING_ERROR', 'The direct link could not be established'),
      )
      this.setStatus('disconnected', 'Direct link failed')
    }
  }

  private attachChannel(channel: RTCDataChannel): void {
    const previous = this.channel
    if (previous && previous !== channel) {
      try {
        previous.close()
      } catch {
        // Already closed by the browser.
      }
    }

    this.channel = channel
    this.channelOpened = false
    this.bindTransport(channel, this.remotePayload?.p ?? OFFLINE_PEER_FALLBACK)

    // Every handler checks that its channel is still the live one, so a stale
    // close or message from a replaced channel can never move the room status.
    channel.addEventListener('open', () => {
      if (this.channel !== channel) return
      this.handleChannelOpen()
    })
    channel.addEventListener('message', (event: MessageEvent) => {
      if (this.channel !== channel) return
      this.handleMessage(event.data)
    })
    channel.addEventListener('close', () => this.handleChannelClosed(channel))
    channel.addEventListener('error', () => {
      if (this.channel !== channel) return
      this.emitError(new P2PError('NO_OPEN_CHANNEL', 'The direct link reported an error'))
    })

    if (channel.readyState === 'open') this.handleChannelOpen()
  }

  /**
   * Binds a channel to a transport for a known peer id.
   *
   * A host creates its data channel before the guest reply is read, so it can
   * start with a placeholder peer id and rebind once the reply supplies the
   * real one. Rebinding only happens while the channel is still connecting, so
   * no queued frame is ever dropped.
   */
  private bindTransport(channel: RTCDataChannel, peerId: string): void {
    this.transport?.close()
    this.transport = new RtcDataChannelTransport(
      channel,
      peerId,
      this.maxQueuedFrames,
      (error) => this.emitError(error),
    )
  }

  private handleChannelOpen(): void {
    if (this.channelOpened) return
    this.channelOpened = true

    const transport = this.transport
    const peerId = transport?.peerId ?? OFFLINE_PEER_FALLBACK

    transport?.pump()
    this.setStatus('connected')
    this.registerPeer(peerId)

    const hello: HelloPeerPacket = {
      type: 'HELLO_PEER',
      peerId: this.currentPeerId,
      deviceName: this.deviceNameValue,
      deviceType: this.deviceTypeValue,
    }

    try {
      transport?.sendText(serializeWirePacket(hello))
    } catch (error) {
      this.emitError(toP2PError(error, 'QUEUE_OVERFLOW'))
    }
  }

  private handleChannelClosed(channel: RTCDataChannel): void {
    if (this.channel !== channel) return
    this.channelOpened = false
    // A dropped link must not leave the guest thinking a handshake is running.
    this.guestHandshakeActive = false
    const transport = this.transport
    this.transport = null
    transport?.close()
    if (this.destroyed) return
    this.setStatus('disconnected', 'The direct link closed')
  }

  private handleMessage(data: unknown): void {
    const from = this.transport?.peerId ?? OFFLINE_PEER_FALLBACK

    if (typeof data === 'string') {
      const packet = parseWirePacket(data)
      if (!packet) {
        this.emitError(new P2PError('PROTOCOL_ERROR', 'Malformed packet dropped'))
        return
      }
      if (packet.type === 'HELLO_PEER') this.updatePeerInfo(from, packet)
      this.emit('packet', { packet, from })
      return
    }

    const frame = toBinaryFrame(data)
    if (!frame) {
      this.emitError(new P2PError('PROTOCOL_ERROR', 'Unsupported binary frame dropped'))
      return
    }
    this.emit('binary', { data: frame, from })
  }

  private registerPeer(peerId: string): void {
    const payload = this.remotePayload
    const previous = this.peerInfos.get(peerId)
    const info: PeerInfo = {
      peerId,
      deviceName: payload?.n ?? peerId,
      deviceType: payload?.d ?? 'desktop',
      connectedAt: previous?.connectedAt ?? this.clock(),
    }

    this.peerInfos.set(peerId, info)
    this.emit('peer:join', info)
  }

  private updatePeerInfo(fromPeerId: string, packet: HelloPeerPacket): void {
    const previous = this.peerInfos.get(fromPeerId)
    const next: PeerInfo = {
      peerId: fromPeerId,
      deviceName: packet.deviceName,
      deviceType: packet.deviceType,
      connectedAt: previous?.connectedAt ?? this.clock(),
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

  private collectLocalPayload(roomCode: string): CompactSdpPayload {
    const pc = this.pc
    if (!pc) throw new P2PError('SIGNALING_ERROR', 'No direct link is in progress')

    const description = pc.localDescription
    if (!description) {
      throw new P2PError('SIGNALING_ERROR', 'The browser produced no local description')
    }

    return extractCompactSdpPayload({
      description,
      candidates: this.localCandidates,
      roomCode,
      peerId: this.currentPeerId,
      deviceName: this.deviceNameValue,
      deviceType: this.deviceTypeValue,
    })
  }

  private addRemoteCandidates(
    pc: RTCPeerConnection,
    candidates: readonly RTCIceCandidateInit[],
  ): Promise<void> {
    return candidates.reduce<Promise<void>>((chain, candidate) => {
      return chain.then(async () => {
        try {
          await pc.addIceCandidate(candidate)
        } catch {
          // The same candidates are already embedded in the rebuilt SDP.
        }
      })
    }, Promise.resolve())
  }

  private waitForIceGathering(pc: RTCPeerConnection, signal?: AbortSignal): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve()

    return new Promise((resolve, reject) => {
      let settled = false
      let firstCandidateTimer: ReturnType<typeof setTimeout> | null = null
      let hardCapTimer: ReturnType<typeof setTimeout> | null = null
      let cleanup: () => void = () => undefined

      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        cleanup()
        if (error) reject(error)
        else resolve()
      }

      const onState = () => {
        if (pc.iceGatheringState === 'complete') finish()
      }

      const onCandidate = (event: RTCPeerConnectionIceEvent) => {
        if (!event.candidate) return
        if (firstCandidateTimer !== null) return
        firstCandidateTimer = setTimeout(() => finish(), FIRST_CANDIDATE_GRACE_MS)
      }

      const onAbort = () => finish(createAbortError('Connection attempt aborted'))

      cleanup = () => {
        if (firstCandidateTimer !== null) clearTimeout(firstCandidateTimer)
        if (hardCapTimer !== null) clearTimeout(hardCapTimer)
        pc.removeEventListener('icegatheringstatechange', onState)
        pc.removeEventListener('icecandidate', onCandidate)
        signal?.removeEventListener('abort', onAbort)
      }

      pc.addEventListener('icegatheringstatechange', onState)
      pc.addEventListener('icecandidate', onCandidate)
      signal?.addEventListener('abort', onAbort, { once: true })
      if (signal?.aborted) {
        onAbort()
        return
      }

      hardCapTimer = setTimeout(() => finish(), ICE_GATHER_HARD_CAP_MS)
      onState()
    })
  }

  private waitForChannelOpen(): Promise<void> {
    const channel = this.channel
    if (!channel) {
      return Promise.reject(new P2PError('NO_OPEN_CHANNEL', 'No direct link is in progress'))
    }
    if (channel.readyState === 'open') return Promise.resolve()

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
      const onClose = () => {
        finish(new P2PError('NO_OPEN_CHANNEL', 'The direct link closed before it opened'))
      }

      const timer = setTimeout(() => {
        finish(new P2PError('CONNECT_TIMEOUT', 'The direct link did not open in time'))
      }, DATA_CHANNEL_OPEN_TIMEOUT_MS)

      cleanup = () => {
        clearTimeout(timer)
        channel.removeEventListener('open', onOpen)
        channel.removeEventListener('close', onClose)
      }

      channel.addEventListener('open', onOpen)
      channel.addEventListener('close', onClose)
      if (channel.readyState === 'open') onOpen()
    })
  }

  private releaseConnection(): void {
    this.channelOpened = false
    this.answerApplied = false
    this.localCandidates = []
    this.remotePayload = null
    this.inviteToken = null
    this.replyToken = null

    const transport = this.transport
    this.transport = null
    if (transport) transport.close()

    const channel = this.channel
    this.channel = null
    if (channel) {
      try {
        channel.close()
      } catch {
        // The channel may already be torn down by the browser.
      }
    }

    const pc = this.pc
    this.pc = null
    if (pc) {
      try {
        pc.close()
      } catch {
        // Closing an already closed connection is safe to ignore.
      }
    }

    for (const peerId of [...this.peerInfos.keys()]) {
      this.peerInfos.delete(peerId)
      this.emit('peer:leave', { peerId, reason: 'closed' })
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Same device BroadcastChannel shortcut                                   */
  /* ---------------------------------------------------------------------- */

  private openBroadcastChannel(roomCode: string): void {
    if (!this.broadcastEnabled) return
    if (typeof BroadcastChannel !== 'function') return
    if (this.broadcastBus && this.broadcastRoomCode === roomCode) return
    if (this.broadcastBus) this.closeBroadcastChannel()

    try {
      const broadcast = new BroadcastChannel(`${DIRECT_BROADCAST_PREFIX}${roomCode}`)
      const listener = (event: MessageEvent) => this.handleBroadcastMessage(event.data)
      broadcast.addEventListener('message', listener)
      this.broadcastBus = broadcast
      this.broadcastListener = listener
      this.broadcastRoomCode = roomCode
    } catch {
      this.broadcastBus = null
      this.broadcastListener = null
      this.broadcastRoomCode = ''
    }
  }

  /** Removes the message listener first, then closes the port. */
  private closeBroadcastChannel(): void {
    const broadcast = this.broadcastBus
    const listener = this.broadcastListener
    this.broadcastBus = null
    this.broadcastListener = null
    this.broadcastRoomCode = ''
    this.offerRepostTimes.clear()
    if (!broadcast) return

    if (listener) {
      try {
        broadcast.removeEventListener('message', listener)
      } catch {
        // The port is already closed, so the listener is gone with it.
      }
    }

    try {
      broadcast.close()
    } catch {
      // Already closed.
    }
  }

  private postBroadcast(message: DirectBroadcastMessage): void {
    const broadcast = this.broadcastBus
    if (!broadcast) return
    try {
      broadcast.postMessage(message)
    } catch {
      // A closed port fails silently, the QR code path still works.
    }
  }

  /**
   * Guest join: ask the room for the invite that is already on the air. The
   * host posts its offer once, so a tab that mounts later would otherwise have
   * to scan, which is exactly the order two tabs are usually opened in.
   */
  private requestCurrentOffer(): void {
    if (this.currentRole !== 'peer') return
    if (!this.broadcastBus) return

    this.postBroadcast({
      kind: 'want-offer',
      room: this.currentRoomCode,
      from: this.currentPeerId,
    })
  }

  /**
   * Host side of the replay. A request is answered with exactly one re-post,
   * and only while the invite is still the live one: the link is not up, no
   * answer is being applied, a token exists, and the request names this room.
   *
   * A host that has not gathered an offer yet drops the request harmlessly. It
   * posts that offer moments later, and the guest is already listening by then.
   */
  private handleWantOffer(message: DirectWantOfferMessage): void {
    if (this.currentRole !== 'host') return
    if (this.isConnected() || this.channelOpened || this.answerApplied) return
    if (message.room !== this.currentRoomCode) return

    const token = this.inviteToken
    if (!token) return

    if (!this.noteOfferRequest(message.from)) return

    this.postBroadcast({ kind: 'offer', token })
  }

  /**
   * One re-post per requester per cooldown window. Returns false when the same
   * requester asked again too soon, which is what stops a replay storm from
   * turning into a broadcast storm.
   */
  private noteOfferRequest(from: string): boolean {
    const now = this.clock()

    for (const [requester, requestedAt] of [...this.offerRepostTimes]) {
      if (now - requestedAt >= OFFER_REPOST_COOLDOWN_MS) {
        this.offerRepostTimes.delete(requester)
      }
    }

    const previous = this.offerRepostTimes.get(from)
    if (previous !== undefined && now - previous < OFFER_REPOST_COOLDOWN_MS) return false

    this.offerRepostTimes.set(from, now)
    return true
  }

  /**
   * Guest side of the replay, and of the original post. Ignored when this tab is
   * not a guest, when a handshake is already running, or when a link is already
   * up, so a duplicate or stale offer never opens a second channel.
   */
  private handleRemoteOffer(token: string): void {
    if (this.currentRole !== 'peer') return
    if (this.guestHandshakeActive || this.pc || this.channel) return
    if (this.isConnected()) return

    this.guestHandshakeActive = true
    void this.acceptOfferAndCreateAnswer(token, this.identityOptions())
      .catch(() => undefined)
      .finally(() => {
        this.guestHandshakeActive = false
      })
  }

  /** Host side of the reply. Reuses the manual paste path unchanged. */
  private handleRemoteAnswer(token: string): void {
    if (this.currentRole !== 'host') return
    if (!this.pc || this.answerApplied) return
    void this.acceptAnswerToken(token).catch(() => undefined)
  }

  /**
   * Two tabs in the same room finish the handshake here with no camera and no
   * paste: the host posts its offer, a late guest asks for it, the guest
   * answers, the host applies it. Unknown frames are dropped in silence.
   */
  private handleBroadcastMessage(data: unknown): void {
    const message = parseDirectBroadcastMessage(data)
    if (!message) return

    if (message.kind === 'want-offer') {
      this.handleWantOffer(message)
      return
    }
    if (message.kind === 'offer') {
      this.handleRemoteOffer(message.token)
      return
    }
    this.handleRemoteAnswer(message.token)
  }

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                 */
  /* ---------------------------------------------------------------------- */

  private identityOptions(): P2PConnectOptions {
    return {
      roomCode: this.currentRoomCode,
      role: this.currentRole ?? 'peer',
      deviceName: this.deviceNameValue,
      deviceType: this.deviceTypeValue,
    }
  }

  private resolveRoomCode(value: string): string {
    const code = normalizeRoomCode(value)
    if (!isValidRoomCode(code)) {
      throw new P2PError('INVALID_ROOM_CODE', 'Room code must be 6 valid characters')
    }
    return code
  }

  private applyIdentity(options: P2PConnectOptions, roomCode: string): void {
    const keepGuestId = options.role === 'peer' && this.currentRole === 'peer'
    this.currentRole = options.role
    this.currentRoomCode = roomCode
    this.deviceNameValue = options.deviceName
    this.deviceTypeValue = options.deviceType
    this.currentPeerId =
      options.role === 'host'
        ? roomPeerId(roomCode)
        : keepGuestId && this.currentPeerId.length > 0
          ? this.currentPeerId
          : peerPeerId()
  }

  private resolveTargets(options?: P2PSendOptions): RtcDataChannelTransport[] {
    const transport = this.transport
    if (!transport) return []
    if (options?.to && options.to !== transport.peerId) return []
    if (options?.toMany && !options.toMany.includes(transport.peerId)) return []
    return [transport]
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
