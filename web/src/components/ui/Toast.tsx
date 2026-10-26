import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { TOAST_AUTO_DISMISS_MS } from '../../lib/constants'
import { FeedbackCard } from './FeedbackCard'

type ToastProps = Omit<ComponentProps<typeof FeedbackCard>, 'className'> & {
  className?: string
}

/**
 * Floating toast slot. Every toast closes itself after five seconds unless the
 * caller asks for a different window, while inline cards never opt in at all.
 * Source: docs/tasks/step-11-improvements/web-task.md item 12.
 */
export function Toast({ className, autoDismissMs = TOAST_AUTO_DISMISS_MS, ...rest }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:inset-x-auto md:bottom-8 md:right-8 md:justify-end"
    >
      <FeedbackCard
        {...rest}
        autoDismissMs={autoDismissMs}
        className={cn('pointer-events-auto w-full max-w-[380px] shadow-lift', className)}
      />
    </div>
  )
}
