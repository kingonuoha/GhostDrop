# Step 10: V0.7 Offline, Hotspot, Camera, TTL, Clipboard and Polish Brief
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

## 1. Executive Summary and Root-Cause Codebase Analysis

After auditing all 82 files in `web/` and all QA reports from Steps 01 through 09, this task folder (`docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/`) coordinates the resolution of 8 critical user-tested findings before final v1.0 sign-off.

| # | User-Reported Issue | Root Cause Identified in Codebase | Assigned Specialist |
| :--- | :--- | :--- | :--- |
| **1** | **Versioning (`v0.7`) and GitHub Main Push Rule** | `web/package.json` is at `"0.0.0"` and `<Logo />` (`web/src/components/brand/Logo.tsx:50-61`) renders only `GhostDrop` without a version badge. `AGENTS.md` and `orchestrator.md` have now been updated with the P0 versioning rule (`v0.7` beside brand name on PC + mobile; whole number bumps on new dependency; decimal bumps per task/fix; mandatory bump on push to `main`). | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **2** | **Offline Wi-Fi Compatibility (`ws://10.57.189.60:9000/peerjs` failed)** | 1) `peerjsEngine.ts:59-63` always injects external Google/Twilio STUN servers (`stun.l.google.com:19302`), which stall ICE candidate gathering when Wi-Fi has no internet (DNS timeout). 2) Signaling relies on a separate port `9000` (`npm run signal`) or cloud `0.peerjs.com`, and `buildPeerServerOptions()` (`peerjsEngine.ts:169-179`) ignores `VITE_PEER_HOST=auto` in production/preview builds. When `npm run signal` is not running or port `9000` is blocked, WebSocket connection to `:9000/peerjs` fails immediately. | `@ghostdrop-backend` |
| **3** | **Phone Hotspot Connection Failure** | When a PC joins a phone's Wi-Fi hotspot, Windows classifies the network profile as **Public** and Windows Defender Firewall blocks inbound TCP port `9000` while only allowing the Vite server port (or blocking separate unproxied ports). Furthermore, if the PC has multiple virtual/LAN adapters, the QR code (`HomeHub.tsx:88`) uses `window.location.origin` (`localhost` if opened locally on PC), which points the phone at itself instead of the PC's hotspot IP. Embedding the PeerJS signaling server directly into the Vite HTTP/HTTPS server on the **same port** (`/peerjs` WebSocket upgrade) + surfacing selectable LAN/Hotspot IP URLs for the QR code eliminates both failures. | `@ghostdrop-backend` + `@ghostdrop-web` |
| **4** | **Mobile QR Scanner Never Prompts for Camera Access + Code Input Requires Second Click** | `QrScannerModal.tsx:180-188` checks `if (!window.isSecureContext) { setCameraFailed(true); return }`. When opening GhostDrop on a phone via `http://10.57.189.60:5173`, mobile browsers (Chrome Android / iOS Safari) mark plain HTTP LAN IPs as **insecure contexts** (`window.isSecureContext === false`, `navigator.mediaDevices === undefined`). The code exits **before** calling `getUserMedia()`, so the native camera prompt never appears and clicking `Try camera again` just increments `attempt` and hits the same guard! Additionally, there is no `<input type="file" accept="image/*" capture="environment" />` native camera fallback when HTTP is used. Furthermore, `QrScannerModal.tsx:278-279` sets initial focus to `readFocusables()[0]` (which is the `X` close button!), forcing users who click `Enter a Code` to click a second time into `#qr-room-code` before they can type. | `@ghostdrop-web` + `@ghostdrop-backend` |
| **5** | **Hardcoded PC vs. Phone Labels on Sharing Screen** | `ConnectionBridge.tsx:116,122` hardcodes `hostLabel="This Computer"` and `<DeviceChip deviceName="This Computer" deviceType="desktop" tone="host" />`. `SquiggleConnectionBridge.tsx:53,75` hardcodes `<DeviceBadge icon={Laptop} ... />` on the left and `<DeviceBadge icon={Smartphone} ... />` on the right. `HomeHub.tsx:130` and `ConnectionBridge.tsx:22,134` hardcode `"Waiting for your phone"`. Even when hosting or viewing on a phone, it says `"This Computer"`. | `@ghostdrop-web` |
| **6** | **Cleanup / TTL (`Delete after 1st copy` & `15 mins`) Issues** | Four compounding bugs: 1) `FileStartPacket` (`protocol.ts:40-49`) has no `burnOnRead?: boolean` field, and `useGhostRoom.ts:457-464` + `734-742` never pass `burnOnCopy` to `store.addFile()`, so files **never** burn on first copy/save! 2) When a receiver copies/saves a `BURN_ON_COPY` item (`useGhostRoom.ts:808,834`), `store.consumeBurnOnCopy(id)` only deletes it locally and **never** sends `{ type: 'ITEM_NUKE', id, reason: 'BURN_ON_COPY' }` to the sender peer. 3) `TransferCard.tsx:260-273` only calls `onSave` for files, and `saveItem` (`useGhostRoom.ts:826-846`) never announces feedback for normal saves. 4) `formatTimeLeft` (`format.ts:30`) uses `Math.ceil(remainingMs / 60_000)`, so a 15-minute item stays stuck showing `15 mins left` for the first 60 seconds and never shows seconds in the final minute. | `@ghostdrop-backend` + `@ghostdrop-web` |
| **7** | **Copy Images/Files to Clipboard + Native OS Share** | `TransferCard.tsx:230-275` only renders a single `Save` (`Download`) button for files and images. Users cannot copy an image directly to their clipboard (`navigator.clipboard.write([new ClipboardItem(...)])`) or invoke the native OS Share sheet (`navigator.share({ files: [file] })`) without saving to disk first. Also `EphemeralItem` (`protocol.ts:156-170`) does not retain the `Blob` reference alongside `blobUrl` for instant synchronous `ClipboardItem` / `navigator.share` access. | `@ghostdrop-backend` + `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **8** | **Redundant Card Step Numbers (`1` in Circle + `1.` in Title)** | `RoomCodeCard.tsx:77-80` renders `<OrbBadge size="md">1</OrbBadge>` and immediately below it `1. Scan with your phone`. `HomeHub.tsx:119-122` renders `<OrbBadge size="md">2</OrbBadge>` and `2. Pick what to send`. The number appears twice on both cards. | `@ghostdrop-ui-polish` + `@ghostdrop-web` |

---

## 2. Execution Order and Agent Ownership

1. **`@ghostdrop-backend`** (`docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/backend-task.md`):
   - Same-origin Vite `/peerjs` WebSocket signaling plugin + offline-safe ICE/STUN configuration + LAN/Hotspot IP discovery endpoint + `FILE_START` `burnOnRead` protocol support + `EphemeralItem.blob` retention + `ITEM_NUKE` on `BURN_ON_COPY`.
2. **`@ghostdrop-web`** (`docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/web-task.md`):
   - `v0.7` navbar badge wiring + dynamic device detection (`This Phone` / `This Tablet` / `This Computer` and dynamic peer icons) + QR scanner camera permission fix and native camera fallback (`capture="environment"`) + Hotspot IP selector for QR + Image Clipboard Copy & Native Share actions + `BURN_ON_COPY` sync & live second-precision countdowns + removal of redundant `1.` / `2.` prefixes.
3. **`@ghostdrop-ui-polish`** (`docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/ui-polish-task.md`):
   - `v0.7` badge styling, dual/triple action button layout on file/image transfer cards (`Copy` / `Share` / `Save`), copy deck additions (`docs/02-brand-persona-and-copy.md` + `web/src/lib/copyDeck.ts`), and residual polish items (`S-01` to `S-06` from Step 08 QA).
4. **`@ghostdrop-qa`** (`docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/qa-task.md`):
   - Full verification of all 8 fixes plus 6-Gate QA regression audit in `qa-report.md`.

---

## 3. Non-Negotiable Guardrails for All Agents

- **Zero Em-Dashes and Zero Emojis (P0):** Never use a single em dash (`U+2014`) or en dash (`U+2013`) or emoji anywhere in code, comments, UI copy, or docs. Use crisp `lucide-react` SVG icons only.
- **No New Runtime Dependencies Without Escalation:** Keep version at `0.7` (`web/package.json` and `web/src/lib/constants.ts`). If any new dependency is required (e.g., for self-signed HTTPS in dev), escalate first because installing a dependency triggers a whole-number version bump per `AGENTS.md` Section 5. Note: Node's built-in `https`/`crypto` or Vite's native WebSocket upgrade server requires zero new dependencies!
- **Windows PowerShell Safe File Operations:** Always use file Write and Edit tools; never use bash heredocs (`cat << 'EOF'`).

---

## 4. Completion Notes (Orchestrator Closeout)

**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21 · `ASUS-LAPTOP-DNLA241D` - step-10-closed - 2026-10-21

**Verdict:** PASS. `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/qa-report.md` reports 0 P0, 0 P1, 3 P2, 4 P3. All three P2 findings were closed before the gate was signed off.

### Execution order and owner
1. `@ghostdrop-backend` (`backend-task.md`): embedded PeerServer with same-port `/peerjs` proxy for dev and preview, `GET /__ghostdrop/lan-info`, offline/private-LAN `iceServers: []`, 3-tier signaling fallback, `burnOnRead` on `FILE_START`, and `EphemeralItem.blob` retention plus release on every removal path.
2. `@ghostdrop-web` (`web-task.md`): `v0.7` badge, `web/package.json` `0.7`, dynamic device identity, QR camera permission fix with `capture="environment"` fallback, LAN/hotspot QR origin resolution, `BURN_ON_COPY` `ITEM_NUKE` sync, second-granularity countdowns, clipboard copy plus native share, card step-number dedup.
3. `@ghostdrop-ui-polish` (`ui-polish-task.md`): `v0.7` badge craft, `Copy`/`Share`/`Save` action bar, copy deck sync, Step 08 residuals `S-01`, `S-03`, `S-04`, `S-05`.
4. `@ghostdrop-qa` (`qa-task.md`): full 8-item verification plus 6-gate regression audit.

### P2 closures applied after the audit
- **P2-1** `RoomCodeCard.tsx:121` LAN switcher pill `min-h-[36px]` -> `min-h-[44px]`.
- **P2-2** `QrScannerModal.tsx:720` secondary camera pill `min-h-[40px]` -> `min-h-[44px]`.
- **P2-3** Removed the two residual em dashes in `backend-task.md:42` and `web-task.md:78` so D-009 holds across the Step 10 task folder with zero exceptions.

### P3 dispositions
- `web/package-lock.json` root and `packages[""]` version synced to `0.7` so the lockfile agrees with `web/package.json`.
- The `24h` wording in `docs/08-qa-checklist.md` Gate 4 stays as written because `decisions.md` D-012 is the locked authority and forbids rendering a `24h` chip.
- Vendored `.agents/` em dashes and the 597.65 kB bundle advisory are pre-existing and out of Step 10 scope.

### Final gate evidence
- `npm run type-check` exit `0`, `npm run lint` exit `0`, `npm run build` exit `0` in `web/`.
- Zero em dashes, zero en dashes, zero emoji codepoints across `web/src/` and the Step 10 task folder.
- Version `0.7` in `web/package.json`, `web/package-lock.json`, and `web/src/lib/constants.ts` (`APP_VERSION`).
- Six runtime dependencies and twelve dev dependencies, unchanged. No whole-number bump required.
