# Step 11: Receiver Live Progress, Interactive Navbar Timer, Manual Burn, Expandable Notes, Feed Toggle and Bundle Split Brief
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21 · `ASUS-LAPTOP-DNLA241D` - resumed and rebased onto 0.13 - 2026-10-24

## 0. Rebase Note (2026-10-24): Resumed After Steps 12, 13 and 14

Step 11 was deferred in `docs/07-build-order.md` and Steps 12, 13 and 14 shipped first. This section restates the work against the shipped code at version `0.13`, so no specialist follows a stale line number.

### 0.1 Version rule for this execution

- Shipped baseline is `0.13` (`web/package.json` and `APP_VERSION` in `web/src/lib/constants.ts`).
- Step 11 installs **zero new dependencies**, so the decimal increments: `0.13` to **`0.14`**.
- `@ghostdrop-web` must also append a `v0.14` entry to `web/src/lib/changelog.ts` (grandma copy, `DD MMM YYYY, HH:MM` marker, zero jargon) so `/whats-new` and the unread dot stay truthful.
- The original `0.7 -> 0.8` instruction in sections 1 to 3 is historical and is **superseded** by this section.

### 0.2 Live status of the 12 items at `0.13`

| # | Item | Status found in code at `0.13` | Owner now |
| :--- | :--- | :--- | :--- |
| 1 | Receiver live progress | Missing. `ChunkReceiver` has no `onStart`, `useGhostRoom` only stages inside `onItem`. | backend then web |
| 2 | File arrival toast | Missing. `SUCCESS_FILE_RECEIVED` absent from `copyDeck.ts` and docs. | ui-polish then web |
| 3 | Manual burn button | Partial. `room.burnItem` exists and sends `ITEM_NUKE`; zero UI calls it. | web |
| 4 | Desktop timer popover + global TTL sync | Missing. `DesktopTopPillBar.tsx` renders a static `div`; only `MobileJoin.tsx` syncs the shell. | web |
| 5 | In-room QR toggle | Missing. `ConnectionBridge` has no QR panel and no `joinUrl`. | web |
| 6 | Squiggle bridge on mobile join | Missing. `MobileJoin.tsx` never renders `SquiggleConnectionBridge`. | web |
| 7 | Safe links + expandable notes | Missing. `TransferCard.tsx` still calls `shortenText` with no toggle and no `ExternalLink` anchor. | web |
| 8 | `Show all (N)` feed toggle | Missing. `TransferFeed.tsx` hard slices `.slice(-3)`. | web |
| 9 | Lazy `QrScannerModal` | Missing. `AppShell.tsx` statically imports it. Note the modal now takes `mode={scannerMode}`. | web |
| 10 | Boot share handoff sweep | Missing. `sweepExpiredShareHandoff` does not exist in `shareHandoff.ts`. | backend then web |
| 11 | Remove HowItWorks alerts section | Missing. `ALERTS`, `Kind language for peace of mind` and the section are still rendered. | web |
| 12 | 5 second auto-closing toasts | Missing. `FeedbackCard` has no `autoDismissMs` and no drain bar. | web then ui-polish |

### 0.3 Corrected instructions for files that changed since 2026-10-21

1. **Global TTL sync cannot live in `GhostRoomProvider`.** `App.tsx` renders `GhostRoomProvider` ABOVE `AppShell`, and `ShellProvider` lives inside `AppShell`, so the room provider cannot call `useShell`. Create one small `RoomShellSync` component (for example `web/src/components/shell/RoomShellSync.tsx`) mounted inside `ShellChrome` in `AppShell.tsx`. It calls `publishTtlPreset(room.ttlPreset)` and `registerTtlHandler(room.setTtlPreset)`. Then delete the duplicate `publishTtlPreset` and `registerTtlHandler` effects from `MobileJoin.tsx`, so two registrations can never overwrite each other.
2. **`QrScannerModal` is now mode aware.** The lazy render is `{scannerOpen ? <Suspense fallback={null}><QrScannerModal mode={scannerMode} onClose={closeScanner} /></Suspense> : null}`.
3. **QR URL logic must not be duplicated.** Extract the existing `HomeHub` join URL computation (`fetchLanInfo`, `resolveJoinOrigin`, offline invite token) into one hook, `web/src/hooks/useJoinUrl.ts`, and use it in both `HomeHub.tsx` and `ConnectedWorkspace.tsx`. `ConnectionBridge` then receives a `joinUrl` prop. Hub behaviour must stay byte identical.
4. **`EphemeralStore` API for the receiving card.** Backend adds `completeReceivedFile(id, file, options)`. `addFile` must accept a missing `file` Blob while `status === 'sending'` and use `size` from `FILE_START`, so the receiving card exists at 0 percent.
5. **Toast timing contract.** `FeedbackCard` gains `autoDismissMs?: number` and a bottom drain bar. Timing must be exact and hover/focus pausable, so drive both the dismissal and the bar `transform: scaleX(...)` from one remaining-time value (interval tick is acceptable), not from a CSS animation that cannot pause. Inline, non toast cards (empty feed, room not found) must never pass `autoDismissMs`.

### 0.4 Execution Order and Gates

1. `@ghostdrop-backend`: `chunkReceiver.onStart`, `EphemeralStore` placeholder plus `completeReceivedFile`, `sweepExpiredShareHandoff`.
2. `@ghostdrop-ui-polish`: `SUCCESS_FILE_RECEIVED` copy deck entry in `docs/02-brand-persona-and-copy.md`, `web/src/lib/copyDeck.ts` and the icon map in `web/src/components/room/FeedbackNotice.tsx`.
3. `@ghostdrop-web`: all 12 wiring items, `RoomShellSync`, `useJoinUrl`, desktop timer popover, workspace QR drawer, receiver progress card, burn button, safe link plus expand toggle, feed toggle, lazy scanner, boot sweep, HowItWorks cleanup, toast timer plumbing, version `0.14`, changelog entry.
4. `@ghostdrop-ui-polish`: craft pass over the new surfaces, 44px targets, focus rings, reduced motion, token contrast, zero em dash and zero emoji sweep.
5. `@ghostdrop-qa`: full 6 gate audit plus a Step 11 item matrix, writes `docs/tasks/step-11-improvements/qa-report.md`.

Every gate must end with `npm run type-check`, `npm run lint` and `npm run build` exiting `0` in `web/`.

---

## 1. Executive Summary and Scope (historical, superseded by Section 0)

Following `step-10-v07-offline-hotspot-camera-ttl-and-ux` (which brings the app to `v0.7`), `step-11-improvements` delivers 12 high-impact UX, protocol, and performance refinements discovered during our full-codebase audit and user review, and bumps the application version from `0.7` to **`0.8`** (`v0.8` - decimal increment per `AGENTS.md` Section 5, zero new dependencies).

| # | Improvement Item | Root Cause in Current Codebase | Assigned Specialist |
| :--- | :--- | :--- | :--- |
| **1** | **Receiver-Side Live File Progress (`Receiving... 42%`)** | `ChunkReceiver` (`web/src/lib/p2p/chunkReceiver.ts:183-228`) has no `onStart` callback, and `useGhostRoom.ts:454-465` only calls `store.addFile()` inside `onItem` after 100% of chunks arrive. The receiver sees nothing while a large photo/video is downloading. | `@ghostdrop-backend` + `@ghostdrop-web` |
| **2** | **Receiver-Side File Arrival Toast (`New file arrived!`)** | `useGhostRoom.ts:475-493` announces `SUCCESS_TEXT_RECEIVED` when a note arrives, but `ChunkReceiver.onItem` (`lines 454-465`) adds received files silently with no toast. | `@ghostdrop-ui-polish` + `@ghostdrop-web` |
| **3** | **Manual "Remove Now" (`burnItem`) Button on Every Transfer Card** | `useGhostRoom.ts:848-864` already implements `burnItem(id)` (which revokes the local `blobUrl` and sends `ITEM_NUKE` with `reason: 'MANUAL_BURN'` to wipe the item from connected peers), but `TransferCard.tsx`, `TransferFeed.tsx`, `ConnectedWorkspace.tsx`, and `MobileJoin.tsx` never wire a `Trash2` (`Remove now`) button to it. | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **4** | **Interactive Desktop Top Bar Timer Pill + Global TTL Sync** | `DesktopTopPillBar.tsx:71-77` renders `Auto-delete: 50 mins` as a non-interactive `<div>`. Moreover, only `MobileJoin.tsx:141-145` syncs `room.ttlPreset` with `ShellProvider`; `HomeHub.tsx` and `ConnectedWorkspace.tsx` do not, leaving the Desktop top navbar pill out of sync when the user changes the timer on the page! | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **5** | **In-Room QR Code Popover / Toggle on `ConnectedWorkspace`** | In `HomeHub.tsx:53-75`, dropping a file or typing a note before pairing stashes the drop and navigates to `/room/CODE?host=1`, where no QR code is shown. Adding a `Show QR Code` pill on `ConnectionBridge.tsx` lets the host reveal the room QR code right inside the workspace to pair a first or second device at any time. | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **6** | **Compact `<SquiggleConnectionBridge />` on `MobileJoin`** | `MobileJoin.tsx:180-251` lacks the self-drawing `<SquiggleConnectionBridge />`, so mobile guests do not see the visual squiggle bridge linking `This Phone` <-> `Your Computer`. | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **7** | **Clickable Safe Links (`http:` / `https:`) and Expandable Long Notes** | `TransferCard.tsx:178-224` truncates notes to 72 chars via `shortenText(value)` with no expand toggle and does not render an `Open Link` (`ExternalLink`) anchor for `http://` / `https://` URLs as required by `docs/06-protocol-and-tech-spec.md` Section 5.3 (`target="_blank" rel="noopener noreferrer"`). | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **8** | **`Show all (N)` Toggle When More Than 3 Items Are in the Feed** | `TransferFeed.tsx:36-39` hard-slices `.slice(-3)`. Dropping 4+ screenshots hides older active items with no way to view them. Adding a `Show all ({count})` / `Show latest 3` toggle pill keeps the default view ultra-clean while making every active item accessible. | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **9** | **Lazy-Load `QrScannerModal` (`jsQR` Code-Split)** | `AppShell.tsx:2` statically imports `QrScannerModal`, pulling `jsqr` into the main bundle (`579 KB`, triggering Vite's `> 500 KB` chunk warning). Lazy-loading `QrScannerModal` via `React.lazy` + `<Suspense>` cuts initial bundle size below `500 KB`. | `@ghostdrop-web` |
| **10** | **Boot-Time Sweep of Expired PWA Share-Target Handoffs (`Step 07 QA F-01`)** | `shareHandoff.ts` only purges IndexedDB records when `/?shared=1` is claimed. Calling `sweepExpiredShareHandoff()` on boot guarantees zero unclaimed expired shares remain in IndexedDB past the 5-minute TTL. | `@ghostdrop-backend` + `@ghostdrop-web` |
| **11** | **Remove "Kind language for peace of mind" Section on `HowItWorks.tsx`** | `HowItWorks.tsx:83-87` and `193-216` render a redundant 3-card `ALERTS` showcase section (`Kind language for peace of mind` / `Helpful messages you will actually understand.`). User requested removing this section so `HowItWorks` focuses purely on the 3 easy steps and the bottom CTA card. | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **12** | **5-Second Auto-Closing Toasts with an Emptying Progress Bar** | `RoomToast.tsx:16-30` and `InstallCard.tsx:96` stay on screen indefinitely until manually dismissed, and have no visual countdown indicator. User requested all toasts auto-close after `5 seconds` (`5000ms`) with a smooth emptying progress bar (`100% -> 0%` over `5s`). | `@ghostdrop-web` + `@ghostdrop-ui-polish` |

---

## 2. Version Bump Rule (`0.7 -> 0.8`)

Per `AGENTS.md` Section 5 and `.agents/agents/GhostDrop/orchestrator.md`:
- Step 11 installs **zero new dependencies**, so the whole number remains `0` and the decimal increments from `.7` to **`.8`**.
- `@ghostdrop-web` must update `web/package.json` (`"version": "0.8"`) and `web/src/lib/constants.ts` (`APP_VERSION = '0.8'`), so the navbar badge renders `v0.8` on both PC and Mobile.

---

## 3. Execution Order and Agent Ownership

1. **`@ghostdrop-backend`** (`docs/tasks/step-11-improvements/backend-task.md`):
   - `ChunkReceiver` `onStart` callback + `EphemeralStore` placeholder-to-ready file promotion (`attachFileBlob` / `updateItem` with `blob` and `blobUrl`) + `sweepExpiredShareHandoff()` in `shareHandoff.ts`.
2. **`@ghostdrop-web`** (`docs/tasks/step-11-improvements/web-task.md`):
   - Version bump to `0.8` (`v0.8`), receiver live progress wiring, `SUCCESS_FILE_RECEIVED` toast, `burnItem` button wiring, interactive Desktop navbar timer popover + global `ShellProvider` TTL sync across all pages, `Show QR Code` drawer on `ConnectedWorkspace`, `<SquiggleConnectionBridge />` on `MobileJoin`, clickable `http/https` links + expandable long notes, `Show all (N)` feed toggle, `React.lazy` split for `QrScannerModal`, and boot-time share handoff sweep.
3. **`@ghostdrop-ui-polish`** (`docs/tasks/step-11-improvements/ui-polish-task.md`):
   - `SUCCESS_FILE_RECEIVED` copy deck entry in `docs/02-brand-persona-and-copy.md` and `web/src/lib/copyDeck.ts`, receiving-state progress card styling, `Trash2` (`Remove now`) button craft, expandable note/link UI, and desktop timer popover styling.
4. **`@ghostdrop-qa`** (`docs/tasks/step-11-improvements/qa-task.md`):
   - Full verification of all 10 Step 11 improvements + bundle size check (`< 500 KB` main chunk) + 6-Gate QA regression audit in `docs/tasks/step-11-improvements/qa-report.md`.

---

## 7. Completion Notes (2026-10-24)

**Device stamp:** `ASUS-LAPTOP-DNLA241D` - completed - 2026-10-24

**Version shipped:** `0.13` to `0.14` (zero new dependencies), synced in `web/package.json` and `web/src/lib/constants.ts`, with a `v0.14` entry added to `web/src/lib/changelog.ts` so `/whats-new` and the unread dot stay truthful.

### 7.1 Delivered

| # | Item | Outcome |
| :--- | :--- | :--- |
| 1 | Receiver live progress | `ChunkReceiver.onStart` stages a `sending` placeholder at FILE_START, `completeReceivedFile` promotes it in place with one object URL, and the card reads `Receiving... N%` |
| 2 | Arrival toast | `SUCCESS_FILE_RECEIVED` shipped in the copy deck, docs and icon map; suppressed when the placeholder was burned mid flight |
| 3 | Manual burn | `Remove item now` wired through both pages and the feed, revoking locally and sending `ITEM_NUKE` with `MANUAL_BURN` |
| 4 | Desktop timer and global TTL | Interactive popover on the top pill bar, with `RoomShellSync` as the single publisher and handler for every route |
| 5 | In-room QR drawer | `Show QR Code` panel fed by `useJoinUrl`, shared with the hub so the two links cannot drift |
| 6 | Mobile squiggle bridge | `SquiggleConnectionBridge` on `MobileJoin` with live device labels |
| 7 | Safe links and expandable notes | `http` and `https` only, hardened anchor, `Show full note` toggle |
| 8 | Feed toggle | `Show all (N)` and `Latest 3` with disclosure semantics |
| 9 | Lazy scanner | `jsqr` isolated in the async `QrScannerModal` chunk, entry chunk 222.67 kB |
| 10 | Boot share sweep | `sweepExpiredShareHandoffOnce` runs from `ShellChrome` on every route and never races a live claim |
| 11 | HowItWorks cleanup | Alerts section and unused imports removed, heading order intact |
| 12 | Five second toasts | `TOAST_AUTO_DISMISS_MS = 5000` with a drain bar driven by the same remaining time and independent pointer and focus pauses |

### 7.2 Follow-ups fixed during QA

F-02 launch titles, F-03 inbound idle watchdog (`IDLE_TIMEOUT_MS = 30000`), F-04 root em dash, F-05 `P2PError.transferId` error scoping, F-06 popover `role=group`, F-07 feed badge count, F-08 sweep scope, F-09 logo comment, F-12 listener isolation, F-14 preset label dedupe. Evidence lives in `qa-report.md` section 8.

### 7.3 Still manual before pushing `web/` to main

1. Two device run for receiver progress, arrival toast, cross device burn and the burn mid flight assertion.
2. 768px viewport measurement of the desktop pill bar.
3. Toast focus pause with a real keyboard.
4. Cold offline PWA boot with airplane mode.

QA report: `docs/tasks/step-11-improvements/qa-report.md` (PASS, 0 P0, 0 P1).

---

## 8. Post-Signoff Fix Batch (v0.15)

**Device stamp:** `ASUS-LAPTOP-DNLA241D` - fix batch - 2026-10-26

Four user acceptance defects fixed after the 0.14 signoff: progress wave alignment and drift, shared room auto-delete preset via the new `TTL_SET` packet, manual burn notice no longer gated on the peer registry, and an offline paste fallback with clearer two-scan copy. Details and evidence are in `qa-report.md` section 12. Version is `0.15`, zero new dependencies, all gates green.
