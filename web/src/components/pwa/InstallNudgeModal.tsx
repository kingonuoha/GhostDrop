import { useEffect, useRef } from 'react'
import { Download, PlusSquare, Share, Sparkles, X } from 'lucide-react'
import { OrbBadge } from '../brand/OrbBadge'
import { NestedPillButton } from '../brand/NestedPillButton'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'
import { useInstallNudge } from '../../hooks/useInstallNudge'

export function InstallNudgeModal() {
  const { visible, dismiss, install, isPrompting, canInstall, isIos } = useInstallNudge()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, dismiss])

  if (!visible) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center sm:p-6 bg-brand-ink/40 backdrop-blur-xs transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nudge-title"
        aria-describedby="nudge-desc"
        className="relative w-full max-w-[460px] overflow-hidden rounded-[32px] border border-brand-line bg-brand-surface p-6 text-brand-ink shadow-lift transition-transform duration-300 sm:p-7"
      >
        <SquiggleCardBg
          tone="lime"
          variant="single-loop"
          opacity={0.16}
          placement="bottom-right"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install suggestion"
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-stone text-brand-ink transition-colors hover:bg-brand-line"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        {/* Content */}
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <OrbBadge size="md" icon={Sparkles} />
            <span className="inline-flex items-center rounded-full bg-brand-lime px-3 py-1 text-xs font-bold text-brand-ink">
              First Teleport Done!
            </span>
          </div>

          <div>
            <h2 id="nudge-title" className="type-h2 max-w-[18ch] text-balance">
              Keep GhostDrop one tap away
            </h2>
            <p id="nudge-desc" className="mt-2 text-sm font-semibold text-brand-ink-muted">
              Add GhostDrop to your home screen so you can beam photos and files instantly without searching for the link.
            </p>
          </div>

          {/* Platform-specific instructions */}
          {canInstall ? (
            <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
              <NestedPillButton
                variant="lime-on-cobalt"
                icon={Download}
                disabled={isPrompting}
                onClick={() => {
                  void install()
                }}
                className="w-full justify-center"
              >
                {isPrompting ? 'Adding...' : 'Install App'}
              </NestedPillButton>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-brand-ink-muted transition-colors hover:bg-brand-stone hover:text-brand-ink"
              >
                Maybe later
              </button>
            </div>
          ) : isIos ? (
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-2xl bg-brand-stone p-3.5 text-xs font-semibold text-brand-ink">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-cobalt shadow-xs">
                    <Share size={15} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span>1. Tap the Share button in Safari</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-forest shadow-xs">
                    <PlusSquare size={15} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span>2. Scroll down and tap Add to Home Screen</span>
                </div>
              </div>

              <NestedPillButton
                variant="lime-on-cobalt"
                onClick={dismiss}
                className="w-full justify-center"
              >
                Got It
              </NestedPillButton>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-3">
              <p className="rounded-2xl bg-brand-stone p-3 text-xs font-semibold text-brand-ink-muted">
                Tip: Bookmark this page or click the install icon in your address bar for quick access.
              </p>
              <NestedPillButton
                variant="lime-on-cobalt"
                onClick={dismiss}
                className="w-full justify-center"
              >
                Got It
              </NestedPillButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
