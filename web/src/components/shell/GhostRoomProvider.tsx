/**
 * App level room session.
 * Source: docs/tasks/step-08-brand-motion-and-copy-polish/post-gate-connection-repair.md
 *
 * One provider above the route switch owns the only `useGhostRoom` call, so the
 * signaling engine outlives every page. Moving from the hub to the workspace or
 * reading How It Works can no longer destroy a live room and drop the peer.
 */

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useGhostRoom } from '../../hooks/useGhostRoom'
import type { GhostRoom } from '../../hooks/useGhostRoom'
import type { PeerRole } from '../../lib/p2p'

export type RoomSession = {
  /** Six letter room code, or null when no room is requested yet. */
  code: string | null
  role: PeerRole
}

export type GhostRoomContextValue = GhostRoom & {
  sessionCode: string | null
  sessionRole: PeerRole
}

const GhostRoomContext = createContext<GhostRoomContextValue | null>(null)

type GhostRoomProviderProps = {
  /** Derived from the route in App.tsx. Null means no room was requested. */
  session: RoomSession | null
  children: ReactNode
}

export function GhostRoomProvider({ session, children }: GhostRoomProviderProps) {
  const room = useGhostRoom({
    roomCode: session?.code ?? null,
    role: session?.role,
    autoConnect: Boolean(session),
  })

  const value: GhostRoomContextValue = {
    ...room,
    sessionCode: session?.code ?? null,
    sessionRole: session?.role ?? room.role,
  }

  return <GhostRoomContext.Provider value={value}>{children}</GhostRoomContext.Provider>
}

export function useGhostRoomContext(): GhostRoomContextValue {
  const value = useContext(GhostRoomContext)
  if (!value) {
    throw new Error('useGhostRoomContext must be used inside GhostRoomProvider')
  }
  return value
}
