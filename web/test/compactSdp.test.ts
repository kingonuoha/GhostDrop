/**
 * Zero dependency tests for the offline token codec.
 * Runner: `npm test` from `web/`, which compiles this file to CommonJS in
 * `.test-build` and then runs the built in Node test runner.
 * No emojis, no em dashes.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  COMPACT_TOKEN_COMPRESSED_PREFIX,
  COMPACT_TOKEN_PREFIX,
  COMPACT_TOKEN_V2_PREFIX,
  MAX_BINARY_CANDIDATES,
  decodeCompactSdp,
  decodeCompactSdpBinary,
  decodeCompactSdpSync,
  encodeCompactSdp,
  encodeCompactSdpBinary,
  encodeCompactSdpSync,
  extractCompactTokenFromInput,
  formatOfflineCodeForHumans,
  isCompactSdpToken,
} from '../src/lib/p2p/compactSdp'
import type { CompactSdpPayload } from '../src/lib/p2p/compactSdp'
import { P2PError } from '../src/lib/p2p/errors'

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

/** Bytes 0x00 to 0x1f, the same shape as a sha-256 DTLS fingerprint. */
const FINGERPRINT_HEX = '000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F'
const FINGERPRINT_BASE64 = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8'

/** A realistic Chrome pair: 6 char room, 4 char ufrag, 24 char pwd. */
function makePayload(overrides: Partial<CompactSdpPayload> = {}): CompactSdpPayload {
  return {
    v: 1,
    t: 'o',
    r: 'AB12CD',
    p: 'ghostdrop-room-AB12CD',
    n: 'Computer',
    d: 'desktop',
    u: 'abcd',
    w: 'abcdefghijklmnopqrstuvwx',
    f: FINGERPRINT_BASE64,
    s: 'a',
    c: [
      ['192.168.1.10', 51234, 'u', 'h'],
      ['10.0.0.5', 51000, 'u', 'h'],
    ],
    ...overrides,
  }
}

/** Non IPv4 candidates, so GD2 is impossible and the deflate path runs. */
function makeLegacyOnlyPayload(): CompactSdpPayload {
  return makePayload({
    r: 'ABCD2345',
    u: 'abcdefghijk12',
    w: 'abcdefghijklmnopqrstuvwxyzABCD',
    c: [
      ['fe80::1c2d:3e4f:5a6b:7c8d', 52000, 'u', 'h'],
      ['a1b2c3d4e5f6.local', 53000, 'u', 'h'],
    ],
  })
}

function encodeBinary(payload: CompactSdpPayload): string {
  const token = encodeCompactSdpBinary(payload)
  if (token === null) throw new Error('expected a GD2 token')
  return token
}

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** Independent decoder, so the layout test does not trust the module. */
function decodeBody(token: string): number[] {
  const body = token.slice(COMPACT_TOKEN_V2_PREFIX.length)
  const out: number[] = []
  let buffer = 0
  let bits = 0

  for (const character of body) {
    buffer = ((buffer << 6) | BASE64URL_ALPHABET.indexOf(character)) & 0xffffff
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 0xff)
    }
  }

  return out
}

function isProtocolError(error: unknown): boolean {
  return error instanceof P2PError && error.code === 'PROTOCOL_ERROR'
}

/* -------------------------------------------------------------------------- */
/* GD2 round trip                                                              */
/* -------------------------------------------------------------------------- */

test('GD2 round trip keeps every payload field', () => {
  const payload = makePayload()
  const token = encodeBinary(payload)

  assert.ok(token.startsWith(COMPACT_TOKEN_V2_PREFIX))
  assert.equal(isCompactSdpToken(token), true)

  const decoded = decodeCompactSdpBinary(token)
  assert.equal(decoded.v, 1)
  assert.equal(decoded.t, 'o')
  assert.equal(decoded.r, 'AB12CD')
  assert.equal(decoded.p, 'ghostdrop-room-AB12CD')
  assert.equal(decoded.n, 'Computer')
  assert.equal(decoded.d, 'desktop')
  assert.equal(decoded.u, 'abcd')
  assert.equal(decoded.w, 'abcdefghijklmnopqrstuvwx')
  assert.equal(decoded.f, FINGERPRINT_BASE64)
  assert.equal(decoded.s, 'a')
  assert.equal(decoded.m, undefined)
  assert.equal(decoded.k, undefined)
  assert.deepEqual(decoded.c, payload.c)
  assert.deepEqual(decodeCompactSdpSync(token), decoded)
})

test('GD2 length stays under 130 characters for a two candidate fixture', () => {
  const token = encodeBinary(makePayload())
  assert.equal(token.length, 115)
  assert.ok(token.length < 130)
  assert.ok(token.length < encodeCompactSdpSync(makePayload()).length)
})

/* -------------------------------------------------------------------------- */
/* GD2 byte layout                                                             */
/* -------------------------------------------------------------------------- */

test('GD2 lays out flags, lengths and fields in order', () => {
  const token = encodeBinary(makePayload())
  const bytes = decodeBody(token)

  assert.equal(bytes.length, 83)
  // offer, actpass, desktop, 2 candidates
  assert.equal(bytes[0], 0x80)
  // room 6, ufrag 4
  assert.equal(bytes[1], 0x60)
  // pwd 24
  assert.equal(bytes[2], 8)

  assert.equal(String.fromCharCode(...bytes.slice(3, 9)), 'AB12CD')
  assert.equal(String.fromCharCode(...bytes.slice(9, 13)), 'abcd')
  assert.equal(String.fromCharCode(...bytes.slice(13, 37)), 'abcdefghijklmnopqrstuvwx')
  assert.deepEqual(bytes.slice(37, 69), Array.from({ length: 32 }, (_, index) => index))

  // candidate 1: udp host 192.168.1.10:51234
  assert.equal(bytes[69], 0x00)
  assert.deepEqual(bytes.slice(70, 74), [192, 168, 1, 10])
  assert.equal((bytes[74] << 8) | bytes[75], 51234)
})

test('GD2 packs transport, candidate type and the fingerprint', () => {
  const payload = makePayload({
    f: FINGERPRINT_HEX,
    c: [
      ['192.168.1.20', 40000, 't', 's'],
      ['203.0.113.9', 6000, 'u', 'h'],
    ],
  })
  const token = encodeBinary(payload)
  const bytes = decodeBody(token)

  assert.equal(bytes[69], 0x03)
  assert.equal((bytes[74] << 8) | bytes[75], 40000)

  const decoded = decodeCompactSdpBinary(token)
  assert.equal(decoded.f, FINGERPRINT_BASE64)
  assert.deepEqual(decoded.c, payload.c)
})

/* -------------------------------------------------------------------------- */
/* Candidate selection                                                         */
/* -------------------------------------------------------------------------- */

test('GD2 caps candidates at three, prefers private hosts, dedupes by address and port', () => {
  const payload = makePayload({
    c: [
      ['203.0.113.9', 6000, 'u', 'h'],
      ['10.0.0.5', 51000, 'u', 'h'],
      ['198.51.100.7', 7000, 'u', 's'],
      ['192.168.1.10', 51234, 'u', 'h'],
      ['192.168.1.10', 51234, 'u', 'h'],
      ['2001:db8::1', 9000, 'u', 'h'],
    ],
  })

  const decoded = decodeCompactSdpBinary(encodeBinary(payload))
  assert.equal(MAX_BINARY_CANDIDATES, 3)
  assert.deepEqual(decoded.c, [
    ['10.0.0.5', 51000, 'u', 'h'],
    ['192.168.1.10', 51234, 'u', 'h'],
    ['203.0.113.9', 6000, 'u', 'h'],
  ])
})

test('GD2 returns null for non IPv4 or tcpType candidates and for empty lists', () => {
  assert.equal(encodeCompactSdpBinary(makePayload({ c: [] })), null)
  assert.equal(
    encodeCompactSdpBinary(makePayload({ c: [['fe80::1', 5000, 'u', 'h']] })),
    null,
  )
  assert.equal(
    encodeCompactSdpBinary(makePayload({ c: [['192.168.1.5', 5000, 't', 'h', 'active']] })),
    null,
  )
})

test('GD2 returns null when a field the layout cannot carry is set', () => {
  assert.equal(encodeCompactSdpBinary(makePayload({ m: '1' })), null)
  assert.equal(encodeCompactSdpBinary(makePayload({ k: 5001 })), null)
  assert.equal(encodeCompactSdpBinary(makePayload({ u: 'abcdefghijklmnopq' })), null)
  assert.equal(encodeCompactSdpBinary(makePayload({ w: 'a'.repeat(33) })), null)
  assert.equal(encodeCompactSdpBinary(makePayload({ f: FINGERPRINT_BASE64.slice(0, 40) })), null)

  const explicit = encodeCompactSdpBinary(makePayload({ m: '0', k: 5000 }))
  assert.ok(explicit !== null)
})

/* -------------------------------------------------------------------------- */
/* Synthesized metadata                                                        */
/* -------------------------------------------------------------------------- */

test('GD2 synthesizes the peer id and device label', () => {
  const answer = decodeCompactSdpBinary(
    encodeBinary(
      makePayload({
        t: 'a',
        d: 'mobile',
        s: 'c',
        p: 'ghostdrop-peer-any',
        n: 'Some phone',
      }),
    ),
  )

  assert.equal(answer.t, 'a')
  assert.equal(answer.p, 'ghostdrop-peer-00010203')
  assert.equal(answer.n, 'Phone')
  assert.equal(answer.d, 'mobile')
  assert.equal(answer.s, 'c')
  assert.equal(answer.m, undefined)
  assert.equal(answer.k, undefined)

  const tablet = decodeCompactSdpBinary(encodeBinary(makePayload({ d: 'tablet', s: 'p' })))
  assert.equal(tablet.n, 'Tablet')
  assert.equal(tablet.d, 'tablet')
  assert.equal(tablet.s, 'p')
})

/* -------------------------------------------------------------------------- */
/* Strict decode                                                               */
/* -------------------------------------------------------------------------- */

test('GD2 decode throws on a truncated buffer', () => {
  const token = encodeBinary(makePayload())
  const body = token.slice(COMPACT_TOKEN_V2_PREFIX.length)
  const truncated = `${COMPACT_TOKEN_V2_PREFIX}${body.slice(0, body.length - 4)}`

  assert.throws(() => decodeCompactSdpBinary(truncated), isProtocolError)
  assert.throws(() => decodeCompactSdpBinary(`${COMPACT_TOKEN_V2_PREFIX}AAAA`), isProtocolError)
  assert.throws(() => decodeCompactSdpBinary(encodeCompactSdpSync(makePayload())), isProtocolError)
})

test('GD2 decode throws on an overlong buffer', () => {
  const token = encodeBinary(makePayload())
  const padded = `${token}AAAA`
  assert.throws(() => decodeCompactSdpBinary(padded), isProtocolError)
})

/* -------------------------------------------------------------------------- */
/* Legacy tokens                                                               */
/* -------------------------------------------------------------------------- */

test('legacy GD1 tokens still decode byte identically', () => {
  const payload = makePayload()
  const token = encodeCompactSdpSync(payload)

  assert.ok(token.startsWith(COMPACT_TOKEN_PREFIX))
  assert.deepEqual(decodeCompactSdpSync(token), payload)
  assert.equal(extractCompactTokenFromInput(`give me ${token} please`), token)
})

test('legacy GD1Z tokens still decode when deflate is available', async (t) => {
  if (
    typeof CompressionStream === 'undefined' ||
    typeof DecompressionStream === 'undefined' ||
    typeof Blob === 'undefined'
  ) {
    t.skip('CompressionStream is not available here')
    return
  }

  const payload = makeLegacyOnlyPayload()
  assert.equal(encodeCompactSdpBinary(payload), null)

  const token = await encodeCompactSdp(payload)
  assert.ok(token.startsWith(COMPACT_TOKEN_COMPRESSED_PREFIX))
  assert.deepEqual(await decodeCompactSdp(token), payload)
  assert.throws(() => decodeCompactSdpSync(token), isProtocolError)
})

test('encodeCompactSdp returns the shortest token, GD2 when it wins', async () => {
  const payload = makePayload()
  const token = await encodeCompactSdp(payload)

  assert.ok(token.startsWith(COMPACT_TOKEN_V2_PREFIX))
  assert.ok(token.length < encodeCompactSdpSync(payload).length)
  assert.deepEqual(await decodeCompactSdp(token), decodeCompactSdpBinary(token))
})

/* -------------------------------------------------------------------------- */
/* Human format and input extraction                                           */
/* -------------------------------------------------------------------------- */

test('formatOfflineCodeForHumans groups the body in fours and re-extracts', () => {
  const token = encodeBinary(makePayload())
  const human = formatOfflineCodeForHumans(token)
  const [prefix, ...groups] = human.split(' ')

  assert.equal(prefix, COMPACT_TOKEN_V2_PREFIX)
  assert.equal(groups.join(''), token.slice(COMPACT_TOKEN_V2_PREFIX.length))
  assert.ok(groups.every((group) => group.length > 0 && group.length <= 4))
  assert.equal(extractCompactTokenFromInput(human), token)
  assert.equal(extractCompactTokenFromInput(`Copy this: ${human}`), token)
  assert.equal(extractCompactTokenFromInput(`${human} and then stop`), token)
})

test('extract accepts URLs, mixed case prefixes and grouped bodies', () => {
  const token = encodeBinary(makePayload())
  const human = formatOfflineCodeForHumans(token)

  assert.equal(extractCompactTokenFromInput(token), token)
  assert.equal(extractCompactTokenFromInput(`gd2.${token.slice(COMPACT_TOKEN_V2_PREFIX.length)}`), token)
  assert.equal(extractCompactTokenFromInput(`https://ghostdrop.app/#gd=${token}`), token)
  assert.equal(extractCompactTokenFromInput(`/?gd=${encodeURIComponent(human)}`), token)
  assert.equal(extractCompactTokenFromInput('no token here'), null)
  assert.equal(extractCompactTokenFromInput(''), null)
})

test('formatOfflineCodeForHumans rejects malformed input', () => {
  assert.throws(() => formatOfflineCodeForHumans('nope'), isProtocolError)
})
