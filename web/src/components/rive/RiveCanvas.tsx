import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { RiveMotionTargetName } from '../../lib/rive/runtime'
import {
  RIVE_DEFAULT_ALIGNMENT,
  RIVE_DEFAULT_FIT,
  RiveMotionContext,
} from '../../lib/rive/motionContext'
import type {
  RiveAlignmentName,
  RiveFitName,
  RiveInstanceLike,
  RiveMotionApi,
  RiveMotionInputName,
} from '../../lib/rive/motionContext'
import { useReducedMotion } from '../../lib/rive/useReducedMotion'

/**
 * The Rive runtime, its WASM loader and the four state machines, split out of
 * the first paint bundle. The chunk downloads on the first canvas that mounts
 * and is precached afterwards, so the app still works offline.
 */
const RiveSurface = lazy(() => import('./RiveSurface').then((module) => ({ default: module.RiveSurface })))

type RiveCanvasProps = {
  /** Artboard and state machine pair, resolved from `RIVE_MOTION_TARGETS`. */
  target: RiveMotionTargetName
  className?: string
  style?: CSSProperties
  fit?: RiveFitName
  alignment?: RiveAlignmentName
  /** Receives the live instance once the file has loaded. */
  onReady?: (rive: RiveInstanceLike) => void
  /** Shown instead of the canvas when the reader prefers reduced motion. */
  fallback?: ReactNode
  /** Siblings that fire triggers, such as a pulse watcher. */
  children?: ReactNode
}

/**
 * Decorative motion canvas with a single, small API.
 *
 * The canvas lives inside an `aria-hidden` wrapper and carries no interactive
 * content: every control that offers the animation keeps its own real DOM
 * button, label and focus ring. Descendants reach the trigger table through
 * `RiveMotionContext`, so one component can fire an animation another one
 * mounted.
 *
 * Source: docs/tasks/rive-motion/brief.md phase 2, docs/05-motion-spec.md.
 */
export function RiveCanvas({
  target,
  className,
  style,
  fit = RIVE_DEFAULT_FIT,
  alignment = RIVE_DEFAULT_ALIGNMENT,
  onReady,
  fallback = null,
  children,
}: RiveCanvasProps) {
  const reducedMotion = useReducedMotion()
  const fireRef = useRef<((input: RiveMotionInputName) => void) | null>(null)
  const [ready, setReady] = useState(false)

  // One value for the life of the canvas, so descendants never re-render when
  // the file finishes loading. `ready` is the single exception: a trigger that
  // arrives before the file is up waits one render and then plays, instead of
  // being swallowed by a canvas that is not there yet.
  const api = useMemo<RiveMotionApi>(
    () => ({
      ready,
      fire: (input) => {
        fireRef.current?.(input)
      },
    }),
    [ready],
  )

  const handleFireReady = useCallback((fire: (input: RiveMotionInputName) => void) => {
    fireRef.current = fire
    setReady(true)
    return () => {
      if (fireRef.current === fire) fireRef.current = null
    }
  }, [])

  // Reduced motion with a fallback never downloads or paints the canvas at all.
  const staticOnly = reducedMotion && fallback !== null

  return (
    <RiveMotionContext.Provider value={api}>
      {staticOnly ? null : (
        <div aria-hidden="true" className={className} style={style}>
          <Suspense fallback={fallback}>
            <RiveSurface
              target={target}
              fit={fit}
              alignment={alignment}
              reducedMotion={reducedMotion}
              onReady={onReady}
              onFireReady={handleFireReady}
            />
          </Suspense>
        </div>
      )}
      {staticOnly ? fallback : null}
      {children}
    </RiveMotionContext.Provider>
  )
}
