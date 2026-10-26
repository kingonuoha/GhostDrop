import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy } from 'lucide-react'
import type { DeviceType } from '../../lib/p2p'
import { cn } from '../../lib/cn'
import type { RoomFeedbackKey } from '../../lib/copyDeck'
import {
  PAIRING_MODE_GROUP_LABEL,
  PAIRING_MODE_OFFLINE_LABEL,
  PAIRING_MODE_ONLINE_LABEL,
  PAIRING_OFFLINE_PREPARING,
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
 * One card, two views. The segmented control swaps the QR and its controls
 * instead of stacking both, so the card stays short in either mode. The online
 * view uses the short everyday link; the no internet view uses the same link
 * plus the direct link code, which is much denser and needs level L.
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
   * this a false to true transition only: a user who deliberately taps Online
   * afterwards is not fought by the effect.
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
   * Choosing the no internet view starts the direct link the first time, so the
   * QR can carry its code. Choosing online again is a view change only and never
   * tears the direct engine down.
   */
  const selectOffline = () => {
    setView('offline')
    if (!isOfflineDirect) onActivateOffline?.()
  }

  const pairingToggle = (
    <div
      role="group"
      aria-label={PAIRING_MODE_GROUP_LABEL}
      className="relative flex w-full max-w-[300px] items-center gap-1 rounded-full bg-brand-surface/80 p-1"
    >
      <button
        type="button"
        aria-pressed={!isOfflineView}
        onClick={() => setView('online')}
        className={cn(
          'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt',
          isOfflineView
            ? 'text-brand-ink-muted hover:bg-brand-surface'
            : 'bg-brand-lime text-brand-ink shadow-soft',
        )}
      >
        {PAIRING_MODE_ONLINE_LABEL}
      </button>
      <button
        type="button"
        aria-pressed={isOfflineView}
        onClick={selectOffline}
        className={cn(
          'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt',
          isOfflineView
            ? 'bg-brand-lime text-brand-ink shadow-soft'
            : 'text-brand-ink-muted hover:bg-brand-surface',
        )}
      >
        {PAIRING_MODE_OFFLINE_LABEL}
      </button>
    </div>
  )

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

      {pairingToggle}

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

      {/*
        One square surface panel for both views, so switching or waiting for the
        direct link code never resizes the card. The offline symbol is width
        bound and shrinks on a narrow screen instead of overflowing, and the
        preparing line holds the same panel rather than an empty box. The short
        code note under the offline panel is one line of small type, so the
        compact controls below stay the only real height difference.
      */}
      <div className="relative flex w-full flex-col items-center gap-1.5">
        <div
          className={cn(
            'relative flex aspect-square w-full items-center justify-center rounded-[24px] bg-brand-surface p-3 shadow-soft',
            isOfflineView ? 'max-w-[272px]' : 'max-w-[212px]',
          )}
        >
          {isOfflineView ? (
            offlineInviteToken ? (
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
            )
          ) : (
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
          )}
        </div>

        {isOfflineView ? (
          <p className="text-[0.66rem] font-bold uppercase leading-tight tracking-[0.08em] text-brand-ink/60">
            {PAIRING_SHORT_CODE_NOTE}
          </p>
        ) : null}
      </div>

      {isOfflineView ? null : (
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
      )}

      <p aria-live="polite" className="sr-only">
        {copied ? 'Code copied. Ready to paste.' : ''}
      </p>

      {isOfflineView ? (
        <OfflineLinkCard
          variant="inline"
          mode="host-waiting"
          token={offlineInviteToken}
          onOpenReplyScanner={onOpenReplyScanner}
          onAcceptReplyCode={onAcceptReplyCode}
          onCopyFeedback={onCopyFeedback}
          className="relative w-full"
        />
      ) : null}
    </section>
  )
}
