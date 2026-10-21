import { useId } from 'react'
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
}: FeedbackCardProps) {
  const style = TONE_STYLE[tone]
  const Icon = icon ?? style.defaultIcon
  const titleId = `feedback-title-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const Heading = headingLevel

  return (
    <section
      aria-labelledby={titleId}
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
    </section>
  )
}
