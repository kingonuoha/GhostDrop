# Step 10: QA Task - Verification of v0.7 Offline, Hotspot, Camera, Device Identity, TTL, Clipboard and Card Polish
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/` (Read-Only Audit; writes ONLY `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/qa-report.md` and updates `docs/tasks/step-09-final-qa-audit/qa-report.md` once passed)

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md` (`D-001` through `D-014`)
- `docs/08-qa-checklist.md` (All 6 Gates)
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/brief.md`
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/backend-task.md`
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/web-task.md`
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/ui-polish-task.md`

## Objective
Perform a rigorous, evidence-based audit verifying that all 8 of Kingsley's reported issues and all 6 QA Gates pass with zero blockers.

## Audit Checklists

### 1. Step 10 Feature & Bug-Fix Verification
- [ ] **Versioning (`v0.7`):** Confirm `web/package.json` is `"0.7"`, `APP_VERSION` is `'0.7'`, `v0.7` renders directly beside `GhostDrop` on both Desktop (`DesktopTopPillBar`) and Mobile (`MobileStatusHeader`), and no new runtime dependencies were added without a whole-number bump.
- [ ] **Offline Wi-Fi & Hotspot Signaling:** Confirm Vite serves/proxies `/peerjs` on the same port in both `dev` and `preview`, `GET /__ghostdrop/lan-info` returns LAN/Hotspot IPv4 candidates, `PeerJsEngine` connects via same-origin `/peerjs` first on LAN/Hotspot, and `buildIceServers()` strips external STUN servers on offline/LAN connections so ICE never hangs without internet.
- [ ] **Mobile QR Scanner Camera Access, Native Fallback & Instant Code Input Auto-Focus:** Confirm opening `QrScannerModal` (via `Enter a Code` or `Scan QR`) immediately focuses `#qr-room-code` (`document.activeElement.id === 'qr-room-code'`) so users can type without a second click; confirm `QrScannerModal` invokes `getUserMedia` directly from the user gesture button click when supported, falls back to `{ video: true }`, and exposes the 1-tap native camera capture input (`<input type="file" accept="image/*" capture="environment" />`) decoded via `jsQR` when running on plain HTTP LAN/Hotspot origins.
- [ ] **Dynamic Device Detection (PC vs. Phone vs. Tablet):** Confirm `useGhostRoom`, `ConnectionBridge`, `SquiggleConnectionBridge`, `HomeHub`, and `RoomCodeCard` dynamically render `This Phone` / `This Tablet` / `This Computer` with the matching `Smartphone` / `Tablet` / `Laptop` SVG icon for the local device and `Your Computer` / `Your Phone` / `Your Tablet` for the remote peer.
- [ ] **Cleanup / TTL (`Delete after 1st copy` & `15 mins`):** Confirm `FILE_START` carries `burnOnRead`, `store.addFile()` sets `burnOnCopy`, copying/sharing/saving a `BURN_ON_COPY` text or file immediately removes it locally AND sends `ITEM_NUKE` (`BURN_ON_COPY`) to the peer, changing the preset updates active items in the store, and `formatTimeLeft` shows live second-precision countdowns (`14m 58s left`, `45 secs left`).
- [ ] **Image/File Clipboard Copy & Native Share:** Confirm `TransferCard` and `useGhostRoom` support copying images directly to the clipboard (`ClipboardItem` with PNG conversion), sharing files/images via `navigator.share({ files })`, and saving to disk (`Save`).
- [ ] **Card Step Number Deduplication:** Confirm `<RoomCodeCard />` and `<HomeHub />` no longer duplicate `1.` and `2.` in the `<h2>` text beneath `<OrbBadge>`.

### 2. Full 6-Gate Regression Check (`docs/08-qa-checklist.md`)
- [ ] **Gate 1:** Brand tokens, `Laroka` font, responsive navigation split at `768px`, and self-drawing squiggle fidelity (`pathLength="1"`, `stroke-dashoffset: 1 -> 0`).
- [ ] **Gate 2:** Playful copy compliance, zero em dashes (`U+2014`), zero en dashes (`U+2013`), zero emojis, zero `alert()`.
- [ ] **Gate 3:** Shared wire protocol and 16KB chunk streaming with backpressure.
- [ ] **Gate 4:** Ephemeral TTL self-destruct, `URL.revokeObjectURL` ledger reconciliation (`created === revoked`), and `Blob` release.
- [ ] **Gate 5:** Installable PWA, Web Share Target (`POST /share-target`), and QR scanner.
- [ ] **Gate 6:** Accessibility, `>= 44px` touch targets, `360px` / `768px` / `1024px` / `1440px` zero horizontal overflow, and clean `npm run type-check`, `npm run lint`, and `npm run build`.
