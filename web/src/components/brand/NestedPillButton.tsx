import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export type NestedPillVariant = 'lime-on-cobalt' | 'cobalt-on-lime' | 'ink'
export type NestedPillSize = 'sm' | 'md' | 'lg'

const SHELL_CLASS: Record<NestedPillVariant, string> = {
  'lime-on-cobalt': 'bg-brand-cobalt text-white hover:bg-brand-cobalt-deep shadow-pop-cobalt',
  'cobalt-on-lime': 'bg-brand-lime text-brand-ink hover:bg-brand-lime-soft',
  ink: 'bg-brand-ink text-white hover:bg-brand-ink-soft',
}

const CIRCLE_CLASS: Record<NestedPillVariant, string> = {
  'lime-on-cobalt': 'bg-brand-lime text-brand-ink',
  'cobalt-on-lime': 'bg-brand-cobalt text-white',
  ink: 'bg-brand-lime text-brand-ink',
}

const SIZE_SHELL_CLASS: Record<NestedPillSize, string> = {
  sm: 'min-h-[44px] gap-2 px-4 py-2 text-sm',
  md: 'min-h-[48px] gap-2.5 px-5 py-2.5 text-[0.95rem]',
  lg: 'min-h-[56px] gap-3 px-6 py-3 text-base',
}

const SIZE_CIRCLE_CLASS: Record<NestedPillSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

const SIZE_ICON_PX: Record<NestedPillSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
}

type NestedPillButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
  variant?: NestedPillVariant
  size?: NestedPillSize
  icon?: LucideIcon
  iconSide?: 'left' | 'right'
}

export function NestedPillButton({
  children,
  variant = 'lime-on-cobalt',
  size = 'md',
  icon: Icon,
  iconSide = 'right',
  className,
  type = 'button',
  disabled,
  ...rest
}: NestedPillButtonProps) {
  const iconCircle = Icon ? (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:rotate-12',
        CIRCLE_CLASS[variant],
        SIZE_CIRCLE_CLASS[size],
      )}
    >
      <Icon size={SIZE_ICON_PX[size]} strokeWidth={2} aria-hidden="true" />
    </span>
  ) : null

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'group inline-flex select-none items-center justify-center rounded-full font-semibold tracking-tight transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-spring)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        SHELL_CLASS[variant],
        SIZE_SHELL_CLASS[size],
        className,
      )}
      {...rest}
    >
      {iconSide === 'left' ? iconCircle : null}
      <span>{children}</span>
      {iconSide === 'right' ? iconCircle : null}
    </button>
  )
}
