# Step 04: TTL Ephemeral Memory Janitor Backend Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNLA241D - backend complete - 2026-10-20 · ASUS-LAPTOP-DNLA241D - qa repair round 1 - 2026-10-21

## Assigned Agent
`@ghostdrop-backend`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/00-prd-source-of-truth.md` (FR-1.5 Ephemeral TTL Self-Destruct)
- `docs/06-protocol-and-tech-spec.md` (Section 5 Ephemeral Memory & Security Rules)
- `decisions.md` (D-004 Local TTL Self-Destruct)

## Objective
Implement ephemeral memory lifecycle management, automatic TTL count-down engine, immediate `URL.revokeObjectURL` cleanup on item expiry or tab close, and "Delete from phone after sending" upon `FILE_ACK`.

## Checklists
- [x] Implement `web/src/lib/p2p/janitor.ts` managing object URL revocation registry and in-memory payload store.
- [x] Implement `web/src/hooks/useTtlJanitor.ts` hook running 1-second interval sweeps to expire items and revoke object URLs immediately.
- [x] Attach `window.addEventListener('beforeunload')` and `window.addEventListener('pagehide')` listeners to revoke all active object URLs immediately so zero bytes linger in RAM.
- [x] Implement "Delete from phone after sending" (drop-and-nuke) trigger upon receiving `FILE_ACK`.
- [x] Enforce zero emojis and zero em dashes in notification strings and comments.
- [x] Verify zero memory leaks or unrevoked URLs in memory audit.

## Implementation Contract (Orchestrator, binding)
- Extend `web/src/types/protocol.ts` with `EphemeralItem` (`id`, `kind: 'text' | 'file'`, `text?`, `fileName?`, `mime?`, `size?`, `blobUrl?`, `direction: 'sent' | 'received'`, `peerId?`, `createdAt`, `deleteAt: number | null`, `burnOnCopy: boolean`, `status: 'sending' | 'ready' | 'expired' | 'error'`), plus `TtlPreset` plain-English label map owned by the UI layer.
- `web/src/lib/p2p/janitor.ts` exports `EphemeralStore` with subscribe/getSnapshot (React `useSyncExternalStore` compatible), `addText`, `addFile`, `updateItem`, `removeItem(id, reason)`, `burnNow(id)`, `consumeBurnOnCopy(id)`, `revokeAll(reason)`, `getStats`. Every `blobUrl` is created through the store so revocation is centralized and impossible to forget.
- Register `beforeunload` and `pagehide` once per store instance, remove listeners on `dispose()`. Revocation must be idempotent and safe when called twice.
- `web/src/hooks/useTtlJanitor.ts` sweeps every 1000 ms, removes expired items with reason `TTL_EXPIRED`, and returns remaining ms per item for countdowns. Must not create a render loop.
- Fix QA follow-up R-2: a rejected `FILE_START` must settle the transfer id so trailing frames do not emit repeated errors.
- `dropAndNuke`: after `FILE_ACK` with status OK for a sent file marked `dropAndNuke`, revoke the local object URL and mark the item `expired` immediately.
- No em dashes, no emojis, no user-facing strings here. No React imports in `lib/`.

## Completion Notes

**Status:** backend half of Step 04 complete. Type-check, lint and production build pass.

### Files

| File | Change |
| :--- | :--- |
| `web/src/types/protocol.ts` | `EphemeralItem` reshaped to the contract. Added `EphemeralItemDirection` (`sent` / `received`) and widened `EphemeralItemStatus` to `sending`, `ready`, `expired`, `error`, `nuked`. All pre-existing exports kept. |
| `web/src/lib/p2p/janitor.ts` | New. `EphemeralStore`, `getRemainingMs`, removal reason and stats types. No React, DOM only for `URL` and the unload hooks. |
| `web/src/hooks/useTtlJanitor.ts` | New. 1000 ms sweep, `useSyncExternalStore` subscription, unmount cleanup, SSR-safe module scope. |
| `web/src/lib/p2p/chunkReceiver.ts` | R-2 fix: rejected `FILE_START` settles the id, trailing `FILE_CHUNK` headers and `FILE_END` are silent, and a bounded orphan binary window absorbs the frames that were already in flight. |
| `web/src/lib/p2p/index.ts` | Barrel now re-exports `./janitor`, so UI imports the store from `lib/p2p` only. |

### Public API

`EphemeralStore`
- `new EphemeralStore(options?: { now?: () => number; idFactory?: () => string; registerUnloadHooks?: boolean })`
- `subscribe(listener: () => void): () => void` (stable identity, `useSyncExternalStore` ready)
- `getSnapshot(): readonly EphemeralItem[]` (stable reference until a mutation)
- `getVersion(): number`, `now(): number`, `isDisposed(): boolean`, `hasItem(id): boolean`, `getItem(id): EphemeralItem | undefined`
- `addText(input: AddTextInput): EphemeralItem`
- `addFile(input: AddFileInput): EphemeralItem`
- `updateItem(id, patch: EphemeralItemPatch): EphemeralItem | null`
- `removeItem(id, reason: EphemeralRemovalReason): boolean`
- `burnNow(id): boolean`
- `consumeBurnOnCopy(id): boolean`
- `acknowledgeDelivery(id): boolean`
- `sweep(now?: number): readonly string[]`
- `revokeAll(reason?: EphemeralRemovalReason): readonly string[]`
- `dispose(): void`
- `getStats(): { itemCount; activeObjectUrlCount; createdObjectUrlCount; revokedUrlCount; version; disposed; removals }`

`useTtlJanitor({ store, intervalMs?, onExpire?, enabled? })` returns `{ items, now, remainingMs(id) }`.
`getRemainingMs(item, now)` returns `number | null`, never negative.

### Contract decisions

- `burnOnCopy` forces `deleteAt = null`, because burn on copy dies on the first read, not on the clock. `TTL_PRESET_MS.BURN_ON_COPY = 0` stays untouched for the UI label layer but must not be passed as `ttlMs`.
- `acknowledgeDelivery` is the drop-and-nuke entry point. It revokes the local URL, clears `blobUrl` so no dead download link is rendered, and sets `status: 'expired'` with the row kept for the burned toast. Callers invoke it only for a sent file whose `FILE_START` carried `dropAndNuke: true` and whose `FILE_ACK` status is `OK`; the store cannot see the wire flag, so the call site owns that condition.
- `removeItem` is the only deleter. `burnNow`, `consumeBurnOnCopy` and `sweep` all route through it or the same revoke helper.
- `blobUrl` is absent from `EphemeralItemPatch`, so no caller can swap a live URL behind the registry.

### Memory safety argument

1. **Every create path registers.** `blobUrl` is only assigned in `EphemeralStore.addFile` through the private `createObjectUrl`, which calls `URL.createObjectURL` once and adds the result to `createdUrls` before the item is stored. `addText` never creates a URL. No other module in `web/src` calls `URL.createObjectURL`, so there is no unregistered URL to leak.
2. **Every removal path revokes once.** `removeItem`, `sweep`, `revokeAll`, `acknowledgeDelivery` and the settled branch of `updateItem` all go through the private `revokeUrl`, which checks `revokedUrls` first and records the URL before calling `URL.revokeObjectURL`. A second call for the same URL is a no-op, so double removal, double burn and double `dispose` cannot throw or double free.
3. **Unload paths cover tab close.** One bound handler is registered for both `beforeunload` and `pagehide` in the constructor (guarded by `typeof window`), and both call `revokeAll('TAB_CLOSE')`. `dispose()` removes exactly that handler reference, revokes whatever is left, clears the ledgers and stops notifying. No anonymous listener can be stranded.
4. **Snapshot integrity.** The snapshot array is rebuilt and frozen on mutation only, and items are replaced copy-on-write, so a previously rendered snapshot can never observe a mutated item or a stale URL.
5. **Constant-size bookkeeping.** `createdUrls` and `revokedUrls` hold one short string per item created in the session and are cleared on `dispose`. The receiver orphan window is a single counter capped at one transfer budget, not a buffer. The settled id set stays capped at 64.
6. **Diagnostic invariant.** `getStats().activeObjectUrlCount` is `createdUrls.size - revokedUrls.size`, so any future path that forgets a revoke becomes visible as a non-zero count after `dispose`.

### Verification

- Temporary harness outside the repository (`%TEMP%/opencode/step04`), 24 store scenarios: stable snapshot, single revoke on double removal, exact-deadline TTL sweep, drop-and-nuke revoke plus `expired`, burn on copy, `beforeunload` and `pagehide` full purge, dispose detach, add-after-dispose throws, `created == revoked`, and no URL revoked twice. Result: `PASS scenarios=24 created=5 revoked=5`.
- Receiver harness, 5 scenarios: rejected `FILE_START` with a 4 frame trailing stream produces exactly 1 error and 1 `ERROR` ACK, settled headers silent, bounded window then normal orphan reporting, happy path still 1 `OK` ACK with the exact 6 byte Blob, zero byte file still settles once. Result: `PASS receiver scenarios=5`.
- `npm run type-check`, `npm run lint`, `npm run build` in `web/`: all pass, 1948 modules, PWA `generateSW`, 8 precache entries. The pre-existing `./laroka.otf` runtime resolution warning is unchanged and belongs to Gate 1.

### Follow-ups for the integration pass

- Wire `acknowledgeDelivery` into the `FILE_ACK` handler only for `dropAndNuke` sends, and map `P2PError` codes to playful copy at the UI boundary (never a raw message).
- R-3 (guest presence) and R-4 items from the Step 03 report are still open and out of this scope.
- `EphemeralStore` is per consumer. The workspace provider should create one instance, pass it to `useTtlJanitor`, and call `dispose()` on unmount.

## QA Repair Round 1

**Scope:** P2-1, P2-2 and P2-3 from `qa-report.md`, plus hardening of the revoke-once invariant. Only `web/src/lib/p2p/janitor.ts` changed. No public signature changed, no dependency added, no hook or UI file touched.

### R1-1 (P2-1): Duplicate item id is rejected, never silently overwritten

Chosen behaviour: **reject**. Overwriting a live item would revoke an object URL that a frozen snapshot or an in-flight download may still be using, and it would silently destroy item data the user can already see. Throwing keeps the existing item intact and revokes nothing.

- `janitor.ts:186-205` `addText` resolves the id first and calls `assertIdAvailable(id)` at `:191` before the item exists.
- `janitor.ts:207-235` `addFile` calls `assertIdAvailable(id)` at `:214` **before** `createObjectUrl` at `:230`, so a rejected duplicate can never strand a URL the store refuses to track.
- `janitor.ts:388-398` `assertIdAvailable` throws `P2PError('INVALID_ARGUMENT', 'Ephemeral item id already in use: ...')`. No em dash, no raw browser text. Callers already guard with `store.hasItem` (`useGhostRoom.ts:308`, `:330`), so no reachable path throws today.
- `janitor.ts:400-410` `putItem` also revokes any pre-existing `blobUrl` before `items.set` as a last line of defence, so no future insert path can orphan a live URL even if it bypasses the public guards.

### R1-2 (P2-2): `error` items revoke at once and still expire on schedule

- `janitor.ts:237-254` `updateItem` now revokes and deletes `blobUrl` for `error` as well as `expired` and `nuked` (`:245-249`). `deleteAt` is deliberately left untouched, so the failed item keeps its own timer.
- `janitor.ts:304-332` `sweep` now only skips settled statuses (`expired`, `nuked`) at `:315`, so `error` items are swept at their exact deadline and removed from the map. A second revoke is a no-op through the `revokedUrls` ledger.
- `janitor.ts:110-116` `carriesObjectUrl` plus `:229-232` in `addFile`: a file created directly with `status: 'error'` (or any settled status) never gets an object URL at all.
- Downstream effect on the send-failure path (`useGhostRoom.ts:577`, `:585`): the item loses `blobUrl`, so the download branch at `useGhostRoom.ts:610` falls through to the playful failure notice instead of launching a dead link. No hook change required.

### R1-3 (P2-3): Post-dispose stats surface a leak

- `janitor.ts:72-89` `EphemeralStoreStats` gains `leakedObjectUrlCount` (additive, existing fields and types unchanged).
- `janitor.ts:366-373` `dispose` no longer clears `createdUrls` and `revokedUrls`. They hold one short string per URL created in the session, they keep `revokeUrl` idempotent after teardown, and they make the counters meaningful after dispose. Rationale is documented in the method comment at `:357-365`.
- `janitor.ts:375-386` `getStats` reports lifetime `createdObjectUrlCount`, `revokedUrlCount`, `activeObjectUrlCount` (created minus revoked) and the new `leakedObjectUrlCount` (`:381`).
- `janitor.ts:420-433` `countLeakedObjectUrls` counts created minus revoked minus URLs still attached to a live item, so a healthy store reports zero before and after dispose while a real orphan reports non-zero. The check is O(items + created URLs) and `getStats` is diagnostic only (zero call sites in `web/src`).

### R1-4: Extra revoke-once and purge hardening

- `janitor.ts:338-355` `revokeAll` now purges orphaned URLs after clearing the map (`:346-350`), so `beforeunload`, `pagehide` and `dispose` leave zero live URLs behind even if a future bug detaches a URL from its item.
- `janitor.ts:412-418` `revokeOrphanedObjectUrls` routes every orphan through the same idempotent `revokeUrl` helper, so the ledger still guarantees one platform call per URL.
- `janitor.ts:1-15` header contract updated to state the duplicate-id rejection, the failed-item revoke, and the ledger retention rule.

### Verification

- `npm run type-check` in `web/`: PASS, zero errors.
- `npm run lint` in `web/`: PASS, zero warnings.
- Out of repository harness (`%TEMP%/opencode/step04-repair`, compiled real `janitor.ts` with a fake `URL` ledger and fake `window` registry), 50 assertions: `RESULT PASS assertions=50 failed=0 created=10 revoked=10`. Covered: duplicate `addFile` and `addText` reject with `INVALID_ARGUMENT` while the first item and its URL stay live; `error` item revokes exactly once and is swept at its exact deadline but not one millisecond earlier; `error`-born file creates no URL; post-dispose `created=2 revoked=2 active=0 leaked=0` with counters still readable; a simulated orphan reports `leakedObjectUrlCount=1` before dispose and `0` after dispose purges it; double remove, double burn, settled-then-error, `beforeunload` plus `pagehide`, and double `dispose` never revoke a URL twice; every created URL is revoked exactly once; snapshot frozen and `addText` after dispose still throws `DESTROYED`.

### Superseded notes

- The memory safety argument item 5 above says the ledgers are cleared on `dispose`. That is no longer true by design, see R1-3.
- The memory safety argument item 6 above says `activeObjectUrlCount` exposes a missed revoke after dispose. It now stays truthful because the ledgers survive dispose, and `leakedObjectUrlCount` is the explicit leak signal.
