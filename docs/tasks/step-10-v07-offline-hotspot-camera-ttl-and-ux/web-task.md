# Step 10: Web Task - v0.7 Navbar Badge, Dynamic Device Identity, QR Camera Fix, Hotspot QR, Clipboard/Share and TTL Sync
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21 · `ASUS-LAPTOP-DNLA241D` - web-complete - 2026-10-21

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md` (`D-001` through `D-014`)
- `docs/00-prd-source-of-truth.md`
- `docs/01-wireframe-and-pages.md`
- `docs/02-brand-persona-and-copy.md`
- `docs/06-protocol-and-tech-spec.md`
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/brief.md`
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/backend-task.md`

## Objective
Implement all client-side fixes in `web/src/` and `web/package.json` for Kingsley's 8 tested requirements:
1. **Version `0.7` (`v0.7`) beside the brand name on both PC and Mobile navbars** + update `web/package.json` `"version": "0.7"`.
2. **Dynamic PC vs. Phone vs. Tablet detection** so the sharing screen, bridge, status pills, and cards accurately show whether **this device** is a Phone, Tablet, or Computer and whether the **other device** is a Phone, Tablet, or Computer.
3. **Mobile QR Scanner Camera Permission, Native Camera Fallback & Instant Auto-Focus on Code Input:** Fix `QrScannerModal.tsx` so:
   - Opening the modal (e.g., clicking `Enter a Code` or `Scan or Type a Code`) **immediately auto-focuses the 6-letter code input (`#qr-room-code`)** instead of the close `X` button (`QrScannerModal.tsx:278-279`), so the user can start typing the 6 characters right away with zero extra clicks!
   - Clicking `Try camera again` / opening the scanner always invokes `navigator.mediaDevices.getUserMedia` when available, explains clearly when HTTP blocks live camera preview, and provides a 1-tap **Open Phone Camera / Scan Photo** button (`<input type="file" accept="image/*" capture="environment" />`) that opens the native OS camera app even over plain HTTP LAN/Hotspot and decodes the QR with `jsQR`!
4. **Hotspot & Offline LAN QR URL Resolution:** Use `/__ghostdrop/lan-info` on `HomeHub` so when the PC opens `localhost:5173` (or has multiple adapters like Wi-Fi + Hotspot), the QR code automatically encodes the real reachable LAN/Hotspot IP (and lets the user switch IPs if multiple adapters exist).
5. **Working `Delete after 1st copy` (`BURN_ON_COPY`) + `15 mins` Live Second Countdown:** Wire `burnOnRead` into `sendFiles()`, send `ITEM_NUKE` (`reason: 'BURN_ON_COPY'`) to connected peers when an item is copied or saved under `BURN_ON_COPY`, and update `formatTimeLeft()` so timers under 1 minute count down in seconds (`45 secs left`) and timers under 15 minutes show exact remaining time instead of appearing stuck on `15 mins left`.
6. **Copy Image/File to Clipboard & Native Share (`navigator.share`):** Add `copyItem` clipboard image support (`ClipboardItem` with PNG conversion fallback) and `shareItem` (`navigator.share({ files })` / `navigator.share({ text })`) so users can copy images straight to clipboard or share files/images directly to any app without saving to disk first, while keeping `Save` as a secondary option.
7. **Remove Redundant Step Numbers on Hub Cards:** Change `1. Scan with your phone` -> `Scan with your phone` (or dynamic device wording) and `2. Pick what to send` -> `Pick what to send` since `<OrbBadge>` already renders `1` and `2` in a circle.

---

## Detailed File-by-File Implementation Instructions

### 1. Version `0.7` in `web/package.json`, `web/src/lib/constants.ts`, and `web/src/components/brand/Logo.tsx`
- In `web/package.json`: change `"version": "0.0.0"` to `"version": "0.7"`.
- In `web/src/lib/constants.ts`: export `export const APP_VERSION = '0.7'`.
- In `web/src/components/brand/Logo.tsx`:
  - When `withWordmark` is `true`, render the version badge directly beside `GhostDrop`:
    ```tsx
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={cn(
          'type-display text-[1.35rem] leading-none tracking-tight text-brand-ink',
          wordmarkClassName,
        )}
      >
        GhostDrop
      </span>
      <span
        aria-label={`Version ${APP_VERSION}`}
        className="rounded-full bg-brand-lime px-2 py-0.5 font-mono text-[0.65rem] font-bold leading-none text-brand-ink"
      >
        v{APP_VERSION}
      </span>
    </span>
    ```
  - Because both `DesktopTopPillBar.tsx` (`<Logo size={32} withWordmark />`) and `MobileStatusHeader.tsx` (`<Logo size={28} withWordmark wordmarkClassName="text-[1.05rem]" />`) use `<Logo withWordmark />`, this automatically displays `v0.7` right beside the name on both PC and Mobile navbars!

---

### 2. Dynamic Device Detection (`PC` vs. `Phone` vs. `Tablet`) Across All Screens
**Root cause in current code:**
- `useGhostRoom.ts:138-150` has `readDeviceType()` and `deviceNameFor()`, which are private and return `'My Phone'` / `'My Tablet'` / `'This Computer'`, and `GhostRoom` never exposes `localDeviceType` or `localDeviceName`.
- `ConnectionBridge.tsx:116,122` hardcodes `hostLabel="This Computer"` and `<DeviceChip deviceName="This Computer" deviceType="desktop" tone="host" />`.
- `SquiggleConnectionBridge.tsx:53,75` hardcodes `<DeviceBadge icon={Laptop} label={hostLabel} ... />` and `<DeviceBadge icon={Smartphone} label={peerLabel} ... />`.
- `HomeHub.tsx:130`, `RoomCodeCard.tsx:79,82`, and `ConnectionBridge.tsx:22,134` hardcode `"Waiting for your phone"` and `"Scan with your phone"` even when the user is **already on a phone**!

**Required Changes:**
1. **Export device detection helpers from `web/src/hooks/useGhostRoom.ts` (or a new helper `web/src/lib/device.ts`):**
   - Detect `DeviceType` (`'desktop' | 'mobile' | 'tablet'`) accurately using `navigator.userAgentData?.mobile`, `navigator.userAgent`, and touch/screen heuristics (`navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)` for iPadOS).
   - Provide clear, human-friendly labels:
     - Self label (`localSelfLabel(type)`):
       - `'mobile'` -> `'This Phone'`
       - `'tablet'` -> `'This Tablet'`
       - `'desktop'` -> `'This Computer'`
     - Wire-announced name sent in `HELLO_PEER` (`deviceNameFor(type)`):
       - `'mobile'` -> `'Phone'` on the wire. The receiving screen formats the label from `peerDisplayName(peerDeviceType, localDeviceType)` so the other party always sees `'Your Phone'`, `'Other Phone'`, `'Your Computer'`, or `'Your Tablet'` clearly.
       - Specifically:
         - In `HELLO_PEER`, send `deviceType: 'mobile' | 'tablet' | 'desktop'` and `deviceName`: `'Phone'` (for mobile), `'Tablet'` (for tablet), `'Computer'` (for desktop).
         - On the receiving screen, format the remote peer's label from `peer.deviceType`:
           - If remote `peer.deviceType === 'desktop'`: display `'Your Computer'` (or if local is also desktop, `'Other Computer'`).
           - If remote `peer.deviceType === 'mobile'`: display `'Your Phone'` (or if local is also mobile, `'Other Phone'`).
           - If remote `peer.deviceType === 'tablet'`: display `'Your Tablet'` (or if local is also tablet, `'Other Tablet'`).
         - When **no peer is connected yet** (waiting state):
           - If `localDeviceType === 'mobile'`: waiting label is `'Waiting for your computer or phone'`, default target peer label on bridge is `'Other Screen'` with `Laptop` icon.
           - If `localDeviceType === 'desktop'`: waiting label is `'Waiting for your phone or PC'`, default target peer label on bridge is `'Your Phone'` with `Smartphone` icon.
   - Expose `localDeviceType: DeviceType` and `localDeviceName: string` on `GhostRoom` in `useGhostRoom.ts`.
2. **Update `SquiggleConnectionBridge.tsx`:**
   - Accept `hostDeviceType?: DeviceType` (default `'desktop'`) and `peerDeviceType?: DeviceType` (default `'mobile'`).
   - Map `DeviceType` to `lucide-react` icons (`desktop: Laptop`, `mobile: Smartphone`, `tablet: Tablet`).
   - Render the left `<DeviceBadge>` with `DEVICE_ICON[hostDeviceType]` and `hostLabel` (`This Phone` when on mobile, `This Computer` when on PC!).
   - Render the right `<DeviceBadge>` with `DEVICE_ICON[peerDeviceType]` and `peerLabel` (`Your Computer` when connected to a PC, `Your Phone` when connected to a phone!).
3. **Update `ConnectionBridge.tsx`:**
   - Accept `localDeviceType: DeviceType` and `localDeviceName: string`.
   - Pass `hostLabel={localDeviceName}`, `hostDeviceType={localDeviceType}`, `peerLabel={peerLabel}`, `peerDeviceType={peerDeviceType}` to `<SquiggleConnectionBridge />`.
   - In the `<DeviceChip>` row (`line 122`), render `<DeviceChip deviceName={localDeviceName} deviceType={localDeviceType} tone="host" />` instead of hardcoded `"This Computer"` / `"desktop"`.
4. **Update `HomeHub.tsx` and `RoomCodeCard.tsx`:**
   - Pass `localDeviceType` to `<RoomCodeCard />`.
   - If `localDeviceType === 'mobile'`, the pairing card title should say `Scan with your other screen` (without the redundant `1.`) and helper `Open the camera or GhostDrop on your PC or other phone:`. If `localDeviceType === 'desktop'`, title says `Scan with your phone` (without `1.`).
   - On `HomeHub.tsx:130`, if `localDeviceType === 'mobile'`, waiting pill says `Waiting for your other screen` instead of `Waiting for your phone`.

---

### 3. Mobile QR Scanner Fix (`web/src/components/qr/QrScannerModal.tsx`)
**Why Kingsley never saw the browser camera permission prompt on mobile:**
1. Look at `QrScannerModal.tsx:181-188`:
   ```ts
   if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
     setCameraFailed(true)
     return
   }
   if (typeof window !== 'undefined' && !window.isSecureContext) {
     setCameraFailed(true)
     return
   }
   ```
   When testing on a phone connected to a PC via Wi-Fi or Hotspot (`http://10.57.189.60:5173`), mobile browsers set `window.isSecureContext = false` and `navigator.mediaDevices = undefined` because the origin is `http://` instead of `https://`!
2. Because `start()` returns early before calling `getUserMedia()`, the browser **never** shows a permission prompt. And when the user clicks `Try camera again` (`line 428`), it just increments `attempt`, runs `start()` again, and immediately fails without ever prompting!
3. Even on HTTPS, calling `getUserMedia` inside a `useEffect` (instead of directly inside the user's button `onClick` handler) can be suppressed on some mobile WebViews / iOS Safari if a previous prompt was dismissed.

**Required Fixes in `QrScannerModal.tsx`:**
1. **Auto-Focus the 6-Letter Code Input (`#qr-room-code`) Immediately on Open:**
   - Currently, `QrScannerModal.tsx:278-279` does:
     ```ts
     const initial = readFocusables()[0] ?? node
     initial.focus()
     ```
     Because the `Close the scanner` (`X`) button is the first focusable element in the DOM, focus lands on the close button instead of the code input, forcing the user to click a second time to type!
   - Add `const codeInputRef = useRef<HTMLInputElement>(null)` and attach `ref={codeInputRef}` + `autoFocus` to `<input id="qr-room-code" ... />`.
   - In the focus-trap `useEffect` (`line 278`), focus `codeInputRef.current` first (`(codeInputRef.current ?? readFocusables()[0] ?? node).focus()`) so the moment the modal opens from `Enter a Code` (or `Type Code`), the 6-slot room code input is active (`ring-2 ring-brand-cobalt` on slot 1) and the user can type or paste (`Ctrl+V`) immediately without a second click!
   - Also wire the camera-denied `Type Code` action button (if rendered) to `codeInputRef.current?.focus()`.
2. **Direct User-Gesture Camera Request on Button Click:**
   - Extract a `requestLiveCamera()` function that can be called **directly** inside the `Try camera again` / `Give Camera Access` button `onClick` handler (preserving the user gesture token!) as well as on initial mount.
   - In `getUserMedia`, try `{ video: { facingMode: { ideal: 'environment' } }, audio: false }` first, and if that throws `OverconstrainedError` or `NotFoundError`, immediately fall back to `{ video: true, audio: false }` before giving up!
3. **Native OS Camera Capture Fallback (`<input type="file" accept="image/*" capture="environment" />`) for HTTP LAN / Hotspot & Denied Permissions:**
   - Browsers on `http://10.57.189.60:5173` block live `getUserMedia` streams, **but they ALWAYS allow `<input type="file" accept="image/*" capture="environment" />`**, which opens the phone's native camera app directly in 1 tap, takes a quick frame of the QR code, and hands the image `File` to JavaScript!
   - Add a hidden `<input ref={captureInputRef} type="file" accept="image/*" capture="environment" onChange={handleCaptureFile} className="sr-only" />`.
   - Implement `handleCaptureFile(event)`:
     - Load the captured/selected image via `createImageBitmap(file)` (or `new Image()` + `URL.createObjectURL(file)` revoked immediately in `finally`), draw it onto a canvas (scaling down to max `1200px` and also testing `600px` if needed, with `inversionAttempts: 'attemptBoth'` in `jsQR`), and call `extractRoomCode(found.data)`.
     - If a valid room code is found, call `acceptCode(scanned)` immediately!
     - If no QR code was detected in the photo, show a helpful inline status message (`Could not spot a QR code in that photo. Try once more or type the 6 letters below!`).
   - When `cameraFailed` is true:
     - If `!window.isSecureContext || !navigator.mediaDevices?.getUserMedia`:
       - Make the primary button in the camera area **open the native phone camera** (`captureInputRef.current?.click()`) labeled `Open Phone Camera` (`Camera` SVG icon), so clicking it **immediately opens the phone's native camera** even over plain HTTP LAN or Hotspot!
     - If `window.isSecureContext && navigator.mediaDevices?.getUserMedia`:
       - Primary button calls `void requestLiveCamera()` directly on click (`Give Camera Access` / `Try Camera Again`), and secondary pill offers `Snap QR with Camera App` (`captureInputRef.current?.click()`).

---

### 4. Hotspot & Offline LAN QR URL Selector (`web/src/pages/HomeHub.tsx` and `web/src/components/room/RoomCodeCard.tsx`)
- When a user opens `http://localhost:5173` on their PC, `window.location.origin` is `http://localhost:5173`. If a phone scans a QR code containing `http://localhost:5173/join?room=XXXXXX`, the phone tries to connect to itself (`localhost`) and fails!
- Also, when a PC has both Wi-Fi and a Hotspot / virtual adapter, the user may need the QR code to use the Hotspot IP.
- In `HomeHub.tsx`:
  - Fetch `GET /__ghostdrop/lan-info` once on mount (fail-soft with `catch {}` in production builds where `/__ghostdrop/lan-info` does not exist).
  - If `window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'` and `candidates.length > 0`, default the QR code base URL to `candidates[0].url` instead of `http://localhost:5173`!
  - If `candidates.length > 1`, pass the candidate list to `RoomCodeCard` (or render a sleek compact pill switcher when multiple network IPs exist) so the user can toggle between their Wi-Fi IP and Hotspot IP if needed.

---

### 5. Fix `Delete after 1st copy` (`BURN_ON_COPY`) & `15 mins` Countdown (`web/src/hooks/useGhostRoom.ts`, `web/src/lib/format.ts`, `web/src/components/room/TransferCard.tsx`)
1. **Pass `burnOnRead` / `burnOnCopy` for Files (`useGhostRoom.ts`):**
   - In `sendFiles()` (`lines 723-757`):
     - Compute `const burnOnRead = preset === 'BURN_ON_COPY'`.
     - Pass `burnOnCopy: burnOnRead` into `store.addFile({...})`.
     - Pass `burnOnRead` into `streamFile({...})`.
   - In `ChunkReceiver.onItem` (`lines 454-465`):
     - Pass `burnOnCopy: received.burnOnRead` into `store.addFile({...})`!
2. **Synchronize `BURN_ON_COPY` Deletion Across Connected Peers (`useGhostRoom.ts`):**
   - Right now, when a user copies a text note or copies/saves a file that has `burnOnCopy === true`, `store.consumeBurnOnCopy(id)` deletes it on the **local** screen only, leaving it alive on the sender's screen!
   - Create a helper `consumeAndSyncBurnOnCopy(id: string, itemName?: string)` in `useGhostRoom.ts`:
     - When `store.consumeBurnOnCopy(id)` returns `true`:
       - Also send `{ type: 'ITEM_NUKE', id, reason: 'BURN_ON_COPY' }` via `engineRef.current?.send(...)` to all connected peers!
       - And when `engine.on('packet')` receives `case 'ITEM_NUKE':` (`lines 522-524`):
         - Call `const item = store.getItem(packet.id)` before `store.removeItem(packet.id, packet.reason)`.
         - If `removed` and `packet.reason === 'BURN_ON_COPY'`, announce `buildFeedback('INFO_TTL_EXPIRED', { preset: 'BURN_ON_COPY', itemName: item?.fileName ?? 'that item' })` so both screens see the `Poof! All gone.` confirmation!
3. **Fix `15 mins` and Sub-Minute Countdown Display (`web/src/lib/format.ts`):**
   - In `formatTimeLeft(remainingMs: number | null, burnOnCopy: boolean)` (`lines 25-34`):
     - Currently: `if (remainingMs === null)` returns `'Deletes after first copy'` or `'Deletes when you close this page'`. **Wait:** verify that `EphemeralItem.burnOnCopy` is `true` for `BURN_ON_COPY` files too (which step 5.1 above fixes!).
     - When `remainingMs !== null`:
       - If `remainingMs <= 0`: return `'Deleting now'`.
       - If `remainingMs < 60_000`: return `${Math.max(1, Math.ceil(remainingMs / 1000))} secs left` so the user sees the live second-by-second countdown in the final minute!
       - If `remainingMs < 3600_000`:
         - Show minutes and seconds (`14m 52s left`) or exact minutes + seconds when under 15 minutes so the user immediately sees the `15 mins` timer ticking down every single second (`14m 59s left`, `14m 58s left`) instead of appearing frozen at `15 mins left` for a full minute!
4. **Ensure Changing the Preset Updates Active/New Drops Predictably:**
   - When the user changes the TTL preset in `TtlPicker` or `MobileBottomDock` (`setTtlPreset`), also update `ttlPresetRef.current = nextPreset` immediately inside `setTtlPreset` (synchronously, not waiting for a `useEffect` render cycle) so if they select `Delete after 1st copy` or `15 mins` and immediately drop/send an item, it always uses the newly selected preset!
   - Furthermore, when `setTtlPreset(nextPreset)` is called while items are already sitting in the room store (`store.getSnapshot()`), update existing active items in the store (`store.updateItem(item.id, { burnOnCopy: nextPreset === 'BURN_ON_COPY', deleteAt: ... })`) so if a user sends a file first and *then* taps `Delete after 1st copy` or `15 mins` (which is a super common user flow!), the existing items on screen immediately adopt that cleanup rule!

---

### 6. Copy Images/Files to Clipboard & Native Share (`web/src/hooks/useGhostRoom.ts`, `web/src/components/room/TransferCard.tsx`, `web/src/components/room/TransferFeed.tsx`, `web/src/pages/ConnectedWorkspace.tsx`, `web/src/pages/MobileJoin.tsx`)
1. **Enhance `copyItem(id: string)` in `useGhostRoom.ts`:**
   - For `item.kind === 'text'`: copy text via `navigator.clipboard.writeText(item.text)` (with a clean `document.execCommand('copy')` textarea fallback for non-HTTPS LAN origins where `navigator.clipboard` is undefined!).
   - For `item.kind === 'file'`:
     - Obtain the `Blob` from `item.blob` (or `fetch(item.blobUrl).then(r => r.blob())`).
     - If `typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write`:
       - If `blob.type === 'image/png'`, write `new ClipboardItem({ 'image/png': blob })`.
       - If `blob.type.startsWith('image/')` (e.g., `image/jpeg`, `image/webp`), convert it to `image/png` via an offscreen `<canvas>` (`createImageBitmap(blob)` -> `canvas.convertToBlob({ type: 'image/png' })` or `canvas.toBlob`) because browsers only universally support `image/png` in `navigator.clipboard.write`!
     - If clipboard write succeeds, announce `SUCCESS_COPIED` (or `INFO_TTL_EXPIRED` if `consumeAndSyncBurnOnCopy(id)` triggered).
     - If clipboard write is blocked (e.g., plain HTTP LAN origin where `navigator.clipboard.write` is restricted), fall back to `shareItem(id)` if `navigator.canShare` is available, or announce `ERR_COPY_BLOCKED`.
2. **Add `shareItem(id: string): Promise<boolean>` to `GhostRoom` (`useGhostRoom.ts`):**
   - Check if `typeof navigator !== 'undefined' && typeof navigator.share === 'function'`.
   - For a file item (`item.blob`): construct `new File([item.blob], item.fileName ?? 'ghostdrop-file', { type: item.mime || item.blob.type || 'application/octet-stream' })`.
   - If `navigator.canShare?.({ files: [file] })` is true, call `await navigator.share({ files: [file], title: item.fileName })`.
   - For a text item: call `await navigator.share({ text: item.text })`.
   - After a completed share, call `consumeAndSyncBurnOnCopy(id)`.
3. **Update `TransferCard.tsx` and `TransferFeed.tsx`:**
   - Pass `onShare?: (id: string) => void` down from `ConnectedWorkspace` and `MobileJoin` through `TransferFeed` to `TransferCard`.
   - On file/image cards in `TransferCard.tsx`:
     - If `isImage`: show an inline image thumbnail preview inside the `h-14 w-14` badge (`<img src={item.blobUrl} alt="" className="h-full w-full object-cover" />` when `item.blobUrl` exists, falling back to `<FileImage />`), make **Copy** (`Copy` icon) the primary pill button (`onClick={() => onCopy(item.id)}`), and render compact secondary icon-pill buttons for **Share** (`Share2` icon, when `canNativeShare` is supported or on mobile/desktop) and **Save** (`Download` icon, `onClick={() => onSave(item.id)}`).
     - If non-image file: show **Share** (`Share2` icon, if `navigator.share` is supported) or **Save** (`Download` icon) clearly so the user can either share directly to any app or save to disk.
     - Also ensure `saveItem(id)` in `useGhostRoom.ts` announces feedback (`SUCCESS_COPIED` or a save confirmation) and triggers `consumeAndSyncBurnOnCopy(id)`!

---

### 7. Remove Redundant Step Numbers on Hub Cards (`web/src/components/room/RoomCodeCard.tsx` and `web/src/pages/HomeHub.tsx`)
- In `web/src/components/room/RoomCodeCard.tsx:77-80`:
  - Keep `<OrbBadge size="md">1</OrbBadge>`.
  - Change `<h2 id="scan-title" className="type-h2">1. Scan with your phone</h2>` to remove the `1. ` prefix (`Scan with your phone` on desktop, or `Scan with your other screen` on mobile).
- In `web/src/pages/HomeHub.tsx:119-122`:
  - Keep `<OrbBadge size="md">2</OrbBadge>`.
  - Change `<h2 id="send-title" className="type-h2">2. Pick what to send</h2>` to `<h2 id="send-title" className="type-h2">Pick what to send</h2>`.

---

## Verification Checklist
- [x] `v0.7` appears directly beside `GhostDrop` on both the Desktop top navbar and Mobile top status header, and `web/package.json` version is `"0.7"`.
- [x] Opening GhostDrop on a phone shows `This Phone` (with `Smartphone` icon) as the local screen and `Your Computer` / `Your Phone` dynamically for the peer; opening on a PC shows `This Computer` (with `Laptop` icon).
- [x] Clicking `Enter a Code` / `Scan QR` opens `QrScannerModal` with `#qr-room-code` immediately auto-focused (`document.activeElement?.id === 'qr-room-code'`) so the user can type or paste the 6-character code right away without clicking a second time.
- [x] Clicking `Scan QR` / `Try camera again` on mobile invokes `getUserMedia` directly inside the click handler on secure origins, and on HTTP LAN/Hotspot origins provides a 1-tap `Open Phone Camera` button (`capture="environment"`) that scans the QR via the native camera app.
- [x] `HomeHub` resolves the host's LAN/Hotspot IP from `/__ghostdrop/lan-info` so the QR code never points a phone at `localhost`.
- [x] `Delete after 1st copy` (`BURN_ON_COPY`) works for both text notes and files/images, and immediately nukes the item on both screens after the first copy/share/save.
- [x] Selecting `15 mins` or `Delete after 1st copy` updates both the ref and any active items in the room store, and `formatTimeLeft` shows live second-granularity countdowns (`14m 58s left`, `42 secs left`).
- [x] Image and file cards support copying images to the clipboard (`ClipboardItem`), sharing via the OS Share sheet (`navigator.share`), and saving to disk (`Save`).
- [x] Hub cards no longer repeat `1.` and `2.` in the heading text below the numbered `<OrbBadge>`.
- [x] `npm run type-check`, `npm run lint`, and `npm run build` pass with zero errors, zero em dashes, and zero emojis.
