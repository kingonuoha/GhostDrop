/**
 * Two way bridge between the open room and the global shell chrome.
 * Source: docs/tasks/step-11-improvements/brief.md section 0.3 item 1.
 *
 * Why a separate component: `App.tsx` renders `GhostRoomProvider` ABOVE
 * `AppShell`, and `ShellProvider` lives inside `AppShell`, so the room provider
 * cannot read the shell itself. Mounting this null rendering component inside
 * `ShellChrome` is the one place where both contexts are reachable, so the
 * desktop timer pill and the mobile dock can never disagree with the room.
 *
 * Exactly one registration exists here. Pages must not publish or register a
 * second handler, because the last writer would silently win.
 */

import { useEffect } from 'react'
import { useGhostRoomContext } from './GhostRoomProvider'
import { useShell } from './ShellProvider'

export function RoomShellSync(): null {
  const room = useGhostRoomContext()
  const { publishTtlPreset, registerTtlHandler } = useShell()

  // The room owns the preset, so every page change and every preset change
  // reaches both navbars through one path.
  useEffect(() => {
    publishTtlPreset(room.ttlPreset)
  }, [publishTtlPreset, room.ttlPreset])

  // A navbar selection is applied back to the room and retimes live items.
  useEffect(
    () => registerTtlHandler(room.setTtlPreset),
    [registerTtlHandler, room.setTtlPreset],
  )

  return null
}
