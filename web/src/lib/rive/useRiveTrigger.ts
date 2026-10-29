import { useCallback } from 'react'
import { useStateMachineInput } from '@rive-app/react-canvas'
import type { Rive } from '@rive-app/react-canvas'
import { RIVE_MOTION_TARGETS } from './runtime'
import type { RiveMotionTargetName } from './runtime'
import type { RiveMotionInputName } from './motionContext'

/**
 * Resolves one trigger input on a live Rive instance and returns a stable
 * `fire()` callback for it.
 *
 * This module imports `@rive-app/react-canvas`, so it must only ever be reached
 * from `RiveSurface.tsx`. That keeps the runtime inside the lazily loaded chunk.
 *
 * `useStateMachineInput` returns null until the file has loaded and while the
 * named input does not exist on the artboard, and `fire` checks it on every
 * call, so an early trigger is a silent no-op rather than an error. Triggers
 * fire from the idle state only and self reset by exit time, so re-firing needs
 * no manual reset. Source: docs/tasks/rive-motion/brief.md, approved artboards.
 */
export function useRiveTrigger(
  rive: Rive | null,
  targetName: RiveMotionTargetName,
  inputName: RiveMotionInputName,
): () => void {
  const stateMachine = RIVE_MOTION_TARGETS[targetName].stateMachine
  const input = useStateMachineInput(rive, stateMachine, inputName)

  return useCallback(() => {
    input?.fire()
  }, [input])
}
