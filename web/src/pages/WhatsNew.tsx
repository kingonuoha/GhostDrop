import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SquiggleLine } from '../components/brand/SquiggleLine'
import { SquiggleCardBg } from '../components/brand/SquiggleCardBg'
import { FeedbackModal } from '../components/feedback/FeedbackModal'
import { cn } from '../lib/cn'
import {
  CHANGELOG_RELEASES,
  markUpdatesAsSeen,
} from '../lib/changelog'
import type { ChangelogCategory } from '../lib/changelog'
import { navigate } from '../lib/router'

const CATEGORY_ICONS: Record<ChangelogCategory, LucideIcon> = {
  feature: Sparkles,
  speed: Zap,
  privacy: ShieldCheck,
  fix: Wrench,
}

const CATEGORY_STYLES: Record<
  ChangelogCategory,
  { badge: string; iconClass: string; label: string }
> = {
  feature: {
    badge: 'bg-brand-lime text-brand-ink',
    iconClass: 'text-brand-ink',
    label: 'New Feature',
  },
  speed: {
    badge: 'bg-brand-cobalt-tint text-brand-cobalt',
    iconClass: 'text-brand-cobalt',
    label: 'Speed & Motion',
  },
  privacy: {
    badge: 'bg-brand-lime-tint text-brand-forest',
    iconClass: 'text-brand-forest',
    label: 'Privacy & Offline',
  },
  fix: {
    badge: 'bg-brand-stone text-brand-ink',
    iconClass: 'text-brand-ink',
    label: 'Clarity & Fix',
  },
}

/**
 * GhostDrop: What is New Page (/whats-new)
 *
 * Dedicated Grandma-friendly release notes view.
 *
 * Architecture and Decisions:
 * - decisions.md D-019: Grandma-Friendly What is New Page with Small Date-Time Markers.
 * - Strict Grandma 2-Second Rule: Zero technical jargon.
 * - Prominent small date-time marker (DD MMM YYYY, HH:MM).
 * - Self-drawing squiggly line accent in hero.
 * - Zero em dashes and zero emojis.
 */
export function WhatsNew() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // Clear unread indicator dot on view
  useEffect(() => {
    markUpdatesAsSeen()
  }, [])

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* Navigation breadcrumb and back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-brand-line bg-brand-surface px-4 py-2 text-xs font-bold text-brand-ink shadow-xs transition-colors hover:border-brand-cobalt/40 hover:bg-brand-stone"
        >
          <ArrowLeft
            size={14}
            strokeWidth={2.5}
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-0.5"
          />
          <span>Back to Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-surface px-4 py-2 text-xs font-bold text-brand-ink border border-brand-line shadow-xs transition-colors hover:bg-brand-stone"
        >
          <MessageSquare size={14} strokeWidth={2} aria-hidden="true" />
          <span>Have an idea?</span>
        </button>
      </div>

      {/* Hero Header */}
      <header className="relative flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-4 py-1.5 text-xs font-bold text-brand-ink">
          <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
          <span>Updates & Improvements</span>
        </span>

        <h1 className="type-h1 max-w-[20ch] text-balance">What is new in GhostDrop</h1>
        <p className="max-w-[42ch] text-sm font-semibold text-brand-ink-muted md:text-base">
          Every change explained in plain words, so you always know what is fresh and how it helps you.
        </p>

        {/* Self-drawing squiggly line accent in hero */}
        <div className="mt-2 flex justify-center" aria-hidden="true">
          <SquiggleLine
            variant="single-loop"
            animate
            className="h-9 w-44 text-brand-cobalt/50"
          />
        </div>
      </header>

      {/* Chronological release list */}
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6">
        {CHANGELOG_RELEASES.map((release) => {
          const isLatest = Boolean(release.isCurrent)

          return (
            <article
              key={release.version}
              aria-labelledby={`release-${release.version}-title`}
              className={cn(
                'relative flex flex-col gap-5 overflow-hidden rounded-[32px] border p-6 transition-all md:p-8',
                isLatest
                  ? 'border-brand-cobalt/30 bg-brand-surface shadow-lift'
                  : 'border-brand-line bg-brand-surface/80 shadow-soft',
              )}
            >
              {isLatest ? (
                <SquiggleCardBg
                  tone="lime"
                  variant="double-loop"
                  opacity={0.10}
                  placement="bottom-right"
                />
              ) : null}

              {/* Version header with prominent small date-time marker */}
              <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-brand-line/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="type-numeral inline-flex items-center rounded-full bg-brand-ink px-3 py-1 text-xs font-bold leading-none text-white">
                    v{release.version}
                  </span>

                  {isLatest ? (
                    <span className="inline-flex items-center rounded-full bg-brand-lime px-2.5 py-0.5 text-[0.7rem] font-bold text-brand-ink">
                      Latest
                    </span>
                  ) : null}
                </div>

                {/* Prominent small date-time marker */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-stone/70 px-3 py-1 font-mono text-xs font-semibold text-brand-ink-muted">
                  <Calendar size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                  <span>{release.dateTime}</span>
                </div>
              </div>

              {/* Headline */}
              <div className="relative">
                <h2
                  id={`release-${release.version}-title`}
                  className="type-h2 text-balance text-brand-ink"
                >
                  {release.headline}
                </h2>
              </div>

              {/* Items in release */}
              <ul className="relative flex flex-col gap-3.5">
                {release.items.map((item, index) => {
                  const Icon = CATEGORY_ICONS[item.category]
                  const style = CATEGORY_STYLES[item.category]

                  return (
                    <li
                      key={index}
                      className="flex items-start gap-3.5 rounded-2xl bg-brand-stone/40 p-3.5 md:p-4"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-xs',
                          style.badge,
                        )}
                      >
                        <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                      </span>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="type-h3 text-[0.95rem] text-brand-ink">
                            {item.title}
                          </h3>
                          <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-brand-ink-muted">
                            {style.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-brand-ink-muted md:text-sm">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>

      {/* Bottom Feedback Callout */}
      <section
        aria-labelledby="feedback-cta-title"
        className="mx-auto flex w-full max-w-[800px] flex-col items-start gap-4 rounded-[32px] bg-brand-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between md:p-7"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-ink shadow-xs">
            <MessageSquare size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="feedback-cta-title" className="type-h3">
              Have an idea for our next update?
            </h2>
            <p className="mt-1 text-xs font-medium text-brand-ink-muted md:text-sm">
              We build GhostDrop for you. Suggest a feature or tell us what could feel even simpler.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-brand-lime px-5 text-xs font-bold text-brand-ink shadow-xs transition-colors hover:bg-brand-lime-soft sm:w-auto"
        >
          <span>Share Feedback</span>
        </button>
      </section>

      {/* In-app feedback modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  )
}
