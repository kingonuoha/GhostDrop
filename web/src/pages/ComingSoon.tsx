/**
 * Screen 0: the prelaunch coming soon wall.
 * Source: docs/01-wireframe-and-pages.md, docs/02-brand-persona-and-copy.md
 * section 2.1, docs/05-motion-spec.md, plans/coming-soon-wall-plan.md sections 4
 * and 6, decisions.md D-015.
 *
 * Every route renders this until the gate unlocks. There is no nav bar, no dock,
 * no input and no P2P affordance here by design: the teaser must never open a
 * signaling socket. Both unlock gestures are wired without any visible hint.
 */

import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { OrbBadge } from '../components/brand/OrbBadge'
import { ComingSoonBackdrop } from '../components/soon/ComingSoonBackdrop'
import { useTripleTapLogo } from '../hooks/useLaunchGate'
import { LAUNCH_AT } from '../lib/constants'
import {
  SOON_COUNTDOWN_LABEL,
  SOON_EYEBROW,
  SOON_FOOTNOTE,
  SOON_HEADLINE,
  SOON_STEP_ONE,
  SOON_STEP_THREE,
  SOON_STEP_TWO,
  SOON_SUB,
  SOON_WELCOME,
} from '../lib/copyDeck'
import { countdownSegments } from '../lib/format'

/** Static label, so a screen reader is never interrupted by the ticking digits. */
const COUNTDOWN_ARIA_LABEL = 'Time left until GhostDrop opens on 23 October 2026'

/** How long the welcome state holds before the wall lifts itself. */
const UNVEIL_HOLD_MS = 2600

const STEPS: readonly { number: string; label: string }[] = [
  { number: '1', label: SOON_STEP_ONE },
  { number: '2', label: SOON_STEP_TWO },
  { number: '3', label: SOON_STEP_THREE },
]

type ComingSoonProps = {
  onUnlock: () => void
}

/**
 * Ticking digits. `now` lives here and nowhere else, so a tick re-renders this
 * subtree alone: the colour fields and the squiggles never repaint per second.
 */
function LaunchClock({ onUnlock }: ComingSoonProps) {
  const [now, setNow] = useState(() => Date.now())
  const remaining = LAUNCH_AT - now
  // Under a second there is no digit left to show, so the wall hands over to the
  // welcome copy instead of parking on a stale `00s` cell.
  const launched = remaining < 1000

  useEffect(() => {
    if (launched) return

    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [launched])

  useEffect(() => {
    if (!launched) return

    // Cleared on unmount, so a fast navigation can never unlock after teardown.
    const id = setTimeout(onUnlock, UNVEIL_HOLD_MS)
    return () => clearTimeout(id)
  }, [launched, onUnlock])

  if (launched) {
    return (
      <div className="flex min-h-[132px] flex-col items-center justify-center gap-4">
        <OrbBadge size="md" icon={Sparkles} />
        <p className="type-h3 max-w-[22ch] text-center text-balance">{SOON_WELCOME}</p>
      </div>
    )
  }

  const segments = countdownSegments(remaining)

  return (
    <div className="flex min-h-[132px] flex-col items-center justify-center gap-3">
      <p className="type-body text-sm font-semibold tracking-wide text-brand-ink-soft">
        {SOON_COUNTDOWN_LABEL}
      </p>
      <div
        role="timer"
        aria-live="off"
        aria-label={COUNTDOWN_ARIA_LABEL}
        className="soon-countdown flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-[clamp(1.75rem,7vw,3.25rem)] font-bold leading-none text-brand-ink"
      >
        {segments.map((segment) => (
          <span key={segment.unit} className="inline-flex items-baseline">
            {segment.value.split('').map((digit, index) => (
              <span key={`${segment.unit}-${index}`} className="soon-countdown-digit">
                {digit}
              </span>
            ))}
            <span className="ml-[0.08em] text-[0.45em] font-bold text-brand-ink-soft">
              {segment.unit}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function ComingSoon({ onUnlock }: ComingSoonProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { onPointerDown } = useTripleTapLogo(onUnlock)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main className="relative isolate min-h-dvh w-full overflow-x-hidden bg-brand-canvas text-brand-ink">
      <ComingSoonBackdrop />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col items-center justify-center gap-8 px-5 pt-12 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-16">
        <button
          type="button"
          id="coming-soon-logo"
          aria-label="GhostDrop"
          onPointerDown={onPointerDown}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent px-3 py-2 text-brand-ink transition-transform duration-200 ease-[var(--ease-spring)] select-none active:scale-[0.97]"
        >
          <Logo size={40} withWordmark wordmarkClassName="text-[1.5rem] sm:text-[1.75rem]" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <p className="type-eyebrow text-brand-ink-soft">{SOON_EYEBROW}</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="type-display max-w-[20ch] text-center text-balance outline-none"
          >
            {SOON_HEADLINE}
          </h1>
          <p className="type-body max-w-[44ch] text-center text-base text-brand-ink-soft sm:text-lg">
            {SOON_SUB}
          </p>
        </div>

        <LaunchClock onUnlock={onUnlock} />

        <ul className="grid w-full max-w-[860px] grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="flex items-center gap-3 rounded-[var(--radius-md)] bg-brand-surface px-4 py-3 shadow-soft ring-1 ring-brand-line sm:flex-col sm:items-start sm:gap-2.5 sm:px-5 sm:py-4"
            >
              <OrbBadge size="sm" label={`Step ${step.number}`}>
                {step.number}
              </OrbBadge>
              <span className="text-[0.95rem] font-semibold leading-snug">{step.label}</span>
            </li>
          ))}
        </ul>

        <p className="soon-footnote type-body max-w-[46ch] text-center text-sm">
          {SOON_FOOTNOTE}
        </p>
      </div>
    </main>
  )
}
