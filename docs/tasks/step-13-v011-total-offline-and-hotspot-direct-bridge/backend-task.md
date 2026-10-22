# Step 13 Backend Task: Serverless Offline Direct WebRTC Engine, Compact SDP Codec, and Hotspot IP Unmasking (`@ghostdrop-backend`)
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - backend-complete - 2026-10-22

**Assigned Agent:** `@ghostdrop-backend` (`.agents/agents/GhostDrop/backend.md`)
**Scope:** `web/src/lib/p2p/compactSdp.ts` (new), `web/src/lib/p2p/iceUnmask.ts` (new), `web/src/lib/p2p/offlineDirectEngine.ts` (new), `web/src/lib/p2p/peerjsEngine.ts`, `web/src/lib/p2p/index.ts`.
**Out of Scope:** Do NOT edit React components or pages in `web/src/components/` or `web/src/pages/`.

---

## Mandatory Pre-Read Before Coding

1. `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`
2. `decisions.md` (specifically D-002, D-003, D-011, D-014, D-016)
3. `docs/06-protocol-and-tech-spec.md`
4. `plans/total-offline-and-hotspot-bridge-plan.md`
5. `web/src/types/protocol.ts`, `web/src/lib/p2p/adapter.ts`, `web/src/lib/p2p/peerjsEngine.ts`, `web/src/lib/p2p/fileStreamer.ts`, `web/src/lib/p2p/chunkReceiver.ts`

> **REMINDER (P0):** Zero em dashes (`U+2014`), zero en dashes (`U+2013`), and zero emojis in any code comment, string, or file. Use standard hyphens (`-`), colons (`:`), or periods (`.`). Always use file Write and Edit tools (never bash heredocs).

---

## Task Checklist

### 1. Create `web/src/lib/p2p/compactSdp.ts` (Compact SDP + ICE Token Codec)
- [x] **1.1 Define Compact Payload Types:**
  ```ts
  export type CompactSignalKind = 'o' | 'a' // 'o' = offer (host invite), 'a' = answer (guest reply)
  export type CompactCandidateTuple = readonly [
    address: string,
    port: number,
    transport: 'u' | 't', // 'u' = udp, 't' = tcp
    candType: 'h' | 's',  // 'h' = host, 's' = srflx
    tcpType?: string,     // e.g. 'active' | 'passive' | 'so'
  ]

  export interface CompactSdpPayload {
    v: 1
    t: CompactSignalKind
    r: string // 6-char roomCode
    p: string // sender peerId
    n: string // sender deviceName
    d: DeviceType // 'desktop' | 'mobile' | 'tablet'
    u: string // ice-ufrag
    w: string // ice-pwd
    f: string // sha-256 fingerprint encoded as 43-char base64url (or raw hex fallback)
    s: 'a' | 'c' | 'p' // setup: 'a' = actpass, 'c' = active, 'p' = passive
    m?: string // mid, default '0'
    k?: number // sctp-port, default 5000
    c: readonly CompactCandidateTuple[]
  }
  ```
- [x] **1.2 Implement SDP Extraction (`extractCompactSdpPayload`):**
  - Parse a real browser `RTCSessionDescriptionInit` (`offer` or `answer`) plus any gathered `RTCIceCandidateInit[]`.
  - Extract `a=ice-ufrag:`, `a=ice-pwd:`, `a=fingerprint:sha-256 <HEX>` (convert the 32 colon-separated hex bytes into a 43-char Base64url string; validate 32 bytes), `a=setup:`, `a=mid:`, and `a=sctp-port:`.
  - Parse all `a=candidate:...` lines from both the SDP text and any passed `candidates` list:
    - Keep `host` and `srflx` candidates (`udp` and `tcp`), ignoring `raddr`/`rport` boilerplate.
    - Deduplicate by `${address.toLowerCase()}:${port}:${transport}`.
    - Sort candidates so RFC1918 private IPv4 (`192.168.*`, `10.*`, `172.16-31.*`, `169.254.*`) appear FIRST, followed by public IPv4, followed by `.local` mDNS, followed by IPv6. Cap at max `8` candidates so the QR code stays small and ultra-scannable.
- [x] **1.3 Implement RFC 8866 SDP Reconstruction (`reconstructSdpFromCompact`):**
  - Given a `CompactSdpPayload`, rebuild a complete, standards-compliant WebRTC DataChannel SDP string ending with `\r\n` on every line:
    - `v=0`
    - `o=- <deterministic64BitSessionId> 2 IN IP4 127.0.0.1`
    - `s=-`
    - `t=0 0`
    - `a=group:BUNDLE ${mid}`
    - `a=msid-semantic: WMS`
    - `m=application 9 UDP/DTLS/SCTP webrtc-datachannel`
    - `c=IN IP4 0.0.0.0`
    - `a=ice-ufrag:${u}`
    - `a=ice-pwd:${w}`
    - `a=ice-options:trickle`
    - `a=fingerprint:sha-256 ${upperHexColonSeparated}`
    - `a=setup:${setupRole}` (`actpass` for `'o'`, `active` or `passive` for `'a'`, defaulting to `'active'` on answer)
    - `a=mid:${mid}`
    - `a=sctp-port:${sctpPort}`
    - `a=max-message-size:262144`
    - Reconstruct each candidate tuple `[address, port, transport, candType, tcpType]` into a valid `a=candidate:${foundation} 1 ${udpOrTcp} ${priority} ${address} ${port} typ ${hostOrSrflx}${tcpTypeSuffix}` line, followed by `a=end-of-candidates`.
  - Return `{ description: { type: payload.t === 'o' ? 'offer' : 'answer', sdp }, candidates: RTCIceCandidateInit[], payload }`.
- [x] **1.4 Implement Token Compression and Encoding (`encodeCompactSdp` / `decodeCompactSdp`):**
  - Provide both **synchronous** (`encodeCompactSdpSync` / `decodeCompactSdpSync` using `GD1.` + Base64url of UTF-8 JSON) and **async** (`encodeCompactSdp` / `decodeCompactSdp` using `CompressionStream('deflate-raw')` with prefix `GD1Z.` when `CompressionStream` is available and produces a shorter token, falling back cleanly to `GD1.`).
  - Provide `extractCompactTokenFromInput(raw: string): string | null`:
    - Accepts:
      1. A raw token starting with `GD1.` or `GD1Z.` (case-insensitive prefix, preserving Base64url case in body, trimming whitespace).
      2. A full URL or relative path containing `#gd=GD1...` or `?gd=GD1...` (e.g. `https://ghostdrop.vercel.app/join?room=GHST48#gd=GD1Z.xyz`).
    - Returns the normalized `GD1...` / `GD1Z...` token string, or `null` if not a valid compact token.

---

### 2. Create `web/src/lib/p2p/iceUnmask.ts` (Hotspot Local IPv4 Unmasking)
- [x] **2.1 Implement `unmaskLocalIceIps(timeoutMs = 350): Promise<void>`:**
  - Modern browsers replace local hotspot/Wi-Fi IPv4 addresses (`192.168.43.x`, `172.20.10.x`, `192.168.x.x`) with `<uuid>.local` mDNS hostnames in `RTCPeerConnection` unless `getUserMedia` has been activated in the document context.
  - Check if `typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'`.
  - To avoid triggering an unexpected camera permission popup when the user has not yet opened the QR scanner:
    - Query `navigator.permissions?.query({ name: 'camera' as PermissionName })`.
    - Only when `state === 'granted'` (or when `forceIfPrompted` is not set), open `navigator.mediaDevices.getUserMedia({ video: true, audio: false })` raced against `timeoutMs`, and **immediately stop every track** (`for (const track of stream.getTracks()) track.stop()`) in a `finally` block.
    - Cache a timestamp so repeated calls within `60_000ms` resolve immediately in `0ms` without re-opening the camera hardware.
    - Never throw on any browser error.

---

### 3. Create `web/src/lib/p2p/offlineDirectEngine.ts` (`OfflineDirectEngine`)
- [x] **3.1 Implement `P2PSignalingAdapter` and `P2PTransport` over Native `RTCPeerConnection` + `RTCDataChannel`:**
  - Must implement `P2PSignalingAdapter` (`role`, `roomCode`, `localPeerId`, `status`, `peers`, `isConnected()`, `connect()`, `disconnect()`, `destroy()`, `send()`, `sendBinary()`, `broadcast()`, `getTransport()`, `reportTransferProgress()`, `on()`, `off()`).
  - Implement `RtcDataChannelTransport` (mirroring `DataChannelTransport` in `peerjsEngine.ts`):
    - Wraps a native `RTCDataChannel` (`binaryType = 'arraybuffer'`, `bufferedAmountLowThreshold = BUFFERED_LOW_THRESHOLD`).
    - Enforces `CHUNK_SIZE_BYTES = 16384` budget on `sendBinary` and `sendFrame`.
    - Atomic `sendFrame(headerText, data)` so `FILE_CHUNK` JSON header and binary `ArrayBuffer` slice never interleave (D-011).
- [x] **3.2 Implement Host & Guest Direct Handshake Methods on `OfflineDirectEngine`:**
  - `async startHostOffer(options: P2PConnectOptions): Promise<string>`:
    - Calls `await unmaskLocalIceIps()`.
    - Creates `new RTCPeerConnection({ iceServers: [] })`.
    - Creates `pc.createDataChannel('ghostdrop', { ordered: true })`.
    - Calls `pc.createOffer()`, `pc.setLocalDescription(offer)`, and waits for ICE gathering to finish (or `1,200ms` max gather timeout once at least 1 candidate is collected, or `1,500ms` hard cap).
    - Encodes the gathered Offer + candidates into a compact token (`GD1Z...` / `GD1...`), stores it in `this.hostInviteToken`, broadcasts it over `BroadcastChannel('ghostdrop-direct-' + code)` (for instant 0-scan same-device multi-tab connection!), and returns the token.
  - `async acceptOfferAndCreateAnswer(offerToken: string, options: P2PConnectOptions): Promise<string>`:
    - Decodes `offerToken` via `decodeCompactSdp(offerToken)`.
    - Calls `await unmaskLocalIceIps()`.
    - Creates `new RTCPeerConnection({ iceServers: [] })`, listens for `pc.ondatachannel`, sets remote description (`reconstructSdpFromCompact`), adds remote candidates, creates Answer, sets local description, waits for ICE gathering (`<= 1,200ms`), encodes `guestReplyToken` (`GD1Z...` / `GD1...`), posts the answer over `BroadcastChannel('ghostdrop-direct-' + code)` (if same-device), and returns `guestReplyToken`.
  - `async acceptAnswerToken(answerToken: string): Promise<void>`:
    - Decodes `answerToken` via `decodeCompactSdp(answerToken)` (verifying `payload.t === 'a'`).
    - Applies `pc.setRemoteDescription(answer)` and adds remote candidates.
    - Waits for the `RTCDataChannel` `'open'` event (up to `10,000ms`), exchanges `HELLO_PEER` packet, registers the peer in `this.peers`, sets `status = 'connected'`, and emits `'peer:join'`.
  - **Same-Device `BroadcastChannel` Auto-Complete:**
    - When two tabs on the same browser open the same `roomCode` in `OfflineDirectEngine`, the Host broadcasts its Offer on `BroadcastChannel` and the Guest broadcasts its Answer back automatically so same-device offline testing links in `< 50ms` even before scanning!

---

### 4. Update `web/src/lib/p2p/peerjsEngine.ts` (Fast Offline Failover & Hotspot ICE Fix)
- [x] **4.1 Call `await unmaskLocalIceIps()` in `PeerJsEngine.connect()` before creating the `Peer` instance:**
  - Ensures that when a user on a phone hotspot with mobile data ON has granted camera permission, PeerJS WebRTC negotiations include raw RFC1918 hotspot IPv4 candidates (`192.168.43.x` / `172.20.10.x`) instead of broken `.local` mDNS names.
- [x] **4.2 Tighten Unreachable Signaling Timeouts (`SIGNALING_TIER_TIMEOUT_MS` and Offline Cloud Timeout):**
  - Lower `SIGNALING_TIER_TIMEOUT_MS` from `3500` to `2200`.
  - Add `CLOUD_SIGNALING_TIMEOUT_MS = 3200` when no explicit `connectTimeoutMs` override was passed into `PeerJsEngineOptions` (keep `options.connectTimeoutMs` honored when explicitly passed by unit tests!).
  - Why: When connected to a Wi-Fi router without internet or a phone hotspot with mobile data OFF, `navigator.onLine` is `true`, so `0.peerjs.com` is tried. Capping the default cloud signaling wait to `3,200ms` (instead of `15,000ms`) allows `useGhostRoom` to fail over to `OfflineDirectEngine` within `~3s` instead of freezing for `18.5s`.

---

### 5. Update `web/src/lib/p2p/index.ts`
- [x] **5.1 Export all new modules cleanly from `web/src/lib/p2p/index.ts`:**
  - `export * from './compactSdp'`
  - `export * from './iceUnmask'`
  - `export * from './offlineDirectEngine'`

---

## Verification Before Handing Off

- [x] Run `npm run type-check` and `npm run lint` in `web/` and confirm both exit `0`.
  - Verified on `ASUS-LAPTOP-DNLA241D`, 2026-10-22: `npm run type-check` exit `0`, `npm run lint` exit `0`.
- [ ] Write and run a quick Node/Vitest or scratch verification confirming `encodeCompactSdp` -> `decodeCompactSdp` -> `reconstructSdpFromCompact` round-trips an Offer and Answer cleanly and produces a token under `220` characters.
  - **Round trip PASSES.** Offer and Answer both encode, decode and rebuild to CRLF clean RFC 8866 text with `ufrag`, `pwd`, `fingerprint`, `setup`, `mid`, `sctp-port` and `a=end-of-candidates` fidelity, and the RFC1918 candidate sorts first. A fake WebRTC harness also proved the invite -> reply -> connected handshake, the `HELLO_PEER` exchange, one `TEXT`, one `FILE_CHUNK` header plus its `16384` byte binary frame, and rejection of `16385` and `0` byte frames.
  - **The `220` character target is not reachable** without changing the locked payload schema. Measured with a real random 32 byte sha-256 fingerprint: `0` candidates = `216` chars, `1` private IPv4 = `249` chars, `3` candidates = `311` chars, `5` candidates = `348` chars. The invariant fields `v`, `t`, `r`, `p`, `n`, `d`, `u`, `w`, `f`, `s` already consume `216` of the `220` budget on their own, so only a zero candidate token could pass. The `~110-180` char estimate in `D-016` item 1 is the origin of the `220` figure and needs an orchestrator decision if QR density has to drop. Keeping the schema faithful for `Phase 2` Android compatibility was chosen over dropping `p`, `n` or a candidate kind.
- [x] Check all checkboxes `[x]` in this file and update the device stamp on line 2 (`· <hostname> - backend-complete - YYYY-MM-DD`).
