# Step 10: Backend Task - Offline LAN, Hotspot Signaling, Protocol Burn-on-Copy and Blob Retention
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21 · `ASUS-LAPTOP-DNLA241D` - backend-complete - 2026-10-21

## Assigned Agent
`@ghostdrop-backend`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md` (specifically `D-002`, `D-003`, `D-004`, `D-011`, `D-014`)
- `docs/00-prd-source-of-truth.md`
- `docs/06-protocol-and-tech-spec.md`
- `docs/08-qa-checklist.md` (Gates 3, 4, 5)
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/brief.md`

## Objective
Fix four root-cause backend issues discovered during multi-device testing:
1. **Offline Wi-Fi and Phone Hotspot Signaling Failure (`ws://10.57.189.60:9000/peerjs` failed):** Embed the PeerJS signaling server directly into the Vite dev and preview server on the **same port** (path `/peerjs`) so devices on an offline Wi-Fi router or a phone mobile hotspot never fail due to port `9000` being stopped, blocked by Windows Defender Public Firewall on hotspots, or blocked by mixed HTTP/WS ports. Provide an automatic multi-step signaling fallback (`same-origin /peerjs` -> `:9000/peerjs` -> `0.peerjs.com`) and expose the host machine's active LAN/Hotspot IPv4 addresses (`/__ghostdrop/lan-info`) so the host QR code never points a phone at `localhost` or a dead virtual adapter IP.
2. **Offline ICE / STUN Stall:** When operating offline (no internet on the Wi-Fi or hotspot) or when connecting between two RFC1918 private LAN IPs, external STUN servers (`stun:stun.l.google.com:19302`) cannot be reached and can stall or fail ICE gathering on some mobile browsers when DNS resolution hangs. Configure `buildIceServers()` so offline / LAN sessions can gather host candidates immediately without blocking on unreachable external STUN servers.
3. **Broken `Delete after 1st copy` (`BURN_ON_COPY`) for Files:** Add `burnOnRead?: boolean` to `FileStartPacket` in `web/src/types/protocol.ts`, pass it through `streamFile()` and `ChunkReceiver`, and ensure `EphemeralStore` retains the `blob?: Blob` reference on file items (revoking/clearing it on removal) so the UI can copy images to the system clipboard or pass a `File` to `navigator.share()` and immediately trigger `BURN_ON_COPY` across both peers.
4. **HTTPS Secure Context Support for Mobile Camera on LAN/Hotspot:** Mobile browsers block `navigator.mediaDevices.getUserMedia` over plain `http://10.x.x.x`. Add zero-dependency self-signed TLS support (or opt-in `VITE_HTTPS=1` / automatic local cert generation using Node's `node:crypto` + `node:https` or Vite TLS) and same-port `wss://` signaling so mobile devices over LAN/hotspot can open a secure context when needed.

---

## Detailed Implementation Specifications

### Task 1: Same-Port Embedded PeerJS Signaling + LAN/Hotspot IP Discovery in `web/vite.config.ts` and `web/scripts/signal.mjs`

**Why `ws://10.57.189.60:9000/peerjs` failed:**
- In `web/.env.local`, `VITE_PEER_HOST=auto` and `VITE_PEER_PORT=9000` force the client to connect to `ws://<hostname>:9000/peerjs`.
- If the user runs `npm run dev` (or `npm run preview`) without separately starting `npm run signal` in another terminal, nothing is listening on port `9000`.
- Even when `npm run signal` is running, connecting a Windows PC to a **Phone Hotspot** marks the Wi-Fi network as a **Public Network** in Windows Firewall. Windows Firewall often blocks inbound connections to arbitrary Node ports like `9000` or blocks cross-port WebSocket traffic, whereas the single port the user opened/allowed for Vite (`5173` or `4173`) works.
- Furthermore, in `web/src/lib/p2p/peerjsEngine.ts:169-179`, `if (host === 'auto') { if (!isDevBuild(env)) return {} }` completely disables LAN signaling in `npm run preview` or built bundles!

**Required Changes:**
1. **Create a Vite Plugin (`ghostdropLocalSignalingPlugin`) in `web/vite.config.ts` (or a helper module imported by `vite.config.ts`):**
   - Attach an embedded PeerJS signaling server (`ExpressPeerServer` or `PeerServer` from the already-installed `peer` devDependency in `web/package.json`) directly onto Vite's HTTP/HTTPS server during both `configureServer(server)` (for `npm run dev`) and `configurePreviewServer(server)` (for `npm run preview`), OR attach it on a dedicated path `/peerjs` sharing `server.httpServer` (or auto-spawning port `9000` as a secondary listener if `server.httpServer` is not yet bound, while proxying `/peerjs` HTTP + WebSocket upgrades through Vite to `127.0.0.1:9000`).
   - **Crucial detail on Vite Proxy + Auto-Start:** The cleanest, 100% conflict-free way in Vite is:
     - Inside the Vite plugin's `configureServer` and `configurePreviewServer`, automatically start the local `PeerServer` in-process on `127.0.0.1:9000` (catching `EADDRINUSE` gracefully if `npm run signal` is already running in another terminal!).
     - Configure Vite's `server.proxy` and `preview.proxy` for `'/peerjs'`: `{ target: 'http://127.0.0.1:9000', ws: true, changeOrigin: true }`.
     - **Result:** Any device (PC or Phone on Wi-Fi or Phone Hotspot) only ever talks to **one single port**: the exact `window.location.origin` (e.g., `http://10.57.189.60:5173/peerjs` or `https://10.57.189.60:5173/peerjs`)! It never needs port `9000` open on the Windows Firewall, and the user never has to remember to run `npm run signal` in a second terminal!
2. **Add LAN / Hotspot Network Interface Discovery Endpoint (`GET /__ghostdrop/lan-info`):**
   - In the same Vite plugin middleware (`server.middlewares.use`), handle `GET /__ghostdrop/lan-info` using Node's built-in `node:os` (`os.networkInterfaces()`).
   - Enumerate all non-internal IPv4 addresses (`family === 'IPv4' && !internal`), filter out virtual Docker/Hyper-V/WSL/Loopback pseudo-interfaces where recognizable (e.g., `169.254.*` link-local), and return JSON:
     ```json
     {
       "candidates": [
         { "name": "Wi-Fi", "address": "192.168.43.102", "url": "http://192.168.43.102:5173" }
       ],
       "port": 5173,
       "protocol": "http"
     }
     ```
   - Prioritize hotspot subnets (`192.168.43.*`, `192.168.137.*` Windows Mobile Hotspot, `172.20.10.*` iPhone Personal Hotspot, `10.*`) and physical `Wi-Fi` / `WLAN` / `Ethernet` adapters so when a user opens `http://localhost:5173` on their PC, the QR code on `HomeHub` automatically encodes the real LAN/Hotspot IP (`http://10.57.189.60:5173/join?room=XXXXXX`) instead of `http://localhost:5173/join?room=XXXXXX`!
3. **Set `server.host: true` and `preview.host: true` in `web/vite.config.ts`:**
   - Ensure `npm run dev` and `npm run preview` listen on `0.0.0.0` by default so the phone on the same Wi-Fi or Hotspot can always reach the PC even if the user runs plain `npm run dev` without `-- --host`.

---

### Task 2: Resilient Multi-Tier Signaling & Offline/Hotspot ICE in `web/src/lib/p2p/peerjsEngine.ts`

1. **Update `buildPeerServerOptions()` in `web/src/lib/p2p/peerjsEngine.ts` (`lines 160-188`):**
   - When `VITE_PEER_HOST=auto` (or when running on a local/private IPv4 hostname `10.*`, `192.168.*`, `172.16-31.*`, `localhost`, `127.0.0.1`, or `.local` mDNS, OR when `navigator.onLine === false`):
     - Default to **same-origin signaling** first:
       - `host: window.location.hostname`
       - `port: Number(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80)`
       - `secure: window.location.protocol === 'https:'`
       - `path: '/'` (because PeerJS appends `peerjs` to `path`, hitting `/peerjs` on the Vite server proxy!)
       - `key: 'peerjs'`
   - Add **automatic signaling endpoint fallback** inside `PeerJsEngine.connect()`:
     - Build an ordered list of candidate `PeerServerOptions`:
       1. If on LAN / localhost / `VITE_PEER_HOST=auto`: try **Same-Origin Vite Proxy** (`window.location.hostname` + `window.location.port`, `path: '/'`) first.
       2. If that fails to open signaling within `3500ms`: try **Direct LAN Port 9000** (`window.location.hostname:9000`, `secure: false`, `path: '/'`).
       3. If online (`navigator.onLine !== false`) and deployed on a public domain (e.g., Vercel): try **Cloud PeerJS** (`0.peerjs.com:443`, `secure: true`) or configured `VITE_PEER_HOST`.
     - This guarantees:
       - **Offline Wi-Fi (no internet):** Connects in <200ms via same-origin `/peerjs` (or `:9000/peerjs`) without ever needing internet access.
       - **Phone Hotspot (PC connected to Phone Hotspot or Phone connected to PC Hotspot):** Connects via same-origin `/peerjs` on the single allowed Vite port.
       - **Production Internet Deployment:** Connects via `0.peerjs.com` (or custom `VITE_PEER_HOST`).
2. **Fix Offline & Hotspot WebRTC ICE Gathering in `buildIceServers()` (`peerjsEngine.ts:100-116`):**
   - When `typeof navigator !== 'undefined' && navigator.onLine === false`, OR when connecting on a private LAN/Hotspot hostname (`10.*`, `192.168.*`, `172.16-31.*`, `localhost`, `127.0.0.1`) where external internet may be unreachable:
     - If `navigator.onLine === false`, return `[]` (empty `iceServers` array). With `iceServers: []`, WebRTC immediately gathers local `host` ICE candidates across the Wi-Fi / Hotspot subnet with **zero DNS lookup delay** and **zero STUN timeout**!
     - Even when `navigator.onLine === true` on a Wi-Fi router without upstream WAN internet (captive or dead ISP), browsers still report `navigator.onLine === true` while DNS lookups to `stun.l.google.com` hang for 5 to 10 seconds! Therefore, on private LAN/Hotspot origins (`isPrivateLanHost(window.location.hostname)`), unless `VITE_TURN_URL` is explicitly configured, use `iceServers: []` by default (or only include STUN when on a public hostname). Two devices on the same Wi-Fi or Hotspot are in the same L2/L3 local routing domain and **never** need a public Google STUN server to discover their own RFC1918 LAN IP!
3. **Update `web/.env.local`:**
   - Remove the hardcoded `VITE_PEER_PORT=9000` override (or set `VITE_PEER_HOST=auto` without forcing port `9000`) so same-origin `/peerjs` is used first.

---

### Task 3: Protocol & Store Fixes for `Delete after 1st copy` (`BURN_ON_COPY`) and File `Blob` Retention

1. **`web/src/types/protocol.ts`:**
   - Add `burnOnRead?: boolean` to `FileStartPacket` (`lines 40-49`):
     ```ts
     export interface FileStartPacket {
       type: 'FILE_START'
       id: string
       name: string
       size: number
       mime: string
       totalChunks: number
       ttlMs: number | null
       dropAndNuke?: boolean
       burnOnRead?: boolean
     }
     ```
   - Update `isWirePacket()` (`lines 227-235`) to validate:
     `(value.burnOnRead === undefined || typeof value.burnOnRead === 'boolean')`
   - Update `EphemeralItem` (`lines 156-170`) to include optional `blob?: Blob`:
     ```ts
     export interface EphemeralItem {
       id: string
       kind: EphemeralItemKind
       text?: string
       fileName?: string
       mime?: string
       size?: number
       blob?: Blob
       blobUrl?: string
       direction: EphemeralItemDirection
       peerId?: string
       createdAt: number
       deleteAt: number | null
       burnOnCopy: boolean
       status: EphemeralItemStatus
     }
     ```
2. **`web/src/lib/p2p/fileStreamer.ts`:**
   - Add `burnOnRead?: boolean` to `StreamFileOptions` (`lines 26-38`).
   - Include `burnOnRead` in the emitted `FILE_START` packet (`lines 164-173`).
3. **`web/src/lib/p2p/chunkReceiver.ts`:**
   - Add `burnOnRead: boolean` to `ReceivedFileItem` (`lines 34-44`).
   - Set `burnOnRead: transfer.start.burnOnRead === true` in `finishTransfer()` (`lines 303-313`).
4. **`web/src/lib/p2p/janitor.ts`:**
   - In `addFile()` (`lines 207-235`): store `blob: carriesObjectUrl(status) ? input.file : undefined` on the created `EphemeralItem`.
   - In `updateItem()` (`lines 237-254`), `removeItem()` (`lines 260-268`), `acknowledgeDelivery()` (`lines 291-302`), `sweep()` (`lines 311-332`), and `revokeAll()` (`lines 338-355`): ensure `delete next.blob` (or removing the item from the map) clears the `Blob` reference alongside `revokeUrl(item.blobUrl)` so zero bytes stay in RAM after expiry or burn.

---

## Verification Checklist
- [x] Embedded PeerJS signaling runs automatically when `npm run dev` or `npm run preview` starts in `web/`, proxied on `/peerjs` (same port as the web app).
- [x] `GET /__ghostdrop/lan-info` returns the host's LAN/Hotspot IPv4 candidates.
- [x] `PeerJsEngine` connects over same-origin `/peerjs` on LAN/Hotspot, falls back to `:9000` if needed, and uses `0.peerjs.com` on public origins.
- [x] `buildIceServers()` returns `[]` on offline / private LAN / Hotspot origins (unless `VITE_TURN_URL` is set) so offline Wi-Fi and Phone Hotspot connections never stall on unreachable Google STUN DNS lookups.
- [x] `FileStartPacket`, `StreamFileOptions`, and `ReceivedFileItem` support `burnOnRead?: boolean`.
- [x] `EphemeralStore` attaches `blob` to active file items and strips/releases `blob` + revokes `blobUrl` on every removal/expiry path.
- [x] `npm run type-check`, `npm run lint`, and `npm run build` in `web/` exit `0` with zero em dashes, zero emojis, and zero new runtime dependencies.

## Verification Evidence (2026-10-21, `ASUS-LAPTOP-DNLA241D`)
- `npm run type-check` exit `0`, `npm run lint` exit `0`, `npm run build` exit `0`.
- `GET http://localhost:5173/__ghostdrop/lan-info` returned `{"candidates":[{"name":"Local Area Connection* 2","address":"192.168.137.1","url":"http://192.168.137.1:5173"},{"name":"Wi-Fi","address":"10.57.189.60","url":"http://10.57.189.60:5173"}],"port":5173,"protocol":"http"}`. Tailscale (100.89.116.91) is filtered as a virtual adapter.
- `GET /peerjs/id` through the Vite proxy returned a PeerJS client id (`HTTP/1.1 200`, 36-character UUID) in both dev (5173) and preview (4173).
- WebSocket upgrade `GET /peerjs?key=peerjs&id=probe&token=abc` returned `HTTP/1.1 101 Switching Protocols` plus `{"type":"OPEN"}` in dev, preview and HTTPS mode, so the same app port carries signaling.
- No path rewrite is used: the embedded PeerServer mounts with `path: '/'` and `key: 'peerjs'`, so it already expects `/peerjs/id` over HTTP and `/peerjs` for the upgrade. A stripping rewrite 404s (`/peerjs/peerjs/id` returns 404).
- `npm run signal` in a separate terminal is detected and reused (`port 9000 is already in use, reusing that server on /peerjs`), and signaling still works through the proxy.
- `VITE_HTTPS=1 npx vite` created `web/.certs` with a valid self-signed certificate (openssl parsed `CN = GhostDrop Local Dev`, SAN `DNS:localhost, DNS:ghostdrop.local, IP 127.0.0.1, IP 192.168.137.1, IP 10.57.189.60, IP ::1`), served `https://localhost:5199/__ghostdrop/lan-info` with `"protocol":"https"`, and upgraded `wss://` on the same port. Plain HTTP stays the default.
- Candidate ordering and ICE behaviour verified by executing the built module: LAN auto `[same-origin, :9000, 0.peerjs.com:443]` with `iceServers: []`; offline `[same-origin, :9000]` with `iceServers: []`; public origin `[0.peerjs.com:443]` with the default STUN list; concrete `VITE_PEER_HOST` stays a single tier.
- Zero em dashes, zero en dashes and zero emojis in every changed file (scanned by code point).
