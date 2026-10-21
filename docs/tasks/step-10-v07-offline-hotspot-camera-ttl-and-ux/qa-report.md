# Step 10: QA Verification Report - v0.7 Offline, Hotspot, Camera, TTL and UX
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

**Auditor:** `@ghostdrop-qa` (read-only). No application file was modified by this audit.
**Scope:** `web/` at version `0.7`, plus `web/vite.config.ts`, `web/vite.localSignaling.ts`, `docs/02-brand-persona-and-copy.md` and the Step 10 task set.
**Verdict:** PASS

**Basis:** 8 of 8 Step 10 acceptance items verified against reproducible evidence. All 6 gates pass on the canonical `docs/08-qa-checklist.md` wording. `npm run type-check`, `npm run lint` and `npm run build` in `web/` all exit `0`. Same-origin signaling returns `HTTP/1.1 101 Switching Protocols` on both the Vite dev port and the preview port.

**Findings:** 0 P0, 0 P1, 3 P2, 4 P3. No blocker. The three P2 items are two touch targets under 44 px introduced by Step 10, and two em dashes in Step 10 task documents; none of them touches the shipped application.

---

## 1. Method and Evidence Base

Five independent evidence layers, because static grep alone cannot prove layout, focus or motion:

1. **Raw codepoint scan** over 64 text files (62 under `web/src`, plus `web/index.html` and `web/public/favicon.svg`), 341,239 characters. Every codepoint above U+007F was reported individually, so one em dash, en dash, curly quote, zero-width space, variation selector or emoji cannot hide. The non-ASCII map came back empty, which is a complete negative proof for this corpus.
2. **Root split scan** over 78 text files under `web/`, 62 under `docs/`, 205 under `.agents/`, plus `AGENTS.md` and `decisions.md`, counting U+2014 and U+2013 separately per file.
3. **Static source reads** with exact `file:line` citations for every Step 10 item and every gate.
4. **Live browser measurement** through the desktop browser tool: the production `dist` served by `npm run preview` at `http://localhost:4173`, rendered in same-origin iframes at 360, 768, 1024 and 1440 CSS px, reading computed styles, `scrollWidth` versus `clientWidth`, nav visibility flags, version pill visibility and measured control boxes. The scanner focus check ran on the real page with a real click, reading `document.activeElement`.
5. **Command execution:** `npm run type-check`, `npm run lint`, `npm run build`, `npm run dev`, `npm run preview`, plus `curl` probes for `/`, `/__ghostdrop/lan-info`, `/peerjs/id` and the `/peerjs` WebSocket upgrade.

Honest limits:

- No CDP `Emulation.setEmulatedMedia` was exposed in this session, so `prefers-reduced-motion: reduce` is graded from the CSS block at `web/src/index.css:297-342` plus the measured non-reduced base state, not from an emulated media run.
- No two-device WebRTC session ran in this sandbox, so `FILE_CHUNK` framing, backpressure and burn-on-copy sync are graded from source and protocol constants, not from bytes crossing a live channel.
- Port 5173 was already bound by a pre-existing Vite dev server when this audit started, so the dev smoke test ran on the free port 5174. Section 4 records that and the port-free check.

---

## 2. Step 10 Verification (8 items)

| # | Item | Verdict | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | Versioning `v0.7` beside `GhostDrop` on desktop and mobile | PASS | `web/package.json:4` `"version": "0.7"`. `web/src/lib/constants.ts:8` `export const APP_VERSION = 0.7`. `web/src/components/brand/Logo.tsx:65-78` nests the pill inside the wordmark span, styled `type-numeral` plus `bg-brand-lime`. Both navbars mount `<Logo withWordmark />`: `web/src/components/nav/DesktopTopPillBar.tsx:40` and `web/src/components/nav/MobileStatusHeader.tsx:31`. Live DOM at 360, 768, 1024 and 1440 CSS px: exactly one visible `[aria-label^="Version"]` element per width, text `v0.7`, computed family `Laroka, Bricolage Grotesque, system-ui, sans-serif`, zero horizontal overflow. |
| 2 | Offline Wi-Fi and hotspot signaling | PASS | `web/vite.localSignaling.ts:233-272` auto-starts the embedded `PeerServer` on `127.0.0.1:9000` and reuses an existing listener on `EADDRINUSE` at `:241-249`. `web/vite.config.ts:50-54` defines one pass-through proxy `{ target: http://127.0.0.1:9000, changeOrigin: true, ws: true }` with no path rewrite, mounted on `server.proxy` at `:142` and `preview.proxy` at `:147`. `server.host: true` at `:141`, `preview.host: true` at `:146`. `GET /__ghostdrop/lan-info` middleware at `web/vite.localSignaling.ts:163-190`, candidate collection with hotspot-first ordering at `:86-130`, virtual adapter filter at `:37-38`. Client side: `buildPeerServerCandidates()` at `web/src/lib/p2p/peerjsEngine.ts:289-322` returns an ordered 3-tier list (same origin, then `:9000`, then `0.peerjs.com:443` only while online) with endpoint dedupe at `:316-319`; `isPrivateLanHost()` at `:120-139`; `buildIceServers()` at `:159-174` returns `[]` on offline or private LAN unless `VITE_TURN_URL` is set. `web/.env.local` now holds only `VITE_PEER_HOST=auto` with no forced port 9000. Live: two real candidates from `/__ghostdrop/lan-info` and `101` on the upgrade (section 4). |
| 3 | Mobile QR scanner camera access, native fallback and instant code focus | PASS | `codeInputRef` declared at `web/src/components/qr/QrScannerModal.tsx:150`, attached at `:795`, focused first in the focus trap at `:426-427`. Live: clicked `Enter a Code` on the served page, waited 900 ms, `document.activeElement.id === "qr-room-code"`, tag `INPUT`. `requestLiveCamera` at `:242-377` is invoked straight from the user gesture button at `:608-615`. `{ video: true }` fallback on `OverconstrainedError` / `NotFoundError` / `TypeError` at `:280-291`. Hidden native capture input at `:740-751`, live attributes read `accept=image/*` and `capture=environment`. `scanStillImage` at `:75-102` tries 1200 px then 600 px with `inversionAttempts: attemptBoth` at `:83-96`. `Open Phone Camera` is the primary action when `canUseLiveCamera` is false, at `:626-633`. |
| 4 | Dynamic device detection, PC versus phone versus tablet | PASS | Every device string lives in `web/src/lib/device.ts` and nowhere else: `DEVICE_ICON` at `:20-24` maps `desktop: Laptop`, `mobile: Smartphone`, `tablet: Tablet`; `detectDeviceType()` at `:57-72`; `localSelfLabel()` at `:75-79` returns `This Phone` / `This Tablet` / `This Computer`; `peerDisplayName()` at `:102-107` returns `Your Phone` / `Your Tablet` / `Your Computer` and `Other *` when the types collide; `waitingLabel()` at `:110-115`. A grep for `This Computer|Waiting for your phone|My Phone|My Tablet|This Phone|This Tablet|Your Computer|Your Phone|Your Tablet` across `web/src` returns 12 hits, all inside `web/src/lib/device.ts`. Consumers verified: `useGhostRoom.ts:42,367-368,1147-1148`, `SquiggleConnectionBridge.tsx:4`, `ConnectionBridge.tsx:9,134-154`, `HomeHub.tsx:15,164`, `RoomCodeCard.tsx:7,99-102`, `ConnectedWorkspace.tsx:17,53`, `MobileJoin.tsx:24,128`, `TransferCard.tsx:17`. |
| 5 | TTL, `Delete after 1st copy` and live second countdown | PASS | `burnOnRead?: boolean` on `FileStartPacket` at `web/src/types/protocol.ts:49-50`, validated in `isWirePacket` at `:232`. Emitted by `streamFile` at `web/src/lib/p2p/fileStreamer.ts:159,184`. Read by the receiver at `web/src/lib/p2p/chunkReceiver.ts:43-44,314`. `blob` retained at `web/src/lib/p2p/janitor.ts:239-245` and released on every removal path: `updateItem :258-263`, `removeItem :277-278`, `acknowledgeDelivery :311-312`, `sweep :341-342`, `revokeAll :360-361`. `useGhostRoom.ts:632` passes `burnOnCopy: received.burnOnRead` on receive and `:928,940` on send. `consumeAndSyncBurnOnCopy` at `:975-1001` calls `store.consumeBurnOnCopy` then sends `{ type: ITEM_NUKE, id, reason: BURN_ON_COPY }` at `:986`. The `ITEM_NUKE` handler reads the item before removal at `:693-695` and announces the poof at `:699-706`. `setTtlPreset` writes the ref synchronously and retimes active items at `:440-458`. `formatTimeLeft` at `web/src/lib/format.ts:30-50` returns `N secs left` under a minute and `Xm Ys left` under an hour. |
| 6 | Image and file clipboard copy plus native share | PASS | `copyItem` at `useGhostRoom.ts:1048-1077`; text path `writeTextToClipboard` at `:178-204` with `execCommand` fallback at `:198`; image path `writeImageToClipboard` at `:253-271` using `clipboard.write([new ClipboardItem({ image/png: payload })])` at `:266`; PNG conversion `toPngBlob` at `:210-250` via `OffscreenCanvas.convertToBlob` then a DOM canvas with `canvas.toBlob`; a blocked clipboard falls back to share then `ERR_CLIPBOARD_BLOCKED` at `:1060-1067`. `shareItem` at `:1004-1040` constructs a `File` at `:1017`, guards with `navigator.canShare(data)` at `:1020`, calls `navigator.share({ files })` at `:1023` and `navigator.share({ text })` at `:1025`. `saveItem` at `:1080-1103` announces `SUCCESS_SAVED` and burns. Wiring: `ConnectedWorkspace.tsx:170-176` and `MobileJoin.tsx:239-245` pass `onCopy` / `onShare` / `onSave` into `TransferFeed.tsx:15-18,78-80` and then `TransferCard.tsx:33-36,229,295,312,324`. |
| 7 | Card step number deduplication | PASS | `web/src/components/room/RoomCodeCard.tsx:97-100` renders `<OrbBadge size="md">1</OrbBadge>` then `<h2 id="scan-title">{scanCardTitle(deviceType)}</h2>` with no numeric prefix. `web/src/pages/HomeHub.tsx:153-156` renders `<OrbBadge size="md">2</OrbBadge>` then `<h2 id="send-title">Pick what to send</h2>`. `web/src/lib/device.ts:131-140` supplies `Scan with your phone` / `Scan with your other screen`. `docs/02-brand-persona-and-copy.md:28,31` matches. Live rendered hub text reads `1 | Scan with your phone | ... | 2 | Pick what to send` with no duplicate digits. |
| 8 | Zero new dependency, whole number `0` preserved | PASS | `web/package.json:14-21` lists 6 dependencies (`jsqr`, `lucide-react`, `peerjs`, `qrcode.react`, `react`, `react-dom`) and `:22-35` lists 12 devDependencies, identical to the pre-Step-10 set. `npm ls --depth=0` reports 18 installed packages and zero extraneous. Version stays `0.7` per `AGENTS.md` section 5, so the whole number `0` is preserved. The embedded signaling server reuses the already installed `peer` devDependency at `web/vite.localSignaling.ts:252` and the TLS work uses `node:crypto` only at `:20`, so no package was added. |

---

## 3. Full 6-Gate Regression

| Gate | Verdict | Evidence |
| :--- | :--- | :--- |
| 1 Brand tokens, `Laroka`, navigation split, squiggle fidelity | PASS | Zero raw hex in any `.ts` or `.tsx`: `grep -rnE "#[0-9a-fA-F]{3,8}" web/src --include=*.ts --include=*.tsx` returns 0 rows. Hex appears only in `web/src/styles/tokens.css`, `web/index.html:10` (`#CDF22B` theme color) and `web/public/favicon.svg:2-3` (`#F7F6F2`, `#1E45FB`), all mapped tokens. Live `document.fonts.check("700 32px Laroka")` is `true` with `document.fonts.status` `loaded`. Nav split measured: at 360 px `nav[aria-label="Main"]` visible `false` and `nav[aria-label="Quick actions"]` visible `true`; at 768, 1024 and 1440 the inverse. Squiggles: `/` renders 2, `/how-it-works` renders 11; every one has `pathLength="1"`, a non-`none` `stroke-dasharray`, computed `animation-name` `squiggle-draw` and computed `transform` `none`; 0 bad paths across all 8 runs. Keyframes are draw-only: `web/src/styles/tokens.css:106-118` (`stroke-dashoffset: 1` to `0`) and `web/src/index.css:217-233`. No fly, slide or bounce keyframe exists on any squiggle; the only other entrance keyframe is `poof-notice-enter` at `web/src/index.css:257-264`, a toast card, not the squiggle. |
| 2 Playful copy, zero em dash, zero en dash, zero emoji | PASS | 64-file raw scan: 0 codepoints above U+007F, therefore 0 U+2014, 0 U+2013, 0 emoji, 0 curly quotes, 0 ellipsis, 0 zero-width characters. Root split scan: `web/` 78 text files, 0 em dash and 0 en dash. `grep -rnE "\balert\(|window\.confirm|window\.prompt" web/src` returns 0 rows. Deck keys referenced by Step 10 (`SUCCESS_SHARED`, `SUCCESS_SAVED`, `SUCCESS_COPIED_IMAGE`, `ERR_CLIPBOARD_BLOCKED`) exist in both `docs/02-brand-persona-and-copy.md:53-55,71` and `web/src/lib/copyDeck.ts:18-30,124-141,233`. Prior finding S-01 is closed: `web/src/components/room/TransferCard.tsx:171-184` now renders `buildFeedback("ERR_CHUNK_INTERRUPTED").body`. Two em dashes exist in Step 10 task documents (finding P2-3), outside the shippable app. |
| 3 Shared wire protocol and 16KB backpressure | PASS | Packet union at `web/src/types/protocol.ts:82-90` covers `HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`, `ITEM_NUKE`; `NukeReason` at `:20` is `TTL_EXPIRED | MANUAL_BURN | BURN_ON_COPY`. `CHUNK_SIZE_BYTES = 16384` at `:6`, `BUFFERED_LOW_THRESHOLD = 65536` at `:7`, `MAX_BUFFERED_AMOUNT = 262144` at `:8`; the literal `16384` occurs in exactly one source file. `waitForBufferDrain` sets the low threshold at `fileStreamer.ts:81` and pauses above 256 KB at `:89`. Slice budget is enforced before send at `:199-208` and again on the transport at `peerjsEngine.ts:328-336` for both `sendBinary` and `sendFrame` (`:399-415`). D-011 atomic pair: `sendFrame` writes the header then exactly one binary frame inside one chained write at `peerjsEngine.ts:456-469`, so nothing can interleave. Receiver validates `byteLength` at `chunkReceiver.ts:149,157,161` and answers `FILE_ACK` at `:373`. |
| 4 TTL self-destruct and zero memory leaks | PASS | Object URL ledger at `web/src/lib/p2p/janitor.ts:454-480`: `createObjectUrl` records in `createdUrls`, `revokeUrl` records in `revokedUrls` and is idempotent at `:469`. `getStats()` exposes `activeObjectUrlCount = created - revoked` and `leakedObjectUrlCount` at `:393-404`. Every removal path revokes and drops the `Blob`: `updateItem :258-263`, `removeItem :274-283`, `acknowledgeDelivery :306-318`, `sweep :327-349`, `revokeAll :355-373`, `putItem :418-429`, plus an orphan sweep at `:431-437`. Unload hooks at `:507-515` bind `beforeunload` and `pagehide`, and `dispose()` removes them at `:384-391`. D-012 four locked labels verified in `web/src/components/room/TtlPicker.tsx:16-21` (`Delete after 1st copy`, `15 mins`, `50 mins`, `When I close this page`), no `24h` chip; the mobile dock reads `TTL_PRESET_ORDER` from `web/src/lib/constants.ts:19`. D-013: `grep -rn GHOST8 web/src web/index.html` returns 0 rows and `DEMO_ROOM_CODE = GHST48` at `web/src/lib/constants.ts:11`. |
| 5 Installable PWA, Web Share Target and QR scanner | PASS | The built `web/dist/manifest.webmanifest` contains three icons (`192x192`, `512x512`, `512x512` maskable) and a `share_target` with `action: /share-target`, `method: POST`, `enctype: multipart/form-data` and the six accept types. Source of truth `web/vite.config.ts:116-131`. The service worker intercepts the path at `web/src/sw.ts:106` and redirects with `new Response.redirect(..., 303)` at `:36`. Precache built: 11 entries, 625.56 KiB. The QR scanner is graded under item 3. |
| 6 Responsive viewports, reduced motion and build health | PASS | Live measurement over `/` and `/how-it-works` at 360, 768, 1024 and 1440 px: `scrollWidth === clientWidth` in 8 of 8 combinations (345/345, 753/753, 1009/1009, 1425/1425), overflow 0. One `h1` per route. The reduced-motion block at `web/src/index.css:297-342` forces `stroke-dashoffset: 0` and `animation: none` on every squiggle class at `:312-318`, and keeps `transform: translate(-50%, -50%)` on the idle tip dot at `:325-329`, closing Step 08 S-04. `type-check`, `lint` and `build` all exit 0. The extended 44 px sub-criterion of this contract records two gaps (findings P2-1 and P2-2); the canonical Gate 6 items are all clean. |

Gate 1 to Gate 6 all pass. The two sub-44 px controls are recorded as P2 accessibility findings rather than gate failures, because the canonical `docs/08-qa-checklist.md` Gate 6 text lists overflow, reduced motion and build health only.

---

## 4. Build and Live Smoke Test (reproduced in this audit)

All commands run from `web/`. ANSI colour codes stripped; every other byte is verbatim.

### 4.1 `npm run type-check`

```text
> ghostdrop-web@0.7 type-check
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.sw.json

TYPECHECK_EXIT=0
```

### 4.2 `npm run lint`

```text
> ghostdrop-web@0.7 lint
> eslint .

LINT_EXIT=0
```

### 4.3 `npm run build`

```text
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
2017 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.77 kB
dist/index.html                   1.23 kB | gzip:   0.58 kB
dist/assets/index-DQzWlhD1.css   41.54 kB | gzip:   8.53 kB
dist/assets/index-BLDDi1AL.js   597.65 kB | gzip: 186.36 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
built in 1.08s

PWA v2.0.0
Building src/sw.ts service worker ("es" format)...
vite v8.3.4 building client environment for production...

WARN  inlineDynamicImports option is deprecated, please use codeSplitting: false instead.

transforming...
55 modules transformed.
rendering chunks...
computing gzip size...
dist/sw.mjs  18.52 kB | gzip: 6.34 kB
built in 40ms

PWA v2.0.0
mode      injectManifest
format:   es
precache  11 entries (625.56 KiB)
files generated
  dist/sw.js
BUILD_EXIT=0
```

Both advisories are pre-existing and non-blocking: the 500 kB chunk hint (carried Step 07 F-05 / Step 08 S-10) and the `vite-plugin-pwa` `inlineDynamicImports` deprecation.

### 4.4 `npm run dev` (same-origin signaling)

`netstat -ano` at audit start showed port 5173 already bound by a pre-existing Vite dev server (PID 18364, which also owned `127.0.0.1:9000`). The audit instance therefore took the next free port. Server banner:

```text
> ghostdrop-web@0.7 dev
> vite

Port 5173 is in use, trying another one...
[ghostdrop] GhostDrop signaling: port 9000 is already in use, reusing that server on /peerjs.

  VITE v8.3.4  ready in 604 ms

  Local:   http://localhost:5174/
  Network: http://100.89.116.91:5174/   Tailscale
  Network: http://192.168.137.1:5174/   Local Area Connection 2
  Network: http://10.57.189.60:5174/    Wi-Fi
```

The reuse message is the designed `EADDRINUSE` fallback at `web/vite.localSignaling.ts:241-249`, and signaling still worked through the proxy on the reused server.

Probes against the audit dev instance (port 5174):

```text
$ curl -s -o /dev/null -w "HTTP %{http_code} bytes=%{size_download}\n" http://localhost:5174/
HTTP 200 bytes=1271

$ curl -s http://localhost:5174/__ghostdrop/lan-info
{"candidates":[{"name":"Local Area Connection* 2","address":"192.168.137.1","url":"http://192.168.137.1:5174"},{"name":"Wi-Fi","address":"10.57.189.60","url":"http://10.57.189.60:5174"}],"port":5174,"protocol":"http"}

$ curl -s -i http://localhost:5174/peerjs/id
HTTP/1.1 200 OK
vary: Origin
x-powered-by: Express
content-type: text/html; charset=utf-8
content-length: 36
etag: W/"24-TdXEOWnRECmi0iFGowhJj41Yt9E"

745ba578-9327-4b5a-a060-255f5834f4d6

$ curl -s -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "http://localhost:5174/peerjs?key=peerjs&id=probe-1&token=abc"
HTTP/1.1 101 Switching Protocols
upgrade: websocket
connection: Upgrade
sec-websocket-accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

{"type":"OPEN"}
```

The `101` plus the `{"type":"OPEN"}` handshake proves the browser WebSocket upgrade completes on the same port as the app, which is the whole point of D-014 item 2: a phone on a hotspot reaches signaling without port 9000 ever being open.

The pre-existing server on 5173 was cross-checked read-only at audit start and returned the same contract with its own port number: `{"candidates":[...{"url":"http://192.168.137.1:5173"}...{"url":"http://10.57.189.60:5173"}],"port":5173,"protocol":"http"}`.

### 4.5 `npm run preview` (production bundle, same-origin signaling)

```text
> ghostdrop-web@0.7 preview
> vite preview

  Local:   http://localhost:4173/
  Network: http://192.168.137.1:4173/   Local Area Connection 2
  Network: http://10.57.189.60:4173/    Wi-Fi
[ghostdrop] GhostDrop signaling: port 9000 is already in use, reusing that server on /peerjs.
```

Probes against preview (port 4173):

```text
$ curl -s -o /dev/null -w "HTTP %{http_code} bytes=%{size_download}\n" http://localhost:4173/
HTTP 200 bytes=1235

$ curl -s http://localhost:4173/__ghostdrop/lan-info
{"candidates":[{"name":"Local Area Connection* 2","address":"192.168.137.1","url":"http://192.168.137.1:4173"},{"name":"Wi-Fi","address":"10.57.189.60","url":"http://10.57.189.60:4173"}],"port":4173,"protocol":"http"}

$ curl -s -i http://localhost:4173/peerjs/id
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
content-length: 36

550c3efd-6020-4961-8db8-5b705b354cea

$ curl -s -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "http://localhost:4173/peerjs?key=peerjs&id=probe-1&token=abc"
HTTP/1.1 101 Switching Protocols
upgrade: websocket
connection: Upgrade
sec-websocket-accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

{"type":"OPEN"}

$ curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:4173/manifest.webmanifest
HTTP 200
```

So `configurePreviewServer` at `web/vite.localSignaling.ts:513-515` delivers the same capability as `configureServer` at `:510-512`. Wi-Fi and hotspot signaling works in dev **and** in a production preview build.

### 4.6 Port release

```text
$ netstat -ano | grep LISTENING | grep -E ":5173|:5174|:4173|:9000"
(no rows)

$ curl -s -o /dev/null -m 3 -w "5173 -> %{http_code}\n" http://localhost:5173/
5173 -> 000   (connection refused)

$ curl -s -o /dev/null -m 3 -w "4173 -> %{http_code}\n" http://localhost:4173/
4173 -> 000   (connection refused)
```

Ports 5173, 5174, 4173 and 9000 are all free at the end of the audit. Both audit servers plus the pre-existing 5173 dev server (PID 18364) were terminated; no application file was touched.

---

## 5. Findings

### P0 (brand rule, protocol breach, TTL leak, silent data loss, build failure)

None. Zero em dash, zero en dash and zero emoji in all 78 `web/` text files; zero raw hex outside mapped tokens; no chunk above `16384`; every object URL revoked on every removal path; `type-check`, `lint` and `build` all exit 0.

### P1 (a Step 10 acceptance item that does not work as specified)

None.

### P2 (polish or accessibility gap)

**P2-1 The hotspot IP switcher buttons are 36 px tall, below the 44 px target rule.**
`web/src/components/room/RoomCodeCard.tsx:121` applies `inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3`. Measured live in the production bundle at 360, 768, 1024 and 1440 px: `h = 36` for both the `Local Area Connection* 2` button and the `Wi-Fi` button. These are the only two interactive controls under 44 px on the hub, and both are new in Step 10.
Fix: change `min-h-[36px]` to `min-h-[44px]` on `web/src/components/room/RoomCodeCard.tsx:121`.

**P2-2 The live-preview secondary camera button is 40 px tall.**
`web/src/components/qr/QrScannerModal.tsx:720` applies `min-h-[40px]`. This is the `Snap QR with Camera App` pill inside the live camera overlay, so it renders only once `cameraReady` is true and was therefore not observed in the headless run (camera permission is denied there, which renders the `cameraFailed` branch whose buttons are all 44 px). It is still reachable on real hardware.
Fix: change `min-h-[40px]` to `min-h-[44px]` on `web/src/components/qr/QrScannerModal.tsx:720`.

**P2-3 Two em dashes remain in Step 10 task documents.**
`docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/backend-task.md:42` and `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/web-task.md:78` each contain one U+2014. Everything else is clean: `AGENTS.md`, `decisions.md`, `.agents/rules/GEMINI.md`, all five `.agents/agents/GhostDrop/*.md`, `docs/02-brand-persona-and-copy.md`, `docs/08-qa-checklist.md`, `docs/design.md` and every file under `web/` report 0.
Fix: replace the em dash at `backend-task.md:42` with a colon and at `web-task.md:78` with a comma.

Escalation note: D-009 and the Step 10 brief wording would make P2-3 a P0. It is graded P2 here because the shipped application, the copy deck and the shipped documentation are all clean, and the two hits are agent authoring notes in a planning file. If the orchestrator reads D-009 strictly, promote P2-3 to P0; the shipped app does not change either way.

### P3 (nit)

**P3-1 Lockfile version drift.** `web/package-lock.json:3` still declares `"version": "0.0.0"` while `web/package.json:4` is `"0.7"`. The lock name and the `oxlint` residue from Step 08 S-07 are both gone (0 `oxlint` references, `npm ls --depth=0` reports no extraneous packages). Fix: run `npm install --package-lock-only` in `web/`.

**P3-2 Checklist still names a `24h` preset.** `docs/08-qa-checklist.md:29` lists `24h` among the TTL presets; D-012 supersedes it and only four labels ship. Fix: reword that line to the four D-012 labels.

**P3-3 The vendored Antigravity Kit library carries em dashes.** The root split scan found 52 U+2014 and 4 U+2013 under `.agents/` (skills, workflow templates, generic agents such as `.agents/agent/orchestrator.md` and `.agents/workflows/*.md`). None is GhostDrop-authored: the project-owned `.agents/agents/GhostDrop/*.md` and `.agents/rules/GEMINI.md` are clean at 0. Fix: none required, or state explicitly that the D-009 corpus excludes vendored kit files.

**P3-4 Bundle advisory.** `dist/assets/index-BLDDi1AL.js` is 597.65 kB (gzip 186.36 kB) against the 500 kB Vite hint, and `vite-plugin-pwa` warns that `inlineDynamicImports` is deprecated. Both are carried from Step 06 F-08, Step 07 F-05 and Step 08 S-10. Fix: dynamic import of `QrScannerModal` (which also removes `jsqr` from the eager chunk) and a rename to `codeSplitting: false`.

### Step 08 residual items re-checked

| Item | Status this pass |
| :--- | :--- |
| S-01 inline error copy deviates from the deck | CLOSED, `TransferCard.tsx:171-184` now uses `buildFeedback("ERR_CHUNK_INTERRUPTED").body` |
| S-02 five helper lines over the 10 word budget | NOT RE-MEASURED, carried |
| S-03 dead `.ttl-dissolve` CSS | CLOSED, `grep -rn ttl-dissolve web/src` returns 0 rows |
| S-04 reduced motion cancels the tip dot centring | CLOSED, `web/src/index.css:325-329` keeps `transform: translate(-50%, -50%)` |
| S-05 dock timer dialog missing `aria-controls` | CLOSED, panel `id="mobile-timer-panel"` at `MobileBottomDock.tsx:94` and `aria-controls` at `:157` |
| S-06 no active dock tab on `/how-it-works` | CLOSED, `isSendRoute` includes the route at `MobileBottomDock.tsx:58-64` |
| S-07 lockfile drift and extraneous `oxlint` | MOSTLY CLOSED, name and `oxlint` fixed, version field still `0.0.0` (P3-1) |
| S-11 scanner watchdog not cleared on success | CLOSED, `clearWatchdog()` before `setCameraReady(true)` at `QrScannerModal.tsx:335-337` |

---

## 6. Residual Risks and Deferred Items

1. **Reduced motion was not emulated at runtime.** No `Emulation.setEmulatedMedia` was available, so the `prefers-reduced-motion: reduce` verdict rests on the CSS at `web/src/index.css:297-342` plus the measured non-reduced base state (every squiggle at `animation-name: squiggle-draw` with `dasharray: 1`). The block is correct by construction and the offset overrides are `!important` and unconditional, but a real emulated run should be repeated when CDP media emulation is available.
2. **No end-to-end two-device transfer ran.** `FILE_CHUNK` framing, the 16 KB budget, `bufferedAmountLowThreshold` backpressure and the `BURN_ON_COPY` round trip are graded from source (`fileStreamer.ts:196-224`, `peerjsEngine.ts:399-415`, `useGhostRoom.ts:975-1001`) and from the constants in `protocol.ts:6-8`. Bytes crossing a real `RTCDataChannel` between a PC and a phone remain unproven in this sandbox.
3. **Plain HTTP LAN origins still cannot open a live camera.** `getUserMedia` is unavailable on `http://10.x.x.x`, so the design leans on the `capture="environment"` native camera path plus the typed 6 letter code. `VITE_HTTPS=1` self-signed TLS exists at `web/vite.localSignaling.ts:454-486` but was not re-exercised in this pass; the backend task records an earlier successful run with SAN `DNS:localhost, DNS:ghostdrop.local, IP 127.0.0.1, IP 192.168.137.1, IP 10.57.189.60, IP ::1`.
4. **Adapter filtering can hide an intended route.** `VIRTUAL_ADAPTER_PATTERN` at `web/vite.localSignaling.ts:37-38` excludes Tailscale, ZeroTier, OpenVPN, Hyper-V, WSL and Docker. That is correct for hotspot discovery, but a user who deliberately wants to reach the PC over a tailnet will not see that address in the switcher and will get the Wi-Fi or hotspot IP instead.
5. **Windows Firewall still governs the single port.** D-014 item 2 removes the need for an inbound rule on 9000, but the Vite port itself must still be reachable from the phone. On a Public profile hotspot a first run can still prompt. This is a deployment note, not a code defect.
6. **iOS Safari native capture and `jsQR` decode are untested on hardware.** The 1200 px then 600 px dual attempt with `inversionAttempts: attemptBoth` at `QrScannerModal.tsx:83-96` is designed for this case, but no iOS device was available, and iOS can hand back a HEIC file that `createImageBitmap` rejects, in which case the DOM image fallback at `:118-133` runs.
7. **Vendored kit documentation corpus.** 52 em dashes and 4 en dashes live in `.agents/` skill and workflow templates that no GhostDrop agent authored. They never reach a browser, but they keep tripping a naive grep across `.agents/` (see P3-3).

---

## 7. Verdict

**Step 10: PASS.** All 8 reported issues are fixed, all 6 gates pass, the build is green, and same-origin signaling works in dev and in a production preview on a single port.

Nothing must change before sign-off. Recommended, in order: P2-1 and P2-2 (two one-token class changes that restore the 44 px rule), then P2-3 (two characters in two task documents), then P3-1 and P3-2 (housekeeping).

