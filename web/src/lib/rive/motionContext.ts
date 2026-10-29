import { createContext, useCallback, useContext } from 'react'

/**
 * Shared surface for the Rive motion layer.
 *
 * This module is deliberately free of any `@rive-app` import. It is the only
 * Rive file that the everyday UI components reach, so the 650KB runtime stays
 * inside the lazily loaded `RiveSurface` chunk instead of the first paint
 * bundle. Source: docs/tasks/rive-motion/brief.md phase 2, constraints.
 */

/** Every trigger authored in `ghostdrop-motion.riv`, across the four artboards. */
export type RiveMotionInputName =
  | 'press'
  | 'success'
  | 'connect'
  | 'error'
  | 'launch'
  | 'vanish'

/**
 * The parts of a live Rive instance the light layer is allowed to touch.
 *
 * Typed structurally, rather than imported, so this module never drags the
 * runtime into a component that only needs the type.
 */
export interface RiveInstanceLike {
  readonly stateMachineInputs: (
    name: string,
  ) => ReadonlyArray<{ readonly name: string; fire: () => void }> | undefined
}

/**
 * Rive layout choices, spelled as their own strings so the light layer never
 * has to import the enums (the enum objects live in the runtime bundle).
 */
export type RiveFitName =
  | 'contain'
  | 'cover'
  | 'fill'
  | 'fitWidth'
  | 'fitHeight'
  | 'none'
  | 'scaleDown'
  | 'layout'

export type RiveAlignmentName =
  | 'center'
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'centerLeft'
  | 'centerRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'

/** Matches `Fit.Contain`, the brief's default. */
export const RIVE_DEFAULT_FIT: RiveFitName = 'contain'
/** Matches `Alignment.Center`, the brief's default. */
export const RIVE_DEFAULT_ALIGNMENT: RiveAlignmentName = 'center'

/**
 * One mounted canvas hands its trigger table to every descendant through this
 * value, so a sibling control can fire an animation it does not own.
 */
export interface RiveMotionApi {
  /** Fires one trigger input. Silent no-op while the file is still loading. */
  readonly fire: (input: RiveMotionInputName) => void
  /** True once the canvas has loaded and the trigger table is live. */
  readonly ready: boolean
}

export const RiveMotionContext = createContext<RiveMotionApi | null>(null)

/** The nearest canvas trigger table, or null when there is no Rive nearby. */
export function useRiveMotion(): RiveMotionApi | null {
  return useContext(RiveMotionContext)
}

/**
 * Stable `fire()` callback for one named input of the nearest canvas.
 * Safe to call from a pointer handler or an effect: a canvas that is still
 * loading, or an input the artboard does not carry, simply does nothing.
 */
export function useRiveFire(input: RiveMotionInputName): () => void {
  const motion = useRiveMotion()

  return useCallback(() => {
    motion?.fire(input)
  }, [motion, input])
}
