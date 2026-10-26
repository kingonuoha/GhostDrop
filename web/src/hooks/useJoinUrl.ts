/**
 * Pairing link and LAN address choices for one room.
 * Source: decisions.md D-014 item 2, docs/tasks/step-11-improvements/brief.md 0.3 item 3.
 *
 * Why this is a hook: the hub card and the in-room QR drawer must encode the
 * exact same link. A phone that scans `localhost` reaches itself, so a loopback
 * page prefers a real Wi-Fi or hotspot address whenever the dev server reports
 * one. The read is fail soft, and a production host without the middleware
 * simply keeps the page origin.
 */

import { useEffect, useMemo, useState } from 'react'
import { fetchLanInfo, resolveJoinOrigin } from '../lib/lanInfo'
import type { LanCandidate } from '../lib/lanInfo'

export interface JoinUrlState {
  /** Link the other screen opens: `${origin}/join?room=${code}`, plus any direct link code. */
  joinUrl: string
  /** Real Wi-Fi and hotspot origins the QR code may point at. */
  lanCandidates: readonly LanCandidate[]
  /** Currently selected LAN origin, when the page is on loopback. */
  activeLanUrl: string | null
  /** Switches the QR code between two real network adapters. */
  setActiveLanUrl: (url: string | null) => void
}

export function useJoinUrl(
  roomCode: string | null,
  offlineInviteToken: string | null,
): JoinUrlState {
  /**
   * Real Wi-Fi and hotspot addresses reported by the dev server. Empty in a
   * production build without the middleware, and the QR code then simply keeps
   * the page origin.
   */
  const [lanCandidates, setLanCandidates] = useState<readonly LanCandidate[]>([])
  const [activeLanUrl, setActiveLanUrl] = useState<string | null>(null)

  // One fail soft read on mount so a phone never scans a `localhost` code.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const info = await fetchLanInfo()
      if (cancelled || !info || info.candidates.length === 0) return
      setLanCandidates(info.candidates)
      setActiveLanUrl(info.candidates[0].url)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const joinUrl = useMemo(() => {
    const origin = typeof window === 'undefined' ? '' : window.location.origin
    const hostname = typeof window === 'undefined' ? undefined : window.location.hostname
    const base = resolveJoinOrigin(origin, hostname, lanCandidates, activeLanUrl)
    const baseJoinUrl = `${base}/join?room=${roomCode ?? ''}`
    // The direct link code rides along in the fragment, so a phone camera app
    // that opens this link finishes the offline handshake with no second scan.
    return offlineInviteToken
      ? `${baseJoinUrl}#gd=${offlineInviteToken}`
      : baseJoinUrl
  }, [activeLanUrl, lanCandidates, offlineInviteToken, roomCode])

  return { joinUrl, lanCandidates, activeLanUrl, setActiveLanUrl }
}
