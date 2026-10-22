import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * Five decorative squiggly lines that draw themselves in at a random corner or
 * edge anchor, hold, retract, and only then move to the next anchor.
 *
 * Rule source: decisions.md D-006 and D-015 item 6, docs/05-motion-spec.md.
 * The only animated property on a squiggle is `stroke-dashoffset`. Nothing here
 * translates, scales, or fades the line. A position change is a discrete jump
 * applied after the retract has finished, so no frame ever shows a visible
 * squiggle moving. The layer is `display: none` under reduced motion, and the
 * media query is watched for the life of the layer, so flipping the OS setting
 * while the teaser is open clears every interval instead of only hiding paint.
 *
 * `ComingSoonBackdrop` renders this layer between the colour fields and the
 * Warm Stone wash, so the order slab, squiggle, wash holds in one stacking
 * context. The page must not render it a second time.
 */

type SoonAnchor = {
  x: number
  y: number
}

/** Four corners plus four edge midpoints, as percentages of the layer box. */
const ANCHORS: readonly SoonAnchor[] = [
  { x: 12, y: 10 },
  { x: 50, y: 4 },
  { x: 88, y: 10 },
  { x: 94, y: 50 },
  { x: 88, y: 90 },
  { x: 50, y: 96 },
  { x: 12, y: 90 },
  { x: 6, y: 50 },
]

const SHAPES = [
  {
    viewBox: '0 0 600 320',
    strokeWidth: 26,
    d: 'M 20 268 C 110 248, 200 180, 200 104 C 200 44, 120 40, 118 110 C 116 190, 240 240, 360 194 C 450 160, 520 128, 585 120',
  },
  {
    viewBox: '0 0 600 300',
    strokeWidth: 24,
    d: 'M 30 278 C 62 120, 150 40, 210 100 C 260 150, 200 252, 140 238 C 82 224, 160 96, 285 126 C 380 148, 400 232, 340 248 C 286 262, 320 150, 430 180 C 500 198, 530 158, 556 80 C 566 40, 500 26, 496 86 C 492 150, 560 178, 586 118',
  },
  {
    viewBox: '0 0 600 320',
    strokeWidth: 28,
    d: 'M 16 250 C 82 140, 152 130, 226 204 C 300 278, 376 268, 446 184 C 496 124, 546 106, 588 130',
  },
] as const

const TONE_CLASS = {
  forest: 'text-brand-forest',
  cobalt: 'text-brand-cobalt',
} as const

type SoonTone = keyof typeof TONE_CLASS

const SQUIGGLE_COUNT = 5

/** Mirrors --dur-draw in web/src/styles/tokens.css and is passed to CSS inline. */
const DRAW_MS = 1150
const RETRACT_MS = 900
const HOLD_MIN_MS = 2000
const HOLD_MAX_MS = 5000
/** Small tail so a cycle never starts before the retract has fully landed. */
const CYCLE_TAIL_MS = 240
const PHASE_SPREAD_MS = 900

/** Mirrors the `prefers-reduced-motion` block at the end of web/src/index.css. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type SoonSquiggleSpec = {
  id: number
  size: number
  rotate: number
  tone: SoonTone
  shape: number
  /** Fixed per instance, so one interval per squiggle is created once. */
  cycleMs: number
  /** Shuffled once on mount, then walked one anchor per cycle. */
  order: number[]
}

type SoonCycleState = {
  specs: SoonSquiggleSpec[]
  steps: number[]
  holds: number[]
  nonces: number[]
}

function randomHold(): number {
  return HOLD_MIN_MS + Math.round(Math.random() * (HOLD_MAX_MS - HOLD_MIN_MS))
}

function shuffledAnchors(): number[] {
  const order = ANCHORS.map((_, index) => index)

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1))
    const held = order[index]
    order[index] = order[swapWith]
    order[swapWith] = held
  }

  return order
}

function buildSpecs(): SoonSquiggleSpec[] {
  const longestCycle = DRAW_MS + HOLD_MAX_MS + RETRACT_MS + CYCLE_TAIL_MS

  return Array.from({ length: SQUIGGLE_COUNT }, (_, index) => ({
    id: index,
    size: 90 + Math.round(Math.random() * 130),
    rotate: Math.round(Math.random() * 44) - 22,
    tone: index % 2 === 0 ? 'forest' : 'cobalt',
    shape: index % SHAPES.length,
    // A spread on the period keeps the five from drawing in lockstep.
    cycleMs: longestCycle + Math.round(Math.random() * PHASE_SPREAD_MS),
    order: shuffledAnchors(),
  }))
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export function ComingSoonSquiggles() {
  /*
    Specs are built in the state initializer, so they exist before any effect
    runs and no effect has to read a ref filled by another effect. The shuffle
    still happens exactly once per instance, never in the render output.
  */
  const [cycleState, setCycleState] = useState<SoonCycleState>(() => {
    const specs = buildSpecs()

    return {
      specs,
      steps: specs.map(() => 0),
      holds: specs.map(() => randomHold()),
      nonces: specs.map(() => 0),
    }
  })
  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersReducedMotion)
  /** Stable identity for the life of the layer, so the timer effect runs once. */
  const specs = cycleState.specs

  // Watch the OS setting, so flipping it mid session takes effect immediately.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const query = window.matchMedia(REDUCED_MOTION_QUERY)

    // Re-read once, in case the setting changed between render and effect.
    setReducedMotion(query.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    query.addEventListener('change', handleChange)

    return () => {
      query.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      return
    }

    // One interval per squiggle, created once and cleared when reduce turns on.
    const timers = specs.map((spec, index) =>
      window.setInterval(() => {
        setCycleState((current) => {
          const steps = current.steps.slice()
          steps[index] = (steps[index] + 1) % ANCHORS.length

          const holds = current.holds.slice()
          holds[index] = randomHold()

          const nonces = current.nonces.slice()
          nonces[index] += 1

          return { ...current, steps, holds, nonces }
        })
      }, spec.cycleMs),
    )

    return () => {
      timers.forEach((timer) => window.clearInterval(timer))
    }
  }, [reducedMotion, specs])

  return (
    <div
      aria-hidden="true"
      className="soon-squiggle-layer pointer-events-none absolute inset-0 overflow-hidden"
    >
      {specs.map((spec, index) => {
        const anchor = ANCHORS[cycleState.steps[index]]
        const shape = SHAPES[spec.shape]
        const box = `min(${spec.size}px, 44vw)`
        const retractDelay = DRAW_MS + cycleState.holds[index]

        return (
          <svg
            key={`soon-squiggle-${spec.id}-${cycleState.nonces[index]}`}
            viewBox={shape.viewBox}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            className={`absolute ${TONE_CLASS[spec.tone]}`}
            style={{
              left: `calc(${anchor.x}% - (${box} / 2))`,
              top: `calc(${anchor.y}% - (${box} / 2))`,
              width: box,
              height: box,
              /*
                Static stamp angle chosen once on mount. It is never animated
                and it sits on the wrapper, not on the path, so the draw-only
                rule for the line itself is untouched.
              */
              transform: `rotate(${spec.rotate}deg)`,
            }}
          >
            <path
              d={shape.d}
              pathLength="1"
              strokeDasharray="1"
              stroke="currentColor"
              strokeWidth={shape.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="soon-squiggle-path"
              style={
                {
                  '--soon-draw': `${DRAW_MS}ms`,
                  '--soon-retract-delay': `${retractDelay}ms`,
                } as CSSProperties
              }
            />
          </svg>
        )
      })}
    </div>
  )
}
