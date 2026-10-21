import type { RoomFeedback } from '../../lib/copyDeck'
import { FeedbackNotice } from './FeedbackNotice'

type RoomToastProps = {
  feedback: RoomFeedback | null
  onDismiss: () => void
  /** Optional non-dismiss action, such as Beam Now on a shared drop. */
  onAction?: () => void
}

/**
 * Fixed joyful toast slot for the hub and the workspace.
 * The card itself owns `role="status"` and `aria-live`, so a screen reader
 * hears every success, warning and playful error once.
 */
export function RoomToast({ feedback, onDismiss, onAction }: RoomToastProps) {
  if (!feedback) return null

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:inset-x-auto md:bottom-8 md:right-8 md:justify-end">
      <div className="pointer-events-auto w-full max-w-[380px]">
        <FeedbackNotice
          feedback={feedback}
          onDismiss={onDismiss}
          onAction={onAction}
          className="shadow-lift"
        />
      </div>
    </div>
  )
}
