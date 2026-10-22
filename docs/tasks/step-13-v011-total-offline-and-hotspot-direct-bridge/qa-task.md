# Step 13 QA Task: Total Offline & Hotspot Direct WebRTC Verification (`@ghostdrop-qa`)
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - qa-complete - 2026-10-22

**Assigned Agent:** `@ghostdrop-qa` (`.agents/agents/GhostDrop/qa.md`)
**Scope:** Read-only audit across `web/` and `docs/`. Writes ONLY `docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/qa-report.md` and marks checkboxes in this file.

---

## Mandatory Pre-Read Before Auditing

1. `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`
2. `decisions.md` (D-001 through D-016)
3. `docs/08-qa-checklist.md`
4. `plans/total-offline-and-hotspot-bridge-plan.md`
5. `docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/brief.md`, `backend-task.md`, `ui-polish-task.md`, `web-task.md`

> **REMINDER (P0):** Zero em dashes (`U+2014`), zero en dashes (`U+2013`), and zero emojis in `qa-report.md` and `qa-task.md`.

---

## Audit & Verification Checklist

### 1. Step 13 Specific Verification Gates
- [x] **1.1 Compact SDP Round-Trip & Token Size Proof:**
  - Execute a Node/TypeScript verification test against `web/src/lib/p2p/compactSdp.ts` proving:
    1. A browser-format Offer SDP with IPv4 (`192.168.43.1`), `.local` mDNS, and IPv6 candidates encodes to a `GD1Z.` / `GD1.` token and decodes back with 100% fidelity (`ufrag`, `pwd`, `sha-256` fingerprint, `setup`, `mid`, `sctp-port`, and prioritized RFC1918 IPv4 candidates).
    2. `reconstructSdpFromCompact` produces valid RFC 8866 SDP lines ending in `\r\n` with `a=end-of-candidates`.
    3. `extractCompactTokenFromInput` extracts tokens from raw `GD1...` strings, full `https://.../join?room=GHST48#gd=GD1...` URLs, and returns `null` for normal 6-letter codes.
- [x] **1.2 `OfflineDirectEngine` End-to-End Handshake & 16KB File Streaming Proof:**
  - Verify `OfflineDirectEngine` (`web/src/lib/p2p/offlineDirectEngine.ts`) implements `P2PSignalingAdapter` and `P2PTransport`, enforces the `16,384`-byte `CHUNK_SIZE_BYTES` budget and `bufferedAmountLowThreshold = 65536`, and completes `startHostOffer` -> `acceptOfferAndCreateAnswer` -> `acceptAnswerToken` -> `HELLO_PEER` -> `TEXT` & `FILE_CHUNK` transfer with zero internet and zero signaling server.
- [x] **1.3 Hotspot IP Unmasking & Fast Reachability Failover Proof:**
  - Verify `unmaskLocalIceIps()` in `web/src/lib/p2p/iceUnmask.ts` only pulses `getUserMedia` when camera permission is `'granted'` and always stops tracks in `finally`.
  - Verify `peerjsEngine.ts` caps per-tier signaling timeouts so offline Wi-Fi routers and phone hotspots with mobile data OFF (where `navigator.onLine === true`) fail over to `OfflineDirectEngine` in `< 4s` instead of stalling for `15s+`.
- [x] **1.4 2-Step QR + Offline Code UI & Scanner Parity Proof:**
  - Verify `QrScannerModal.tsx` accepts both 6-letter room codes AND `GD1...` / `#gd=...` tokens in both `'join'` and `'reply'` modes (via camera scan, photo capture, and paste/text input).
  - Verify `HomeHub.tsx`, `RoomCodeCard.tsx`, `MobileJoin.tsx`, and `ConnectedWorkspace.tsx` embed `#gd=...` in the QR URL, consume `#gd=...` from `window.location.hash`, and render `<OfflineLinkCard />` for Guest Reply and Host Step 2.
- [x] **1.5 Network Auto-Recovery Proof:**
  - Verify `useGhostRoom.ts` listens for `online` and `navigator.connection` `change` events to auto-recover when connectivity changes.

---

### 2. Full 6-Gate Regression Audit (`docs/08-qa-checklist.md`)
- [x] **Gate 1 (Brand, Palette, Laroka, Squiggle Draw-Only, Zero Emojis / Zero Em-Dashes):**
  - Scan all files in `web/src/` and `docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/` for `U+2014`, `U+2013`, and emojis. Must be `0`.
  - Confirm `<OfflineLinkCard />` uses `<SquiggleCardBg />` (draw-only `stroke-dashoffset`) and token classes only.
- [x] **Gate 2 (Responsive Navigation & Grandma-Simple Copy):**
  - Confirm zero technical jargon (`SDP`, `ICE`, `WebRTC`, `STUN`, `mDNS`) appears in any UI component or `copyDeck.ts`.
  - Confirm all interactive controls in `<OfflineLinkCard />`, `RoomCodeCard.tsx`, and `QrScannerModal.tsx` have `min-h-[44px]`.
- [x] **Gate 3 (P2P Wire Protocol & 16KB Backpressure):**
  - Confirm `CHUNK_SIZE_BYTES = 16384`, `BUFFERED_LOW_THRESHOLD = 65536`, and `MAX_BUFFERED_AMOUNT = 262144` are preserved across both `PeerJsEngine` and `OfflineDirectEngine`.
- [x] **Gate 4 (Ephemeral Memory & `URL.revokeObjectURL`):**
  - Confirm `EphemeralStore` and `useTtlJanitor` remain intact.
- [x] **Gate 5 (PWA & Service WorkerOffline Caching):**
  - Confirm `npm run build` succeeds and `dist/sw.js` precaches all app shell assets so opening `/join?room=XXXXXX#gd=...` completely offline serves the cached app shell.
- [x] **Gate 6 (TypeScript, ESLint, Version `0.11` Sync):**
  - Run `npm run type-check`, `npm run lint` (or `npx eslint src`), and `npm run build` in `web/`.
  - Verify `"0.11"` in `web/package.json`, `web/package-lock.json`, and `APP_VERSION = '0.11'` in `web/src/lib/constants.ts`.

---

## Deliverable

- [x] Write `docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/qa-report.md` with device stamp on line 2, severity counts (`P0`, `P1`, `P2`, `P3`), and evidence for every check above.
