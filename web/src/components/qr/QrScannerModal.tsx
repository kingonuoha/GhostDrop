/**
 * Connect to your screen: QR camera scanner plus one accessible code field.
 * Source: docs/01-wireframe-and-pages.md Screen 4, docs/06-protocol-and-tech-spec.md
 * section 1, docs/02-brand-persona-and-copy.md ERR_CAMERA_DENIED,
 * decisions.md D-014 item 2 and 3.
 *
 * Two ways in, both one tap:
 * 1. Live camera preview through `getUserMedia`, requested straight from the
 *    button click so the browser keeps the user gesture and shows its prompt.
 * 2. Native phone camera through `<input type="file" capture="environment">`,
 *    which still works on a plain HTTP LAN or hotspot origin where the live
 *    preview is blocked, and the captured photo is decoded with `jsQR`.
 *
 * Layout reference: docs/design/connect_to_your_screen_modal.
 * Tokens, Laroka, lucide icons and copy come from docs/, never from the export.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
import jsQR from 'jsqr'
import {
  ArrowRight,
  Camera,
  CameraOff,
  Flashlight,
  ScanLine,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { buildFeedback } from '../../lib/copyDeck'
import { navigate } from '../../lib/router'
import {
  isValidRoomCode,
  normalizeRoomCode,
} from '../../lib/p2p'
import { ROOM_CODE_LENGTH } from '../../types/protocol'
import { NestedPillButton } from '../brand/NestedPillButton'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const CAMERA_DENIED = buildFeedback('ERR_CAMERA_DENIED')
const ROOM_NOT_FOUND = buildFeedback('ERR_ROOM_NOT_FOUND')

const CAPTURE_MISS_MESSAGE = 'No QR code there. Type the 6 letters below.'
const HTTP_CAMERA_HELP = 'Live preview is off here. Use your camera app below.'

/** Turns a scanned payload into a room code, or null when it is not ours. */
function extractRoomCode(payload: string): string | null {
  const value = payload.trim()
  if (value.length === 0) return null

  if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
    try {
      const url = new URL(value, window.location.origin)
      if (url.pathname.replace(/\/+$/, '') !== '/join') return null
      const code = normalizeRoomCode(url.searchParams.get('room') ?? '')
      return isValidRoomCode(code) ? code : null
    } catch {
      return null
    }
  }

  const code = normalizeRoomCode(value)
  return isValidRoomCode(code) ? code : null
}

/**
 * Decodes one QR code out of a still photo.
 * Tries the full frame at 1200px first, then again at 600px, and asks `jsQR` to
 * attempt both polarities because a dark QR on a light screen can land either
 * way round depending on the phone camera.
 */
function scanStillImage(source: CanvasImageSource, width: number, height: number): string | null {
  if (width <= 0 || height <= 0) return null
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  for (const maxSize of [1200, 600]) {
    const scale = Math.min(1, maxSize / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))

    canvas.width = targetWidth
    canvas.height = targetHeight
    context.clearRect(0, 0, targetWidth, targetHeight)
    context.drawImage(source, 0, 0, targetWidth, targetHeight)

    const pixels = context.getImageData(0, 0, targetWidth, targetHeight)
    const found = jsQR(pixels.data, targetWidth, targetHeight, {
      inversionAttempts: 'attemptBoth',
    })
    const code = found ? extractRoomCode(found.data) : null
    if (code) return code
  }

  return null
}

/** Decodes a captured or picked photo file. Never throws. */
async function decodePhotoForRoomCode(file: Blob): Promise<string | null> {
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmap(file)
      return scanStillImage(bitmap, bitmap.width, bitmap.height)
    } catch {
      // Falls through to the plain image element path below.
    } finally {
      bitmap?.close()
    }
  }

  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return null

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => resolve(null)
      element.src = objectUrl
    })
    if (!image) return null
    return scanStillImage(image, image.naturalWidth, image.naturalHeight)
  } finally {
    // The bytes never outlive this decode, per the ephemeral memory rule.
    URL.revokeObjectURL(objectUrl)
  }
}

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean }

type QrScannerModalProps = {
  onClose: () => void
}

export function QrScannerModal({ onClose }: QrScannerModalProps) {
  const titleId = `qr-title-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const descriptionId = `qr-description-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const errorId = `qr-error-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const dialogRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)
  const captureInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef(0)
  const sessionRef = useRef(0)
  const settledRef = useRef(false)
  const readyRef = useRef(false)
  const mountedRef = useRef(true)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraFailed, setCameraFailed] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [captureStatus, setCaptureStatus] = useState<string | null>(null)

  /** True when this browser can open a live preview on this origin. */
  const canUseLiveCamera =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext)

  /** One accepted code per mount, so two frames cannot double navigate. */
  const acceptCode = useCallback(
    (next: string) => {
      if (settledRef.current) return
      settledRef.current = true
      navigate(`/join?room=${next}`)
      onClose()
    },
    [onClose],
  )

  const acceptRef = useRef(acceptCode)
  useEffect(() => {
    acceptRef.current = acceptCode
  }, [acceptCode])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Tab hide stops every track, exactly like close and unmount. Coming back
  // restarts the camera because the permission is already granted.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleVisibility = () => {
      setPageVisible(document.visibilityState !== 'hidden')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current === null) return
    clearTimeout(watchdogRef.current)
    watchdogRef.current = null
  }, [])

  const stopCamera = useCallback(() => {
    clearWatchdog()
    if (frameRef.current !== 0) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
    const stream = streamRef.current
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      streamRef.current = null
    }
    const video = videoRef.current
    if (video) video.srcObject = null
    readyRef.current = false
  }, [clearWatchdog])

  /**
   * Starts the live preview.
   *
   * Called straight from the button click as well as on mount, so the browser
   * still holds the user gesture when `getUserMedia` runs and the permission
   * prompt actually appears. Never returns before calling `getUserMedia` when
   * the API exists: a plain HTTP origin simply lands on the friendly fallback.
   */
  const requestLiveCamera = useCallback(async () => {
    if (settledRef.current) return

    setCameraFailed(false)
    setCameraReady(false)
    setTorchAvailable(false)
    setTorchOn(false)

    if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      setCameraFailed(true)
      return
    }

    // A plain HTTP LAN origin is still asked, because some browsers expose
    // `mediaDevices` there and answer with a clear permission error. The
    // friendly fallback below takes over either way, and the native phone
    // camera button stays one tap away.
    stopCamera()
    sessionRef.current += 1
    const session = sessionRef.current

    // A browser that never answers the permission prompt would otherwise sit on
    // "Waking up the camera..." forever. The friendly fallback takes over, but
    // the pending request is left alone so a late Allow still wins.
    clearWatchdog()
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null
      if (readyRef.current) return
      setCameraReady(false)
      setCameraFailed(true)
    }, 8000)

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      // A camera that cannot honour the rear facing request, or a device that
      // reports no matching camera, still gets the plain video constraint.
      if (name === 'OverconstrainedError' || name === 'NotFoundError' || name === 'TypeError') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } catch {
          stream = null
        }
      }
    }

    if (stream === null) {
      clearWatchdog()
      if (sessionRef.current !== session) return
      setCameraFailed(true)
      return
    }

    if (sessionRef.current !== session || !mountedRef.current || settledRef.current) {
      for (const track of stream.getTracks()) track.stop()
      return
    }

    streamRef.current = stream
    const video = videoRef.current
    if (!video) {
      stopCamera()
      return
    }

    video.srcObject = stream
    try {
      await video.play()
    } catch {
      // Autoplay is best effort. Frames still arrive on most browsers.
    }

    if (sessionRef.current !== session || !mountedRef.current || settledRef.current) {
      stopCamera()
      return
    }

    const track = stream.getVideoTracks()[0]
    if (track) {
      try {
        const capabilities = track.getCapabilities() as TorchCapabilities
        setTorchAvailable(capabilities.torch === true)
      } catch {
        // A track without a capability report simply has no light button.
        setTorchAvailable(false)
      }
    }

    clearWatchdog()
    readyRef.current = true
    setCameraReady(true)
    setCameraFailed(false)

    const tick = () => {
      frameRef.current = 0
      if (sessionRef.current !== session) return

      const element = videoRef.current
      const width = element?.videoWidth ?? 0
      const height = element?.videoHeight ?? 0

      if (element && element.readyState >= 2 && width > 0 && height > 0) {
        let canvas = canvasRef.current
        if (!canvas) {
          canvas = document.createElement('canvas')
          canvasRef.current = canvas
        }
        if (canvas.width !== width) canvas.width = width
        if (canvas.height !== height) canvas.height = height

        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (context) {
          context.drawImage(element, 0, 0, width, height)
          const pixels = context.getImageData(0, 0, width, height)
          const found = jsQR(pixels.data, width, height, { inversionAttempts: 'dontInvert' })
          const scanned = found ? extractRoomCode(found.data) : null

          if (scanned) {
            stopCamera()
            acceptRef.current(scanned)
            return
          }
        }
      }

      if (sessionRef.current !== session) return
      frameRef.current = requestAnimationFrame(tick)
    }

    tick()
  }, [clearWatchdog, stopCamera])

  // Mount and every return to the tab start the camera. Leaving the tab stops it.
  useEffect(() => {
    if (!pageVisible) {
      stopCamera()
      return
    }
    void requestLiveCamera()
    return () => {
      stopCamera()
    }
  }, [pageVisible, requestLiveCamera, stopCamera])

  /**
   * Focus trap, Escape, body scroll lock, focus restore and an inert page
   * behind the dialog so virtual cursor users stay inside it.
   *
   * The 6 letter code field takes focus first, never the close button, so the
   * user who opened the scanner to type can start typing at once.
   */
  useEffect(() => {
    const node = dialogRef.current
    if (!node) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const body = document.body
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    // The dialog is portalled by the shell, so mark every sibling of its
    // overlay as inert while it is open.
    const backdrop = node.parentElement
    const siblings = backdrop?.parentElement
      ? Array.from(backdrop.parentElement.children).filter((child) => child !== backdrop)
      : []
    const inerted = siblings.filter((element): element is HTMLElement => element instanceof HTMLElement)
    for (const element of inerted) element.inert = true

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    const readFocusables = (): HTMLElement[] =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null,
      )

    const initial = codeInputRef.current ?? readFocusables()[0] ?? node
    initial.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = readFocusables()
      if (focusables.length === 0) {
        event.preventDefault()
        node.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && node.contains(active)

      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
      for (const element of inerted) element.inert = false
      previouslyFocused?.focus()
    }
  }, [onClose])

  const focusCodeInput = useCallback(() => {
    codeInputRef.current?.focus()
  }, [])

  const openNativeCamera = useCallback(() => {
    setCaptureStatus(null)
    captureInputRef.current?.click()
  }, [])

  /** Reads the photo the native camera app handed back and looks for our QR. */
  const handleCaptureFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0] ?? null
    // Cleared straight away so picking the same photo twice fires again.
    input.value = ''
    if (!file) return

    setCaptureStatus('Reading that photo...')
    const scanned = await decodePhotoForRoomCode(file)

    if (settledRef.current) return
    if (scanned) {
      setCaptureStatus(null)
      acceptRef.current(scanned)
      return
    }
    setCaptureStatus(CAPTURE_MISS_MESSAGE)
  }, [])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return

    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as TorchConstraintSet] })
      setTorchOn(next)
    } catch {
      setTorchAvailable(false)
      setTorchOn(false)
    }
  }

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = normalizeRoomCode(code)
    if (!isValidRoomCode(normalized)) {
      setCodeError(true)
      return
    }
    acceptCode(normalized)
  }

  const characters = Array.from({ length: ROOM_CODE_LENGTH }, (_, index) => code[index] ?? '')
  const isComplete = code.length === ROOM_CODE_LENGTH

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-ink/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={handleBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[440px] flex-col overflow-y-auto rounded-[32px] bg-brand-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift outline-none sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-eyebrow text-brand-ink-muted">Direct pairing</p>
            <h2 id={titleId} className="type-h2 mt-1 text-balance">
              Connect to your screen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the scanner"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-stone text-brand-ink transition-colors hover:bg-brand-line"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <p id={descriptionId} className="sr-only">
          Point the camera at the QR code on your other screen, or type the 6 letter code
          below.
        </p>

        {/* Always mounted, so a camera failure is announced instead of silently swapping. */}
        <p role="status" aria-live="assertive" className="sr-only">
          {cameraFailed ? `${CAMERA_DENIED.title} ${CAMERA_DENIED.body}` : ''}
        </p>

        <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-[28px] bg-brand-ink">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-hidden="true"
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
              cameraReady ? 'opacity-100' : 'opacity-0',
            )}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(var(--color-surface) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {cameraFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-lime text-brand-ink">
                <CameraOff size={24} strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="type-h3 text-white">{CAMERA_DENIED.title}</h3>
              <p className="max-w-[28ch] text-sm font-semibold text-white/75">
                {canUseLiveCamera ? CAMERA_DENIED.body : HTTP_CAMERA_HELP}
              </p>

              {canUseLiveCamera ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void requestLiveCamera()
                    }}
                    className="mt-1 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/25"
                  >
                    <Camera size={16} strokeWidth={2} aria-hidden="true" />
                    <span>Try Camera Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={openNativeCamera}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-lime px-4 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-lime-soft"
                  >
                    <ScanLine size={16} strokeWidth={2} aria-hidden="true" />
                    <span>Snap QR with Camera App</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openNativeCamera}
                  className="mt-1 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-lime px-4 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-lime-soft"
                >
                  <Camera size={16} strokeWidth={2} aria-hidden="true" />
                  <span>Open Phone Camera</span>
                </button>
              )}

              <button
                type="button"
                onClick={focusCodeInput}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
              >
                <span>{CAMERA_DENIED.actionLabel}</span>
              </button>
            </div>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-6 flex flex-col justify-between"
              >
                <div className="flex justify-between">
                  <svg viewBox="0 0 28 28" fill="none" className="h-8 w-8 text-brand-lime">
                    <path
                      d="M3 25V9C3 5.68629 5.68629 3 9 3H25"
                      stroke="currentColor"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg viewBox="0 0 28 28" fill="none" className="h-8 w-8 text-brand-lime">
                    <path
                      d="M3 3H19C22.3137 3 25 5.68629 25 9V25"
                      stroke="currentColor"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex justify-between">
                  <svg viewBox="0 0 28 28" fill="none" className="h-8 w-8 text-brand-lime">
                    <path
                      d="M3 3V19C3 22.3137 5.68629 25 9 25H25"
                      stroke="currentColor"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg viewBox="0 0 28 28" fill="none" className="h-8 w-8 text-brand-lime">
                    <path
                      d="M25 3V19C25 22.3137 22.3137 25 19 25H3"
                      stroke="currentColor"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <span
                aria-hidden="true"
                className="scanline-sweep pointer-events-none absolute inset-x-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-brand-lime to-transparent"
              />

              {torchAvailable ? (
                <button
                  type="button"
                  onClick={() => {
                    void toggleTorch()
                  }}
                  aria-pressed={torchOn}
                  aria-label={torchOn ? 'Turn the light off' : 'Turn the light on'}
                  className={cn(
                    'absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition-colors',
                    torchOn
                      ? 'bg-brand-lime text-brand-ink'
                      : 'bg-white/15 text-white hover:bg-white/25',
                  )}
                >
                  <Flashlight size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              ) : null}

              <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">
                  <ScanLine size={15} strokeWidth={2} aria-hidden="true" />
                  <span>{cameraReady ? 'Point camera at the QR code' : 'Waking up the camera...'}</span>
                </span>
                <button
                  type="button"
                  onClick={openNativeCamera}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/15 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25"
                >
                  <Camera size={15} strokeWidth={2} aria-hidden="true" />
                  <span>Snap QR with Camera App</span>
                </button>
              </div>
            </>
          )}
        </div>

        {captureStatus ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-3 rounded-[16px] bg-brand-stone px-3 py-2 text-xs font-semibold text-brand-ink"
          >
            {captureStatus}
          </p>
        ) : null}

        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            void handleCaptureFile(event)
          }}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className="relative my-4 flex items-center justify-center">
          <span aria-hidden="true" className="h-px w-full bg-brand-line" />
          <span className="absolute bg-brand-surface px-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-ink-muted">
            Or type the 6 letter code
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col">
          <div
            className={cn(
              'relative rounded-[20px] transition-shadow',
              codeError ? 'ring-2 ring-brand-error' : 'focus-within:ring-2 focus-within:ring-brand-cobalt',
            )}
          >
            <div aria-hidden="true" className="grid grid-cols-6 gap-1.5 sm:gap-2">
              {characters.map((character, index) => {
                const filled = character.length > 0
                const isNext = code.length === index && !codeError
                return (
                  <span
                    key={`slot-${index}`}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-[16px] transition-colors',
                      filled
                        ? 'bg-brand-stone text-brand-ink'
                        : 'bg-brand-stone/60 text-brand-ink-muted',
                      isNext ? 'bg-brand-surface ring-2 ring-brand-cobalt' : '',
                    )}
                  >
                    <span className="type-display text-[1.4rem] leading-none sm:text-[1.6rem]">
                      {character}
                    </span>
                  </span>
                )
              })}
            </div>

            <label htmlFor="qr-room-code" className="sr-only">
              6 letter room code
            </label>
            <input
              id="qr-room-code"
              ref={codeInputRef}
              name="roomCode"
              type="text"
              value={code}
              autoFocus
              onChange={(event) => {
                // Normalise before clamping so a pasted "gh st 48" keeps all 6 letters.
                const next = normalizeRoomCode(event.target.value).slice(0, ROOM_CODE_LENGTH)
                setCode(next)
                setCodeError(false)
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              aria-invalid={codeError}
              aria-describedby={codeError ? errorId : undefined}
              className="absolute inset-0 h-full w-full cursor-text rounded-[20px] bg-transparent text-[1rem] uppercase tracking-[0.4em] text-transparent caret-transparent outline-none"
            />
          </div>

          <div className="mt-2 min-h-[1.25rem] px-1">
            {codeError ? (
              <p
                id={errorId}
                role="alert"
                className="text-sm font-semibold text-brand-ink"
              >
                {ROOM_NOT_FOUND.title}
              </p>
            ) : (
              <p id={errorId} className="sr-only">
                Type the 6 letters shown on your other screen.
              </p>
            )}
          </div>

          <NestedPillButton
            type="submit"
            size="lg"
            variant="lime-on-cobalt"
            icon={ArrowRight}
            disabled={!isComplete}
            className="mt-3 w-full justify-between"
          >
            Connect Now
          </NestedPillButton>
        </form>

        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold text-brand-ink-muted">
          <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-brand-forest" />
          <span>Takes less than 2 seconds. No passwords needed.</span>
        </p>
      </div>
    </div>
  )
}
