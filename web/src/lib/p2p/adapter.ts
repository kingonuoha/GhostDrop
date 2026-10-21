/**
 * Signaling adapter contract.
 * Nothing in this file talks to PeerJS, so a SupabaseRealtimeAdapter can be
 * dropped in later without touching React components (decisions.md D-002).
 */

import type { DeviceType, TransferProgress, WirePacket } from '../../types/protocol'
import type { P2PErrorCode } from './errors'

export type PeerRole = 'host' | 'peer'

export type P2PStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'destroyed'

export interface PeerInfo {
  peerId: string
  deviceName: string
  deviceType: DeviceType
  connectedAt: number
}

export interface PeerLeavePayload {
  peerId: string
  reason: string
}

export interface PacketPayload {
  packet: WirePacket
  from: string
}

export interface BinaryPayload {
  data: ArrayBuffer
  from: string
}

export interface StatusPayload {
  status: P2PStatus
  detail?: string
}

export interface ErrorPayload {
  code: P2PErrorCode
  message: string
}

export interface P2PEventMap {
  'peer:join': PeerInfo
  'peer:leave': PeerLeavePayload
  packet: PacketPayload
  binary: BinaryPayload
  status: StatusPayload
  error: ErrorPayload
  'transfer:progress': TransferProgress
}

export type P2PEventName = keyof P2PEventMap

export type P2PEventListener<K extends P2PEventName> = (payload: P2PEventMap[K]) => void

export interface P2PConnectOptions {
  roomCode: string
  role: PeerRole
  deviceName: string
  deviceType: DeviceType
  signal?: AbortSignal
}

export interface P2PSendOptions {
  /** Restrict delivery to one peer id. Omit to reach every connected peer. */
  to?: string
  /** Restrict delivery to a set of peer ids. Omit to reach every connected peer. */
  toMany?: readonly string[]
}

/**
 * Minimal per-peer transport surface consumed by the 16KB streamer.
 * Implemented over RTCDataChannel with bufferedAmount backpressure.
 */
export interface P2PTransport {
  readonly peerId: string
  readonly isOpen: boolean
  readonly bufferedAmount: number
  bufferedAmountLowThreshold: number
  /** Enqueues one JSON control frame. Ordering is FIFO per transport. */
  sendText(text: string): void
  /** Enqueues one binary frame. Rejects when closed or outside the 16KB budget. */
  sendBinary(data: ArrayBuffer): Promise<void>
  /**
   * Enqueues a D-011 pair atomically: the JSON header followed by exactly one
   * binary frame, with no other frame allowed between them. Rejects when the
   * channel is closed or the frame is outside the 16KB budget.
   */
  sendFrame(headerText: string, data: ArrayBuffer): Promise<void>
  /** Subscribes to bufferedamountlow. Returns an unsubscribe function. */
  onBufferedAmountLow(listener: () => void): () => void
}

export interface P2PSignalingAdapter {
  readonly role: PeerRole | null
  readonly roomCode: string
  readonly localPeerId: string
  readonly status: P2PStatus
  readonly peers: readonly PeerInfo[]

  isConnected(): boolean

  connect(options: P2PConnectOptions): Promise<void>
  disconnect(): void
  destroy(): void

  /** Sends a validated packet to one peer, a set of peers, or everyone. */
  send(packet: WirePacket, options?: P2PSendOptions): void
  /**
   * Sends one raw binary frame. Rejects when no channel is open or when the
   * frame is empty or larger than `CHUNK_SIZE_BYTES`.
   */
  sendBinary(data: ArrayBuffer, options?: P2PSendOptions): Promise<void>
  /** Sends a packet to every connected peer. */
  broadcast(packet: WirePacket): void

  getTransport(peerId: string): P2PTransport | null

  /** Publishes local transfer progress through the adapter event bus. */
  reportTransferProgress(progress: TransferProgress): void

  on<K extends P2PEventName>(event: K, listener: P2PEventListener<K>): () => void
  off<K extends P2PEventName>(event: K, listener: P2PEventListener<K>): void
}
