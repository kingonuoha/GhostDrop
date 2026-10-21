/**
 * Boot claim for OS share sheet drops.
 * Source: docs/06-protocol-and-tech-spec.md section 4, decisions.md D-004.
 *
 * The service worker parks a share in IndexedDB and redirects to `/?shared=1`.
 * The hub claims that slot once, stages the files and text through the existing
 * pending-drop handoff, strips the query so a refresh cannot replay it, and
 * raises the playful toast. `Beam Now` then opens the live room, where the
 * staged drop flies as soon as the other screen is linked.
 *
 * The claim promise is module scoped so StrictMode's double mount and any later
 * hub mount can never read the same share twice.
 */

import { useCallback, useEffect, useState } from 'react'
import { buildFeedback } from '../lib/copyDeck'
import type { RoomFeedback } from '../lib/copyDeck'
import { stashPendingDrop } from '../lib/pendingDrop'
import { sharePayloadToFiles, takeSharePayload } from '../lib/shareHandoff'

export interface ShareIntake {
  notice: RoomFeedback | null
  dismiss: () => void
}

let claimPromise: Promise<RoomFeedback | null> | null = null
let claimSettled = false

/** Removes only the `shared` flag, so the rest of the URL survives untouched. */
function stripSharedQuery(): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  if (!url.searchParams.has('shared')) return

  url.searchParams.delete('shared')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(null, '', next)
}

async function claimSharedDrop(): Promise<RoomFeedback | null> {
  if (typeof window === 'undefined') return null

  const shared = new URLSearchParams(window.location.search).get('shared')
  if (shared === null) return null

  // Strip before the await so a refresh during the claim cannot replay it.
  stripSharedQuery()

  if (shared === 'error') return buildFeedback('ERR_SHARE_MISSED')

  const payload = await takeSharePayload()
  if (!payload) return buildFeedback('ERR_SHARE_MISSED')

  stashPendingDrop({
    files: sharePayloadToFiles(payload),
    text: payload.text,
  })

  return buildFeedback('SUCCESS_SHARE_CAUGHT')
}

function claimOnce(): Promise<RoomFeedback | null> {
  if (claimSettled) return Promise.resolve(null)
  claimPromise ??= claimSharedDrop()
  return claimPromise
}

function settleClaim(): void {
  claimSettled = true
  claimPromise = null
}

export function useShareIntake(): ShareIntake {
  const [notice, setNotice] = useState<RoomFeedback | null>(null)

  useEffect(() => {
    let active = true

    void claimOnce().then((next) => {
      if (active && next) setNotice(next)
    })

    return () => {
      active = false
    }
  }, [])

  const dismiss = useCallback(() => {
    settleClaim()
    setNotice(null)
  }, [])

  return { notice, dismiss }
}
