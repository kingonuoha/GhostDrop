import { Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn'
import { buildFeedback } from '../../lib/copyDeck'
import { TOAST_AUTO_DISMISS_MS } from '../../lib/constants'
import type { TtlPreset } from '../../types/protocol'
import { FeedbackCard } from '../ui/FeedbackCard'
import { MotionPulse } from '../rive/MotionPulse'
import { RiveCanvas } from '../rive/RiveCanvas'

type PoofNoticeProps = {
  /** Preset that expired, so the body speaks plain English minutes. */
  preset: TtlPreset
  /** Name of the drop that vanished, when known. */
  itemName?: string
  onDismiss: () => void
  className?: string
}

/**
 * Joyful TTL expiry card.
 * Copy: docs/02-brand-persona-and-copy.md INFO_TTL_EXPIRED.
 *
 * The dissolving chip in the corner is the Rive `Poof` artboard. Its `vanish`
 * state ends at opacity 0 and stays there, so the canvas is keyed to the notice
 * subject: a fresh notice gets a fresh instance that plays in full rather than a
 * second one that would start already invisible. The cleanup itself is
 * untouched: the TTL janitor still calls `URL.revokeObjectURL` on its own path.
 */
export function PoofNotice({ preset, itemName, onDismiss, className }: PoofNoticeProps) {
  const copy = buildFeedback('INFO_TTL_EXPIRED', {
    preset,
    ...(itemName ? { itemName } : {}),
  })

  return (
    <div role="status" aria-live="polite" className={cn('relative', className)}>
      <FeedbackCard
        tone="info"
        icon={Sparkles}
        title={copy.title}
        body={copy.body}
        actionLabel={copy.actionLabel}
        onAction={onDismiss}
        onDismiss={onDismiss}
        autoDismissMs={TOAST_AUTO_DISMISS_MS}
        className="poof-notice-enter"
      />

      <RiveCanvas
        key={`${preset}-${itemName ?? ''}`}
        target="poof"
        className="pointer-events-none absolute -bottom-2 -right-2 h-[84px] w-[120px]"
      >
        <MotionPulse input="vanish" pulse={1} />
      </RiveCanvas>
    </div>
  )
}
