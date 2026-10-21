# Step 11: Receiver Live Progress, Interactive Navbar Timer, Manual Burn, Expandable Notes, Feed Toggle and Bundle Split Brief
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

## 1. Executive Summary and Scope

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
