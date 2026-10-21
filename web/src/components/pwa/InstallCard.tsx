/**
 * Install card for the hub.
 * Source: docs/00-prd-source-of-truth.md FR-1.6, docs/02-brand-persona-and-copy.md
 * SUCCESS_PWA_INSTALLED, decisions.md D-004.
 *
 * The card is a quiet offer, never a gate: it disappears when the browser
 * cannot install, when someone hides it, and once the app is on the home
 * screen. Everything it raises comes from the shared copy deck.
 */

import { useId, useState } from 'react'
import { Download, X } from 'lucide-react'
import { buildFeedback } from '../../lib/copyDeck'
import { cn } from '../../lib/cn'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { NestedPillButton } from '../brand/NestedPillButton'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'
import { Toast } from '../ui/Toast'

type InstallCardProps = {
  className?: string
}

export function InstallCard({ className }: InstallCardProps) {
  const { canInstall, isInstalled, isPrompting, promptInstall } = usePwaInstall()
  const [hidden, setHidden] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const titleId = `install-title-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const installedCopy = buildFeedback('SUCCESS_PWA_INSTALLED')

  const handleInstall = async (): Promise<void> => {
    const accepted = await promptInstall()
    if (accepted) setShowSuccess(true)
  }

  const isVisible = canInstall && !isInstalled && !hidden

  return (
    <>
      {showSuccess ? (
        <Toast
          tone={installedCopy.tone}
          icon={Download}
          title={installedCopy.title}
          body={installedCopy.body}
          actionLabel={installedCopy.actionLabel}
          onAction={() => setShowSuccess(false)}
          onDismiss={() => setShowSuccess(false)}
        />
      ) : null}

      {isVisible ? (
        <section
          aria-labelledby={titleId}
          className={cn(
            'relative overflow-hidden rounded-[32px] border border-brand-line bg-brand-stone p-5 shadow-soft md:p-6',
            className,
          )}
        >
          <SquiggleCardBg
            variant="single-loop"
            tone="forest"
            opacity={0.1}
            placement="bottom-right"
          />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-cobalt text-brand-lime">
                <Download size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="type-h3">
                  Keep GhostDrop one tap away
                </h2>
                <p className="mt-1 text-sm font-medium text-brand-ink-muted">
                  Next time, open GhostDrop right from your home screen.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NestedPillButton
                size="sm"
                icon={Download}
                disabled={isPrompting}
                onClick={() => {
                  void handleInstall()
                }}
              >
                {isPrompting ? 'Adding...' : 'Add to Home Screen'}
              </NestedPillButton>

              <button
                type="button"
                onClick={() => setHidden(true)}
                aria-label="Hide install hint"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-ink transition-colors hover:bg-brand-line"
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
