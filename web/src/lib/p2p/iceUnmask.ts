/**
 * Hotspot and LAN IPv4 unmasking for ICE gathering.
 * Source: decisions.md D-016 item 3, plans/total-offline-and-hotspot-bridge-plan.md
 * section 3 layer 2 item 1.
 *
 * Why this exists: once an origin is a public HTTPS host, Chrome, Edge and
 * Safari replace every local IPv4 candidate with a random `<uuid>.local` mDNS
 * name. A phone hotspot drops multicast between the hotspot host and the
 * tethered laptop, so those names never resolve and the direct link fails even
 * though both screens sit on the same subnet. The browser only reveals the raw
 * `192.168.x.x`, `172.20.10.x` or `10.x.x.x` address once this document has held
 * an active media capture. A single short camera pulse is enough, and it costs
 * one permission prompt at most.
 *
 * Rules kept here:
 * - never prompt on its own: the pulse runs only when camera is already granted
 * - every track is stopped in a finally block, including a late arriving stream
 * - a pulse is cached for 60 seconds only when the camera actually opened, so a
 *   denied, busy, aborted or timed out pulse leaves the cache cold and the next
 *   call retries at once instead of waiting out the window
 * - nothing in this module ever throws
 * - no emojis, no em dashes
 */

const CAMERA_CACHE_MS = 60_000
const DEFAULT_TIMEOUT_MS = 350

export interface IceUnmaskOptions {
  /**
   * Allow the pulse while the camera permission is still undecided. Defaults to
   * false so opening a room never raises an unexpected permission prompt;
   * `QrScannerModal` grants camera first, then this becomes a silent pulse.
   */
  forceIfPrompted?: boolean
}

let lastPulseAt = 0
let inFlight: Promise<boolean> | null = null

/**
 * Millisecond timestamp of the last successful pulse, 0 when none ran yet.
 * A pulse only counts when a camera stream was actually acquired.
 */
export function getIceUnmaskPulseAt(): number {
  return lastPulseAt
}

/** Clears the 60 second pulse cache. Used by tests and by a manual reset. */
export function resetIceUnmaskCache(): void {
  lastPulseAt = 0
  inFlight = null
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // A track the platform already released is safe to ignore.
    }
  }
}

function readMediaDevices(): MediaDevices | undefined {
  if (typeof navigator === 'undefined') return undefined
  const devices = navigator.mediaDevices
  if (typeof devices?.getUserMedia !== 'function') return undefined
  return devices
}

/**
 * True only when the camera is already granted, or when the caller explicitly
 * allowed a prompt. Anything else returns false so no popup appears.
 */
async function isCameraPulseAllowed(forceIfPrompted: boolean): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  const permissions = navigator.permissions
  if (typeof permissions?.query !== 'function') return false

  try {
    const status = await permissions.query({ name: 'camera' as unknown as PermissionName })
    if (status.state === 'granted') return true
    return status.state === 'prompt' && forceIfPrompted
  } catch {
    // Browsers without a camera permission descriptor throw here.
    return false
  }
}

/**
 * Opens the camera, waits at most `timeoutMs`, then stops every track.
 * A stream that arrives after the timeout is stopped too, so the camera light
 * never stays on.
 *
 * Returns true only when a stream was really acquired inside the window, which
 * is the only case that counts as an unmasking pulse. A missing `mediaDevices`,
 * a rejection, an abort or a timeout resolves false.
 */
async function pulseCamera(timeoutMs: number): Promise<boolean> {
  const devices = readMediaDevices()
  if (!devices) return false

  let stream: MediaStream | null = null
  let acquired = false
  let settled = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const request = devices.getUserMedia({ video: true, audio: false })
  // Late resolution after the race already settled still has to be released.
  request.then(
    (late) => {
      if (settled) stopStream(late)
    },
    () => undefined,
  )

  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs)
    })
    stream = await Promise.race([request, timeout])
  } catch {
    // Denied, busy, or no camera at all. ICE keeps the mDNS names.
    stream = null
  } finally {
    settled = true
    if (timer !== null) clearTimeout(timer)
    acquired = stream !== null
    if (stream) stopStream(stream)
  }

  return acquired
}

/**
 * Runs one short, permission gated camera pulse so the next ICE gathering pass
 * emits raw RFC1918 host candidates instead of `.local` names.
 *
 * Resolves in roughly 0 ms when a successful pulse already ran in the last 60
 * seconds, when camera is not granted, when the browser has no media support, or
 * when the camera never opens. It never rejects.
 *
 * Only a pulse that really acquired a stream warms the 60 second cache. A
 * denial, a busy device, an abort or a timeout leaves it cold, so the next call
 * retries straight away. That matters around `QrScannerModal`, which can still
 * hold the camera while `acceptOfflineToken` starts the direct bridge.
 */
export async function unmaskLocalIceIps(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  options: IceUnmaskOptions = {},
): Promise<void> {
  try {
    if (!readMediaDevices()) return

    const now = Date.now()
    if (lastPulseAt > 0 && now - lastPulseAt < CAMERA_CACHE_MS) return
    if (inFlight) {
      await inFlight
      return
    }

    const budget = Number.isFinite(timeoutMs)
      ? Math.max(0, Math.min(timeoutMs, CAMERA_CACHE_MS))
      : DEFAULT_TIMEOUT_MS

    // The permission gate lives inside the shared attempt so the in flight slot
    // is claimed before the first await. Two callers that arrive together share
    // one camera pulse instead of racing each other into two.
    const attempt = (async (): Promise<boolean> => {
      if (!(await isCameraPulseAllowed(options.forceIfPrompted === true))) return false
      return pulseCamera(budget)
    })()

    inFlight = attempt
    try {
      const pulsed = await attempt
      // Cache only a real pulse so a failed attempt stays retryable.
      if (pulsed) lastPulseAt = Date.now()
    } finally {
      inFlight = null
    }
  } catch {
    // Unmasking is an optimisation. A failure must never block a connection.
  }
}
