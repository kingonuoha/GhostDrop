import { useEffect, useRef } from 'react'
import { useRiveFire, useRiveMotion } from '../../lib/rive/motionContext'
import type { RiveMotionInputName } from '../../lib/rive/motionContext'

type MotionPulseProps = {
  input: RiveMotionInputName
  /**
   * Increments once per event. The first non zero value fires on mount, so a
   * notice that appears already armed plays its entrance animation.
   */
  pulse: number
}

/**
 * Fires a trigger when a counter steps forward.
 *
 * It renders nothing and sits inside a `RiveCanvas`, so a component that owns
 * the event can celebrate without owning the canvas. A pulse raised before the
 * file has loaded is held, not dropped: the effect runs again the moment the
 * trigger table goes live, which is what makes an on-mount animation reliable
 * behind a lazily loaded runtime.
 */
export function MotionPulse({ input, pulse }: MotionPulseProps) {
  const motion = useRiveMotion()
  const fire = useRiveFire(input)
  const firedRef = useRef<number | null>(null)
  const ready = motion?.ready ?? false

  useEffect(() => {
    if (pulse === 0) return
    if (firedRef.current === pulse) return
    if (!ready) return
    firedRef.current = pulse
    fire()
  }, [pulse, ready, fire])

  return null
}
