# Step 04: QA TTL and Memory Janitor Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-21 · ASUS-LAPTOP-DNLA241D - repair round 1 re-audit - 2026-10-21

**Status:** authoritative report after QA Repair Round 1. It supersedes the Round 0 audit and keeps that audit as a one table history in section 2.

## 1. Scope and Method

Read-only re-audit of the Step 04 TTL and memory janitor after the backend and web repair rounds. No application file, design asset, or configuration was modified. The only file written is this report.

Sources read: `docs/08-qa-checklist.md` Gate 4, `docs/06-protocol-and-tech-spec.md` lines 26 to 125 and packet shapes 52 to 57, `docs/02-brand-persona-and-copy.md` lines 36 to 68, `docs/05-motion-spec.md`, `decisions.md` D-004 and D-011, `docs/tasks/step-04-ttl-memory-janitor/qa-task.md`, and the `## QA Repair Round 1` sections of `backend-task.md` and `web-task.md`.

Code inspected: `web/src/lib/p2p/janitor.ts`, `web/src/hooks/useGhostRoom.ts`, `web/src/hooks/useTtlJanitor.ts`, `web/src/lib/p2p/chunkReceiver.ts`, `web/src/lib/p2p/errors.ts`, `web/src/types/protocol.ts`, `web/src/lib/copyDeck.ts`, `web/src/lib/constants.ts`, `web/src/components/room/TtlPicker.tsx`, `PoofNotice.tsx`, `FeedbackNotice.tsx`, `FeedbackCard.tsx`, `web/src/pages/HomeHub.tsx`, both nav bars, `web/src/index.css`, `web/src/styles/tokens.css`.

Method: static reading, create-to-revoke call graph over every `URL.createObjectURL` site, codepoint scan over all 39 files in `web/src`, `grep` scans for `any`, `alert`, and storage APIs, three build-health commands, and an independent harness compiled from the real `janitor.ts` into `/tmp/opencode/step04-qa-r2` (outside the repository) with a fake `URL` ledger and a fake `window` listener registry.

Harness result: `RESULT PASS assertions=64 failed=0 created=14 revoked=14`. Zero orphaned URLs, zero double revokes.

## 2. Round 0 Findings, Short History

Round 0 verdict was GATE FAIL with one blocker. Status now:

| ID | Round 0 severity | Summary | Status now |
| :--- | :--- | :--- | :--- |
| P1-1 | P1 | Inbound text TTL anchored to the sender clock | Closed, see 3.1 |
| P2-1 | P2 | Duplicate id overwrote a live item and stranded its URL | Closed, see 3.2 |
| P2-2 | P2 | `error` items kept their URL and were never swept | Closed, see 3.2 |
| P2-3 | P2 | Post-dispose stats could not reveal a missed revoke | Closed, see 3.2 |
| P2-4 | P2 | Store and unload listeners created during render | Open, non-blocking |
| P2-5 | P2 | `setFeedback` after `await` without a mount guard | Closed, see 3.3 |
| P2-6 | P2 | `sendMetaRef` entry survives a lost ACK | Partly closed, see 3.3 |
| P2-7 | P2 | `.ttl-dissolve` applied to no element | Open, Step 5 feed work |
| P2-8 | P2 | Nav timer chips do not change the real preset | Open, declared Step 5 |
| P2-9 | P2 | Checklist names a `24h` preset the locked deck removes | Open, documentation only |
| P2-10 | P2 | No in-repository regression test | Open |
| P2-11 | P2 | Dead sender buffers until room unmount | Open, bounded |
| P2-12 | P2 | Tab close notifies peers through signaling only | Open, docs wording |
| P2-13 | P2 | Latent burn-on-copy download revoke race for files | Open, unreachable today |

## 3. Repair Verification

### 3.1 Inbound items use the local receive clock, outbound wire unchanged

- [x] Inbound `TEXT` no longer passes a sender timestamp. `useGhostRoom.ts:353-371` calls `store.addText` with `id`, `text`, `direction`, `ttlMs`, `burnOnCopy`, `peerId` only. The rule is recorded at `:356-360`.
- [x] The store defaults `createdAt` to its own clock: `janitor.ts:188` (`input.createdAt ?? this.clock()`), clock is `Date.now()` at `:146`, deadline at `:199` via `resolveDeleteAt` (`:103-108`, `now + Math.max(0, ttlMs)`).
- [x] Inbound files behave identically: `useGhostRoom.ts:331-342` never passes `createdAt`, and `janitor.ts:209` falls back to the local clock.
- [x] Outbound protocol is byte-for-byte unchanged: `useGhostRoom.ts:499-506` still sends `timestamp: Date.now()`, `TextPacket` still requires `timestamp` (`protocol.ts:31-38`), the validator still requires a finite timestamp (`:222`), and the shape matches `docs/06-protocol-and-tech-spec.md:52-57`.
- [x] Harness proof (scenarios A and B): a note and a file added at `T` with a `15m` preset get `createdAt === T` and `deleteAt === T + 900000`; `sweep(T + 1)` and `sweep(T + 899999)` expire nothing; `sweep(T + 900000)` expires at the exact millisecond. A sender clock 20 minutes behind or ahead can no longer move the deadline, because it is never read.
- [x] The only remaining `packet.timestamp` occurrence is the explanatory comment at `useGhostRoom.ts:357`; `grep` for `createdAt|timestamp` in `web/src` shows no inbound use.

### 3.2 Duplicate ids, failed items, and the revoke-once invariant

- [x] Duplicate ids can no longer strand a URL. `addText` checks `assertIdAvailable` at `janitor.ts:191` and `addFile` checks it at `:214` before `createObjectUrl` at `:230`, so a rejected duplicate creates nothing to leak. `assertIdAvailable` (`:395-398`) throws `P2PError('INVALID_ARGUMENT')`. `putItem` (`:400-410`) also revokes a pre-existing URL before `items.set` as a last line of defence.
- [x] Duplicate rejection leaves the live item untouched: harness C shows `INVALID_ARGUMENT` for both `addFile` and `addText`, `created.length` unchanged, `fileName` still `one.txt`, first URL still unrevoked and revoked exactly once later by dispose.
- [x] `error` items revoke at once and still expire. `updateItem` drops and revokes `blobUrl` for `expired`, `nuked`, and now `error` (`janitor.ts:245-249`), while `deleteAt` is untouched. `sweep` skips only `expired` and `nuked` (`:315`), so `error` rows are removed at their exact deadline. Harness E: revoke count 1, `deleteAt` preserved, alive at `T + 599999`, swept at `T + 600000`, still revoke count 1.
- [x] An item born in a settled status never gets a URL: `carriesObjectUrl` (`janitor.ts:114-116`) plus the guard at `:229-232`. Harness D: no `blobUrl`, no ledger entry.
- [x] Revoke once across every terminal path, all through `revokeUrl` (`janitor.ts:447-461`, ledger check at `:450`):

| Path | Entry point | Harness |
| :--- | :--- | :--- |
| TTL sweep | `sweep` `janitor.ts:311-332` | A5, E5, F8 |
| Manual burn | `burnNow` `:271-273` via `removeItem` `:260-268` | F2 |
| Burn on copy | `consumeBurnOnCopy` `:279-283` | F3, F4 |
| Drop and nuke | `acknowledgeDelivery` `:291-302` | F5 to F8 |
| Duplicate guard | `assertIdAvailable` `:395-398`, `putItem` `:400-410` | C1 to C6 |
| Settled update | `updateItem` `:237-254` | E1 |
| Revoke all | `revokeAll` `:338-355` | F9 |
| Dispose | `dispose` `:366-373` | F10 |
| beforeunload | handler `:485-489` | G4 |
| pagehide | same handler reference `:489` | G6 |
| Orphan purge | `revokeOrphanedObjectUrls` `:412-418` | H1 to H3 |

- [x] `revokeAll` now purges ledger entries attached to no item after clearing the map (`janitor.ts:346-350`), so unload and dispose leave zero live URLs even after a future bug. Harness H detaches a URL from its item, sees `leakedObjectUrlCount = 1`, calls `revokeAll`, and gets exactly one platform revoke plus `leakedObjectUrlCount = 0`.
- [x] Both unload events share one handler reference (`janitor.ts:485-489`). Harness G: one listener per event, same function, `beforeunload` revokes both items once, the later `pagehide` call is a no-op, and `dispose` removes both listeners.
- [x] Global reconciliation: 14 URLs created, 14 revoked, every URL revoked exactly once, no double revoke, no orphan (harness K1 to K3).
- [x] Chunk buffers are still released: `chunkReceiver.disposeAll()` runs on effect cleanup (`useGhostRoom.ts:476`) and completed transfers delete their transfer entry (`chunkReceiver.ts:176`, `:315`, `:340`).

### 3.3 Post-await guards and `sendMetaRef` lifetime

- [x] `mountedRef` (`useGhostRoom.ts:228`) is set true on attach and false on cleanup (`:230-235`), so a StrictMode remount re-arms it.
- [x] `announce` (`:257-260`) writes `setFeedback` only while mounted and is used by every async action path: `sendText` `:489`, `:511`, `:514`; `sendFiles` `:525`, `:535`, `:578`, `:586`; `copyItem` `:618`, `:626-631`, `:633`.
- [x] Remaining `setFeedback` calls are synchronous inside effects that already check `active` (`:345`, `:369`, `:386`, `:391`, `:395`, `:425`, `:431`, `:441`, `:465`) or are raised from `useTtlJanitor`, which clears its interval and blocks `onExpire` after teardown (`useTtlJanitor.ts:51-70`). `handleExpire` (`useGhostRoom.ts:262-273`) is therefore not a post-unmount writer.
- [x] `sendMetaRef` is cleared on room change and on unmount by the effect cleanup at `useGhostRoom.ts:248-252`, in addition to the ACK removal (`:381`), the two send-failure removals (`:576`, `:584`), and the manual burn removal (`:646`).
- [ ] Residual P2-6: an entry for a peer that accepts a file but never ACKs still lives until room change or unmount. Bounded to one small object per such transfer, no payload bytes. Non-blocking.

### 3.4 Full Gate 4 list re-check

Against `docs/08-qa-checklist.md:28-31` and the Step 04 checklist in `qa-task.md`.

- [x] **Live 1 second countdown.** `useTtlJanitor.ts:15` fixes `TTL_SWEEP_INTERVAL_MS = 1000`, `:64` runs `setInterval(tick, Math.max(250, intervalMs))`, `:57` sweeps the store clock, and `:60` republishes `now` on every tick, so `remainingMs` changes once per second even when nothing expires. `clearInterval` plus the `active` flag on teardown (`:51`, `:66-70`) prevents a post-unmount tick.
- [x] **Exact plain English labels.** `TtlPicker.tsx:16-21` renders `Delete after 1st copy`, `15 mins`, `50 mins`, `When I close this page`, matching `docs/02-brand-persona-and-copy.md:36-40`. Dock chips are `1 Copy`, `15 Mins`, `50 Mins`, `On Close` (`constants.ts:12-15`).
- [x] **Default is 50 mins.** `useGhostRoom.ts:215` (`useState<TtlPreset>('50m')`), `constants.ts:18` (`DEFAULT_TIMER_ID = '50m'`), and the nav label `constants.ts:3` (`Auto-delete: 50 mins`). `HomeHub.tsx:215` binds `TtlPicker` to `room.ttlPreset`, so the pressed button matches the live preset on the shipped surface.
- [x] **All three shipped presets count down on arrival.** Harness A and B prove exact-deadline expiry for received text and files. Burn on copy has no timer by design (`janitor.ts:104-105`) and dies on the first read, which the copy deck states as `You copied it once...` (`copyDeck.ts:57-59`).
- [x] **Poof copy is exact and playful.** `copyDeck.ts:185-194` renders `Poof! All gone.`, body from `poofBody` (`:54-70`) with `50 minutes passed, so we cleaned up {item} for you.` as the default and preset variants for `15m`, `24h`, and `BURN_ON_COPY`, action `Okay`. `PoofNotice.tsx:26-36` uses one `Sparkles` icon, `role="status"`, `aria-live="polite"`, and a single action.
- [x] **Reduced motion.** `index.css:224-248` removes the dissolve scale and fade (`:237-241`) and the Poof entrance animation (`:243-247`), setting `animation: none`, `opacity: 1`, `transform: none`. Token durations collapse to `1ms` under the same media query (`styles/tokens.css`).
- [x] **Zero em dashes and zero emojis.** Codepoint scan over all 39 `*.ts`, `*.tsx`, `*.css` files in `web/src`: `nonAsciiChars 0`. Because every em dash and every emoji is non-ASCII, zero is a complete negative proof, and it also excludes curly quotes, en dashes, arrows, and variation selectors.
- [x] **Zero `any`, zero `alert`, zero storage, zero raw HTML.** `grep -rn "\balert\(|window\.alert|: any\b|as any\b|<any>|any\[\]|localStorage|sessionStorage|indexedDB|dangerouslySetInnerHTML" web/src` returns no matches. Items live in `Map<string, EphemeralItem>` only (`janitor.ts:132`).
- [x] **Zero jargon on screen.** The literal `TTL` appears 12 times in `web/src/**/*.tsx`, all in identifiers, type names, copy deck keys, and comments (`TtlPicker.tsx:14-16`, `:46`, `PoofNotice.tsx:16-20`, `FeedbackNotice.tsx:32-48`, `DesktopTopPillBar.tsx:2`, `:70`, `HomeHub.tsx:215`). No rendered label contains it. Errors never show raw transport text: `feedbackKeyForError` returns copy deck keys only (`useGhostRoom.ts:125-136`).
- [x] **Revoke and chunk-clear line.** Covered in 3.2, harness 64/64.
- [x] **Tab close line.** Covered in 3.2, harness G. Peer notification is still implicit through the signaling socket close (`peerJsEngine.ts`), which is P2-12 below and unchanged from Round 0.
- [ ] Documentation conflict retained as P2-9: Gate 4 names a `24h` preset while the locked copy deck ships four labels. `TTL_PRESET_MS['24h']` exists (`protocol.ts:102`) and the Poof body supports it (`copyDeck.ts:62-63`), so only the checklist wording is stale. No code change is legal without a brand copy decision, so this is an orchestrator documentation action, not a repair.

## 4. Command Results

All commands run in `web/` on 2026-10-21, after both repair rounds.

| Command | Result | Detail |
| :--- | :--- | :--- |
| `npm run type-check` | PASS | `tsc --noEmit -p tsconfig.app.json` and `-p tsconfig.node.json`, exit 0, zero output, zero errors. The transient mid-write errors noted in `web-task.md` are gone. |
| `npm run lint` | PASS | `eslint .`, exit 0, zero output, zero warnings. |
| `npm run build` | PASS | `tsc -b && vite build`, exit 0, 1992 modules, `dist/assets/index-a-pd27vY.js` 383.43 kB (gzip 115.41 kB), CSS 29.89 kB (gzip 6.86 kB), PWA `generateSW`, 8 precache entries, `dist/sw.js` and `dist/workbox-9c191d2f.js` generated. |

One pre-existing warning remains: `./laroka.otf referenced in ./laroka.otf didn't resolve at build time`. It is unchanged from earlier steps and belongs to Gate 1 font wiring, not Gate 4.

## 5. Independent Harness

The real `janitor.ts` was copied to `/tmp/opencode/step04-qa-r2` (outside the repository), compiled with the project TypeScript compiler to CommonJS, and driven through 64 assertions with a fake `URL` ledger and a fake `window` registry. The repository was not modified and no dependency was added.

`RESULT PASS assertions=64 failed=0 created=14 revoked=14`

Coverage: local receipt clock for received text and files, exact-deadline expiry at `T + 899999` / `T + 900000`, no expiry on arrival, duplicate `addText` and `addFile` rejection with the first URL left live, error-born file with no URL, error revoke plus timer expiry, double remove, double burn, double burn-on-copy, double acknowledge, double revoke all, double dispose, add-after-dispose `DESTROYED`, shared unload handler reference, unload purge without double revoke, listener detach on dispose, orphan purge, lifetime stats after dispose, frozen and reference-stable snapshot, and `getRemainingMs` clamping.

## 6. New Observations (non-blocking, no regression)

- P3-1: The receiver trusts the sender's `ttlMs` (`useGhostRoom.ts:365`). A peer that sends an extreme value can keep a received row in RAM longer than any offered preset. It is not a leak and it matches the product rule that the sender picks the lifetime, but clamping inbound `ttlMs` to the known preset values would be cheap defence in depth. Pair with the existing `hasItem` guard at `:354`.
- P3-2: Because `error` items now expire (P2-2 fix), a failed transfer can raise `ERR_CHUNK_INTERRUPTED` and later a `Poof! All gone.` notice for the same id when its timer fires. No memory impact; the Step 5 feed work should decide whether a failed row should suppress the Poof notice. `handleExpire` at `useGhostRoom.ts:262-273` is the single place to filter it.
- P3-3: `createdUrls` and `revokedUrls` are intentionally retained after `dispose` (`janitor.ts:357-373`). This is one short string per URL created in the session and it is what keeps `revokeUrl` idempotent and `getStats` truthful. Accepted deviation from "clear all bookkeeping", no payload bytes and no DOM references retained.

## 7. Open Backlog and Severity Table

| ID | Severity | File:line | Summary | Why it does not block Gate 4 |
| :--- | :--- | :--- | :--- | :--- |
| P2-4 | P2 | `useGhostRoom.ts:180-186`, `janitor.ts:150` | Store and unload listeners created during render, disposed by effect | Needs a discarded render to strand one store and two listeners. Low probability, no payload. |
| P2-6 | P2 | `useGhostRoom.ts:549`, `:381`, `:248-252` | `sendMetaRef` entry survives a lost ACK until room change or unmount | One small object per lost ACK, cleared at room boundary and unmount. |
| P2-7 | P2 | `index.css:204` | `.ttl-dissolve` is declared but applied to no element | CSS only. The Step 5 feed must bind it. |
| P2-8 | P2 | `DesktopTopPillBar.tsx:70`, `MobileBottomDock.tsx:19` | Nav timer chips do not change the real preset | The shipped picker (`HomeHub.tsx:215`) is bound; declared Step 5 follow-up. |
| P2-9 | P2 | `docs/08-qa-checklist.md:29` | Checklist `24h` conflicts with the locked 4 label deck | Documentation action, no code defect. |
| P2-10 | P2 | `web/package.json` | No test runner and no janitor regression test in the repo | This audit repeats its harness externally. Should become `janitor.test.ts` in Step 5. |
| P2-11 | P2 | `chunkReceiver.ts:179`, `useGhostRoom.ts:476` | Dead sender holds reassembly buffers until room unmount | Capped at the designed transfer budget, released on unmount. |
| P2-12 | P2 | `janitor.ts:485-489`, `docs/00-prd-source-of-truth.md:55` | Unload notifies peers through the signaling socket, not a wire packet | UI shows `Screen disconnected`; docs wording to be corrected. |
| P2-13 | P2 | `useGhostRoom.ts:611-623` | Latent burn-on-copy download revoke race for files | Unreachable today: files are never created with `burnOnCopy`. |
| P3-1 | P3 | `useGhostRoom.ts:365` | Inbound `ttlMs` is not clamped to known presets | Sender-chosen lifetime is the intended behaviour. |
| P3-2 | P3 | `useGhostRoom.ts:262-273` | A swept `error` row can also raise a Poof notice | Copy sequencing only, Step 5 feed decision. |
| P3-3 | P3 | `janitor.ts:357-373` | URL ledgers survive dispose | Deliberate trade-off, one short string per URL, no payload. |

## 8. Blocker Count

**Zero blockers.** Round 0 blocker P1-1 is closed and re-proven by harness scenarios A and B. No new blocker was introduced by either repair round. The revoke-once invariant holds across all eleven terminal and cleanup paths, verified externally with 64 passing assertions and 14 for 14 URL reconciliation.

## 9. Verdict

**GATE 4: PASS.**

The two lines that failed Round 0 are fixed and independently proven: received text and received files both derive `deleteAt` from the local receipt clock, and the outbound `TEXT` packet is unchanged against `docs/06`. Duplicate ids are rejected before any URL exists, failed items revoke immediately and still expire on schedule, post-dispose stats now expose a leak, post-await writes are mount guarded, and `sendMetaRef` is cleared with the room and the mount.

Gate 4 line by line: live 1 second countdown PASS, revoke plus chunk clear PASS, tab close cleanup PASS. The only open functional-adjacent item is the stale `24h` wording in the checklist (P2-9), which is an orchestrator documentation action because the locked copy deck ships four labels. All other open items are Step 5 work and were already declared as follow-ups by the owning agents.

**GATE PASS**
