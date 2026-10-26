/**
 * Chunk receiver and reassembler.
 * Accepts FILE_START, FILE_CHUNK header plus binary frame, and FILE_END,
 * validates every frame against the declared size, rebuilds an exact-size Blob
 * with the declared MIME type, and answers with FILE_ACK.
 * Source: docs/06-protocol-and-tech-spec.md section 3 and decisions.md D-011.
 */

import {
  CHUNK_SIZE_BYTES,
  MAX_CONCURRENT_TRANSFERS,
  MAX_TOTAL_TRANSFER_BYTES,
} from '../../types/protocol'
import type {
  FileAckPacket,
  FileChunkPacket,
  FileStartPacket,
  TransferProgress,
  WirePacket,
} from '../../types/protocol'
import { P2PError, type P2PErrorCode } from './errors'

/** Bounded memory of transfer ids that already finished (or failed). */
const MAX_SETTLED_TRANSFER_IDS = 64

/**
 * A transfer that starts and then stalls would leave a permanent receiving
 * card, because the store placeholder only settles on completion or on error.
 * Each active transfer owns one timer, re-armed on every accepted chunk, so a
 * silent stream fails its own card instead of hanging forever.
 */
export const IDLE_TIMEOUT_MS = 30000

/**
 * A rejected FILE_START cannot cancel a sender mid stream, and binary frames
 * carry no transfer id, so the receiver absorbs at most one file worth of
 * orphan frames per rejection instead of reporting one error per frame.
 * The allowance is a counter, never a buffer, so memory stays constant.
 */
const MAX_STRAY_BINARY_FRAMES = Math.ceil(MAX_TOTAL_TRANSFER_BYTES / CHUNK_SIZE_BYTES)

export interface ReceivedFileItem {
  id: string
  name: string
  size: number
  mime: string
  blob: Blob
  totalChunks: number
  ttlMs: number | null
  dropAndNuke: boolean
  /** Mirrors `FILE_START.burnOnRead`: burn this file after the first copy or save. */
  burnOnRead: boolean
  receivedAt: number
}

/**
 * A FILE_START that passed every validation gate and is now assembling in
 * memory. Emitted before any chunk lands, so the receiver screen can show a
 * live card at 0 percent instead of waiting for the whole file.
 */
export interface StartedFileTransfer {
  id: string
  name: string
  size: number
  mime: string
  totalChunks: number
  ttlMs: number | null
  dropAndNuke: boolean
  burnOnRead: boolean
  startedAt: number
}

export interface ChunkReceiverOptions {
  /** Sends control packets back to the room (FILE_ACK). */
  send: (packet: WirePacket) => void
  /** Fires once per accepted FILE_START, never for a rejected start. */
  onStart?: (transfer: StartedFileTransfer) => void
  onItem?: (item: ReceivedFileItem) => void
  onProgress?: (progress: TransferProgress) => void
  onError?: (error: P2PError) => void
  maxConcurrentTransfers?: number
  maxTotalBytes?: number
  now?: () => number
}

interface PendingChunk {
  index: number
  byteLength: number
}

interface ActiveTransfer {
  start: FileStartPacket
  chunks: ArrayBuffer[]
  bytesReceived: number
  chunksReceived: number
  pending: PendingChunk | null
  startedAt: number
  lastProgressAt: number
  /** Idle watchdog handle. Exactly one live timer per active transfer. */
  idleTimer: ReturnType<typeof setTimeout> | null
}

export class ChunkReceiver {
  private readonly send: (packet: WirePacket) => void
  private readonly onStart: ((transfer: StartedFileTransfer) => void) | undefined
  private readonly onItem: ((item: ReceivedFileItem) => void) | undefined
  private readonly onProgress: ((progress: TransferProgress) => void) | undefined
  private readonly onError: ((error: P2PError) => void) | undefined
  private readonly maxConcurrentTransfers: number
  private readonly maxTotalBytes: number
  private readonly now: () => number
  private readonly transfers = new Map<string, ActiveTransfer>()
  private readonly settledTransferIds = new Set<string>()
  /** Orphan binary frames still tolerated after a rejected FILE_START. */
  private strayBinaryAllowance = 0

  constructor(options: ChunkReceiverOptions) {
    this.send = options.send
    this.onStart = options.onStart
    this.onItem = options.onItem
    this.onProgress = options.onProgress
    this.onError = options.onError
    this.maxConcurrentTransfers = options.maxConcurrentTransfers ?? MAX_CONCURRENT_TRANSFERS
    this.maxTotalBytes = options.maxTotalBytes ?? MAX_TOTAL_TRANSFER_BYTES
    this.now = options.now ?? (() => Date.now())
  }

  /** Number of transfers currently assembling in memory. */
  get activeCount(): number {
    return this.transfers.size
  }

  /** Total bytes currently held for incomplete transfers. */
  get bufferedBytes(): number {
    let total = 0
    for (const transfer of this.transfers.values()) total += transfer.bytesReceived
    return total
  }

  /** Handles FILE_START, FILE_END and FILE_ACK control packets. */
  handlePacket(packet: WirePacket): void {
    switch (packet.type) {
      case 'FILE_START':
        this.startTransfer(packet)
        return
      case 'FILE_END':
        this.finishTransfer(packet.id)
        return
      case 'FILE_CHUNK':
        this.acceptChunkHeader(packet)
        return
      case 'FILE_ACK':
        // The sender owns ACK handling, the receiver never consumes its own ACK.
        return
      default:
        return
    }
  }

  /** Handles the binary frame that follows a FILE_CHUNK header. */
  handleBinary(data: ArrayBuffer): void {
    const transfer = this.findTransferWithPendingChunk()

    if (!transfer) {
      // Frames trailing a rejected FILE_START are expected, silenced in order.
      if (this.strayBinaryAllowance > 0) {
        this.strayBinaryAllowance -= 1
        return
      }
      this.reportError(
        new P2PError('PROTOCOL_ERROR', 'Binary frame arrived without a FILE_CHUNK header'),
      )
      return
    }

    const pending = transfer.pending
    transfer.pending = null
    if (!pending) return

    if (data.byteLength !== pending.byteLength) {
      this.failTransfer(
        transfer,
        'PROTOCOL_ERROR',
        'Chunk byte length did not match the FILE_CHUNK header',
      )
      return
    }
    if (data.byteLength > CHUNK_SIZE_BYTES) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Chunk exceeded the 16KB budget')
      return
    }
    if (transfer.bytesReceived + data.byteLength > transfer.start.size) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Chunk overflowed the declared file size')
      return
    }

    transfer.chunks.push(data)
    transfer.bytesReceived += data.byteLength
    transfer.chunksReceived += 1

    // Bytes really landed, so the stall clock restarts.
    this.armIdleTimer(transfer)

    this.reportProgress(transfer)

    if (transfer.chunksReceived === transfer.start.totalChunks) {
      this.finishTransfer(transfer.start.id)
    }
  }

  dispose(id: string): void {
    const transfer = this.transfers.get(id)
    if (transfer) this.clearIdleTimer(transfer)
    this.transfers.delete(id)
  }

  disposeAll(): void {
    for (const transfer of this.transfers.values()) this.clearIdleTimer(transfer)
    this.transfers.clear()
  }

  private startTransfer(start: FileStartPacket): void {
    if (this.transfers.has(start.id)) {
      const existing = this.transfers.get(start.id)
      if (existing) this.failTransfer(existing, 'PROTOCOL_ERROR', 'Duplicate FILE_START for transfer')
      return
    }

    if (this.transfers.size >= this.maxConcurrentTransfers) {
      this.rejectStart(start, 'TOO_MANY_TRANSFERS', 'Too many files are arriving at once')
      return
    }

    if (start.size > this.maxTotalBytes) {
      this.rejectStart(start, 'TRANSFER_TOO_LARGE', 'File is larger than the receive budget')
      return
    }

    const expectedChunks = start.size === 0 ? 0 : Math.ceil(start.size / CHUNK_SIZE_BYTES)
    if (start.totalChunks !== expectedChunks) {
      this.rejectStart(start, 'PROTOCOL_ERROR', 'FILE_START chunk count does not match the size')
      return
    }

    if (this.bufferedBytes + start.size > this.maxTotalBytes) {
      this.rejectStart(start, 'TRANSFER_TOO_LARGE', 'Receive memory budget is full')
      return
    }

    // A fresh accepted transfer ends the orphan-frame window of older rejects.
    this.strayBinaryAllowance = 0

    const startedAt = this.now()
    const transfer: ActiveTransfer = {
      start,
      chunks: [],
      bytesReceived: 0,
      chunksReceived: 0,
      pending: null,
      startedAt,
      lastProgressAt: startedAt,
      idleTimer: null,
    }
    this.transfers.set(start.id, transfer)
    // Armed at FILE_START, so a sender that goes silent before the first chunk
    // fails this transfer instead of leaving a card stuck at 0 percent.
    this.armIdleTimer(transfer)

    // Accepted, so the receiving card can appear before the first chunk lands.
    // A rejected start returns above and never reaches this point.
    this.onStart?.({
      id: start.id,
      name: start.name,
      size: start.size,
      mime: start.mime,
      totalChunks: start.totalChunks,
      ttlMs: start.ttlMs,
      dropAndNuke: start.dropAndNuke === true,
      burnOnRead: start.burnOnRead === true,
      startedAt,
    })

    this.onProgress?.({
      id: start.id,
      direction: 'receive',
      bytesTransferred: 0,
      totalBytes: start.size,
      chunksTransferred: 0,
      totalChunks: start.totalChunks,
      percent: 0,
      bytesPerSecond: 0,
      startedAt,
      updatedAt: startedAt,
    })

    if (start.size === 0) {
      this.finishTransfer(start.id)
    }
  }

  private acceptChunkHeader(header: FileChunkPacket): void {
    const transfer = this.transfers.get(header.id)
    if (!transfer) {
      // A rejected or finished id stays settled, so its trailing frames are silent.
      if (this.settledTransferIds.has(header.id)) return
      this.reportError(
        new P2PError('UNKNOWN_TRANSFER', 'FILE_CHUNK arrived for an unknown transfer', header.id),
      )
      return
    }

    if (transfer.pending) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Previous chunk frame never arrived')
      return
    }

    if (header.index !== transfer.chunksReceived) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Chunk index arrived out of order')
      return
    }

    if (header.byteLength > CHUNK_SIZE_BYTES) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Chunk header exceeded the 16KB budget')
      return
    }

    const remaining = transfer.start.size - transfer.bytesReceived
    if (header.byteLength > remaining) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Chunk header exceeded the remaining bytes')
      return
    }

    transfer.pending = { index: header.index, byteLength: header.byteLength }
  }

  private finishTransfer(id: string): void {
    const transfer = this.transfers.get(id)

    if (!transfer) {
      // The last chunk finishes the transfer before FILE_END arrives (and a
      // zero-byte file finishes at FILE_START), so a late FILE_END for a known
      // settled transfer is a no-op and never an error.
      if (this.settledTransferIds.has(id)) return
      this.reportError(
        new P2PError('UNKNOWN_TRANSFER', 'FILE_END arrived for an unknown transfer', id),
      )
      return
    }

    // Every branch below settles this transfer, so the watchdog stops here and
    // never fires against a finished or failed id.
    this.clearIdleTimer(transfer)

    if (transfer.pending) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'FILE_END arrived before the last binary frame')
      return
    }

    if (transfer.chunksReceived !== transfer.start.totalChunks) {
      this.failTransfer(
        transfer,
        'PROTOCOL_ERROR',
        'FILE_END arrived before every chunk was received',
      )
      return
    }

    if (transfer.bytesReceived !== transfer.start.size) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Reassembled size did not match FILE_START')
      return
    }

    const blob = new Blob(transfer.chunks, { type: transfer.start.mime })
    if (blob.size !== transfer.start.size) {
      this.failTransfer(transfer, 'PROTOCOL_ERROR', 'Reassembled Blob size did not match')
      return
    }

    const receivedAt = this.now()
    const item: ReceivedFileItem = {
      id: transfer.start.id,
      name: transfer.start.name,
      size: transfer.start.size,
      mime: transfer.start.mime,
      blob,
      totalChunks: transfer.start.totalChunks,
      ttlMs: transfer.start.ttlMs,
      dropAndNuke: transfer.start.dropAndNuke === true,
      burnOnRead: transfer.start.burnOnRead === true,
      receivedAt,
    }

    this.transfers.delete(id)
    this.markSettled(id)

    if (this.onProgress) {
      this.onProgress({
        id,
        direction: 'receive',
        bytesTransferred: item.size,
        totalBytes: item.size,
        chunksTransferred: item.totalChunks,
        totalChunks: item.totalChunks,
        percent: 100,
        bytesPerSecond:
          item.size / Math.max((receivedAt - transfer.startedAt) / 1000, 0.001),
        startedAt: transfer.startedAt,
        updatedAt: receivedAt,
      })
    }

    this.sendAck(id, 'OK')
    this.onItem?.(item)
  }

  private failTransfer(transfer: ActiveTransfer, code: P2PErrorCode, message: string): void {
    const id = transfer.start.id
    this.clearIdleTimer(transfer)
    this.transfers.delete(id)
    this.markSettled(id)
    this.sendAck(id, 'ERROR')
    this.reportError(new P2PError(code, message, id))
  }

  /**
   * Starts or restarts the stall clock for one transfer. The callback checks
   * that the same transfer is still the live one, so a timer that was already
   * queued when the transfer settled cannot fail a later transfer.
   */
  private armIdleTimer(transfer: ActiveTransfer): void {
    this.clearIdleTimer(transfer)
    transfer.idleTimer = setTimeout(() => {
      transfer.idleTimer = null
      if (this.transfers.get(transfer.start.id) !== transfer) return
      this.failTransfer(transfer, 'BACKPRESSURE_TIMEOUT', 'No chunks arrived in time')
    }, IDLE_TIMEOUT_MS)
  }

  private clearIdleTimer(transfer: ActiveTransfer): void {
    if (transfer.idleTimer === null) return
    clearTimeout(transfer.idleTimer)
    transfer.idleTimer = null
  }

  /** Remembers a finished id with bounded, oldest-first eviction. */
  private markSettled(id: string): void {
    this.settledTransferIds.delete(id)
    this.settledTransferIds.add(id)

    while (this.settledTransferIds.size > MAX_SETTLED_TRANSFER_IDS) {
      const oldest = this.settledTransferIds.values().next()
      if (oldest.done === true) return
      this.settledTransferIds.delete(oldest.value)
    }
  }

  private rejectStart(start: FileStartPacket, code: P2PErrorCode, message: string): void {
    // Settle first so trailing FILE_CHUNK headers and FILE_END stay silent.
    this.markSettled(start.id)
    this.strayBinaryAllowance = Math.min(
      start.totalChunks,
      MAX_STRAY_BINARY_FRAMES,
    )
    this.sendAck(start.id, 'ERROR')
    this.reportError(new P2PError(code, message, start.id))
  }

  private sendAck(id: string, status: FileAckPacket['status']): void {
    const ack: FileAckPacket = { type: 'FILE_ACK', id, status }
    try {
      this.send(ack)
    } catch (error) {
      this.reportError(
        error instanceof P2PError
          ? error
          : new P2PError('NO_OPEN_CHANNEL', 'Could not send FILE_ACK', id),
      )
    }
  }

  private reportProgress(transfer: ActiveTransfer): void {
    if (!this.onProgress) return

    const now = this.now()
    const isComplete = transfer.chunksReceived === transfer.start.totalChunks
    if (!isComplete && now - transfer.lastProgressAt < 100) return

    const elapsedSeconds = Math.max((now - transfer.startedAt) / 1000, 0.001)
    const totalBytes = transfer.start.size
    const progress: TransferProgress = {
      id: transfer.start.id,
      direction: 'receive',
      bytesTransferred: transfer.bytesReceived,
      totalBytes,
      chunksTransferred: transfer.chunksReceived,
      totalChunks: transfer.start.totalChunks,
      percent: totalBytes === 0 ? 100 : Math.min(100, (transfer.bytesReceived / totalBytes) * 100),
      bytesPerSecond: transfer.bytesReceived / elapsedSeconds,
      startedAt: transfer.startedAt,
      updatedAt: now,
    }

    transfer.lastProgressAt = now
    this.onProgress(progress)
  }

  private findTransferWithPendingChunk(): ActiveTransfer | null {
    for (const transfer of this.transfers.values()) {
      if (transfer.pending) return transfer
    }
    return null
  }

  private reportError(error: P2PError): void {
    this.onError?.(error)
  }
}
