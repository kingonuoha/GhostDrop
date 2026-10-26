/**
 * Shared P2P wire protocol contract (Phase 1 Web and PWA, Phase 2 Android ready).
 * Source of truth: docs/06-protocol-and-tech-spec.md section 3 and decisions.md D-011.
 */

export const CHUNK_SIZE_BYTES = 16384
export const BUFFERED_LOW_THRESHOLD = 65536
export const MAX_BUFFERED_AMOUNT = 262144

export const ROOM_CODE_LENGTH = 6
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_PREFIX = 'ghostdrop-room-'
export const PEER_PREFIX = 'ghostdrop-peer-'

export const MAX_CONCURRENT_TRANSFERS = 8
export const MAX_TOTAL_TRANSFER_BYTES = 268435456

export type DeviceType = 'desktop' | 'mobile' | 'tablet'

export type NukeReason = 'TTL_EXPIRED' | 'MANUAL_BURN' | 'BURN_ON_COPY'

export type AckStatus = 'OK' | 'ERROR'

export interface HelloPeerPacket {
  type: 'HELLO_PEER'
  peerId: string
  deviceName: string
  deviceType: DeviceType
}

export interface TextPacket {
  type: 'TEXT'
  id: string
  text: string
  timestamp: number
  ttlMs: number | null
  burnOnRead?: boolean
}

export interface FileStartPacket {
  type: 'FILE_START'
  id: string
  name: string
  size: number
  mime: string
  totalChunks: number
  ttlMs: number | null
  dropAndNuke?: boolean
  /** `Delete after 1st copy`: the receiver burns the file on first copy or save. */
  burnOnRead?: boolean
}

/**
 * JSON control header for one binary frame (decisions.md D-011).
 * The header is immediately followed by exactly one ArrayBuffer frame
 * holding only that chunk, never larger than CHUNK_SIZE_BYTES.
 */
export interface FileChunkPacket {
  type: 'FILE_CHUNK'
  id: string
  index: number
  byteLength: number
}

export interface FileEndPacket {
  type: 'FILE_END'
  id: string
}

export interface FileAckPacket {
  type: 'FILE_ACK'
  id: string
  status: AckStatus
}

export interface ItemNukePacket {
  type: 'ITEM_NUKE'
  id: string
  reason: NukeReason
}

/**
 * Shared room rule. The auto-delete preset is a property of the room, not of
 * one screen, so a change on any device is announced to the rest of the room.
 * The host relays it like every other control packet, and a receiver applies
 * it without echoing, so the rule converges in one hop.
 */
export interface TtlSetPacket {
  type: 'TTL_SET'
  ttlPreset: TtlPreset
}

export type WirePacket =
  | HelloPeerPacket
  | TextPacket
  | FileStartPacket
  | FileChunkPacket
  | FileEndPacket
  | FileAckPacket
  | ItemNukePacket
  | TtlSetPacket

export type WirePacketType = WirePacket['type']

export type TtlPreset = 'BURN_ON_COPY' | '15m' | '50m' | '24h' | 'TAB_CLOSE'

/**
 * Milliseconds until auto-delete for each preset.
 * BURN_ON_COPY uses 0 because the item dies after the first read.
 * TAB_CLOSE is null because it never expires on a timer.
 */
export const TTL_PRESET_MS: Readonly<Record<TtlPreset, number | null>> = {
  BURN_ON_COPY: 0,
  '15m': 15 * 60 * 1000,
  '50m': 50 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  TAB_CLOSE: null,
}

export function ttlPresetToMs(preset: TtlPreset): number | null {
  return TTL_PRESET_MS[preset]
}

export function isTtlPreset(value: unknown): value is TtlPreset {
  return (
    value === 'BURN_ON_COPY' ||
    value === '15m' ||
    value === '50m' ||
    value === '24h' ||
    value === 'TAB_CLOSE'
  )
}

export type TransferDirection = 'send' | 'receive'

export interface TransferProgress {
  id: string
  direction: TransferDirection
  bytesTransferred: number
  totalBytes: number
  chunksTransferred: number
  totalChunks: number
  percent: number
  bytesPerSecond: number
  startedAt: number
  updatedAt: number
}

export type EphemeralItemKind = 'text' | 'file'

export type EphemeralItemDirection = 'sent' | 'received'

/**
 * Lifecycle states for an in-memory drop.
 * sending: transfer in flight or awaiting FILE_ACK
 * ready: usable by the UI (copy, download, forward)
 * expired: TTL hit or drop-and-nuke already ran, the object URL is revoked
 * error: transfer or send failed, the item is not usable
 * nuked: removed by the user, kept only for exit animation bookkeeping
 */
export type EphemeralItemStatus = 'sending' | 'ready' | 'expired' | 'error' | 'nuked'

/**
 * One ephemeral drop held in JS memory only (`docs/06-protocol-and-tech-spec.md`
 * section 5). `blobUrl` is always created and revoked through the
 * `EphemeralStore`, never by a component.
 * `deleteAt` is null when the item never expires on a timer (tab close or
 * burn on copy), so countdowns must treat null as "no timer".
 */
export interface EphemeralItem {
  id: string
  kind: EphemeralItemKind
  text?: string
  fileName?: string
  mime?: string
  size?: number
  /**
   * Live Blob reference for the active item only, so clipboard copy and native
   * share stay synchronous. Cleared on every removal and expiry path together
   * with `blobUrl`, so zero bytes stay in RAM (decisions.md D-014 item 4).
   */
  blob?: Blob
  blobUrl?: string
  direction: EphemeralItemDirection
  peerId?: string
  createdAt: number
  deleteAt: number | null
  burnOnCopy: boolean
  status: EphemeralItemStatus
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isIndex(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0
}

function isTtlMs(value: unknown): value is number | null {
  return value === null || (isFiniteNumber(value) && value >= 0)
}

export function isDeviceType(value: unknown): value is DeviceType {
  return value === 'desktop' || value === 'mobile' || value === 'tablet'
}

function isNukeReason(value: unknown): value is NukeReason {
  return value === 'TTL_EXPIRED' || value === 'MANUAL_BURN' || value === 'BURN_ON_COPY'
}

function isAckStatus(value: unknown): value is AckStatus {
  return value === 'OK' || value === 'ERROR'
}

/**
 * Structural runtime guard. Used on every inbound packet because
 * RTCDataChannel payloads are untrusted input.
 */
export function isWirePacket(value: unknown): value is WirePacket {
  if (!isRecord(value)) return false

  switch (value.type) {
    case 'HELLO_PEER':
      return (
        isNonEmptyString(value.peerId) &&
        isNonEmptyString(value.deviceName) &&
        isDeviceType(value.deviceType)
      )
    case 'TEXT':
      return (
        isNonEmptyString(value.id) &&
        typeof value.text === 'string' &&
        isFiniteNumber(value.timestamp) &&
        isTtlMs(value.ttlMs) &&
        (value.burnOnRead === undefined || typeof value.burnOnRead === 'boolean')
      )
    case 'FILE_START':
      return (
        isNonEmptyString(value.id) &&
        isNonEmptyString(value.name) &&
        isIndex(value.size) &&
        typeof value.mime === 'string' &&
        isIndex(value.totalChunks) &&
        isTtlMs(value.ttlMs) &&
        (value.dropAndNuke === undefined || typeof value.dropAndNuke === 'boolean') &&
        (value.burnOnRead === undefined || typeof value.burnOnRead === 'boolean')
      )
    case 'FILE_CHUNK':
      return (
        isNonEmptyString(value.id) &&
        isIndex(value.index) &&
        isIndex(value.byteLength) &&
        value.byteLength > 0 &&
        value.byteLength <= CHUNK_SIZE_BYTES
      )
    case 'FILE_END':
      return isNonEmptyString(value.id)
    case 'FILE_ACK':
      return isNonEmptyString(value.id) && isAckStatus(value.status)
    case 'ITEM_NUKE':
      return isNonEmptyString(value.id) && isNukeReason(value.reason)
    case 'TTL_SET':
      return isTtlPreset(value.ttlPreset)
    default:
      return false
  }
}

export function parseWirePacket(raw: string): WirePacket | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  return isWirePacket(parsed) ? parsed : null
}

export function serializeWirePacket(packet: WirePacket): string {
  return JSON.stringify(packet)
}

/**
 * Normalizes an inbound binary frame to a standalone ArrayBuffer.
 * Returns null for anything that is not binary data.
 */
export function toBinaryFrame(data: unknown): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data
  if (ArrayBuffer.isView(data)) {
    const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    const copy = new Uint8Array(view.byteLength)
    copy.set(view)
    return copy.buffer
  }
  return null
}
