/**
 * Install prompt state for the mobile install card.
 * Source: docs/00-prd-source-of-truth.md FR-1.6, decisions.md D-004.
 *
 * `beforeinstallprompt` only fires on browsers that support install prompts, so
 * every path here is optional. Unsupported browsers, an installed app, or a
 * blocked prompt all resolve to `canInstall === false` instead of throwing.
 */

import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaInstall {
  /** True only while a real install prompt is parked and the app is not installed. */
  canInstall: boolean
  isInstalled: boolean
  isPrompting: boolean
  /** Resolves true when the user accepted, false for dismissed or unsupported. */
  promptInstall: () => Promise<boolean>
}

function readStandalone(): boolean {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  const standaloneMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null

  return (standaloneMedia?.matches ?? false) || navigatorWithStandalone.standalone === true
}

export function usePwaInstall(): PwaInstall {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(readStandalone)
  const [isPrompting, setIsPrompting] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstall = (event: Event): void => {
      // Keep the event so the card can raise the prompt from a real tap.
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = (): void => {
      setIsInstalled(true)
      setPromptEvent(null)
    }

    const standaloneMedia =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null

    const handleDisplayMode = (): void => setIsInstalled(readStandalone())

    setIsInstalled(readStandalone())
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    standaloneMedia?.addEventListener('change', handleDisplayMode)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
      standaloneMedia?.removeEventListener('change', handleDisplayMode)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const event = promptEvent
    if (!event || isInstalled || isPrompting) return false

    setIsPrompting(true)
    try {
      await event.prompt()
      const choice = await event.userChoice
      const accepted = choice.outcome === 'accepted'
      if (accepted) setIsInstalled(true)
      setPromptEvent(null)
      return accepted
    } catch {
      // A browser that refuses the prompt simply keeps the card out of the way.
      setPromptEvent(null)
      return false
    } finally {
      setIsPrompting(false)
    }
  }, [promptEvent, isInstalled, isPrompting])

  return {
    canInstall: promptEvent !== null && !isInstalled,
    isInstalled,
    isPrompting,
    promptInstall,
  }
}
