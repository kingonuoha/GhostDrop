import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Send,
  X,
} from 'lucide-react'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'
import { OrbBadge } from '../brand/OrbBadge'
import { cn } from '../../lib/cn'
import { sendFeedback } from '../../lib/feedback'
import type { FeedbackCategory } from '../../lib/feedback'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

/**
 * GhostDrop: In-App Feedback & Feature Request Modal
 *
 * Lets users share thoughts, problems, and feature suggestions without
 * accounts, third-party portals, or email clutter.
 * Submissions post to the Google Sheets pipeline.
 *
 * Design and Voice:
 * - Laroka display heading: "Tell us what is on your mind"
 * - Reassuring microcopy: "We read every single note. Zero ads, zero spam, zero databases."
 * - Category toggle pills ("Suggest a Feature" vs "General Thought or Problem")
 * - Acid Lime primary CTA button
 * - Zero em dashes, zero emojis
 */
export function FeedbackModal({ isOpen, onClose, onSuccess }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>('feature_request')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false)
      setErrorMessage(null)
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Escape key listener for accessibility
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      setErrorMessage('Please type a short note before sending.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await sendFeedback({
        category,
        message: trimmed,
      })

      if (result.success) {
        setIsSubmitted(true)
        setMessage('')
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setErrorMessage(
          result.error || 'Could not send note right now. Check connection and try again.',
        )
      }
    } catch {
      setErrorMessage('Could not send note right now. Check connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setIsSubmitted(false)
    setMessage('')
    setErrorMessage(null)
    onClose()
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-brand-ink/40 backdrop-blur-xs transition-opacity duration-300 sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        aria-describedby="feedback-modal-subtitle"
        className="relative w-full max-w-[500px] overflow-hidden rounded-[32px] border border-brand-line bg-brand-surface p-6 text-brand-ink shadow-lift transition-all sm:p-7"
      >
        <SquiggleCardBg
          tone="lime"
          variant="single-loop"
          opacity={0.14}
          placement="bottom-right"
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close feedback dialog"
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-stone text-brand-ink transition-colors hover:bg-brand-line"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        {isSubmitted ? (
          /* Joyful confirmation state */
          <div className="relative flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime text-brand-ink shadow-xs">
              <CheckCircle2 size={32} strokeWidth={2.5} aria-hidden="true" />
            </span>

            <h2 className="type-h2 mt-4">Message sent!</h2>
            <p className="mt-2 max-w-[34ch] text-sm font-semibold text-brand-ink-muted">
              Thank you for helping us improve GhostDrop. We read every single note.
            </p>

            <button
              type="button"
              onClick={handleReset}
              className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-brand-cobalt px-6 py-2.5 text-sm font-bold text-white shadow-pop-cobalt transition-transform active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <OrbBadge size="sm" icon={Lightbulb} />
              <span className="inline-flex items-center rounded-full bg-brand-lime-tint px-3 py-1 text-xs font-bold text-brand-forest">
                Feedback & Ideas
              </span>
            </div>

            <div>
              <h2 id="feedback-modal-title" className="type-h2 max-w-[20ch] text-balance">
                Tell us what is on your mind
              </h2>
              <p
                id="feedback-modal-subtitle"
                className="mt-1.5 text-xs font-semibold text-brand-ink-muted"
              >
                We read every single note. Zero ads, zero spam, zero databases.
              </p>
            </div>

            {/* Segmented category toggle */}
            <div
              role="radiogroup"
              aria-label="Feedback type"
              className="flex flex-col gap-2 rounded-2xl bg-brand-stone/60 p-1.5 sm:flex-row"
            >
              <button
                type="button"
                role="radio"
                aria-checked={category === 'feature_request'}
                onClick={() => setCategory('feature_request')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all',
                  category === 'feature_request'
                    ? 'bg-brand-surface text-brand-ink shadow-xs'
                    : 'text-brand-ink-muted hover:text-brand-ink',
                )}
              >
                <Lightbulb size={14} strokeWidth={2} aria-hidden="true" />
                <span>Suggest a Feature</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={category === 'general_feedback'}
                onClick={() => setCategory('general_feedback')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all',
                  category === 'general_feedback'
                    ? 'bg-brand-surface text-brand-ink shadow-xs'
                    : 'text-brand-ink-muted hover:text-brand-ink',
                )}
              >
                <MessageSquare size={14} strokeWidth={2} aria-hidden="true" />
                <span>General Thought or Problem</span>
              </button>
            </div>

            {/* High-contrast textarea */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="feedback-message" className="sr-only">
                Your message
              </label>
              <textarea
                ref={textareaRef}
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                maxLength={2000}
                placeholder={
                  category === 'feature_request'
                    ? 'What would make GhostDrop even better for you?'
                    : 'Did something feel tricky, or did you spot a bug? Let us know...'
                }
                className="w-full resize-none rounded-2xl border border-brand-line bg-brand-surface px-4 py-3 text-sm font-medium text-brand-ink placeholder:text-brand-ink-muted/70 focus:border-brand-cobalt focus:outline-none focus:ring-2 focus:ring-brand-cobalt/20"
              />
            </div>

            {/* Error banner if submission fails */}
            {errorMessage ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-brand-error/30 bg-brand-error-tint p-3 text-xs font-semibold text-brand-ink"
              >
                <RefreshCw size={14} strokeWidth={2} className="shrink-0 text-brand-error" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="mt-1 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[0.7rem] font-semibold text-brand-ink-muted">
                Sent safely to the team
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 text-xs font-bold text-brand-ink-muted transition-colors hover:bg-brand-stone hover:text-brand-ink sm:flex-initial"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="group inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-brand-lime px-5 text-xs font-bold text-brand-ink shadow-xs transition-all hover:bg-brand-lime-soft active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:flex-initial"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} strokeWidth={2} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Note</span>
                      <Send
                        size={13}
                        strokeWidth={2.5}
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
