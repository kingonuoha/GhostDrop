/**
 * Public barrel for the GhostDrop P2P layer.
 * UI code imports from here, never from peerjs directly.
 */

export * from '../../types/protocol'
export * from './adapter'
export * from './errors'
export * from './roomCode'
export * from './peerjsEngine'
export * from './fileStreamer'
export * from './chunkReceiver'
/** Named re-export so the receiver start contract is discoverable in the barrel. */
export type { ChunkReceiverOptions, ReceivedFileItem, StartedFileTransfer } from './chunkReceiver'
export * from './janitor'
/** Named re-export so the placeholder completion contract is discoverable. */
export type { AddFileInput, CompleteReceivedFileOptions } from './janitor'
export * from './compactSdp'
export * from './iceUnmask'
export * from './offlineDirectEngine'
