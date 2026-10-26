# Step 11: QA Task - Verification of v0.8 Improvements, Bundle Split and Final 6-Gate Sign-Off
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/` (Read-Only Audit; writes `docs/tasks/step-11-improvements/qa-report.md` and updates `docs/tasks/step-09-final-qa-audit/qa-report.md`)

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md` (`D-001` through `D-014`)
- `docs/08-qa-checklist.md` (All 6 Gates)
- `docs/tasks/step-11-improvements/brief.md`
- `docs/tasks/step-11-improvements/backend-task.md`
- `docs/tasks/step-11-improvements/web-task.md`
- `docs/tasks/step-11-improvements/ui-polish-task.md`

## Objective
Audit all 10 Step 11 improvements, verify the version bump to `0.8` (`v0.8`), confirm the main JS chunk is under `500 KB` with `QrScannerModal` lazy-loaded, and execute the full 6-Gate QA checklist.

## Audit Checklists

### 1. Step 11 Verification Checklist (12 Items + v0.8 Bump)
- [x] **Version `0.8` (`v0.8`):** `web/package.json` is `"0.8"`, `APP_VERSION` is `'0.8'`, navbar badge displays `v0.8` on both Desktop and Mobile, and zero new dependencies were added.
- [x] **Receiver-Side Live File Progress:** `ChunkReceiver.onStart` creates a `'sending'` item on the receiver at `FILE_START`, `TransferCard` displays `Receiving... {percent}%` with `<ProgressSquiggle />`, and `completeReceivedFile` promotes it to `'ready'` on `FILE_END` with zero leaked object URLs.
- [x] **Receiver-Side File Arrival Toast:** `SUCCESS_FILE_RECEIVED` (`New file arrived!`) fires when an incoming file finishes reassembly.
- [x] **Manual "Remove Now" (`burnItem`) Button:** Every active `TransferCard` renders a `>= 44px` `Trash2` (`Remove item now`) button that revokes the item locally and broadcasts `ITEM_NUKE` (`MANUAL_BURN`) to connected peers.
- [x] **Interactive Desktop Timer Pill & Global TTL Sync:** `DesktopTopPillBar` opens an accessible timer preset popover, and `GhostRoomProvider` syncs `ttlPreset` with `ShellProvider` across all routes.
- [x] **In-Room QR Code Toggle on `ConnectedWorkspace`:** `ConnectionBridge` allows toggling the room QR code in-place so users can pair without leaving `/room/CODE`.
- [x] **Compact `<SquiggleConnectionBridge />` on `MobileJoin`:** Mobile join view renders the self-drawing squiggle connection bridge with dynamic device icons and names.
- [x] **Clickable Safe Links & Expandable Long Notes:** `http://` and `https://` links in text notes render a safe `Open` (`ExternalLink`) anchor (`target="_blank" rel="noopener noreferrer"`, blocking `javascript:` / `data:`), and notes over 72 characters can expand/collapse.
- [x] **`Show all (N)` Feed Toggle:** `TransferFeed` renders an interactive toggle when more than 3 active items exist.
- [x] **`QrScannerModal` Code-Split & Boot Share Sweep:** `QrScannerModal` is lazy-loaded into a separate async chunk (main entry chunk `< 500 KB` with zero Vite chunk size warning), and `sweepExpiredShareHandoff()` runs on boot.
- [x] **"Kind language for peace of mind" Section Removed from `HowItWorks`:** `HowItWorks.tsx` renders only the header, the 3 step cards, and the bottom question CTA card, with no heading-level skips.
- [x] **5-Second Auto-Closing Toasts with Emptying Progress Bar:** Every toast (`RoomToast` and `Toast`) renders a 5-second emptying progress bar (`100% -> 0%`) and automatically dismisses after `5000ms`.

### 2. Full 6-Gate Regression Audit (`docs/08-qa-checklist.md`)
- [x] **Gate 1:** Brand tokens, `Laroka` font, responsive navigation split at `768px`, and self-drawing squiggle fidelity (`pathLength="1"`, `stroke-dashoffset: 1 -> 0`).
- [x] **Gate 2:** Playful copy compliance, zero em dashes (`U+2014`), zero en dashes (`U+2013`), zero emojis, zero `alert()`, zero technical jargon in rendered DOM text.
- [x] **Gate 3:** Shared wire protocol and 16KB chunk streaming with backpressure.
- [x] **Gate 4:** Ephemeral TTL self-destruct, `URL.revokeObjectURL` ledger reconciliation (`created === revoked`), and `Blob` release.
- [x] **Gate 5:** Installable PWA, Web Share Target (`POST /share-target`), and QR scanner.
- [x] **Gate 6:** Accessibility, `>= 44px` touch targets, `360px` / `768px` / `1024px` / `1440px` zero horizontal overflow, and clean `npm run type-check`, `npm run lint`, and `npm run build`.
