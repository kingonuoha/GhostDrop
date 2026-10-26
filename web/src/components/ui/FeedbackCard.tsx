import { useEffect, useId, useRef, useState } from 'react'
import { CheckCircle2, Info, TriangleAlert, X, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NestedPillButton } from '../brand/NestedPillButton'
import type { NestedPillVariant } from '../brand/NestedPillButton'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'
import type { SquiggleTone } from '../brand/SquiggleCardBg'
import { SquiggleLine } from '../brand/SquiggleLine'

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info'

type ToneStyle = {
  card: string
  badge: string
  action: NestedPillVariant
  squiggleTone: SquiggleTone
  defaultIcon: LucideIcon
}

const TONE_STYLE: Record<FeedbackTone, ToneStyle> = {
  success: {
    card: 'bg-brand-lime text-brand-ink',
    badge: 'bg-brand-cobalt text-brand-lime',
    action: 'cobalt-on-lime',
    squiggleTone: 'cobalt',
    defaultIcon: Zap,
  },
  error: {
    card: 'bg-brand-error-tint text-brand-ink border border-brand-error/50',
    badge: 'bg-brand-error text-white',
    action: 'lime-on-cobalt',
    squiggleTone: 'ink',
    defaultIcon: TriangleAlert,
  },
  warning: {
    card: 'bg-brand-warning text-brand-ink',
    badge: 'bg-brand-ink text-brand-lime',
    action: 'lime-on-cobalt',
    squiggleTone: 'forest',
    defaultIcon: Info,
  },
  info: {
    card: 'bg-brand-surface text-brand-ink border border-brand-line',
    badge: 'bg-brand-cobalt text-brand-lime',
    action: 'lime-on-cobalt',
    squiggleTone: 'cobalt',
    defaultIcon: CheckCircle2,
  },
}

export type FeedbackCardProps = {
  tone?: FeedbackTone
  icon?: LucideIcon
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
  dismissLabel?: string
  /**
   * Heading level for the card title. Cards that sit directly under a page H1
   * use "h2"; cards inside a titled section use the default "h3" so heading
   * order never skips a level.
   */
  headingLevel?: 'h2' | 'h3'
  className?: string
  /**
   * Milliseconds before the card closes itself, with a drain bar along the
   * bottom edge. Only used when `onDismiss` is present, so inline cards (empty
   * feed, room not found) stay put forever.
   */
  autoDismissMs?: number
}

export function FeedbackCard({
  tone = 'info',
  icon,
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
  dismissLabel = 'Dismiss message',
  headingLevel = 'h3',
  className,
  autoDismissMs,
}: FeedbackCardProps) {
  const style = TONE_STYLE[tone]
  const Icon = icon ?? style.defaultIcon
  const titleId = `feedback-title-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const Heading = headingLevel
  const [remainingFraction, setRemainingFraction] = useState(1)

  /**
   * One remaining-time value drives both the dismissal and the drain bar, so a
   * hover or a keyboard focus pauses the countdown exactly: the bar cannot keep
   * moving while the clock is stopped.
   *
   * Pointer and focus are tracked as two independent flags. Clicking a control
   * inside the toast focuses it and then the pointer leaves, so one shared flag
   * would let the leave event resume a clock that is still being read, and a
   * stuck toast is the result. The clock itself only pauses once while either
   * flag is set, and only resumes once when the last one clears.
   */
  const deadlineRef = useRef(0)
  const remainingRef = useRef(0)
  const pointerPausedRef = useRef(false)
  const focusPausedRef = useRef(false)
  const pausedRef = useRef(false)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  const drainVisible =
    autoDismissMs !== undefined && autoDismissMs > 0 && onDismiss !== undefined

  useEffect(() => {
    // A changed title or body is a new message, and the countdown restarts.
    const message = `${title}\u0000${body}`
    if (message.length === 0) return
    if (autoDismissMs === undefined || autoDismissMs <= 0) {
      setRemainingFraction(1)
      return
    }
    if (!onDismissRef.current) return

    const duration = autoDismissMs
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    remainingRef.current = duration
    deadlineRef.current = Date.now() + duration
    pointerPausedRef.current = false
    focusPausedRef.current = false
    pausedRef.current = false
    setRemainingFraction(1)

    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const finish = () => {
      if (cancelled) return
      cancelled = true
      stop()
      onDismissRef.current?.()
    }

    const tick = () => {
      if (cancelled || pausedRef.current) return
      const left = Math.max(0, deadlineRef.current - Date.now())
      remainingRef.current = left
      setRemainingFraction(left / duration)
      if (left <= 0) finish()
    }

    intervalId = setInterval(tick, 100)

    return () => {
      cancelled = true
      stop()
    }
  }, [autoDismissMs, title, body])

  /**
   * Freezes the clock on the first reason to pause and restarts it on the last
   * one to clear. Repeated enters, leaves, focuses and blurs therefore never
   * move the deadline, because an unchanged state returns before any write.
   */
  const syncPauseState = () => {
    const shouldPause = pointerPausedRef.current || focusPausedRef.current
    if (shouldPause === pausedRef.current) return

    if (shouldPause) {
      pausedRef.current = true
      remainingRef.current = Math.max(0, deadlineRef.current - Date.now())
      return
    }

    pausedRef.current = false
    deadlineRef.current = Date.now() + remainingRef.current
  }

  const handlePointerEnter = () => {
    if (!drainVisible) return
    pointerPausedRef.current = true
    syncPauseState()
  }

  const handlePointerLeave = () => {
    if (!drainVisible) return
    pointerPausedRef.current = false
    syncPauseState()
  }

  const handleFocus = () => {
    if (!drainVisible) return
    focusPausedRef.current = true
    syncPauseState()
  }

  const handleBlur = () => {
    if (!drainVisible) return
    focusPausedRef.current = false
    syncPauseState()
  }

  return (
    <section
      aria-labelledby={titleId}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        'relative overflow-hidden rounded-[32px] p-6 shadow-soft',
        style.card,
        className,
      )}
    >
      <SquiggleCardBg
        variant="single-loop"
        tone={style.squiggleTone}
        opacity={0.16}
        placement="bottom-right"
      />

      <div className="relative flex items-start gap-3.5">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            style.badge,
          )}
        >
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <Heading id={titleId} className="type-h3 break-words">
            {title}
          </Heading>
          <SquiggleLine
            variant="single-loop"
            strokeWidth={30}
            className="mt-1 h-3 w-24 opacity-70"
          />
          <p className="mt-2 text-sm font-medium leading-snug opacity-80">{body}</p>
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-surface/70 text-brand-ink transition-colors hover:bg-brand-surface"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {actionLabel && onAction ? (
        <div className="relative mt-5">
          <NestedPillButton size="sm" variant={style.action} onClick={onAction}>
            {actionLabel}
          </NestedPillButton>
        </div>
      ) : null}

      {drainVisible ? (
        /*
          The bar is pinned to the bottom edge inside the card's own
          `overflow-hidden` and `rounded-[32px]` shell, so the rounded bottom
          corners clip it cleanly. The action row ends on the 24px card padding
          above the bar, so the bar never covers it.

          The fill has to read against four very different surfaces. Cobalt
          measures 4.98:1 on Acid Lime, 5.03:1 on the warning yellow and 6.39:1
          on the white info card, so it carries those three. The coral error fill
          only reaches 2.55:1 on the pale error tint, which is under the 3:1 bar
          for a non text indicator, so the error card drains in Jet Ink instead
          at 15.8:1. Colour only, no extra motion: the width is bound to the same
          remaining time value the dismissal timer uses, so a pause holds the bar
          exactly where the clock stopped.
        */
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-brand-ink/10"
        >
          <span
            className={cn(
              'block h-full origin-left',
              tone === 'error' ? 'bg-brand-ink' : 'bg-brand-cobalt',
            )}
            style={{ transform: `scaleX(${remainingFraction})` }}
          />
        </span>
      ) : null}
    </section>
  )
}
