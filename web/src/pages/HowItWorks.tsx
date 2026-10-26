/**
 * Screen 5: how it works in 3 easy steps.
 * Source: docs/01-wireframe-and-pages.md Screen 5, docs/02-brand-persona-and-copy.md.
 * Layout reference: docs/design/how_ghostdrop_works_grandma_friendly_3_steps_1 and _2.
 * Tokens, Laroka, lucide icons, squiggle draw and copy come from docs/.
 */

import { Fragment } from 'react'
import {
  ArrowRight,
  Clock,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NestedPillButton } from '../components/brand/NestedPillButton'
import { OrbBadge } from '../components/brand/OrbBadge'
import { SquiggleCardBg } from '../components/brand/SquiggleCardBg'
import type { SquiggleTone } from '../components/brand/SquiggleCardBg'
import { TeleportCounterBadge } from '../components/brand/TeleportCounterBadge'
import { cn } from '../lib/cn'
import { navigate } from '../lib/router'

type Step = {
  number: string
  title: string
  body: string
  icon: LucideIcon
  pillLabel: string
  pillIcon: LucideIcon
  cardClass: string
  chipClass: string
  pillClass: string
  squiggleTone: SquiggleTone
}

const STEPS: readonly Step[] = [
  {
    number: '1',
    title: 'Scan the code',
    body: 'Point your phone camera at the code on your other screen.',
    icon: QrCode,
    pillLabel: 'Instant camera connection',
    pillIcon: ScanLine,
    cardClass: 'bg-brand-lime text-brand-ink',
    chipClass: 'bg-brand-surface text-brand-cobalt',
    pillClass: 'bg-brand-surface/80 text-brand-ink',
    squiggleTone: 'cobalt',
  },
  {
    number: '2',
    title: 'Send photos or notes',
    body: 'Pick any photo, file, or text and it pops up on your other screen straight away.',
    icon: Send,
    pillLabel: 'Direct screen to screen',
    pillIcon: Zap,
    cardClass: 'bg-brand-cobalt text-white',
    chipClass: 'bg-white/15 text-white',
    pillClass: 'bg-white/15 text-white',
    squiggleTone: 'lime',
  },
  {
    number: '3',
    title: 'Cleans up by itself',
    body: 'After 50 minutes everything disappears automatically, so your screens stay tidy.',
    icon: Sparkles,
    pillLabel: '50 minute automatic wipe',
    pillIcon: Clock,
    cardClass: 'bg-brand-stone text-brand-ink',
    chipClass: 'bg-brand-surface text-brand-forest',
    pillClass: 'bg-brand-surface text-brand-ink',
    squiggleTone: 'forest',
  },
]

/**
 * The connector draws itself with stroke-dashoffset, exactly like the brand
 * line. It never flies, slides or bounces in.
 */
function StepConnector() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center py-1 lg:h-full lg:w-12 lg:py-0"
    >
      <svg
        viewBox="0 0 120 40"
        fill="none"
        focusable="false"
        className="h-8 w-20 rotate-90 text-brand-cobalt/50 lg:h-10 lg:w-full lg:rotate-0"
      >
        <path
          d="M4 28 C 20 4, 34 36, 50 18 C 64 2, 82 34, 116 12"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          className="squiggle-path-draw"
        />
      </svg>
    </div>
  )
}

export function HowItWorks() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <TeleportCounterBadge />

        <span className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-4 py-1.5 text-xs font-bold text-brand-ink">
          <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
          <span>Simple for everyone</span>
        </span>

        <h1 className="type-h1 max-w-[22ch] text-balance">How it works in 3 easy steps.</h1>
        <p className="max-w-[38ch] text-sm font-semibold text-brand-ink-muted md:text-base">
          No accounts, no passwords, and nothing saved anywhere.
        </p>
      </header>

      <ol className="grid gap-3 lg:grid-cols-[1fr_3rem_1fr_3rem_1fr] lg:items-stretch lg:gap-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const PillIcon = step.pillIcon

          return (
            <Fragment key={step.number}>
              {index > 0 ? (
                <li aria-hidden="true" className="flex items-stretch">
                  <StepConnector />
                </li>
              ) : null}

              <li
                className={cn(
                  'relative flex flex-col overflow-hidden rounded-[32px] p-6 shadow-soft md:p-7',
                  step.cardClass,
                )}
              >
                <SquiggleCardBg
                  tone={step.squiggleTone}
                  variant="single-loop"
                  opacity={0.16}
                  placement="bottom-right"
                />

                <div className="relative flex items-start justify-between gap-3">
                  <OrbBadge size="md">{step.number}</OrbBadge>
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full',
                      step.chipClass,
                    )}
                  >
                    <Icon size={20} strokeWidth={2} aria-hidden="true" />
                  </span>
                </div>

                <h2 className="type-h2 relative mt-4 break-words">
                  <span className="sr-only">Step {step.number}: </span>
                  {step.title}
                </h2>
                <p className="relative mt-2 text-sm font-semibold opacity-80">{step.body}</p>

                <span
                  className={cn(
                    'relative mt-5 inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-xs font-semibold md:mt-auto',
                    step.pillClass,
                  )}
                >
                  <PillIcon size={15} strokeWidth={2} aria-hidden="true" />
                  <span>{step.pillLabel}</span>
                </span>
              </li>
            </Fragment>
          )
        })}
      </ol>

      <section
        aria-labelledby="how-questions-title"
        className="flex flex-col items-start gap-4 rounded-[32px] bg-brand-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between md:p-6"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-lime-tint text-brand-forest">
            <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="how-questions-title" className="type-h3">
              Have any questions?
            </h2>
            <p className="mt-1 text-sm font-medium text-brand-ink-muted">
              GhostDrop never asks for your email or bank details.
            </p>
          </div>
        </div>

        <NestedPillButton
          variant="lime-on-cobalt"
          icon={ArrowRight}
          onClick={() => navigate('/')}
          className="w-full shrink-0 sm:w-auto"
        >
          Try it now
        </NestedPillButton>
      </section>
    </div>
  )
}
