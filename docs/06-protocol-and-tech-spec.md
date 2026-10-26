# 06-protocol-and-tech-spec.md: GhostDrop WebRTC, Signaling, PWA and Ephemeral Tech Spec

> **Mandatory Technical Reference for `ghostdrop-backend`, `ghostdrop-web`, `ghostdrop-web-admin`, and `ghostdrop-qa`.**

---

## 1. Tech Stack and Packages (Locked)

- **Framework:** Vite + React 19 + TypeScript (`strict: true`, zero `any`)
- **Styling:** Tailwind CSS v4 + CSS Custom Properties (`docs/tokens/tokens.css`)
- **Iconography:** `lucide-react` + custom inline vector SVGs (strictly zero emojis anywhere)
- **P2P WebRTC and Signaling:** `peerjs` (`0.peerjs.com` default) behind `P2PSignalingAdapter` interface (ready for `@supabase/supabase-js` Realtime Broadcast fallback)
- **QR Generation and Scanning:** `qrcode.react` (SVG QR rendering) + `jsqr` (In-app camera QR scanner)
- **PWA and Service Worker:** `vite-plugin-pwa` (`injectManifest` strategy with custom `src/sw.ts` for Web Share Target API)
- **Hosting:** Vercel (`vercel.json` SPA rewrites for `/join`, `/room/*`, `/how-it-works`, `/admin`)

---

## 2. Multi-Peer Room Signaling Architecture

1. **Deterministic Room ID Mapping:**
   - A 6-character unambiguous alphanumeric code (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, excluding `0/O/1/I`) maps to the PeerJS Host ID: `ghostdrop-room-${CODE}`.
2. **Host Node (`Role: 'host'`):**
   - Registers `new Peer('ghostdrop-room-' + roomCode)` on `0.peerjs.com`.
   - Maintains `Map<string, DataConnection>` for all joined peers.
   - When any connected peer sends a `TEXT` or `FILE_*` packet, the Host both processes it locally and (in multi-peer mode) relays it to other connected peers in the room.
3. **Joining Peer Node (`Role: 'peer'`):**
   - Registers `new Peer('ghostdrop-peer-' + crypto.randomUUID().slice(0, 8))` and connects to `ghostdrop-room-${CODE}`.
4. **ICE / STUN Configuration:**
   - Default STUN servers: `stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`, `stun:global.stun.twilio.com:3478`.
   - Optional env-driven TURN servers (`VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`) for strict symmetric NATs.

---

## 3. Shared P2P Wire Protocol and 16KB Backpressure Engine

Both the Phase 1 Web/PWA client and future Phase 2 Android app communicate over `RTCDataChannel` using this exact packet contract:

```ts
export const CHUNK_SIZE_BYTES = 16384; // 16 KB strict max per chunk
export const BUFFERED_LOW_THRESHOLD = 65536; // 64 KB
export const MAX_BUFFERED_AMOUNT = 262144; // 256 KB pause threshold

export type WirePacket =
  | {
      type: 'HELLO_PEER';
      peerId: string;
      deviceName: string;
      deviceType: 'desktop' | 'mobile' | 'tablet';
    }
  | {
      type: 'TEXT';
      id: string;
      text: string;
      timestamp: number;
      ttlMs: number | null;
      burnOnRead?: boolean;
    }
  | {
      type: 'FILE_START';
      id: string;
      name: string;
      size: number;
      mime: string;
      totalChunks: number;
      ttlMs: number | null;
      dropAndNuke?: boolean;
    }
  | {
      type: 'FILE_END';
      id: string;
    }
  | {
      type: 'FILE_ACK';
      id: string;
      status: 'OK' | 'ERROR';
    }
  | {
      type: 'ITEM_NUKE';
      id: string;
      reason: 'TTL_EXPIRED' | 'MANUAL_BURN' | 'BURN_ON_COPY';
    }
  | {
      type: 'TTL_SET';
      ttlPreset: 'BURN_ON_COPY' | '15m' | '50m' | '24h' | 'TAB_CLOSE';
    };
```

### Shared Auto-Delete Rule (`TTL_SET`)
- The auto-delete preset is one room rule, not a per-screen setting.
- A user change applies locally and broadcast, retimes every live item on the sender first, then sends one `TTL_SET`.
- A receiving screen applies the preset locally, retimes its own live items, and never re-broadcasts, so the packet cannot echo.
- The room host sends its current preset on every `peer:join`, so a late guest adopts the room rule immediately.
- The host already relays every non `HELLO_PEER` control packet, so a third device receives the same rule without extra code.

### Backpressure Streaming Rule (Non-Negotiable)
- Before sending each `16,384-byte` `ArrayBuffer` slice, check `dataChannel.bufferedAmount`.
- Set `dataChannel.bufferedAmountLowThreshold = 65536` (`64KB`).
- If `dataChannel.bufferedAmount > 262144` (`256KB`), await a Promise that resolves on the `bufferedamountlow` event before reading/sending the next slice.

### Offline Pairing Codecs (`GD1`, `GD1Z`, `GD2`)

`compactSdp.ts` is the only source of offline pairing tokens. Three shapes are accepted on every decode path:

| Prefix | Shape | Typical length | Notes |
| :--- | :--- | ---: | :--- |
| `GD1.` | base64url of UTF-8 JSON | 282 to 423 | Always available, synchronous |
| `GD1Z.` | base64url of deflate-raw JSON | 250 to 400 | Needs `CompressionStream` |
| `GD2.` | base64url of the binary envelope below | 92 to 159 | Preferred when packable, 73 percent smaller than GD1 |

`encodeCompactSdp` returns the shortest of the three. `decodeCompactSdp` and `decodeCompactSdpSync` accept `GD2.` and `GD1.`; only the async decoder can inflate `GD1Z.`, and the sync decoder throws for it by design.

Binary envelope, 3 header bytes, then payload:

| Field | Bytes | Notes |
| :--- | :--- | :--- |
| flags | 1 | bit 0 kind offer or answer, bits 2 to 3 setup, bits 4 to 5 device, bits 6 to 7 candidate count |
| lengths | 1 | high nibble room length 4 to 12, low nibble ufrag length minus 4 |
| pwd length | 1 | pwd length minus 16 |
| room, ufrag, pwd | 4 to 12, 4 to 16, 16 to 32 | ASCII |
| fingerprint | 32 | raw sha-256 DTLS fingerprint bytes |
| candidates | 7 each | flags, four IPv4 octets, big endian uint16 port |

- At most 3 candidates, private IPv4 UDP host first, then private srflx, then public host, deduped by address and port.
- Pack only when `mid` is `0`, `sctp-port` is `5000`, every chosen candidate is IPv4 without `tcpType`, and the fingerprint is exactly 32 bytes. Otherwise return null and fall back to `GD1Z.` or `GD1.`.
- Peer id and device name are omitted. Decode synthesizes `ghostdrop-room-<room>` for an offer and `ghostdrop-peer-<first 8 fingerprint hex>` for an answer, and `HELLO_PEER` replaces the friendly device name within milliseconds of the channel opening.
- Human display groups the body in fours separated by spaces. Extraction strips that whitespace. The body is base64url and stays case sensitive, because hyphens are data characters and case folding would cost about 20 percent more characters.

### Acoustic Pairing Channel

`acousticModem.ts` returns the guest answer, or any offline token, over sound when a camera is not practical.

- Frame: 1 byte kind (`0` GD2, `1` GD1Z, `2` GD1), 2 byte big endian payload length, UTF-8 token bytes, CRC-16-CCITT (poly `0x1021`, init `0xFFFF`, check `0x29B1`).
- Modulation: 60ms preamble at 1500 Hz then 1650 Hz, then one byte per 22ms symbol. Dual band 16-FSK, low nibble 1850 to 3050 Hz, high nibble 3300 to 4500 Hz, 80 Hz spacing, 5ms raised cosine edges.
- Payload cap 240 bytes, which covers GD2 with room to spare and rejects long GD1 tokens.
- A 110 byte token is a 115 byte frame and about 2.6 seconds of airtime.
- Capture requests echo cancellation, noise suppression and auto gain all off, and stops every track and closes the context on success, error, abort, timeout and unmount.
- Synthetic reliability is high at ordinary noise levels. Real room reliability, reverb and clock drift are verified only by the two device script in `docs/tasks/step-15-v017-offline-codec-and-acoustic/qa-report.md`. Sound is always an optional shortcut, never the only path.

---

## 4. PWA Web Share Target API (`manifest.webmanifest` + `src/sw.ts`)

GhostDrop registers as a native OS Share Target so mobile and desktop users can share screenshots, photos, files, and links straight into GhostDrop:

```json
"share_target": {
  "action": "/share-target",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url",
    "files": [
      {
        "name": "files",
        "accept": ["image/*", "video/*", "application/pdf", "text/*", "*/*"]
      }
    ]
  }
}
```
- The Service Worker (`src/sw.ts`) intercepts `POST /share-target`, stores the shared `File[]` and text in a temporary IndexedDB/Cache handoff store (`ghostdrop-share-handoff`), and redirects (`303 See Other`) to `/?shared=1`.
- On mount, the app reads `/?shared=1`, pulls the shared payload into the active room queue, and immediately purges the temporary handoff record.

---

## 5. Ephemeral Memory and Security Rules

1. **Zero Persistent Storage for User Drops:**
   - Dropped text and reconstructed `Blob`s live strictly in React/JS memory (`Map<string, EphemeralItem>`). Never write user drops to `localStorage` or external servers.
2. **Guaranteed `URL.revokeObjectURL` Cleanup:**
   - Every created object URL is registered in a memory janitor registry.
   - When an item's TTL expires (`deleteAt <= Date.now()`), when `[Burn Now]` is clicked, when `burnOnRead` triggers after copy/download, or when `window` fires `beforeunload`/`pagehide`, `URL.revokeObjectURL(url)` MUST be called immediately.
3. **XSS and Link Safety:**
   - Render all received clipboard text as escaped React text nodes (never `dangerouslySetInnerHTML`).
   - Only allow `http:` and `https:` protocols for clickable auto-linked URLs (block `javascript:` and `data:` URLs), always with `target="_blank" rel="noopener noreferrer"`.
4. **Hidden Diagnostics Route (`/admin`):**
   - `/admin` is unlinked from public navigation, blocked in `robots.txt` (`Disallow: /admin`), and tagged with `<meta name="robots" content="noindex, nofollow" />`.
