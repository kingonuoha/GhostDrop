# Step 08: QA Brand Motion and Copy Polish Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-21

**Auditor:** `@ghostdrop-qa` (read-only)
**Scope:** `web/src/**`, `web/index.html`, `web/public/favicon.svg`, plus the built `web/dist` output.
**Out of scope by contract:** `web/src/lib/p2p/`, `web/src/types/protocol.ts`, `web/src/sw.ts`, `web/src/lib/shareHandoff.ts`, `web/vite.config.ts`. These were read for rendered-copy and motion evidence only, never graded for protocol correctness.
**Pre-reads:** `AGENTS.md`, `.agent/BRAND.md`, `docs/08-qa-checklist.md` (Gates 1, 2, 6), `docs/02-brand-persona-and-copy.md`, `docs/05-motion-spec.md`, `docs/design.md`, `decisions.md` D-005 to D-013, `docs/tasks/step-08-brand-motion-and-copy-polish/ui-polish-task.md` including Completion Notes.

**Verdict:** GATE PASS. 0 blockers, 0 medium, 7 low and 6 informational findings. No application file was modified by this audit.

---

## 1. Method and Evidence Base

Four independent evidence layers were used, because a static grep alone cannot prove motion, layout, or rendered copy:

1. **Raw byte and codepoint scan** over 61 files: 59 files under `web/src` plus `web/index.html` and `web/public/favicon.svg`. Every codepoint above U+007F is reported, so a single em dash, en dash, curly quote, zero-width space, or emoji cannot hide. An identical scan ran over `web/dist` after the build.
2. **Static string-literal and JSX text extraction** with the TypeScript compiler API (`ts.createSourceFile`), so comments and identifiers are separated from strings that can reach the DOM. 83 JSX text and accessibility-attribute rows were classified.
3. **Real rendered measurement in headless Chrome 156** through the DevTools Protocol: `Emulation.setDeviceMetricsOverride` at 360, 768, 1024, 1440 px on `/`, `/room/8STB5D`, `/join?room=8STB5D`, `/how-it-works`, served from the production `dist` on `http://localhost:4173`. `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce` was used for the reduced-motion pass. Measurements are computed values from the live DOM, not source inference.
4. **Command execution** of `npm run type-check`, `npm run lint`, `npm run build` in `web/`.

Honest limits:

- The desktop browser tool was not connected to this session (`browser.disconnected`), so Lighthouse was not re-run. Accessibility evidence is real DOM measurement (contrast computation, target sizes, focus rings, heading order) instead of a Lighthouse score.
- A real `wss://0.peerjs.com` peer was unavailable in this sandbox, so `/room/8STB5D` and `/join?room=8STB5D` render the playful `Hmm, check that code` card. That is the correct deck behaviour for an unreachable room, and it let the error copy be audited live.
- No live two-peer transfer ran, so the data-bound progress squiggle was verified by code and by its rendered attributes, not by bytes crossing a channel.

---

## 2. Checklist Mirror (assignment items 1 to 10)

1. [x] Zero em dashes, zero en dashes used as separators, zero emoji codepoints, zero curly separators, verified on raw bytes. 61 source files contain **0 codepoints above U+007F**. Built output contains 0 of U+2014, U+2013, U+2026, U+2018 to U+201D, U+1F000 to U+1FAFF, U+2600 to U+27BF.
2. [x] Zero jargon in rendered copy. 16 rendered route and width runs scanned for 19 terms (`WebRTC`, `RTCDataChannel`, `DataChannel`, `PeerJS`, `SCTP`, `P2P`, `TTL`, `PWA`, `chunk`, `ACK`, `payload`, `telemetry`, `crypto`, `E2EE`, `zero-knowledge`, `backpressure`, `revokeObjectURL`, `16KB`, `encrypt`): **0 hits, and 0 non-ASCII characters in rendered text**. All 413 raw literal hits live in identifiers, import paths, type keys, or comments.
3. [x] Copy deck fidelity. All 15 deck-defined feedback keys render the deck strings; one inline card body deviates (see S-01).
4. [x] Icons are `lucide-react` or inline SVG only. 29 files import lucide, 5 files render inline SVG (`Logo.tsx`, `SquiggleLine.tsx`, `QrScannerModal.tsx` viewfinder, `TransferCard.tsx` progress, `HowItWorks.tsx` connector). Zero icon fonts, zero glyph icons.
5. [x] Every squiggle path is `pathLength="1"` with `stroke-dasharray: 1` and dash-offset driven. 100 live squiggle path instances across the 16 runs, 0 missing `pathLength`, 0 with a transform on the path, the parent group, or the SVG root. Reduced motion renders offset 0 for draw, partial and progress variants and disables the pulse.
6. [x] `Laroka` on headings, room codes, orb numerals, toast headlines and countdown digits; body and mono roles correct.
7. [x] Card rhythm lime, cobalt, warm stone, surface; nested circle-icon pill buttons; 44 px targets; focus rings; one H1 per route.
8. [x] Responsive at 360, 768, 1024, 1440 on all four routes with zero horizontal overflow. 16 of 16 combinations measured `scrollWidth === clientWidth`.
9. [x] `npm run type-check`, `npm run lint`, `npm run build` all exit 0.
10. [x] Prior Step 02, 04, 05, 06, 07 polish items audited one by one (42 rows): 23 fixed, 1 partially fixed, 7 open low or info, 6 accepted by design, 5 consciously deferred. Full table in section 8.

---

## 3. Gate 1: Brand Tokens, Laroka, Navigation Split and Squiggle Fidelity

- [x] **Tokens.** `web/src/styles/tokens.css` matches `docs/tokens/tokens.css` on all 68 custom properties, value for value, zero diffs. The only byte difference is the `@font-face` source list, where the web copy drops the unresolvable `url('../laroka.otf')` second source (documented Step 02 P2-2 / Step 05 L-04 fix, recorded as S-09). Zero raw hex in any `.ts` or `.tsx` file. Hex appears only in `tokens.css`, `web/index.html:10` (`#CDF22B` theme color) and `web/public/favicon.svg:2-3` (`#F7F6F2`, `#1E45FB`), all mapped tokens. Zero arbitrary colour utilities such as `bg-[#...]`.
- [x] **Laroka loads and applies.** `document.fonts.check('700 32px Laroka')` is `true` and `document.fonts.status` is `loaded` on every route. Computed families: H1 `Laroka`, `.room-code` `Laroka`, `.type-h3` (toast and card headlines) `Laroka`, orb numeral core `Laroka`, `.type-numeral` probe `Laroka`. Body copy computes `Plus Jakarta Sans`, `.type-mono` computes `JetBrains Mono` (lazy loaded, so `document.fonts.check` for mono is false until a byte counter renders; not a defect).
- [x] **Navigation split at exactly 768 px.** Live visibility flags: at 360 px `nav[aria-label="Main"]` visible `false` and `nav[aria-label="Quick actions"]` visible `true`; at 768, 1024, 1440 the inverse. Desktop pill bar inner overflow `0 px` at 768, 1024 and 1440.
- [x] **Squiggle placement.** Hub lime card (`RoomCodeCard.tsx:74`), hub cobalt card (`HomeHub.tsx:107-112`), install card (`InstallCard.tsx:60-65`), bridge card (`ConnectionBridge.tsx:82-87`), send cards (`ConnectedWorkspace.tsx:109`, `MobileJoin.tsx:40,180`), feedback cards (`FeedbackCard.tsx:96-101`), feed cards (`TransferCard.tsx:190-195,232`), step cards (`HowItWorks.tsx:153-158`), and the P2P bridge itself (`SquiggleConnectionBridge.tsx:61-66`).
- [x] **Self-drawing only.** Live computed evidence over 16 runs: 100 squiggle paths, every one `pathLength="1"`, `stroke-dasharray` `1px`, `animation-name` `squiggle-draw` or `squiggle-draw-partial`, post-animation `stroke-dashoffset` `0px` (`0.5px` only for the idle half-drawn bridge, the intended waiting state). Zero `transform` on the path, its parent group, or the SVG root. No fly, slide, bounce or scale entrance exists on any squiggle.
- [x] **Nested circle-icon pills and off-centre orbs.** `NestedPillButton.tsx:8-30` implements cobalt shell with lime circle and lime shell with cobalt circle at 44/48/56 px. `OrbBadge.tsx:7-23,51-64` implements a cobalt shell with an off-centre lime core carrying a Laroka numeral or a lucide icon.
- [x] **Safe zones.** Every card squiggle sits inside an `overflow-hidden rounded-[32px]` ancestor at 0.05 to 0.22 opacity with a bottom-right placement, and card content is wrapped in `relative`, so no line crosses body text.

---

## 4. Gate 2: Playful Copy, Zero Em Dash and Zero Emoji

### 4.1 Character scans (raw bytes)

| Scan | Corpus | Result |
| :--- | :--- | :--- |
| Codepoints above U+007F | 61 files (59 in `src`, `index.html`, `public/favicon.svg`) | 0 |
| U+2014 em dash, U+2013 en dash, U+2015, U+2012, U+2212 | same 61 files | 0 |
| U+2018 to U+201F curly quotes, U+2026 ellipsis | same 61 files | 0 |
| U+00A0, U+200B, U+200C, U+200D, U+FEFF invisible separators | same 61 files | 0 |
| Emoji ranges U+1F000 to U+1FAFF, U+2600 to U+27BF, U+FE0F, U+2B00 to U+2BFF | same 61 files | 0 |
| Same combined sweep after `npm run build` | `dist/*.js`, `*.css`, `*.html`, `*.svg`, `*.webmanifest` | 0 |
| Rendered text, live DOM | 16 route and width runs | 0 non-ASCII characters |

Because an em dash and an emoji are both non-ASCII, a zero non-ASCII count is a complete negative proof for this corpus, and it also excludes curly quotes, en dashes, arrows and variation selectors. Dots in copy are three ASCII periods, never U+2026.

### 4.2 Rendered jargon scan

Live `document.body.innerText`, 4 routes at 4 widths, searched for 19 terms: **0 hits**. The densest surface, the hub, renders exactly:

```text
Auto-delete: 50 mins / Enter a Code / Send photos and text between your screens.
1. Scan with your phone / Open your phone camera and point it here: / Or type code:
2. Pick what to send / Waiting for your phone / Choose Photos or Files
Or drag files right here / Type or paste a link or note / Send / Cleans up after
Delete after 1st copy / 15 mins / 50 mins / When I close this page
```

Static classification of all 413 raw jargon occurrences across 26 files reaches the same conclusion: `TTL` appears only in `TTL_LABELS`, `TTL_PRESET_ORDER`, `TtlPreset`, `useTtlJanitor` and comments; `P2P` only in imports from `lib/p2p`; `payload` only in `publishProgress(payload)`, `takeSharePayload`, `extractRoomCode(payload)`; `ACK` only in `FILE_ACK` packet keys and one comment; `PWA` only in `SUCCESS_PWA_INSTALLED` and doc comments. No rendered string and no `aria-label` carries jargon.

### 4.3 Copy deck fidelity

Deck-defined keys, compared string for string against `web/src/lib/copyDeck.ts`:

| Key | Deck headline | Deck body | Deck action | Status |
| :--- | :--- | :--- | :--- | :--- |
| `SUCCESS_PEER_JOINED` | `Connected!` | `Your screens are linked. Pick a photo or note to send!` | `Got It` | exact |
| `SUCCESS_TEXT_SENT` | `Sent!` | `Your note just popped up on your other screen.` | `Done` | exact |
| `SUCCESS_TEXT_RECEIVED` | `New note arrived!` | `Tap copy below to use it.` | `Copy` | exact |
| `SUCCESS_COPIED` | `Copied!` | `Ready to paste wherever you need it.` | `Copied` | exact |
| `SUCCESS_FILE_SENT` | `All sent!` | `{fileName} is ready on your other screen.` | `Save` | exact, fallback `Your file` |
| `SUCCESS_DROP_AND_NUKE` | `Sent and cleaned up!` | `{fileName} is safe on your computer and removed here.` | `Done` | exact |
| `SUCCESS_PWA_INSTALLED` | `Added to your phone!` | `Next time, open GhostDrop right from your home screen.` | `Great!` | exact |
| `ERR_ROOM_NOT_FOUND` | `Hmm, check that code` | `We could not find #{roomCode}. Check the 6 letters and try again!` | `Try Again` | exact, verified live |
| `ERR_PEER_DISCONNECTED` | `Screen disconnected` | `Your other screen closed the page. Tap below to reconnect!` | `Reconnect` | exact |
| `ERR_CAMERA_DENIED` | `No camera? No problem!` | `Just type the 6-letter code shown on your other screen below.` | `Type Code` | exact |
| `ERR_CHUNK_INTERRUPTED` | `Almost there! Tap to retry` | `The connection blinked while sending. Tap below to finish!` | `Send Again` | exact in toast, deviates inline (S-01) |
| `ERR_COPY_BLOCKED` | `Almost there! Tap to retry` | `Your browser held on to the code. Tap copy once more!` | `Try Again` | exact |
| `WARN_TTL_EXPIRING_SOON` | `Disappearing in 1 minute` | `Save {itemName} now if you still want to keep it!` | `Save Now` | exact |
| `INFO_TTL_EXPIRED` | `Poof! All gone.` | `50 minutes passed, so we cleaned up {itemName} for you.` | `Okay` | exact, plus preset variants |
| `EMPTY_FEED_STATE` | `Nothing sent yet` | `Pick a photo, file, or note to send it across!` | `Choose File` | exact (`TransferFeed.tsx:57-59`) |

Deck section 2 strings, all exact: `Auto-delete: 50 mins` (`DesktopTopPillBar.tsx:74`), `Enter a Code` (`:80`), `Send photos and text between your screens.` (`HomeHub.tsx:92`), `1. Scan with your phone` and `Open your phone camera and point it here:` (`RoomCodeCard.tsx:79,82`), `Or type code:` (`:101`), `2. Pick what to send` (`HomeHub.tsx:118`), `Choose Photos or Files` (`DropZone.tsx:24`), `Or drag files right here` (`:25`), `Type or paste a link or note...` (`TextComposer.tsx:24`), `Send` (`:81`), and the four timer presets (`constants.ts:14-20`, matching D-012).

Non-deck copy that is rendered is plain, warm and jargon free: `Waiting for your phone`, `Anything you send lands on {peer}`, `Shared Items`, `Latest 3 only`, `Keep GhostDrop one tap away`, `Add to Home Screen`, `Direct pairing`, `Connect to your screen`, the three step pills, and `Simple for everyone`.

### 4.4 No raw technical errors

Zero `alert(`, `window.confirm`, `window.prompt` in `src`. Transport failures map to copy keys before render (`useGhostRoom.ts:140-155`), the reconnect path is a remount (`ConnectedWorkspace.tsx:167-177`), the camera catch discards the browser exception (`QrScannerModal.tsx:233-237`), and no `.message` or `String(error)` reaches JSX.

---

## 5. Gate 6: Responsive, Reduced Motion, Accessibility and Build Health

### 5.1 Responsive measurements (live DOM, production `dist`)

| Route | 360 px | 768 px | 1024 px | 1440 px |
| :--- | :--- | :--- | :--- | :--- |
| `/` | 345/345, overflow 0 | 753/753, overflow 0 | 1009/1009, overflow 0 | 1425/1425, overflow 0 |
| `/room/8STB5D` | 345/345, overflow 0 | 753/753, overflow 0 | 1009/1009, overflow 0 | 1425/1425, overflow 0 |
| `/join?room=8STB5D` | 345/345, overflow 0 | 753/753, overflow 0 | 1009/1009, overflow 0 | 1425/1425, overflow 0 |
| `/how-it-works` | 345/345, overflow 0 | 753/753, overflow 0 | 1009/1009, overflow 0 | 1425/1425, overflow 0 |

Pairs are `scrollWidth / clientWidth` on the document element. The 15 px delta between the requested width and `clientWidth` is the headless scrollbar. Elements whose bounding box extends past the viewport are decorative squiggle layers inside `overflow-hidden` cards; the document does not scroll horizontally, which is the measured pass condition.

Supporting measurements:

- Hub H1: 3 lines at 360 (32 px), 2 lines at 768 (38.88 px), **1 line at 1024 (894 px wide at 38 px)** and **1 line at 1440 (941 px wide at 40 px)**, all in Laroka. Step 05 M-01 is closed.
- Room code never clips: `scrollWidth === clientWidth` at 360 (106), 375 (117), 768 (140), 1024 (138), 1440 (184). Step 05 M-02 is closed.
- Desktop pill bar shows the compact `50 Mins` pill at 768 and the full `Auto-delete: 50 mins` label from 1024, with nav overflow 0 at every width. Step 02 P2-6 is closed.
- Interactive targets: **0 elements under 44 px** in either axis across all 16 runs, after excluding the intentionally `sr-only` skip link.

### 5.2 Reduced motion (emulated `prefers-reduced-motion: reduce`, 8 runs)

| Check | Measured |
| :--- | :--- |
| Squiggle `stroke-dashoffset` | `0px` on every squiggle, including the partial idle bridge and the data-bound progress path |
| Squiggle `animation-name` | `none`, `animation-duration` `0s` |
| Tip dot pulse | `animation: none`, `opacity: 0.9`, `transform: none` |
| Button and card transitions | `0.001s` |
| Documented classes in `index.css:296-343` | every squiggle class forced to offset 0, dissolve and poof entrance neutralised, scanline parked |

Non-reduced baseline for contrast: offsets `0px` drawn, `0.5px` idle bridge, `duration 1.15s`, tip pulse `squiggle-tip-pulse` with `transform: none`.

### 5.3 Accessibility measurements

- One H1 per route: `/` 1, `/room/8STB5D` 1 (screen-reader bridge title), `/join?room=8STB5D` 1, `/how-it-works` 1.
- Heading order never skips a level. `/`: H1, H2, H2, H2. `/room`: H1, H2, H2, H3 (plus a second H2 error card while the room is unreachable). `/join`: H1, H2, H3. `/how-it-works`: H1, H2 x4, H3 x3, H2.
- Focus ring, keyboard driven with real Tab key events: `2px solid rgb(82, 113, 255)` (`--color-cobalt-400`), `outline-offset: 2px`, `:focus-visible` true, on the skip link, brand link and both nav items, each 44 px tall.
- Contrast: 0 failures across 4 routes at 360 and 1440 (alpha-composited computed text colour against the nearest opaque ancestor background, 4.5:1 normal and 3:1 large text).
- Live regions: toast `role="status" aria-live="polite"`, bridge status `role="status" aria-live="polite"`, copy confirmation `aria-live="polite"`, scanner dialog `aria-live="assertive"` status line, form error `role="alert"`.

### 5.4 Commands

| Command | Result |
| :--- | :--- |
| `npm run type-check` | exit 0, `tsc --noEmit` on the app, node and sw projects |
| `npm run lint` | exit 0, no warnings |
| `npm run build` | exit 0, 2014 modules, `dist/assets/index-*.js` 579.73 kB (gzip 181.05 kB), `dist/assets/index-*.css` 41.37 kB, precache 11 entries 607.89 KiB |

Build advisories, unchanged from Step 07: the Vite chunk over 500 kB hint and the `vite-plugin-pwa` `inlineDynamicImports` deprecation. Both are non-blocking and recorded as S-10.

---

## 6. Card Rhythm, Icons, Buttons and Typography

| Surface | Card sequence | Result |
| :--- | :--- | :--- |
| `/` | lime pairing card, cobalt send card, warm stone install card | no repeated white row |
| `/room/:code` | warm stone bridge, cobalt send card, feed rows alternating surface and warm stone, lime file cards | no repeated white row |
| `/join` | cobalt send card, feed rows alternating surface and stone | no repeated white row |
| `/how-it-works` | lime step 1, cobalt step 2, warm stone step 3, surface question card | three distinct skins |

- Icons: 29 `lucide-react` imports at `strokeWidth={2}`, decorative icons `aria-hidden="true"`, icon-only controls carrying an `aria-label` (`Copy the room code`, `Code copied`, `Close the scanner`, `Close timer options`, `Hide install hint`, `Turn the light on`, `Turn the light off`, `Choose photos or files to send`). No icon font is referenced in `src`, `index.html`, or the built CSS.
- Typography roles: display and headings Laroka, body and controls Plus Jakarta Sans, byte counters and IDs JetBrains Mono (`formatFileSize` chip at `TransferCard.tsx:246`). Numerals inside plain sentences are lifted to Laroka by `Numerals.tsx:12-26` through `.type-numeral`, and the orb core uses the display family directly (`OrbBadge.tsx:61`).

---

## 7. Findings by Severity

### Blockers

None.

### Medium

None.

### Low

**S-01 Inline transfer-failure copy is not the deck body.**
`web/src/components/room/TransferCard.tsx:171-172` renders `item.fileName ?? copy.title` as the heading and the hardcoded body `Did not make it across. Pick it again.`, while `docs/02-brand-persona-and-copy.md:65` defines `ERR_CHUNK_INTERRUPTED` as `Almost there! Tap to retry` plus `The connection blinked while sending. Tap below to finish!`. The full deck pair is rendered correctly by the toast path (`copyDeck.ts:188-195`, `FeedbackNotice.tsx:21-38`). Impact: a compact row tells the same truth in different words, so the deck is not the single source for this one surface. Fix: pass `copy.body` and keep the file name in the meta line.

**S-02 Five rendered helper and body strings exceed the 10-word helper budget.**
`docs/02-brand-persona-and-copy.md:16` and `docs/design.md:209` cap helper copy at one short line under 10 words, and the task checklist claims this is verified. Measured word counts: `MobileJoin.tsx:51` 14 words, `QrScannerModal.tsx:385` 18, `ConnectionBridge.tsx:141` 14, `HowItWorks.tsx:231` 12, `TransferFeed.tsx:89` 11. All five are plain and jargon free, so this is voice discipline, not comprehension risk. Tighten or accept explicitly.

**S-03 Dead style artifacts remain.**
`.ttl-dissolve` and `@keyframes ttl-dissolve` (`web/src/index.css:240-254`, plus the reduced-motion override at `:327-331`) are declared but applied to no element: no `.tsx` file references `ttl-`. This is the carried Step 04 P2-7 item, and task contract item 6 asked for dead styles discovered during this audit to be removed. Removal is safe; the dissolve is not wired to the feed.

**S-04 Reduced motion drops the idle tip dot's centring transform.**
`web/src/index.css:320-324` sets `transform: none` on `.squiggle-tip-pulse`, which also cancels the Tailwind centring classes `-translate-x-1/2 -translate-y-1/2` on `SquiggleConnectionBridge.tsx:68`. Measured under emulated reduced motion: `transform: none`, `opacity: 0.9`, so the 12 px dot sits 6 px down and right of the bridge midpoint instead of on it. Motion is correctly disabled; only placement drifts. Fix: centre with offsets or keep `transform: translate(-50%, -50%)` in the reduced-motion rule.

**S-05 Mobile timer sheet keeps dialog role without `aria-controls`.**
`web/src/components/nav/MobileBottomDock.tsx:85-89` uses `role="dialog"` on the timer panel while the trigger at `:147` exposes `aria-expanded` and no `aria-controls`. Focus move on open (`:31-37`), Escape on the dock wrapper (`:76-81`) and focus return on close (`:39-42`) are now correct, so this is the remaining half of Step 06 F-05.

**S-06 No dock tab is active on `/how-it-works`.**
`web/src/components/nav/MobileBottomDock.tsx:50-56` treats only `/`, `/join` and `/room` as the Send page, so the 360 px dock renders with no highlighted tab on the How It Works route. Cosmetic state gap, carried Step 06 F-06, neither fixed nor recorded as deferred in the Step 08 notes.

**S-07 Lockfile drift and extraneous packages persist.**
`web/package-lock.json:2` still declares `"name": "web"` against `web/package.json:2` `"ghostdrop-web"`, and the lock still references `oxlint` (63 mentions) after ESLint replaced it; `npm ls --depth=0` reports `oxlint@1.89.0` and `@oxlint/binding-win32-x64-msvc@1.89.0` as extraneous. Metadata hygiene only, carried Step 02 P2-1.

### Info

**S-08 Title word counts.** `How it works in 3 easy steps.` is 6 words against the 3 to 5 word title guideline (`docs/02:16`). The hub H1 is 7 words and is already recorded as deck-locked residual 1 in the Completion Notes.

**S-09 `web` tokens intentionally diverge from `docs` on one property.** `docs/tokens/tokens.css:4-5` still carries the unresolvable `url('../laroka.otf')` second source that `web/src/styles/tokens.css:4-9` removed. The web copy is the correct one and the build warning is gone; align the docs copy upstream so the next recopy does not reintroduce it.

**S-10 Bundle advisory and plugin deprecation.** 579.73 kB main chunk against the 500 kB Vite hint, plus the `vite-plugin-pwa` `inlineDynamicImports` deprecation. Both carried from Step 06 F-08 and Step 07 F-05; a dynamic import of `QrScannerModal` plus an option rename would clear them, and neither is a Gate 6 failure.

**S-11 Scanner watchdog is still not cleared on the success path.** `web/src/components/qr/QrScannerModal.tsx:116-121`: `stop()` clears the 8 second watchdog, but the success path never calls `stop()`, so the timer fires once and no-ops on the `started` flag. Harmless, carried Step 06 F-07, camera lifecycle out of this step's contract.

**S-12 Room code span keeps an ellipsis fallback.** `web/src/components/room/RoomCodeCard.tsx:104` applies `overflow-hidden text-ellipsis` to the code span, which `docs/design.md:212` forbids in principle. Measured widths show no clipping at 360, 375, 768, 1024 or 1440, so nothing is truncated today; the fallback is latent only.

**S-13 Stale note in the Step 08 Completion Notes.** Residual 8 says the camera-denied line still drifts between `docs/08-qa-checklist.md` and the deck (Step 07 F-04). Both `docs/08-qa-checklist.md:35` and `docs/design.md:183` now quote `No camera? No problem!`, so that documentation item is closed. The separate `24h` wording in `docs/08-qa-checklist.md:29` remains open and stays governed by D-012, which is a docs action, not a code defect.

---

## 8. Prior Step Polish Items (assignment item 10)

| Item | Evidence at Step 08 | Status |
| :--- | :--- | :--- |
| Step 02 P2-1 lockfile drift | `package-lock.json:2`, 63 `oxlint` refs, `npm ls` extraneous | OPEN, S-07 |
| Step 02 P2-2 font src build warning | single resolvable source, build log clean | FIXED in web, S-09 for docs |
| Step 02 P2-3 static squiggle backdrop | `ConnectionBridge.tsx:82-87` now self-draws, 11 animating squiggles on `/how-it-works` | FIXED |
| Step 02 P2-4 reduced-motion partial offset | measured `0px` on the idle bridge | FIXED |
| Step 02 P2-5 tip dot scale pulse | opacity-only keyframes (`index.css:221-237`), `transform: none` | FIXED, residual placement S-04 |
| Step 02 P2-6 TTL gap 768 to 1023 | compact `50 Mins` pill visible at 768, nav overflow 0 | FIXED |
| Step 02 P2-7 NotFound heading skip | `NotFound.tsx:14` passes `headingLevel="h2"` | FIXED |
| Step 02 P2-8 room code utility | `.room-code` used on hub card, bridge and phone footer | FIXED |
| Step 04 P2-7 unused `.ttl-dissolve` | no consumer in `src` | OPEN, S-03 |
| Step 04 P2-9 checklist `24h` wording | `docs/08-qa-checklist.md:29` unchanged, D-012 governs | OPEN, docs only |
| Step 04 P3-1, P3-2, P3-3 | backend behaviour, no UI surface change this step | ACCEPTED, out of scope |
| Step 05 M-01 hub H1 one line | measured 1 line at 1024 and 1440 | FIXED |
| Step 05 M-02 room code clipping at 360 | measured no clipping at 360 to 1440 | FIXED, latent fallback S-12 |
| Step 05 M-03 copy feedback bypasses deck | `RoomCodeCard.tsx:63,99` raises `SUCCESS_COPIED` and `ERR_COPY_BLOCKED` | FIXED |
| Step 05 L-01 numerals in body font | `Numerals.tsx`, `.type-numeral`, measured Laroka | FIXED |
| Step 05 L-02 extra timer block in hub card | still present, keeps the picker reachable on the hub | ACCEPTED, layout deviation only |
| Step 05 L-03 lime icon on lime card | copied state is `bg-brand-ink text-brand-lime` (`RoomCodeCard.tsx:117-119`) | FIXED |
| Step 05 L-04 second Laroka source warning | warning absent from build log | FIXED |
| Step 05 L-05 dock timer local only | `ShellProvider` publish and register round trip, `MobileJoin.tsx:141-145` | FIXED |
| Step 05 L-06 reduced motion transform transitions | measured `transition-duration 0.001s`, every squiggle offset 0 | FIXED |
| Step 05 L-07 `aria-label` on plain span | replaced by spaced visual code plus `sr-only` text (`RoomCodeCard.tsx:106-107`) | FIXED |
| Step 05 L-08 silent early drop | unchanged, recorded as Completion Note residual 6, needs an orchestrator copy decision | DEFERRED |
| Step 06 F-01 `GHOST8` demo code | `DEMO_ROOM_CODE = 'GHST48'`, D-013 respected | FIXED |
| Step 06 F-02 raw hex in scanner | zero raw hex anywhere in `.tsx` | FIXED |
| Step 06 F-03 paste truncation by `maxLength` | no `maxLength` in the modal | FIXED |
| Step 06 F-04 camera panel not announced, page not inert | `aria-live="assertive"` status at `:390`, `inert` siblings at `:267-268,316` | FIXED |
| Step 06 F-05 dock timer dialog semantics | focus move, Escape and focus return fixed; `aria-controls` missing | PARTIAL, S-05 |
| Step 06 F-06 no active dock tab on secondary routes | unchanged | OPEN, S-06 |
| Step 06 F-07 watchdog not cleared on success | unchanged | OPEN info, S-11 |
| Step 06 F-08 `jsqr` in eager chunk | single 579.73 kB chunk | OPEN info, S-10 |
| Step 06 F-09 composer placeholder | shared default `Type or paste a link or note...` | FIXED |
| Step 06 F-10 extra non-deck copy | still present, tone compliant | ACCEPTED |
| Step 06 F-11 decorative `li` connectors | still present, valid markup with `aria-hidden` | ACCEPTED |
| Step 06 F-12 dock safe-area geometry | still present, intentional | ACCEPTED |
| Step 06 F-13 and Step 07 F-04 camera copy drift in docs | `docs/08:35` and `docs/design.md:183` now match the deck | FIXED, note S-13 |
| Step 06 F-14 initial focus on close button | still present, documented deviation | ACCEPTED |
| Step 07 F-01 share-handoff background sweep | untouched, out of contract | DEFERRED |
| Step 07 F-02 second share overwrites unclaimed first | backend, unchanged | DEFERRED, out of scope |
| Step 07 F-03 cap applied after buffering when `content-length` is absent | backend, unchanged | DEFERRED, out of scope |
| Step 07 F-05 bundle advisory | unchanged, S-10 | OPEN info |
| Step 07 F-06 intermediate `dist/sw.mjs` | `dist` now holds only `sw.js` | FIXED |
| Step 07 F-07 share notice can reappear on remount | unchanged | DEFERRED, out of scope |

---

## 9. Gate Verdicts

| Gate | Verdict | Basis |
| :--- | :--- | :--- |
| Gate 1 Brand tokens, Laroka, navigation split, squiggle fidelity | PASS | token diff 0, Laroka loaded and applied, 768 split measured, 100 of 100 squiggle paths `pathLength="1"` with draw-only animation, nested pills and orbs present |
| Gate 2 Playful copy, zero em dash, zero emoji | PASS | 0 non-ASCII codepoints in 61 files and in `dist`, 0 jargon and 0 non-ASCII in 16 rendered runs, 15 of 15 deck keys exact, no `alert`, no raw error text |
| Gate 6 Responsive, reduced motion, build health | PASS | overflow 0 at 16 of 16 route and width combinations, reduced-motion offsets all `0px` with animation `none`, 0 sub-44 px targets, focus rings measured, one H1 per route, three commands exit 0 |

**GATE PASS**

---

## 10. Verdict and Blockers

**Step 08: GATE PASS. Zero blockers.**

The brand, motion and copy polish step holds every locked rule it was asked to prove: no em dash, no emoji, no jargon on screen, Laroka on every display role, self-drawing squiggles only with a true reduced-motion fallback, a clean desktop and mobile navigation split, a lime, cobalt, stone and surface card rhythm, 44 px targets, visible focus rings, and green type-check, lint and build.

**Blockers: none.** Recommended low-cost follow-ups, in order: S-03 (delete the unused dissolve CSS), S-01 (use the deck body in the inline error row), S-04 (restore the dot centring), S-02 (tighten the five long helper lines), then S-05 and S-06 for the dock, and S-07 when the lockfile is next regenerated.
