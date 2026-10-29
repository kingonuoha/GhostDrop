import { useEffect, useMemo } from 'react'
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas'
import { RIVE_MOTION_SRC, RIVE_MOTION_TARGETS } from '../../lib/rive/runtime'
import type { RiveMotionTargetName } from '../../lib/rive/runtime'
import type {
  RiveAlignmentName,
  RiveFitName,
  RiveInstanceLike,
  RiveMotionInputName,
} from '../../lib/rive/motionContext'
import { useRiveTrigger } from '../../lib/rive/useRiveTrigger'

const FIT_MAP: Record<RiveFitName, Fit> = {
  contain: Fit.Contain,
  cover: Fit.Cover,
  fill: Fit.Fill,
  fitWidth: Fit.FitWidth,
  fitHeight: Fit.FitHeight,
  none: Fit.None,
  scaleDown: Fit.ScaleDown,
  layout: Fit.Layout,
}

const ALIGNMENT_MAP: Record<RiveAlignmentName, Alignment> = {
  center: Alignment.Center,
  topLeft: Alignment.TopLeft,
  topCenter: Alignment.TopCenter,
  topRight: Alignment.TopRight,
  centerLeft: Alignment.CenterLeft,
  centerRight: Alignment.CenterRight,
  bottomLeft: Alignment.BottomLeft,
  bottomCenter: Alignment.BottomCenter,
  bottomRight: Alignment.BottomRight,
}

export type RiveSurfaceProps = {
  target: RiveMotionTargetName
  fit: RiveFitName
  alignment: RiveAlignmentName
  /** True when the reader asked for less motion. Holds the resting frame. */
  reducedMotion: boolean
  onReady?: (rive: RiveInstanceLike) => void
  /**
   * Publishes the trigger table for this canvas. The returned function clears
   * it again when the canvas goes away.
   */
  onFireReady: (fire: (input: RiveMotionInputName) => void) => () => void
}

/**
 * The only module that mounts a Rive canvas.
 *
 * It is reached through `React.lazy` from `RiveCanvas.tsx`, so the runtime and
 * the state machines load after first paint and never block the shell. The
 * canvas is decorative from top to bottom: no listeners, no focus, no
 * interaction of its own.
 *
 * Offscreen pausing comes from `useRive`'s intersection observer, which is left
 * at its documented default of enabled. Source: docs/tasks/rive-motion/brief.md.
 */
export function RiveSurface({
  target,
  fit,
  alignment,
  reducedMotion,
  onReady,
  onFireReady,
}: RiveSurfaceProps) {
  const { artboard, stateMachine } = RIVE_MOTION_TARGETS[target]

  const layout = useMemo(
    () => new Layout({ fit: FIT_MAP[fit], alignment: ALIGNMENT_MAP[alignment] }),
    [fit, alignment],
  )

  const { rive, RiveComponent, setContainerRef } = useRive(
    {
      src: RIVE_MOTION_SRC,
      artboard,
      stateMachine,
      autoplay: !reducedMotion,
      layout,
    },
    {
      useDevicePixelRatio: true,
      shouldResizeCanvasToContainer: true,
    },
  )

  const press = useRiveTrigger(rive, target, 'press')
  const success = useRiveTrigger(rive, target, 'success')
  const connect = useRiveTrigger(rive, target, 'connect')
  const error = useRiveTrigger(rive, target, 'error')
  const launch = useRiveTrigger(rive, target, 'launch')
  const vanish = useRiveTrigger(rive, target, 'vanish')

  useEffect(() => {
    const table: Record<RiveMotionInputName, () => void> = {
      press,
      success,
      connect,
      error,
      launch,
      vanish,
    }

    return onFireReady((input) => {
      table[input]()
    })
  }, [press, success, connect, error, launch, vanish, onFireReady])

  useEffect(() => {
    if (!rive) return
    onReady?.(rive)
  }, [rive, onReady])

  /**
   * Reduced motion paints one frame and holds it. Turning the preference off
   * again resumes the idle loop, so the switch is live rather than load time
   * only, per docs/05-motion-spec.md section 1 item 4.
   */
  useEffect(() => {
    if (!rive) return

    if (reducedMotion) {
      rive.play()
      rive.pause()
      return
    }

    rive.play()
  }, [rive, reducedMotion])

  return (
    <div ref={setContainerRef} className="h-full w-full">
      <RiveComponent className="h-full w-full" />
    </div>
  )
}

export default RiveSurface
