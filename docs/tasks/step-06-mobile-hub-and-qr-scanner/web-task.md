# Step 06: Mobile Hub and QR Scanner Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNLA241D - step 06 built and verified - 2026-10-21

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/01-wireframe-and-pages.md` (Screens 3, 4 & 5)
- `docs/02-brand-persona-and-copy.md`
- `docs/design/ghostdrop_mobile_grandma_friendly_hub/` (`screen.png` & `code.html`)
- `docs/design/connect_to_your_screen_modal/` (`screen.png` & `code.html`)
- `docs/design/how_ghostdrop_works_grandma_friendly_3_steps_1/` (`screen.png` & `code.html`)
- `docs/design/how_ghostdrop_works_grandma_friendly_3_steps_2/` (`screen.png` & `code.html`)

## Objective
Build `/join?room=XXXXXX` Mobile Hub matching `ghostdrop_mobile_grandma_friendly_hub` with the 3-tab Sleek Floating Bottom Navbar, plus the `Connect to your other screen` QR Scanner modal with `jsQR` matching `connect_to_your_screen_modal`, and `/how-it-works` matching `how_ghostdrop_works_grandma_friendly_3_steps_1` & `_2`.

## Checklists
- [x] Build `/join?room=XXXXXX` Mobile Web Hub with compact top status header (droplet logo + active room indicator) and sleek bottom navbar dock. Implemented in `web/src/pages/MobileJoin.tsx` per the Implementation Contract; `MobileHub.tsx` was not created.
- [x] Implement Sleek Floating Bottom Navbar dock fixed at bottom thumb zone with 3 tabs (`Send`, `Scan QR`, `50 Mins`). `Send` focuses the note composer (falling back to `/` when the page has none), `Scan QR` opens the modal, and the timer tab applies the chosen preset to the open room. The label follows the active preset and defaults to `50 Mins`.
- [x] Build `QrScannerModal` with live camera video feed decoded via `jsQR` and clean camera viewfinder brackets. Lives at `web/src/components/qr/QrScannerModal.tsx` per the Implementation Contract, not `src/components/QrScannerModal.tsx`.
- [x] Implement single-row 6-letter code input box (`[G] [H] [O] [S] [T] [8]`) with uppercase conversion, paste support and one accessible field. Initial focus stays on the dialog close button so the phone keyboard never covers the viewfinder.
- [x] Add playful camera-shy fallback state (`No camera? No problem!` plus `Just type the 6-letter code shown on your other screen below.`) for blocked, missing, busy, insecure-context and unanswered-prompt cameras.
- [x] Build `/how-it-works` page with 3-step visual cards linked by self-drawing squiggle line and 3 friendly alert cards.
- [x] Enforce zero emojis, zero em dashes, and crisp SVG icons across all screens.

## Implementation Contract (Orchestrator, binding)
- Mobile hub lives in the existing `web/src/pages/MobileJoin.tsx` route `/join`. `MobileHub.tsx` is superseded; do not create a second page.
- QR scanner lives at `web/src/components/qr/QrScannerModal.tsx`. Do not create `src/components/QrScannerModal.tsx`.
- Dock is exactly 3 tabs (`Send`, `Scan QR`, `50 Mins`) per `decisions.md` D-010 and stays inside the existing `MobileBottomDock`. Wire all three this step: Send focuses or scrolls to the composer, Scan QR opens the modal, 50 Mins opens the auto-delete sheet and applies the chosen preset to the room.
- Camera: `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })`, `jsQR` on `requestAnimationFrame` with `willReadFrequently` canvas context. Stop every track and cancel the frame on close, unmount, or tab hide. Handle `NotAllowedError`, `NotFoundError`, and insecure context with the playful `No camera? No problem!` fallback, never a raw DOMException string.
- Scanned payload: accept a full `${origin}/join?room=CODE` URL or a bare 6-character code. Normalize with `normalizeRoomCode` and validate with `isValidRoomCode`; navigate to `/join?room=CODE`.
- Manual code: six visible Laroka boxes but a single accessible input (one field, `inputMode="text"`, `autoCapitalize="characters"`, uppercase transform, `maxLength` 6, paste support). A wrong code shows `Hmm, check that code` and keeps the typed value.
- Modal: portal or fixed overlay, focus trap, Escape to close, `aria-modal`, labelled heading, close button with lucide `X`, body scroll lock, no layout shift on iOS safe areas.
- `/how-it-works`: 3 step cards (`1. Scan the code`, `2. Send photos or notes`, `3. Cleans up by itself`) linked by a self-drawing squiggle connector, plus 3 friendly alert cards drawn from the copy deck. Laroka headings, lime and cobalt card rhythm, lucide icons.
- Mobile hub: compact top status header (droplet logo plus live room pill), one big `Send Photos or Files` cobalt card, one paste bar, received items area, thumb-zone dock. No desktop top link bar below 768px. Safe-area padding, 44px targets, no horizontal overflow at 360px.
- Zero em dashes, zero emojis, zero jargon on screen, no `alert()`.

## Completion Notes

**Built and verified (2026-10-21, ASUS-LAPTOP-DNLA241D).**

### Files
- `web/src/pages/MobileJoin.tsx`: rewritten. Compact live status pill, cobalt `Send Photos or Files` card with the shared dropzone, paste bar, shared items feed, room footer, safe-area spacing. No room code renders a friendly start card; a malformed code renders the deck's `Hmm, check that code` card. Joins as a guest through `useGhostRoom`.
- `web/src/pages/HowItWorks.tsx`: rewritten. Three step cards with orb numerals, lucide icons (`QrCode`, `Send`, `Sparkles`), lime/cobalt/stone rhythm, self-drawing connector, three copy deck alerts (`All sent!`, `Poof! All gone.`, `Hmm, check that code`) and one reassurance strip. Three columns from 1024px, stacked below.
- `web/src/components/qr/QrScannerModal.tsx`: new. `getUserMedia({ video: { facingMode: 'environment' }, audio: false })`, `jsQR` on `requestAnimationFrame` with a `willReadFrequently` canvas, corner brackets, CSS scanline, torch toggle only when `getCapabilities().torch` is true, focus trap, Escape, backdrop close, body scroll lock with scrollbar compensation, and full track teardown on close, unmount and tab hide.
- `web/src/components/shell/ShellProvider.tsx`: new. Small shell context that lets global chrome publish presence, open the scanner, focus the composer and apply an auto-delete preset.
- `web/src/components/shell/AppShell.tsx`: mounts the provider and the scanner modal.
- `web/src/components/nav/MobileBottomDock.tsx`: rewritten. Three tabs wired to the shell, timer sheet driven by the locked copy deck presets.
- `web/src/components/nav/MobileStatusHeader.tsx`: now shows the live room pill (`#CODE`, `Connected to Computer`, `Linking up...`, `Not linked yet`).
- `web/src/components/nav/DesktopTopPillBar.tsx`: `Enter a Code` opens the scanner modal; the timer pill follows the selected preset.
- `web/src/pages/ConnectedWorkspace.tsx`: publishes presence so the compact header stays truthful.
- `web/src/components/room/TextComposer.tsx`: optional `inputRef` so the dock can focus the note field.
- `web/src/lib/constants.ts`: auto-delete labels and presets now reference `TtlPreset` (D-012), replacing the duplicated `TIMER_PRESETS`.
- `web/src/index.css`: scanline sweep keyframes with a `prefers-reduced-motion` park.
- `web/src/components/brand/OrbBadge.tsx`: numeral no longer inherits the full display font size (it overflowed the orb core on every screen using it).
- `web/src/components/room/DropZone.tsx`: helper text raised to `text-white/90` for contrast.

### Verification
- `npm run type-check`, `npm run lint`, `npm run build`: all pass. Vite still warns about a chunk above 500 kB (pre-existing, `jsqr` adds weight); build succeeds and the service worker precaches.
- Dev server at 360, 390 and 430 px: `documentElement.scrollWidth === clientWidth` on `/join?room=GHST48` and `/how-it-works`; no horizontal overflow; dock labels and the header pill do not clip; code boxes measure 56px at 430 and 59px at 360.
- Dock: timer sheet lists the four locked presets, `15 mins` moves the dock label to `15 Mins`, `When I close this page` renders `On Close` without clipping, and `Send` focuses `#join-note`. On a page with no composer, `Send` navigates to `/`.
- Scanner modal: `aria-modal` dialog, labelled heading, focus lands on the close button, Tab is trapped, Escape closes and restores body scroll. The 8 second watchdog renders `No camera? No problem!` with `Try camera again` when the permission prompt is never answered (this headless browser never resolves `getUserMedia`).
- Manual code: typing `GHOST8` uppercases, enables `Connect Now`, then shows `Hmm, check that code` and keeps the value (`aria-invalid="true"`); typing `ghst48` navigates to `/join?room=GHST48` and closes the modal.
- Lighthouse (desktop, dev server): `/how-it-works` accessibility 1.0 and best practices 1.0; `/join?room=GHST48` accessibility 1.0 after the dropzone contrast fix, best practices 1.0.
- Zero em dashes, zero emojis, no `alert()`, no `any`, no raw DOMException text. Verified by grep across `web/src`.

### Notes and blockers
1. **`/join?room=GHOST8` is not a valid room code.** `O` is excluded from `ROOM_CODE_ALPHABET` in the locked protocol (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), so the hub shows the playful `Hmm, check that code` card, which is correct behavior. The hub was verified with the protocol-valid `GHST48`. `DEMO_ROOM_CODE` in `web/src/lib/constants.ts` is still `'GHOST8'` and is now unused. Changing it touches brand/protocol copy, so it is flagged for the orchestrator, not changed here.
2. **Initial focus choice.** The checklist mentions auto-focus on the code field. The modal instead focuses the close button, because focusing a text field on a phone immediately opens the keyboard over the viewfinder. The single field is one tap away and auto-capitalises.
3. **Camera permission watchdog.** An 8 second timeout falls back to manual entry when a browser never answers the permission prompt. Without it the viewfinder would sit on `Waking up the camera...` forever.
4. **Out of contract, not repaired:** no `robots.txt`, so Lighthouse SEO stays at 0.8 on every route.

---

## QA Repair Round 1
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-21

Applied the three targeted fixes from `qa-report.md` plus the optional live region. Scope limited to `web/src/`.

1. **B-02 / F-01 / D-013: invalid demo code removed from the runtime.**
   - `web/src/lib/constants.ts:3-4`: `DEMO_ROOM_CODE` is now `'GHST48'` with a one line comment pointing at D-013. `O` is not in `ROOM_CODE_ALPHABET` (`web/src/types/protocol.ts:11`), so the old `'GHOST8'` literal could never be a valid runtime code. The constant stays because Demo and manual test paths may use it, and `GHST48` is a valid alphabet literal per `decisions.md:141`.
   - Grep confirms zero `GHOST8` occurrences remain in `web/src` and no code path defaults or prefills a room code with it.

2. **F-03: paste is normalised before it is clamped.**
   - `web/src/components/qr/QrScannerModal.tsx:547-549`: the handler runs `normalizeRoomCode(...)` first, then `.slice(0, ROOM_CODE_LENGTH)`, with a short comment naming the pasted `gh st 48` case.
   - `web/src/components/qr/QrScannerModal.tsx:553-557`: the `maxLength={ROOM_CODE_LENGTH}` attribute is gone; the input now only keeps `autoComplete`, `autoCorrect`, `autoCapitalize`, `spellCheck` and `inputMode`. The browser was trimming the raw pasted string to `GHST` before `onChange` ran. The state slice still enforces the 6 character limit, so typing cannot exceed 6 either.

3. **F-02: raw hex replaced with a token.**
   - `web/src/components/qr/QrScannerModal.tsx:395-396`: `radial-gradient(#FFFFFF 1px, transparent 1px)` is now `radial-gradient(var(--color-surface) 1px, transparent 1px)`. `--color-surface` is `#FFFFFF` in `web/src/styles/tokens.css:30`. No new raw brand hex, and no raw hex remains in this component.

4. **F-04 partial: camera fallback is announced.**
   - `web/src/components/qr/QrScannerModal.tsx:403-404`: the `No camera? No problem!` panel now carries `aria-live="assertive"` and `aria-atomic="true"`, so the failure and the 8 second watchdog are spoken. The `inert` suggestion for the page behind the dialog is left open, it is a larger change than this repair round.

### Verification
- `npm run type-check`: PASS, zero errors.
- `npm run lint`: PASS, zero errors, zero warnings.
- `npm run build`: PASS, `dist/assets/index-O0Sj_ljf.js` 571.80 kB (gzip 178.96 kB), CSS 41.05 kB, PWA `generateSW` precache 8 entries 599.83 KiB. The single chunk size notice is unchanged and pre-existing.
- No new dependency, no `any`, no em dash, no emoji, no `alert()`.

