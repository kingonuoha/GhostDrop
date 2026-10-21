# Step 04: TTL Memory Janitor Web UI Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-21 · ASUS-LAPTOP-DNL - QA repair round 1 - 2026-10-21

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/01-wireframe-and-pages.md`
- `docs/02-brand-persona-and-copy.md` (TTL presets and Poof notices)
- `docs/05-motion-spec.md` (TTL Dissolve spec)

## Objective
Implement `useGhostRoom.ts` React state hook exposing room connection state, peers, send/receive streams, plain-English TTL timer picker UI, and joyful TTL expiry alerts.

## Checklists
- [x] Implement `web/src/hooks/useGhostRoom.ts` orchestrating PeerJS engine, file streamer, and janitor lifecycle.
- [x] Build plain-English auto-delete timer selector (`Delete after 1st copy`, `15 mins`, `50 mins`, `When I close this page`).
- [x] Connect joyful Poof notification card with `Sparkles` SVG icon (`Poof! All gone. 50 minutes passed, so we cleaned up for you`).
- [x] Connect `prefers-reduced-motion` to TTL dissolve animation.
- [x] Enforce zero emojis, zero em dashes, and Grandma 2-Second Rule compliance.

## Implementation Contract (Orchestrator, binding)
- Consume the `EphemeralStore` API from `web/src/lib/p2p/janitor.ts` and `useTtlJanitor` from `web/src/hooks/useTtlJanitor.ts`. Do not duplicate revocation logic.
- `web/src/hooks/useGhostRoom.ts` exposes: `roomCode`, `role`, `status`, `peers`, `items`, `ttlPreset`, `setTtlPreset`, `sendText`, `sendFiles`, `copyItem`, `burnItem`, `installedHint`, `feedback`, `dismissFeedback`, and `connectionError`. Reconnect and cleanup on unmount.
- TTL selector labels exactly: `Delete after 1st copy`, `15 mins`, `50 mins`, `When I close this page`. Default `50 mins`. Plain English, no `TTL` on screen.
- Build `web/src/components/room/TtlPicker.tsx` (segmented pill, active lime, responsive) and use `FeedbackCard` for the Poof notice with the `Sparkles` icon and copy `Poof! All gone.` / `50 minutes passed, so we cleaned up that item for you.` Adjust minutes to the active preset.
- Wire the picker and the Poof card into `HomeHub` so they are visible and functional this step. Full hub layout arrives in Step 5.
- TTL dissolve honors `prefers-reduced-motion` (instant removal, no scale/fade).

## Completion Notes

**Status:** web half of Step 04 complete. Type-check, lint and production build pass.

### Files

| File | Change |
| :--- | :--- |
| `web/src/hooks/useGhostRoom.ts` | New. Room orchestration: one `EphemeralStore` per room, one `PeerJsEngine` per room, inbound `TEXT` and `FILE_*` routing, `ChunkReceiver`, send/copy/burn actions, copy deck feedback. |
| `web/src/lib/copyDeck.ts` | New. Playful copy deck (`RoomFeedbackKey` to headline, body, action) for every success, error, warning and expiry string. Zero raw transport text. |
| `web/src/components/room/TtlPicker.tsx` | New. Segmented pill, four exact plain-English labels, `Flame` / `Timer` / `Clock` / `Power` icons, `aria-pressed` buttons, 2x2 grid at 360px and 4 columns from `sm`. |
| `web/src/components/room/PoofNotice.tsx` | New. `FeedbackCard` with `Sparkles`, headline `Poof! All gone.`, body built from the active preset, `Okay` action. |
| `web/src/components/room/FeedbackNotice.tsx` | New. Renders any copy deck entry with the deck icon; expiry delegates to `PoofNotice`. |
| `web/src/pages/HomeHub.tsx` | Live host room code, link status pill, 6 letter join form, wired note send, `TtlPicker`, feedback and Poof slot. Two-card layout unchanged for Step 5. |
| `web/src/index.css` | Added `ttl-dissolve` (scale 0.95, fade, 320ms) and `poof-notice-enter` (scale 0.94 to 1, fade). Both are `animation: none` under `prefers-reduced-motion: reduce`. |

### Hook API

```ts
useGhostRoom(options?: {
  roomCode?: string | null
  autoConnect?: boolean
  deviceName?: string
  registerUnloadHooks?: boolean
}): {
  roomCode: string | null
  role: 'host' | 'peer'
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  peers: readonly PeerInfo[]
  items: readonly EphemeralItem[]
  now: number
  ttlPreset: TtlPreset
  setTtlPreset: (preset: TtlPreset) => void
  feedback: RoomFeedback | null
  dismissFeedback: () => void
  connectionError: RoomFeedbackKey | null
  installedHint: boolean
  sendText: (text: string) => Promise<boolean>
  sendFiles: (files: readonly File[], options?: { dropAndNuke?: boolean }) => Promise<number>
  copyItem: (id: string) => Promise<boolean>
  burnItem: (id: string) => boolean
}
```

### Contract decisions

- **Room role:** no `roomCode` generates a host code; a valid 6 letter `roomCode` joins as `peer`. An invalid supplied code is treated as a new host room, so a typo can never silently connect to a different room.
- **Store lifecycle:** the store lives in a ref keyed by room code and is replaced on room change. Disposal is deferred by one task so a React `StrictMode` remount can cancel it; a real unmount always disposes. No duplicate revocation logic exists in the hook.
- **`installedHint`:** `matchMedia('(display-mode: standalone)')` plus the iOS `navigator.standalone` flag, read behind a typed cast with no `any`.
- **`FILE_ACK`:** settled only when the local send metadata map holds the transfer id, so a relayed ACK for another device's file is ignored. `OK` plus `dropAndNuke` calls `store.acknowledgeDelivery`; `OK` otherwise flips the item to `ready`; `ERROR` flips it to `error`.
- **Drop and nuke:** the wire flag is per send, so it is passed through `sendFiles(files, { dropAndNuke: true })`. The default is `false` until the Step 5 "Delete from phone after sending" toggle binds it.
- **TTL presets:** `BURN_ON_COPY` never passes `0` as `ttlMs`, it sets `burnOnCopy` / `burnOnRead` instead. `TAB_CLOSE` passes `null`, so nothing expires on a timer.
- **Warnings:** a single `WARN_TTL_EXPIRING_SOON` card is raised per item inside the final 60 seconds, capped at 200 remembered ids.
- **Copy on a burn item:** when `consumeBurnOnCopy` fires, the card raised is `INFO_TTL_EXPIRED` with the `BURN_ON_COPY` body, so the Poof notice also covers first-copy self destruct.
- **Feedback mapping:** `INVALID_ROOM_CODE` and `ROOM_CODE_UNAVAILABLE` map to `ERR_ROOM_NOT_FOUND`; `CONNECT_TIMEOUT` and `SIGNALING_ERROR` map to `ERR_ROOM_NOT_FOUND` for a guest and `ERR_PEER_DISCONNECTED` for a host; everything else maps to `ERR_CHUNK_INTERRUPTED`. `connectionError` carries the key, never a message.
- **Reduced motion:** the dissolve and the Poof entrance are disabled by CSS media query, so an expiry is an instant removal with no scale or fade.

### Verification

- `npm run type-check` in `web/`: pass.
- `npm run lint` in `web/`: pass, zero warnings.
- `npm run build` in `web/`: pass, 1992 modules, PWA `generateSW`, 8 precache entries. The pre-existing `./laroka.otf` runtime resolution warning is unchanged and belongs to Gate 1.
- Dev smoke on `http://localhost:5199/` under `StrictMode`: page renders, host code generated (`FQCF2S`), all four labels present with `50 mins` pressed, no console errors from the hook or the store (only the sandbox signaling socket warning).
- 360px iframe probe: picker lays out as 2x2 (`122.5px` per column), `documentElement.scrollWidth` equals `clientWidth`, and no button has horizontal text overflow.
- Copy probe through the dev module graph: `Poof! All gone.` with `50 minutes passed, so we cleaned up that item for you.`, the 15 minute and burn-on-copy variants substitute the item name, and `ERR_ROOM_NOT_FOUND` renders `We could not find #GHOST8. Check the 6 letters and try again!`.
- Source scan across `web/src`: zero em dashes, zero emojis, no `alert()`, no `any`.

### Follow-ups for Step 5

- Bind the real feed list, active item cards, and the burn, save and copy buttons to `items`, `copyItem`, `burnItem` and `remainingMs`. Apply `ttl-dissolve` to a row before it leaves the snapshot.
- Bind the "Delete from phone after sending" toggle to `sendFiles(files, { dropAndNuke: true })`.
- Wire `DesktopTopPillBar` and `MobileBottomDock` timer pills to a shared `ttlPreset`, since both still hold local or constant state.
- `HomeHub` now hosts a real room on load; Step 5 should keep that single session instead of mounting a second hook per screen.

## QA Repair Round 1

**Scope:** `web/src/hooks/useGhostRoom.ts` only. `web/src/lib/p2p/janitor.ts`, `web/src/hooks/useTtlJanitor.ts`, and every UI file were read but not modified, because another agent is editing the janitor concurrently.

**Status:** all three requested repairs applied. `npm run type-check` and `npm run lint` pass with zero output.

### 1. P1: received text TTL anchored to the local clock

- `web/src/hooks/useGhostRoom.ts:353-368` is the inbound `TEXT` case. The `createdAt: packet.timestamp` argument is gone from the `store.addText` call, so the store falls back to its own local clock (`janitor.ts:172`, `input.createdAt ?? this.clock()`), which is `Date.now()` by default (`janitor.ts:130`).
- `deleteAt` therefore derives from local receive time (`janitor.ts:181` calls `resolveDeleteAt(createdAt, ...)`, which returns `now + ttlMs` at `janitor.ts:99`), matching the inbound file path that already omitted `createdAt` (`useGhostRoom.ts:331-341`).
- The wire packet is untouched: outbound `sendText` still sends `timestamp: Date.now()` (`useGhostRoom.ts:503`), and no type in `web/src/types/protocol.ts` changed.
- Effect: a sender clock that is behind by 20 minutes can no longer expire a note on the first 1000 ms sweep, and a sender clock that is ahead can no longer extend a note past the chosen `15 mins` / `50 mins` window.
- Comment at `useGhostRoom.ts:356-360` records the rule so the sender timestamp is not reintroduced.

### 2. Mounted guard for post-await state writes

- `web/src/hooks/useGhostRoom.ts:223-228` adds `mountedRef`, and `:230-235` keeps it in sync with the real mount (set `true` on attach, `false` on cleanup, so a StrictMode remount re-arms it).
- `web/src/hooks/useGhostRoom.ts:257-260` adds `announce`, a stable `useCallback` that writes `setFeedback` only while mounted.
- Every asynchronous action path now writes through `announce`:
  - `sendText`: `:489`, `:511`, `:514` (dependency list `:518`).
  - `sendFiles`: `:525`, `:535`, and the two post-await sites `:578` (all transports failed) and `:586` (stream threw), dependency list `:592`.
  - `copyItem`: `:618`, `:626-631` (burn on copy), `:633`, dependency list `:637`.
- Already-guarded paths were left as they were: the engine effect uses `active` (`:344`, `:350`, `:408-435`, and the `connect` handlers at `:455-466`), and `handleExpire` (`:262`) only fires from `useTtlJanitor`, which clears its interval and blocks `setNow` after teardown (`useTtlJanitor.ts:55-70`).
- No new dependency, no `any` introduced: `announce` is typed `(next: RoomFeedback) => void` on the existing type-only import at `useGhostRoom.ts:35`.

### 3. Stale `sendMetaRef` cleared on room change and unmount

- `web/src/hooks/useGhostRoom.ts:241-253` still clears `sendMetaRef`, `namesRef` and `warnedRef` when `session.roomCode` changes, and the effect now returns a cleanup at `:248-252` that clears `sendMetaRef` again on room change teardown and on unmount.
- Existing single-entry removals are unchanged: `:381` (ACK), `:576` and `:584` (send failure), `:646` (manual burn). Combined with the cleanup, a lost ACK can no longer outlive its room or the component.
- `sendMetaRef` holds only `{ fileName, dropAndNuke }` ids (`:219`), so the relayed-ACK filter at `:378-381` keeps working: an entry only exists for a locally started transfer.

### Verification

| Command | Result | Detail |
| :--- | :--- | :--- |
| `npm run type-check` | PASS | `tsc --noEmit -p tsconfig.app.json` and `-p tsconfig.node.json`, zero output |
| `npm run lint` | PASS | `eslint .`, zero output, zero warnings |
| Non-ASCII scan | PASS | codepoint scan over `useGhostRoom.ts`: `nonAsciiChars 0`, so zero em dashes, zero emojis, zero curly quotes |
| Storage and `any` scan | PASS | no `localStorage`, `sessionStorage`, `indexedDB`, `dangerouslySetInnerHTML`, `any`, or `alert()` in the edited file |

### Notes for the re-audit

1. One intermediate `npm run type-check` reported three errors inside `web/src/lib/p2p/janitor.ts` (`Property 'assertIdAvailable' does not exist`, missing `leakedObjectUrlCount` in `EphemeralStoreStats`). The file was mid-write by the concurrent janitor agent at that moment; `janitor.ts` was not touched here, and the same command passed on retry with zero output. Flagged as `OUT-OF-CONTRACT REPAIR` NOT applied.
2. QA P2-5 (`useGhostRoom.ts:483`, `:486`, `:550`, `:558`, `:590`, `:605` in the QA report) is closed by repair 2.
3. QA P2-6 (`sendMetaRef` entry survives a lost ACK) is closed for the room-change and unmount windows by repair 3. Per-item expiry on sweep still belongs to the janitor store, which is outside this agent's scope.
4. QA P1-1 re-audit step 2 (rerun the skew harness) is recommended after the concurrent janitor edits settle, since the harness compiles `janitor.ts`.

