import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, PointerEvent, ReactNode, RefObject } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useRiveFire } from '../../lib/rive/motionContext'
import { MotionPulse } from '../rive/MotionPulse'
import { RiveCanvas } from '../rive/RiveCanvas'

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

/**
 * Bridges the imperative press animation to the button's own pointer handler.
 * Lives inside the canvas provider, so it can reach the trigger table while the
 * button keeps its real DOM handler and focus behaviour.
 */
function PressBridge({ pressRef }: { pressRef: RefObject<(() => void) | null> }) {
  const press = useRiveFire('press')

  useEffect(() => {
    pressRef.current = press
    return () => {
      pressRef.current = null
    }
  }, [press, pressRef])

  return null
}

type NestedPillButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
  variant?: NestedPillVariant
  size?: NestedPillSize
  icon?: LucideIcon
  iconSide?: 'left' | 'right'
  /**
   * Lets a caller celebrate a completed action, such as a copied room code.
   * The pulse fires once per change to `success`.
   */
  motionState?: 'idle' | 'success'
}

export function NestedPillButton({
  children,
  variant = 'lime-on-cobalt',
  size = 'md',
  icon: Icon,
  iconSide = 'right',
  motionState = 'idle',
  className,
  type = 'button',
  disabled,
  onPointerDown,
  ...rest
}: NestedPillButtonProps) {
  const pressRef = useRef<(() => void) | null>(null)
  const [successPulse, setSuccessPulse] = useState(0)

  /**
   * The authored `CtaPill` artboard paints the cobalt pill with its lime orb,
   * which is the primary `lime-on-cobalt` treatment only. The other two skins
   * keep their CSS body, so they never get a cobalt canvas over the top.
   */
  const hasMotionLayer = variant === 'lime-on-cobalt'

  useEffect(() => {
    if (motionState !== 'success') return
    setSuccessPulse((pulse) => pulse + 1)
  }, [motionState])

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(event)
    if (disabled) return
    pressRef.current?.()
  }

  const iconCircle = Icon ? (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:rotate-12',
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
      onPointerDown={handlePointerDown}
      className={cn(
        'group relative inline-flex select-none items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-spring)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        SHELL_CLASS[variant],
        SIZE_SHELL_CLASS[size],
        className,
      )}
      {...rest}
    >
      {/*
        The Rive pill body paints behind the label. The CSS colours above stay
        as the reduced motion fallback and as the frame before the canvas
        arrives, so the pill is never empty.
      */}
      {hasMotionLayer ? (
        <RiveCanvas
          target="cta"
          fit="fill"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        >
          <PressBridge pressRef={pressRef} />
          <MotionPulse input="success" pulse={successPulse} />
        </RiveCanvas>
      ) : null}

      {iconSide === 'left' ? iconCircle : null}
      <span className="relative">{children}</span>
      {iconSide === 'right' ? iconCircle : null}
    </button>
  )
}
