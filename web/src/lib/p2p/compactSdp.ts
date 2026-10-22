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
 * Token shapes, both URL safe and copy friendly:
 *   GD1.<base64url utf8 json>            always available, synchronous
 *   GD1Z.<base64url deflate-raw json>    smaller, needs CompressionStream
 *
 * This is a pure module. No React, no DOM writes, no module level side effects.
 * Every browser API is feature tested so Node, a worker and a page agree.
 * No emojis, no em dashes.
 */

import { isDeviceType } from '../../types/protocol'
import type { DeviceType } from '../../types/protocol'
import { P2PError } from './errors'

/** Schema version carried in `v`, so a future change is detectable. */
export const COMPACT_SDP_VERSION = 1

export const COMPACT_TOKEN_PREFIX = 'GD1.'
export const COMPACT_TOKEN_COMPRESSED_PREFIX = 'GD1Z.'

/** Hard cap from decisions.md D-016, keeps the QR dense but scannable. */
export const MAX_COMPACT_CANDIDATES = 8

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
 * paste `gd1z.`, while the base64url body keeps its exact case.
 */
function normalizeTokenText(value: string): string | null {
  const text = value.trim()
  if (text.length === 0 || text.length > MAX_TOKEN_LENGTH) return null

  const compressed = /^gd1z\./i.test(text)
  const plain = /^gd1\./i.test(text)
  if (!compressed && !plain) return null

  const prefix = compressed ? COMPACT_TOKEN_COMPRESSED_PREFIX : COMPACT_TOKEN_PREFIX
  const body = text.slice(prefix.length)
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
  if (normalized.startsWith(COMPACT_TOKEN_COMPRESSED_PREFIX)) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code needs the packed decoder')
  }

  const bytes = decodeBase64UrlToBytes(normalized.slice(COMPACT_TOKEN_PREFIX.length))
  return parsePayloadJson(bytes ? decodeUtf8(bytes) : null)
}

/**
 * Asynchronous encode. Uses `deflate-raw` when the browser has it and the
 * packed token is genuinely shorter, and otherwise falls back to `GD1.`
 * without ever changing behaviour for the caller.
 */
export async function encodeCompactSdp(payload: CompactSdpPayload): Promise<string> {
  const plain = encodeCompactSdpSync(payload)
  const deflated = await deflateRaw(encodeUtf8(JSON.stringify(payload)))
  if (!deflated) return plain

  const packed = `${COMPACT_TOKEN_COMPRESSED_PREFIX}${encodeBytesToBase64Url(deflated)}`
  return packed.length < plain.length ? packed : plain
}

/** Asynchronous decode for both token shapes. */
export async function decodeCompactSdp(token: string): Promise<CompactSdpPayload> {
  const normalized = normalizeTokenText(token)
  if (!normalized) {
    throw new P2PError('PROTOCOL_ERROR', 'That offline code is not valid')
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
  if (direct) return direct

  const embedded = /[#?&]gd=([^&#\s]+)/i.exec(trimmed)
  if (embedded) {
    let value = embedded[1]
    try {
      value = decodeURIComponent(value)
    } catch {
      // A malformed percent escape still gets a chance as raw text.
    }
    const normalized = normalizeTokenText(value)
    if (normalized) return normalized
  }

  const inline = /GD1Z?\.[A-Za-z0-9_-]+/i.exec(trimmed)
  if (!inline) return null

  return normalizeTokenText(inline[0])
}
