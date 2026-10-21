import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export type OrbBadgeSize = 'sm' | 'md' | 'lg'

const SHELL_CLASS: Record<OrbBadgeSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-16 w-16',
}

const CORE_CLASS: Record<OrbBadgeSize, string> = {
  sm: 'right-0.5 bottom-0.5 h-6 w-6',
  md: 'right-1 bottom-1 h-8 w-8',
  lg: 'right-1 bottom-1 h-9 w-9',
}

const CORE_TEXT_CLASS: Record<OrbBadgeSize, string> = {
  sm: 'text-[0.7rem]',
  md: 'text-[0.95rem]',
  lg: 'text-[1.05rem]',
}

type OrbBadgeProps = {
  children?: ReactNode
  icon?: LucideIcon
  label?: string
  size?: OrbBadgeSize
  className?: string
}

export function OrbBadge({
  children,
  icon: Icon,
  label,
  size = 'md',
  className,
}: OrbBadgeProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-brand-cobalt shadow-pop-cobalt',
        SHELL_CLASS[size],
        className,
      )}
    >
      <span
        className={cn(
          'absolute flex items-center justify-center rounded-full bg-brand-lime text-brand-ink',
          CORE_CLASS[size],
          CORE_TEXT_CLASS[size],
        )}
      >
        {Icon ? (
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
        ) : (
          <span className="font-bold leading-none [font-family:var(--font-display)]">
            {children}
          </span>
        )}
      </span>
    </span>
  )
}
