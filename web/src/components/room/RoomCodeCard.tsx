import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Wifi } from 'lucide-react'
import type { DeviceType } from '../../lib/p2p'
import { cn } from '../../lib/cn'
import type { RoomFeedbackKey } from '../../lib/copyDeck'
import {
  PAIRING_OFFLINE_HELPER,
  PAIRING_OFFLINE_LINK_CTA,
  PAIRING_OFFLINE_PREPARING,
  PAIRING_ONLINE_RETURN_CTA,
  PAIRING_QR_TITLE_OFFLINE,
  PAIRING_QR_TITLE_ONLINE,
  PAIRING_SHORT_CODE_NOTE,
} from '../../lib/copyDeck'
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

type PairingView = 'online' | 'offline'

/**
 * The quiet text link that moves between the two views. No fill, no border, a
 * 44px target and one weight step below the primary controls, so the normal card
 * never reads as a two-option choice.
 */
const QUIET_LINK_CLASS =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-[0.72rem] font-semibold text-brand-ink-muted underline-offset-4 transition-colors duration-200 hover:text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2'

type RoomCodeCardProps = {
  code: string
  /** Plain pairing link, never carries a direct link code. */
  joinUrl: string
  /** Pairing link plus the direct link code, used by the no internet view. */
  offlineJoinUrl: string
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
 *
 * The normal view is the whole card: title, QR, room code row and copy. Offline
 * is a rescue path reached through one quiet link under the code, never a mode
 * choice at the top. Source: decisions.md D-023, plans/offline-one-scan-pairing-plan.md
 * section 10.
 *
 * The online view carries the short everyday link. The offline view swaps in the
 * same link plus the direct link code, which is much denser and needs level L,
 * and adds the compact reply controls underneath.
 */
export function RoomCodeCard({
  code,
  joinUrl,
  offlineJoinUrl,
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
  const [view, setView] = useState<PairingView>('online')
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const isOfflineView = view === 'offline'

  /**
   * A failover to the direct engine makes the short online code useless, so the
   * card follows the room the moment it goes offline. The ref is what makes
   * this a false to true transition only: a user who deliberately taps the
   * return link afterwards is not fought by the effect.
   */
  const wasOfflineDirectRef = useRef(false)

  useEffect(() => {
    if (isOfflineDirect && !wasOfflineDirectRef.current) {
      setView('offline')
    }
    wasOfflineDirectRef.current = isOfflineDirect
  }, [isOfflineDirect])

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

  /**
   * Following the quiet link starts the direct link the first time, so the QR
   * can carry its code. Returning is a view change only and never tears the
   * direct engine down.
   */
  const openOfflineView = () => {
    setView('offline')
    if (!isOfflineDirect) onActivateOffline?.()
  }

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

      {isOfflineView ? (
        /*
          The rescue path. One helper line, the dense invite QR, the short code
          note, the compact reply controls and a quiet way back. Nothing here is
          mounted while the normal card is showing, so the default card carries
          no offline affordance beyond its single link.
        */
        <div
          id="pairing-offline-view"
          className="relative flex w-full flex-col items-center gap-4"
        >
          <p className="text-[0.72rem] font-semibold leading-snug text-brand-ink-muted">
            {PAIRING_OFFLINE_HELPER}
          </p>

          <div className="relative flex w-full flex-col items-center gap-1.5">
            <div className="relative flex aspect-square w-full max-w-[272px] items-center justify-center rounded-[24px] bg-brand-surface p-3 shadow-soft">
              {offlineInviteToken ? (
                <QRCodeSVG
                  value={offlineJoinUrl}
                  size={248}
                  level="L"
                  marginSize={2}
                  bgColor="transparent"
                  fgColor="currentColor"
                  title={PAIRING_QR_TITLE_OFFLINE}
                  className="h-full w-full text-brand-ink"
                />
              ) : (
                <p className="max-w-[20ch] text-center text-xs font-bold leading-snug text-brand-ink-muted">
                  {PAIRING_OFFLINE_PREPARING}
                </p>
              )}
            </div>

            <p className="text-[0.66rem] font-bold uppercase leading-tight tracking-[0.08em] text-brand-ink/60">
              {PAIRING_SHORT_CODE_NOTE}
            </p>
          </div>

          <OfflineLinkCard
            variant="inline"
            mode="host-waiting"
            token={offlineInviteToken}
            inviteUrl={offlineJoinUrl}
            onOpenReplyScanner={onOpenReplyScanner}
            onAcceptReplyCode={onAcceptReplyCode}
            onCopyFeedback={onCopyFeedback}
            className="relative w-full"
          />

          <button
            type="button"
            onClick={() => setView('online')}
            aria-expanded={isOfflineView}
            aria-controls="pairing-online-view"
            className={cn('relative', QUIET_LINK_CLASS)}
          >
            <span>{PAIRING_ONLINE_RETURN_CTA}</span>
          </button>
        </div>
      ) : (
        /*
          The everyday card. The QR, the code row and copy only, with the offline
          rescue path one quiet tap below the code.
        */
        <div id="pairing-online-view" className="relative flex w-full flex-col items-center gap-6">
          <div className="relative flex aspect-square w-full max-w-[212px] items-center justify-center rounded-[24px] bg-brand-surface p-3 shadow-soft">
            <QRCodeSVG
              value={joinUrl}
              size={168}
              level="M"
              marginSize={2}
              bgColor="transparent"
              fgColor="currentColor"
              title={PAIRING_QR_TITLE_ONLINE}
              className="h-full w-full text-brand-ink"
            />
          </div>

          <div className="relative flex w-full items-center justify-between gap-2 rounded-full bg-brand-surface py-2 pl-3 pr-2 shadow-soft sm:pl-4">
            <span className="shrink-0 text-[0.58rem] font-bold uppercase tracking-[0.06em] text-brand-ink-muted sm:text-[0.7rem] sm:tracking-[0.1em] md:hidden lg:inline">
              Or type code:
            </span>
            <span className="room-code min-w-0 flex-1 overflow-hidden text-ellipsis text-center text-[0.95rem] sm:text-[1.35rem] md:text-[1.05rem] lg:text-[1.1rem] xl:text-[1.2rem]">
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

          <button
            type="button"
            onClick={openOfflineView}
            aria-expanded={isOfflineView}
            aria-controls="pairing-offline-view"
            className={QUIET_LINK_CLASS}
          >
            <Wifi size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span>{PAIRING_OFFLINE_LINK_CTA}</span>
          </button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {copied ? 'Code copied. Ready to paste.' : ''}
      </p>
    </section>
  )
}
