# Plan: v0.11 Total Offline and Hotspot Direct WebRTC Bridge
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22

**Version target:** `0.11` (decimal bump from `0.10` per `AGENTS.md` Section 5, zero new dependencies)
**Task folder:** `docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/`
**Decision record:** `decisions.md` D-016

---

## 1. Goal

Make GhostDrop connect and transfer files/notes 100% offline across any two devices on the same Wi-Fi router or phone hotspot (whether mobile data is OFF or ON), even when opened days later from the cached production PWA (`https://...`) with zero internet access and zero local signaling server running.

---

## 2. Root-Cause Diagnosis of Current Failures

| # | Failure Scenario | Exact Technical Root Cause in Current Code |
| :--- | :--- | :--- |
| **1** | **Cached PWA opened tomorrow completely offline on same Wi-Fi or Phone Hotspot (Mobile Data OFF)** | `sw.ts` serves the cached app shell, but `window.location.hostname` is the public production domain (not a local Node Vite server). Neither `0.peerjs.com` nor `/peerjs` is reachable without internet, and browsers cannot open a raw TCP/WebSocket server port from a PWA tab. Without a serverless way to swap the WebRTC Offer and Answer, `PeerJsEngine.connect()` fails with `SIGNALING_ERROR` / `CONNECT_TIMEOUT`. |
| **2** | **`navigator.onLine` False Positive on Offline Wi-Fi / Hotspot (`peerjsEngine.ts:109-112`)** | When two devices join a Wi-Fi router without WAN internet or a phone hotspot with mobile data turned OFF, Android, iOS, macOS, and Windows still report `navigator.onLine === true` because the local Wi-Fi link is associated. `isOffline()` returns `false`, so `buildIceServers()` injects `stun:stun.l.google.com:19302` (causing DNS lookup stalls) and `buildPeerServerCandidates()` waits up to `15,000ms` on `0.peerjs.com` before failing. |
| **3** | **Phone Hotspot Failure even with Mobile Data ON (`peerjsEngine.ts:159-174`)** | 1) On a public HTTPS origin (`https://ghostdrop...`), `isPrivateLanHost(hostname)` is `false`. Unless camera permission is active/warmed up before ICE gathering, browsers obfuscate local hotspot IPs (`192.168.43.x`, `172.20.10.x`, `192.168.137.x`) into random `<uuid>.local` mDNS hostnames. Phone hotspot bridges (`ap0`, `bridge100`) frequently drop multicast mDNS packets between the hotspot host phone and tethered laptop. 2) Both devices query Google STUN over the same cellular connection; mobile carrier Symmetric CG-NAT blocks hairpinning between two devices sharing the same public cellular IP. |
| **4** | **No Network-State Auto-Recovery (`useGhostRoom.ts:563-614`)** | If the user opens the cached PWA before joining Wi-Fi/hotspot, the room enters `status === 'error'` and never subscribes to `window.addEventListener('online')` or `navigator.connection.addEventListener('change')` to auto-recover. |

---

## 3. Three-Layer Architectural Solution

### Layer 1: Serverless Offline Direct WebRTC Engine (`OfflineDirectEngine` + `compactSdp.ts`)

When cloud/local WebSocket signaling is unreachable (or when a guest scans/pastes an offline invite token), GhostDrop switches seamlessly into **Offline Direct Mode** (`OfflineDirectEngine`, implementing `P2PSignalingAdapter` and `P2PTransport` over a native `RTCPeerConnection` + `RTCDataChannel`):

1. **Compact SDP + ICE Token Codec (`web/src/lib/p2p/compactSdp.ts`):**
   - Extracts only the variable WebRTC parameters from a gathered `RTCSessionDescriptionInit` (`offer` or `answer` after `iceGatheringState === 'complete'`):
     - `v`: `1` (schema version)
     - `t`: `'o'` (offer) or `'a'` (answer)
     - `r`: 6-character `roomCode`
     - `p`: sender `peerId` (`ghostdrop-room-XXXXXX` or `ghostdrop-peer-xxxxxxxx`)
     - `n`: `deviceName`
     - `d`: `deviceType` (`'desktop' | 'mobile' | 'tablet'`)
     - `u`: `ice-ufrag`
     - `w`: `ice-pwd`
     - `f`: `sha-256` fingerprint packed as 43-char Base64url (from the 32 raw bytes)
     - `s`: DTLS `setup` role (`'a'` = `actpass`, `'c'` = `active`, `'p'` = `passive`)
     - `m`: `mid` (default `'0'`)
     - `k`: `sctpPort` (default `5000`)
     - `c`: deduplicated array of `[address, port, transport ('u'|'t'), candType ('h'|'s'), tcpType?]`, prioritizing RFC1918 IPv4 (`192.168.*`, `10.*`, `172.16-31.*`, `169.254.*`) first, then `.local` mDNS, then IPv6.
   - Compresses the JSON payload with `CompressionStream('deflate-raw')` when available (`GD1Z.<base64url>`) and falls back to plain UTF-8 Base64url (`GD1.<base64url>`).
   - Reconstructs a 100% RFC 8866 / WebRTC compliant `RTCSessionDescriptionInit` (`type: 'offer' | 'answer'`, `sdp: string` with embedded `a=candidate:...` lines and `a=end-of-candidates`) so `pc.setRemoteDescription()` succeeds across Chrome, Safari, Edge, and Firefox.

2. **Two-Way QR + Copyable Offline Code Handshake (Grandma-Simple 2-Step Flow):**
   - **Step A (Host Offer Generation):**
     - Host creates `new RTCPeerConnection({ iceServers: [] })`, opens deterministic `createDataChannel('ghostdrop', { ordered: true })`, gathers local Wi-Fi/Hotspot `host` candidates (capped at `1,200ms` max gather wait so a sluggish interface never stalls), and encodes `hostInviteToken` (`GD1...`).
     - Host embeds `#gd=${hostInviteToken}` into the QR code URL (`/join?room=${code}#gd=${hostInviteToken}`) so scanning with EITHER the in-app QR scanner OR the phone's native camera app (which loads the Service-Worker-cached `/join` page offline) delivers the Offer immediately.
     - Host also exposes a one-tap **Copy Offline Code** button (`hostInviteToken`) and a primary **Scan Reply QR / Paste Reply Code** button.
   - **Step B (Guest Scans Offer -> Shows Reply QR & Code):**
     - Guest scans the Host's QR (or pastes the Host's Offline Code in `QrScannerModal` or `MobileJoin`).
     - Guest's `OfflineDirectEngine` decodes the Offer, calls `pc.setRemoteDescription(offer)`, creates the Answer, gathers local LAN/Hotspot `host` candidates (`<= 1,200ms`), and encodes `guestReplyToken` (`GD1...`).
     - Guest immediately displays the **Reply QR Card** (high-contrast Acid Lime `#CDF22B` card with a crisp QR code of `guestReplyToken` plus a **Copy Reply Code** button).
   - **Step C (Host Scans or Pastes Guest Reply -> Connected!):**
     - Host taps **Scan Reply QR** (opens `QrScannerModal` in Reply Mode) and points its camera at the Guest's screen, OR pastes the Guest's copied Reply Code.
     - Host calls `acceptReplyToken(guestReplyToken)` -> `pc.setRemoteDescription(answer)`.
     - The `RTCDataChannel` opens directly over the local Wi-Fi router or phone hotspot in `< 200ms`! Both screens transition immediately to `status === 'connected'`, emit `'peer:join'`, exchange `HELLO_PEER`, and stream 16KB file chunks and text notes at full local Wi-Fi speed.

3. **Bonus Zero-Scan Same-Device / Multi-Tab Bridge (`BroadcastChannel`):**
   - `OfflineDirectEngine` also opens `BroadcastChannel('ghostdrop-direct-' + roomCode)`. When two tabs on the same device are in the same room offline, Offer and Answer exchange automatically over `BroadcastChannel` in `< 20ms` without requiring a camera scan.

---

### Layer 2: Hotspot with Mobile Data ON Fixes (ICE IP Unmasking + Fast Reachability Failover)

1. **Local Hotspot IPv4 Unmasking (`unmaskLocalIceIps()` in `web/src/lib/p2p/iceUnmask.ts`):**
   - Browsers hide RFC1918 LAN/Hotspot IPs behind `<uuid>.local` mDNS names unless camera permission has been granted on that origin.
   - Before gathering ICE candidates (in both `PeerJsEngine` and `OfflineDirectEngine`), if `navigator.permissions?.query({ name: 'camera' })` resolves to `'granted'`, GhostDrop performs a silent `< 50ms` `getUserMedia({ video: true })` track pulse and immediately stops all tracks.
   - Furthermore, when a user scans a QR code in `QrScannerModal`, camera permission becomes `'granted'` right before the Guest joins the room.
   - Result: WebRTC exposes real `192.168.43.x` / `172.20.10.x` / `192.168.x.x` `host` candidates instead of `.local` mDNS, allowing a phone hotspot and laptop to connect directly over the hotspot subnet even when mDNS multicast is dropped and mobile carrier CG-NAT blocks STUN hairpinning.

2. **Fast Signaling Reachability Budgets (`peerjsEngine.ts`):**
   - Replace the `15,000ms` final-tier cloud stall during initial discovery:
     - When `navigator.onLine === false`, skip `0.peerjs.com` immediately (`0ms`) and probe local same-origin `/peerjs` with a fast `1,200ms` timeout before falling straight into `OfflineDirectEngine`.
     - When `navigator.onLine === true` (which may still be a Wi-Fi router with no internet or a hotspot with mobile data off!), cap each signaling candidate tier at `2,500ms` so an offline Wi-Fi router fails over to **Offline Direct Mode** in `~2.5s` instead of hanging for `18.5s`.
   - When `PeerJsEngine` is used by a Guest (`role === 'peer'`) and the WebSocket opens on `0.peerjs.com`, if `attachConnection` (ICE negotiation) fails or times out on a strict mobile hotspot (`6,500ms`), surface a direct one-tap action to switch to the **Offline QR / Code Link** so the user is never stuck.

---

### Layer 3: Automatic Network-Change Recovery (`useGhostRoom.ts`)

- Listen to `window.addEventListener('online')` and `navigator.connection?.addEventListener('change')` inside `useGhostRoom.ts`.
- Whenever connectivity transitions while the room has `peers.length === 0` and is in `'error'` or waiting state, automatically trigger a non-disruptive signaling retry while keeping the active `OfflineDirectEngine` offer alive.

---

## 4. File Ownership Matrix

| File | Action | Owner |
| :--- | :--- | :--- |
| `web/src/lib/p2p/compactSdp.ts` | **NEW.** Compact WebRTC Offer/Answer + ICE candidate minifier, Base64url + `CompressionStream('deflate-raw')` codec, and RFC 8866 SDP reconstructor | `@ghostdrop-backend` |
| `web/src/lib/p2p/iceUnmask.ts` | **NEW.** Permission-gated `getUserMedia` pulse so browsers emit raw RFC1918 LAN/hotspot IPv4 `host` candidates instead of broken `.local` mDNS names | `@ghostdrop-backend` |
| `web/src/lib/p2p/offlineDirectEngine.ts` | **NEW.** Full `P2PSignalingAdapter` + `P2PTransport` implementation over native `RTCPeerConnection` and `RTCDataChannel` (plus `BroadcastChannel` same-device shortcut), supporting `createHostOffer()`, `acceptOfferAndCreateAnswer(token)`, and `acceptAnswerToken(token)` | `@ghostdrop-backend` |
| `web/src/lib/p2p/peerjsEngine.ts` | **MODIFY.** Integrate `unmaskLocalIceIps()`, tighten unreachable Wi-Fi/hotspot signaling timeout budgets (`2,500ms`), and fix `buildIceServers` so hotspot sessions keep both local `host` and STUN candidates without stalling when DNS is dead | `@ghostdrop-backend` |
| `web/src/lib/p2p/index.ts` | **MODIFY.** Export `OfflineDirectEngine`, `compactSdp` helpers (`isCompactSdpToken`, `extractCompactTokenFromInput`, `encodeCompactSdp`, `decodeCompactSdp`), and `unmaskLocalIceIps` | `@ghostdrop-backend` |
| `web/src/hooks/useGhostRoom.ts` | **MODIFY.** Hybrid Online + Offline Direct orchestration: generate/expose `offlineInviteToken` (Host) and `offlineReplyToken` (Guest), expose `acceptOfflineToken(rawInput): Promise<boolean>`, `switchToOfflineMode()`, and auto-recover on `online` / network change events | `@ghostdrop-web` |
| `web/src/components/room/OfflineLinkModal.tsx` | **NEW.** Grandma-friendly Offline Link / Reply QR and Code sheet (shows Guest's Reply QR + Copy Reply Code after scanning Host's offline QR, or lets Host/Guest scan/paste the partner's code in 1 tap) | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| `web/src/components/qr/QrScannerModal.tsx` | **MODIFY.** Accept both 6-letter room codes AND offline tokens (`GD1...` or URLs containing `#gd=...`) via live camera, native camera photo (`capture="environment"`), and text input (`paste` / type). Support `mode?: 'join' | 'reply'` so the Host can scan or paste the Guest's Reply QR/code using the exact same scanner modal | `@ghostdrop-web` |
| `web/src/components/room/RoomCodeCard.tsx` | **MODIFY.** When offline (or when user toggles Offline Link), show the offline status pill, Copy Offline Code option, and `"Scan Reply Code"` button right on the pairing card | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| `web/src/pages/HomeHub.tsx`, `ConnectedWorkspace.tsx`, `MobileJoin.tsx` | **MODIFY.** Read `#gd=...` from `window.location.hash` on boot/navigation so scanning an offline QR with the native phone camera auto-starts the Guest Answer flow; render the Reply QR card on Guest and Scan Reply button on Host | `@ghostdrop-web` |
| `web/src/lib/copyDeck.ts`, `docs/02-brand-persona-and-copy.md` | **MODIFY.** Add grandma-simple, zero-jargon copy keys for Offline Direct pairing (`INFO_OFFLINE_READY`, `SUCCESS_OFFLINE_OFFER_READ`, `ERR_OFFLINE_TOKEN_INVALID`) | `@ghostdrop-ui-polish` |
| `web/src/lib/constants.ts`, `web/package.json`, `web/package-lock.json` | **MODIFY.** Bump version from `0.10` to `0.11` (`APP_VERSION = '0.11'`) | `@ghostdrop-web` |

---

## 5. Non-Negotiable Guardrails

1. **Zero Technical Jargon in UI (`docs/02-brand-persona-and-copy.md`):**
   - Never render `SDP`, `ICE`, `WebRTC`, `STUN`, `Offer`, `Answer`, `mDNS`, or `PeerJS` anywhere on screen.
   - Use plain human language: `"Offline link ready"`, `"Step 1: Scan this QR on your other screen"`, `"Step 2: Scan the reply QR from your other screen"`, `"Copy Offline Code"`, `"Paste Reply Code"`.
2. **Zero Em-Dashes (`U+2014`), Zero En-Dashes (`U+2013`), Zero Emojis (P0):**
   - Strictly banned across all source files, comments, UI copy, and docs. Use `lucide-react` SVG icons only.
3. **Self-Drawing Squiggly Line Mandate (D-006):**
   - Any squiggly line in new or modified cards must use `<SquiggleCardBg />` or `<SquiggleLine />` (`pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset: 1 -> 0`). Never translate, fly-in, or bounce a squiggly line.
4. **Wire Protocol Preservation (D-011):**
   - Once `OfflineDirectEngine`'s `RTCDataChannel` opens, it must use the exact same `HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK` (`16,384` bytes max + `bufferedAmountLowThreshold = 65536`), `FILE_END`, `FILE_ACK`, and `ITEM_NUKE` framing as `PeerJsEngine`.

---

## 6. Verification Criteria (`@ghostdrop-qa`)

1. **100% Offline Cached PWA Handshake Test:**
   - With network completely disabled (`offline` emulation or Wi-Fi with no internet), Host generates `offlineInviteToken` (`#gd=...`), Guest decodes it and generates `offlineReplyToken`, Host accepts `offlineReplyToken`, `RTCDataChannel` opens, and both `TEXT` and multi-chunk `FILE_*` transfers complete with `FILE_ACK`.
2. **QR + Paste Code Parity:**
   - Both QR scan (`extractScannerPayload` in `QrScannerModal`) and manual Copy/Paste of `GD1...` tokens complete the handshake on Desktop and Mobile.
3. **Hotspot IP Unmasking & Fast Failover:**
   - Verify `buildPeerServerCandidates` and `PeerJsEngine.connect` fail over to `OfflineDirectEngine` in under `3.5s` when Wi-Fi/hotspot has no internet (even when `navigator.onLine === true`).
4. **Build, Type-Check, Lint, and 6-Gate Regression:**
   - `npm run type-check`, `npm run lint`, and `npm run build` exit `0`.
   - Zero em dashes, zero en dashes, zero emojis across `web/src/` and `docs/tasks/step-13-v011-total-offline-and-hotspot-direct-bridge/`.
   - Version synced to `0.11` in `web/package.json`, `web/package-lock.json`, and `web/src/lib/constants.ts`.
