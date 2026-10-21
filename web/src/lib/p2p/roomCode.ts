/**
 * Canonical room code handling.
 * Source: docs/06-protocol-and-tech-spec.md section 2 and decisions.md D-002, D-003.
 */

import {
  PEER_PREFIX,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_PREFIX,
} from '../../types/protocol'
import { P2PError } from './errors'

const ALPHABET_LENGTH = ROOM_CODE_ALPHABET.length

function randomBytes(length: number): Uint8Array {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new P2PError(
      'ROOM_CODE_UNAVAILABLE',
      'This browser cannot generate a secure room code',
    )
  }
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generates an unbiased code from ROOM_CODE_ALPHABET using rejection sampling.
 * Bytes above the largest multiple of the alphabet length are discarded so
 * every character has the exact same probability.
 */
export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  if (!Number.isInteger(length) || length <= 0 || length > 32) {
    throw new P2PError('INVALID_ARGUMENT', 'Room code length must be between 1 and 32')
  }

  const limit = Math.floor(256 / ALPHABET_LENGTH) * ALPHABET_LENGTH
  let code = ''

  while (code.length < length) {
    const sample = randomBytes(Math.max(length * 2, 16))
    for (const byte of sample) {
      if (byte >= limit) continue
      code += ROOM_CODE_ALPHABET.charAt(byte % ALPHABET_LENGTH)
      if (code.length === length) break
    }
  }

  return code
}

export function normalizeRoomCode(value: string): string {
  return value.replace(/[\s-]+/g, '').toUpperCase()
}

export function isValidRoomCode(value: string): boolean {
  const code = normalizeRoomCode(value)
  if (code.length !== ROOM_CODE_LENGTH) return false
  for (const character of code) {
    if (!ROOM_CODE_ALPHABET.includes(character)) return false
  }
  return true
}

/** Deterministic signaling id for the room host: ghostdrop-room-CODE */
export function roomPeerId(code: string): string {
  return `${ROOM_PREFIX}${normalizeRoomCode(code)}`
}

/** Unique signaling id for a joining device: ghostdrop-peer-uuid8 */
export function peerPeerId(): string {
  const hasRandomUuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'

  if (hasRandomUuid) {
    return `${PEER_PREFIX}${crypto.randomUUID().slice(0, 8).toLowerCase()}`
  }

  const bytes = randomBytes(4)
  let suffix = ''
  for (const byte of bytes) suffix += byte.toString(16).padStart(2, '0')
  return `${PEER_PREFIX}${suffix}`
}
