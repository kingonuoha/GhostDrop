# Step 07: PWA and Share Target Backend Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNLA241D - backend implemented - 2026-10-21

## Assigned Agent
`@ghostdrop-backend`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/00-prd-source-of-truth.md` (FR-1.6 PWA and Web Share Target API)
- `docs/06-protocol-and-tech-spec.md` (Section 4 PWA Web Share Target API)
- `decisions.md` (D-004 Installable PWA with Web Share Target)

## Objective
Configure Service Worker (`web/src/sw.ts`) with `POST /share-target` interception, temporary IndexedDB handoff storage (`ghostdrop-share-handoff`), and redirect flow to `/?shared=1`.

## Checklists
- [x] Configure `vite-plugin-pwa` in `web/vite.config.ts` with `injectManifest` strategy pointing to `web/src/sw.ts`.
- [x] Implement `web/src/sw.ts` with `fetch` event handler intercepting `POST /share-target`.
- [x] Store shared files/text in IndexedDB temporary queue and redirect with HTTP 303 to `/?shared=1`.
- [ ] Implement client-side retriever in app boot that drains `/?shared=1` into room sender and purges IndexedDB record. (UI mount wiring owned by `@ghostdrop-web`; `takeSharePayload()` plus `sharePayloadToFiles()` are ready.)
- [x] Enforce zero emojis and zero em dashes in service worker logs.
- [x] Verify TypeScript types with `npm run type-check` inside `web/`.

## Implementation Contract (Orchestrator, binding)
- Switch `vite-plugin-pwa` to `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`, `registerType: 'autoUpdate'`. Inline manifest config stays in `vite.config.ts` and is emitted as `manifest.webmanifest`.
- Manifest: `name`, `short_name`, `description`, `theme_color: '#CDF22B'`, `background_color: '#F7F6F2'`, `display: 'standalone'`, `start_url: '/'`, `scope: '/'`, icons `pwa-192x192.png` and `pwa-512x512.png` (`purpose: 'any'`) plus the 512 maskable variant if provided, and the exact `share_target` block from `docs/06-protocol-and-tech-spec.md` section 4.
- `web/src/sw.ts`: import `precacheAndRoute` and `cleanupOutdatedCaches` from `workbox-precaching` (already shipped by vite-plugin-pwa), precache `self.__WB_MANIFEST`, intercept `POST /share-target` in a fetch listener, parse `multipart/form-data`, store files plus text, title, url and timestamp in IndexedDB database `ghostdrop-share-handoff`, object store `payloads`, then return `Response.redirect('/?shared=1', 303)`. Navigations still use the precached app shell fallback.
- `web/src/lib/shareHandoff.ts`: shared client and worker IDB helpers (`saveSharePayload`, `takeSharePayload`, `peekSharePayload`, `clearShareHandoff`). `takeSharePayload` reads and deletes atomically. Records expire after 5 minutes and are purged on read. No payload is ever written to localStorage or a server.
- Robustness: missing form fields, zero files, oversized files (cap 100 MB total), blocked IDB, and non-secure contexts must fail soft with a redirect to `/?shared=error`, never throw an unhandled rejection or log raw user content.
- `web/public/robots.txt`: `User-agent: *`, `Disallow: /admin`, `Allow: /`.
- No UI files in this task. No new dependencies. Zero em dashes, zero emojis in logs and code.

## Completion Notes

**Status:** Backend half complete. UI mount wiring (`/?shared=1` claim on boot) intentionally left for `@ghostdrop-web`.

### Files touched
- `web/vite.config.ts`: switched to `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`, kept `registerType: 'autoUpdate'`; manifest now carries `theme_color: '#CDF22B'`, `background_color: '#F7F6F2'`, `scope: '/'`, PNG icons plus 512 maskable, and the exact `share_target` block from spec section 4. Precache glob is `**/*.{js,css,html}` and `includeAssets` covers favicon, Laroka, logo, and the three PNG icons, so nothing is duplicated in the precache manifest. `singleLarokaSource` postcss plugin and React/Tailwind plugins untouched.
- `web/src/sw.ts`: workbox precache + `cleanupOutdatedCaches`, `skipWaiting`/`clients.claim`, precached app shell fallback for navigations, `POST /share-target` interception with `formData` parsing, 100 MB declared and actual cap, IndexedDB handoff, 303 to `/?shared=1`, fail-soft 303 to `/?shared=error`. Logs are reason-only, no payload content, zero emojis and zero em dashes.
- `web/src/lib/shareHandoff.ts`: typed helpers `saveSharePayload`, `takeSharePayload`, `peekSharePayload`, `clearShareHandoff`, plus `sharePayloadToFiles`. Take is one readwrite transaction (get then delete), records expire after 5 minutes and are purged on read, every IDB path resolves `null`/`false` on blocked or missing storage. No `any`, no localStorage.
- `web/public/robots.txt`: contract content.
- `web/tsconfig.sw.json` (new) plus `web/tsconfig.json` project reference, `web/tsconfig.app.json` excludes `src/sw.ts`, and `package.json` `type-check` now runs the worker project too. Strictness unchanged (`strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`).
- `web/public/icons/pwa-192x192.png`, `pwa-512x512.png`, `pwa-512x512-maskable.png`: placeholder brand icons (Electric Cobalt `#1E45FB` ground, Acid Lime `#CDF22B` droplet) generated for the manifest contract. Visual polish agent may replace them with final artwork.

### Verification evidence
- `npm run type-check`: clean across `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.sw.json`.
- `npm run lint`: clean.
- `npm run build`: `mode injectManifest`, `precache 11 entries (599.83 KiB)`, emits `dist/sw.js` (19284 bytes), `dist/manifest.webmanifest`, `dist/robots.txt`, icons and fonts.
- `dist/manifest.webmanifest` carries the full `share_target` block, 192/512 `any` icons, 512 `maskable`, `theme_color #CDF22B`, `scope /`, `start_url /`.
- Precache manifest includes `index.html`, hashed `assets/index-*.js`, `assets/index-*.css`, fonts, icons, `manifest.webmanifest`, `registerSW.js` (app shell offline ready), with no duplicate entries.
- Live preview check on `http://localhost:4173` with an active controlling worker: multipart `POST /share-target` landed on `/?shared=1` and left one record under `ghostdrop-share-handoff` / `payloads` with 4 field values, 1 file (`probe.png`, `image/png`, 6 bytes), and `expiresAt - createdAt === 300000`. Empty form landed on `/?shared=error`; text-only form landed on `/?shared=1` with zero files. `caches.match('/index.html')` returned 200 from `workbox-precache-v2`.
- Temporary Node harness against the compiled helpers (deleted after use) confirmed: 5 minute TTL, peek does not claim, two concurrent `takeSharePayload` calls yield exactly one winner and one `null`, slot empty afterwards, expired record is not returned and is purged on read, empty and over-100 MB payloads rejected, and save/take/peek/clear all fail soft when `indexedDB` is absent.

### Notes for the next agent
- Claim flow: `const payload = await takeSharePayload(); if (payload) { const files = sharePayloadToFiles(payload); ... }` then drop the `shared` query param with `navigate('/', { replace: true })`. Do not call `peekSharePayload` before `takeSharePayload` in the boot path, or the same beat may read twice.
- `theme_color` moved to Acid Lime per contract; if `web/index.html` hardcodes a `theme-color` meta, mirror `#CDF22B` there so the installed PWA title bar matches.
- Service workers need a secure context. On plain HTTP LAN origins the share target simply never registers; the app itself is unchanged.
