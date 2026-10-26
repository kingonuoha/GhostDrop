/**
 * Typed transport and protocol errors.
 * No emojis, no em dashes, no raw browser alerts.
 */

export type P2PErrorCode =
  | 'ABORTED'
  | 'ALREADY_CONNECTED'
  | 'BACKPRESSURE_TIMEOUT'
  | 'CONNECT_TIMEOUT'
  | 'DESTROYED'
  | 'INVALID_ARGUMENT'
  | 'INVALID_ROOM_CODE'
  | 'NO_OPEN_CHANNEL'
  | 'PROTOCOL_ERROR'
  | 'QUEUE_OVERFLOW'
  | 'ROOM_CODE_UNAVAILABLE'
  | 'SIGNALING_ERROR'
  | 'TOO_MANY_TRANSFERS'
  | 'TRANSFER_TOO_LARGE'
  | 'UNKNOWN_TRANSFER'

export class P2PError extends Error {
  readonly code: P2PErrorCode
  /**
   * The transfer this error belongs to, when the failure is scoped to one
   * stream. Callers settle only that transfer, so a healthy concurrent
   * transfer never shows a failure card.
   */
  readonly transferId: string | undefined

  constructor(code: P2PErrorCode, message: string, transferId?: string) {
    super(message)
    this.name = 'P2PError'
    this.code = code
    this.transferId = transferId
  }
}

export function isP2PError(value: unknown): value is P2PError {
  return value instanceof P2PError
}

export function toP2PError(value: unknown, fallback: P2PErrorCode): P2PError {
  if (value instanceof P2PError) return value
  if (value instanceof Error) return new P2PError(fallback, value.message)
  return new P2PError(fallback, 'Unexpected transport failure')
}

export function createAbortError(message = 'Transfer aborted'): P2PError {
  return new P2PError('ABORTED', message)
}
