import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * Decorative self-drawing brand squiggly ribbons scattered around screen edges.
 *
 * Requirements:
 * 1. Equalized perimeter distribution (top-left, top-right, mid-left, mid-right,
 *    bottom-left, bottom-right). No clustering on one side.
 * 2. Starts from outside the edge of the screen.
 * 3. Rounded tips everywhere (strokeLinecap="round" with overflow-visible so
 *    tips are never cut flat).
 * 4. Thick, chunky brand ribbon strokes (strokeWidth 42-46).
 * 5. 100% slower timing (2400ms draw, 1800ms retract, 4.5s-8s hold).
 * 6. Brand palette: Electric Cobalt (#1E45FB), Acid Lime (#CDF22B), Deep Forest (#124B38).
 */

type EdgeZone = {
  id: string
  className: string
  rotate: number
  tone: 'cobalt' | 'lime' | 'forest'
  pathD: string
}

// 6 equalized zones around the perimeter
const ZONES: readonly EdgeZone[] = [
  {
    id: 'top-left',
    className: '-top-10 -left-16 sm:-top-12 sm:-left-20',
    rotate: -4,
    tone: 'cobalt',
    // Starts off-screen left at x: -40, curves in, loops, ends with round tip at (480, 140)
    pathD:
      'M -40 220 C 80 200, 160 90, 240 80 C 310 70, 310 180, 220 180 C 140 180, 180 60, 300 70 C 400 80, 440 160, 520 130',
  },
  {
    id: 'top-right',
    className: '-top-10 -right-16 sm:-top-12 sm:-right-20',
    rotate: 6,
    tone: 'lime',
    // Starts off-screen right at x: 640, curves in, loops, ends with round tip at (80, 140)
    pathD:
      'M 640 90 C 520 80, 420 180, 340 180 C 260 180, 280 70, 370 70 C 450 70, 440 210, 310 200 C 200 190, 150 110, 60 120',
  },
  {
    id: 'mid-left',
    className: 'top-[34%] -left-16 sm:top-[36%] sm:-left-20',
    rotate: 2,
    tone: 'forest',
    // Starts off-screen left at x: -40, double-loops, ends with round tip at (500, 110)
    pathD:
      'M -40 160 C 80 180, 160 60, 240 70 C 320 80, 290 190, 200 180 C 130 170, 170 50, 290 60 C 380 70, 420 150, 510 100',
  },
  {
    id: 'mid-right',
    className: 'top-[38%] -right-16 sm:top-[40%] sm:-right-20',
    rotate: -4,
    tone: 'cobalt',
    // Starts off-screen right at x: 640, loops gracefully, ends with round tip at (70, 130)
    pathD:
      'M 640 170 C 510 190, 430 80, 350 80 C 270 80, 290 190, 380 180 C 460 170, 430 60, 310 70 C 200 80, 140 150, 70 110',
  },
  {
    id: 'bottom-left',
    className: '-bottom-10 -left-16 sm:-bottom-12 sm:-left-20',
    rotate: -6,
    tone: 'lime',
    // Starts off-screen left at x: -40, curves up into loop, ends with round tip at (490, 120)
    pathD:
      'M -40 190 C 90 210, 170 90, 260 90 C 340 90, 330 200, 230 190 C 150 180, 180 60, 300 70 C 390 80, 430 150, 500 110',
  },
  {
    id: 'bottom-right',
    className: '-bottom-10 -right-16 sm:-bottom-12 sm:-right-20',
    rotate: 8,
    tone: 'forest',
    // Starts off-screen right at x: 640, curves up into loop, ends with round tip at (80, 120)
    pathD:
      'M 640 180 C 510 200, 430 80, 340 80 C 250 80, 270 200, 370 190 C 450 180, 420 60, 290 70 C 190 80, 140 150, 80 100',
  },
] as const

const TONE_CLASSES = {
  cobalt: 'text-brand-cobalt opacity-45',
  lime: 'text-brand-lime opacity-80',
  forest: 'text-brand-forest opacity-40',
} as const

const DRAW_MS = 2400
const RETRACT_MS = 1800
const HOLD_MIN_MS = 4000
const HOLD_MAX_MS = 8000
const CYCLE_TAIL_MS = 500

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function randomHold(): number {
  return HOLD_MIN_MS + Math.round(Math.random() * (HOLD_MAX_MS - HOLD_MIN_MS))
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export function ComingSoonSquiggles() {
  const [holds, setHolds] = useState<number[]>(() => ZONES.map(() => randomHold()))
  const [nonces, setNonces] = useState<number[]>(() => ZONES.map(() => 0))
  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersReducedMotion)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    setReducedMotion(query.matches)

    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const cycleDuration = DRAW_MS + HOLD_MAX_MS + RETRACT_MS + CYCLE_TAIL_MS

    // Stagger timers across the 6 equalized zones so they draw rhythmically
    const timers = ZONES.map((_, index) => {
      const initialDelay = index * 1400

      let intervalId: number | null = null
      const timeoutId = window.setTimeout(() => {
        intervalId = window.setInterval(() => {
          setHolds((current) => {
            const next = current.slice()
            next[index] = randomHold()
            return next
          })
          setNonces((current) => {
            const next = current.slice()
            next[index] += 1
            return next
          })
        }, cycleDuration + index * 300)
      }, initialDelay)

      return {
        clear: () => {
          window.clearTimeout(timeoutId)
          if (intervalId !== null) window.clearInterval(intervalId)
        },
      }
    })

    return () => {
      timers.forEach((t) => t.clear())
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div
      aria-hidden="true"
      className="soon-squiggle-layer pointer-events-none absolute inset-0 overflow-hidden"
    >
      {ZONES.map((zone, index) => {
        const retractDelay = DRAW_MS + holds[index]
        const toneClass = TONE_CLASSES[zone.tone]

        return (
          <div
            key={`soon-zone-${zone.id}-${nonces[index]}`}
            className={`absolute ${zone.className} pointer-events-none select-none`}
            style={{
              width: 'min(580px, 60vw)',
              height: 'auto',
              transform: `rotate(${zone.rotate}deg)`,
              overflow: 'visible',
            }}
          >
            <svg
              viewBox="0 0 600 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
              className={`h-auto w-full ${toneClass}`}
              style={{ overflow: 'visible' }}
            >
              <path
                d={zone.pathD}
                pathLength="1"
                strokeDasharray="1"
                stroke="currentColor"
                strokeWidth={42}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="soon-squiggle-path"
                style={
                  {
                    '--soon-draw': `${DRAW_MS}ms`,
                    '--soon-retract': `${RETRACT_MS}ms`,
                    '--soon-retract-delay': `${retractDelay}ms`,
                  } as CSSProperties
                }
              />
            </svg>
          </div>
        )
      })}
    </div>
  )
}
