import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { cn } from '../../lib/cn'

interface StatsPayload {
  totalTeleports?: number
  activeRooms?: number
}

interface TeleportCounterBadgeProps {
  className?: string
  /** Minimum teleport count required before the badge is displayed. Defaults to 100. */
  minThreshold?: number
}

const DEFAULT_MIN_THRESHOLD = 100

/**
 * Public Teleport Counter Badge
 *
 * Celebrates collective community milestones with locked brand craft.
 * Dynamically checks total teleports from /api/stats.
 * Renders ONLY when total teleports reach or exceed 100 (hidden otherwise).
 *
 * Styling tokens:
 * - Warm Stone canvas with subtle border
 * - Acid Lime icon circle with Zap SVG
 * - Display numerals in Laroka via type-numeral
 * - Zero em dashes, zero emojis
 */
export function TeleportCounterBadge({
  className,
  minThreshold = DEFAULT_MIN_THRESHOLD,
}: TeleportCounterBadgeProps) {
  const [totalCount, setTotalCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats')
        if (!response.ok) return
        const data = (await response.json()) as StatsPayload
        if (
          !cancelled &&
          typeof data.totalTeleports === 'number' &&
          Number.isFinite(data.totalTeleports)
        ) {
          setTotalCount(data.totalTeleports)
        }
      } catch {
        // Silently catch network failures, badge remains hidden
      }
    }

    void loadStats()
    return () => {
      cancelled = true
    }
  }, [])

  // Hide the badge completely until dynamic count reaches or exceeds minThreshold (100)
  if (totalCount === null || totalCount < minThreshold) {
    return null
  }

  // Format count with plus sign, e.g. 100+, 250+
  const formattedCount = totalCount.toLocaleString('en-US')

  return (
    <div
      role="status"
      aria-label={`Over ${formattedCount} files teleported safely with zero accounts or tracking`}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full border border-brand-line bg-brand-surface/90 px-3.5 py-1.5 text-xs font-semibold text-brand-ink shadow-xs backdrop-blur-xs transition-colors hover:border-brand-cobalt/40',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-ink transition-transform duration-200 group-hover:scale-110"
      >
        <Zap size={12} strokeWidth={2.5} aria-hidden="true" />
      </span>

      <span className="inline-flex items-center gap-1">
        <span>Over</span>
        <span className="type-numeral text-sm font-bold text-brand-ink">
          {formattedCount}+
        </span>
        <span className="text-brand-ink-muted">files teleported safely</span>
      </span>
    </div>
  )
}
