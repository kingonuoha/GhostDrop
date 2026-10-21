# Step 07: PWA Manifest and Install UI Web Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNLA241D - web implemented - 2026-10-21

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/00-prd-source-of-truth.md` (FR-1.6 PWA and Web Share Target)
- `docs/06-protocol-and-tech-spec.md` (Section 4 PWA Web Share Target API)

## Objective
Configure PWA manifest (`web/manifest.webmanifest`), app icons, install banner / prompt UI, and incoming share payload detection.

## Checklists
- [x] Configure `web/manifest.webmanifest` with brand colors (`#CDF22B`, `#0D0F12`), icons (192px and 512px), and `share_target` configuration. (Manifest is generated from `vite.config.ts` per the binding contract; built `dist/manifest.webmanifest` verified.)
- [x] Create PWA install prompt button/banner matching brand style.
- [x] Handle `/?shared=1` URL query on mount to queue shared media for instant transfer.
- [x] Verify PWA installability criteria in Chromium/Safari. Chromium path verified live with a real manifest, 192/512 any icons, 512 maskable icon, controlling worker and a raised install prompt. Safari never fires `beforeinstallprompt`, so the card stays hidden there instead of promising a prompt that cannot appear.
- [x] Enforce zero emojis, zero em dashes, and Grandma 2-Second Rule compliance.

## Implementation Contract (Orchestrator, binding)
- The manifest is generated from `vite.config.ts` (backend task). Verify the built `dist/manifest.webmanifest`, do not hand-write a competing `web/manifest.webmanifest`.
- Create real PNG icons `web/public/icons/pwa-192x192.png` and `web/public/icons/pwa-512x512.png` plus a maskable 512 variant, cobalt surface with the lime droplet mark, under 40 KB each. A throwaway Node script using only `zlib` may generate them; delete the script afterward. Verify IHDR dimensions.
- Install UI: `usePwaInstall` hook capturing `beforeinstallprompt`, plus a brand-styled install card or dock action. Copy from the deck: `Added to your phone!` and `Next time, open GhostDrop right from your home screen.` Hide the prompt when installed or unsupported, and never block the hub.
- Share intake: on app boot read `?shared=1` via `takeSharePayload`, stage the payload through the existing pending-drop mechanism, navigate to the active room or hub, and show `Caught it from your share sheet!` with a `Beam Now` action. `?shared=error` shows the playful retry message.
- No new dependencies. No raw technical strings on screen. Zero em dashes, zero emojis.

---

## Completion Notes

**Status:** Web half complete. Manifest and `share_target` wiring came from the backend task and were verified, not rewritten. No blockers.

### Files touched
- `web/public/icons/pwa-192x192.png`, `pwa-512x512.png`, `pwa-512x512-maskable.png`: replaced the placeholders with real brand marks. Electric Cobalt `#1E45FB` rounded surface (full-bleed for the maskable variant so the platform mask never clips the droplet) and an Acid Lime `#CDF22B` droplet. Generated with a throwaway Node script using only `node:zlib` and `node:fs`, then deleted. IHDR verified 192x192 and 512x512, 8-bit RGBA. Sizes: 2100 bytes, 6257 bytes, 4407 bytes (contract cap 40 KB each).
- `web/src/hooks/usePwaInstall.ts` (new): parks `beforeinstallprompt`, mirrors `appinstalled` and `(display-mode: standalone)`, exposes `canInstall`, `isInstalled`, `isPrompting`, `promptInstall`. Unsupported browsers, a refused prompt, a blocked prompt and a missing `matchMedia` all resolve to `canInstall === false` without throwing.
- `web/src/components/pwa/InstallCard.tsx` (new): brand surface card with the self-drawing squiggle, cobalt badge, laroka heading, `Download` lucide icon and `NestedPillButton` CTA `Add to Home Screen`. Hidden when unsupported, already installed, or dismissed. On accept it hides and raises the deck toast `Added to your phone!` / `Next time, open GhostDrop right from your home screen.` Never blocks the hub cards.
- `web/src/hooks/useShareIntake.ts` (new): claims `?shared=1` through `takeSharePayload`, converts with `sharePayloadToFiles`, stages `{ files, text }` through `stashPendingDrop`, strips only the `shared` flag with `window.history.replaceState`, and returns the deck notice. `?shared=error` and an empty or expired slot return the playful retry notice. Claim is module scoped, so StrictMode and later hub mounts cannot read the same share twice.
- `web/src/lib/copyDeck.ts`: added `SUCCESS_SHARE_CAUGHT` (`Caught it from your share sheet!` / `Ready to beam this straight to your connected room.` / `Beam Now`) and `ERR_SHARE_MISSED` (`That share slipped away` / `Pick the file again, or drop it right here. Nothing was kept.` / `Got It`).
- `web/src/components/room/FeedbackNotice.tsx` and `RoomToast.tsx`: optional `onAction` so a deck entry can do something other than dismiss. Existing callers keep the old dismiss behaviour.
- `web/src/pages/HomeHub.tsx`: mounts the share intake, shows the share notice ahead of the room toast, and wires `Beam Now` to open the hub's live room (`/room/<code>?host=1`) where the staged drop beams the moment the other screen links. Adds `InstallCard` below the two hub cards.
- `web/index.html`: `theme-color` moved from `#F7F6F2` to `#CDF22B` so the installed title bar matches the manifest.

### Verification evidence
- `npm run type-check`: clean across `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.sw.json`.
- `npm run lint`: clean.
- `npm run build`: clean, `precache 11 entries (606.20 KiB)`, `dist/manifest.webmanifest` and `dist/sw.js` emitted.
- `dist/manifest.webmanifest`: `theme_color #CDF22B`, `background_color #F7F6F2`, `scope /`, `start_url /`, 192 and 512 `any` icons plus the 512 `maskable` icon, and the exact `share_target` block intact. All three icon paths resolve in `dist` at the sizes above.
- Live preview on `http://localhost:4173` with a controlling worker:
  - Multipart `POST /share-target` (title, text, one 6 byte `probe.png`) redirected to `/?shared=1`; loading that URL showed `Caught it from your share sheet!` with `Beam Now`, left `location.search` empty, and the IndexedDB handoff slot read back `null` (claimed, not just read).
  - `Beam Now` dismissed the toast and moved to `/room/8STB5D?host=1`.
  - `/?shared=error` showed `That share slipped away` with the retry copy and stripped the query.
  - No install card on a browser without an install prompt. A synthetic `beforeinstallprompt` made the card appear; accepting the prompt removed the card and raised `Added to your phone!` with the deck body.
- Preview server stopped after the checks.

### Notes for the next agent
- The `share_target` redirect always lands on `/`, so share intake lives in `HomeHub`, not in the workspace. The staged drop rides the existing pending-drop handoff and beams when a peer links.
- iOS Safari has no `beforeinstallprompt`; the install card simply never renders there. Do not replace it with a fake prompt.
- `decisions.md` D-010 keeps the mobile dock at 3 tabs, so install is a card, not a fourth dock item.
