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
    };
```

### Backpressure Streaming Rule (Non-Negotiable)
- Before sending each `16,384-byte` `ArrayBuffer` slice, check `dataChannel.bufferedAmount`.
- Set `dataChannel.bufferedAmountLowThreshold = 65536` (`64KB`).
- If `dataChannel.bufferedAmount > 262144` (`256KB`), await a Promise that resolves on the `bufferedamountlow` event before reading/sending the next slice.

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
