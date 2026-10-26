import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, ClipboardPaste, Copy, ScanLine, Wifi } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { RoomFeedbackKey } from '../../lib/copyDeck'
import {
  OFFLINE_BADGE_LABEL,
  OFFLINE_COPY_INVITE_CTA,
  OFFLINE_COPY_REPLY_CTA,
  OFFLINE_GUEST_REPLY_BODY,
  OFFLINE_GUEST_REPLY_TITLE,
  OFFLINE_HOST_STEP_BODY,
  OFFLINE_HOST_STEP_TITLE,
  OFFLINE_PASTE_CTA,
  OFFLINE_PASTE_LABEL,
  OFFLINE_PASTE_PLACEHOLDER,
  OFFLINE_SCAN_REPLY_CTA,
} from '../../lib/copyDeck'
import { NestedPillButton } from '../brand/NestedPillButton'
import { OrbBadge } from '../brand/OrbBadge'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'

/**
 * Copies an offline link code, with a selection fallback for plain HTTP origins.
 * A LAN or hotspot origin is usually plain HTTP, where `navigator.clipboard` is
 * undefined or rejected, so the hidden textarea keeps the button working.
 */
async function copyOfflineCode(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Falls through to the textarea path below.
    }
  }

  if (typeof document === 'undefined') return false

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

export interface OfflineLinkCardProps {
  mode: 'host-waiting' | 'guest-reply'
  /** For host-waiting: the Host's offline invite token (GD1...). For guest-reply: the Guest's reply token (GD1...). */
  token: string | null
  /** Triggered when the Host clicks 'Scan or Paste Reply' (opens QrScannerModal in reply mode). */
  onOpenReplyScanner?: () => void
  /**
   * Triggered when the Host submits a pasted reply code. Resolves true when the
   * handshake accepted the code. This is the path for a screen with no camera.
   */
  onAcceptReplyCode?: (raw: string) => boolean | Promise<boolean>
  /** Triggered when copy succeeds or fails so the page toast announces it. */
  onCopyFeedback?: (key: RoomFeedbackKey) => void
  className?: string
}

const COPIED_HOLD_MS = 2200

/**
 * Offline direct pairing card.
 * Source: docs/02-brand-persona-and-copy.md section 2.2, decisions.md D-016 item 2.
 *
 * Guest side shows the reply QR its other screen reads. Host side is a compact
 * panel that fits inside the pairing card and carries no QR of its own, because
 * the host QR already lives there.
 */
export function OfflineLinkCard({
  mode,
  token,
  onOpenReplyScanner,
  onAcceptReplyCode,
  onCopyFeedback,
  className,
}: OfflineLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [accepting, setAccepting] = useState(false)
  const pasteId = useId()

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  // A fresh token means a fresh handshake, so the tick resets with it.
  useEffect(() => {
    setCopied(false)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [token])

  const handleCopy = useCallback(async () => {
    if (!token) {
      onCopyFeedback?.('ERR_OFFLINE_CODE_INVALID')
      return
    }

    const ok = await copyOfflineCode(token)

    if (!ok) {
      // A blocked clipboard still gets a joyful way out, never a silent tap.
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      setCopied(false)
      onCopyFeedback?.('ERR_OFFLINE_CODE_INVALID')
      return
    }

    setCopied(true)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), COPIED_HOLD_MS)
    onCopyFeedback?.('SUCCESS_COPIED')
  }, [token, onCopyFeedback])

  /**
   * Handles the camera-free path for the Host. A rejected code keeps the typed
   * text so a mistyped character is a quick fix, and the hook already raises
   * the playful invalid code toast, so this never prints a raw error string.
   */
  const handleAcceptReplyCode = useCallback(async () => {
    const raw = pasteValue.trim()
    if (!raw || accepting || !onAcceptReplyCode) return

    setAccepting(true)
    try {
      const accepted = await onAcceptReplyCode(raw)
      if (accepted) setPasteValue('')
    } catch {
      // The toast owns the message, and the field keeps the text for a retry.
    } finally {
      setAccepting(false)
    }
  }, [accepting, onAcceptReplyCode, pasteValue])

  if (mode === 'guest-reply') {
    // Nothing to show before the reply token exists, and the page only mounts
    // this card once the reply is ready.
    if (!token) return null

    return (
      <section
        aria-labelledby="offline-reply-title"
        className={cn(
          'relative flex flex-col items-center gap-5 overflow-hidden rounded-[32px] bg-brand-lime p-5 text-center text-brand-ink sm:p-6 md:p-7',
          className,
        )}
      >
        <SquiggleCardBg tone="cobalt" variant="single-loop" opacity={0.2} placement="bottom-right" />

        <div className="relative flex flex-col items-center gap-2">
          <OrbBadge size="md">2</OrbBadge>
          <h2 id="offline-reply-title" className="type-h2 max-w-[22ch]">
            {OFFLINE_GUEST_REPLY_TITLE}
          </h2>
          <p className="max-w-[34ch] text-sm font-semibold text-brand-ink/75">
            {OFFLINE_GUEST_REPLY_BODY}
          </p>
        </div>

        {/*
          Measured token lengths across the offline flow: 231 characters with
          zero candidates, 252 to 264 for the live invite and reply, up to 353
          with four candidates, and 405 at the eight candidate cap. The reply
          card in practice lands between 250 and 350 characters. At level L
          that span is 57 to 69 modules, so 232px holds a module pitch of
          4.07px down to 3.36px. Three pixels per module is the floor for a
          laptop camera reading a phone screen at arm's length, which is why
          232 stays. The svg is width bound and shrinks on very narrow screens
          instead of overflowing.
        */}
        <div className="relative mx-auto w-full max-w-[256px] rounded-[24px] bg-brand-surface p-3 shadow-soft">
          <QRCodeSVG
            value={token}
            size={232}
            level="L"
            marginSize={0}
            bgColor="transparent"
            fgColor="currentColor"
            title="Scan this reply code with your other screen"
            className="h-auto w-full text-brand-ink"
          />
        </div>

        <div className="relative w-full">
          <NestedPillButton
            variant="cobalt-on-lime"
            size="md"
            icon={copied ? Check : Copy}
            aria-label={copied ? 'Reply code copied' : 'Copy the reply code'}
            onClick={() => {
              void handleCopy()
            }}
            className="w-full"
          >
            {OFFLINE_COPY_REPLY_CTA}
          </NestedPillButton>
        </div>

        <p aria-live="polite" className="sr-only">
          {copied ? 'Reply code copied. Ready to paste.' : ''}
        </p>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="offline-host-title"
      className={cn(
        'relative overflow-hidden rounded-[24px] bg-brand-surface p-4 text-brand-ink shadow-soft',
        className,
      )}
    >
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-lime px-3 py-1 text-[0.66rem] font-bold uppercase leading-tight tracking-[0.08em] text-brand-ink">
        <Wifi size={13} strokeWidth={2} aria-hidden="true" />
        {OFFLINE_BADGE_LABEL}
      </span>

      <h3 id="offline-host-title" className="type-h3 mt-2.5">
        {OFFLINE_HOST_STEP_TITLE}
      </h3>
      <p className="mt-1.5 text-sm font-semibold text-brand-ink/75">{OFFLINE_HOST_STEP_BODY}</p>

      <div className="mt-3.5 flex flex-col gap-2">
        <NestedPillButton
          variant="lime-on-cobalt"
          size="md"
          icon={ScanLine}
          aria-label={OFFLINE_SCAN_REPLY_CTA}
          onClick={onOpenReplyScanner}
          className="w-full"
        >
          {OFFLINE_SCAN_REPLY_CTA}
        </NestedPillButton>

        <button
          type="button"
          onClick={() => {
            void handleCopy()
          }}
          disabled={!token}
          aria-label={copied ? 'Offline code copied' : 'Copy the offline code'}
          className={cn(
            'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
            copied
              ? 'bg-brand-ink text-brand-lime'
              : 'bg-brand-stone text-brand-ink hover:bg-brand-lime-tint',
          )}
        >
          {copied ? (
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={16} strokeWidth={2} aria-hidden="true" />
          )}
          <span>{OFFLINE_COPY_INVITE_CTA}</span>
        </button>
      </div>

      {/*
        Camera-free path for the second half of the handshake. A desktop with no
        webcam can paste the reply code the other screen shows, so the pairing
        never dead ends at the camera modal.
      */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleAcceptReplyCode()
        }}
        noValidate
        aria-busy={accepting}
        className="mt-3.5 rounded-[20px] border border-brand-line bg-brand-stone/70 p-3"
      >
        <label
          htmlFor={pasteId}
          className="block text-[0.66rem] font-bold uppercase leading-tight tracking-[0.08em] text-brand-ink-muted"
        >
          {OFFLINE_PASTE_LABEL}
        </label>

        <input
          id={pasteId}
          name="offlineReplyCode"
          type="text"
          value={pasteValue}
          onChange={(event) => setPasteValue(event.target.value)}
          placeholder={OFFLINE_PASTE_PLACEHOLDER}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          className="mt-2 min-h-[44px] w-full min-w-0 max-w-full rounded-full border border-brand-line bg-brand-surface px-4 text-base font-semibold text-brand-ink outline-none transition-shadow placeholder:text-brand-ink-muted focus-visible:ring-2 focus-visible:ring-brand-cobalt"
        />

        <NestedPillButton
          type="submit"
          variant="ink"
          size="sm"
          icon={ClipboardPaste}
          aria-label={OFFLINE_PASTE_CTA}
          disabled={!onAcceptReplyCode || pasteValue.trim().length === 0 || accepting}
          className="mt-2 w-full"
        >
          {OFFLINE_PASTE_CTA}
        </NestedPillButton>
      </form>

      <p aria-live="polite" className="sr-only">
        {copied ? 'Offline code copied. Send it to your other screen.' : ''}
      </p>
    </section>
  )
}
