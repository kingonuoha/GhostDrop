import { Sparkles } from 'lucide-react'
import { buildFeedback } from '../../lib/copyDeck'
import type { TtlPreset } from '../../types/protocol'
import { FeedbackCard } from '../ui/FeedbackCard'

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
 */
export function PoofNotice({ preset, itemName, onDismiss, className }: PoofNoticeProps) {
  const copy = buildFeedback('INFO_TTL_EXPIRED', {
    preset,
    ...(itemName ? { itemName } : {}),
  })

  return (
    <div role="status" aria-live="polite" className={className}>
      <FeedbackCard
        tone="info"
        icon={Sparkles}
        title={copy.title}
        body={copy.body}
        actionLabel={copy.actionLabel}
        onAction={onDismiss}
        onDismiss={onDismiss}
        className="poof-notice-enter"
      />
    </div>
  )
}
