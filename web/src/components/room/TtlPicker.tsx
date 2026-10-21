import { Clock, Flame, Power, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { TtlPreset } from '../../types/protocol'

type TtlOption = {
  preset: TtlPreset
  label: string
  icon: LucideIcon
}

/**
 * Plain English presets from docs/02-brand-persona-and-copy.md section 2.
 * The word TTL never reaches the screen.
 */
export const TTL_OPTIONS: readonly TtlOption[] = [
  { preset: 'BURN_ON_COPY', label: 'Delete after 1st copy', icon: Flame },
  { preset: '15m', label: '15 mins', icon: Timer },
  { preset: '50m', label: '50 mins', icon: Clock },
  { preset: 'TAB_CLOSE', label: 'When I close this page', icon: Power },
]

type TtlPickerProps = {
  value: TtlPreset
  onChange: (preset: TtlPreset) => void
  className?: string
  /** Accessible group name. Plain English only. */
  label?: string
}

export function TtlPicker({
  value,
  onChange,
  className,
  label = 'When should it delete itself',
}: TtlPickerProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'grid grid-cols-2 gap-1.5 rounded-[24px] border border-brand-line bg-brand-stone p-1.5 sm:grid-cols-4 sm:rounded-full',
        className,
      )}
    >
      {TTL_OPTIONS.map((option) => {
        const isActive = option.preset === value
        const Icon = option.icon

        return (
          <button
            key={option.preset}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.preset)}
            className={cn(
              'flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2.5 text-center text-[0.75rem] font-semibold leading-tight transition-colors duration-200 sm:min-h-[48px] sm:flex-row sm:gap-2 sm:rounded-full sm:px-3 sm:text-sm',
              isActive
                ? 'bg-brand-lime text-brand-ink shadow-soft'
                : 'text-brand-ink-muted hover:bg-brand-surface hover:text-brand-ink',
            )}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 break-words">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
