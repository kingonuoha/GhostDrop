import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, ChevronDown, ClipboardPaste, Copy, Mic, MicOff, Share2, Volume2, Wifi } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { RoomFeedbackKey } from '../../lib/copyDeck'
import {
  OFFLINE_BADGE_LABEL,
  OFFLINE_COPY_INVITE_SHORT_CTA,
  OFFLINE_FEWER_WAYS_CTA,
  OFFLINE_GUEST_REPLY_BODY,
  OFFLINE_GUEST_REPLY_TITLE,
  OFFLINE_HOST_STEP_BODY,
  OFFLINE_HOST_STEP_TITLE,
  OFFLINE_MORE_WAYS_CTA,
  OFFLINE_PASTE_CTA,
  OFFLINE_PASTE_LABEL,
  OFFLINE_PASTE_ROW_PLACEHOLDER,
  OFFLINE_SCAN_REPLY_CTA,
  OFFLINE_SHARE_CODE_CTA,
  OFFLINE_SHARE_INVITE_CTA,
  OFFLINE_SHARE_NOTE,
  OFFLINE_SOUND_LISTENING_LABEL,
  OFFLINE_SOUND_LISTEN_CTA,
  OFFLINE_SOUND_NOTE,
  OFFLINE_SOUND_SENDING_LABEL,
  OFFLINE_SOUND_SEND_CTA,
  OFFLINE_SOUND_SENT_LABEL,
  OFFLINE_SOUND_STOP_CTA,
} from '../../lib/copyDeck'
import { formatOfflineCodeForHumans } from '../../lib/p2p'
import {
  isAcousticModemSupported,
  listenForAcousticToken,
  playAcousticToken,
} from '../../lib/p2p/acousticModem'
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

/**
 * Space grouped form for reading aloud or pasting into a chat. A token that the
 * codec refuses to group is handed back untouched, so a copy never dead ends.
 */
function humanReadable(token: string): string {
  try {
    return formatOfflineCodeForHumans(token)
  } catch {
    return token
  }
}

export interface OfflineLinkCardProps {
  mode: 'host-waiting' | 'guest-reply'
  /** For host-waiting: the Host's offline invite token (GD2 or GD1). For guest-reply: the Guest's reply token. */
  token: string | null
  /** Triggered when the Host clicks 'Scan or Paste Reply' (opens QrScannerModal in reply mode). */
  onOpenReplyScanner?: () => void
  /**
   * Triggered when the Host submits a pasted or heard reply code. Resolves true
   * when the handshake accepted the code. This is the path for a screen with no
   * camera.
   */
  onAcceptReplyCode?: (raw: string) => boolean | Promise<boolean>
  /** Triggered when copy succeeds or fails so the page toast announces it. */
  onCopyFeedback?: (key: RoomFeedbackKey) => void
  /**
   * Pairing link for the invite share sheet. The host passes its
   * `offlineJoinUrl`, so a shared invite arrives as a tappable link. Without it
   * the human readable token is shared instead.
   */
  inviteUrl?: string
  /**
   * `panel` is the standalone card used on the workspace and mobile pages.
   * `inline` drops the badge, heading, body and outer padding, keeping only the
   * reply row, the paste pill and the copy action for use directly under a
   * pairing QR.
   */
  variant?: 'panel' | 'inline'
  className?: string
}

const COPIED_HOLD_MS = 2200
/** Long enough to read the confirmation, short enough to allow a quick retry. */
const SOUND_SENT_HOLD_MS = 4000
/** A listener that never hears anything gives the microphone back on its own. */
const LISTEN_TIMEOUT_MS = 20000

/** Pill label for the guest copy path. Device neutral, two words, fits 360. */
const COPY_CODE_LABEL = 'Copy Code'
/** Share sheet title, so a shared reply arrives with a recognisable name. */
const SHARE_TITLE = 'GhostDrop reply code'
/** Invite share title, matching the pairing copy. */
const SHARE_INVITE_TITLE = 'GhostDrop invite'

type SoundState = 'idle' | 'sending' | 'sent'

/**
 * Offline direct pairing card.
 * Source: docs/02-brand-persona-and-copy.md section 2.2, decisions.md D-016 item 2,
 * docs/tasks/step-15-v017-offline-codec-and-acoustic/brief.md section 5.
 *
 * Guest side leads with the reply QR its other screen reads. Host side is a
 * compact stack of rows that fits inside the pairing card and carries no QR of
 * its own, because the host QR already lives there. Sound and the operating
 * system share sheet sit behind a closed `More ways to link` disclosure, so the
 * camera and paste paths are what a reader meets first.
 */
export function OfflineLinkCard({
  mode,
  token,
  onOpenReplyScanner,
  onAcceptReplyCode,
  onCopyFeedback,
  inviteUrl,
  variant = 'panel',
  className,
}: OfflineLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const [soundState, setSoundState] = useState<SoundState>('idle')
  const [listening, setListening] = useState(false)
  const [pasteValue, setPasteValue] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const pasteId = useId()
  const moreId = `offline-more-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const mountedRef = useRef(true)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playAbortRef = useRef<AbortController | null>(null)
  const listenAbortRef = useRef<AbortController | null>(null)
  const listenStopRef = useRef<(() => void) | null>(null)
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Read once per mount: the browser is not going to grow a microphone. */
  const soundSupported = useMemo(() => isAcousticModemSupported(), [])
  /**
   * Playback needs a secure context, and the host only offers its microphone
   * where capture works. Off an https origin or localhost the guest therefore
   * keeps the QR and the copy pills and never mentions sound, because a burst
   * nobody can hear would promise a link that never happens.
   */
  const canPlaySound = typeof window !== 'undefined' && window.isSecureContext === true
  /** True where the operating system can take over a plain text share. */
  const shareSupported =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  /**
   * Releases the microphone and the pending 20 second timer. Every exit path
   * runs through here: a token, a denial, a silent room, a second tap, and
   * unmount. The stop function the modem resolves with is idempotent, so a
   * second call after an internal stop is harmless.
   */
  const stopListening = useCallback(() => {
    if (listenTimerRef.current !== null) {
      clearTimeout(listenTimerRef.current)
      listenTimerRef.current = null
    }
    const controller = listenAbortRef.current
    listenAbortRef.current = null
    controller?.abort()
    const stop = listenStopRef.current
    listenStopRef.current = null
    stop?.()
    setListening(false)
  }, [])

  // Unmount is the last exit path: the microphone, the burst, and every timer
  // are released here so nothing keeps a device handle or a pending callback.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopListening()

      playAbortRef.current?.abort()
      playAbortRef.current = null

      if (soundTimerRef.current !== null) {
        clearTimeout(soundTimerRef.current)
        soundTimerRef.current = null
      }
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = null
      }
    }
  }, [stopListening])

  // A fresh token means a fresh handshake, so the tick, the sound state and the
  // disclosure all reset with it. A panel that closes on its own must not leave
  // the microphone open behind it.
  useEffect(() => {
    setCopied(false)
    setSoundState('idle')
    setMoreOpen(false)
    stopListening()
    if (copiedTimerRef.current !== null) {
      clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = null
    }
    if (soundTimerRef.current !== null) {
      clearTimeout(soundTimerRef.current)
      soundTimerRef.current = null
    }
  }, [stopListening, token])

  const handleCopy = useCallback(async () => {
    if (!token) {
      onCopyFeedback?.('ERR_OFFLINE_CODE_INVALID')
      return
    }

    const ok = await copyOfflineCode(humanReadable(token))

    if (!ok) {
      // A blocked clipboard still gets a joyful way out, never a silent tap.
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
      setCopied(false)
      onCopyFeedback?.('ERR_OFFLINE_CODE_INVALID')
      return
    }

    setCopied(true)
    if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), COPIED_HOLD_MS)
    onCopyFeedback?.('SUCCESS_COPIED')
  }, [token, onCopyFeedback])

  /** One share sheet, plain text only. A cancelled sheet is not an error. */
  const handleShare = useCallback(async () => {
    if (!token) return
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return

    try {
      await navigator.share({ title: SHARE_TITLE, text: humanReadable(token) })
    } catch {
      // The copy pill above stays one tap away, so nothing is lost.
    }
  }, [token])

  /**
   * Hands the invite to the operating system share sheet, so a phone can move it
   * to another screen with AirDrop, Quick Share or Nearby Share, all of which
   * work with no internet. The link is preferred because it opens itself on the
   * other screen; the readable code is the fallback.
   */
  const handleShareInvite = useCallback(async () => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return
    const text = inviteUrl ?? (token ? humanReadable(token) : '')
    if (!text) return

    try {
      await navigator.share({ title: SHARE_INVITE_TITLE, text })
    } catch {
      // A closed sheet leaves the copy action on screen, so nothing is lost.
    }
  }, [inviteUrl, token])

  /**
   * Opens and closes the secondary ways to link. Closing while the microphone is
   * open releases it at once, with no error. A burst already playing is left
   * alone: its sent state lives in the live region outside this panel.
   */
  const toggleMore = useCallback(() => {
    const next = !moreOpen
    setMoreOpen(next)
    if (!next) stopListening()
  }, [moreOpen, stopListening])

  /**
   * Plays the reply as one sound burst. The QR and the copy pills keep their
   * place on screen for the whole burst, so a muted speaker is never a dead end.
   */
  const handleSendSound = useCallback(async () => {
    if (!token || soundState === 'sending') return

    if (soundTimerRef.current !== null) {
      clearTimeout(soundTimerRef.current)
      soundTimerRef.current = null
    }

    const controller = new AbortController()
    playAbortRef.current = controller
    setSoundState('sending')

    try {
      await playAcousticToken(token, { signal: controller.signal })
      if (!mountedRef.current) return
      setSoundState('sent')
      soundTimerRef.current = setTimeout(() => {
        soundTimerRef.current = null
        if (mountedRef.current) setSoundState('idle')
      }, SOUND_SENT_HOLD_MS)
    } catch {
      // A refused or aborted burst returns to idle with the copy path intact.
      if (mountedRef.current) setSoundState('idle')
    } finally {
      if (playAbortRef.current === controller) playAbortRef.current = null
    }
  }, [soundState, token])

  /**
   * Handles one reply code for the Host, whether it arrived by paste or by sound.
   * A rejected code keeps the typed text so a mistyped character is a quick fix,
   * and the hook already raises the playful invalid code toast, so this never
   * prints a raw error string.
   */
  const acceptReplyCode = useCallback(
    async (raw: string): Promise<boolean> => {
      if (!raw || !onAcceptReplyCode) return false
      setAccepting(true)
      try {
        return await onAcceptReplyCode(raw)
      } catch {
        return false
      } finally {
        if (mountedRef.current) setAccepting(false)
      }
    },
    [onAcceptReplyCode],
  )

  /**
   * Opens the microphone and hands the first decoded token to the handshake.
   * The modem owns the audio graph and stops itself before `onToken` fires, so
   * this only has to release the timer and the UI state.
   */
  const startListening = useCallback(() => {
    if (listenAbortRef.current !== null) return

    const controller = new AbortController()
    listenAbortRef.current = controller
    setListening(true)

    void listenForAcousticToken({
      signal: controller.signal,
      onToken: (found) => {
        stopListening()
        if (!mountedRef.current) return
        void acceptReplyCode(found)
      },
      onError: (error) => {
        // A prompt the user cancelled, or a stop they tapped, is not a failure.
        // The controller is aborted before the modem can report, so this stays
        // silent instead of raising a mic message for a request nobody made.
        if (controller.signal.aborted) return

        stopListening()
        if (!mountedRef.current) return
        if (error.message === 'mic-denied' || error.message === 'mic-unavailable') {
          onCopyFeedback?.('ERR_MIC_DENIED')
        }
      },
    })
      .then((stop) => {
        if (controller.signal.aborted || !mountedRef.current) {
          stop()
          return
        }
        listenStopRef.current = stop
        // The 20 second clock starts once the microphone is actually live, so
        // time spent on a permission prompt never eats the listening window.
        listenTimerRef.current = setTimeout(() => {
          listenTimerRef.current = null
          stopListening()
        }, LISTEN_TIMEOUT_MS)
      })
      .catch(() => {
        stopListening()
      })
  }, [acceptReplyCode, onCopyFeedback, stopListening])

  const handleSubmitPaste = useCallback(async () => {
    const raw = pasteValue.trim()
    if (!raw || accepting || !onAcceptReplyCode) return

    const accepted = await acceptReplyCode(raw)
    if (accepted && mountedRef.current) setPasteValue('')
  }, [acceptReplyCode, accepting, onAcceptReplyCode, pasteValue])

  if (mode === 'guest-reply') {
    // Nothing to show before the reply token exists, and the page only mounts
    // this card once the reply is ready.
    if (!token) return null

    const soundLabel =
      soundState === 'sending'
        ? OFFLINE_SOUND_SENDING_LABEL
        : soundState === 'sent'
          ? OFFLINE_SOUND_SENT_LABEL
          : OFFLINE_SOUND_SEND_CTA

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
          Measured token lengths across the offline flow: a GD2 reply lands near
          110 characters, the legacy GD1 paths between 250 and 350. At level L
          that span is 45 to 69 modules, so 248px holds a module pitch of 5.5px
          down to 3.59px. Three pixels per module is the floor for a laptop
          camera reading a phone screen at arm's length. A two module quiet zone
          keeps the finder patterns clear of the card edge, and the svg is width
          bound so it shrinks on very narrow screens instead of overflowing.
        */}
        <div className="relative mx-auto w-full max-w-[272px] rounded-[24px] bg-brand-surface p-3 shadow-soft">
          <QRCodeSVG
            value={token}
            size={248}
            level="L"
            marginSize={2}
            bgColor="transparent"
            fgColor="currentColor"
            title="Scan this reply code with your other screen"
            className="h-auto w-full text-brand-ink"
          />
        </div>

        {/* Two equal pills at 44px. At 360 the guest card inner width is 288,
            so each pill gets 140 and neither label can wrap or overflow. */}
        <div className="relative flex w-full flex-col items-center gap-1.5">
          <div className="flex w-full items-stretch gap-2">
            <button
              type="button"
              onClick={() => {
                void handleCopy()
              }}
              aria-label={copied ? 'Reply code copied' : 'Copy the reply code'}
              className={cn(
                'inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold transition-colors duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2',
                copied
                  ? 'bg-brand-ink text-brand-lime'
                  : 'bg-brand-surface text-brand-ink hover:bg-brand-stone',
              )}
            >
              {copied ? (
                <Check size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              ) : (
                <Copy size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              )}
              <span className="truncate">{COPY_CODE_LABEL}</span>
            </button>

            {shareSupported ? (
              <button
                type="button"
                onClick={() => {
                  void handleShare()
                }}
                aria-label="Share the reply code"
                className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-brand-surface px-3 text-sm font-bold text-brand-ink transition-colors duration-200 hover:bg-brand-stone active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2"
              >
                <Share2 size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{OFFLINE_SHARE_CODE_CTA}</span>
              </button>
            ) : null}
          </div>

          {/* Kept outside the disclosure: the reader must learn that only the
              code travels before they tap anything. */}
          {shareSupported ? (
            <p className="text-[11px] font-semibold leading-snug text-brand-ink/60">
              {OFFLINE_SHARE_NOTE}
            </p>
          ) : null}
        </div>

        {/*
          Sound is demoted behind a quiet text disclosure, per
          plans/offline-one-scan-pairing-plan.md section 9. The QR leads again,
          and a phone with no camera on the other side can still find the burst.
        */}
        {canPlaySound ? (
          <div className="relative w-full text-center">
            <button
              type="button"
              onClick={toggleMore}
              aria-expanded={moreOpen}
              aria-controls={moreId}
              className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full px-2 text-xs font-bold text-brand-ink/70 transition-colors duration-200 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2"
            >
              <span>{moreOpen ? OFFLINE_FEWER_WAYS_CTA : OFFLINE_MORE_WAYS_CTA}</span>
              <ChevronDown
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                className={cn('transition-transform duration-200', moreOpen && 'rotate-180')}
              />
            </button>

            <div id={moreId}>
              {moreOpen ? (
                <div className="mt-1 flex flex-col items-center gap-2">
                  <NestedPillButton
                    variant="lime-on-cobalt"
                    size="md"
                    icon={Volume2}
                    onClick={() => {
                      void handleSendSound()
                    }}
                    aria-busy={soundState === 'sending'}
                    aria-label={soundLabel}
                    className="w-full"
                  >
                    {soundLabel}
                  </NestedPillButton>
                  <p className="text-[11px] font-semibold leading-snug text-brand-ink/60">
                    {OFFLINE_SOUND_NOTE}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <p aria-live="polite" className="sr-only">
          {copied ? 'Reply code copied. Ready to paste.' : ''}
          {soundState === 'sent' ? OFFLINE_SOUND_SENT_LABEL : ''}
        </p>
      </section>
    )
  }

  const scanButton = (
    <button
      type="button"
      onClick={onOpenReplyScanner}
      aria-label={OFFLINE_SCAN_REPLY_CTA}
      className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-full bg-brand-cobalt px-4 text-sm font-bold leading-tight text-white transition-colors duration-200 hover:bg-brand-cobalt-deep active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
    >
      <span className="truncate">{OFFLINE_SCAN_REPLY_CTA}</span>
    </button>
  )

  /**
   * The sound toggle is a shortcut past the camera, so it only appears where the
   * browser can both listen and play. On a plain HTTP origin it stays hidden and
   * the scan and paste paths carry the whole handshake.
   */
  const listenButton = soundSupported ? (
    <button
      type="button"
      onClick={() => {
        if (listening) {
          stopListening()
          return
        }
        startListening()
      }}
      aria-pressed={listening}
      aria-busy={listening}
      aria-label={listening ? OFFLINE_SOUND_STOP_CTA : OFFLINE_SOUND_LISTEN_CTA}
      className={cn(
        'inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold leading-tight transition-colors duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2',
        listening
          ? 'bg-brand-ink text-brand-lime'
          : 'bg-brand-surface text-brand-ink hover:bg-brand-stone',
      )}
    >
      {listening ? (
        <MicOff size={15} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      ) : (
        <Mic size={15} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      )}
      <span className="truncate">
        {listening ? OFFLINE_SOUND_STOP_CTA : OFFLINE_SOUND_LISTEN_CTA}
      </span>
    </button>
  ) : null

  /*
    One inline pill for the camera-free path. The label is hidden for screen
    readers only, so the row stays 44px tall instead of carrying a full form
    stack under the pairing QR.
  */
  const pasteRow = (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmitPaste()
      }}
      noValidate
      aria-busy={accepting}
      className="flex w-full items-center gap-1 rounded-full border border-brand-line bg-brand-stone py-1 pl-4 pr-1 transition-shadow focus-within:ring-2 focus-within:ring-brand-cobalt"
    >
      <label htmlFor={pasteId} className="sr-only">
        {OFFLINE_PASTE_LABEL}
      </label>

      <input
        id={pasteId}
        name="offlineReplyCode"
        type="text"
        value={pasteValue}
        onChange={(event) => setPasteValue(event.target.value)}
        placeholder={OFFLINE_PASTE_ROW_PLACEHOLDER}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        className="min-h-[44px] w-full min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-brand-ink outline-none placeholder:text-brand-ink-muted"
      />

      <button
        type="submit"
        disabled={!onAcceptReplyCode || pasteValue.trim().length === 0 || accepting}
        aria-label={OFFLINE_PASTE_CTA}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-cobalt text-white transition-colors duration-200 hover:bg-brand-cobalt-deep disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
      >
        <ClipboardPaste size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </form>
  )

  const copyInviteAction = (
    <button
      type="button"
      onClick={() => {
        void handleCopy()
      }}
      disabled={!token}
      aria-label={copied ? 'Invite code copied' : 'Copy the invite code'}
      className={cn(
        'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        copied ? 'text-brand-forest' : 'text-brand-ink/70 hover:bg-brand-ink/5 hover:text-brand-ink',
      )}
    >
      {copied ? (
        <Check size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      ) : (
        <Copy size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      )}
      <span className="truncate">{copied ? 'Copied' : OFFLINE_COPY_INVITE_SHORT_CTA}</span>
    </button>
  )

  const shareInviteButton = shareSupported ? (
    <button
      type="button"
      onClick={() => {
        void handleShareInvite()
      }}
      disabled={!token && !inviteUrl}
      aria-label={OFFLINE_SHARE_INVITE_CTA}
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-brand-surface px-4 text-sm font-bold text-brand-ink transition-colors duration-200 hover:bg-brand-stone active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2"
    >
      <Share2 size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{OFFLINE_SHARE_INVITE_CTA}</span>
    </button>
  ) : null

  const hasMoreWays = soundSupported || shareSupported

  const moreWaysToggle = hasMoreWays ? (
    <button
      type="button"
      onClick={toggleMore}
      aria-expanded={moreOpen}
      aria-controls={moreId}
      className="inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold text-brand-ink/70 transition-colors duration-200 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt focus-visible:ring-offset-2"
    >
      <span className="truncate">
        {moreOpen ? OFFLINE_FEWER_WAYS_CTA : OFFLINE_MORE_WAYS_CTA}
      </span>
      <ChevronDown
        size={14}
        strokeWidth={2}
        aria-hidden="true"
        className={cn('transition-transform duration-200', moreOpen && 'rotate-180')}
      />
    </button>
  ) : null

  /*
    Secondary ways to link, closed by default. Sound and the operating system
    share sheet are both demoted here, so the visible card is the scan, the paste
    row and the copy action. Source: plans/offline-one-scan-pairing-plan.md
    section 9 recommendation 2 and 4.
  */
  const moreWaysPanel = hasMoreWays ? (
    <div id={moreId}>
      {moreOpen ? (
        <div className="mt-1 flex flex-col gap-2.5 rounded-[18px] bg-brand-ink/5 p-3">
          {soundSupported ? (
            <div className="flex flex-col items-stretch gap-1">
              {listenButton}
              <p
                aria-live="polite"
                className={cn(
                  'text-[11px] font-semibold leading-snug text-brand-ink',
                  !listening && 'sr-only',
                )}
              >
                {listening ? OFFLINE_SOUND_LISTENING_LABEL : ''}
              </p>
              <p className="text-[11px] font-semibold leading-snug text-brand-ink/60">
                {OFFLINE_SOUND_NOTE}
              </p>
            </div>
          ) : null}

          {shareInviteButton ? (
            <div className="flex flex-col items-stretch gap-1">
              {shareInviteButton}
              <p className="text-[11px] font-semibold leading-snug text-brand-ink/60">
                {OFFLINE_SHARE_NOTE}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null

  if (variant === 'inline') {
    // Sits directly under the pairing QR, so it adds no card chrome and never
    // repeats the heading or badge of the card above it. The copy action and the
    // disclosure share one 44px row, so the closed card keeps its old height.
    return (
      <div className={cn('relative w-full text-left text-brand-ink', className)}>
        <div className="flex flex-wrap items-stretch gap-2">{scanButton}</div>

        <div className="mt-2">{pasteRow}</div>

        <div className="mt-1 flex flex-nowrap items-center justify-center gap-x-2">
          {copyInviteAction}
          {moreWaysToggle}
        </div>

        {moreWaysPanel}
      </div>
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

      <div className="mt-3.5 flex flex-wrap items-stretch gap-2">{scanButton}</div>

      <div className="mt-2">{pasteRow}</div>

      <div className="mt-1 flex flex-nowrap items-center justify-center gap-x-2">
        {copyInviteAction}
        {moreWaysToggle}
      </div>

      {moreWaysPanel}

      <p aria-live="polite" className="sr-only">
        {copied ? 'Offline code copied. Send it to your other screen.' : ''}
      </p>
    </section>
  )
}
