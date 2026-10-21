# Step 07: QA PWA and Web Share Target Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References (all read before audit)
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`
- `docs/08-qa-checklist.md` (Gate 5 measured in full; Gate 2 and Gate 6 re-checked; Gates 1, 3 and 4 only where this step touches them)
- `docs/06-protocol-and-tech-spec.md` section 4 (PWA Web Share Target API contract)
- `docs/00-prd-source-of-truth.md` FR-1.6 (Installable PWA and Web Share Target API)
- `docs/tasks/step-07-pwa-and-share-target/backend-task.md` and `web-task.md`, including both Completion Notes blocks
- `decisions.md` D-004 (installable PWA with Web Share Target, in-app QR scanner, local TTL) and D-010 (Stage exports are layout only, mobile dock stays at 3 tabs)

## Objective
Read-only audit of the Step 07 PWA manifest, `injectManifest` service worker, Web Share Target handoff (`POST /share-target`), install prompt UI, share intake wiring, and the built `dist/manifest.webmanifest` and `dist/sw.js`, against Gate 5 plus the Gate 2 copy ban and the Gate 6 build health items.

## Method and honest limits
- Static audit of every file named in both tasks plus supporting files: `vite.config.ts`, `src/sw.ts`, `src/lib/shareHandoff.ts`, `src/hooks/usePwaInstall.ts`, `src/hooks/useShareIntake.ts`, `src/components/pwa/InstallCard.tsx`, `src/lib/pendingDrop.ts`, `src/lib/copyDeck.ts`, `src/pages/HomeHub.tsx`, `src/pages/ConnectedWorkspace.tsx`, `src/components/room/RoomToast.tsx`, `src/components/room/FeedbackNotice.tsx`, `src/components/nav/*`, `src/components/shell/AppShell.tsx`, `index.html`, `tsconfig.sw.json`, `public/robots.txt`.
- PNG icons were byte-decoded in this session: IHDR read directly, plus full zlib inflate and unfilter to confirm real pixel content and brand colors, not just file headers.
- All three build commands were executed in `web/` in this session, then `dist/` was inspected after the rebuild.
- No desktop browser was attached to this QA session (the browser tool reported no connected desktop), so the live service worker round trip (multipart POST, IndexedDB record, 303 landing, toast) was NOT re-executed here. That behaviour rests on the emitted worker and manifest evidence below plus the live preview run recorded in both Completion Notes. This gap is stated per item instead of being claimed as re-verified.
- Pixel widths at 360, 768, 1024 and 1440 px were not re-measured here. Responsive verdicts rest on static class analysis plus the Step 06 measurements.

## Command Results
| Command | Result | Evidence |
| :--- | :--- | :--- |
| `npm run type-check` | PASS, zero errors | `tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.sw.json`, clean output |
| `npm run lint` | PASS, zero errors, zero warnings | `eslint .`, clean output |
| `npm run build` | PASS, zero errors | `PWA v2.0.0`, `mode injectManifest`, `format: es`, `precache 11 entries (606.20 KiB)`, `dist/sw.js` emitted (19284 bytes), `dist/manifest.webmanifest` emitted |

Build emits one advisory warning, recorded as F-05 below: `Some chunks are larger than 500 kB after minification` (`dist/assets/index-Ci0EwWFP.js` 578.29 kB, gzip 180.78 kB). That is a Vite size hint, not an error, and it predates this step.

## Gate 5: PWA, Web Share Target and QR Scanner

### 5.1 Manifest source of truth: `web/vite.config.ts`
- [x] `strategies: 'injectManifest'` with `srcDir: 'src'`, `filename: 'sw.ts'`, `registerType: 'autoUpdate'` (`vite.config.ts:40-43`). No competing hand-written `web/manifest.webmanifest` exists on disk.
- [x] `name: 'GhostDrop'` and `short_name: 'GhostDrop'` (`vite.config.ts:53-54`).
- [x] `theme_color: '#CDF22B'` Acid Lime (`vite.config.ts:56`).
- [x] `background_color: '#F7F6F2'` Warm Stone (`vite.config.ts:57`).
- [x] `display: 'standalone'` (`vite.config.ts:58`).
- [x] `start_url: '/'` and `scope: '/'` (`vite.config.ts:59-60`).
- [x] Icons 192 x 192 `any`, 512 x 512 `any`, 512 x 512 `maskable` (`vite.config.ts:61-80`), all three declared in `includeAssets` (`vite.config.ts:44-51`) so the precache carries them.
- [x] `share_target` block is character for character the spec section 4 block: `action: '/share-target'`, `method: 'POST'`, `enctype: 'multipart/form-data'`, params `title`, `text`, `url`, and `files` with `accept: ['image/*', 'video/*', 'application/pdf', 'text/*', '*/*']` (`vite.config.ts:81-96` against `docs/06-protocol-and-tech-spec.md:96-113`).
- [x] `injectManifest.globPatterns: ['**/*.{js,css,html}']` (`vite.config.ts:98-100`); assets and fonts arrive through `includeAssets` instead of a duplicate glob.

### 5.2 Service worker: `web/src/sw.ts`
- [x] `precacheAndRoute(self.__WB_MANIFEST)` and `cleanupOutdatedCaches()` (`sw.ts:24-25`).
- [x] `skipWaiting` on install and `clients.claim` on activate (`sw.ts:27-33`).
- [x] `fetch` listener routes `POST` with pathname `/share-target` to `handleShareTarget`, and leaves every other POST to the network (`sw.ts:101-110`).
- [x] Multipart parsed with `request.formData()`; only `files`, `text`, `title`, `url` are read (`sw.ts:64-68`); blank strings normalise to `null` (`sw.ts:43-48`); zero byte file entries filtered out (`sw.ts:39-41`).
- [x] IndexedDB handoff through `saveSharePayload` into `ghostdrop-share-handoff` / `payloads` (`sw.ts:70`, `shareHandoff.ts:14-15`, `shareHandoff.ts:177-181`).
- [x] Success redirect is `Response.redirect(absolute, 303)` to `/?shared=1` (`sw.ts:35-37`, `sw.ts:76`, constants `shareHandoff.ts:18-20`).
- [x] Fail soft, never a raw error: declared over-cap, empty payload and parse failure each log a reason-only line and 303 to `/?shared=error` (`sw.ts:59-62`, `sw.ts:72-73`, `sw.ts:77-80`). No exception string, no payload content, no user filename in any log line.
- [x] 100 MB cap constant `100 * 1024 * 1024` (`shareHandoff.ts:17`), enforced before parse on `content-length` (`sw.ts:50-55`, `sw.ts:59`) and again on summed file bytes (`shareHandoff.ts:149-150`).
- [x] 5 minute TTL constant `5 * 60 * 1000` (`shareHandoff.ts:16`), stamped as `expiresAt` (`shareHandoff.ts:161`).
- [x] Navigation requests serve the precached app shell first, network second, and a playful plain-text `503` offline body last (`sw.ts:83-99`, `sw.ts:112-114`).
- [x] No unhandled rejection path: `handleShareTarget` wraps everything in `try/catch` and always resolves to a `Response` (`sw.ts:57-81`); every IDB helper resolves rather than throws (`shareHandoff.ts:91-124`).

### 5.3 Handoff storage: `web/src/lib/shareHandoff.ts`
- [x] Atomic take: `get` and `delete` share one `readwrite` transaction, and the slot is deleted even when the record is expired or malformed (`shareHandoff.ts:213-227`). The promise resolves once, after `transaction.oncomplete` (`shareHandoff.ts:227`).
- [x] TTL purge on read: an expired record is not returned but is still deleted (`shareHandoff.ts:220-224`).
- [x] `peekSharePayload` is read-only and does not claim (`shareHandoff.ts:242-273`); it is not used in the boot path.
- [x] Fail soft without IDB: `hasIndexedDb` guard plus `onblocked`, `onerror`, `onupgradeneeded` and constructor `catch` all resolve `null` (`shareHandoff.ts:83-124`).
- [x] Zero `localStorage` or `sessionStorage` in the file, and a repository wide grep for both keys under `src/` returns zero hits outside one comment.
- [x] Zero `any`: no `any`, `as any` or `<any>` in `shareHandoff.ts`, `sw.ts`, `useShareIntake.ts`, `usePwaInstall.ts` or `InstallCard.tsx`; runtime narrowing is done with `unknown` plus type guards (`shareHandoff.ts:50-81`).

### 5.4 Install prompt and share intake
- [x] `usePwaInstall` parks `beforeinstallprompt` with `preventDefault` so the prompt can be raised from a real tap (`usePwaInstall.ts:46-50`), mirrors `appinstalled` (`usePwaInstall.ts:52-55`) and `(display-mode: standalone)` (`usePwaInstall.ts:26-36`, `usePwaInstall.ts:57-67`), and cleans up every listener (`usePwaInstall.ts:69-73`).
- [x] Lifecycle is safe: `canInstall` is true only while an event is parked and the app is not installed (`usePwaInstall.ts:98`); a refused or throwing prompt resolves `false` and drops the event (`usePwaInstall.ts:88-91`); a double tap is guarded by `isPrompting` (`usePwaInstall.ts:78`).
- [x] `InstallCard` is hidden when unsupported, installed or dismissed (`InstallCard.tsx:36`), never gates the hub (it renders after both hub cards, `HomeHub.tsx:149`), uses brand token classes only, a lucide `Download` icon and the self-drawing `SquiggleCardBg` (`InstallCard.tsx:60-71`).
- [x] Install copy follows the deck: `Added to your phone!` and `Next time, open GhostDrop right from your home screen.` come from `SUCCESS_PWA_INSTALLED` (`copyDeck.ts:138-145`) and are raised as a toast on accept (`InstallCard.tsx:40-50`).
- [x] Share intake claims once: module scoped promise plus settled flag stops the StrictMode double mount and any later hub mount from reading the same share twice (`useShareIntake.ts:26-27`, `useShareIntake.ts:63-72`).
- [x] Query is stripped before the await (`useShareIntake.ts:47-48`), so a refresh during the claim cannot replay it; the strip removes only the `shared` key and preserves path, other params and hash (`useShareIntake.ts:30-39`).
- [x] Claimed payload is converted to `File[]` (`shareHandoff.ts:307-312`) and staged through the existing in-memory pending-drop slot (`useShareIntake.ts:55-58`, `pendingDrop.ts:17-25`), which the workspace drains once on link (`ConnectedWorkspace.tsx:64-71`).
- [x] Playful notices on both paths: `Caught it from your share sheet!` with `Beam Now` (`copyDeck.ts:146-154`) and `That share slipped away` with `Nothing was kept.` (`copyDeck.ts:155-162`). `?shared=error` never touches IDB (`useShareIntake.ts:50`).
- [x] `Beam Now` is wired to the live room and still dismisses first (`HomeHub.tsx:40-43`), and the share notice takes precedence over the room toast without stacking two toasts (`HomeHub.tsx:152-162`).
- [x] `RoomToast` and `FeedbackNotice` gained an optional `onAction`, defaulting to dismiss for every existing caller (`RoomToast.tsx:8`, `FeedbackNotice.tsx:44`, `FeedbackNotice.tsx:80`).

### 5.5 Navigation and theme color
- [x] No double nav and no fourth dock tab. Desktop bar is `hidden md:block` (`DesktopTopPillBar.tsx:24`), mobile status header is `md:hidden` (`MobileStatusHeader.tsx:30`), dock is `md:hidden` (`MobileBottomDock.tsx:58`), so exactly one top chrome renders per breakpoint.
- [x] Dock stays at 3 tabs, `Send`, `Scan QR`, current TTL label (`MobileBottomDock.tsx:28-32`), matching D-010. Install is a card, not a dock item.
- [x] `theme-color` meta is `#CDF22B` in `index.html:16` and survives into `dist/index.html`, so it matches `theme_color` in the manifest.

### 5.6 QR scanner fallback (Gate 5 second bullet)
- [x] Camera denial resolves to the deck error `ERR_CAMERA_DENIED` (`QrScannerModal.tsx:27`) with a 6-character code field present in the same dialog (`QrScannerModal.tsx:541-560`), and no raw `DOMException` is surfaced (`QrScannerModal.tsx:234`).
- [x] Copy conflict noted as F-04: `docs/08-qa-checklist.md:35` quotes `Camera shy?`, `docs/design.md:183` says `Camera shy? No worries!`, but the canonical deck `docs/02-brand-persona-and-copy.md:64` says `No camera? No problem!` with `Just type the 6-letter code shown on your other screen below.` and `Type Code`. Implementation follows `docs/02`, which `AGENTS.md` names as the copy source of truth, so this is a docs wording drift, not an app defect.

## Gate 2: Playful Copy and Zero Em-Dash / Zero Emoji
- [x] Zero em dashes and zero en dashes in `web/src`, `index.html` and `web/public` (regex grep for U+2014 and U+2013 returned zero lines).
- [x] Zero em dashes in `dist/sw.js`, `dist/manifest.webmanifest`, `dist/index.html`, `dist/assets/*.js` and `dist/assets/*.css` after the rebuild.
- [x] Zero emoji code points (U+1F300 to U+1FAFF, U+2600 to U+27BF, U+FE0F, U+2B00 to U+2BFF) in `web/src` and `index.html`; all indicators in the new UI are `lucide-react` icons (`Download`, `X`, `Clock`, `Send`, `ScanLine`, `Check`) marked `aria-hidden`.
- [x] Zero `window.alert`, and zero `alert(`, `window.confirm` or `window.prompt` in `src/` and in the built bundle.
- [x] Every new user-facing string comes from the copy deck or is plain friendly English: `Caught it from your share sheet!`, `That share slipped away`, `Keep GhostDrop one tap away`, `Add to Home Screen`, `Adding...`, `Hide install hint`. No protocol jargon and no `IndexedDB`, `Service Worker`, `WebRTC`, `DOMException`, `Error 500` or `PeerJS` on screen. `share sheet` is plain operating system vocabulary, not implementation jargon.
- [x] Service worker logs are reason only and contain no user content, no filenames and no raw exception text (`sw.ts:60`, `sw.ts:72`, `sw.ts:78`).

## Gate 6: Build Health and Responsive Items Touched Here
- [x] `tsc --noEmit` across the app, node and sw projects: clean.
- [x] ESLint: clean.
- [x] `npm run build`: clean, worker emitted, 11 precache entries.
- [x] `src/sw.ts` is type checked under a dedicated worker project with `lib: ["ES2023", "WebWorker"]` and the full strict flag set (`tsconfig.sw.json`), and excluded from the app project so DOM lib types cannot mask worker errors.
- [x] The install card and toast use the same token classes and responsive stacking as the rest of the hub, and the toast sits above the dock (`RoomToast.tsx:18`), but the four pixel widths were not re-measured in this session. Carried from Step 06 evidence and flagged as not re-verified here.

## dist Inspection Evidence (post rebuild, 2026-10-21)
`dist/manifest.webmanifest` (771 bytes) verbatim:
```
{"name":"GhostDrop","short_name":"GhostDrop","description":"Send photos and text between your screens. GhostDrop cleans up after itself.","start_url":"/","display":"standalone","background_color":"#F7F6F2","theme_color":"#CDF22B","lang":"en","scope":"/","icons":[{"src":"/icons/pwa-192x192.png","sizes":"192x192","type":"image/png","purpose":"any"},{"src":"/icons/pwa-512x512.png","sizes":"512x512","type":"image/png","purpose":"any"},{"src":"/icons/pwa-512x512-maskable.png","sizes":"512x512","type":"image/png","purpose":"maskable"}],"share_target":{"action":"/share-target","method":"POST","enctype":"multipart/form-data","params":{"title":"title","text":"text","url":"url","files":[{"name":"files","accept":["image/*","video/*","application/pdf","text/*","*/*"]}]}}}
```

Icon files, decoded and inflated in this session, not just header reads:
| File | IHDR | Bit depth / color type | Bytes | Pixel check |
| :--- | :--- | :--- | :--- | :--- |
| `dist/icons/pwa-192x192.png` | 192 x 192 | 8 / 6 (RGBA) | 2100 | 21406 px `#1E45FB`, 13602 px `#CDF22B`, center RGBA `205,242,43,255`, all other pixels alpha 0 |
| `dist/icons/pwa-512x512.png` | 512 x 512 | 8 / 6 (RGBA) | 6257 | 152728 px `#1E45FB`, 97710 px `#CDF22B`, center RGBA `205,242,43,255`, all other pixels alpha 0 |
| `dist/icons/pwa-512x512-maskable.png` | 512 x 512 | 8 / 6 (RGBA) | 4407 | 187320 px `#1E45FB`, 73826 px `#CDF22B`, corner pixel `#1E45FB` full bleed, zero transparent pixels |

Notes: every pure black pixel found is fully transparent (alpha 0) corner and edge rounding, so no unmapped `#000000` is painted. The maskable variant has no transparency at all, so a platform mask cannot clip the droplet. All three are far under the 40 KB contract cap.

`dist/sw.js` (19284 bytes) string audit:
| Required string | Occurrences |
| :--- | :--- |
| `share-target` | 1 |
| `ghostdrop-share-handoff` | 1 |
| `payloads` | 4 |
| `shared=1` | 1 |
| `shared=error` | 1 |
| `/index.html` | 1 |
| `"assets/index-Ci0EwWFP.js"` | 1 |
| `303` | 1 |

Precache coverage resolved from the emitted worker: `index.html`, `assets/index-Ci0EwWFP.js`, `assets/index-DyNBOSnB.css`, `favicon.svg`, `fonts/laroka.otf`, `icons/logo.jpg`, `icons/pwa-192x192.png`, `icons/pwa-512x512.png`, `icons/pwa-512x512-maskable.png`, `manifest.webmanifest`, `registerSW.js`. That is exactly the 11 entries the build reports, with no duplicates. Workbox 7.4.0 core and precaching are bundled inline (`workbox:core:7.4.0` and `workbox:precaching:7.4.0` markers present).

`dist/index.html` (1235 bytes): includes `<link rel="manifest" href="/manifest.webmanifest">`, the registered `/registerSW.js` script tag, and `<meta name="theme-color" content="#CDF22B" />`.

## Findings

### Blockers
None.

### F-01 LOW: expired share records are only swept on read, never in the background
`docs/06-protocol-and-tech-spec.md:114-115` asks for a temporary handoff purged on claim, which is implemented. However `takeSharePayload` is the only purge point (`shareHandoff.ts:220-225`), and `clearShareHandoff` has no caller in `src/` (grep finds the definition only, `shareHandoff.ts:276`). If a share is parked and the user never opens the app on that origin, up to the 100 MB cap can remain in IndexedDB past the 5 minute TTL until the next read of the store. Bytes stay bounded, stay on the same device, and never leave it, so this is not an exfiltration path, but it is residual on-disk content held longer than the TTL advertises. Suggested follow-up: purge on boot when `shared` is absent from the query, or sweep on activate.
Severity rationale: affects the accuracy of the TTL promise, no off-device exposure.

### F-02 LOW: a second share silently overwrites an unclaimed first share
The store uses one fixed key `latest` (`shareHandoff.ts:22-23`, `shareHandoff.ts:154`), so `saveSharePayload` overwrites whatever was parked. The share target always redirects straight into the app, so the window where two shares are unclaimed at once is short, and newest-wins is a deliberate rule. Recorded so the behaviour is a documented choice rather than a surprise.

### F-03 LOW: the 100 MB cap on a content-length-less body is enforced after buffering
`sw.ts:59-62` rejects an oversized body before parsing only when `content-length` is present. Without that header (chunked transfer), `request.formData()` (`sw.ts:64`) materialises the payload first and the cap is applied afterwards in `saveSharePayload` (`shareHandoff.ts:149-150`). Real browsers send `content-length` for share target form posts, so this is a defence in depth note, not an observed bypass.

### F-04 INFO: camera-denied copy differs between docs and the deck
`docs/08-qa-checklist.md:35` and `docs/design.md:183` show `Camera shy?` wording, while the canonical deck `docs/02-brand-persona-and-copy.md:64` shows `No camera? No problem!`. Implementation follows the deck. Docs only fix, no code change requested here.

### F-05 INFO: bundle size advisory still present
`dist/assets/index-Ci0EwWFP.js` is 578.29 kB (gzip 180.78 kB) and Vite prints the over 500 kB chunk hint. Not an error, not introduced by this step, and out of scope for Step 07. A later code-split pass could address it.

### F-06 INFO: an intermediate `dist/sw.mjs` is emitted alongside `dist/sw.js`
The `injectManifest` build writes `dist/sw.mjs` (18.52 kB) and then the final `dist/sw.js`. Nothing references `sw.mjs`; the registration path is `/registerSW.js` pointing at `/sw.js`. Harmless, but worth knowing when auditing `dist/`.

### F-07 NOTE: an undismissed share notice can reappear on hub remount
The claim promise is cleared only on dismiss (`useShareIntake.ts:69-72`), so navigating away and back before dismissing re-renders the same notice. The share itself is already claimed and the IDB slot is empty, so this is a duplicate toast, not a duplicate transfer or replay.

## Background Storage and Security Notes
- Verified: no drop content is persisted outside the temporary handoff. `localStorage` and `sessionStorage` appear nowhere in `src/` (the single mention is a comment in `useShareIntake.ts:5`). The only storage API in use is the `ghostdrop-share-handoff` database.
- Verified: the handoff record is deleted inside the same `readwrite` transaction that reads it (`shareHandoff.ts:213-227`), so a claim cannot leave a second copy behind and two callers cannot both win.
- Verified: after a claim, the payload lives only in module memory (`pendingDrop.ts:13-25`) and is cleared on first read by the workspace (`ConnectedWorkspace.tsx:64-71`).
- Verified: no user content, filename or raw exception is logged by the worker; all three log lines are fixed reason strings (`sw.ts:60`, `sw.ts:72`, `sw.ts:78`).
- Verified: no `dangerouslySetInnerHTML` in the new UI, and shared text reaches the room through the existing escaped React path.
- Verified: `robots.txt` keeps `Disallow: /admin` (`public/robots.txt`).
- Residual risks recorded as F-01, F-02 and F-03 above.
- Note: service workers require a secure context. On a plain HTTP LAN origin the install and share target simply do not activate and the app behaves as a normal page. That matches `backend-task.md` Notes and is correct behaviour, not a defect.

## Verdict

**GATE PASS** for Step 07 (PWA, Web Share Target, install UI, share intake, build health).

- Gate 5: PASS. Manifest, icons, maskable variant, exact `share_target` block, worker interception, IDB handoff, 303 redirects, fail-soft paths, TTL, size cap, and the playful code fallback for camera denial are all present and evidenced.
- Gate 2: PASS. Zero em dashes, zero emojis, zero `alert`, zero protocol jargon on screen, playful deck copy on success and failure.
- Gate 6: PASS for the items this step can affect (type-check, lint, build, theme color, no double nav, 3-tab dock). Pixel widths at 360, 768, 1024 and 1440 px were not re-measured in this session and are carried from Step 06 evidence.

**Blockers: none.**

Follow-ups recommended, all non-blocking: F-01 (background TTL sweep for the handoff store), F-04 (docs wording alignment for the camera-denied line), F-05 (later bundle split).
