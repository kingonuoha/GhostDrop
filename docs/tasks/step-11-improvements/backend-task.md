# Step 11: Backend Task - Receiver Live Progress (`onStart`), Store File Promotion and Share Handoff Boot Sweep
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

## Assigned Agent
`@ghostdrop-backend`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md` (`D-001` through `D-014`)
- `docs/06-protocol-and-tech-spec.md`
- `docs/08-qa-checklist.md` (Gates 3, 4, 5)
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/backend-task.md`
- `docs/tasks/step-11-improvements/brief.md`

## Objective
Implement three backend capabilities in `web/src/lib/p2p/` and `web/src/lib/shareHandoff.ts` with zero breaking changes to the wire protocol and zero new dependencies:
1. **Receiver-Side Transfer Start Notification (`ChunkReceiverOptions.onStart`):** Notify `useGhostRoom` the instant a validated `FILE_START` packet is accepted so the receiving screen can immediately display an in-flight transfer card (`Receiving {name}... 0% -> 100%`) driven by the existing `transfer:progress` events.
2. **In-Place File Completion in `EphemeralStore` (`completeFile` or `updateItem` with `file: Blob`):** Allow a `direction: 'received'` file item created in `'sending'` state at `FILE_START` (with no `Blob` yet) to be promoted to `'ready'` with its reassembled `Blob` and newly minted `blobUrl` when `FILE_END` completes, while preserving the store's strict single-creation / single-revocation URL ledger invariant.
3. **Background / Boot Sweep for Expired Share-Target Handoffs (`sweepExpiredShareHandoff`):** Close Step 07 QA finding `F-01` by adding a lightweight `sweepExpiredShareHandoff(now?: number): Promise<boolean>` helper in `web/src/lib/shareHandoff.ts` that deletes any expired record (`record.expiresAt <= now`) in `ghostdrop-share-handoff` without claiming a valid fresh share.

---

## Detailed File-by-File Implementation Instructions

### Task 1: Add `onStart` to `ChunkReceiver` (`web/src/lib/p2p/chunkReceiver.ts`)
1. Define `StartedFileTransfer` in `web/src/lib/p2p/chunkReceiver.ts`:
   ```ts
   export interface StartedFileTransfer {
     id: string
     name: string
     size: number
     mime: string
     totalChunks: number
     ttlMs: number | null
     dropAndNuke: boolean
     burnOnRead: boolean
     startedAt: number
   }
   ```
2. Add `onStart?: (transfer: StartedFileTransfer) => void` to `ChunkReceiverOptions` (`lines 46-55`).
3. In `startTransfer(start: FileStartPacket)` (`lines 183-228`), right after the transfer is validated and added to `this.transfers.set(start.id, ...)` (and before `if (start.size === 0) this.finishTransfer(start.id)`):
   - Invoke `this.onStart?.({ id: start.id, name: start.name, size: start.size, mime: start.mime, totalChunks: start.totalChunks, ttlMs: start.ttlMs, dropAndNuke: start.dropAndNuke === true, burnOnRead: start.burnOnRead === true, startedAt })`.
   - Also emit initial 0% receive progress via `this.onProgress?.(...)` so the receiver UI immediately has a `0` progress entry.
4. Export `StartedFileTransfer` from `web/src/lib/p2p/index.ts`.

---

### Task 2: Support Placeholder-to-Ready File Promotion in `EphemeralStore` (`web/src/lib/p2p/janitor.ts`)
1. Currently, `EphemeralStore.addFile(input: AddFileInput)` (`janitor.ts:207-235`) requires `file: Blob` upfront and creates an object URL immediately if `status === 'sending' || status === 'ready'`.
2. For an **incoming** file at `FILE_START`, the receiver knows `id`, `fileName`, `mime`, `size`, `ttlMs`, and `burnOnCopy`, but does **not** have the reassembled `Blob` until `FILE_END`!
3. Update `AddFileInput` (`janitor.ts:42-53`) so `file?: Blob` and `size?: number` can be supplied when `status === 'sending'`:
   - If `input.file` is provided and `carriesObjectUrl(status)` is true, create `blobUrl` and attach `blob: input.file` as before.
   - If `input.file` is omitted (incoming transfer in progress), set `size: input.size ?? 0`, and do not create an object URL yet.
4. Add `completeReceivedFile(id: string, file: Blob, options?: { ttlMs?: number | null; burnOnCopy?: boolean }): EphemeralItem | null` (or support `file?: Blob` in `EphemeralItemPatch` / `updateItem`) on `EphemeralStore`:
   - Look up `current = this.items.get(id)`.
   - If `!current`, return `null`.
   - If `current.blobUrl` already exists, revoke it first via `this.revokeUrl(current.blobUrl)` so no orphan URL can ever be created.
   - Create the new object URL via `this.createObjectUrl(file)` (which records it in `this.createdUrls`), attach `blob: file`, set `size: file.size`, ` mime: file.type || current.mime`, `status: 'ready'`, and reset `createdAt` / `deleteAt` to the completion timestamp (`this.clock()`) so the receiver's TTL countdown starts when the file finishes arriving!
   - Commit the store snapshot and return the updated `EphemeralItem`.
5. Ensure that if an incoming transfer fails (`failTransfer` in `ChunkReceiver`), calling `store.updateItem(id, { status: 'error' })` marks the item as `'error'` cleanly with zero leaked URLs.

---

### Task 3: Add `sweepExpiredShareHandoff` in `web/src/lib/shareHandoff.ts`
1. In `web/src/lib/shareHandoff.ts`:
   - Add and export `export async function sweepExpiredShareHandoff(now: number = Date.now()): Promise<boolean>`:
     - Open the `ghostdrop-share-handoff` IndexedDB database in a `readwrite` transaction on `payloads`.
     - Read the `'latest'` record.
     - If no record exists, resolve `false`.
     - If the record is malformed (`!isStoredShareRecord(raw)`) OR expired (`raw.expiresAt <= now`), call `store.delete('latest')` inside the same transaction and resolve `true` on `transaction.oncomplete`.
     - If the record is still fresh (`raw.expiresAt > now`), leave it untouched and resolve `false`.
   - Wrap all IndexedDB operations in fail-soft `try / catch` so environments without IndexedDB resolve `false` silently.

---

## Verification Checklist
- [ ] `ChunkReceiver` calls `onStart` upon accepting a valid `FILE_START` packet and emits 0% initial receive progress.
- [ ] `EphemeralStore` can register an incoming `'sending'` file item without a `Blob` at `FILE_START`, promote it to `'ready'` with `blob` and `blobUrl` on `FILE_END`, and maintain `leakedObjectUrlCount === 0` across all completion, failure, burn, and sweep paths.
- [ ] `sweepExpiredShareHandoff()` deletes expired or malformed records from `ghostdrop-share-handoff` while preserving unexpired records.
- [ ] `npm run type-check`, `npm run lint`, and `npm run build` in `web/` exit `0` with zero em dashes, zero emojis, and zero `any`.
