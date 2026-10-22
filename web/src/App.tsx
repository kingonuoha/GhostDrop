import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { GhostRoomProvider } from './components/shell/GhostRoomProvider'
import type { RoomSession } from './components/shell/GhostRoomProvider'
import { AppShell } from './components/shell/AppShell'
import { useLaunchGate } from './hooks/useLaunchGate'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './lib/p2p'
import { matchRoomPath, useRoute } from './lib/router'
import { ComingSoon } from './pages/ComingSoon'
import { ConnectedWorkspace } from './pages/ConnectedWorkspace'
import { HomeHub } from './pages/HomeHub'
import { HowItWorks } from './pages/HowItWorks'
import { MobileJoin } from './pages/MobileJoin'
import { NotFound } from './pages/NotFound'
import { WhatsNew } from './pages/WhatsNew'

/**
 * The hub code is generated once per browser session. Without crypto it stays
 * null and the room surfaces the playful "check that code" card instead.
 */
function createHubCode(): string | null {
  try {
    return generateRoomCode()
  } catch {
    return null
  }
}

/**
 * Reads the room a route asks for. Null means "this page does not name a room",
 * so App keeps the session it already has and a host reading How It Works never
 * drops the peer.
 */
function requestedSession(
  path: string,
  query: URLSearchParams,
  hubCode: string | null,
): RoomSession | null {
  if (path === '/') return { code: hubCode, role: 'host' }

  const roomCode = matchRoomPath(path)
  if (roomCode) {
    return { code: roomCode, role: query.get('host') === '1' ? 'host' : 'peer' }
  }

  if (path === '/join') {
    const raw = query.get('room')
    if (!raw) return null
    const code = normalizeRoomCode(raw)
    return isValidRoomCode(code) ? { code, role: 'peer' } : null
  }

  return null
}

/**
 * The unlocked app: router, session and the room provider.
 *
 * Everything in here, including the `useState(createHubCode)` hub code
 * allocation, only exists once the gate opens. Keeping it in a child component
 * is what guarantees a locked visitor never evaluates `generateRoomCode()`.
 */
function GhostDropApp() {
  const { path, query } = useRoute()
  const normalizedPath = path.length > 1 ? path.replace(/\/+$/, '') : path

  const [initialHubCode] = useState(createHubCode)
  /** A host that opened a room link carries that same code back to the hub. */
  const hubCodeRef = useRef<string | null>(initialHubCode)

  const requested = requestedSession(normalizedPath, query, hubCodeRef.current)
  const sessionRef = useRef<RoomSession | null>(requested)

  if (requested) {
    if (requested.role === 'host' && requested.code) hubCodeRef.current = requested.code

    const current = sessionRef.current
    // Comparing by code and role keeps one stable object, so an identical
    // session never restarts the engine.
    if (!current || current.code !== requested.code || current.role !== requested.role) {
      sessionRef.current = requested
    }
  }

  const session = sessionRef.current

  let page: ReactNode
  if (normalizedPath === '/') {
    page = <HomeHub />
  } else if (matchRoomPath(normalizedPath)) {
    page = <ConnectedWorkspace />
  } else if (normalizedPath === '/join') {
    page = <MobileJoin roomCode={query.get('room')} />
  } else if (normalizedPath === '/how-it-works') {
    page = <HowItWorks />
  } else if (normalizedPath === '/whats-new') {
    page = <WhatsNew />
  } else {
    page = <NotFound />
  }

  return (
    <GhostRoomProvider session={session}>
      <AppShell>{page}</AppShell>
    </GhostRoomProvider>
  )
}

/**
 * Launch gate. The teaser renders ABOVE the P2P runtime, so while locked there
 * is no room provider, no shell provider, no `/peerjs` socket, no room peer id
 * and no ICE gathering. Source: decisions.md D-015 items 1 and 2.
 */
export default function App() {
  const { unlocked, unlock } = useLaunchGate()

  if (!unlocked) return <ComingSoon onUnlock={unlock} />

  return <GhostDropApp />
}
