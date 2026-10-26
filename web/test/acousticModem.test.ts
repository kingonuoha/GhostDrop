/**
 * Unit tests for the acoustic modem frame layer and a full synthetic loop.
 * Source: docs/tasks/step-15-v017-offline-codec-and-acoustic/brief.md section 4.
 *
 * The Web Audio half is not tested here on purpose. Node has no AudioContext,
 * no microphone and no AudioWorklet, so those paths are verified by hand on two
 * devices. Everything below is pure DSP and pure byte handling.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ACOUSTIC_MAX_TOKEN_BYTES,
  crc16ccitt,
  decodeAcousticFrame,
  demodulateAcousticFrame,
  encodeAcousticFrame,
  synthesizeAcousticFrame,
} from '../src/lib/p2p/acousticModem.js'

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** Deterministic PRNG so a failing decode is always reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** Build a GD2 shaped token of an exact UTF-8 byte length. */
function makeToken(byteLength: number, seed: number): string {
  const random = mulberry32(seed)
  const bodyLength = byteLength - 'GD2.'.length
  let body = ''
  for (let index = 0; index < bodyLength; index += 1) {
    body += BASE64URL_ALPHABET[Math.floor(random() * BASE64URL_ALPHABET.length)]
  }
  return `GD2.${body}`
}

/** Render a token, prepend leading silence, then add white noise. */
function renderLoop(
  token: string,
  sampleRate: number,
  seed: number,
  noiseAmplitude = 0.005,
  silenceSamples = 4000,
): Float32Array {
  const wave = synthesizeAcousticFrame(encodeAcousticFrame(token), sampleRate)
  const samples = new Float32Array(silenceSamples + wave.length)
  const random = mulberry32(seed)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = noiseAmplitude * (random() * 2 - 1)
  }
  samples.set(wave, silenceSamples)
  return samples
}

/**
 * Linear resample, used to model two devices whose clocks differ. A ratio above
 * 1 stretches the burst in time, which is what a slow sender clock looks like
 * to a receiver that records at the nominal rate.
 */
function resampleLinear(samples: Float32Array, ratio: number): Float32Array {
  const length = Math.round(samples.length * ratio)
  const output = new Float32Array(length)
  for (let index = 0; index < length; index += 1) {
    const position = index / ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, samples.length - 1)
    const mix = position - left
    output[index] = samples[left] * (1 - mix) + samples[right] * mix
  }
  return output
}

test('crc16ccitt matches the published CCITT-FALSE check value', () => {
  const bytes = new TextEncoder().encode('123456789')
  assert.equal(crc16ccitt(bytes), 0x29b1)
  assert.equal(crc16ccitt(new Uint8Array(0)), 0xffff)
})

test('frame round trip returns the same token', () => {
  const token = makeToken(110, 7)
  const frame = encodeAcousticFrame(token)
  assert.equal(frame.length, 110 + 5)
  assert.equal(decodeAcousticFrame(frame), token)
})

test('kind byte maps GD2 to 0, GD1Z to 1 and GD1 to 2', () => {
  assert.equal(encodeAcousticFrame('GD2.AAAA')[0], 0)
  assert.equal(encodeAcousticFrame('GD1Z.AAAA')[0], 1)
  assert.equal(encodeAcousticFrame('GD1.AAAA')[0], 2)
})

test('an unknown token prefix is rejected at encode time', () => {
  assert.throws(() => encodeAcousticFrame('NOPE.AAAA'), /unsupported-token/)
})

test('a truncated frame returns null', () => {
  const frame = encodeAcousticFrame(makeToken(40, 11))
  assert.equal(decodeAcousticFrame(frame.subarray(0, frame.length - 1)), null)
  assert.equal(decodeAcousticFrame(new Uint8Array(0)), null)
  assert.equal(decodeAcousticFrame(frame.subarray(0, 4)), null)
})

test('a corrupted CRC returns null', () => {
  const frame = encodeAcousticFrame(makeToken(60, 12))
  frame[frame.length - 1] ^= 0xff
  assert.equal(decodeAcousticFrame(frame), null)

  const payloadFlip = encodeAcousticFrame(makeToken(60, 13))
  payloadFlip[10] ^= 0x01
  assert.equal(decodeAcousticFrame(payloadFlip), null)
})

test('a declared length that disagrees with the buffer returns null', () => {
  const frame = encodeAcousticFrame(makeToken(60, 14))
  frame[1] = 0
  frame[2] = 59
  assert.equal(decodeAcousticFrame(frame), null)
})

test('a frame with a valid CRC but an unresolvable kind returns null', () => {
  const frame = encodeAcousticFrame(makeToken(50, 15))
  frame[0] = 7
  const crc = crc16ccitt(frame.subarray(0, frame.length - 2))
  frame[frame.length - 2] = (crc >>> 8) & 0xff
  frame[frame.length - 1] = crc & 0xff
  assert.equal(decodeAcousticFrame(frame), null)

  const mismatch = encodeAcousticFrame(makeToken(50, 16))
  mismatch[0] = 2
  const mismatchCrc = crc16ccitt(mismatch.subarray(0, mismatch.length - 2))
  mismatch[mismatch.length - 2] = (mismatchCrc >>> 8) & 0xff
  mismatch[mismatch.length - 1] = mismatchCrc & 0xff
  assert.equal(decodeAcousticFrame(mismatch), null)
})

test('a token over the byte budget is rejected by the pure helper', () => {
  const tooLong = makeToken(ACOUSTIC_MAX_TOKEN_BYTES + 1, 17)
  assert.throws(() => encodeAcousticFrame(tooLong), /token-too-long/)
  assert.equal(encodeAcousticFrame(makeToken(ACOUSTIC_MAX_TOKEN_BYTES, 18)).length, 245)
})

test('full loop at 48000 decodes a 110 byte token exactly', () => {
  const token = makeToken(110, 21)
  assert.equal(new TextEncoder().encode(token).length, 110)
  const samples = renderLoop(token, 48000, 21)
  assert.equal(demodulateAcousticFrame(samples, 48000), token)
})

test('full loop at 44100 decodes the same token exactly', () => {
  const token = makeToken(110, 21)
  const samples = renderLoop(token, 44100, 21)
  assert.equal(demodulateAcousticFrame(samples, 44100), token)
})

test('full loop at 48000 holds across 0, 2, 5 and 8 percent noise', () => {
  const token = makeToken(110, 33)
  for (const noise of [0, 0.02, 0.05, 0.08]) {
    const samples = renderLoop(token, 48000, 41, noise)
    assert.equal(demodulateAcousticFrame(samples, 48000), token, `noise amplitude ${noise}`)
  }
})

test('full loop at 48000 survives a 0.2 percent clock stretch', () => {
  const token = makeToken(110, 34)
  const wave = synthesizeAcousticFrame(encodeAcousticFrame(token), 48000)
  const stretched = resampleLinear(wave, 1.002)
  const silenceSamples = 1920
  const samples = new Float32Array(silenceSamples + stretched.length)
  const random = mulberry32(43)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = 0.005 * (random() * 2 - 1)
  }
  samples.set(stretched, silenceSamples)
  assert.equal(demodulateAcousticFrame(samples, 48000), token)
})

test('full loop at 48000 decodes the 240 byte maximum payload', () => {
  const token = makeToken(ACOUSTIC_MAX_TOKEN_BYTES, 35)
  assert.equal(new TextEncoder().encode(token).length, 240)
  const samples = renderLoop(token, 48000, 44)
  assert.equal(demodulateAcousticFrame(samples, 48000), token)
})

test('silence and noise alone never produce a token', () => {
  const random = mulberry32(99)
  const samples = new Float32Array(48000 * 2)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = 0.02 * (random() * 2 - 1)
  }
  assert.equal(demodulateAcousticFrame(samples, 48000), null)
  assert.equal(demodulateAcousticFrame(new Float32Array(0), 48000), null)
})
