/**
 * Prelaunch gate state and the two hidden unlock gestures.
 * Source: decisions.md D-015 items 1 to 5, plans/coming-soon-wall-plan.md section 6.
 *
 * The wall sits above the room provider, so nothing here touches the P2P layer.
 * Both gestures are invisible on purpose: no page renders a hint, a badge, or a
 * label for either one.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { LAUNCH_UNLOCK_KEY } from '../lib/constants'

/** Three taps inside this window unlock the wall. */
const DEFAULT_TAP_WINDOW_MS = 900

export type LaunchGate = {
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(LAUNCH_UNLOCK_KEY) === '1'
  } catch {
    // Safari private mode throws on localStorage access. A failed read is locked.
    return false
  }
}

/**
 * `unlocked` is the only value the app reads. `lock` exists so a device can be
 * put back behind the wall without clearing site data; nothing renders it.
 */
export function useLaunchGate(): LaunchGate {
  const [unlocked, setUnlocked] = useState(readUnlocked)

  const unlock = useCallback(() => {
    try {
      window.localStorage.setItem(LAUNCH_UNLOCK_KEY, '1')
    } catch {
      // A refused write still unlocks this session, it just re-locks on reload.
    }
    setUnlocked(true)
  }, [])

  const lock = useCallback(() => {
    try {
      window.localStorage.removeItem(LAUNCH_UNLOCK_KEY)
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
    setUnlocked(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Held keys must not re-fire, and macOS clover combinations stay untouched.
      if (event.repeat || event.metaKey) return
      if (!event.ctrlKey || !event.altKey) return

      const isC = event.code === 'KeyC' || event.key.toLowerCase() === 'c'
      if (!isC) return

      event.preventDefault()
      unlock()
    }

    // Capture phase, so the combo works no matter where focus sits.
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [unlock])

  return { unlocked, unlock, lock }
}

export type TripleTapLogo = {
  onPointerDown: (event: { button?: number }) => void
}

/**
 * Tap the logo three times fast to unlock.
 *
 * `onPointerDown` is used instead of `onClick` so the installed PWA and iOS
 * Safari respond immediately, without the 300ms click delay. A tap that lands
 * after the window has closed starts a fresh count at one.
 *
 * Only a primary pointer counts. Right and middle clicks reach `pointerdown`
 * too, and neither one is a tap.
 */
export function useTripleTapLogo(
  onUnlock: () => void,
  windowMs: number = DEFAULT_TAP_WINDOW_MS,
): TripleTapLogo {
  const tapsRef = useRef<number[]>([])

  useEffect(
    () => () => {
      tapsRef.current = []
    },
    [],
  )

  const onPointerDown = useCallback(
    (event: { button?: number }): void => {
      // Secondary and auxiliary buttons are clicks, not taps.
      if (event.button !== undefined && event.button !== 0) return

      const now = Date.now()
      const recent = tapsRef.current.filter((tap) => now - tap <= windowMs)
      recent.push(now)

      if (recent.length >= 3) {
        tapsRef.current = []
        onUnlock()
        return
      }

      tapsRef.current = recent
    },
    [onUnlock, windowMs],
  )

  return { onPointerDown }
}
