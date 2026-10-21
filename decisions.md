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
