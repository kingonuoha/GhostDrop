/**
 * Shell coordination for the mobile dock, the status header, QR modal, and feedback modal.
 * Source: docs/01-wireframe-and-pages.md sections 1 and 2, decisions.md D-008, D-018.
 *
 * The dock is global chrome, so it cannot read a page's room directly. Pages
 * publish their live room state here and register two small actions: focusing
 * the note composer and applying an auto-delete preset to the open room.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_TTL_PRESET } from '../../lib/constants'
import type { TtlPreset } from '../../types/protocol'

export type RoomPresenceStatus = 'connecting' | 'linked' | 'waiting' | 'error'

/** Which handshake step the camera modal is serving. */
export type ScannerMode = 'join' | 'reply'

export type RoomPresence = {
  code: string
  status: RoomPresenceStatus
  /** Friendly device name of the linked screen, never a transport id. */
  peerName: string | null
}

type Cleanup = () => void

export type ShellContextValue = {
  presence: RoomPresence | null
  publishPresence: (presence: RoomPresence | null) => void
  ttlPreset: TtlPreset
  /** Mirrors the open room's own preset back into the dock label. */
  publishTtlPreset: (preset: TtlPreset) => void
  /** Dock action: applies the preset to the room when one is open. */
  selectTtlPreset: (preset: TtlPreset) => void
  registerTtlHandler: (handler: ((preset: TtlPreset) => void) | null) => Cleanup
  /** Returns false when the current page has no composer to focus. */
  focusComposer: () => boolean
  registerComposer: (handler: (() => void) | null) => Cleanup
  scannerOpen: boolean
  /** Step the open modal serves: the first scan, or the reply scan. */
  scannerMode: ScannerMode
  openScanner: (mode?: ScannerMode) => void
  closeScanner: () => void
  feedbackOpen: boolean
  openFeedback: () => void
  closeFeedback: () => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

type ShellProviderProps = {
  children: ReactNode
}

export function ShellProvider({ children }: ShellProviderProps) {
  const [presence, setPresence] = useState<RoomPresence | null>(null)
  const [ttlPreset, setTtlPreset] = useState<TtlPreset>(DEFAULT_TTL_PRESET)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerMode, setScannerMode] = useState<ScannerMode>('join')
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const composerRef = useRef<(() => void) | null>(null)
  const ttlHandlerRef = useRef<((preset: TtlPreset) => void) | null>(null)

  const publishPresence = useCallback((next: RoomPresence | null) => {
    setPresence(next)
  }, [])

  const publishTtlPreset = useCallback((preset: TtlPreset) => {
    setTtlPreset(preset)
  }, [])

  const selectTtlPreset = useCallback((preset: TtlPreset) => {
    setTtlPreset(preset)
    ttlHandlerRef.current?.(preset)
  }, [])

  const registerTtlHandler = useCallback(
    (handler: ((preset: TtlPreset) => void) | null): Cleanup => {
      ttlHandlerRef.current = handler
      return () => {
        if (ttlHandlerRef.current === handler) ttlHandlerRef.current = null
      }
    },
    [],
  )

  const registerComposer = useCallback((handler: (() => void) | null): Cleanup => {
    composerRef.current = handler
    return () => {
      if (composerRef.current === handler) composerRef.current = null
    }
  }, [])

  const focusComposer = useCallback((): boolean => {
    const handler = composerRef.current
    if (!handler) return false
    handler()
    return true
  }, [])

  const openScanner = useCallback((mode: ScannerMode = 'join') => {
    setScannerMode(mode)
    setScannerOpen(true)
  }, [])
  const closeScanner = useCallback(() => setScannerOpen(false), [])

  const openFeedback = useCallback(() => setFeedbackOpen(true), [])
  const closeFeedback = useCallback(() => setFeedbackOpen(false), [])

  const value = useMemo<ShellContextValue>(
    () => ({
      presence,
      publishPresence,
      ttlPreset,
      publishTtlPreset,
      selectTtlPreset,
      registerTtlHandler,
      focusComposer,
      registerComposer,
      scannerOpen,
      scannerMode,
      openScanner,
      closeScanner,
      feedbackOpen,
      openFeedback,
      closeFeedback,
    }),
    [
      presence,
      publishPresence,
      ttlPreset,
      publishTtlPreset,
      selectTtlPreset,
      registerTtlHandler,
      focusComposer,
      registerComposer,
      scannerOpen,
      scannerMode,
      openScanner,
      closeScanner,
      feedbackOpen,
      openFeedback,
      closeFeedback,
    ],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): ShellContextValue {
  const value = useContext(ShellContext)
  if (!value) {
    throw new Error('useShell must be used inside ShellProvider')
  }
  return value
}
