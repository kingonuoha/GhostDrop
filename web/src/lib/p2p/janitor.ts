/**
 * Ephemeral memory store and object URL janitor.
 * Source: docs/06-protocol-and-tech-spec.md section 5, decisions.md D-004,
 * docs/00-prd-source-of-truth.md FR-1.5.
 *
 * Rules enforced here, never by callers:
 * - every object URL is created by the store and registered on creation
 * - every removal path revokes exactly once, guarded by a revoked ledger
 * - a duplicate item id is rejected, never silently overwritten
 * - failed items revoke immediately and still expire on their timer
 * - no storage API is touched, items live in this Map only
 * - beforeunload and pagehide revoke everything, and dispose() removes them
 *
 * No React import, no UI strings, no emojis, no em dashes.
 */

import type {
  EphemeralItem,
  EphemeralItemDirection,
  EphemeralItemStatus,
  NukeReason,
} from '../../types/protocol'
import { P2PError } from './errors'

/** Removal reasons are the wire nuke reasons plus local only cleanup causes. */
export type EphemeralRemovalReason = NukeReason | 'CLEARED' | 'TAB_CLOSE'

export type EphemeralRemovalCounts = Record<EphemeralRemovalReason, number>

export interface AddTextInput {
  id?: string
  text: string
  direction: EphemeralItemDirection
  /** Milliseconds until auto-delete, null means no timer (tab close or burn on copy). */
  ttlMs?: number | null
  burnOnCopy?: boolean
  peerId?: string
  status?: EphemeralItemStatus
  createdAt?: number
}

export interface AddFileInput {
  id?: string
  /**
   * Required for a file this device owns. Omitted for an incoming transfer at
   * FILE_START, where the reassembled Blob does not exist yet and arrives
   * later through `completeReceivedFile`.
   */
  file?: Blob
  /** Declared byte count from FILE_START, used only when `file` is absent. */
  size?: number
  fileName: string
  mime?: string
  direction: EphemeralItemDirection
  /** Ignored while `file` is absent: a placeholder's TTL starts at completion. */
  ttlMs?: number | null
  burnOnCopy?: boolean
  peerId?: string
  status?: EphemeralItemStatus
  createdAt?: number
}

/** Options for promoting a placeholder item to `ready` once its bytes land. */
export interface CompleteReceivedFileOptions {
  /** Milliseconds until auto-delete. Undefined keeps the item's own timer. */
  ttlMs?: number | null
  burnOnCopy?: boolean
}

/** Fields a caller may change after creation. `blobUrl` is deliberately absent. */
export type EphemeralItemPatch = Partial<
  Pick<
    EphemeralItem,
    'text' | 'fileName' | 'mime' | 'size' | 'peerId' | 'deleteAt' | 'burnOnCopy' | 'status'
  >
>

export interface EphemeralStoreOptions {
  /** Injectable clock for tests. Defaults to Date.now. */
  now?: () => number
  /** Injectable id factory for tests. Defaults to a monotonic local id. */
  idFactory?: () => string
  /** Set to false to skip window listeners (tests, workers, SSR probes). */
  registerUnloadHooks?: boolean
}

export interface EphemeralStoreStats {
  itemCount: number
  /** URLs currently alive: created minus revoked, for this store lifetime. */
  activeObjectUrlCount: number
  /** URLs ever created by this store. Survives dispose, so leaks stay visible. */
  createdObjectUrlCount: number
  /** URLs revoked at least once. Survives dispose, so leaks stay visible. */
  revokedUrlCount: number
  /**
   * Created but never revoked, and attached to no live item. Anything above
   * zero is a leak, before or after dispose. The unload and dispose paths
   * purge orphans, so a clean store always reports zero.
   */
  leakedObjectUrlCount: number
  version: number
  disposed: boolean
  removals: EphemeralRemovalCounts
}

const EMPTY_SNAPSHOT: readonly EphemeralItem[] = Object.freeze([])

function emptyRemovalCounts(): EphemeralRemovalCounts {
  return {
    TTL_EXPIRED: 0,
    MANUAL_BURN: 0,
    BURN_ON_COPY: 0,
    CLEARED: 0,
    TAB_CLOSE: 0,
  }
}

function resolveDeleteAt(now: number, ttlMs: number | null | undefined, burnOnCopy: boolean): number | null {
  // Burn on copy dies on the first read, not on a timer, so it has no deleteAt.
  if (burnOnCopy) return null
  if (ttlMs === undefined || ttlMs === null) return null
  return now + Math.max(0, ttlMs)
}

/**
 * Only usable statuses own a download link. A failed or already settled item
 * never gets an object URL, so it cannot leak one.
 */
function carriesObjectUrl(status: EphemeralItemStatus): boolean {
  return status === 'ready' || status === 'sending'
}

/**
 * Drops the live Blob reference without touching the item id or its URL ledger.
 * Called on every removal and expiry path so clipboard copy payloads and chunk
 * buffers stop being reachable as soon as the item is settled.
 */
function releaseBlob(item: EphemeralItem): void {
  if (item.blob === undefined) return
  delete item.blob
}

/**
 * Remaining milliseconds for a countdown, or null when the item has no timer
 * or is already settled. Never negative.
 */
export function getRemainingMs(item: EphemeralItem, now: number): number | null {
  if (item.status === 'expired' || item.status === 'nuked') return 0
  if (item.deleteAt === null) return null
  return Math.max(0, item.deleteAt - now)
}

export class EphemeralStore {
  private readonly clock: () => number
  private readonly idFactory: () => string
  private readonly registerUnloadHooks: boolean
  private readonly items = new Map<string, EphemeralItem>()
  private readonly listeners = new Set<() => void>()
  /** Every URL this store created. Used by the stats invariant check. */
  private readonly createdUrls = new Set<string>()
  /** Every URL this store already revoked. Makes revocation idempotent. */
  private readonly revokedUrls = new Set<string>()
  private readonly removals = emptyRemovalCounts()
  private snapshot: readonly EphemeralItem[] = EMPTY_SNAPSHOT
  private version = 0
  private disposed = false
  private localIdCounter = 0
  private unloadHandler: (() => void) | null = null

  constructor(options: EphemeralStoreOptions = {}) {
    this.clock = options.now ?? (() => Date.now())
    this.idFactory =
      options.idFactory ?? (() => `ephemeral-${this.clock().toString(36)}-${(this.localIdCounter += 1)}`)
    this.registerUnloadHooks = options.registerUnloadHooks !== false
    this.attachUnloadHooks()
  }

  /** Stable identity, safe to pass directly to useSyncExternalStore. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Stable snapshot. The array reference only changes after a mutation, so
   * useSyncExternalStore never loops on an unstable read.
   */
  readonly getSnapshot = (): readonly EphemeralItem[] => this.snapshot

  /** Current store time, the same clock used for deleteAt. */
  readonly now = (): number => this.clock()

  getVersion(): number {
    return this.version
  }

  isDisposed(): boolean {
    return this.disposed
  }

  hasItem(id: string): boolean {
    return this.items.has(id)
  }

  getItem(id: string): EphemeralItem | undefined {
    return this.items.get(id)
  }

  addText(input: AddTextInput): EphemeralItem {
    this.assertActive()
    const createdAt = input.createdAt ?? this.clock()
    const burnOnCopy = input.burnOnCopy === true
    const id = input.id ?? this.idFactory()
    this.assertIdAvailable(id)
    const item: EphemeralItem = {
      id,
      kind: 'text',
      text: input.text,
      direction: input.direction,
      peerId: input.peerId,
      createdAt,
      deleteAt: resolveDeleteAt(createdAt, input.ttlMs, burnOnCopy),
      burnOnCopy,
      status: input.status ?? 'ready',
    }
    this.putItem(item)
    return item
  }

  addFile(input: AddFileInput): EphemeralItem {
    this.assertActive()
    const createdAt = input.createdAt ?? this.clock()
    const burnOnCopy = input.burnOnCopy === true
    const id = input.id ?? this.idFactory()
    // Checked before any object URL exists, so a rejected duplicate cannot
    // strand a URL that the store then refuses to track.
    this.assertIdAvailable(id)
    const status = input.status ?? 'ready'
    const file = input.file
    const item: EphemeralItem = {
      id,
      kind: 'file',
      fileName: input.fileName,
      mime: input.mime ?? file?.type ?? 'application/octet-stream',
      size: file ? file.size : (input.size ?? 0),
      direction: input.direction,
      peerId: input.peerId,
      createdAt,
      // A placeholder has no bytes yet, so it holds no countdown: a sweep must
      // never delete an in-flight transfer. The TTL starts when
      // completeReceivedFile stamps the completion clock.
      deleteAt: file === undefined ? null : resolveDeleteAt(createdAt, input.ttlMs, burnOnCopy),
      burnOnCopy,
      status,
    }
    // An incoming FILE_START carries no Blob yet, so it gets no URL here. The
    // bytes and the single URL for that id arrive in completeReceivedFile.
    if (file !== undefined && carriesObjectUrl(status)) {
      const blobUrl = this.createObjectUrl(file)
      if (blobUrl !== undefined) item.blobUrl = blobUrl
      // Live Blob for clipboard and native share. Cleared with the URL on every
      // removal path, so the bytes never outlive the item.
      item.blob = file
    }
    this.putItem(item)
    return item
  }

  /**
   * Promotes an incoming placeholder (registered at FILE_START with no Blob)
   * to `ready` once every chunk is reassembled.
   *
   * The old URL, if any, is revoked before the new one is minted, so the ledger
   * stays exact and `leakedObjectUrlCount` cannot drift. `createdAt` and
   * `deleteAt` restart from the completion clock, so a slow transfer never
   * spends its own TTL while the bytes are still arriving.
   * Returns null when the id is unknown or the store is disposed.
   */
  completeReceivedFile(
    id: string,
    file: Blob,
    options: CompleteReceivedFileOptions = {},
  ): EphemeralItem | null {
    if (this.disposed) return null

    const current = this.items.get(id)
    if (!current) return null

    const completedAt = this.clock()
    const burnOnCopy = options.burnOnCopy ?? current.burnOnCopy
    const ttlMs =
      options.ttlMs !== undefined
        ? options.ttlMs
        : current.deleteAt === null
          ? null
          : Math.max(0, current.deleteAt - current.createdAt)

    // Revoke first: one id never holds two live URLs, not even for one tick.
    this.revokeUrl(current.blobUrl)

    const next: EphemeralItem = {
      ...current,
      mime: file.type || current.mime || 'application/octet-stream',
      size: file.size,
      blob: file,
      burnOnCopy,
      createdAt: completedAt,
      deleteAt: resolveDeleteAt(completedAt, ttlMs, burnOnCopy),
      status: 'ready',
    }

    const blobUrl = this.createObjectUrl(file)
    if (blobUrl !== undefined) next.blobUrl = blobUrl
    else delete next.blobUrl

    this.items.set(id, next)
    this.commit()
    return next
  }

  updateItem(id: string, patch: EphemeralItemPatch): EphemeralItem | null {
    const current = this.items.get(id)
    if (!current) return null

    const next: EphemeralItem = { ...current, ...patch }
    // Settled and failed states never keep a download link. An error item is
    // not usable, so its URL is revoked at once and the deleteAt timer is left
    // untouched so sweep still removes the row on schedule.
    const dropsUrl = next.status === 'expired' || next.status === 'nuked' || next.status === 'error'
    if (dropsUrl) {
      delete next.blobUrl
      releaseBlob(next)
      this.revokeUrl(current.blobUrl)
    }

    this.items.set(id, next)
    this.commit()
    return next
  }

  /**
   * Central removal path. Revokes the URL (once), drops the item from memory,
   * and records the reason for diagnostics.
   */
  removeItem(id: string, reason: EphemeralRemovalReason): boolean {
    const item = this.items.get(id)
    if (!item) return false
    this.revokeUrl(item.blobUrl)
    releaseBlob(item)
    this.items.delete(id)
    this.removals[reason] += 1
    this.commit()
    return true
  }

  /** Manual burn. Same guarantee as removeItem, kept as its own contract name. */
  burnNow(id: string): boolean {
    return this.removeItem(id, 'MANUAL_BURN')
  }

  /**
   * Copy or download hook. Returns true only when the item was marked
   * burnOnCopy and has now been destroyed.
   */
  consumeBurnOnCopy(id: string): boolean {
    const item = this.items.get(id)
    if (!item || !item.burnOnCopy) return false
    return this.removeItem(id, 'BURN_ON_COPY')
  }

  /**
   * Drop and nuke: the peer acknowledged the file, so the local copy is
   * revoked immediately and the item is marked expired. The row stays in the
   * snapshot so the UI can show the burned state without a dead download link.
   * Callers invoke this only for sent files whose FILE_START had dropAndNuke.
   */
  acknowledgeDelivery(id: string): boolean {
    const item = this.items.get(id)
    if (!item) return false
    if (item.status === 'expired' || item.status === 'nuked') return false

    this.revokeUrl(item.blobUrl)
    releaseBlob(item)
    const next: EphemeralItem = { ...item, status: 'expired', deleteAt: this.clock() }
    delete next.blobUrl
    this.items.set(id, next)
    this.commit()
    return true
  }

  /**
   * One sweep pass. Expires every active item whose deleteAt has passed,
   * revoking first and committing a single snapshot for the whole batch.
   * `error` items are included: a failed transfer still honours its own
   * timer, even though its URL was already revoked when it failed.
   * Returns the ids that expired so the caller can raise one notice.
   */
  sweep(now: number = this.clock()): readonly string[] {
    const expired: string[] = []

    for (const item of this.items.values()) {
      if (item.status === 'expired' || item.status === 'nuked') continue
      if (item.deleteAt === null) continue
      if (item.deleteAt <= now) expired.push(item.id)
    }

    if (expired.length === 0) return []

    for (const id of expired) {
      const item = this.items.get(id)
      if (!item) continue
      this.revokeUrl(item.blobUrl)
      releaseBlob(item)
      this.items.delete(id)
      this.removals.TTL_EXPIRED += 1
    }

    this.commit()
    return expired
  }

  /**
   * Revokes every live URL and empties the store. Used by the unload handlers,
   * by dispose, and by a manual "clear all" action.
   */
  revokeAll(reason: EphemeralRemovalReason = 'CLEARED'): readonly string[] {
    const removedIds: string[] = []

    for (const item of this.items.values()) {
      removedIds.push(item.id)
      this.revokeUrl(item.blobUrl)
      releaseBlob(item)
    }

    this.items.clear()
    // Belt and braces: a URL this store created but that is attached to no
    // item (an orphan left by a future bug) is revoked here too, so the unload
    // and dispose paths always leave zero live URLs behind.
    this.revokeOrphanedObjectUrls()
    this.removals[reason] += removedIds.length

    if (removedIds.length > 0) this.commit()
    return removedIds
  }

  /**
   * Removes the window listeners, revokes everything still alive, and stops
   * notifying subscribers. Safe to call twice.
   *
   * The created and revoked ledgers are deliberately kept after dispose: they
   * are one short string per URL created in the session, they are what keeps a
   * stray revoke idempotent, and they are what lets getStats prove after the
   * fact that every URL was released.
   */
  dispose(): void {
    if (this.disposed) return

    this.revokeAll('CLEARED')
    this.detachUnloadHooks()
    this.disposed = true
    this.listeners.clear()
  }

  getStats(): EphemeralStoreStats {
    return {
      itemCount: this.items.size,
      activeObjectUrlCount: this.createdUrls.size - this.revokedUrls.size,
      createdObjectUrlCount: this.createdUrls.size,
      revokedUrlCount: this.revokedUrls.size,
      leakedObjectUrlCount: this.countLeakedObjectUrls(),
      version: this.version,
      disposed: this.disposed,
      removals: { ...this.removals },
    }
  }

  /**
   * Duplicate ids are rejected instead of overwritten. Replacing a live item
   * would revoke a URL that a rendered snapshot or an in-flight download may
   * still be using, and it would silently destroy user visible data. Throwing
   * is the safer failure: the caller keeps its existing item and nothing is
   * revoked behind its back.
   */
  private assertIdAvailable(id: string): void {
    if (!this.items.has(id)) return
    throw new P2PError('INVALID_ARGUMENT', `Ephemeral item id already in use: ${id}`)
  }

  private putItem(item: EphemeralItem): void {
    const existing = this.items.get(item.id)
    if (existing) {
      // Unreachable from the public API because addText and addFile reject
      // duplicate ids first. Kept as a last line of defence so no future
      // insert path can orphan a live object URL.
      this.revokeUrl(existing.blobUrl)
      releaseBlob(existing)
    }
    this.items.set(item.id, item)
    this.commit()
  }

  /** Revokes any created URL whose ledger entry is still live. */
  private revokeOrphanedObjectUrls(): void {
    for (const url of this.createdUrls) {
      if (this.revokedUrls.has(url)) continue
      this.revokeUrl(url)
    }
  }

  /** Created minus revoked, minus URLs still attached to a live item. */
  private countLeakedObjectUrls(): number {
    const live = this.createdUrls.size - this.revokedUrls.size
    if (live <= 0) return 0

    let attached = 0
    for (const item of this.items.values()) {
      const url = item.blobUrl
      if (url === undefined) continue
      if (this.revokedUrls.has(url)) continue
      if (this.createdUrls.has(url)) attached += 1
    }
    return Math.max(0, live - attached)
  }

  private createObjectUrl(blob: Blob): string | undefined {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined
    try {
      const url = URL.createObjectURL(blob)
      this.createdUrls.add(url)
      return url
    } catch {
      // Non fatal: the item still exists without a download link.
      return undefined
    }
  }

  /** Idempotent. A second call for the same URL is a no-op. */
  private revokeUrl(url: string | undefined): boolean {
    if (!url) return false
    if (this.revokedUrls.has(url)) return false

    this.revokedUrls.add(url)
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // Already revoked by the platform, the ledger still records it.
      }
    }
    return true
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new P2PError('DESTROYED', 'Ephemeral store was disposed')
    }
  }

  private commit(): void {
    this.version += 1
    this.snapshot = Object.freeze(Array.from(this.items.values()))
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // A broken subscriber must never break the janitor or leak other items.
      }
    }
  }

  private attachUnloadHooks(): void {
    if (!this.registerUnloadHooks) return
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return

    this.unloadHandler = () => {
      this.revokeAll('TAB_CLOSE')
    }
    window.addEventListener('beforeunload', this.unloadHandler)
    window.addEventListener('pagehide', this.unloadHandler)
  }

  private detachUnloadHooks(): void {
    if (!this.unloadHandler) return
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('beforeunload', this.unloadHandler)
      window.removeEventListener('pagehide', this.unloadHandler)
    }
    this.unloadHandler = null
  }
}
