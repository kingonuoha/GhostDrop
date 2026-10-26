/**
 * Compact SDP and ICE token codec for the serverless Offline Direct bridge.
 * Source: decisions.md D-016 item 1, plans/total-offline-and-hotspot-bridge-plan.md
 * section 3 layer 1, docs/06-protocol-and-tech-spec.md section 2.
 *
 * A gathered WebRTC offer is 2 to 4 KB of text, which no QR code or pasteable
 * code can carry. This module keeps only what DTLS and ICE actually need:
 * ice-ufrag, ice-pwd, the sha-256 DTLS fingerprint, the setup role, the bundle
 * mid, the sctp port and the host or srflx candidates. It then rebuilds strict
 * RFC 8866 text so `setRemoteDescription` accepts it in every browser.
 *
 * Token shapes, all URL safe and copy friendly:
 *   GD1.<base64url utf8 json>            always available, synchronous
 *   GD1Z.<base64url deflate-raw json>    smaller, needs CompressionStream
 *   GD2.<base64url packed binary>        smallest, synchronous, IPv4 only
 *
 * `GD2.` is a field ordered binary layout, not JSON: the room, ufrag, pwd, the
 * raw 32 byte fingerprint and up to three IPv4 candidates. It omits the peer id
 * and the device name, so decode synthesizes both and `HELLO_PEER` corrects
 * them within milliseconds of the channel opening.
 *
 * This is a pure module. No React, no DOM writes, no module level side effects.
 * Every browser API is feature tested so Node, a worker and a page agree.
 * No emojis, no em dashes.
 */

import { PEER_PREFIX, ROOM_PREFIX, isDeviceType } from '../../types/protocol'
import type { DeviceType } from '../../types/protocol'
import { P2PError } from './errors'

/** Schema version carried in `v`, so a future change is detectable. */
export const COMPACT_SDP_VERSION = 1

export const COMPACT_TOKEN_PREFIX = 'GD1.'
export const COMPACT_TOKEN_COMPRESSED_PREFIX = 'GD1Z.'

/** Binary token from step 15 section 3: field ordered, no JSON, no deflate. */
export const COMPACT_TOKEN_V2_PREFIX = 'GD2.'

/** Hard cap from decisions.md D-016, keeps the QR dense but scannable. */
export const MAX_COMPACT_CANDIDATES = 8

/** Binary tokens carry at most three candidates: 6 flag bits, 7 bytes each. */
export const MAX_BINARY_CANDIDATES = 3

export const DEFAULT_COMPACT_MID = '0'
export const DEFAULT_COMPACT_SCTP_PORT = 5000
export const DEFAULT_MAX_MESSAGE_SIZE = 262144

const MAX_TOKEN_LENGTH = 4096
const FINGERPRINT_BYTE_LENGTH = 32
const BASE64URL_BODY_PATTERN = /^[A-Za-z0-9_-]+$/
const ICE_UFRAG_PATTERN = /^[A-Za-z0-9+/_-]{4,64}$/
const ICE_PWD_PATTERN = /^[A-Za-z0-9+/_-]{16,256}$/
const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/
const PEER_ID_PATTERN = /^[A-Za-z0-9._-]{1,96}$/
const MID_PATTERN = /^[A-Za-z0-9_-]{1,16}$/
const CANDIDATE_ADDRESS_PATTERN = /^[0-9A-Za-z.:_%+-]{1,64}$/
const TCP_TYPE_PATTERN = /^[a-z]{2,8}$/
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

/* GD2 binary layout bounds, step 15 section 3. */
const BINARY_HEADER_BYTES = 3
const BINARY_CANDIDATE_BYTES = 7
const BINARY_ROOM_MIN_LENGTH = 4
const BINARY_ROOM_MAX_LENGTH = 12
const BINARY_UFRAG_MIN_LENGTH = 4
const BINARY_UFRAG_MAX_LENGTH = 16
const BINARY_PWD_MIN_LENGTH = 16
const BINARY_PWD_MAX_LENGTH = 32
const BINARY_MIN_BYTES =
  BINARY_HEADER_BYTES +
  BINARY_ROOM_MIN_LENGTH +
  BINARY_UFRAG_MIN_LENGTH +
  BINARY_PWD_MIN_LENGTH +
  FINGERPRINT_BYTE_LENGTH +
  BINARY_CANDIDATE_BYTES
/** Four base64url characters per three bytes, rounded up, unpadded. */
const BINARY_MIN_BODY_LENGTH = Math.ceil(BINARY_MIN_BYTES / 3) * 4
/** Upper bound for the shrink search in `extractCompactTokenFromInput`. */
const BINARY_SHRINK_ATTEMPTS = 512

/** `'o'` is a host invite, `'a'` is a guest reply. */
export type CompactSignalKind = 'o' | 'a'

/**
 * One candidate in tuple form. A readonly tuple keeps the JSON tiny: no keys,
 * just values in a fixed order.
 */
export type CompactCandidateTuple = readonly [
  address: string,
  port: number,
  transport: 'u' | 't',
  candType: 'h' | 's',
  tcpType?: string,
]

export interface CompactSdpPayload {
  v: 1
  t: CompactSignalKind
  /** 6 character room code. */
  r: string
  /** Sender peer id, `ghostdrop-room-CODE` or `ghostdrop-peer-UUID8`. */
  p: string
  /** Sender device name as announced on `HELLO_PEER`. */
  n: string
  /** Sender device class. */
  d: DeviceType
  /** ice-ufrag. */
  u: string
  /** ice-pwd. */
  w: string
  /** sha-256 DTLS fingerprint, 43 char base64url or 64 char hex. */
  f: string
  /** DTLS setup role: `'a'` actpass, `'c'` active, `'p'` passive. */
  s: 'a' | 'c' | 'p'
  /** Bundle mid, omitted when it is the default `'0'`. */
  m?: string
  /** sctp-port, omitted when it is the default `5000`. */
  k?: number
  c: readonly CompactCandidateTuple[]
}

export interface CompactSdpSource {
  /** Browser local description, offer or answer. */
  readonly description: RTCSessionDescriptionInit
  /** Candidates gathered through `onicecandidate`, usually trickled separately. */
  readonly candidates?: readonly RTCIceCandidateInit[]
  readonly roomCode: string
  readonly peerId: string
  readonly deviceName: string
  readonly deviceType: DeviceType
}

export interface CompactSdpReconstruction {
  description: RTCSessionDescriptionInit
  candidates: RTCIceCandidateInit[]
  payload: CompactSdpPayload
}

/* -------------------------------------------------------------------------- */
/* Base64url, UTF-8 and feature tests                                          */
/* -------------------------------------------------------------------------- */

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const BASE64URL_LOOKUP: Readonly<Record<string, number | undefined>> = (() => {
  const table: Record<string, number | undefined> = {}
  for (let index = 0; index < BASE64URL_ALPHABET.length; index += 1) {
    table[BASE64URL_ALPHABET.charAt(index)] = index
  }
  return table
})()

/** Unpadded base64url, the shortest URL safe text encoding. */
function encodeBytesToBase64Url(bytes: Uint8Array): string {
  let output = ''

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const hasSecond = index + 1 < bytes.length
    const hasThird = index + 2 < bytes.length
    const second = hasSecond ? bytes[index + 1] : 0
    const third = hasThird ? bytes[index + 2] : 0

    output += BASE64URL_ALPHABET.charAt(first >> 2)
    output += BASE64URL_ALPHABET.charAt(((first & 3) << 4) | (second >> 4))
    if (hasSecond) output += BASE64URL_ALPHABET.charAt(((second & 15) << 2) | (third >> 6))
    if (hasThird) output += BASE64URL_ALPHABET.charAt(third & 63)
  }

  return output
}

/** Returns null for any character outside the base64url alphabet. */
function decodeBase64UrlToBytes(text: string): Uint8Array | null {
  const clean = text.replace(/=+$/, '')
  if (clean.length === 0) return null

  const bytes: number[] = []
  let buffer = 0
  let bits = 0

  for (const character of clean) {
    const value = BASE64URL_LOOKUP[character]
    if (value === undefined) return null
    buffer = ((buffer << 6) | value) & 0xffffff
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }

  return new Uint8Array(bytes)
}

function hasTextEncoder(): boolean {
  return typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined'
}

function encodeUtf8(text: string): Uint8Array {
  if (!hasTextEncoder()) {
    throw new P2PError('PROTOCOL_ERROR', 'This screen cannot build an offline code')
  }
  return new TextEncoder().encode(text)
}

function decodeUtf8(bytes: Uint8Array): string | null {
  if (!hasTextEncoder()) return null
  try {
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function canDeflateRaw(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

/** A standalone ArrayBuffer copy, so `Blob` never sees a shared buffer type. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

/** `deflate-raw` keeps the token short with zero headers. Null means fall back. */
async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (!canDeflateRaw()) return null
  try {
    const stream = new Blob([toArrayBuffer(bytes)])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'))
    const buffer = await new Response(stream).arrayBuffer()
    return new Uint8Array(buffer)
  } catch {
    // Older Safari builds expose the constructor but reject the raw format.
    return null
  }
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (!canDeflateRaw()) return null
  try {
    const stream = new Blob([toArrayBuffer(bytes)])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw'))
    const buffer = await new Response(stream).arrayBuffer()
    return new Uint8Array(buffer)
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* DTLS fingerprint                                                            */
/* -------------------------------------------------------------------------- */

/** 32 colon separated hex bytes, upper case, no leading or trailing spaces. */
function fingerprintHexToBase64Url(hex: string): string | null {
  const parts = hex.trim().split(':')
  if (parts.length !== FINGERPRINT_BYTE_LENGTH) return null

  const raw = new Uint8Array(FINGERPRINT_BYTE_LENGTH)
  for (let index = 0; index < FINGERPRINT_BYTE_LENGTH; index += 1) {
    if (!/^[0-9A-Fa-f]{2}$/.test(parts[index])) return null
    raw[index] = Number.parseInt(parts[index], 16)
  }

  return encodeBytesToBase64Url(raw)
}

/** Accepts the 43 char base64url form and the 64 char hex form. */
function fingerprintToHex(value: string): string | null {
  const text = value.trim()
  if (text.length === 0) return null

  if (/^[0-9A-Fa-f]{64}$/.test(text)) {
    const parts: string[] = []
    for (let index = 0; index < text.length; index += 2) {
      parts.push(text.slice(index, index + 2).toUpperCase())
    }
    return parts.join(':')
  }

  const bytes = decodeBase64UrlToBytes(text)
  if (!bytes || bytes.length !== FINGERPRINT_BYTE_LENGTH) return null

  const parts: string[] = []
  for (const byte of bytes) parts.push(byte.toString(16).padStart(2, '0').toUpperCase())
  return parts.join(':')
}

/* -------------------------------------------------------------------------- */
/* Candidates                                                                  */
/* -------------------------------------------------------------------------- */

const CANDIDATE_TYPE_PREFERENCE: Readonly<Record<'h' | 's', number>> = { h: 126, s: 100 }
const CANDIDATE_LOCAL_PREFERENCE = 65535
const CANDIDATE_COMPONENT_ID = 1

interface ParsedCandidate {
  address: string
  port: number
  transport: 'u' | 't'
  candType: 'h' | 's'
  tcpType?: string
}

function isSafeCandidateAddress(value: unknown): value is string {
  return typeof value === 'string' && CANDIDATE_ADDRESS_PATTERN.test(value)
}

function isIpv4(address: string): boolean {
  return IPV4_PATTERN.test(address)
}

/** RFC1918, link local and loopback: the addresses a hotspot bridge needs. */
function isPrivateIpv4(address: string): boolean {
  const match = IPV4_PATTERN.exec(address)
  if (!match) return false

  const first = Number(match[1])
  const second = Number(match[2])
  if (first === 10) return true
  if (first === 127) return true
  if (first === 192 && second === 168) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 169 && second === 254) return true
  return false
}

/**
 * Preference order from decisions.md D-016: raw private IPv4 first, because
 * phone hotspots drop the mDNS multicast that `.local` names depend on, then
 * public IPv4, then `.local` names, then IPv6 last.
 */
function candidateRank(candidate: ParsedCandidate): number {
  const address = candidate.address
  if (isPrivateIpv4(address)) return 0
  if (isIpv4(address)) return 1
  if (address.toLowerCase().endsWith('.local')) return 2
  if (address.includes(':')) return 3
  return 4
}

/**
 * Parses both `a=candidate:...` SDP text and `RTCIceCandidateInit.candidate`
 * text, which browsers return with or without the `a=` prefix.
 * Relayed and prflx candidates are dropped: they need a STUN server the offline
 * bridge does not have.
 */
function parseCandidateText(raw: string): ParsedCandidate | null {
  const trimmed = raw.trim().replace(/^a=/i, '')
  if (!trimmed.toLowerCase().startsWith('candidate:')) return null

  const parts = trimmed.slice('candidate:'.length).trim().split(/\s+/)
  if (parts.length < 8) return null

  const transportToken = parts[2].toLowerCase()
  const address = parts[4]
  const portValue = Number(parts[5])
  const typeToken = parts[6].toLowerCase()
  const candidateToken = parts[7].toLowerCase()

  if (transportToken !== 'udp' && transportToken !== 'tcp') return null
  if (typeToken !== 'typ') return null
  if (candidateToken !== 'host' && candidateToken !== 'srflx') return null
  if (!Number.isInteger(portValue) || portValue <= 0 || portValue > 65535) return null
  if (!isSafeCandidateAddress(address)) return null

  let tcpType: string | undefined
  for (let index = 8; index + 1 < parts.length; index += 1) {
    if (parts[index].toLowerCase() !== 'tcptype') continue
    const value = parts[index + 1].toLowerCase()
    if (TCP_TYPE_PATTERN.test(value)) tcpType = value
  }

  const transport: 'u' | 't' = transportToken === 'tcp' ? 't' : 'u'
  const candType: 'h' | 's' = candidateToken === 'srflx' ? 's' : 'h'

  return { address, port: portValue, transport, candType, tcpType }
}

function candidateKey(candidate: ParsedCandidate): string {
  return `${candidate.address.toLowerCase()}:${candidate.port}:${candidate.transport}`
}

/**
 * Deduplicated, prioritised and capped candidate list. The cap is what keeps a
 * QR code dense but still scannable when a machine has many interfaces.
 */
function normalizeCandidates(candidates: readonly ParsedCandidate[]): CompactCandidateTuple[] {
  const seen = new Set<string>()
  const kept: ParsedCandidate[] = []

  for (const candidate of candidates) {
    const key = candidateKey(candidate)
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(candidate)
  }

  kept.sort((left, right) => candidateRank(left) - candidateRank(right))

  return kept.slice(0, MAX_COMPACT_CANDIDATES).map((candidate) => {
    const tuple: [string, number, 'u' | 't', 'h' | 's', string?] = [
      candidate.address,
      candidate.port,
      candidate.transport,
      candidate.candType,
    ]
    if (candidate.transport === 't') tuple[4] = candidate.tcpType ?? 'active'
    return tuple as unknown as CompactCandidateTuple
  })
}

function candidatePriority(candidate: CompactCandidateTuple): number {
  const typePreference = CANDIDATE_TYPE_PREFERENCE[candidate[3]]
  return (
    typePreference * 2 ** 24 + CANDIDATE_LOCAL_PREFERENCE * 2 ** 8 + 255
  )
}

/** One RFC 5245 candidate value, without the `a=` prefix. */
function toSdpCandidateValue(candidate: CompactCandidateTuple, index: number): string {
  const [address, port, transport, candType, tcpType] = candidate
  const protocol = transport === 't' ? 'tcp' : 'udp'
  const type = candType === 's' ? 'srflx' : 'host'
  const suffix = transport === 't' ? ` tcptype ${tcpType ?? 'active'}` : ''
  return `candidate:${index + 1} ${CANDIDATE_COMPONENT_ID} ${protocol} ${candidatePriority(candidate)} ${address} ${port} typ ${type}${suffix}`
}

/* -------------------------------------------------------------------------- */
/* Payload guards                                                              */
/* -------------------------------------------------------------------------- */

function isBoundedLabel(value: unknown, maxLength: number): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > maxLength) return false
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) return false
  }
  return true
}

function isCandidatePort(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65535
}

function isCompactCandidateTuple(value: unknown): value is CompactCandidateTuple {
  if (!Array.isArray(value)) return false
  if (value.length !== 4 && value.length !== 5) return false

  const [address, port, transport, candType, tcpType] = value as unknown[]
  if (!isSafeCandidateAddress(address)) return false
  if (!isCandidatePort(port)) return false
  if (transport !== 'u' && transport !== 't') return false
  if (candType !== 'h' && candType !== 's') return false
  if (tcpType !== undefined) {
    if (typeof tcpType !== 'string' || !TCP_TYPE_PATTERN.test(tcpType)) return false
  }
  return true
}

/**
 * Structural runtime guard for decoded tokens. A QR code from a stranger is
 * untrusted input, so every field that later reaches SDP text is checked for
 * length, character set and type before it can be rebuilt.
 */
export function isCompactSdpPayload(value: unknown): value is CompactSdpPayload {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>

  if (record.v !== COMPACT_SDP_VERSION) return false
  if (record.t !== 'o' && record.t !== 'a') return false
  if (typeof record.r !== 'string' || !ROOM_CODE_PATTERN.test(record.r)) return false
  if (typeof record.p !== 'string' || !PEER_ID_PATTERN.test(record.p)) return false
  if (!isBoundedLabel(record.n, 64)) return false
  if (!isDeviceType(record.d)) return false
  if (typeof record.u !== 'string' || !ICE_UFRAG_PATTERN.test(record.u)) return false
  if (typeof record.w !== 'string' || !ICE_PWD_PATTERN.test(record.w)) return false
  if (typeof record.f !== 'string' || fingerprintToHex(record.f) === null) return false
  if (record.s !== 'a' && record.s !== 'c' && record.s !== 'p') return false
  if (record.m !== undefined) {
    if (typeof record.m !== 'string' || !MID_PATTERN.test(record.m)) return false
  }
  if (record.k !== undefined && !isCandidatePort(record.k)) return false
  if (!Array.isArray(record.c)) return false
  if (record.c.length > MAX_COMPACT_CANDIDATES) return false

  return record.c.every(isCompactCandidateTuple)
}

/* -------------------------------------------------------------------------- */
/* SDP extraction                                                              */
/* -------------------------------------------------------------------------- */

function splitSdpLines(sdp: string): string[] {
  return sdp.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)
}

function readSdpValue(lines: readonly string[], attribute: string): string | null {
  const prefix = `a=${attribute}:`
  for (const line of lines) {
    if (!line.toLowerCase().startsWith(prefix)) continue
    return line.slice(prefix.length).trim()
  }
  return null
}

function readSetupRole(
  lines: readonly string[],
  kind: CompactSignalKind,
): 'a' | 'c' | 'p' {
  const setup = readSdpValue(lines, 'setup')?.toLowerCase()
  if (setup === 'actpass') return 'a'
  if (setup === 'active') return 'c'
  if (setup === 'passive') return 'p'
  // Browsers always send a setup line. Fall back to the role implied by kind.
  return kind === 'o' ? 'a' : 'c'
}

function readFingerprint(lines: readonly string[]): string {
  for (const line of lines) {
    if (!line.toLowerCase().startsWith('a=fingerprint:')) continue
    const parts = line.slice('a=fingerprint:'.length).trim().split(/\s+/)
    const algorithm = parts[0]?.toLowerCase()
    if (algorithm !== 'sha-256') {
      throw new P2PError('PROTOCOL_ERROR', 'This screen only supports sha-256 fingerprints')
    }
    const encoded = fingerprintHexToBase64Url(parts[1] ?? '')
    if (!encoded) {
      throw new P2PError('PROTOCOL_ERROR', 'The browser fingerprint could not be read')
    }
    return encoded
  }

  throw new P2PError('PROTOCOL_ERROR', 'The browser fingerprint is missing')
}

/**
 * Extracts the compact payload from a gathered local description.
 *
 * `mid` and `sctp-port` are dropped when they hold their defaults, which keeps
 * the token, and therefore the QR code, as small as possible.
 */
export function extractCompactSdpPayload(source: CompactSdpSource): CompactSdpPayload {
  const type = source.description.type
  if (type !== 'offer' && type !== 'answer') {
    throw new P2PError('PROTOCOL_ERROR', 'Offline codes are built from an offer or an answer')
  }

  const sdp = source.description.sdp
  if (typeof sdp !== 'string' || sdp.length === 0) {
    throw new P2PError('PROTOCOL_ERROR', 'The browser produced an empty description')
  }

  const kind: CompactSignalKind = type === 'answer' ? 'a' : 'o'
  const lines = splitSdpLines(sdp)

  const ufrag = readSdpValue(lines, 'ice-ufrag')
  if (!ufrag || !ICE_UFRAG_PATTERN.test(ufrag)) {
    throw new P2PError('PROTOCOL_ERROR', 'The browser description has no usable ice-ufrag')
  }

  const pwd = readSdpValue(lines, 'ice-pwd')
  if (!pwd || !ICE_PWD_PATTERN.test(pwd)) {
    throw new P2PError('PROTOCOL_ERROR', 'The browser description has no usable ice-pwd')
  }

  const fingerprint = readFingerprint(lines)
  const parsed: ParsedCandidate[] = []

  for (const line of lines) {
    if (!line.toLowerCase().startsWith('a=candidate:')) continue
    const candidate = parseCandidateText(line)
    if (candidate) parsed.push(candidate)
  }

  for (const init of source.candidates ?? []) {
    if (typeof init?.candidate !== 'string' || init.candidate.length === 0) continue
    const candidate = parseCandidateText(init.candidate)
    if (candidate) parsed.push(candidate)
  }

  const mid = readSdpValue(lines, 'mid') ?? DEFAULT_COMPACT_MID
  const sctpPortValue = Number(readSdpValue(lines, 'sctp-port') ?? DEFAULT_COMPACT_SCTP_PORT)
  const sctpPort = Number.isInteger(sctpPortValue) && sctpPortValue > 0
    ? sctpPortValue
    : DEFAULT_COMPACT_SCTP_PORT

  const payload: CompactSdpPayload = {
    v: COMPACT_SDP_VERSION,
    t: kind,
    r: source.roomCode,
    p: source.peerId,
    n: source.deviceName,
    d: source.deviceType,
    u: ufrag,
    w: pwd,
    f: fingerprint,
    s: readSetupRole(lines, kind),
    c: normalizeCandidates(parsed),
  }

  if (mid !== DEFAULT_COMPACT_MID) payload.m = mid
  if (sctpPort !== DEFAULT_COMPACT_SCTP_PORT) payload.k = sctpPort

  if (!isCompactSdpPayload(payload)) {
    throw new P2PError('PROTOCOL_ERROR', 'The gathered description could not be compacted')
  }

  return payload
}

/* -------------------------------------------------------------------------- */
/* SDP reconstruction                                                          */
/* -------------------------------------------------------------------------- */

const SETUP_ROLE_TEXT: Readonly<Record<'a' | 'c' | 'p', string>> = {
  a: 'actpass',
  c: 'active',
  p: 'passive',
}

/**
 * Deterministic 64 bit session id derived from the invite fields, so the same
 * token always rebuilds the same `o=` line.
 */
function sessionIdFrom(seed: string): string {
  let first = 2166136261
  let second = 3735928559

  for (let index = 0; index < seed.length; index += 1) {
    const code = seed.charCodeAt(index)
    first = Math.imul(first ^ code, 16777619) >>> 0
    second = Math.imul(second ^ (code + index), 2246822519) >>> 0
  }

  const high = first % 4000000000
  const low = second.toString().padStart(9, '0').slice(-9)
  return `${high}${low}`
}

/**
 * Rebuilds strict RFC 8866 text from a compact payload. Every line ends in
 * CRLF, candidates are embedded before `a=end-of-candidates`, and the section
 * describes one SCTP data channel so `setRemoteDescription` accepts it.
 */
export function reconstructSdpFromCompact(payload: CompactSdpPayload): CompactSdpReconstruction {
  if (!isCompactSdpPayload(payload)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  const fingerprintHex = fingerprintToHex(payload.f)
  if (!fingerprintHex) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code has no usable fingerprint')
  }

  const mid = payload.m ?? DEFAULT_COMPACT_MID
  const sctpPort = payload.k ?? DEFAULT_COMPACT_SCTP_PORT
  const candidates = payload.c.slice(0, MAX_COMPACT_CANDIDATES)
  const sessionId = sessionIdFrom(`${payload.r}|${payload.u}|${payload.f}`)

  const lines: string[] = [
    'v=0',
    `o=- ${sessionId} 2 IN IP4 127.0.0.1`,
    's=-',
    't=0 0',
    `a=group:BUNDLE ${mid}`,
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    `a=ice-ufrag:${payload.u}`,
    `a=ice-pwd:${payload.w}`,
    'a=ice-options:trickle',
    `a=fingerprint:sha-256 ${fingerprintHex}`,
    `a=setup:${SETUP_ROLE_TEXT[payload.s]}`,
    `a=mid:${mid}`,
    `a=sctp-port:${sctpPort}`,
    `a=max-message-size:${DEFAULT_MAX_MESSAGE_SIZE}`,
  ]

  candidates.forEach((candidate, index) => {
    lines.push(`a=${toSdpCandidateValue(candidate, index)}`)
  })
  lines.push('a=end-of-candidates')

  const sdp = lines.map((line) => `${line}\r\n`).join('')

  return {
    description: { type: payload.t === 'o' ? 'offer' : 'answer', sdp },
    candidates: candidates.map((candidate, index) => ({
      candidate: toSdpCandidateValue(candidate, index),
      sdpMid: mid,
      sdpMLineIndex: 0,
    })),
    payload,
  }
}

/* -------------------------------------------------------------------------- */
/* Token encode and decode                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Normalises a bare token. The prefix is case insensitive because a user may
 * paste `gd1z.` or `gd2.`, while the base64url body keeps its exact case.
 * Whitespace inside the body is removed so the space grouped form produced by
 * `formatOfflineCodeForHumans` reads back as the same token.
 */
function normalizeTokenText(value: string): string | null {
  const text = value.trim()
  if (text.length === 0 || text.length > MAX_TOKEN_LENGTH) return null

  const binary = /^gd2\./i.test(text)
  const compressed = /^gd1z\./i.test(text)
  const plain = /^gd1\./i.test(text)
  if (!binary && !compressed && !plain) return null

  const prefix = binary
    ? COMPACT_TOKEN_V2_PREFIX
    : compressed
      ? COMPACT_TOKEN_COMPRESSED_PREFIX
      : COMPACT_TOKEN_PREFIX
  const body = text.slice(prefix.length).replace(/\s+/g, '')
  if (!BASE64URL_BODY_PATTERN.test(body)) return null

  return `${prefix}${body}`
}

/** True for a complete token, with or without the compressed prefix. */
export function isCompactSdpToken(value: unknown): value is string {
  return typeof value === 'string' && normalizeTokenText(value) !== null
}

function parsePayloadJson(text: string | null): CompactSdpPayload {
  if (text === null) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code could not be read')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  if (!isCompactSdpPayload(parsed)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  return parsed
}

/** Synchronous encode: `GD1.` plus base64url UTF-8 JSON. */
export function encodeCompactSdpSync(payload: CompactSdpPayload): string {
  if (!isCompactSdpPayload(payload)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code payload is not valid')
  }
  return `${COMPACT_TOKEN_PREFIX}${encodeBytesToBase64Url(encodeUtf8(JSON.stringify(payload)))}`
}

/** Synchronous decode. Compressed tokens need the async decoder. */
export function decodeCompactSdpSync(token: string): CompactSdpPayload {
  const normalized = normalizeTokenText(token)
  if (!normalized) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }
  if (normalized.startsWith(COMPACT_TOKEN_V2_PREFIX)) {
    return decodeCompactSdpBinary(normalized)
  }
  if (normalized.startsWith(COMPACT_TOKEN_COMPRESSED_PREFIX)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code needs the packed decoder')
  }

  const bytes = decodeBase64UrlToBytes(normalized.slice(COMPACT_TOKEN_PREFIX.length))
  return parsePayloadJson(bytes ? decodeUtf8(bytes) : null)
}

/**
 * Asynchronous encode. Returns the shortest of `GD2.`, `GD1.` and `GD1Z.`, so a
 * packing that cannot hold every field never makes the token longer.
 */
export async function encodeCompactSdp(payload: CompactSdpPayload): Promise<string> {
  const plain = encodeCompactSdpSync(payload)
  const binary = encodeCompactSdpBinary(payload)
  const tokens: string[] = binary ? [binary, plain] : [plain]

  const deflated = await deflateRaw(encodeUtf8(JSON.stringify(payload)))
  if (deflated) tokens.push(`${COMPACT_TOKEN_COMPRESSED_PREFIX}${encodeBytesToBase64Url(deflated)}`)

  let best = tokens[0]
  for (const token of tokens) {
    if (token.length < best.length) best = token
  }
  return best
}

/** Asynchronous decode for all three token shapes. */
export async function decodeCompactSdp(token: string): Promise<CompactSdpPayload> {
  const normalized = normalizeTokenText(token)
  if (!normalized) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  if (normalized.startsWith(COMPACT_TOKEN_V2_PREFIX)) {
    return decodeCompactSdpBinary(normalized)
  }

  if (!normalized.startsWith(COMPACT_TOKEN_COMPRESSED_PREFIX)) {
    const bytes = decodeBase64UrlToBytes(normalized.slice(COMPACT_TOKEN_PREFIX.length))
    return parsePayloadJson(bytes ? decodeUtf8(bytes) : null)
  }

  const bytes = decodeBase64UrlToBytes(normalized.slice(COMPACT_TOKEN_COMPRESSED_PREFIX.length))
  if (!bytes) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  const inflated = await inflateRaw(bytes)
  if (!inflated) {
    throw new P2PError('PROTOCOL_ERROR', 'This screen cannot unpack that offline code')
  }

  return parsePayloadJson(decodeUtf8(inflated))
}

/* -------------------------------------------------------------------------- */
/* GD2 packed binary token                                                     */
/* -------------------------------------------------------------------------- */

const BINARY_DEVICE_BITS: Readonly<Record<DeviceType, number>> = {
  desktop: 0,
  mobile: 1,
  tablet: 2,
}

const BINARY_DEVICE_BY_BITS: readonly DeviceType[] = ['desktop', 'mobile', 'tablet']

const BINARY_DEVICE_LABEL: Readonly<Record<DeviceType, string>> = {
  desktop: 'Computer',
  mobile: 'Phone',
  tablet: 'Tablet',
}

const BINARY_SETUP_BITS: Readonly<Record<'a' | 'c' | 'p', number>> = {
  a: 0,
  c: 1,
  p: 2,
}

const BINARY_SETUP_BY_BITS: readonly ('a' | 'c' | 'p')[] = ['a', 'c', 'p']

/** Raw 32 fingerprint bytes from the 43 char base64url or 64 char hex form. */
function fingerprintToBytes(value: string): Uint8Array | null {
  const text = value.trim()
  if (/^[0-9A-Fa-f]{64}$/.test(text)) {
    const raw = new Uint8Array(FINGERPRINT_BYTE_LENGTH)
    for (let index = 0; index < FINGERPRINT_BYTE_LENGTH; index += 1) {
      raw[index] = Number.parseInt(text.slice(index * 2, index * 2 + 2), 16)
    }
    return raw
  }

  const bytes = decodeBase64UrlToBytes(text)
  if (!bytes || bytes.length !== FINGERPRINT_BYTE_LENGTH) return null
  return bytes
}

/** Four octets, each 0 to 255, or null when the address is not dotted quad. */
function parseIpv4Octets(address: string): number[] | null {
  const match = IPV4_PATTERN.exec(address)
  if (!match) return null

  const octets: number[] = []
  for (let part = 1; part <= 4; part += 1) {
    const value = Number(match[part])
    if (!Number.isInteger(value) || value < 0 || value > 255) return null
    octets.push(value)
  }
  return octets
}

/**
 * Packing order from step 15 section 3: private UDP host first because a phone
 * hotspot drops mDNS, then private srflx, then public host, then the rest.
 */
function binaryCandidateRank(candidate: CompactCandidateTuple): number {
  const [address, , transport, candType] = candidate
  const local = isPrivateIpv4(address)
  if (local && transport === 'u' && candType === 'h') return 0
  if (local && candType === 's') return 1
  if (!local && transport === 'u' && candType === 'h') return 2
  return 3
}

interface BinaryCandidateSlot {
  candidate: CompactCandidateTuple
  rank: number
  order: number
}

/**
 * Drops what the layout cannot carry (no IPv4 address, a tcpType), dedupes by
 * address and port, then keeps the best three. The order is stable so the same
 * payload always produces the same token.
 */
function selectBinaryCandidates(
  candidates: readonly CompactCandidateTuple[],
): CompactCandidateTuple[] {
  const seen = new Set<string>()
  const slots: BinaryCandidateSlot[] = []

  candidates.forEach((candidate, order) => {
    if (candidate[4] !== undefined) return
    if (parseIpv4Octets(candidate[0]) === null) return
    const key = `${candidate[0]}:${candidate[1]}`
    if (seen.has(key)) return
    seen.add(key)
    slots.push({ candidate, rank: binaryCandidateRank(candidate), order })
  })

  slots.sort((left, right) => left.rank - right.rank || left.order - right.order)
  return slots.slice(0, MAX_BINARY_CANDIDATES).map((slot) => slot.candidate)
}

function writeAscii(target: Uint8Array, offset: number, text: string): number {
  for (let index = 0; index < text.length; index += 1) {
    target[offset + index] = text.charCodeAt(index) & 0xff
  }
  return offset + text.length
}

function readAscii(source: Uint8Array, offset: number, length: number): string {
  let text = ''
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(source[offset + index])
  }
  return text
}

/**
 * Packs a payload into `GD2.` plus unpadded base64url, or returns null so the
 * caller keeps the `GD1.` or `GD1Z.` token. Null is a normal outcome, not an
 * error: a token that cannot carry every field faithfully must not be built.
 *
 * Layout, one byte of flags, one of lengths, one of pwd length, then the text
 * fields, the raw fingerprint and seven bytes per candidate.
 */
export function encodeCompactSdpBinary(payload: CompactSdpPayload): string | null {
  if (!isCompactSdpPayload(payload)) return null

  // Fields the binary layout leaves out must hold their defaults.
  if (payload.m !== undefined && payload.m !== DEFAULT_COMPACT_MID) return null
  if (payload.k !== undefined && payload.k !== DEFAULT_COMPACT_SCTP_PORT) return null

  const room = payload.r
  if (room.length < BINARY_ROOM_MIN_LENGTH || room.length > BINARY_ROOM_MAX_LENGTH) return null
  if (!ROOM_CODE_PATTERN.test(room)) return null

  const ufrag = payload.u
  if (ufrag.length < BINARY_UFRAG_MIN_LENGTH || ufrag.length > BINARY_UFRAG_MAX_LENGTH) {
    return null
  }
  if (!ICE_UFRAG_PATTERN.test(ufrag)) return null

  const pwd = payload.w
  if (pwd.length < BINARY_PWD_MIN_LENGTH || pwd.length > BINARY_PWD_MAX_LENGTH) return null
  if (!ICE_PWD_PATTERN.test(pwd)) return null

  const fingerprint = fingerprintToBytes(payload.f)
  if (!fingerprint) return null

  const candidates = selectBinaryCandidates(payload.c)
  if (candidates.length === 0) return null

  const setupBits = BINARY_SETUP_BITS[payload.s]
  const deviceBits = BINARY_DEVICE_BITS[payload.d]
  if (setupBits === undefined || deviceBits === undefined) return null

  const bytes = new Uint8Array(
    BINARY_HEADER_BYTES +
      room.length +
      ufrag.length +
      pwd.length +
      FINGERPRINT_BYTE_LENGTH +
      candidates.length * BINARY_CANDIDATE_BYTES,
  )

  bytes[0] =
    (payload.t === 'a' ? 0x01 : 0x00) |
    ((setupBits & 0x03) << 2) |
    ((deviceBits & 0x03) << 4) |
    ((candidates.length & 0x03) << 6)
  bytes[1] = ((room.length & 0x0f) << 4) | ((ufrag.length - BINARY_UFRAG_MIN_LENGTH) & 0x0f)
  bytes[2] = (pwd.length - BINARY_PWD_MIN_LENGTH) & 0x1f

  let offset = BINARY_HEADER_BYTES
  offset = writeAscii(bytes, offset, room)
  offset = writeAscii(bytes, offset, ufrag)
  offset = writeAscii(bytes, offset, pwd)

  bytes.set(fingerprint, offset)
  offset += FINGERPRINT_BYTE_LENGTH

  for (const candidate of candidates) {
    const octets = parseIpv4Octets(candidate[0])
    if (!octets) return null

    bytes[offset] = (candidate[2] === 't' ? 0x01 : 0x00) | (candidate[3] === 's' ? 0x02 : 0x00)
    bytes[offset + 1] = octets[0]
    bytes[offset + 2] = octets[1]
    bytes[offset + 3] = octets[2]
    bytes[offset + 4] = octets[3]
    bytes[offset + 5] = (candidate[1] >> 8) & 0xff
    bytes[offset + 6] = candidate[1] & 0xff
    offset += BINARY_CANDIDATE_BYTES
  }

  return `${COMPACT_TOKEN_V2_PREFIX}${encodeBytesToBase64Url(bytes)}`
}

/**
 * Unpacks a `GD2.` token. Every offset is derived from the header and then
 * checked against the real buffer length, so a truncated or padded token throws
 * instead of reading past the end. A token from a stranger is untrusted input,
 * so each decoded text field is validated with the same patterns the JSON path
 * uses.
 */
export function decodeCompactSdpBinary(token: string): CompactSdpPayload {
  const normalized = normalizeTokenText(token)
  if (!normalized || !normalized.startsWith(COMPACT_TOKEN_V2_PREFIX)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  const body = normalized.slice(COMPACT_TOKEN_V2_PREFIX.length)
  if (body.length < BINARY_MIN_BODY_LENGTH) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is incomplete')
  }

  const bytes = decodeBase64UrlToBytes(body)
  if (!bytes || bytes.length < BINARY_MIN_BYTES) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is incomplete')
  }
  // Rejects padded, overlong and non canonical bodies before any field is read.
  if (encodeBytesToBase64Url(bytes) !== body) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is malformed')
  }

  const flags = bytes[0]
  const lengths = bytes[1]
  const pwdLengthByte = bytes[2]

  if ((flags & 0x02) !== 0) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is malformed')
  }

  const kind: CompactSignalKind = (flags & 0x01) === 1 ? 'a' : 'o'
  const setup = BINARY_SETUP_BY_BITS[(flags >> 2) & 0x03]
  const device = BINARY_DEVICE_BY_BITS[(flags >> 4) & 0x03]
  const candidateCount = (flags >> 6) & 0x03

  if (setup === undefined || device === undefined) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is malformed')
  }
  if (candidateCount < 1 || candidateCount > MAX_BINARY_CANDIDATES) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is malformed')
  }

  const roomLength = (lengths >> 4) & 0x0f
  if (roomLength < BINARY_ROOM_MIN_LENGTH || roomLength > BINARY_ROOM_MAX_LENGTH) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is malformed')
  }

  const ufragLength = (lengths & 0x0f) + BINARY_UFRAG_MIN_LENGTH
  if ((lengths & 0x0f) > BINARY_UFRAG_MAX_LENGTH - BINARY_UFRAG_MIN_LENGTH) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is malformed')
  }
  if (pwdLengthByte > BINARY_PWD_MAX_LENGTH - BINARY_PWD_MIN_LENGTH) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is malformed')
  }
  const pwdLength = pwdLengthByte + BINARY_PWD_MIN_LENGTH

  const expectedLength =
    BINARY_HEADER_BYTES +
    roomLength +
    ufragLength +
    pwdLength +
    FINGERPRINT_BYTE_LENGTH +
    candidateCount * BINARY_CANDIDATE_BYTES

  if (bytes.length !== expectedLength) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is incomplete')
  }

  let offset = BINARY_HEADER_BYTES
  const room = readAscii(bytes, offset, roomLength)
  offset += roomLength
  const ufrag = readAscii(bytes, offset, ufragLength)
  offset += ufragLength
  const pwd = readAscii(bytes, offset, pwdLength)
  offset += pwdLength

  if (!ROOM_CODE_PATTERN.test(room)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code has no usable room')
  }
  if (!ICE_UFRAG_PATTERN.test(ufrag)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code has no usable ice-ufrag')
  }
  if (!ICE_PWD_PATTERN.test(pwd)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code has no usable ice-pwd')
  }

  const fingerprintOffset = offset
  const fingerprint = encodeBytesToBase64Url(
    bytes.subarray(fingerprintOffset, fingerprintOffset + FINGERPRINT_BYTE_LENGTH),
  )
  offset += FINGERPRINT_BYTE_LENGTH

  const candidates: CompactCandidateTuple[] = []
  for (let index = 0; index < candidateCount; index += 1) {
    const candidateFlags = bytes[offset]
    // Bits 2 to 3 are tcpType and must be zero, 4 to 7 are reserved.
    if ((candidateFlags & 0xfc) !== 0) {
      throw new P2PError('PROTOCOL_ERROR', 'That offline code has an unusable candidate')
    }

    const port = (bytes[offset + 5] << 8) | bytes[offset + 6]
    if (port <= 0) {
      throw new P2PError('PROTOCOL_ERROR', 'That offline code has an unusable candidate')
    }

    const address = `${bytes[offset + 1]}.${bytes[offset + 2]}.${bytes[offset + 3]}.${bytes[offset + 4]}`
    const transport: 'u' | 't' = (candidateFlags & 0x01) === 1 ? 't' : 'u'
    const candType: 'h' | 's' = (candidateFlags & 0x02) === 2 ? 's' : 'h'
    candidates.push([address, port, transport, candType])
    offset += BINARY_CANDIDATE_BYTES
  }

  const fingerprintHex = fingerprintHexPrefix(bytes, fingerprintOffset, 4)

  const payload: CompactSdpPayload = {
    v: COMPACT_SDP_VERSION,
    t: kind,
    r: room,
    p: kind === 'o' ? `${ROOM_PREFIX}${room}` : `${PEER_PREFIX}${fingerprintHex}`,
    n: BINARY_DEVICE_LABEL[device],
    d: device,
    u: ufrag,
    w: pwd,
    f: fingerprint,
    s: setup,
    c: candidates,
  }

  if (!isCompactSdpPayload(payload)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  return payload
}

/** Lower case hex of the fingerprint bytes, no separators, for the peer id. */
function fingerprintHexPrefix(source: Uint8Array, start: number, length: number): string {
  let text = ''
  for (let index = 0; index < length; index += 1) {
    text += source[start + index].toString(16).padStart(2, '0')
  }
  return text
}

/**
 * Space separated groups of four, prefix intact, for reading aloud or typing.
 * The body stays case sensitive because base64url already uses `-` and `_`,
 * so hyphens would be ambiguous.
 */
export function formatOfflineCodeForHumans(token: string): string {
  const normalized = normalizeTokenText(token)
  if (!normalized) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
  }

  const separator = normalized.indexOf('.')
  const prefix = normalized.slice(0, separator + 1)
  const body = normalized.slice(separator + 1)
  const groups: string[] = []
  for (let index = 0; index < body.length; index += 4) {
    groups.push(body.slice(index, index + 4))
  }

  return `${prefix} ${groups.join(' ')}`
}

function isDecodableCompactSdpBinary(token: string): boolean {
  try {
    decodeCompactSdpBinary(token)
    return true
  } catch {
    return false
  }
}

/**
 * True when a normalised token is safe to hand back. Legacy tokens are shape
 * checked only, so they behave exactly as before. A binary token is decoded
 * because the space grouped form makes it easy to capture trailing words.
 */
function isUsableNormalizedToken(normalized: string): boolean {
  if (!normalized.startsWith(COMPACT_TOKEN_V2_PREFIX)) return true
  return isDecodableCompactSdpBinary(normalized)
}

/**
 * Finds a token inside whatever the camera or clipboard produced. Accepts a
 * bare token, a full or relative URL carrying `#gd=` or `?gd=`, and text with
 * a token embedded in it.
 */
export function extractCompactTokenFromInput(raw: string): string | null {
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (trimmed.length === 0) return null

  const direct = normalizeTokenText(trimmed)
  if (direct && isUsableNormalizedToken(direct)) return direct

  const embedded = /[#?&]gd=([^&#]*)/i.exec(trimmed)
  if (embedded) {
    let value = embedded[1]
    try {
      value = decodeURIComponent(value)
    } catch {
      // A malformed percent escape still gets a chance as raw text.
    }

    for (const attempt of [value, value.trim().split(/\s+/)[0] ?? '']) {
      if (attempt.length === 0) continue
      const normalized = normalizeTokenText(attempt)
      if (normalized && isUsableNormalizedToken(normalized)) return normalized
    }
  }

  // The body may be grouped with spaces, so the match allows them and the
  // binary branch then keeps only the longest prefix that actually decodes.
  const inline = /GD[12]Z?\.[A-Za-z0-9_-]*(?:\s+[A-Za-z0-9_-]+)*/i.exec(trimmed)
  if (!inline) return null

  const matched = inline[0]
  if (/^gd2\./i.test(matched)) {
    const body = matched.replace(/^gd2\./i, '').replace(/\s+/g, '')
    let attempts = 0
    for (
      let cut = body.length;
      cut >= BINARY_MIN_BODY_LENGTH && attempts < BINARY_SHRINK_ATTEMPTS;
      cut -= 1
    ) {
      attempts += 1
      const candidate = `${COMPACT_TOKEN_V2_PREFIX}${body.slice(0, cut)}`
      if (isDecodableCompactSdpBinary(candidate)) return candidate
    }
    return null
  }

  const legacy = /GD1Z?\.[A-Za-z0-9_-]+/i.exec(matched)
  return legacy ? normalizeTokenText(legacy[0]) : null
}
