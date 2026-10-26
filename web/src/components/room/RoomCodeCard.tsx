import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Wifi } from 'lucide-react'
import type { DeviceType } from '../../lib/p2p'
import { cn } from '../../lib/cn'
import type { RoomFeedbackKey } from '../../lib/copyDeck'
import { OFFLINE_SWITCH_CTA } from '../../lib/copyDeck'
import { scanCardHelper, scanCardTitle } from '../../lib/device'
import type { LanCandidate } from '../../lib/lanInfo'
import { OrbBadge } from '../brand/OrbBadge'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'
import { OfflineLinkCard } from './OfflineLinkCard'

/** Single line, letter spaced room code that can never wrap. */
function spacedCode(code: string): string {
  return code.split('').join(' ')
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    return false
  }
  return false
}

type RoomCodeCardProps = {
  code: string
  /** Link the phone camera opens, always `${origin}/join?room=${code}`. */
  joinUrl: string
  /** Runtime detected class of this screen, so the copy names the right device. */
  deviceType: DeviceType
  /** Real Wi-Fi and hotspot origins the QR code may point at. */
  lanOptions?: readonly LanCandidate[]
  /** Currently selected LAN origin, when the page is on loopback. */
  activeLanUrl?: string | null
  /** Switches the QR code between two real network adapters. */
  onSelectLan?: (url: string) => void
  className?: string
  /** Raises the copy deck toast through the page feedback plumbing. */
  onCopyFeedback?: (key: RoomFeedbackKey) => void
  /** True while the room is on the serverless direct link. */
  isOfflineDirect?: boolean
  /** The host invite code shown in offline mode. */
  offlineInviteToken?: string | null
  /** Opens the camera modal ready to read the guest reply code. */
  onOpenReplyScanner?: () => void
  /** Accepts a pasted reply code, for a screen with no camera. */
  onAcceptReplyCode?: (raw: string) => boolean | Promise<boolean>
  /** Switches this room to the direct link without waiting for a timeout. */
  onActivateOffline?: () => void
}

/**
 * Left hub card: the lime Swatch 3 pairing card.
 * Layout reference: docs/design/ghostdrop_ultra_clean_desktop_hub_grandma_edition.
 */
export function RoomCodeCard({
  code,
  joinUrl,
  deviceType,
  lanOptions = [],
  activeLanUrl = null,
  onSelectLan,
  className,
  onCopyFeedback,
  isOfflineDirect = false,
  offlineInviteToken = null,
  onOpenReplyScanner,
  onAcceptReplyCode,
  onActivateOffline,
}: RoomCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  /**
   * The hub link can carry a pre-generated direct link code after its hash.
   * Measured: that code is 231 characters with no network choices and 405 at
   * the eight choice cap, so the scanned link grows from 280 to 454 characters.
   * A link that long needs a denser symbol, so the direct link case only uses
   * the lighter error level and a 216 px box. At that size the symbol is 61 to
   * 73 dots wide, which is 3.54 px down to 2.96 px per dot. The 73 dot case at
   * the eight choice cap is the only one under 3 px per dot, and it is the
   * tightest this card gets, so the box is not shrunk any further. The plain
   * online link keeps its own size and error level.
   */
  const hasDirectLinkCode = Boolean(offlineInviteToken)

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(code)

    if (!ok) {
      // A blocked clipboard still gets a joyful way out, never a silent tap.
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      setCopied(false)
      onCopyFeedback?.('ERR_COPY_BLOCKED')
      return
    }

    setCopied(true)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2200)
    onCopyFeedback?.('SUCCESS_COPIED')
  }, [code, onCopyFeedback])

  return (
    <section
      aria-labelledby="scan-title"
      className={cn(
        'relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-[32px] bg-brand-lime p-6 text-center text-brand-ink md:p-8',
        className,
      )}
    >
      <SquiggleCardBg tone="cobalt" variant="single-loop" opacity={0.22} placement="bottom-right" />

      <div className="relative flex flex-col items-center gap-2">
        <OrbBadge size="md">1</OrbBadge>
        <h2 id="scan-title" className="type-h2">
          {scanCardTitle(deviceType)}
        </h2>
        <p className="max-w-[26ch] text-sm font-semibold text-brand-ink/75">
          {scanCardHelper(deviceType)}
        </p>
      </div>

      {lanOptions.length > 1 ? (
        <div
          role="group"
          aria-label="Pick the network for this code"
          className="relative flex flex-wrap items-center justify-center gap-1.5"
        >
          {lanOptions.map((option) => {
            const isActive = activeLanUrl === option.url
            return (
              <button
                key={option.url}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelectLan?.(option.url)}
                className={cn(
                  'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[0.7rem] font-bold transition-colors',
                  isActive
                    ? 'bg-brand-cobalt text-white'
                    : 'bg-brand-surface/80 text-brand-ink-muted hover:bg-brand-surface',
                )}
              >
                <span className="max-w-[8rem] truncate">{option.name}</span>
                <span className="font-mono text-[0.65rem] opacity-80">{option.address}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div
        className={cn(
          'relative flex aspect-square w-full items-center justify-center rounded-[24px] bg-brand-surface p-3 shadow-soft',
          hasDirectLinkCode ? 'max-w-[240px]' : 'max-w-[212px]',
        )}
      >
        <QRCodeSVG
          value={joinUrl}
          size={hasDirectLinkCode ? 216 : 168}
          level={hasDirectLinkCode ? 'L' : 'M'}
          marginSize={0}
          bgColor="transparent"
          fgColor="currentColor"
          title="Scan this code with your phone camera"
          className="h-full w-full text-brand-ink"
        />
      </div>

      <div className="relative flex w-full items-center justify-between gap-2 rounded-full bg-brand-surface py-2 pl-3 pr-2 shadow-soft sm:pl-4">
        <span className="shrink-0 text-[0.58rem] font-bold uppercase tracking-[0.06em] text-brand-ink-muted sm:text-[0.7rem] sm:tracking-[0.1em] md:hidden lg:inline">
          Or type code:
        </span>
        <span
          className="room-code min-w-0 flex-1 overflow-hidden text-ellipsis text-center text-[0.95rem] sm:text-[1.35rem] md:text-[1.05rem] lg:text-[1.1rem] xl:text-[1.2rem]"
        >
          <span aria-hidden="true">{spacedCode(code)}</span>
          <span className="sr-only">Room code {code}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            void handleCopy()
          }}
          aria-label={copied ? 'Code copied' : 'Copy the room code'}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
            copied
              ? 'bg-brand-ink text-brand-lime'
              : 'bg-brand-cobalt text-white hover:bg-brand-cobalt-deep',
          )}
        >
          {copied ? (
            <Check size={18} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={18} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? 'Code copied. Ready to paste.' : ''}
      </p>

      {isOfflineDirect ? (
        <OfflineLinkCard
          mode="host-waiting"
          token={offlineInviteToken}
          onOpenReplyScanner={onOpenReplyScanner}
          onAcceptReplyCode={onAcceptReplyCode}
          onCopyFeedback={onCopyFeedback}
          className="relative w-full"
        />
      ) : (
        <button
          type="button"
          onClick={onActivateOffline}
          className="relative inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-brand-surface/80 px-4 text-[0.7rem] font-bold leading-tight text-brand-ink-muted transition-colors hover:bg-brand-surface hover:text-brand-ink"
        >
          <Wifi size={14} strokeWidth={2} aria-hidden="true" />
          <span>{OFFLINE_SWITCH_CTA}</span>
        </button>
      )}
    </section>
  )
}
