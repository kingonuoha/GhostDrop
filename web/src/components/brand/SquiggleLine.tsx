import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn'

const SQUIGGLE_PATHS = {
  'single-loop': {
    viewBox: '0 0 600 320',
    strokeWidth: 28,
    d: 'M -30 260 C 80 235, 195 170, 195 95 C 195 30, 105 30, 105 105 C 105 185, 235 235, 370 185 C 470 148, 540 125, 630 120',
  },
  'double-loop': {
    viewBox: '0 0 600 280',
    strokeWidth: 36,
    d: 'M 45 290 C 65 110, 165 25, 225 90 C 275 145, 210 265, 145 250 C 80 235, 165 95, 295 125 C 415 155, 445 255, 375 270 C 305 285, 330 165, 445 195 C 510 212, 545 180, 565 75 C 575 20, 440 -10, 435 55 C 430 125, 535 165, 585 95 L 605 290',
  },
} as const

export type SquiggleVariant = keyof typeof SQUIGGLE_PATHS

type SquiggleLineProps = {
  variant?: SquiggleVariant
  strokeWidth?: number
  animate?: boolean
  /** 0 to 1. Partial draws are data or idle states, never transforms. */
  progress?: number
  className?: string
}

export function SquiggleLine({
  variant = 'single-loop',
  strokeWidth,
  animate = true,
  progress = 1,
  className,
}: SquiggleLineProps) {
  const shape = SQUIGGLE_PATHS[variant]
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const isPartial = !animate && clampedProgress < 1

  const pathClass = animate
    ? 'squiggle-path-draw'
    : isPartial
      ? 'squiggle-path-partial'
      : 'squiggle-path-static'

  const pathStyle: CSSProperties | undefined = isPartial
    ? ({ '--squiggle-offset': String(1 - clampedProgress) } as CSSProperties)
    : undefined

  return (
    <svg
      viewBox={shape.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none select-none', className)}
    >
      <path
        d={shape.d}
        stroke="currentColor"
        strokeWidth={strokeWidth ?? shape.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
        className={pathClass}
        style={pathStyle}
      />
    </svg>
  )
}
