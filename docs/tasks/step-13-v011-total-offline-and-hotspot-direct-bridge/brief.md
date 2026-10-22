# Step 13: v0.11 Total Offline and Hotspot Direct WebRTC Bridge Brief
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - orchestrator-signed-off - 2026-10-22

## 1. Executive Summary and Root-Cause Analysis

When a user opens the installed or cached GhostDrop PWA tomorrow completely offline on the same Wi-Fi router or phone hotspot (with mobile data OFF or ON), the UI shell loads from the Service Worker (`web/src/sw.ts`), but the two devices fail to connect.

| # | Pain Point | Root Cause in Current Codebase | Assigned Specialist |
| :--- | :--- | :--- | :--- |
| **1** | **Cached PWA fails completely offline on same Wi-Fi or Phone Hotspot (Mobile Data OFF)** | `window.location.hostname` on a cached production PWA is the public domain (e.g. `ghostdrop.vercel.app`), not a local Node server. Neither `0.peerjs.com` nor `/peerjs` is reachable without internet, and browser sandboxes forbid opening a raw WebSocket server port inside a tab. Without a serverless way to swap the WebRTC Offer and Answer, `PeerJsEngine.connect()` fails. | `@ghostdrop-backend` + `@ghostdrop-web` |
| **2** | **`navigator.onLine` false-positive stall on Wi-Fi without internet / Hotspot with data OFF** | `peerjsEngine.ts:109-112` uses `navigator.onLine === false` to detect offline status. However, when a laptop or phone is connected to a Wi-Fi router without WAN internet or a phone hotspot with mobile data off, the OS still reports `navigator.onLine === true`. `buildIceServers()` injects Google/Twilio STUN servers (causing DNS lookup stalls) and `PeerJsEngine.connect()` hangs for `15,000ms` waiting on `0.peerjs.com`. | `@ghostdrop-backend` |
| **3** | **Phone Hotspot fails even when Mobile Data is ON** | 1) On a public origin, `isPrivateLanHost(hostname)` is `false`. Unless camera permission has been pulsed before ICE gathering, browsers replace local hotspot IPs (`192.168.43.x`, `172.20.10.x`, `192.168.137.x`) with `<uuid>.local` mDNS names, and phone hotspot interfaces frequently drop mDNS multicast between the hotspot phone and tethered laptop. 2) Both devices query Google STUN over the same cellular IP, and Mobile Carrier Symmetric CG-NAT blocks hairpinning on the public `srflx` candidate. | `@ghostdrop-backend` |
| **4** | **No 2-Step QR + Offline Code UI flow for serverless pairing** | `RoomCodeCard.tsx`, `QrScannerModal.tsx`, `HomeHub.tsx`, `MobileJoin.tsx`, and `ConnectedWorkspace.tsx` only handle 6-character PeerJS room codes. They cannot display or scan a compact WebRTC Offer (`#gd=...` / `GD1...`) or render the Guest's Reply QR + Copyable Reply Code for the Host to scan/paste. | `@ghostdrop-ui-polish` + `@ghostdrop-web` |
| **5** | **No automatic recovery when Wi-Fi or Hotspot is turned on after app boot** | `useGhostRoom.ts` does not subscribe to `window.addEventListener('online')` or `navigator.connection?.addEventListener('change')`, leaving the room stuck in `'error'` if the user enables Wi-Fi or hotspot after opening the cached app. | `@ghostdrop-web` |
| **6** | **Version Bump (`0.10 -> 0.11`)** | Zero new dependencies are installed. Per `AGENTS.md` Section 5, increment the decimal version from `0.10` to `0.11` across `web/package.json`, `web/package-lock.json`, and `web/src/lib/constants.ts`. | `@ghostdrop-web` + `@ghostdrop-qa` |

---

## 2. Sequential Execution Order and Agent Ownership

> **CRITICAL ORDERING NOTE:** `@ghostdrop-backend` and `@ghostdrop-ui-polish` MUST execute before `@ghostdrop-web` so that all P2P engine classes/helpers (`OfflineDirectEngine`, `compactSdp`, `iceUnmask`) and all new `copyDeck.ts` keys exist before `@ghostdrop-web` wires them into hooks, modals, and pages.

1. **`@ghostdrop-backend`** (`docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/backend-task.md`):
   - Create `web/src/lib/p2p/compactSdp.ts` (compact WebRTC Offer/Answer + ICE candidate minifier, `CompressionStream('deflate-raw')` + Base64url encoder/decoder, RFC 8866 SDP reconstructor, URL `#gd=` and raw `GD1` token parser).
   - Create `web/src/lib/p2p/iceUnmask.ts` (permission-gated `< 50ms` video track warmup so browsers expose raw RFC1918 LAN/hotspot IPv4 `host` candidates instead of broken `.local` mDNS names).
   - Create `web/src/lib/p2p/offlineDirectEngine.ts` (`P2PSignalingAdapter` + `P2PTransport` over native `RTCPeerConnection` and `RTCDataChannel('ghostdrop')`, plus `BroadcastChannel` same-device instant bridge).
   - Update `web/src/lib/p2p/peerjsEngine.ts` (integrate `unmaskLocalIceIps()`, reduce per-tier signaling timeouts to `2,500ms` so offline Wi-Fi/hotspots fail over quickly even when `navigator.onLine === true`, and keep ICE gathering resilient against unreachable STUN DNS).
   - Update `web/src/lib/p2p/index.ts` barrel exports.

2. **`@ghostdrop-ui-polish`** (`docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/ui-polish-task.md`):
   - Add grandma-simple, zero-jargon Offline Direct feedback keys (`INFO_OFFLINE_READY`, `INFO_OFFLINE_REPLY_READY`, `ERR_OFFLINE_CODE_INVALID`) and UI labels to `web/src/lib/copyDeck.ts` and `docs/02-brand-persona-and-copy.md`.
   - Build the presentational `<OfflineLinkCard />` component (`web/src/components/room/OfflineLinkCard.tsx`) using locked tokens (`#CDF22B` Acid Lime, `#1E45FB` Electric Cobalt, `#F7F6F2` Warm Stone, `Laroka` display headings, `<SquiggleCardBg />` with draw-only `stroke-dashoffset` animation, `QRCodeSVG`, and `lucide-react` SVG icons).

3. **`@ghostdrop-web`** (`docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/web-task.md`):
   - Extend `web/src/hooks/useGhostRoom.ts` to orchestrate automatic fast failover from `PeerJsEngine` to `OfflineDirectEngine` (while also keeping `OfflineDirectEngine` ready on demand), expose `isOfflineDirect`, `offlineInviteToken`, `offlineReplyToken`, `offlineStep` (`'idle' | 'host-waiting-for-reply' | 'guest-showing-reply' | 'connected'`), `acceptOfflineToken(input)`, `activateOfflineDirect()`, and network-change auto-recovery (`online` / `connection.change`).
   - Update `web/src/components/qr/QrScannerModal.tsx` (`mode?: 'join' | 'reply'`, `onAcceptOfflineToken?: (token: string) => Promise<boolean> | boolean`) so both the live camera, native camera photo (`capture="environment"`), and text/paste input accept 6-character room codes AND `GD1...` / `#gd=...` offline tokens.
   - Update `web/src/components/room/RoomCodeCard.tsx`, `web/src/pages/HomeHub.tsx`, `web/src/pages/MobileJoin.tsx`, and `web/src/pages/ConnectedWorkspace.tsx` to embed `#gd=${offlineInviteToken}` into the QR URL when in offline mode, consume `#gd=...` from `window.location.hash` when opened via native phone camera, render `<OfflineLinkCard />` for the Guest's Reply QR/Code and Host's Scan/Paste Reply step, and bump version to `0.11` (`web/package.json`, `web/package-lock.json`, `web/src/lib/constants.ts`).

4. **`@ghostdrop-qa`** (`docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/qa-task.md`):
   - Execute full end-to-end verification of `compactSdp` round-trip fidelity, `OfflineDirectEngine` Offer -> Answer -> DataChannel 16KB file streaming and `TEXT` transfer with zero network, `QrScannerModal` token extraction, hotspot IP unmasking, fast offline failover, and the 6-Gate QA checklist. Write `docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/qa-report.md`.

---

## 3. Non-Negotiable Guardrails for All Agents

1. **Zero Em-Dashes (`U+2014`), Zero En-Dashes (`U+2013`), and Zero Emojis (P0):**
   - Never use an em dash, en dash, or emoji anywhere in source code, comments, UI copy, or documentation. Use standard hyphens (`-`), colons (`:`), or periods (`.`), and use `lucide-react` SVG icons only.
2. **Grandma 2-Second Rule & Zero Technical Jargon (`docs/02-brand-persona-and-copy.md`):**
   - Never display `SDP`, `ICE`, `WebRTC`, `STUN`, `Offer`, `Answer`, `mDNS`, `DataChannel`, or `PeerJS` in any user-facing UI string.
3. **Self-Drawing Squiggly Line Mandate (`decisions.md` D-006):**
   - Any squiggly line must animate exclusively via `pathLength="1"`, `stroke-dasharray: 1`, and `stroke-dashoffset: 1 -> 0`. Never apply fly-in, slide-in, or bounce-in to a squiggly line.
4. **Strict Wire Protocol and Ephemeral Memory Cleanup (`decisions.md` D-011):**
   - `OfflineDirectEngine` must frame all packets identically (`HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK` `<= 16,384` bytes + binary frame with `bufferedAmountLowThreshold = 65536`, `FILE_END`, `FILE_ACK`, `ITEM_NUKE`).
5. **No New Dependencies (`v0.11`):**
   - Do not install any new package in `web/package.json`. Bump version from `0.10` to `0.11`.
6. **Windows PowerShell Safe File Operations:**
   - Always use file Write and Edit tools; never use bash heredocs (`cat << 'EOF'`).

---

## 4. Orchestrator Completion Notes (Signed off)

**Status:** PASS. QA report at `qa-report.md` records 0 P0, 0 P1, 0 P2, 5 P3 at version `0.11`.

### 4.1 Execution order and outcome

| Phase | Owner | Outcome |
| :--- | :--- | :--- |
| 1 | `@ghostdrop-backend` | Created `compactSdp.ts` (811 lines), `iceUnmask.ts`, `offlineDirectEngine.ts` (1032 lines), updated `peerjsEngine.ts` and the `index.ts` barrel. Tier timeout `3500 ms` to `2200 ms`, cloud tier capped at `3200 ms` with explicit overrides still winning. |
| 2 | `@ghostdrop-ui-polish` | Added `INFO_OFFLINE_READY`, `INFO_OFFLINE_REPLY_READY`, `ERR_OFFLINE_CODE_INVALID` plus nine `OFFLINE_*` constants to `copyDeck.ts` and `docs/02-brand-persona-and-copy.md`. Built `OfflineLinkCard.tsx` with draw-only `SquiggleCardBg`, token classes only, `min-h-[44px]` targets, and a clipboard fallback for plain HTTP origins. |
| 3 | `@ghostdrop-web` | Hybrid `PeerJsEngine` plus `OfflineDirectEngine` orchestration in `useGhostRoom.ts`, shared `ChunkReceiver` and packet handlers across both transports, `activeEngine()` routing for send, copy, save and burn, 2-way `QrScannerModal` with `'join'` and `'reply'` modes, `#gd=` hash consumption on mount and `hashchange`, and the `0.10` to `0.11` version bump in three files. |
| 4 | `@ghostdrop-qa` | First audit returned 0 P0, 0 P1, 2 P2, 5 P3 with verdict FAIL. Both P2 findings were dispatched to their owners, fixed, and re-verified. Closure verdict PASS. |

### 4.2 Orchestrator directed fixes beyond the task files

1. **BroadcastChannel late join replay.** The same-device multi-tab shortcut only worked when the guest tab was already listening before the host posted its offer, which is the reverse of the real order. Directed `@ghostdrop-backend` to add a `want-offer` request and single re-post with a 500 ms per requester cooldown and idle, connected and in flight guards. Measured 37 ms and 47 ms to a live link, one peer connection, duplicate offers ignored.
2. **Hub QR density.** Appending `#gd=` to the hub join URL pushed the primary QR to 77 modules at `2.18 px` pitch, breaking the Grandma 2-Second Rule on the fast path. Directed `@ghostdrop-web` to switch the direct link case to `level="L"` in a `216 px` content box while leaving the plain online case byte identical at `168` and `level="M"`. Measured result 61 to 73 modules at `3.54 px` down to `2.96 px`.
3. **Reply QR size.** Phase 1 measured tokens of 299 to 348 characters against a plan estimate of 110 to 180. Directed `@ghostdrop-ui-polish` to render the guest reply QR at `232 px` rather than `184 px` so module pitch stays at or above `3 px`.

### 4.3 Findings carried, not blocking

| ID | Severity | Status | Note |
| :--- | :--- | :--- | :--- |
| P3-1 | P3 | Accepted deviation | Token is 231 chars at zero candidates and 405 at the eight candidate cap, above the plan estimate and above the `220` named in `backend-task.md`. The codec is correct, the estimate was wrong. If density ever needs to drop, cap the QR payload at four candidates rather than changing the D-016 schema, which would break Phase 2 compatibility. |
| P3-4 | P3 | Accepted by orchestrator | The `forceIfPrompted` unmask option has no product caller and is deliberately kept as a documented escape hatch. |
| P3-5 | P3 | Documented deviation | The plain `GD1.` fallback doubles QR density to `2.43 px` on engines without `CompressionStream`. Every current target browser ships it. |

### 4.4 Out-of-scope repairs recorded

| File | Reason | Label |
| :--- | :--- | :--- |
| `web/src/components/room/FeedbackNotice.tsx` | The icon map is `Record<RoomFeedbackKey, LucideIcon>`, so three new feedback keys required entries or `type-check` fails | Minimal, five lines, no logic change |
| `web/src/components/nav/DesktopTopPillBar.tsx` | `openScanner` gained an optional mode argument and was no longer assignable to `MouseEventHandler` | `onClick={() => openScanner()}`, no visual change |
| `docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/brief.md` and `qa-task.md` | Each carried one U+2014 and one U+2013 inside a sentence forbidding them | Rewritten to `U+2014` and `U+2013` notation, orchestrator hygiene |

### 4.5 Verification at closeout

| Command | Exit | Note |
| :--- | :--- | :--- |
| `npm run type-check` | `0` | 3 TypeScript projects |
| `npm run lint` | `0` | `eslint .` |
| `npm run build` | `0` | Precaches 13 entries, 692.68 KiB, writes `dist/sw.js` |
| Code point sweep, 78 files in `web/src` | clean | 0 em dash, 0 en dash, 0 emoji |
| Code point sweep, step 13 task folder | clean | 0 violations |
| Jargon sweep over rendered copy | clean | 0 hits for the nine banned protocol words |
| Version sync | `0.11` | `constants.ts`, `package.json`, `package-lock.json` root and `packages[""]`. The tree has since advanced to `0.12` under Step 14 |
| Dependency delta | zero | No package added, removed, or upgraded at Step 13 |

### 4.6 Handover notes

1. Live device testing was not possible in this environment, because the headless browser gathers zero ICE candidates. The direct link was proven with an injected fake peer connection pair, not with two physical devices on one hotspot. A manual pass on a real phone hotspot remains worth doing before any public push.
2. `docs/07-build-order.md` Step 11 remains DEFERRED and still runs after this step.
3. Step 13 shipped at `0.11`. The repository has since advanced to `0.12` under Step 14 (grandma changelog, Google Sheets feedback, PostHog analytics), which is already committed. Any push of `web/` from this point must satisfy the `AGENTS.md` section 5 gate against `0.12`, not `0.11`.
4. `AGENTS.md` section 5 still names `0.7` as the baseline, and `docs/07-build-order.md` has no Step 14 entry even though Step 14 code is committed. Both are stale and sit outside this step's file ownership. Recommended for the next orchestrator pass.
