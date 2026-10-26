# Decisions Log: GhostDrop

> This file tracks locked architectural, product, and branding decisions along with their rationale and status. Every agent MUST check this file before executing a task. Contradicting a locked decision requires user escalation.

---

## D-001: Phase 1 Scope - Standalone Web App and Multi-Device PWA Only
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** Project Rollout
- **Decision:** We are building the GhostDrop Web App and Installable PWA (`Vite + React + TypeScript + Tailwind CSS`) for connecting laptop, phone, tablet, or any device at all. The native Android app (Phase 2) is deferred for now, though our WebRTC wire protocol remains 100% compatible with it.
- **Rationale:** Immediate cross-device utility without app store delays.

---

## D-002: Signaling Layer - PeerJS (`0.peerjs.com`) with Adapter Abstraction
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** `src/lib/p2p/`
- **Decision:** Use PeerJS (`0.peerjs.com`) with deterministic room IDs (`ghostdrop-room-XXXXXX`) for zero-config, `$0.00/mo` signaling from day one, wrapped behind a clean `P2PSignalingAdapter` interface so Supabase Realtime Broadcast can be swapped in or used as a fallback later without touching UI code.
- **Rationale:** Zero environment variables required for MVP launch while preserving production scale flexibility.

---

## D-003: Multi-Peer Room Topology ("Any Device at All")
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** Room Connection Management
- **Decision:** Support multi-peer rooms where 1 host device (`ghostdrop-room-XXXXXX`) can accept connections from multiple guest devices (phone, tablet, second laptop), and any device can host or join via QR scan, URL (`/join?room=XXXXXX`), or 6-character code entry.
- **Rationale:** User explicitly requested seamless connection across laptop, phone, or any device at all.

---

## D-004: Installable PWA with Web Share Target, In-App QR Scanner and Local TTL
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** PWA and Ephemeral Lifecycle
- **Decision:** Phase 1 includes:
  1. Installable PWA with **Web Share Target API** (`POST /share-target` intercepted by `src/sw.ts`) to receive screenshots, files, and links directly from mobile and desktop OS share menus.
  2. **Built-in In-App QR Scanner** (`jsQR`) so users inside the installed PWA can scan room QR codes directly.
  3. **In-Memory TTL Self-Destruct Timers** (`15m`, `50m`, `24h`, `Burn on Copy`) that automatically call `URL.revokeObjectURL` when expired.
- **Rationale:** Confirmed by user during Phase 1 architectural planning.

---

## D-005: Locked Brand Palette and `Laroka` Display Typography
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** `docs/design.md`, `docs/tokens/`
- **Decision:** All UI designs and code must strictly use the brand assets in `docs/`:
  - **Color 1:** Acid Lime `#CDF22B` (`docs/Brand colours.jpg`)
  - **Color 2:** Electric Cobalt Blue `#1E45FB` (`docs/Brand colours.jpg` and `docs/Logo icon.jpg`)
  - **Canvas and Editorial Accents:** Warm Stone `#EBEAE4` / `#F7F6F2`, Deep Forest `#124B38` (`docs/Woove - Branding line.jpg`), Jet Ink `#0D0F12`, and Crisp White `#FFFFFF`.
  - **Display Font:** `Laroka` (`docs/laroka.otf`) for all headings, 6-letter room codes, numerals, and toast headers, paired with `Plus Jakarta Sans` (body/UI) and `JetBrains Mono` (telemetry/timers).
- **Rationale:** Locked directly from user-provided brand files in project root.

---

## D-006: Signature Squiggly Loop Line and Self-Drawing Animation (`stroke-dashoffset`)
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** All Cards, Hero Backdrops, P2P Bridge and Motion (`docs/05-motion-spec.md`)
- **Decision:** The continuous looping squiggly line from `docs/Woove - Branding line.jpg` and Swatch 3 of `docs/Brand colours.jpg` must be implemented across individual card backgrounds, hero sections, and the active P2P device bridge. **Animation Mandate:** It MUST animate as if being drawn into place (`pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset: 1 -> 0`). **NEVER** use fly-in, fly-out, slide-in, or bounce-in animations on the squiggly line.
- **Rationale:** Explicit branding and motion direction from Kingsley.

---

## D-007: Playful, Joyful Vibe for All UI Copy, Errors and Successes
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** `docs/02-brand-persona-and-copy.md`, All Components
- **Decision:** Both success messages and error messages must be written in a playful, joyful, reassuring vibe (e.g., *"Boom! You're linked up!"*, *"Whoops! That room code ghosted us."*). Raw technical error strings are strictly forbidden in user-facing UI.
- **Rationale:** Explicit product vibe mandate from Kingsley.

---

## D-008: Responsive Navigation Split (Desktop Top Bar / FAB vs. Mobile Sleek Bottom Navbar)
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** Global Layout and Navigation (`docs/01-wireframe-and-pages.md`, `docs/design.md`)
- **Decision:**
  - On **Desktop (`>= 768px`)**, navigation lives in a floating top pill bar (or floating action bar) with brand identity, workspace view toggles, default TTL selector, and primary scan/pair CTA.
  - On **Mobile (`< 768px`)**, navigation lives in a **sleek floating bottom navbar / dock** in the thumb zone, paired with a compact top status header showing only the brand logo and live room connection pill.
- **Rationale:** Explicit responsive UX mandate from Kingsley.

---

## D-009: Zero Em-Dashes and Zero Emojis Anywhere (SVG Icons Only)
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** All UI Copy, Components, Prompts, and Documentation
- **Decision:**
  - **No single em dash** is allowed anywhere in the application UI, copy deck, or documentation. Use hyphens (`-`), colons (`:`), periods (`.`), or commas instead.
  - **No emojis** are allowed anywhere in the application UI, copy deck, or documentation. Whenever an expressive symbol is needed, use crisp **SVG icons** (`lucide-react` or custom brand SVG icons) inside styled circular or pill containers.
- **Rationale:** Explicit typography and iconography guardrail from Kingsley.

---

## D-010: Stage Exports Are Layout References Only; Locked Tokens Win
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** `docs/design/`, `web/src/components/`, `web/src/pages/`, QA Gates 1 and 2
- **Context:** Step 01 QA (`docs/tasks/step-01-design-audit/qa-report.md`) found the Stage exports substitute `Syne` for `Laroka`, drift to `#254AFF` / `#F9F9FD` / `#1A1C1F`, carry Material 3 ramps and Material Symbols icon fonts, render protocol jargon in chrome, and ship no self-drawing squiggle keyframes.
- **Decision:**
  1. Stage exports in `docs/design/` are the canonical **layout, hierarchy, spacing and composition** reference and must be matched structurally.
  2. Stage exports are NOT authoritative for color, typography, iconography, copy, or motion. The locked sources are `docs/tokens/tokens.css`, `docs/tokens/tokens.json`, `docs/laroka.otf`, `lucide-react`, `docs/02-brand-persona-and-copy.md`, and `docs/05-motion-spec.md`.
  3. No palette value, font stack, icon font, jargon string, or animation code may be lifted from a Stage `code.html` into `web/src/`. Implementation must use `var(--color-*)` tokens, `Laroka`, and inline `lucide-react` SVG icons.
  4. QA Gates 1 and 2 are measured against `web/src/` and the `docs/` specifications, never against the immutable Stage exports. Step 01 is therefore signed off as a layout reference gate.
  5. Mobile dock item count resolves to 3 tabs (`Send`, `Scan QR`, `50 Mins`) per `docs/01-wireframe-and-pages.md` and `ghostdrop_mobile_grandma_friendly_hub`. `docs/design.md` section 2 item 2 (4 tabs) is superseded.
- **Rationale:** Re-exporting Stage screens is out of scope for the build, and locked brand decisions D-005, D-006, D-007, D-008, D-009 outrank generated design drift.

---

## D-011: FILE_CHUNK Framing on the Wire Protocol
- **Date:** 2026-10-20
- **Status:** LOCKED
- **Scope:** `web/src/types/protocol.ts`, `web/src/lib/p2p/fileStreamer.ts`, `web/src/lib/p2p/chunkReceiver.ts`
- **Context:** `docs/06-protocol-and-tech-spec.md` section 3 says files travel as `16,384-byte` `ArrayBuffer` slices but its `WirePacket` union omits `FILE_CHUNK`, while `docs/08-qa-checklist.md` Gate 3 requires a `FILE_CHUNK` packet.
- **Decision:**
  1. `FILE_CHUNK` exists as a JSON control packet: `{ type: 'FILE_CHUNK'; id: string; index: number; byteLength: number }`.
  2. The JSON header is immediately followed on the same `RTCDataChannel` by exactly one binary `ArrayBuffer` frame holding only that chunk's bytes. Binary frames never exceed `16,384` bytes and carry no envelope.
  3. Transfers are serialized per file id. No other packet may interleave between a `FILE_CHUNK` header and its binary frame.
  4. Receiver pairs header plus binary frame, validates `byteLength` against the received buffer, and ignores or errors stray binary frames.
- **Rationale:** Keeps the strict `16,384-byte` slice budget, adds the missing packet to the union, and removes ambiguity for QA and the future Android client.

---

## D-012: TTL Preset Labels Resolve to the Copy Deck (No 24h Chip)
- **Date:** 2026-10-21
- **Status:** LOCKED
- **Scope:** `web/src/components/room/TtlPicker.tsx`, `docs/08-qa-checklist.md` Gate 4
- **Decision:** The shipped auto-delete picker exposes exactly four plain-English choices from `docs/02-brand-persona-and-copy.md`: `Delete after 1st copy`, `15 mins`, `50 mins` (default), `When I close this page`. The `24h` preset named in `docs/08-qa-checklist.md` Gate 4 is not rendered because it contradicts the locked copy deck and the Grandma 2-Second Rule. Internally `TtlPreset` still supports `24h` for protocol compatibility.
- **Rationale:** Brand copy deck and the 2-Second Rule outrank the QA checklist shorthand. QA Gate 4 reads the four locked labels as the pass condition.

---

## D-013: `GHOST8` Is a Typographic Illustration, Not a Runtime Room Code
- **Date:** 2026-10-21
- **Status:** LOCKED
- **Scope:** `web/src/lib/constants.ts`, docs examples, QR and join validation
- **Decision:** The literal `GHOST8` may appear in branding, docs, and stage mocks as a typographic illustration of the 6-character code. It is never a valid runtime room code because `O` is excluded from `ROOM_CODE_ALPHABET`. No code path may default to `GHOST8`, prefill it, or treat it as valid. Demo or fallback codes must be generated, or use a valid literal such as `GHST48`.
- **Rationale:** The unambiguous alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) is locked for the wire protocol and QR pairing. Keeping the illustration while removing it from runtime avoids a permanent dead value.

---

## D-014: Versioning Scheme (`0.7`), Offline LAN/Hotspot Signaling, Dynamic Device Identity, Burn-on-Copy Sync, Clipboard/Share Actions, and Card Number Deduplication
- **Date:** 2026-10-21
- **Status:** LOCKED
- **Scope:** `AGENTS.md`, `.agents/agents/GhostDrop/orchestrator.md`, `web/src/lib/p2p/`, `web/vite.config.ts`, `web/src/components/`, `web/src/pages/`, `web/src/hooks/`
- **Decision:**
  1. **Versioning (`v0.7`):** Set baseline version to `0.7` and render `v0.7` directly beside the `GhostDrop` navbar wordmark on both PC and mobile. Whole number increments when a new dependency is installed; decimal place increments per task/fix completed in that version; always bump when pushing `web` to `main` on GitHub.
  2. **Offline LAN and Phone Hotspot Signaling + Camera Secure Context:** Embed the local PeerJS signaling middleware on `/peerjs` inside the Vite server (dev/preview) so a single port serves both the app and WebSocket signaling over offline Wi-Fi or phone hotspot without port `9000` firewall blocks. Strip external STUN servers when offline/LAN so ICE gathers host candidates immediately without DNS stalls. Support HTTPS local mode so mobile browsers treat LAN/hotspot origins as `window.isSecureContext === true` and trigger native camera permission prompts.
  3. **Dynamic Device Detection:** Replace hardcoded `"This Computer"` and `"Waiting for your phone"` with runtime-detected `localDeviceType` (`desktop` | `mobile` | `tablet`) and `localDeviceName` (`This Computer` | `This Phone` | `This Tablet`), plus dynamic remote peer labels and icons (`desktop` | `mobile` | `tablet`).
  4. **Burn-on-Copy (`Delete after 1st copy`) and 15m TTL Fix:** Propagate `burnOnRead?: boolean` on `FILE_START` and `burnOnCopy` into `store.addFile()`, emit `{ type: 'ITEM_NUKE', id, reason: 'BURN_ON_COPY' }` to connected peers on first copy/save, and format sub-minute countdowns as seconds (`45 secs left`) instead of rounding up to `1 min left` for 59 seconds.
  5. **Image/File Clipboard Copy & Native Share:** Add `Copy Image` (`navigator.clipboard.write` with PNG conversion fallback) and native OS `Share` (`navigator.share({ files })`) alongside `Save` as a secondary action on file transfer cards.
  6. **Card Step Number Deduplication:** Remove redundant `1.` and `2.` text prefixes from card headings when an `<OrbBadge>` already displays the step number in a circle.
- **Rationale:** Direct user testing feedback from Kingsley across PC, mobile camera QR scan, offline Wi-Fi, and phone hotspot topologies.

---

## D-015: Prelaunch Coming Soon Wall, Hidden Unlock Gestures, and Brand Colour Slab Motion
- **Date:** 2026-10-22
- **Status:** LOCKED
- **Scope:** `web/src/App.tsx`, `web/src/pages/ComingSoon.tsx`, `web/src/components/soon/`, `web/src/hooks/useLaunchGate.ts`, `web/src/index.css`, `docs/07-build-order.md`
- **Decision:**
  1. **Gate above the P2P runtime.** The coming soon wall renders ABOVE `GhostRoomProvider` in `web/src/App.tsx`. While locked, no signaling WebSocket opens, no `ghostdrop-room-XXXXXX` peer id is registered, and no ICE gathering starts. A teaser visitor must never consume room or signaling state.
  2. **Lock scope is all routes.** `/`, `/join`, `/room/*`, and `/how-it-works` all render the teaser until unlocked. There is no path that bypasses the gate except the unlock gestures.
  3. **Two unlock gestures, no visible UI.** `Ctrl+Alt+C` bound on `event.code === 'KeyC'` with `preventDefault()` and `event.repeat` ignored, plus tapping the GhostDrop logo 3 times inside a `900ms` window via `onPointerDown`. Unlock persists in `localStorage` under `ghostdrop.launch.unlocked`. No visible button, badge, or hint advertises either gesture, and no copy string may reference a gesture.
  4. **Launch is a fixed global instant, not a local clock.** The anchor is 23 October 2026 at 13:00 WAT (UTC+1), which is 12:00 UTC. `LAUNCH_AT` therefore ships as `Date.UTC(2026, 9, 23, 12, 0, 0)`. Every visitor counts down to the same absolute moment regardless of their timezone, and the countdown display derives from the visitor's local offset. Amended on 2026-10-23 at the owner's request, moving the anchor earlier from 17:00 WAT (16:00 UTC) to 13:00 WAT (12:00 UTC).
  5. **At zero the wall unveils itself after a welcome.** When `LAUNCH_AT` has passed, the countdown block is replaced by a welcome state, and after a short hold the gate unlocks itself and persists the unlock. Visitors who arrive after launch see the welcome then land on the app. Manual gestures remain the path before launch. There is no scenario where the wall sits permanently on a visitor after launch.
  6. **Background squiggles stay draw-only.** The teaser renders five squiggly lines that draw in and retract purely via `stroke-dashoffset`, then reposition at a randomized corner or edge anchor **only while the path has zero visible length**. D-006 is unchanged and fully honoured. A squiggle on a visible translation remains a P0 breach, and no exception was granted.
  7. **Brand colour slab motion is permitted.** The four locked brand colours may drift as full-bleed bands on four axes (up, right, down, left) using `transform: translate3d()` only, on loops of 18s to 30s. D-006 bans fly-in, fly-out, slide-in, and bounce-in **on the squiggly line only**. Slab translation is a distinct motion primitive and is explicitly allowed here. Any squiggly line on the teaser still animates exclusively through `pathLength="1"`, `stroke-dasharray: 1`, and `stroke-dashoffset: 1 -> 0`. Note that the production CSS minifier may lower `translate3d()` to `translate` or `translateY()` while keeping identical composed behaviour; source authorship must still be `translate3d()` and the built output is reviewed against behaviour, not syntax.
  8. **Reduced motion is mandatory.** `prefers-reduced-motion: reduce` sets `animation: none !important` on all four slabs with a static offset per slab, and hides the squiggle layer entirely, so the composition still reads as four brand colours without movement.
  9. **Legibility scrim is mandatory.** A Warm Stone scrim sits between the slabs and the content so headline contrast is measured against the scrim, never against a moving Cobalt field.
- **Rationale:** Explicit prelaunch request from Kingsley with a hard global launch instant, the need to keep testing the real app on both PC and phone without exposing it publicly, and a deliberate self-unveiling so no visitor is ever stuck behind a wall after launch. The instant was moved earlier on launch day from 17:00 WAT to 13:00 WAT (12:00 UTC) at Kingsley's request.

---

## D-016: Total Offline Direct WebRTC Bridge (Compact SDP QR + Code Handshake), Hotspot IP Unmasking, and Fast Reachability Failover
- **Date:** 2026-10-22
- **Status:** LOCKED
- **Scope:** `web/src/lib/p2p/`, `web/src/hooks/useGhostRoom.ts`, `web/src/components/qr/QrScannerModal.tsx`, `web/src/components/room/`, `web/src/pages/`, `web/src/lib/copyDeck.ts`, `docs/02-brand-persona-and-copy.md`, `docs/07-build-order.md`
- **Context:** When a user opens the installed/cached production PWA tomorrow completely offline on the same Wi-Fi or phone hotspot (mobile data off or on), `window.location.hostname` is the public static host, not a local Vite `/peerjs` server, and `0.peerjs.com` is unreachable. Furthermore, `navigator.onLine` stays `true` on Wi-Fi routers without internet and on phone hotspots with mobile data off, causing `PeerJsEngine` to stall on cloud signaling and STUN DNS lookups, while mDNS `.local` candidate obfuscation and cellular Symmetric CG-NAT block hotspot connections even when mobile data is on.
- **Decision:**
  1. **Serverless Offline Direct Engine (`OfflineDirectEngine` + `compactSdp.ts`):** Implement a zero-server `P2PSignalingAdapter` over native `RTCPeerConnection({ iceServers: [] })` and `RTCDataChannel('ghostdrop')`. Compress the essential SDP Offer/Answer fields (`ufrag`, `pwd`, raw 32-byte `sha-256` fingerprint, and LAN/hotspot `host` IP:port candidates) into a compact `GD1...` / `GD1Z...` token (`~110-180` chars) embedded in the QR URL fragment (`#gd=...`) and copyable as an offline pairing code.
  2. **Two-Step QR + Offline Code Handshake:** When internet signaling is unreachable (or when a guest scans an `#gd=...` QR), Host displays its Invite QR/Code (`Step 1`), Guest scans/pastes it and immediately renders a high-contrast Acid Lime Reply QR/Code (`Step 2`), and Host scans/pastes the Reply to open the direct LAN/Hotspot `RTCDataChannel` with zero internet and zero server. Also include a `BroadcastChannel` shortcut so same-device offline tabs link in `< 20ms` without scanning.
  3. **Hotspot Local IPv4 Unmasking (`iceUnmask.ts`):** When camera permission is already `'granted'` on the origin (or right after `QrScannerModal` runs), execute a brief `< 50ms` media track warmup before ICE gathering so browsers emit raw RFC1918 LAN/hotspot IPv4 (`192.168.x.x` / `172.20.10.x` / `10.x.x.x`) `host` candidates instead of `.local` mDNS hostnames that phone hotspots drop.
  4. **Fast Reachability Timeout & Auto-Failover:** Never trust `navigator.onLine === true` as proof of internet reachability. Cap per-tier signaling timeouts (`<= 2,500ms`) so Wi-Fi without internet or a hotspot with mobile data off fails over automatically to `OfflineDirectEngine` in `< 3s` instead of hanging for `18.5s`.
  5. **Version `0.11`:** Bump `web/package.json`, `web/package-lock.json`, and `APP_VERSION` in `web/src/lib/constants.ts` from `0.10` to `0.11` (zero new dependencies).
- **Rationale:** Total offline and hotspot compatibility is a P0 requirement before GhostDrop can be considered complete.

---

## D-017: Privacy-First PostHog Analytics and Public Stats Counter API
- **Date:** 2026-10-22
- **Status:** LOCKED
- **Scope:** `web/src/lib/analytics.ts`, `web/api/stats.ts`, `web/src/hooks/useGhostRoom.ts`, `web/src/components/brand/TeleportCounterBadge.tsx`
- **Decision:**
  1. Use PostHog Cloud (free tier: 1M events/month) for aggregate product analytics.
  2. Enforce strict privacy guardrails: `autocapture: false`, `disable_session_recording: true`, `ip: false`.
  3. Never log file names, note content, room codes, or IP addresses. Only log aggregate counts: `room_created`, `peer_connected`, `file_teleported` (with `file_count` and `size_bucket_mb`).
  4. Query total teleports via serverless `/api/stats` endpoint with `Cache-Control: s-maxage=600` so client browsers never see private PostHog read keys, powering a public celebratory counter badge ("500+ files teleported safely").
- **Rationale:** Kingsley requested high-level aggregate usage metrics and public milestone pride without running a database or invading user privacy.

---

## D-018: In-App Feedback and Feature Request Intake via Google Sheets
- **Date:** 2026-10-22
- **Status:** LOCKED
- **Scope:** `web/src/components/feedback/FeedbackModal.tsx`, `web/src/lib/feedback.ts`, `scripts/google-apps-script-feedback.js`
- **Decision:**
  1. Users submit feedback and feature requests via a native in-app modal with category toggle ("I want a new feature" vs "General thought or bug") and message text area.
  2. Submissions post directly to a Google Apps Script web app endpoint that writes a row into a private Google Sheet (`Timestamp`, `Category`, `Message`, `Version`, `Device`).
  3. Discord, Tally, GitHub, and email intake are strictly excluded per explicit user directive.
  4. Success triggers a joyful toast; network errors trigger a reassuring notice without app crash.
- **Rationale:** Zero database infrastructure, zero email clutter, and effortless spreadsheet review on mobile.

---

## D-019: Grandma-Friendly What is New Page with Small Date-Time Markers
- **Date:** 2026-10-22
- **Status:** LOCKED
- **Scope:** `web/src/lib/changelog.ts`, `web/src/pages/WhatsNew.tsx`, `web/src/components/nav/DesktopTopPillBar.tsx`, `web/src/components/nav/MobileStatusHeader.tsx`
- **Decision:**
  1. Create a dedicated `/whats-new` route displaying chronological release cards backdated from `v0.6` to present.
  2. **Grandma 2-Second Rule:** Zero developer jargon permitted. No mentions of WebRTC, SDP, ICE, STUN, buffers, sockets, or function names. Copy must describe simple human outcomes only.
  3. **Small Date-Time Marker:** Every release card must prominently feature a compact date-time badge formatted as `DD MMM YYYY, HH:MM` (e.g. `22 Oct 2026, 21:45`).
  4. **Navigation Integration:** The version badge (`v0.11`) in desktop and mobile headers links directly to `/whats-new`, with an unread Acid Lime dot indicator that clears when visited (persisted via `localStorage`).
  5. Zero em dashes and zero emojis anywhere in copy or UI.
- **Rationale:** Clear user visibility into new features using lay language and exact timestamps.




---

## D-020: Step 11 Resumed and Rebased After Deferral (v0.14)
- **Date:** 2026-10-24
- **Status:** LOCKED
- **Scope:** `docs/tasks/step-11-improvements/**`, `web/src/components/shell/RoomShellSync.tsx`, `web/src/hooks/useJoinUrl.ts`, `web/src/lib/p2p/chunkReceiver.ts`, `web/src/lib/p2p/janitor.ts`, `web/src/components/ui/FeedbackCard.tsx`
- **Decision:**
  1. Step 11 keeps its original 12 improvement items but its version target moved from `0.8` to `0.14`, because Steps 12, 13 and 14 shipped first. The rebase is documented in `docs/tasks/step-11-improvements/brief.md` section 0, and no specialist follows the stale line numbers in the original task files.
  2. Global auto-delete sync lives in `RoomShellSync` mounted inside `ShellChrome`, because `GhostRoomProvider` renders above `ShellProvider` and cannot call `useShell`. Exactly one component publishes `room.ttlPreset` and registers `room.setTtlPreset`; pages must not register a second handler.
  3. An inbound file is staged in `EphemeralStore` at `FILE_START` with `status: sending`, no Blob and no timer. `completeReceivedFile` promotes it in place, revokes any prior URL first, mints exactly one, and starts the TTL at completion.
  4. A stalled inbound transfer must fail loudly, never hang: `IDLE_TIMEOUT_MS = 30000` per transfer, routed through the existing `failTransfer` path. `P2PError` carries an optional `transferId` so one failed stream settles only its own card.
  5. Toast auto-close is exactly `TOAST_AUTO_DISMISS_MS = 5000`, driven by one remaining-time value that controls both the dismissal and the drain bar, with independent pointer and focus pause flags. Inline feedback cards never opt in.
  6. The hub and the in-room QR drawer share one `useJoinUrl` hook so the pairing link and the LAN choice cannot drift.
- **Rationale:** The deferred items were still real user problems at `0.13`. Rebasing against the shipped code, recording the corrected integration points, and enforcing a watchdog on the new receiving path keeps the build order honest without reintroducing stale instructions.
