import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { FeedbackCard } from './FeedbackCard'

type ToastProps = Omit<ComponentProps<typeof FeedbackCard>, 'className'> & {
  className?: string
}

export function Toast({ className, ...rest }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:inset-x-auto md:bottom-8 md:right-8 md:justify-end"
    >
      <FeedbackCard
        {...rest}
        className={cn('pointer-events-auto w-full max-w-[380px] shadow-lift', className)}
      />
    </div>
  )
}
