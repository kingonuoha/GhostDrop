/**
 * 16KB chunk streamer with RTCDataChannel backpressure.
 * Source: docs/06-protocol-and-tech-spec.md section 3 and decisions.md D-011.
 *
 * Every chunk is sliced lazily, sent as a FILE_CHUNK header plus exactly one
 * binary frame, and never held in memory beyond the current slice.
 */

import {
  BUFFERED_LOW_THRESHOLD,
  CHUNK_SIZE_BYTES,
  MAX_BUFFERED_AMOUNT,
  serializeWirePacket,
} from '../../types/protocol'
import type { FileChunkPacket, FileEndPacket, FileStartPacket, TransferProgress, WirePacket } from '../../types/protocol'
import type { P2PTransport } from './adapter'
import { createAbortError, P2PError } from './errors'

const DEFAULT_DRAIN_TIMEOUT_MS = 15000

export interface WaitForBufferDrainOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export interface StreamFileOptions {
  connection: P2PTransport
  file: File | Blob
  transferId: string
  ttlMs: number | null
  dropAndNuke?: boolean
  /** `Delete after 1st copy`: propagated on FILE_START so both peers burn together. */
  burnOnRead?: boolean
  /** Explicit display name. Required for plain Blob inputs. */
  name?: string
  /** Explicit MIME type, defaults to file.type or application/octet-stream. */
  mime?: string
  signal?: AbortSignal
  onProgress?: (progress: TransferProgress) => void
}

export interface StreamFileResult {
  id: string
  name: string
  mime: string
  size: number
  totalChunks: number
  chunksSent: number
  bytesSent: number
  durationMs: number
  averageBytesPerSecond: number
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError('File transfer aborted')
}

function resolveName(file: File | Blob, explicit?: string): string {
  if (explicit && explicit.length > 0) return explicit
  if (typeof File !== 'undefined' && file instanceof File && file.name) return file.name
  return 'ghostdrop-file'
}

function resolveMime(file: File | Blob, explicit?: string): string {
  if (explicit && explicit.length > 0) return explicit
  return file.type || 'application/octet-stream'
}

/**
 * Resolves once the channel buffer has drained to MAX_BUFFERED_AMOUNT or less.
 * Sets bufferedAmountLowThreshold to 64KB and always cleans up timers,
 * listeners and abort handlers.
 */
export function waitForBufferDrain(
  channel: P2PTransport,
  options: WaitForBufferDrainOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS
  const { signal } = options

  channel.bufferedAmountLowThreshold = BUFFERED_LOW_THRESHOLD

  if (!channel.isOpen) {
    return Promise.reject(new P2PError('NO_OPEN_CHANNEL', 'Channel is not open'))
  }
  if (signal?.aborted) {
    return Promise.reject(createAbortError('File transfer aborted'))
  }
  if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    let settled = false
    let unsubscribe: () => void = () => undefined
    let timer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      unsubscribe()
      if (timer !== null) clearTimeout(timer)
      timer = null
      signal?.removeEventListener('abort', onAbort)
    }

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) reject(error)
      else resolve()
    }

    const onLow = () => {
      if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) finish()
    }

    const onAbort = () => finish(createAbortError('File transfer aborted'))

    unsubscribe = channel.onBufferedAmountLow(onLow)
    timer = setTimeout(() => {
      finish(new P2PError('BACKPRESSURE_TIMEOUT', 'Channel buffer did not drain in time'))
    }, timeoutMs)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function buildProgress(
  id: string,
  direction: TransferProgress['direction'],
  bytesTransferred: number,
  totalBytes: number,
  chunksTransferred: number,
  totalChunks: number,
  startedAt: number,
  updatedAt: number,
): TransferProgress {
  const elapsedSeconds = Math.max((updatedAt - startedAt) / 1000, 0.001)
  return {
    id,
    direction,
    bytesTransferred,
    totalBytes,
    chunksTransferred,
    totalChunks,
    percent: totalBytes === 0 ? 100 : Math.min(100, (bytesTransferred / totalBytes) * 100),
    bytesPerSecond: bytesTransferred / elapsedSeconds,
    startedAt,
    updatedAt,
  }
}

export async function streamFile(options: StreamFileOptions): Promise<StreamFileResult> {
  const {
    connection,
    file,
    transferId,
    ttlMs,
    dropAndNuke = false,
    burnOnRead = false,
    signal,
    onProgress,
  } = options

  if (!connection.isOpen) {
    throw new P2PError('NO_OPEN_CHANNEL', 'No open channel to stream the file')
  }
  throwIfAborted(signal)

  const name = resolveName(file, options.name)
  const mime = resolveMime(file, options.mime)
  const totalBytes = file.size
  const totalChunks = totalBytes === 0 ? 0 : Math.ceil(totalBytes / CHUNK_SIZE_BYTES)
  const startedAt = Date.now()

  const start: FileStartPacket = {
    type: 'FILE_START',
    id: transferId,
    name,
    size: totalBytes,
    mime,
    totalChunks,
    ttlMs,
    dropAndNuke,
    burnOnRead,
  }
  connection.sendText(serializeWirePacket(start))

  let offset = 0
  let index = 0
  let bytesSent = 0
  let buffer: ArrayBuffer | null = null

  try {
    onProgress?.(buildProgress(transferId, 'send', 0, totalBytes, 0, totalChunks, startedAt, startedAt))

    while (offset < totalBytes) {
      throwIfAborted(signal)

      const slice = file.slice(offset, Math.min(offset + CHUNK_SIZE_BYTES, totalBytes))
      buffer = await slice.arrayBuffer()
      throwIfAborted(signal)

      if (buffer.byteLength === 0) {
        throw new P2PError('PROTOCOL_ERROR', 'File slice came back empty')
      }
      if (buffer.byteLength > CHUNK_SIZE_BYTES) {
        throw new P2PError('PROTOCOL_ERROR', 'File slice exceeded the 16KB chunk budget')
      }

      await waitForBufferDrain(connection, { signal })

      const header: FileChunkPacket = {
        type: 'FILE_CHUNK',
        id: transferId,
        index,
        byteLength: buffer.byteLength,
      }

      await connection.sendFrame(serializeWirePacket(header), buffer)

      offset += buffer.byteLength
      bytesSent += buffer.byteLength
      index += 1
      buffer = null

      if (onProgress) {
        const now = Date.now()
        onProgress(
          buildProgress(transferId, 'send', bytesSent, totalBytes, index, totalChunks, startedAt, now),
        )
      }
    }

    throwIfAborted(signal)

    const end: FileEndPacket = { type: 'FILE_END', id: transferId }
    sendPacketText(connection, end)

    const finishedAt = Date.now()
    const result: StreamFileResult = {
      id: transferId,
      name,
      mime,
      size: totalBytes,
      totalChunks,
      chunksSent: index,
      bytesSent,
      durationMs: finishedAt - startedAt,
      averageBytesPerSecond:
        bytesSent / Math.max((finishedAt - startedAt) / 1000, 0.001),
    }
    return result
  } finally {
    // Drop the last slice reference so the ArrayBuffer can be collected on abort.
    buffer = null
  }
}

function sendPacketText(connection: P2PTransport, packet: WirePacket): void {
  connection.sendText(serializeWirePacket(packet))
}
