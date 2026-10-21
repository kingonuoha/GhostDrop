/**
 * 1 second TTL sweep for the ephemeral store.
 * Source: docs/00-prd-source-of-truth.md FR-1.5 and decisions.md D-004.
 *
 * The hook only schedules work. Every memory rule lives in EphemeralStore, so
 * unmounting this hook can never leave a URL behind.
 * No window access at module scope, so an SSR render is safe.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { EphemeralItem } from '../types/protocol'
import type { EphemeralStore } from '../lib/p2p/janitor'
import { getRemainingMs } from '../lib/p2p/janitor'

export const TTL_SWEEP_INTERVAL_MS = 1000

export interface TtlJanitorOptions {
  store: EphemeralStore
  /** Sweep cadence in milliseconds. Defaults to 1000 and is floored at 250. */
  intervalMs?: number
  /** Called once per sweep with the ids that expired. Raise one notice here. */
  onExpire?: (expiredIds: readonly string[]) => void
  enabled?: boolean
}

export interface TtlJanitorResult {
  items: readonly EphemeralItem[]
  /** Store clock at the last sweep, for countdown text. */
  now: number
  /** Remaining ms for one item, or null when it has no timer. */
  remainingMs: (id: string) => number | null
}

export function useTtlJanitor({
  store,
  intervalMs = TTL_SWEEP_INTERVAL_MS,
  onExpire,
  enabled = true,
}: TtlJanitorOptions): TtlJanitorResult {
  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [now, setNow] = useState(() => store.now())

  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!enabled) return

    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    const tick = () => {
      if (!active) return
      const timestamp = store.now()
      const expired = store.sweep(timestamp)
      if (!active) return
      if (expired.length > 0) onExpireRef.current?.(expired)
      setNow(timestamp)
    }

    tick()
    timer = setInterval(tick, Math.max(250, intervalMs))

    return () => {
      active = false
      if (timer !== null) clearInterval(timer)
      timer = null
    }
  }, [store, intervalMs, enabled])

  const remainingMs = useCallback(
    (id: string): number | null => {
      const item = items.find((candidate) => candidate.id === id)
      if (!item) return null
      return getRemainingMs(item, now)
    },
    [items, now],
  )

  return { items, now, remainingMs }
}
