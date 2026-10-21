/**
 * Room orchestration hook.
 * Source: docs/00-prd-source-of-truth.md FR-1.5, docs/06-protocol-and-tech-spec.md
 * section 5, decisions.md D-003, D-004, D-011.
 *
 * Owns one EphemeralStore per room lifecycle, one signaling engine per room,
 * inbound packet routing, the 16KB receiver, and the playful feedback layer.
 * Nothing here renders UI and nothing here prints a raw transport message.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChunkReceiver,
  EphemeralStore,
  generateRoomCode,
  getRemainingMs,
  isP2PError,
  isValidRoomCode,
  normalizeRoomCode,
  PeerJsEngine,
  streamFile,
  ttlPresetToMs,
} from '../lib/p2p'
import type {
  DeviceType,
  EphemeralItem,
  P2PErrorCode,
  P2PTransport,
  PeerInfo,
  PeerRole,
  TransferProgress,
  TtlPreset,
  WirePacket,
} from '../lib/p2p'
import { buildFeedback } from '../lib/copyDeck'
import type { RoomFeedback, RoomFeedbackKey } from '../lib/copyDeck'
import {
  canNativeShare,
  detectDeviceType,
  deviceNameFor,
  localSelfLabel,
} from '../lib/device'
import { useTtlJanitor } from './useTtlJanitor'

export type GhostRoomStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export type GhostSendOptions = {
  /**
   * Delete the local copy the moment the other screen confirms it arrived.
   * Wired here so the Step 5 "Delete from phone after sending" toggle can use it.
   */
  dropAndNuke?: boolean
}

export interface UseGhostRoomOptions {
  /** Room to join. Omit to host a new room with a generated code. */
  roomCode?: string | null
  /**
   * Force the room role. Omitted means a supplied code joins as a guest and no
   * code hosts a new room. A host that carries its own code across a route
   * change (hub to workspace) passes `host` so the same room stays live.
   */
  role?: PeerRole
  /** Skip the automatic signaling connect. Defaults to true. */
  autoConnect?: boolean
  /** Name shown on the other screen. Defaults to a friendly device name. */
  deviceName?: string
  /** Skip the browser unload hooks. Used by tests and SSR probes. */
  registerUnloadHooks?: boolean
}

export interface GhostRoom {
  /** Six letter room code, generated for a host and normalized for a guest. */
  roomCode: string | null
  role: PeerRole
  status: GhostRoomStatus
  peers: readonly PeerInfo[]
  items: readonly EphemeralItem[]
  /** Store clock at the last sweep, for countdown text. */
  now: number
  /** Transfer completion per item id, 0 to 1. Absent until the first frame. */
  progress: Readonly<Record<string, number>>
  /** Milliseconds left before one item self-deletes, or null when it has no timer. */
  remainingMs: (id: string) => number | null
  ttlPreset: TtlPreset
  setTtlPreset: (preset: TtlPreset) => void
  feedback: RoomFeedback | null
  dismissFeedback: () => void
  /** Raises any copy deck entry through the same toast slot the page renders. */
  announceFeedback: (key: RoomFeedbackKey) => void
  /** Copy deck key for the last connection failure, never a raw message. */
  connectionError: RoomFeedbackKey | null
  /**
   * Rebuilds the signaling engine right now while the store and the history
   * survive. Every Reconnect action routes through this, never the QR scanner.
   */
  reconnect: () => void
  /** Guest auto rejoin attempt counter. Back to 0 once a screen links again. */
  reconnectAttempt: number
  installedHint: boolean
  sendText: (text: string) => Promise<boolean>
  sendFiles: (files: readonly File[], options?: GhostSendOptions) => Promise<number>
  copyItem: (id: string) => Promise<boolean>
  /** Native OS share sheet for one text note or file, then honours burn on copy. */
  shareItem: (id: string) => Promise<boolean>
  /** Saves one received file to disk, then honours burn on copy. */
  saveItem: (id: string) => boolean
  burnItem: (id: string) => boolean
  /** Runtime detected class of this screen, never hardcoded in a component. */
  localDeviceType: DeviceType
  /** Self label for this screen, for example a phone or a computer. */
  localDeviceName: string
}

interface SendMeta {
  fileName: string
  dropAndNuke: boolean
}

const WARN_WINDOW_MS = 60_000
const MAX_WARNED_IDS = 200

/**
 * Guest rejoin backoff after the host reloaded or the channel blinked.
 * Four attempts at 900ms, 1800ms, 2700ms and 3600ms, then the card appears.
 */
const REJOIN_DELAYS_MS: readonly number[] = [900, 1800, 2700, 3600]

function safeGenerateRoomCode(): string | null {
  try {
    return generateRoomCode()
  } catch {
    return null
  }
}

function createItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `drop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** burn on copy dies on the first read, so it never carries a timer. */
function ttlMsForPreset(preset: TtlPreset): number | null {
  if (preset === 'BURN_ON_COPY') return null
  return ttlPresetToMs(preset)
}

/** Plain English name for one item, used by every poof notice. */
function itemNameFor(item: EphemeralItem): string | undefined {
  if (item.fileName) return item.fileName
  return item.kind === 'text' ? 'that note' : undefined
}

/** True when one item carries a picture, so the copy words can name it. */
function isImageItem(item: EphemeralItem): boolean {
  return (item.mime ?? '').startsWith('image/')
}

/** Live Blob for the active item, with the object URL as the slow path. */
async function resolveItemBlob(item: EphemeralItem): Promise<Blob | null> {
  if (item.blob) return item.blob
  if (!item.blobUrl) return null
  try {
    const response = await fetch(item.blobUrl)
    if (!response.ok) return null
    return await response.blob()
  } catch {
    return null
  }
}

/**
 * Text to clipboard, with a selection fallback for plain HTTP LAN origins where
 * `navigator.clipboard` is undefined or rejected.
 */
async function writeTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Falls through to the execCommand path below.
    }
  }
  if (typeof document === 'undefined') return false
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

/**
 * Repaints any image onto a PNG. Browsers only universally accept `image/png`
 * in `ClipboardItem`, so a JPEG or WebP screenshot must be converted first.
 */
async function toPngBlob(blob: Blob): Promise<Blob | null> {
  if (blob.type === 'image/png') return blob
  if (typeof createImageBitmap !== 'function') return null

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(blob)
    const width = bitmap.width
    const height = bitmap.height
    if (width <= 0 || height <= 0) return null

    if (typeof OffscreenCanvas === 'function') {
      try {
        const offscreen = new OffscreenCanvas(width, height)
        const context = offscreen.getContext('2d')
        if (context) {
          context.drawImage(bitmap, 0, 0)
          const converted = await offscreen.convertToBlob({ type: 'image/png' })
          if (converted.size > 0) return converted
        }
      } catch {
        // Falls through to the DOM canvas path.
      }
    }

    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0)
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), 'image/png')
    })
  } catch {
    return null
  } finally {
    bitmap?.close()
  }
}

/** Image to clipboard through `ClipboardItem`, converting to PNG when needed. */
async function writeImageToClipboard(item: EphemeralItem): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  if (typeof ClipboardItem === 'undefined') return false
  if (typeof navigator.clipboard?.write !== 'function') return false

  const source = await resolveItemBlob(item)
  if (!source) return false

  const isImage = (item.mime ?? source.type ?? '').startsWith('image/')
  const payload = isImage ? await toPngBlob(source) : null
  if (!payload) return false

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': payload })])
    return true
  } catch {
    return false
  }
}

/** Saves a text note to disk as a small plain text file. */
function downloadTextNote(text: string, fileName: string): boolean {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  let url: string | null = null
  try {
    url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    return triggerDownload(url, fileName)
  } catch {
    return false
  } finally {
    if (url) URL.revokeObjectURL(url)
  }
}

/** Maps a transport or protocol error onto a playful copy deck key. */
function feedbackKeyForError(code: P2PErrorCode, role: PeerRole): RoomFeedbackKey {
  switch (code) {
    case 'INVALID_ROOM_CODE':
    case 'ROOM_CODE_UNAVAILABLE':
      return 'ERR_ROOM_NOT_FOUND'
    case 'CONNECT_TIMEOUT':
    case 'SIGNALING_ERROR':
      return role === 'peer' ? 'ERR_ROOM_NOT_FOUND' : 'ERR_PEER_DISCONNECTED'
    default:
      return 'ERR_CHUNK_INTERRUPTED'
  }
}

function isConnectionFailure(code: P2PErrorCode): boolean {
  return (
    code === 'INVALID_ROOM_CODE' ||
    code === 'ROOM_CODE_UNAVAILABLE' ||
    code === 'CONNECT_TIMEOUT' ||
    code === 'SIGNALING_ERROR'
  )
}

function triggerDownload(blobUrl: string, fileName: string): boolean {
  if (typeof document === 'undefined') return false
  try {
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    return true
  } catch {
    return false
  }
}

export function useGhostRoom(options: UseGhostRoomOptions = {}): GhostRoom {
  const requestedRaw = options.roomCode?.trim() ?? ''
  const requestedCode = requestedRaw.length > 0 ? normalizeRoomCode(requestedRaw) : ''
  const requestedRole = options.role
  const isGuest =
    requestedRole === 'peer'
      ? true
      : requestedRole === 'host'
        ? false
        : requestedCode.length > 0 && isValidRoomCode(requestedCode)
  const registerUnloadHooks = options.registerUnloadHooks !== false
  const autoConnect = options.autoConnect !== false

  const session = useMemo<{ roomCode: string | null; role: PeerRole }>(() => {
    if (isGuest) {
      return { roomCode: requestedCode.length > 0 ? requestedCode : null, role: 'peer' }
    }
    if (requestedCode.length > 0 && isValidRoomCode(requestedCode)) {
      return { roomCode: requestedCode, role: 'host' }
    }
    return { roomCode: safeGenerateRoomCode(), role: 'host' }
  }, [isGuest, requestedCode])

  // One store per room lifecycle. It is replaced when the room code changes and
  // disposed on room change and on unmount, so a stale room can never keep an
  // object URL alive. A disposed store is always replaced, never reused.
  const storeKey = session.roomCode ?? 'no-room'
  const storeRef = useRef<{ key: string; store: EphemeralStore } | null>(null)
  if (
    storeRef.current === null ||
    storeRef.current.key !== storeKey ||
    storeRef.current.store.isDisposed()
  ) {
    storeRef.current = { key: storeKey, store: new EphemeralStore({ registerUnloadHooks }) }
  }
  const store = storeRef.current.store

  /**
   * Detected once per mount. Every label, chip, badge and bridge icon on this
   * screen reads these two values instead of a hardcoded device name.
   */
  const localDeviceType = useMemo<DeviceType>(() => detectDeviceType(), [])
  const localDeviceName = useMemo(() => localSelfLabel(localDeviceType), [localDeviceType])

  /**
   * StrictMode runs effect cleanup before the real mount, so disposal is
   * deferred by one task and cancelled when the same store reattaches. A real
   * unmount always reaches zero pending mounts, so nothing survives it.
   */
  const disposeTimersRef = useRef(new Map<EphemeralStore, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const pending = disposeTimersRef.current.get(store)
    if (pending !== undefined) {
      clearTimeout(pending)
      disposeTimersRef.current.delete(store)
    }

    return () => {
      const timer = setTimeout(() => {
        disposeTimersRef.current.delete(store)
        store.dispose()
      }, 0)
      disposeTimersRef.current.set(store, timer)
    }
  }, [store])

  const [status, setStatus] = useState<GhostRoomStatus>('idle')
  const [peers, setPeers] = useState<readonly PeerInfo[]>([])
  const [feedback, setFeedback] = useState<RoomFeedback | null>(null)
  const [connectionError, setConnectionError] = useState<RoomFeedbackKey | null>(null)
  const [ttlPreset, setTtlPresetState] = useState<TtlPreset>('50m')
  const [installedHint, setInstalledHint] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({})
  /**
   * Every engine rebuild increments this nonce, so one manual reconnect or one
   * scheduled guest rejoin replaces the signaling engine without touching the
   * store, the feed or the transfer history.
   */
  const [reconnectNonce, setReconnectNonce] = useState(0)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  /** Survives the engine effect so the backoff budget is never restarted early. */
  const reconnectAttemptsRef = useRef(0)

  const engineRef = useRef<PeerJsEngine | null>(null)
  const sendMetaRef = useRef(new Map<string, SendMeta>())
  const namesRef = useRef(new Map<string, string>())
  const warnedRef = useRef(new Set<string>())
  const ttlPresetRef = useRef<TtlPreset>('50m')
  /** Last committed whole percent per item, so 16KB frames never thrash React. */
  const progressPercentRef = useRef(new Map<string, number>())
  /**
   * Async actions can resolve after their component is gone, so every state
   * write that follows an await is gated on this flag. It mirrors the `active`
   * flag the engine effect already uses.
   */
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    ttlPresetRef.current = ttlPreset
  }, [ttlPreset])

  /**
   * One preset change writes the ref synchronously, so a drop sent in the same
   * tick already uses the new rule, then retimes every active item so a note or
   * file sent before the change adopts the new cleanup rule immediately.
   * Source: docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/web-task.md item 5.4.
   */
  const applyTtlPreset = useCallback(
    (nextPreset: TtlPreset) => {
      ttlPresetRef.current = nextPreset
      setTtlPresetState(nextPreset)

      if (store.isDisposed()) return

      const burnOnCopy = nextPreset === 'BURN_ON_COPY'
      const ttlMs = ttlMsForPreset(nextPreset)
      const now = store.now()

      for (const item of store.getSnapshot()) {
        if (item.status === 'expired' || item.status === 'nuked' || item.status === 'error') continue
        const deleteAt = burnOnCopy || ttlMs === null ? null : now + ttlMs
        store.updateItem(item.id, { burnOnCopy, deleteAt })
      }
    },
    [store],
  )

  useEffect(() => {
    sendMetaRef.current.clear()
    namesRef.current.clear()
    warnedRef.current.clear()
    progressPercentRef.current.clear()
    reconnectAttemptsRef.current = 0
    setReconnectAttempt(0)
    setProgress({})
    setPeers([])
    setConnectionError(null)

    return () => {
      // A lost ACK leaves an entry behind, so stale send metadata is dropped
      // with the room and with the mount rather than accumulating.
      sendMetaRef.current.clear()
    }
  }, [session.roomCode])

  const dismissFeedback = useCallback(() => setFeedback(null), [])

  /** Mount-safe feedback write for the async action paths. */
  const announce = useCallback((next: RoomFeedback) => {
    if (mountedRef.current) setFeedback(next)
  }, [])

  /** Public door for UI copy actions, such as the hub room code copy. */
  const announceFeedback = useCallback(
    (key: RoomFeedbackKey) => {
      announce(buildFeedback(key))
    },
    [announce],
  )

  /**
   * Turns a wire progress event into a 0 to 1 value for the feed.
   * One whole percent step per commit keeps a fast 16KB stream from
   * re-rendering the page hundreds of times per file.
   */
  const publishProgress = useCallback((payload: TransferProgress) => {
    const total = payload.totalBytes
    const ratio = total > 0 ? payload.bytesTransferred / total : payload.percent / 100
    const clamped = Math.min(1, Math.max(0, ratio))
    const percent = Math.round(clamped * 100)

    if (progressPercentRef.current.get(payload.id) === percent) return
    progressPercentRef.current.set(payload.id, percent)

    if (!mountedRef.current) return
    setProgress((current) =>
      current[payload.id] === clamped ? current : { ...current, [payload.id]: clamped },
    )
  }, [])

  const handleExpire = useCallback((expiredIds: readonly string[]) => {
    const firstId = expiredIds[0]
    if (!firstId) return
    const itemName = namesRef.current.get(firstId)
    for (const id of expiredIds) namesRef.current.delete(id)
    setFeedback(
      buildFeedback('INFO_TTL_EXPIRED', {
        preset: ttlPresetRef.current,
        ...(itemName ? { itemName } : {}),
      }),
    )
  }, [])

  const { items, now, remainingMs } = useTtlJanitor({ store, onExpire: handleExpire })

  // Warn once per item inside the last minute so nothing vanishes unannounced.
  useEffect(() => {
    if (warnedRef.current.size > MAX_WARNED_IDS) warnedRef.current.clear()

    for (const item of items) {
      const remaining = getRemainingMs(item, now)
      if (remaining === null || remaining <= 0 || remaining > WARN_WINDOW_MS) continue
      if (warnedRef.current.has(item.id)) continue

      warnedRef.current.add(item.id)
      const itemName = namesRef.current.get(item.id) ?? item.fileName
      setFeedback(
        buildFeedback('WARN_TTL_EXPIRING_SOON', itemName ? { itemName } : undefined),
      )
      break
    }
  }, [items, now])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }

    const update = () => {
      setInstalledHint(standaloneQuery.matches || navigatorWithStandalone.standalone === true)
    }

    update()
    standaloneQuery.addEventListener('change', update)
    return () => standaloneQuery.removeEventListener('change', update)
  }, [])

  // One signaling engine per room. Everything it raises is mapped to a copy deck
  // key before it can reach a component.
  useEffect(() => {
    if (!autoConnect) return

    if (!session.roomCode) {
      setStatus('error')
      setConnectionError('ERR_ROOM_NOT_FOUND')
      setFeedback(buildFeedback('ERR_ROOM_NOT_FOUND'))
      return
    }

    const roomCode = session.roomCode
    const role = session.role
    let active = true
    let rejoinTimer: ReturnType<typeof setTimeout> | null = null

    const clearRejoinTimer = () => {
      if (rejoinTimer === null) return
      clearTimeout(rejoinTimer)
      rejoinTimer = null
    }

    /** True while the guest still has one scheduled rejoin left in the budget. */
    const hasRejoinBudget = (): boolean =>
      REJOIN_DELAYS_MS[reconnectAttemptsRef.current] !== undefined

    /**
     * Guest rejoin. The engine is rebuilt through the nonce, so the signaling id
     * is fresh while the store and the feed keep every item that already landed.
     * Locked schedule: 900ms, 1800ms, 2700ms, 3600ms, then stop.
     */
    const scheduleRejoin = (): boolean => {
      const delay = REJOIN_DELAYS_MS[reconnectAttemptsRef.current]
      if (delay === undefined) return false

      reconnectAttemptsRef.current += 1
      setReconnectAttempt(reconnectAttemptsRef.current)
      setStatus('reconnecting')
      clearRejoinTimer()
      rejoinTimer = setTimeout(() => {
        rejoinTimer = null
        if (!active) return
        setReconnectNonce((current) => current + 1)
      }, delay)
      return true
    }

    /** The budget is spent, so the playful dead end card is allowed on screen. */
    const surrender = () => {
      setStatus('error')
      setConnectionError('ERR_PEER_DISCONNECTED')
      setFeedback(buildFeedback('ERR_PEER_DISCONNECTED'))
    }

    const engine = new PeerJsEngine()
    engineRef.current = engine

    const receiver = new ChunkReceiver({
      send: (packet: WirePacket) => engine.send(packet),
      onProgress: (payload) => engine.reportTransferProgress(payload),
      onItem: (received) => {
        if (!active || store.isDisposed() || store.hasItem(received.id)) return
        namesRef.current.set(received.id, received.name)
        store.addFile({
          id: received.id,
          file: received.blob,
          fileName: received.name,
          mime: received.mime,
          direction: 'received',
          ttlMs: received.ttlMs,
          burnOnCopy: received.burnOnRead,
        })
      },
      onError: () => {
        if (!active) return
        setFeedback(buildFeedback('ERR_CHUNK_INTERRUPTED'))
      },
    })

    const unsubscribePacket = engine.on('packet', ({ packet, from }) => {
      if (!active) return

      switch (packet.type) {
        case 'TEXT': {
          if (store.isDisposed() || store.hasItem(packet.id)) return
          namesRef.current.set(packet.id, 'that note')
          // The deadline is anchored to the local receipt clock, never to
          // packet.timestamp, so a sender with a skewed clock can neither
          // expire a note on arrival nor stretch it past the chosen preset.
          // The store defaults createdAt to its own Date.now clock, exactly
          // like the received file path below.
          store.addText({
            id: packet.id,
            text: packet.text,
            direction: 'received',
            ttlMs: packet.ttlMs,
            burnOnCopy: packet.burnOnRead === true,
            peerId: from,
          })
          setFeedback(buildFeedback('SUCCESS_TEXT_RECEIVED'))
          return
        }
        case 'FILE_START':
        case 'FILE_CHUNK':
        case 'FILE_END':
          receiver.handlePacket(packet)
          return
        case 'FILE_ACK': {
          const meta = sendMetaRef.current.get(packet.id)
          // A relayed ACK for another device's file is not ours to settle.
          if (!meta) return
          sendMetaRef.current.delete(packet.id)

          if (packet.status === 'OK') {
            if (meta.dropAndNuke) {
              store.acknowledgeDelivery(packet.id)
              setFeedback(
                buildFeedback('SUCCESS_DROP_AND_NUKE', { fileName: meta.fileName }),
              )
            } else {
              store.updateItem(packet.id, { status: 'ready' })
              setFeedback(buildFeedback('SUCCESS_FILE_SENT', { fileName: meta.fileName }))
            }
          } else {
            store.updateItem(packet.id, { status: 'error' })
            setFeedback(buildFeedback('ERR_CHUNK_INTERRUPTED'))
          }
          return
        }
        case 'ITEM_NUKE': {
          // Read the name before removal so the poof notice can name the item.
          const nukedItem = store.getItem(packet.id)
          const nukedName = nukedItem ? itemNameFor(nukedItem) : namesRef.current.get(packet.id)
          const removed = store.removeItem(packet.id, packet.reason)
          if (removed) {
            sendMetaRef.current.delete(packet.id)
            namesRef.current.delete(packet.id)
            if (packet.reason === 'BURN_ON_COPY') {
              setFeedback(
                buildFeedback('INFO_TTL_EXPIRED', {
                  preset: 'BURN_ON_COPY',
                  itemName: nukedName ?? 'that item',
                }),
              )
            }
          }
          return
        }
        case 'HELLO_PEER':
          return
      }
    })

    const unsubscribeBinary = engine.on('binary', ({ data }) => {
      if (!active) return
      receiver.handleBinary(data)
    })

    // Every byte count travels through the engine event bus, so the feed and
    // any future surface read the same progress source.
    const unsubscribeProgress = engine.on('transfer:progress', (payload) => {
      if (!active) return
      publishProgress(payload)
    })

    const unsubscribeStatus = engine.on('status', ({ status: engineStatus }) => {
      if (!active) return
      if (engineStatus === 'connecting') setStatus('connecting')
      else if (engineStatus === 'connected') setStatus('connected')
      else if (engineStatus === 'reconnecting') setStatus('reconnecting')
      else if (engineStatus === 'disconnected') {
        // A queued guest rejoin already owns the label, so no dead end flashes.
        if (role === 'peer' && reconnectAttemptsRef.current > 0 && hasRejoinBudget()) return
        setStatus('error')
      }
    })

    const unsubscribeJoin = engine.on('peer:join', () => {
      if (!active) return
      clearRejoinTimer()
      reconnectAttemptsRef.current = 0
      setReconnectAttempt(0)
      setPeers([...engine.peers])
      setConnectionError(null)
      setStatus('connected')
      setFeedback(buildFeedback('SUCCESS_PEER_JOINED'))
    })

    const unsubscribeLeave = engine.on('peer:leave', () => {
      if (!active) return

      if (role === 'host') {
        // The host stays on the air for the next screen, so a screen leaving is
        // a short notice, never a blocking failure.
        setPeers([...engine.peers])
        setStatus('connecting')
        setConnectionError(null)
        setFeedback(buildFeedback('ERR_PEER_DISCONNECTED'))
        return
      }

      setPeers([])
      setConnectionError(null)
      if (scheduleRejoin()) return
      surrender()
    })

    const unsubscribeError = engine.on('error', ({ code }) => {
      if (!active) return
      const key = feedbackKeyForError(code, role)
      if (isConnectionFailure(code)) {
        // A guest with a queued retry stays quiet until the budget is spent.
        if (role === 'peer' && reconnectAttemptsRef.current > 0 && hasRejoinBudget()) return
        setConnectionError(key)
        setStatus((current) => (current === 'connected' ? current : 'error'))
      }
      setFeedback(buildFeedback(key, { roomCode: roomCode ?? undefined }))
    })

    const deviceType = localDeviceType
    // A rebuild during a rejoin keeps saying Reconnecting instead of blinking
    // back to Linking up between attempts.
    setStatus((current) => (current === 'reconnecting' ? current : 'connecting'))
    setConnectionError(null)

    void engine
      .connect({
        roomCode,
        role,
        deviceName: options.deviceName ?? deviceNameFor(deviceType),
        deviceType,
      })
      .then(() => {
        if (!active) return
        setStatus('connected')
        setPeers([...engine.peers])
      })
      .catch((error: unknown) => {
        if (!active) return
        const isRejoin = role === 'peer' && reconnectAttemptsRef.current > 0
        if (isRejoin) {
          // The host may still be coming back, so spend the budget first.
          if (scheduleRejoin()) return
          surrender()
          return
        }
        const key = feedbackKeyForError(isP2PError(error) ? error.code : 'SIGNALING_ERROR', role)
        setStatus('error')
        setConnectionError(key)
        setFeedback(buildFeedback(key, { roomCode }))
      })

    return () => {
      active = false
      clearRejoinTimer()
      unsubscribePacket()
      unsubscribeBinary()
      unsubscribeStatus()
      unsubscribeJoin()
      unsubscribeLeave()
      unsubscribeError()
      unsubscribeProgress()
      receiver.disposeAll()
      engine.destroy()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [
    autoConnect,
    session.roomCode,
    session.role,
    store,
    options.deviceName,
    publishProgress,
    reconnectNonce,
    localDeviceType,
  ])

  /**
   * Every Reconnect action lands here: the budget starts over, the error card
   * clears, and the engine is rebuilt on the next effect pass. The store, the
   * feed and the auto-delete timers are untouched.
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    setReconnectAttempt(0)
    setConnectionError(null)
    setStatus('connecting')
    setReconnectNonce((current) => current + 1)
  }, [])

  const sendText = useCallback(
    async (text: string): Promise<boolean> => {
      const value = text.trim()
      if (!value) return false

      const engine = engineRef.current
      if (!engine || store.isDisposed() || engine.peers.length === 0) {
        announce(buildFeedback('ERR_PEER_DISCONNECTED'))
        return false
      }

      const preset = ttlPresetRef.current
      const burnOnRead = preset === 'BURN_ON_COPY'
      const ttlMs = ttlMsForPreset(preset)
      const id = createItemId()

      try {
        engine.send({
          type: 'TEXT',
          id,
          text: value,
          timestamp: Date.now(),
          ttlMs,
          burnOnRead,
        })
        if (!store.hasItem(id)) {
          namesRef.current.set(id, 'that note')
          store.addText({ id, text: value, direction: 'sent', ttlMs, burnOnCopy: burnOnRead })
        }
        announce(buildFeedback('SUCCESS_TEXT_SENT'))
        return true
      } catch {
        announce(buildFeedback('ERR_CHUNK_INTERRUPTED'))
        return false
      }
    },
    [announce, store],
  )

  const sendFiles = useCallback(
    async (files: readonly File[], sendOptions: GhostSendOptions = {}): Promise<number> => {
      const engine = engineRef.current
      if (!engine || store.isDisposed()) {
        announce(buildFeedback('ERR_PEER_DISCONNECTED'))
        return 0
      }

      const transports: P2PTransport[] = []
      for (const peer of engine.peers) {
        const transport = engine.getTransport(peer.peerId)
        if (transport && transport.isOpen) transports.push(transport)
      }
      if (transports.length === 0) {
        announce(buildFeedback('ERR_PEER_DISCONNECTED'))
        return 0
      }

      const preset = ttlPresetRef.current
      const burnOnRead = preset === 'BURN_ON_COPY'
      const ttlMs = ttlMsForPreset(preset)
      const dropAndNuke = sendOptions.dropAndNuke === true
      let sent = 0

      for (const file of files) {
        const id = createItemId()

        try {
          namesRef.current.set(id, file.name)
          sendMetaRef.current.set(id, { fileName: file.name, dropAndNuke })
          store.addFile({
            id,
            file,
            fileName: file.name,
            mime: file.type,
            direction: 'sent',
            ttlMs,
            burnOnCopy: burnOnRead,
            status: 'sending',
          })

          const results = await Promise.allSettled(
            transports.map((connection) =>
              streamFile({
                connection,
                file,
                transferId: id,
                ttlMs,
                dropAndNuke,
                burnOnRead,
                name: file.name,
                mime: file.type,
                onProgress: (payload) => engine.reportTransferProgress(payload),
              }),
            ),
          )

          const everyTransportFailed = results.every((result) => result.status === 'rejected')
          if (everyTransportFailed) {
            sendMetaRef.current.delete(id)
            store.updateItem(id, { status: 'error' })
            announce(buildFeedback('ERR_CHUNK_INTERRUPTED'))
            continue
          }

          sent += 1
        } catch {
          sendMetaRef.current.delete(id)
          if (store.hasItem(id)) store.updateItem(id, { status: 'error' })
          announce(buildFeedback('ERR_CHUNK_INTERRUPTED'))
        }
      }

      return sent
    },
    [announce, store],
  )

  /**
   * Burn on copy, synced. The store removal is local only, so the same instant
   * we also tell every connected screen to drop the item and show the same poof
   * confirmation. Without this the sender kept a dead copy on screen.
   * Source: docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/web-task.md item 5.2.
   */
  const consumeAndSyncBurnOnCopy = useCallback(
    (id: string, itemName?: string): boolean => {
      const burned = store.consumeBurnOnCopy(id)
      if (!burned) return false

      sendMetaRef.current.delete(id)
      namesRef.current.delete(id)

      const engine = engineRef.current
      if (engine && engine.peers.length > 0) {
        try {
          engine.send({ type: 'ITEM_NUKE', id, reason: 'BURN_ON_COPY' })
        } catch {
          // The local copy is already gone, a lost notice never blocks the burn.
        }
      }

      announce(
        buildFeedback('INFO_TTL_EXPIRED', {
          preset: 'BURN_ON_COPY',
          itemName: itemName ?? 'that item',
        }),
      )
      return true
    },
    [announce, store],
  )

  /** Native OS share sheet for one note or file, then honours burn on copy. */
  const shareItem = useCallback(
    async (id: string): Promise<boolean> => {
      const item = store.getItem(id)
      if (!item) return false
      if (!canNativeShare()) return false

      try {
        if (item.kind === 'file') {
          const blob = await resolveItemBlob(item)
          if (!blob) return false

          const fileName = item.fileName ?? 'ghostdrop-file'
          const type = item.mime || blob.type || 'application/octet-stream'
          const file = new File([blob], fileName, { type })
          const data: ShareData = { files: [file], title: fileName }

          if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) {
            return false
          }
          await navigator.share(data)
        } else if (item.kind === 'text' && typeof item.text === 'string') {
          await navigator.share({ text: item.text })
        } else {
          return false
        }
      } catch {
        // A dismissed share sheet is a normal outcome, never an error card.
        return false
      }

      if (!consumeAndSyncBurnOnCopy(id, itemNameFor(item))) {
        announce(buildFeedback('SUCCESS_SHARED'))
      }
      return true
    },
    [announce, consumeAndSyncBurnOnCopy, store],
  )

  /**
   * Copy to clipboard. Text uses `writeText` with an `execCommand` fallback for
   * plain HTTP LAN origins where `navigator.clipboard` is blocked, images go
   * through `ClipboardItem` after a PNG conversion, and a blocked write falls
   * back to the native share sheet before the playful retry card.
   */
  const copyItem = useCallback(
    async (id: string): Promise<boolean> => {
      const item = store.getItem(id)
      if (!item) return false

      let copied = false
      if (item.kind === 'text' && typeof item.text === 'string') {
        copied = await writeTextToClipboard(item.text)
      } else if ((item.mime ?? '').startsWith('image/')) {
        copied = await writeImageToClipboard(item)
      }

      if (!copied) {
        // A blocked clipboard still gets a joyful way out, never a silent tap.
        if (canNativeShare()) {
          const shared = await shareItem(id)
          if (shared) return true
        }
        announce(buildFeedback('ERR_CLIPBOARD_BLOCKED'))
        return false
      }

      if (!consumeAndSyncBurnOnCopy(id, itemNameFor(item))) {
        // A picture copy lands on the picture clipboard, so it says so.
        announce(buildFeedback(isImageItem(item) ? 'SUCCESS_COPIED_IMAGE' : 'SUCCESS_COPIED'))
      }
      return true
    },
    [announce, consumeAndSyncBurnOnCopy, shareItem, store],
  )

  /** Saves one received file or note. Burn on copy still dies on that first save. */
  const saveItem = useCallback(
    (id: string): boolean => {
      const item = store.getItem(id)
      if (!item) return false

      let saved = false
      if (item.blobUrl) {
        saved = triggerDownload(item.blobUrl, item.fileName ?? 'ghostdrop-file')
      } else if (item.kind === 'text' && typeof item.text === 'string') {
        saved = downloadTextNote(item.text, 'ghostdrop-note.txt')
      }

      if (!saved) {
        announce(buildFeedback('ERR_CHUNK_INTERRUPTED'))
        return false
      }

      if (!consumeAndSyncBurnOnCopy(id, itemNameFor(item))) {
        announce(buildFeedback('SUCCESS_SAVED', { fileName: itemNameFor(item) }))
      }
      return true
    },
    [announce, consumeAndSyncBurnOnCopy, store],
  )

  const burnItem = useCallback(
    (id: string): boolean => {
      if (!store.getItem(id)) return false
      const burned = store.burnNow(id)
      if (!burned) return false

      sendMetaRef.current.delete(id)
      namesRef.current.delete(id)

      const engine = engineRef.current
      if (engine && engine.peers.length > 0) {
        engine.send({ type: 'ITEM_NUKE', id, reason: 'MANUAL_BURN' })
      }
      return true
    },
    [store],
  )

  return {
    roomCode: session.roomCode,
    role: session.role,
    status,
    peers,
    items,
    now,
    progress,
    remainingMs,
    ttlPreset,
    setTtlPreset: applyTtlPreset,
    feedback,
    dismissFeedback,
    announceFeedback,
    connectionError,
    reconnect,
    reconnectAttempt,
    installedHint,
    sendText,
    sendFiles,
    copyItem,
    shareItem,
    saveItem,
    burnItem,
    localDeviceType,
    localDeviceName,
  }
}
