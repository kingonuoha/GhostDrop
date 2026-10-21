# Step 11: Web Task - v0.8 Bump, Receiver Progress, Arrival Toast, Manual Burn, Interactive Top Timer, Workspace QR, Links & Lazy Scanner
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md` (`D-001` through `D-014`)
- `docs/01-wireframe-and-pages.md`
- `docs/02-brand-persona-and-copy.md`
- `docs/06-protocol-and-tech-spec.md` (Section 5.3 XSS and Link Safety)
- `docs/tasks/step-11-improvements/brief.md`
- `docs/tasks/step-11-improvements/backend-task.md`

## Objective
Implement all 12 Step 11 frontend improvements and bump the version from `0.7` to `0.8` (`v0.8`):
1. **Bump Version to `0.8` (`v0.8`):** Update `web/package.json` (`"version": "0.8"`) and `web/src/lib/constants.ts` (`APP_VERSION = '0.8'`).
2. **Receiver-Side Live File Progress & Arrival Toast (`useGhostRoom.ts` & `TransferCard.tsx`):** Wire `ChunkReceiver`'s `onStart` callback to create an incoming `'sending'` item in `EphemeralStore`, promote it via `store.completeReceivedFile` in `onItem`, and announce `SUCCESS_FILE_RECEIVED` (`New file arrived!`). In `TransferCard.tsx`, display `Receiving... {percent}%` when `item.direction === 'received'` and `item.status === 'sending'`.
3. **Manual "Remove Now" (`burnItem`) Button on `TransferCard`:** Wire `onBurn: (id: string) => void` from `useGhostRoom.burnItem` through `ConnectedWorkspace` and `MobileJoin` -> `TransferFeed` -> `TransferCard` so either screen can manually wipe an item from **both** connected devices with 1 tap.
4. **Interactive Desktop Top Bar Timer Popover + Global `ShellProvider` TTL Sync:** Make the `Auto-delete` pill in `DesktopTopPillBar.tsx` an interactive popover button (matching `MobileBottomDock.tsx`) and sync `room.ttlPreset` + `room.setTtlPreset` with `ShellProvider` inside `GhostRoomProvider.tsx` (so `HomeHub`, `ConnectedWorkspace`, and `MobileJoin` are always 100% synced with both navbars!).
5. **In-Room QR Code Toggle on `ConnectedWorkspace` (`ConnectionBridge.tsx`):** Add a `Show QR Code` / `Hide QR Code` pill button on `ConnectionBridge.tsx` that reveals the room QR code (`QRCodeSVG`) right inside the workspace when clicked, so users who drop a file on `HomeHub` before pairing can still scan the QR code without leaving `/room/CODE`.
6. **Compact `<SquiggleConnectionBridge />` on `MobileJoin.tsx`:** Render `<SquiggleConnectionBridge />` inside `JoinRoom` in `MobileJoin.tsx` so mobile guests also enjoy the self-drawing squiggle bridge linking `This Phone` <-> `Your Computer`.
7. **Clickable Safe Links (`http:` / `https:`) & Expandable Long Notes in `TransferCard.tsx`:** For text items containing a valid `http://` or `https://` URL, render an `Open Link` (`ExternalLink` icon) anchor with `target="_blank" rel="noopener noreferrer"`. For notes longer than 72 characters, render a `Show more` / `Show less` toggle so the full note can be read on screen.
8. **`Show all (N)` Toggle in `TransferFeed.tsx`:** When more than 3 active items exist in the room, display a pill button in the `TransferFeed` header (`Show all ({activeItems.length})` <-> `Latest 3 only`) so earlier items are never hidden permanently.
9. **Lazy-Load `QrScannerModal` in `AppShell.tsx`:** Use `React.lazy(() => import('../qr/QrScannerModal'))` wrapped in `<Suspense>` when `scannerOpen` is true so `jsqr` is split into its own async chunk and the main entry bundle stays well under Vite's `500 KB` threshold.
10. **Call `sweepExpiredShareHandoff()` on Boot (`useShareIntake.ts`):** When the app boots without `?shared=1`, call `void sweepExpiredShareHandoff()` once in the background to purge any stale expired share records from IndexedDB.
11. **Remove "Kind language for peace of mind" Section on `HowItWorks.tsx`:** Delete `const ALERTS` (`lines 83-87`), `<section aria-labelledby="how-alerts-title">` (`lines 193-216`), and unused imports (`FeedbackCard`, `buildFeedback`, `CheckCircle2`, `Ghost`) from `web/src/pages/HowItWorks.tsx`.
12. **5-Second Auto-Closing Toasts with an Emptying Progress Bar (`RoomToast.tsx`, `Toast.tsx`, `FeedbackNotice.tsx`, `PoofNotice.tsx`, `FeedbackCard.tsx`):** Automatically dismiss active toasts after `5000ms` (`5 seconds`) and render a sleek emptying progress bar along the bottom edge of the toast card (`100% -> 0%` over `5s`, pausing on hover/focus).

---

## Detailed Component Implementation Instructions

### 1. Version Bump (`0.7` -> `0.8`)
- In `web/package.json`: set `"version": "0.8"`.
- In `web/src/lib/constants.ts`: set `export const APP_VERSION = '0.8'`.

### 2. Receiver Live Progress & Arrival Toast (`web/src/hooks/useGhostRoom.ts` and `web/src/components/room/TransferCard.tsx`)
- In `useGhostRoom.ts` inside `new ChunkReceiver({...})`:
  - Add `onStart: (started) => { ... }`:
    - If `!active || store.isDisposed() || store.hasItem(started.id)` return.
    - `namesRef.current.set(started.id, started.name)`
    - `store.addFile({ id: started.id, fileName: started.name, mime: started.mime, size: started.size, direction: 'received', ttlMs: started.ttlMs, burnOnCopy: started.burnOnRead, status: 'sending' })`
  - Update `onItem: (received) => { ... }`:
    - If `!active || store.isDisposed()` return.
    - `namesRef.current.set(received.id, received.name)`
    - If `store.hasItem(received.id)`, call `store.completeReceivedFile(received.id, received.blob, { ttlMs: received.ttlMs, burnOnCopy: received.burnOnRead })`.
    - Otherwise call `store.addFile({ id: received.id, file: received.blob, fileName: received.name, mime: received.mime, direction: 'received', ttlMs: received.ttlMs, burnOnCopy: received.burnOnRead, status: 'ready' })`.
    - Announce `setFeedback(buildFeedback('SUCCESS_FILE_RECEIVED', { fileName: received.name }))`!
  - Update `onError: () => { ... }`:
    - Mark any in-flight received items in `'sending'` state as `'error'` or clean them up, and announce `ERR_CHUNK_INTERRUPTED`.
- In `TransferCard.tsx` (`lines 127-160`):
  - When `item.status === 'sending'`, check `const isReceiving = item.direction === 'received'`:
    - Badge subtitle: `isReceiving ? 'Landing on your screen' : 'On its way across'`
    - Progress pill: `{isReceiving ? 'Receiving...' : 'Sending...'} <Numerals text={`${percent}%`} />`
    - Footer meta left: `{isReceiving ? 'From' : 'To'} {peerLabel}`

### 3. Global TTL Sync in `GhostRoomProvider.tsx` and Interactive Timer Popover in `DesktopTopPillBar.tsx`
- Move the `publishTtlPreset` and `registerTtlHandler` `useEffect` hooks out of `MobileJoin.tsx` and into `GhostRoomProvider.tsx` (or `AppShell.tsx`) so **every** route (`/`, `/room/:code`, `/join`, `/how-it-works`) keeps `ShellProvider.ttlPreset` and `room.ttlPreset` in 100% two-way sync!
- In `DesktopTopPillBar.tsx`:
  - Replace the static `<div>` timer pill (`lines 71-77`) with a `<button type="button" aria-expanded={timerOpen} aria-controls="desktop-timer-menu" ...>` that toggles a clean dropdown/popover anchored below the pill containing the 4 `TTL_PRESET_ORDER` buttons (`Delete after 1st copy`, `15 mins`, `50 mins`, `When I close this page`), closing on selection, `Escape`, or outside click.

### 4. In-Room QR Code Toggle on `ConnectionBridge.tsx`
- Pass `joinUrl` (computed the same way as `HomeHub.tsx`, using the LAN/Hotspot candidate URL if on `localhost`) into `<ConnectionBridge />`.
- Add a button `Show QR Code` / `Hide QR Code` (`QrCode` icon from `lucide-react`) in the `ConnectionBridge` header row or chip bar.
- When toggled open (or when `!isLinked` and user clicks `Show QR Code`), render a clean collapsible panel with `<QRCodeSVG value={joinUrl} size={148} />` and `Scan with your other screen to link up`.

### 5. `<SquiggleConnectionBridge />` on `MobileJoin.tsx`
- Inside `JoinRoom` in `web/src/pages/MobileJoin.tsx`, render a compact card above or below the send card containing `<SquiggleConnectionBridge status={isLinked ? 'connected' : 'idle'} hostLabel={room.localDeviceName} hostDeviceType={room.localDeviceType} peerLabel={peerLabel} peerDeviceType={peers[0]?.deviceType ?? 'desktop'} />`.

### 6. Clickable Safe Links & Expandable Long Notes + Manual Burn (`TransferCard.tsx`)
- Add `onBurn?: (id: string) => void` to `TransferCardProps` and `TransferFeedProps`, wired to `room.burnItem` in `ConnectedWorkspace.tsx` and `MobileJoin.tsx`.
- Render a `Trash2` icon button (`aria-label="Remove item now"`, `min-h-[44px] min-w-[44px]`) on each `TransferCard` so the user can manually burn any note or file from both screens immediately.
- For `item.kind === 'text'`:
  - Validate safe URLs using `new URL(value.trim())` checking `url.protocol === 'http:' || url.protocol === 'https:'` (blocking `javascript:` and `data:` per `docs/06-protocol-and-tech-spec.md` Section 5.3).
  - When `isSafeLink` is true, render an `Open` (`ExternalLink` icon) link pill (`<a href={safeUrl} target="_blank" rel="noopener noreferrer">`) alongside `Copy`.
  - When `value.length > 72`, add an inline `expanded` state toggle button (`Show full note` / `Show less`) so the user can view the entire text on screen without truncating.

### 7. `Show all (N)` Toggle in `TransferFeed.tsx`
- Add `const [showAll, setShowAll] = useState(false)` in `TransferFeed.tsx`.
- Filter `const activeItems = items.filter((item) => item.status !== 'nuked')`.
- When `activeItems.length > MAX_VISIBLE`, replace the static `<p>Latest 3 only</p>` with an interactive pill button that toggles `showAll`:
  - When `!showAll`: `Show all ({activeItems.length})`
  - When `showAll`: `Show latest 3`

### 8. Lazy-Load `QrScannerModal` in `AppShell.tsx` and Boot-Time Share Sweep in `useShareIntake.ts`
- In `web/src/components/shell/AppShell.tsx`:
  - Replace `import { QrScannerModal } from '../qr/QrScannerModal'` with `const QrScannerModal = lazy(() => import('../qr/QrScannerModal').then((m) => ({ default: m.QrScannerModal })))`.
  - Wrap `{scannerOpen ? <Suspense fallback={null}><QrScannerModal onClose={closeScanner} /></Suspense> : null}` so `jsqr` is emitted as a separate dynamic chunk.
- In `web/src/hooks/useShareIntake.ts`:
  - When `sharedParam !== '1' && sharedParam !== 'error'`, call `void sweepExpiredShareHandoff()` once per session so expired IndexedDB share payloads are cleaned up on boot.

### 9. Remove "Kind language for peace of mind" Section on `web/src/pages/HowItWorks.tsx`
- In `web/src/pages/HowItWorks.tsx`:
  - Remove `const ALERTS = [...]` (`lines 83-87`).
  - Remove `<section aria-labelledby="how-alerts-title" className="flex flex-col gap-4">...</section>` (`lines 193-216`).
  - Remove unused imports (`CheckCircle2`, `Ghost`, `FeedbackCard`, `buildFeedback`) so `npm run lint` and `npm run type-check` stay 100% clean.

### 10. 5-Second Auto-Closing Toasts with an Emptying Progress Bar (`RoomToast.tsx`, `Toast.tsx`, `FeedbackNotice.tsx`, `PoofNotice.tsx`, `FeedbackCard.tsx`)
- Define `export const TOAST_AUTO_DISMISS_MS = 5000` in `web/src/lib/constants.ts`.
- In `web/src/components/ui/FeedbackCard.tsx`:
  - Add optional `autoDismissMs?: number` to `FeedbackCardProps`.
  - When `autoDismissMs && autoDismissMs > 0 && onDismiss` are present:
    - Run a timer (or `requestAnimationFrame` / interval with hover/focus pause support) that calls `onDismiss()` after `autoDismissMs` (`5000ms`), resetting cleanly whenever the toast identity (`title` + `body` or `key`) changes.
    - Render a sleek emptying progress track along the bottom edge of the `overflow-hidden rounded-[32px]` card (`div` at `inset-x-0 bottom-0 h-1.5 bg-brand-ink/10`):
      - Inside it, render the draining fill bar (`h-full origin-left bg-brand-cobalt` on lime/stone/surface cards, or `bg-brand-lime` on cobalt/dark cards) that smoothly empties from `100%` width down to `0%` width over `5000ms` (`@keyframes toast-progress-empty { from { transform: scaleX(1); } to { transform: scaleX(0); } }` or inline width/scaleX style synced to the remaining timer)!
- Pass `autoDismissMs={TOAST_AUTO_DISMISS_MS}` in `RoomToast.tsx` (via `FeedbackNotice` and `PoofNotice`) and in `Toast.tsx` (used by `InstallCard.tsx`) so **every** toast notification across the entire app automatically closes after 5 seconds with the emptying 5s progress bar, while inline non-toast `FeedbackCard`s (such as the empty feed card or room-not-found page card) do not pass `autoDismissMs` and stay static!

---

## Verification Checklist
- [ ] `web/package.json` and `APP_VERSION` are set to `"0.8"`, and `v0.8` renders beside `GhostDrop` on both PC and Mobile navbars.
- [ ] Receiving a file immediately shows `Receiving... {percent}%` on the receiver screen and raises the `New file arrived!` toast when complete.
- [ ] Clicking the `Trash2` (`Remove item now`) button on any transfer card removes the item locally, revokes its object URL, and wipes it from the connected peer via `ITEM_NUKE` (`MANUAL_BURN`).
- [ ] Clicking `Auto-delete: ...` in `DesktopTopPillBar` opens a preset selector popover, and changing the timer anywhere on Desktop or Mobile stays 100% in sync across all pages and navbars.
- [ ] `ConnectedWorkspace` has a `Show QR Code` toggle on `ConnectionBridge`.
- [ ] `MobileJoin` displays `<SquiggleConnectionBridge />` with dynamic device icons and labels.
- [ ] Text notes with `http://` or `https://` URLs offer a safe `Open` (`ExternalLink`) action (`target="_blank" rel="noopener noreferrer"`), and notes over 72 chars can be expanded/collapsed.
- [ ] `TransferFeed` offers a `Show all (N)` toggle when more than 3 items exist.
- [ ] `QrScannerModal` (`jsqr`) is code-split into a separate chunk, eliminating the Vite `> 500 KB` main chunk warning.
- [ ] `sweepExpiredShareHandoff()` runs on boot when no active share is being claimed.
- [ ] `HowItWorks.tsx` no longer renders the `Kind language for peace of mind` / `Helpful messages you will actually understand.` section.
- [ ] Every toast (`RoomToast` and `Toast`) auto-closes after 5 seconds (`5000ms`) with a smooth emptying progress bar (`100% -> 0%`).
- [ ] `npm run type-check`, `npm run lint`, and `npm run build` exit `0` with zero em dashes and zero emojis.
