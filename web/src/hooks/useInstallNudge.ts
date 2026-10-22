import { useCallback, useEffect, useRef, useState } from 'react'
import { usePwaInstall } from './usePwaInstall'
import { useGhostRoomContext } from '../components/shell/GhostRoomProvider'

const NUDGE_DISMISSED_KEY = 'ghostdrop.install.nudge_dismissed'
const NUDGE_DELAY_MS = 2400

function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}

export function useInstallNudge() {
  const { isInstalled, canInstall, promptInstall, isPrompting } = usePwaInstall()
  const room = useGhostRoomContext()
  const { items, feedback } = room

  const [visible, setVisible] = useState(false)
  const [hasTransferred, setHasTransferred] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Check if transfer succeeded
  useEffect(() => {
    if (hasTransferred) return

    const feedbackKey = feedback?.key
    const transferSuccess =
      items.length > 0 ||
      feedbackKey === 'SUCCESS_FILE_SENT' ||
      feedbackKey === 'SUCCESS_TEXT_SENT' ||
      feedbackKey === 'SUCCESS_TEXT_RECEIVED' ||
      feedbackKey === 'SUCCESS_SAVED' ||
      feedbackKey === 'SUCCESS_DROP_AND_NUKE'

    if (transferSuccess) {
      setHasTransferred(true)
    }
  }, [items.length, feedback, hasTransferred])

  // Trigger nudge with delay after first transfer
  useEffect(() => {
    if (!hasTransferred || isInstalled) return

    try {
      if (localStorage.getItem(NUDGE_DISMISSED_KEY) === 'true') {
        return
      }
    } catch {
      // LocalStorage blocked, continue in memory
    }

    timerRef.current = window.setTimeout(() => {
      setVisible(true)
    }, NUDGE_DELAY_MS)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [hasTransferred, isInstalled])

  const dismiss = useCallback(() => {
    setVisible(false)
    try {
      localStorage.setItem(NUDGE_DISMISSED_KEY, 'true')
    } catch {
      // Ignore storage errors
    }
  }, [])

  const install = useCallback(async (): Promise<boolean> => {
    const success = await promptInstall()
    if (success) {
      setVisible(false)
      try {
        localStorage.setItem(NUDGE_DISMISSED_KEY, 'true')
      } catch {
        // Ignore storage errors
      }
    }
    return success
  }, [promptInstall])

  return {
    visible,
    dismiss,
    install,
    isPrompting,
    canInstall,
    isInstalled,
    isIos: isIosDevice(),
  }
}
