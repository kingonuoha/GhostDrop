/**
 * Acoustic modem for the offline pairing return channel.
 * Source: docs/tasks/step-15-v017-offline-codec-and-acoustic/brief.md section 4,
 * decisions.md D-016, docs/06-protocol-and-tech-spec.md section 2.
 *
 * The host shows a QR code and a room code. The guest needs one short reply
 * that survives a camera-less laptop, so the reply travels as sound: the phone
 * plays a burst, the laptop listens on its microphone, and the pairing token
 * comes back whole.
 *
 * Modulation is dual band 16-FSK, one nibble per band, one byte per symbol.
 *   preamble   60ms, 1500 Hz for 30ms then 1650 Hz for 30ms
 *   low band   1850 Hz to 3050 Hz, 80 Hz step, carries the low nibble
 *   high band  3300 Hz to 4500 Hz, 80 Hz step, carries the high nibble
 *   symbol     22ms with 5ms raised cosine edges
 *   amplitude  0.25 per tone, so the two tone peak is 0.5 and never clips
 *
 * Wire frame, exactly 5 bytes of overhead:
 *   [0]      kind, 0 GD2, 1 GD1Z, 2 GD1
 *   [1..2]   payload length, big endian
 *   [3..n]   UTF-8 bytes of the token string
 *   [n+1..2] CRC-16-CCITT over kind, length and payload
 *
 * The frame carries all three token shapes, because a guest on an older build
 * can still answer with GD1 or GD1Z. The matching split in the codec is by
 * design and not a bug: `decodeCompactSdpSync` handles GD2 and GD1 and throws
 * on GD1Z, because inflating needs the async CompressionStream, while the async
 * `decodeCompactSdp` handles all three. Anything that reaches this module has
 * already been decoded to a token string, so the acoustic path is unaffected.
 *
 * This module is deliberately split in two halves:
 *   A. pure DSP, no DOM, importable from Node, unit tested with node:test
 *   B. Web Audio plumbing, browser only, every global touched inside a function
 *
 * Zero dependencies. Zero top level window, AudioContext or navigator access.
 * No emojis, no em dashes.
 */

/** Kind byte for `GD2.` tokens, the binary offline codec. */
const KIND_GD2 = 0
/** Kind byte for `GD1Z.` tokens, the deflate raw JSON codec. */
const KIND_GD1Z = 1
/** Kind byte for `GD1.` tokens, the plain JSON codec. */
const KIND_GD1 = 2

const FRAME_HEADER_BYTES = 3
const FRAME_CRC_BYTES = 2

/** Token byte ceiling. A long GD1 token will not fit in the acoustic budget. */
export const ACOUSTIC_MAX_TOKEN_BYTES = 240

export const ACOUSTIC_PREAMBLE_MS = 60
export const ACOUSTIC_PREAMBLE_LOW_HZ = 1500
export const ACOUSTIC_PREAMBLE_HIGH_HZ = 1650
export const ACOUSTIC_SYMBOL_MS = 22
export const ACOUSTIC_EDGE_MS = 5
export const ACOUSTIC_AMPLITUDE = 0.25
export const ACOUSTIC_LOW_BAND_HZ = 1850
export const ACOUSTIC_HIGH_BAND_HZ = 3300
export const ACOUSTIC_BAND_STEP_HZ = 80
export const ACOUSTIC_TONES_PER_BAND = 16

/** Below this the highest tone would fold, so the modem refuses to run. */
const MIN_SAMPLE_RATE = 16000

/** Detection tuning, measured against the synthetic loop in the unit tests. */
const DETECT_WINDOW_MS = ACOUSTIC_PREAMBLE_MS / 2
const DETECT_HOP_MS = 5
const DETECT_RMS_FLOOR = 0.02
const PREAMBLE_MAGNITUDE_FLOOR = 0.04
const PREAMBLE_DOMINANCE = 2
const SYMBOL_MAGNITUDE_FLOOR = 0.03
const SYMBOL_DOMINANCE = 2.5

/** Capture side tuning. */
export const ACOUSTIC_CAPTURE_RATE = 48000
export const ACOUSTIC_SCAN_INTERVAL_MS = 250
export const ACOUSTIC_WINDOW_SECONDS = 6
const CAPTURE_RMS_GATE = 0.01
const FALLBACK_BLOCK_SAMPLES = 4096

export interface AcousticPlayOptions {
  signal?: AbortSignal
  onState?: (state: 'playing' | 'done' | 'error') => void
}

export interface AcousticListenOptions {
  onToken: (token: string) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

const LOW_FREQUENCIES: readonly number[] = Array.from(
  { length: ACOUSTIC_TONES_PER_BAND },
  (_, index) => ACOUSTIC_LOW_BAND_HZ + index * ACOUSTIC_BAND_STEP_HZ,
)

const HIGH_FREQUENCIES: readonly number[] = Array.from(
  { length: ACOUSTIC_TONES_PER_BAND },
  (_, index) => ACOUSTIC_HIGH_BAND_HZ + index * ACOUSTIC_BAND_STEP_HZ,
)

const TOKEN_PREFIX_KINDS: ReadonlyArray<readonly [string, number]> = [
  ['GD2.', KIND_GD2],
  ['GD1Z.', KIND_GD1Z],
  ['GD1.', KIND_GD1],
]

const utf8Encoder = new TextEncoder()

function isKindByte(value: number): boolean {
  return value === KIND_GD2 || value === KIND_GD1Z || value === KIND_GD1
}

function acousticKindForToken(token: string): number | null {
  for (const [prefix, kind] of TOKEN_PREFIX_KINDS) {
    if (token.startsWith(prefix)) return kind
  }
  return null
}

function msToSamples(milliseconds: number, sampleRate: number): number {
  return Math.round((milliseconds * sampleRate) / 1000)
}

function assertSampleRate(sampleRate: number): void {
  if (!Number.isFinite(sampleRate) || sampleRate < MIN_SAMPLE_RATE) {
    throw new Error('bad-sample-rate')
  }
}

// ---------------------------------------------------------------------------
// A1. CRC
// ---------------------------------------------------------------------------

/**
 * CRC-16-CCITT, polynomial 0x1021, initial value 0xFFFF, no reflection and no
 * final xor, which is the published CRC-16/CCITT-FALSE variant. Check value for
 * the ASCII string 123456789 is 0x29B1.
 */
export function crc16ccitt(bytes: Uint8Array): number {
  let crc = 0xffff
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= (bytes[index] & 0xff) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc & 0xffff
}

// ---------------------------------------------------------------------------
// A2. Frame
// ---------------------------------------------------------------------------

/**
 * Build the wire frame for a token. Throws `token-too-long` above 240 payload
 * bytes because the acoustic burst would run past the receive window.
 */
export function encodeAcousticFrame(token: string): Uint8Array {
  const kind = acousticKindForToken(token)
  if (kind === null) throw new Error('unsupported-token')
  const payload = utf8Encoder.encode(token)
  if (payload.length === 0) throw new Error('empty-token')
  if (payload.length > ACOUSTIC_MAX_TOKEN_BYTES) throw new Error('token-too-long')

  const frame = new Uint8Array(FRAME_HEADER_BYTES + payload.length + FRAME_CRC_BYTES)
  frame[0] = kind
  frame[1] = (payload.length >>> 8) & 0xff
  frame[2] = payload.length & 0xff
  frame.set(payload, FRAME_HEADER_BYTES)

  const crc = crc16ccitt(frame.subarray(0, frame.length - FRAME_CRC_BYTES))
  frame[frame.length - 2] = (crc >>> 8) & 0xff
  frame[frame.length - 1] = crc & 0xff
  return frame
}

/**
 * Validate a frame strictly and return the token, or null on any mismatch:
 * short buffer, unknown kind, declared length that disagrees with the buffer,
 * payload outside 1 to 240 bytes, CRC failure, invalid UTF-8, or a kind byte
 * that disagrees with the token prefix.
 */
export function decodeAcousticFrame(frame: Uint8Array): string | null {
  if (frame.length < FRAME_HEADER_BYTES + FRAME_CRC_BYTES) return null
  const kind = frame[0]
  if (!isKindByte(kind)) return null

  const declaredLength = (frame[1] << 8) | frame[2]
  const bodyLength = frame.length - FRAME_HEADER_BYTES - FRAME_CRC_BYTES
  if (declaredLength !== bodyLength) return null
  if (bodyLength < 1 || bodyLength > ACOUSTIC_MAX_TOKEN_BYTES) return null

  const crcIndex = frame.length - FRAME_CRC_BYTES
  const expected = (frame[crcIndex] << 8) | frame[crcIndex + 1]
  if (crc16ccitt(frame.subarray(0, crcIndex)) !== expected) return null

  let token: string
  try {
    token = new TextDecoder('utf-8', { fatal: true }).decode(
      frame.subarray(FRAME_HEADER_BYTES, crcIndex),
    )
  } catch {
    // A byte sequence that is not valid UTF-8 can never be a token.
    return null
  }

  if (acousticKindForToken(token) !== kind) return null
  return token
}

// ---------------------------------------------------------------------------
// A3. Synthesis
// ---------------------------------------------------------------------------

function raisedCosineGain(index: number, edgeSamples: number): number {
  if (edgeSamples <= 0) return 1
  return 0.5 - 0.5 * Math.cos((Math.PI * index) / edgeSamples)
}

function writeTone(
  output: Float32Array,
  start: number,
  end: number,
  frequency: number,
  sampleRate: number,
  amplitude: number,
): void {
  const length = end - start
  if (length <= 0) return
  const edge = Math.min(msToSamples(ACOUSTIC_EDGE_MS, sampleRate), Math.floor(length / 2))
  const step = (2 * Math.PI * frequency) / sampleRate
  for (let index = 0; index < length; index += 1) {
    let gain = 1
    if (edge > 0) {
      if (index < edge) gain = raisedCosineGain(index, edge)
      else if (index >= length - edge) gain = raisedCosineGain(length - index - 1, edge)
    }
    output[start + index] += amplitude * gain * Math.sin(step * index)
  }
}

/**
 * Render a validated frame as a waveform. Sample count is derived from the
 * sample rate itself, so 44100 and 48000 both land on their own grid and the
 * demodulator recomputes the same grid from the same rate.
 */
export function synthesizeAcousticFrame(frame: Uint8Array, sampleRate: number): Float32Array {
  assertSampleRate(sampleRate)
  if (decodeAcousticFrame(frame) === null) throw new Error('invalid-frame')

  const preambleSamples = msToSamples(ACOUSTIC_PREAMBLE_MS, sampleRate)
  const halfPreamble = msToSamples(ACOUSTIC_PREAMBLE_MS / 2, sampleRate)
  const totalSymbolSamples = msToSamples(frame.length * ACOUSTIC_SYMBOL_MS, sampleRate)
  const output = new Float32Array(preambleSamples + totalSymbolSamples)

  writeTone(output, 0, halfPreamble, ACOUSTIC_PREAMBLE_LOW_HZ, sampleRate, ACOUSTIC_AMPLITUDE)
  writeTone(
    output,
    halfPreamble,
    preambleSamples,
    ACOUSTIC_PREAMBLE_HIGH_HZ,
    sampleRate,
    ACOUSTIC_AMPLITUDE,
  )

  for (let symbol = 0; symbol < frame.length; symbol += 1) {
    const value = frame[symbol]
    const low = value & 0x0f
    const high = (value >> 4) & 0x0f
    const start = preambleSamples + msToSamples(symbol * ACOUSTIC_SYMBOL_MS, sampleRate)
    const end = preambleSamples + msToSamples((symbol + 1) * ACOUSTIC_SYMBOL_MS, sampleRate)
    writeTone(output, start, end, LOW_FREQUENCIES[low], sampleRate, ACOUSTIC_AMPLITUDE)
    writeTone(output, start, end, HIGH_FREQUENCIES[high], sampleRate, ACOUSTIC_AMPLITUDE)
  }

  return output
}

// ---------------------------------------------------------------------------
// A4. Demodulation
// ---------------------------------------------------------------------------

/**
 * Hann weights are cached per window length. Symbol windows repeat at one of
 * two lengths per sample rate, so this removes nearly every cosine call from
 * the hot loop and keeps a 250ms scan cheap enough for a phone.
 */
const hannWindowCache = new Map<number, { weights: Float64Array; sum: number }>()

function hannWindow(length: number): { weights: Float64Array; sum: number } {
  const cached = hannWindowCache.get(length)
  if (cached !== undefined) return cached
  const weights = new Float64Array(length)
  const span = length > 1 ? length - 1 : 1
  let sum = 0
  for (let index = 0; index < length; index += 1) {
    const weight = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / span)
    weights[index] = weight
    sum += weight
  }
  const entry = { weights, sum }
  if (hannWindowCache.size < 32) hannWindowCache.set(length, entry)
  return entry
}

/**
 * Goertzel magnitude of one frequency over one window. A Hann window is applied
 * because 80 Hz spaced tones are only 1.76 bins apart on a 22ms symbol, and the
 * unwindowed skirts would blur neighbouring nibbles together. Normalisation is
 * `2 / sum(window)`, so a clean tone of amplitude A reads back as about A.
 */
function goertzelMagnitude(
  samples: Float32Array,
  start: number,
  length: number,
  frequency: number,
  sampleRate: number,
): number {
  if (length < 2 || start < 0 || start + length > samples.length) return 0
  const { weights, sum } = hannWindow(length)
  if (sum <= 0) return 0
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate)
  let previous = 0
  let beforePrevious = 0
  for (let index = 0; index < length; index += 1) {
    const current =
      samples[start + index] * weights[index] + coefficient * previous - beforePrevious
    beforePrevious = previous
    previous = current
  }
  const power =
    previous * previous + beforePrevious * beforePrevious - coefficient * previous * beforePrevious
  if (power <= 0) return 0
  return (2 * Math.sqrt(power)) / sum
}

function windowRms(samples: Float32Array, start: number, length: number): number {
  if (length <= 0 || start < 0 || start + length > samples.length) return 0
  let total = 0
  for (let index = 0; index < length; index += 1) {
    const value = samples[start + index]
    total += value * value
  }
  return Math.sqrt(total / length)
}

/** Magnitudes of all 32 candidate tones over one symbol window. */
function fillBandMagnitudes(
  samples: Float32Array,
  start: number,
  length: number,
  sampleRate: number,
  output: Float64Array,
): void {
  for (let index = 0; index < ACOUSTIC_TONES_PER_BAND; index += 1) {
    output[index] = goertzelMagnitude(
      samples,
      start,
      length,
      LOW_FREQUENCIES[index],
      sampleRate,
    )
    output[ACOUSTIC_TONES_PER_BAND + index] = goertzelMagnitude(
      samples,
      start,
      length,
      HIGH_FREQUENCIES[index],
      sampleRate,
    )
  }
}

function strongestInBand(
  magnitudes: Float64Array,
  offset: number,
): { index: number; peak: number; runnerUp: number } {
  let index = 0
  let peak = -1
  let runnerUp = -1
  for (let slot = 0; slot < ACOUSTIC_TONES_PER_BAND; slot += 1) {
    const value = magnitudes[offset + slot]
    if (value > peak) {
      runnerUp = peak
      peak = value
      index = slot
    } else if (value > runnerUp) {
      runnerUp = value
    }
  }
  return { index, peak, runnerUp: Math.max(runnerUp, 0) }
}

/**
 * Read one symbol. Returns null when either band has no dominant tone, which is
 * the guard that keeps noise from being decoded as a token.
 */
function readSymbol(
  samples: Float32Array,
  start: number,
  length: number,
  sampleRate: number,
  scratch: Float64Array,
): number | null {
  fillBandMagnitudes(samples, start, length, sampleRate, scratch)
  const low = strongestInBand(scratch, 0)
  const high = strongestInBand(scratch, ACOUSTIC_TONES_PER_BAND)
  if (low.peak < SYMBOL_MAGNITUDE_FLOOR || high.peak < SYMBOL_MAGNITUDE_FLOOR) return null
  if (low.peak < SYMBOL_DOMINANCE * low.runnerUp) return null
  if (high.peak < SYMBOL_DOMINANCE * high.runnerUp) return null
  return (high.index << 4) | low.index
}

/**
 * Find the end of the preamble pair and return the first symbol sample.
 * Stage 1 scans 30ms windows on a 5ms hop for a 1500 Hz hold followed by a
 * 1650 Hz hold. The window equals the tone length on purpose: any other length
 * leaves a flat score plateau and the boundary drifts by up to a whole tone.
 * Stage 2 refines the boundary sample by sample with exact 30ms windows.
 * Stage 3 nudges the symbol grid by up to 1ms using the first three symbols.
 */
function findSymbolGrid(samples: Float32Array, sampleRate: number): number | null {
  const detectWindow = Math.max(16, msToSamples(DETECT_WINDOW_MS, sampleRate))
  const hop = Math.max(1, msToSamples(DETECT_HOP_MS, sampleRate))
  const halfPreamble = Math.max(16, msToSamples(ACOUSTIC_PREAMBLE_MS / 2, sampleRate))

  let coarseScore = 0
  let coarseStart = -1
  const coarseLimit = samples.length - 2 * halfPreamble
  for (let start = 0; start <= coarseLimit; start += hop) {
    if (windowRms(samples, start, detectWindow) < DETECT_RMS_FLOOR) continue
    const first = goertzelMagnitude(
      samples,
      start,
      detectWindow,
      ACOUSTIC_PREAMBLE_LOW_HZ,
      sampleRate,
    )
    if (first < PREAMBLE_MAGNITUDE_FLOOR) continue
    const firstOther = goertzelMagnitude(
      samples,
      start,
      detectWindow,
      ACOUSTIC_PREAMBLE_HIGH_HZ,
      sampleRate,
    )
    if (first < PREAMBLE_DOMINANCE * firstOther) continue

    const secondStart = start + halfPreamble
    const second = goertzelMagnitude(
      samples,
      secondStart,
      detectWindow,
      ACOUSTIC_PREAMBLE_HIGH_HZ,
      sampleRate,
    )
    if (second < PREAMBLE_MAGNITUDE_FLOOR) continue
    const secondOther = goertzelMagnitude(
      samples,
      secondStart,
      detectWindow,
      ACOUSTIC_PREAMBLE_LOW_HZ,
      sampleRate,
    )
    if (second < PREAMBLE_DOMINANCE * secondOther) continue

    const score = first + second
    if (score > coarseScore) {
      coarseScore = score
      coarseStart = start
    }
  }
  if (coarseStart < 0) return null

  const refineSpan = hop
  const refineStep = 1
  let refinedScore = 0
  let refinedStart = -1
  for (let offset = -refineSpan; offset <= refineSpan; offset += refineStep) {
    const start = coarseStart + offset
    if (start < 0 || start + 2 * halfPreamble > samples.length) continue
    const low = goertzelMagnitude(
      samples,
      start,
      halfPreamble,
      ACOUSTIC_PREAMBLE_LOW_HZ,
      sampleRate,
    )
    const high = goertzelMagnitude(
      samples,
      start + halfPreamble,
      halfPreamble,
      ACOUSTIC_PREAMBLE_HIGH_HZ,
      sampleRate,
    )
    const score = low + high
    if (score > refinedScore) {
      refinedScore = score
      refinedStart = start
    }
  }
  if (refinedStart < 0) return null

  const baseGrid = refinedStart + 2 * halfPreamble
  const scratch = new Float64Array(ACOUSTIC_TONES_PER_BAND * 2)
  const probeSymbols = 3
  let bestGrid = baseGrid
  let bestScore = -1
  for (let step = -2; step <= 2; step += 1) {
    const grid = baseGrid + Math.round((step * sampleRate) / 2000)
    let score = 0
    for (let symbol = 0; symbol < probeSymbols; symbol += 1) {
      const start = grid + msToSamples(symbol * ACOUSTIC_SYMBOL_MS, sampleRate)
      const end = grid + msToSamples((symbol + 1) * ACOUSTIC_SYMBOL_MS, sampleRate)
      if (start < 0 || end > samples.length || end - start < 2) {
        score = -1
        break
      }
      fillBandMagnitudes(samples, start, end - start, sampleRate, scratch)
      score +=
        strongestInBand(scratch, 0).peak +
        strongestInBand(scratch, ACOUSTIC_TONES_PER_BAND).peak
    }
    if (score > bestScore) {
      bestScore = score
      bestGrid = grid
    }
  }
  if (bestScore <= 0) return null
  return bestGrid
}

/**
 * Symbol window on the grid, clamped to the buffer tail. The last symbol may be
 * flush with the end of a capture, so up to a quarter of it is allowed to be
 * missing rather than failing the whole frame.
 */
function symbolWindow(
  grid: number,
  symbol: number,
  sampleCount: number,
  sampleRate: number,
): { start: number; length: number } | null {
  const start = grid + msToSamples(symbol * ACOUSTIC_SYMBOL_MS, sampleRate)
  const nominalEnd = grid + msToSamples((symbol + 1) * ACOUSTIC_SYMBOL_MS, sampleRate)
  if (start < 0 || start >= sampleCount) return null
  const nominalLength = nominalEnd - start
  const end = Math.min(nominalEnd, sampleCount)
  const length = end - start
  if (length < Math.max(8, Math.floor(nominalLength * 0.75))) return null
  return { start, length }
}

/**
 * Recover a token from recorded audio. Returns null when there is no preamble,
 * when any symbol is too weak to trust, or when the CRC does not match.
 */
export function demodulateAcousticFrame(samples: Float32Array, sampleRate: number): string | null {
  if (!Number.isFinite(sampleRate) || sampleRate < MIN_SAMPLE_RATE) return null
  if (samples.length < 4) return null

  const grid = findSymbolGrid(samples, sampleRate)
  if (grid === null) return null

  const scratch = new Float64Array(ACOUSTIC_TONES_PER_BAND * 2)
  const header = new Uint8Array(FRAME_HEADER_BYTES)
  for (let symbol = 0; symbol < FRAME_HEADER_BYTES; symbol += 1) {
    const window = symbolWindow(grid, symbol, samples.length, sampleRate)
    if (window === null) return null
    const value = readSymbol(samples, window.start, window.length, sampleRate, scratch)
    if (value === null) return null
    header[symbol] = value
  }

  const payloadLength = (header[1] << 8) | header[2]
  if (payloadLength < 1 || payloadLength > ACOUSTIC_MAX_TOKEN_BYTES) return null

  const totalSymbols = payloadLength + FRAME_HEADER_BYTES + FRAME_CRC_BYTES
  const frame = new Uint8Array(totalSymbols)
  frame.set(header, 0)
  for (let symbol = FRAME_HEADER_BYTES; symbol < totalSymbols; symbol += 1) {
    const window = symbolWindow(grid, symbol, samples.length, sampleRate)
    if (window === null) return null
    const value = readSymbol(samples, window.start, window.length, sampleRate, scratch)
    if (value === null) return null
    frame[symbol] = value
  }

  return decodeAcousticFrame(frame)
}

// ---------------------------------------------------------------------------
// B. Web Audio plumbing
// ---------------------------------------------------------------------------

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext

interface AudioContextScope {
  AudioContext?: AudioContextConstructor
  webkitAudioContext?: AudioContextConstructor
}

function audioContextConstructor(): AudioContextConstructor | null {
  const scope = globalThis as unknown as AudioContextScope
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

/**
 * True only when a page can both play and capture: a Web Audio constructor, a
 * secure context, and getUserMedia. Node has no window, so it returns false and
 * the unit tests can import this module safely.
 */
export function isAcousticModemSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof navigator === 'undefined') return false
  if (audioContextConstructor() === null) return false
  if (window.isSecureContext !== true) return false
  const media = navigator.mediaDevices
  return typeof media?.getUserMedia === 'function'
}

function asError(value: unknown, fallback: string): Error {
  if (value instanceof Error) return value
  return new Error(fallback)
}

/** Read through a helper so control flow narrowing never freezes the flag. */
function isAborted(signal?: AbortSignal): boolean {
  return signal !== undefined && signal.aborted
}

function isMicrophoneDenial(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const name = (value as { name?: unknown }).name
  return name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError'
}

/**
 * Play one token as a single burst. Always closes the context it opened, even
 * on abort or playback error, so no audio hardware handle is left behind.
 */
export async function playAcousticToken(
  token: string,
  options: AcousticPlayOptions = {},
): Promise<void> {
  const frame = encodeAcousticFrame(token)
  const Constructor = audioContextConstructor()
  const signal = options.signal
  const notify = options.onState

  if (Constructor === null) {
    notify?.('error')
    throw new Error('unsupported')
  }
  if (isAborted(signal)) {
    notify?.('error')
    throw new Error('aborted')
  }

  const context = new Constructor()
  let source: AudioBufferSourceNode | null = null
  let rejectPlayback: ((error: Error) => void) | null = null
  const stopSource = () => {
    if (source === null) return
    try {
      source.stop()
    } catch {
      // Already stopped or never started, nothing to release.
    }
  }
  const onAbort = () => stopSource()
  const onAbortReject = () => {
    rejectPlayback?.(new Error('aborted'))
  }
  signal?.addEventListener('abort', onAbort)
  signal?.addEventListener('abort', onAbortReject)

  try {
    if (context.state === 'suspended') await context.resume()
    const wave = synthesizeAcousticFrame(frame, context.sampleRate)
    // The abort listeners were armed before the resume and synthesis awaits,
    // when no rejectable promise existed yet, so the signal is re-read here.
    if (isAborted(signal)) throw new Error('aborted')
    const buffer = context.createBuffer(1, wave.length, context.sampleRate)
    buffer.getChannelData(0).set(wave)
    source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    const node = source
    if (isAborted(signal)) throw new Error('aborted')
    await new Promise<void>((resolve, reject) => {
      let settled = false
      rejectPlayback = reject
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }
      node.onended = finish
      if (isAborted(signal)) {
        // Aborted between the connect and the promise, so never start the node.
        settled = true
        reject(new Error('aborted'))
        return
      }
      try {
        node.start()
        notify?.('playing')
      } catch (error) {
        if (settled) return
        settled = true
        reject(asError(error, 'audio-failed'))
      }
    })
    notify?.('done')
  } catch (error) {
    notify?.('error')
    throw asError(error, 'audio-failed')
  } finally {
    rejectPlayback = null
    signal?.removeEventListener('abort', onAbort)
    signal?.removeEventListener('abort', onAbortReject)
    if (source !== null) {
      source.onended = null
      try {
        source.disconnect()
      } catch {
        // Disconnecting an already released node is not an error.
      }
    }
    await context.close().catch(() => undefined)
  }
}

/** Fixed size ring of the most recent seconds of microphone audio. */
class SampleRing {
  private readonly chunks: Float32Array[] = []
  private readonly capacity: number
  private count = 0

  constructor(seconds: number, sampleRate: number) {
    this.capacity = Math.max(1, Math.round(seconds * sampleRate))
  }

  push(chunk: Float32Array): void {
    if (chunk.length === 0) return
    this.chunks.push(chunk)
    this.count += chunk.length
    while (this.chunks.length > 1 && this.count - this.chunks[0].length >= this.capacity) {
      const dropped = this.chunks.shift()
      if (dropped !== undefined) this.count -= dropped.length
    }
  }

  get length(): number {
    return this.count
  }

  snapshot(): Float32Array {
    const length = Math.min(this.count, this.capacity)
    const output = new Float32Array(length)
    let write = length
    for (let index = this.chunks.length - 1; index >= 0 && write > 0; index -= 1) {
      const chunk = this.chunks[index]
      const take = Math.min(chunk.length, write)
      output.set(chunk.subarray(chunk.length - take), write - take)
      write -= take
    }
    return output
  }
}

const WORKLET_SOURCE = [
  'class GhostDropAcousticTap extends AudioWorkletProcessor {',
  '  process(inputs) {',
  '    const channel = inputs[0] && inputs[0][0]',
  '    if (channel && channel.length > 0) this.port.postMessage(channel.slice(0))',
  '    return true',
  '  }',
  '}',
  "registerProcessor('ghostdrop-acoustic-tap', GhostDropAcousticTap)",
].join('\n')

/**
 * Listen for one acoustic token. Resolves with an idempotent stop function once
 * the microphone is live. Every exit path stops the tracks and closes the
 * context: token found, caller abort, microphone denial, microphone failure, or
 * an explicit stop call. The promise itself never rejects, because the caller
 * gets failures through `onError`.
 */
export async function listenForAcousticToken(
  options: AcousticListenOptions,
): Promise<() => void> {
  const { onToken, onError, signal } = options
  const noop = () => undefined

  if (isAborted(signal)) return noop
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    onError?.(new Error('unsupported'))
    return noop
  }
  const Constructor = audioContextConstructor()
  const media = navigator.mediaDevices
  if (Constructor === null || typeof media?.getUserMedia !== 'function') {
    onError?.(new Error('unsupported'))
    return noop
  }

  let stream: MediaStream
  try {
    stream = await media.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
  } catch (error) {
    onError?.(new Error(isMicrophoneDenial(error) ? 'mic-denied' : 'mic-unavailable'))
    return noop
  }

  if (isAborted(signal)) {
    for (const track of stream.getTracks()) track.stop()
    return noop
  }

  let context: AudioContext
  try {
    context = new Constructor({ sampleRate: ACOUSTIC_CAPTURE_RATE })
  } catch {
    // Some devices refuse an explicit rate, so take the hardware default.
    context = new Constructor()
  }

  let source: MediaStreamAudioSourceNode
  try {
    source = context.createMediaStreamSource(stream)
  } catch {
    for (const track of stream.getTracks()) track.stop()
    void context.close().catch(() => undefined)
    onError?.(new Error('mic-unavailable'))
    return noop
  }
  const ring = new SampleRing(ACOUSTIC_WINDOW_SECONDS, context.sampleRate)
  let worklet: AudioWorkletNode | null = null
  let processor: ScriptProcessorNode | null = null
  let sink: GainNode | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let closed = false
  let scanning = false
  let onAbort: () => void = () => undefined

  const stop = () => {
    if (closed) return
    closed = true
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    signal?.removeEventListener('abort', onAbort)
    if (worklet !== null) {
      worklet.port.onmessage = null
      try {
        worklet.disconnect()
      } catch {
        // Node already detached.
      }
      worklet = null
    }
    if (processor !== null) {
      processor.onaudioprocess = null
      try {
        processor.disconnect()
      } catch {
        // Node already detached.
      }
      processor = null
    }
    if (sink !== null) {
      try {
        sink.disconnect()
      } catch {
        // Node already detached.
      }
      sink = null
    }
    try {
      source.disconnect()
    } catch {
      // Node already detached.
    }
    for (const track of stream.getTracks()) track.stop()
    void context.close().catch(() => undefined)
  }

  const scan = () => {
    if (closed || scanning) return
    if (ring.length < context.sampleRate * 0.2) return
    scanning = true
    try {
      const window = ring.snapshot()
      const gateLength = Math.min(window.length, Math.round(context.sampleRate * 0.25))
      const gateStart = window.length - gateLength
      if (windowRms(window, gateStart, gateLength) < CAPTURE_RMS_GATE) return
      const token = demodulateAcousticFrame(window, context.sampleRate)
      if (token === null) return
      stop()
      onToken(token)
    } catch {
      // A demodulation failure must never tear the microphone down.
    } finally {
      scanning = false
    }
  }

  const onSamples = (chunk: Float32Array) => {
    if (closed) return
    ring.push(chunk)
  }

  const attachCapture = async (): Promise<boolean> => {
    const canUseWorklet =
      typeof AudioWorkletNode !== 'undefined' && typeof context.audioWorklet !== 'undefined'
    if (canUseWorklet) {
      const blob = new Blob([WORKLET_SOURCE], { type: 'text/javascript' })
      const url = URL.createObjectURL(blob)
      try {
        await context.audioWorklet.addModule(url)
      } catch {
        return false
      } finally {
        URL.revokeObjectURL(url)
      }
      // stop() may have run while addModule was pending. Building a node here
      // would attach a live graph to a closed context and keep this closure
      // alive, so bail out before touching AudioWorkletNode.
      if (closed) return false
      const node = new AudioWorkletNode(context, 'ghostdrop-acoustic-tap', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      })
      node.port.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data instanceof Float32Array) onSamples(event.data)
      }
      const gain = context.createGain()
      gain.gain.value = 0
      if (closed) {
        node.port.onmessage = null
        node.disconnect()
        gain.disconnect()
        return false
      }
      source.connect(node)
      node.connect(gain)
      gain.connect(context.destination)
      worklet = node
      sink = gain
      return true
    }
    return false
  }

  const attachFallback = () => {
    processor = context.createScriptProcessor(FALLBACK_BLOCK_SAMPLES, 1, 1)
    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      onSamples(new Float32Array(event.inputBuffer.getChannelData(0)))
    }
    sink = context.createGain()
    sink.gain.value = 0
    source.connect(processor)
    processor.connect(sink)
    sink.connect(context.destination)
  }

  try {
    if (context.state === 'suspended') await context.resume()
    const attached = await attachCapture()
    // stop() during addModule closes the context, so the fallback must not be
    // built on top of it either.
    if (!attached && !closed) attachFallback()
  } catch {
    stop()
    onError?.(new Error('mic-unavailable'))
    return noop
  }

  if (closed) return noop
  if (isAborted(signal)) {
    stop()
    return noop
  }
  onAbort = () => stop()
  signal?.addEventListener('abort', onAbort)
  timer = setInterval(scan, ACOUSTIC_SCAN_INTERVAL_MS)
  return stop
}
