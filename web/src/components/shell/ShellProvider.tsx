/**
 * Shell coordination for the mobile dock, the status header and the QR modal.
 * Source: docs/01-wireframe-and-pages.md sections 1 and 2, decisions.md D-008.
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
  openScanner: () => void
  closeScanner: () => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

type ShellProviderProps = {
  children: ReactNode
}

export function ShellProvider({ children }: ShellProviderProps) {
  const [presence, setPresence] = useState<RoomPresence | null>(null)
  const [ttlPreset, setTtlPreset] = useState<TtlPreset>(DEFAULT_TTL_PRESET)
  const [scannerOpen, setScannerOpen] = useState(false)

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

  const openScanner = useCallback(() => setScannerOpen(true), [])
  const closeScanner = useCallback(() => setScannerOpen(false), [])

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
      openScanner,
      closeScanner,
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
      openScanner,
      closeScanner,
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
