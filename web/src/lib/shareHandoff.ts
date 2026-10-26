/**
 * Web Share Target handoff.
 *
 * The service worker receives OS share sheet payloads on `POST /share-target`
 * and parks them in a short lived IndexedDB slot (`ghostdrop-share-handoff` /
 * `payloads`). The app claims the slot once, then the record is gone. Nothing
 * is written to localStorage and nothing ever leaves the device.
 *
 * Every helper here is fail soft: blocked, private mode, or unavailable
 * IndexedDB resolves to `null` (or `false`) instead of throwing, so a share
 * that cannot be parked still lands on the friendly `/?shared=error` screen.
 */

export const SHARE_HANDOFF_DB = 'ghostdrop-share-handoff'
export const SHARE_HANDOFF_STORE = 'payloads'
export const SHARE_HANDOFF_TTL_MS = 5 * 60 * 1000
export const SHARE_HANDOFF_MAX_BYTES = 100 * 1024 * 1024
export const SHARE_TARGET_PATH = '/share-target'
export const SHARE_HANDOFF_SUCCESS_PATH = '/?shared=1'
export const SHARE_HANDOFF_ERROR_PATH = '/?shared=error'

/** Single slot key: the newest share always wins. */
const LATEST_KEY = 'latest'

export interface ShareHandoffFile {
  name: string
  type: string
  lastModified: number
  blob: Blob
}

export interface ShareHandoffPayload {
  id: string
  files: ShareHandoffFile[]
  text: string | null
  title: string | null
  url: string | null
  totalBytes: number
  createdAt: number
  expiresAt: number
}

export interface ShareHandoffInput {
  files: File[]
  text?: string | null
  title?: string | null
  url?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function isShareHandoffFile(value: unknown): value is ShareHandoffFile {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.lastModified === 'number' &&
    value.blob instanceof Blob
  )
}

function isShareHandoffPayload(value: unknown): value is ShareHandoffPayload {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    Array.isArray(value.files) &&
    value.files.every(isShareHandoffFile) &&
    (value.text === null || typeof value.text === 'string') &&
    (value.title === null || typeof value.title === 'string') &&
    (value.url === null || typeof value.url === 'string') &&
    typeof value.totalBytes === 'number' &&
    typeof value.createdAt === 'number' &&
    typeof value.expiresAt === 'number'
  )
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null
}

/**
 * Opens the handoff database. Resolves `null` for blocked, denied, or absent
 * storage so callers never have to wrap this in a try/catch.
 */
function openShareDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null)

  return new Promise((resolve) => {
    let settled = false
    const finish = (db: IDBDatabase | null): void => {
      if (settled) return
      settled = true
      resolve(db)
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(SHARE_HANDOFF_DB, 1)
    } catch {
      finish(null)
      return
    }

    request.onupgradeneeded = () => {
      try {
        const db = request.result
        if (!db.objectStoreNames.contains(SHARE_HANDOFF_STORE)) {
          db.createObjectStore(SHARE_HANDOFF_STORE, { keyPath: 'id' })
        }
      } catch {
        finish(null)
      }
    }
    request.onsuccess = () => finish(request.result)
    request.onerror = () => finish(null)
    request.onblocked = () => finish(null)
  })
}

function toHandoffFile(file: File): ShareHandoffFile {
  return {
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    blob: file,
  }
}

/**
 * Stores a share payload and resolves the saved record, or `null` when the
 * payload is empty, over the cap, or storage is unavailable.
 */
export async function saveSharePayload(
  input: ShareHandoffInput,
): Promise<ShareHandoffPayload | null> {
  const files = input.files.filter((file) => file.size > 0)
  const text = readNullableString(input.text)
  const title = readNullableString(input.title)
  const url = readNullableString(input.url)

  if (files.length === 0 && !text && !title && !url) return null

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > SHARE_HANDOFF_MAX_BYTES) return null

  const now = Date.now()
  const payload: ShareHandoffPayload = {
    id: LATEST_KEY,
    files: files.map(toHandoffFile),
    text,
    title,
    url,
    totalBytes,
    createdAt: now,
    expiresAt: now + SHARE_HANDOFF_TTL_MS,
  }

  const db = await openShareDatabase()
  if (!db) return null

  try {
    const saved = await new Promise<boolean>((resolve) => {
      let settled = false
      const finish = (ok: boolean): void => {
        if (settled) return
        settled = true
        resolve(ok)
      }

      try {
        const transaction = db.transaction(SHARE_HANDOFF_STORE, 'readwrite')
        transaction.oncomplete = () => finish(true)
        transaction.onerror = () => finish(false)
        transaction.onabort = () => finish(false)
        transaction.objectStore(SHARE_HANDOFF_STORE).put(payload)
      } catch {
        finish(false)
      }
    })

    return saved ? payload : null
  } catch {
    return null
  } finally {
    db.close()
  }
}

/**
 * Claims the pending share. The read and the delete share one readwrite
 * transaction, so two callers can never both receive the same payload.
 */
export async function takeSharePayload(): Promise<ShareHandoffPayload | null> {
  const db = await openShareDatabase()
  if (!db) return null

  try {
    return await new Promise<ShareHandoffPayload | null>((resolve) => {
      let settled = false
      const finish = (payload: ShareHandoffPayload | null): void => {
        if (settled) return
        settled = true
        resolve(payload)
      }

      try {
        const transaction = db.transaction(SHARE_HANDOFF_STORE, 'readwrite')
        const store = transaction.objectStore(SHARE_HANDOFF_STORE)
        let claimed: ShareHandoffPayload | null = null

        const request = store.get(LATEST_KEY)
        request.onsuccess = () => {
          const raw: unknown = request.result
          if (isShareHandoffPayload(raw) && raw.expiresAt > Date.now()) {
            claimed = raw
          }
          // Always clear the slot, even for an expired or malformed record.
          store.delete(LATEST_KEY)
        }

        transaction.oncomplete = () => finish(claimed)
        transaction.onerror = () => finish(null)
        transaction.onabort = () => finish(null)
      } catch {
        finish(null)
      }
    })
  } catch {
    return null
  } finally {
    db.close()
  }
}

/** Reads the pending share without claiming it, so the UI can preview it. */
export async function peekSharePayload(): Promise<ShareHandoffPayload | null> {
  const db = await openShareDatabase()
  if (!db) return null

  try {
    return await new Promise<ShareHandoffPayload | null>((resolve) => {
      let settled = false
      const finish = (payload: ShareHandoffPayload | null): void => {
        if (settled) return
        settled = true
        resolve(payload)
      }

      try {
        const transaction = db.transaction(SHARE_HANDOFF_STORE, 'readonly')
        const request = transaction.objectStore(SHARE_HANDOFF_STORE).get(LATEST_KEY)
        request.onsuccess = () => {
          const raw: unknown = request.result
          finish(isShareHandoffPayload(raw) && raw.expiresAt > Date.now() ? raw : null)
        }
        request.onerror = () => finish(null)
        transaction.onabort = () => finish(null)
      } catch {
        finish(null)
      }
    })
  } catch {
    return null
  } finally {
    db.close()
  }
}

/** Drops every handoff record. Safe to call when storage is unavailable. */
export async function clearShareHandoff(): Promise<boolean> {
  const db = await openShareDatabase()
  if (!db) return false

  try {
    return await new Promise<boolean>((resolve) => {
      let settled = false
      const finish = (ok: boolean): void => {
        if (settled) return
        settled = true
        resolve(ok)
      }

      try {
        const transaction = db.transaction(SHARE_HANDOFF_STORE, 'readwrite')
        transaction.oncomplete = () => finish(true)
        transaction.onerror = () => finish(false)
        transaction.onabort = () => finish(false)
        transaction.objectStore(SHARE_HANDOFF_STORE).clear()
      } catch {
        finish(false)
      }
    })
  } catch {
    return false
  } finally {
    db.close()
  }
}

/**
 * Boot sweep for unclaimed share handoffs (Step 07 QA finding F-01).
 *
 * Deletes the slot only when the record is malformed or its `expiresAt` has
 * already passed, so a fresh share waiting to be claimed is never touched.
 * Resolves true only when a delete actually committed. Every IndexedDB access
 * is fail soft, so a blocked or absent store resolves false instead of throwing.
 */
export async function sweepExpiredShareHandoff(now: number = Date.now()): Promise<boolean> {
  const db = await openShareDatabase()
  if (!db) return false

  try {
    return await new Promise<boolean>((resolve) => {
      let settled = false
      const finish = (removed: boolean): void => {
        if (settled) return
        settled = true
        resolve(removed)
      }

      try {
        const transaction = db.transaction(SHARE_HANDOFF_STORE, 'readwrite')
        const store = transaction.objectStore(SHARE_HANDOFF_STORE)
        let deleted = false

        const request = store.get(LATEST_KEY)
        request.onsuccess = () => {
          const raw: unknown = request.result
          if (raw === undefined || raw === null) return
          const stale = !isShareHandoffPayload(raw) || raw.expiresAt <= now
          if (!stale) return
          try {
            store.delete(LATEST_KEY)
            deleted = true
          } catch {
            // The record stays readable until the next sweep, which is harmless.
          }
        }

        transaction.oncomplete = () => finish(deleted)
        transaction.onerror = () => finish(false)
        transaction.onabort = () => finish(false)
      } catch {
        finish(false)
      }
    })
  } catch {
    return false
  } finally {
    db.close()
  }
}

/**
 * True when this page life booted on a share claim URL (`/?shared=1` or
 * `/?shared=error`). Captured at module load because the claim path strips the
 * flag synchronously, so a helper that read the URL later could not tell a
 * plain boot from a live claim. Written against `globalThis` so the service
 * worker build, which has no `window`, still compiles.
 */
function bootedWithShareClaim(): boolean {
  const scope = globalThis as { location?: { search?: string } }
  const search = scope.location?.search
  if (typeof search !== 'string') return false
  return new URLSearchParams(search).has('shared')
}

const BOOTED_WITH_SHARE_CLAIM = bootedWithShareClaim()

/** Set on the first boot sweep request, so a remount can never sweep twice. */
let bootSweepRequested = false

/**
 * One boot sweep per page life, called once from the app shell so every route
 * gets it, including a cold boot straight to `/room/CODE` or `/join`.
 *
 * A plain boot has no `shared` flag, so nothing would ever claim a record
 * parked by an earlier visit and it would sit in IndexedDB past its five minute
 * life. A page that booted on a claim URL never sweeps, because the claim owns
 * the slot. The sweep itself never throws.
 */
export function sweepExpiredShareHandoffOnce(): void {
  if (bootSweepRequested) return
  bootSweepRequested = true
  if (BOOTED_WITH_SHARE_CLAIM) return
  void sweepExpiredShareHandoff()
}

/** Turns a claimed payload back into `File` objects for the room sender. */
export function sharePayloadToFiles(payload: ShareHandoffPayload): File[] {
  return payload.files.map((file) => new File([file.blob], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  }))
}
