# 00-prd-source-of-truth.md: GhostDrop Product Requirements Document (PRD)

- **Document Version:** 1.2 (Locked for Phase 1 Web and Multi-Device PWA)
- **Project Name:** GhostDrop
- **Category:** Ephemeral P2P Device Bridge and Self-Destructing Drop Manager
- **Hosting and Infrastructure:** Vercel (Frontend SPA/PWA), PeerJS (`0.peerjs.com`) with Supabase Realtime Broadcast adapter readiness (Signaling), WebRTC `RTCDataChannel` (Transport)
- **Database Requirement:** Zero (100% Stateless / Ephemeral in Browser RAM)
- **Budget:** `$0.00 / month`

---

## 1. Executive Summary and Rollout Strategy

GhostDrop solves daily cross-device sharing pain points without cloud storage, user accounts, or database subscriptions:
1. **Instant Any-Device Drop:** Sending links, clipboard snippets, screenshots, and files between a laptop, phone, tablet, or second PC without messaging yourself on WhatsApp or Telegram.
2. **TTL Self-Destructing Drops:** Automatically purging dropped screenshots, OTPs, receipts, and files from browser memory after a user-defined Time-To-Live (`15m`, `50m`, `24h`, or `Burn on Copy/Download`), or immediately upon receiving `FILE_ACK` ("Drop and Nuke").

### Phased Rollout Strategy
- **Phase 1 (Current Active Scope - Standalone Web App and PWA on Vercel):**
  - Ship the **Standalone Web App and Installable PWA** (`ghostdrop.vercel.app`) for instant Web-to-Web / PWA-to-Web (Phone <-> Laptop <-> Tablet <-> Any Device) file and clipboard drops.
  - Includes **Multi-Peer Room Support**, **PWA Web Share Target API** (share directly from mobile OS share sheet into GhostDrop PWA), **Built-in In-App QR Scanner**, **In-Memory TTL Self-Destruct Timers**, **Desktop Top Pill Bar / FAB**, and **Mobile Sleek Floating Bottom Navbar**.
- **Phase 2 (Deferred - Native Android Companion):**
  - Not being built right now. When built later, it will connect directly to the Phase 1 Web App using the exact same Section 4 Wire Protocol.

---

## 2. System Architecture and Shared Signaling

Vercel static/SPA hosting is 100% stateless. All devices pair through a shared, stateless signaling layer:
- **Primary (Phase 1 Default):** Public PeerJS Server (`0.peerjs.com`) using deterministic room prefixes (`ghostdrop-room-XXXXXX` for the Room Host, and `ghostdrop-peer-<uuid>` for joining peers).
- **Adapter-Ready Fallback (Future Scale):** Clean `P2PSignalingAdapter` TypeScript interface so `SupabaseRealtimeAdapter` (`supabase.channel('room-XXXXXX')`) or a custom PeerServer can be toggled via environment variables without changing any UI component.

### Multi-Device Data Flow
1. **Host Device (Laptop or Any Device)** opens GhostDrop -> Automatically generates a 6-character alphanumeric Room ID (e.g., `GHOST8`) and scannable QR Code (`https://ghostdrop.vercel.app/join?room=GHOST8`).
2. **Joining Device(s) (Phone Browser, Installed PWA, Tablet, or 2nd Laptop)** scans QR Code (via stock camera OR GhostDrop's In-App QR Scanner) or enters the 6-char code -> Joins Signaling Room.
3. **Handshake:** Devices exchange WebRTC SDP and ICE candidates via Signaling Server and exchange `HELLO_PEER` metadata (device nickname, icon type).
4. **Direct Tunnel:** WebRTC `RTCDataChannel` opens directly peer-to-peer. The UI's **Signature Squiggly Line** draws itself across to link the devices!
5. **Transfer:** Text snippets and `16,384-byte` (`16KB`) binary file chunks stream peer-to-peer with `bufferedAmountLowThreshold` backpressure control.

---

## 3. Phase 1 Functional Requirements (Web and PWA)

- **FR-1.1 (Room and QR Generation):** Opening the home view automatically generates a unique 6-character unambiguous alphanumeric code and renders a scannable QR code (`https://ghostdrop.vercel.app/join?room=XXXXXX`).
- **FR-1.2 (Zero-Install Mobile Web Join + In-App QR Scanner):**
  - Scanning the QR code with any stock phone camera opens `/join?room=XXXXXX` and connects within 2 seconds.
  - Users inside the installed PWA can also tap **"Scan QR Code"** on the mobile sleek bottom navbar to use the built-in camera scanner modal or type the 6-character code manually.
- **FR-1.3 (Bidirectional Clipboard and Snippet Sync):**
  - Pasting text (`Ctrl+V` / `Cmd+V` anywhere on the page) or typing into the composer immediately beams the text to connected peers with a 1-tap **[Copy]** pill button (with nested SVG icon) and clickable auto-detected URLs.
- **FR-1.4 (16KB Chunked File Streaming with Backpressure):**
  - Selecting, dragging, or pasting files/screenshots slices each file into `16,384-byte` (`16KB`) `ArrayBuffer` chunks, streams them with `bufferedAmountLowThreshold` backpressure control, displays a live progress percentage and speed indicator, reconstructs the downloadable `Blob` on the receiver, and returns `FILE_ACK`.
- **FR-1.5 (Ephemeral TTL Self-Destruct and Memory Cleanup):**
  - Every dropped item carries a configurable TTL preset (`50m` default, `15m`, `24h`, `Burn on Copy/Download`, or `Until Tab Close`).
  - A 1-second janitor hook counts down each item and calls `URL.revokeObjectURL(blobUrl)` + purges memory when the timer hits zero, emitting a playful *"Poof! Self-destruct timer hit zero"* notice.
  - Closing any browser tab (`beforeunload` / `pagehide`) immediately notifies peers and revokes all active object URLs.
- **FR-1.6 (Installable PWA and Web Share Target API):**
  - Web App Manifest (`manifest.webmanifest`) registers GhostDrop as an OS-level Share Target (`POST /share-target`) accepting shared images, screenshots, files, links, and text directly from the mobile/desktop system share sheet.
- **FR-1.7 (Responsive Navigation Split & Strict Zero Emoji / Zero Em-Dash Rule):**
  - Desktop (`>= 768px`) renders a floating top pill navbar / FAB; Mobile (`< 768px`) renders a sleek floating bottom navbar in the thumb zone.
  - Zero em-dashes and zero emojis appear anywhere in the app; all icons use crisp SVG icons (`lucide-react` or custom brand SVGs).

---

## 4. Shared P2P Wire Protocol Specification (Non-Negotiable Contract)

| Event / Packet Type | Payload Format | Description |
| :--- | :--- | :--- |
| `HELLO_PEER` | JSON: `{ "type": "HELLO_PEER", "peerId": "uuid", "deviceName": "iPhone Safari", "deviceType": "mobile" \| "desktop" \| "tablet" }` | Handshake metadata exchanged as soon as `RTCDataChannel` opens. |
| `CLIPBOARD_TEXT` | JSON: `{ "type": "TEXT", "id": "uuid", "text": "...", "timestamp": 1760000000, "ttlMs": 3000000, "burnOnRead": false }` | Sends instant text or URLs between devices. |
| `FILE_START` | JSON: `{ "type": "FILE_START", "id": "uuid", "name": "img.png", "size": 204800, "mime": "image/png", "totalChunks": 13, "ttlMs": 3000000, "dropAndNuke": false }` | Initializes memory buffer on the receiving device. |
| `FILE_CHUNK` | Binary: `ArrayBuffer` (Max `16384` bytes per chunk) | Raw binary slice of the file being transferred. |
| `FILE_END` | JSON: `{ "type": "FILE_END", "id": "uuid" }` | Signals receiver to assemble chunks into a `Blob`. |
| `FILE_ACK` | JSON: `{ "type": "FILE_ACK", "id": "uuid", "status": "OK" }` | Sent by receiver after assembly; triggers "Drop and Nuke" confirmation on sender. |
| `ITEM_NUKE` | JSON: `{ "type": "ITEM_NUKE", "id": "uuid", "reason": "TTL_EXPIRED" \| "MANUAL_BURN" }` | Optional sync signal so paired devices can shred an item simultaneously. |
