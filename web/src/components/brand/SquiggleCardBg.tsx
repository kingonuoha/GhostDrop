import { cn } from '../../lib/cn'
import { SquiggleLine, type SquiggleVariant } from './SquiggleLine'

export type SquiggleTone = 'cobalt' | 'lime' | 'forest' | 'ink'
export type SquigglePlacement = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

const TONE_CLASS: Record<SquiggleTone, string> = {
  cobalt: 'text-brand-cobalt',
  lime: 'text-brand-lime',
  forest: 'text-brand-forest',
  ink: 'text-brand-ink',
}

const PLACEMENT_CLASS: Record<SquigglePlacement, string> = {
  'bottom-right': '-bottom-14 -right-12',
  'bottom-left': '-bottom-14 -left-12',
  'top-right': '-top-12 -right-12',
  'top-left': '-top-12 -left-12',
}

type SquiggleCardBgProps = {
  variant?: SquiggleVariant
  tone?: SquiggleTone
  placement?: SquigglePlacement
  opacity?: number
  strokeWidth?: number
  animate?: boolean
  className?: string
}

export function SquiggleCardBg({
  variant = 'double-loop',
  tone = 'cobalt',
  placement = 'bottom-right',
  opacity = 0.18,
  strokeWidth,
  animate = true,
  className,
}: SquiggleCardBgProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]',
        TONE_CLASS[tone],
        className,
      )}
    >
      <div
        className={cn('absolute w-[340px] max-w-[80%]', PLACEMENT_CLASS[placement])}
        style={{ opacity }}
      >
        <SquiggleLine
          variant={variant}
          strokeWidth={strokeWidth}
          animate={animate}
          className="h-auto w-full"
        />
      </div>
    </div>
  )
}
