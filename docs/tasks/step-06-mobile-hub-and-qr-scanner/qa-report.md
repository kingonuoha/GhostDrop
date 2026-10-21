# Step 06: QA Mobile Hub and QR Scanner Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References (all read before audit)
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`
- `docs/08-qa-checklist.md` (Gates 1, 2, 5, 6 measured; Gates 3 and 4 out of scope this step)
- `docs/01-wireframe-and-pages.md` (Screens 3, 4, 5 and section 1 navigation split)
- `docs/02-brand-persona-and-copy.md` (headlines, success deck, error deck)
- `docs/tasks/step-06-mobile-hub-and-qr-scanner/web-task.md` plus Completion Notes
- `decisions.md` D-010 (Stage exports are layout only, dock is 3 tabs) and D-012 (four plain-English auto-delete labels)

## Objective
Read-only audit of the Step 06 mobile hub, QR scanner modal, 3-tab mobile dock, mobile status header, desktop top bar and the How It Works page, against Gates 1, 2, 5 and 6, plus the Step 06 Implementation Contract.

## Method and honest limits
- Static audit of every file named in the task plus the supporting hooks and tokens: `MobileJoin.tsx`, `HowItWorks.tsx`, `qr/QrScannerModal.tsx`, `nav/MobileBottomDock.tsx`, `nav/MobileStatusHeader.tsx`, `nav/DesktopTopPillBar.tsx`, `shell/ShellProvider.tsx`, `shell/AppShell.tsx`, `lib/constants.ts`, `lib/copyDeck.ts`, `lib/p2p/roomCode.ts`, `types/protocol.ts`, `styles/tokens.css`, `index.css`, `vite.config.ts`.
- All three build commands were executed in `web/` this session.
- No desktop browser was attached to this QA session, so pixel measurements at 360, 390, 430, 768, 1024 and 1440 px were NOT re-measured here. Responsive verdicts below rest on static class analysis plus the measurement evidence recorded in `web-task.md` Completion Notes (2026-10-21, ASUS-LAPTOP-DNLA241D). That gap is stated per item rather than claimed as re-verified.

## Command Results
| Command | Result | Evidence |
| :--- | :--- | :--- |
| `npm run type-check` | PASS, zero errors | `tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json`, clean output |
| `npm run lint` | PASS, zero errors, zero warnings | `eslint .`, clean output |
| `npm run build` | PASS | `tsc -b && vite build`, 2008 modules, `dist/assets/index-BqniB4hD.js` 571.75 kB (gzip 178.95 kB), CSS 41.05 kB, PWA `generateSW`, precache 8 entries 599.78 KiB, `dist/sw.js` and `dist/workbox-9c191d2f.js` generated |

Build note: the single "chunks larger than 500 kB" notice is a warning, not an error. `jsqr` is bundled eagerly (see F-08).

## Gate 1: Brand Tokens, Laroka Font, Navigation Split and Squiggle Fidelity
- [x] Palette resolves through `web/src/styles/tokens.css` only for every brand surface in the audited files (`bg-brand-lime`, `bg-brand-cobalt`, `bg-brand-stone`, `bg-brand-surface`, `text-brand-forest`, `bg-brand-ink`, `border-brand-line`). No palette hex is duplicated in the audited components except F-02.
- [ ] Zero unmapped raw hex outside `tokens.css`. One violation: `QrScannerModal.tsx:395` uses `radial-gradient(#FFFFFF 1px, transparent 1px)`. `#FFFFFF` is already `--color-surface` (`tokens.css:30`). Cosmetic dot pattern, zero visual risk, item recorded as unchecked for accuracy.
- [x] `Laroka` loads (`tokens.css:2-9`, preload in `web/index.html:12`, `public/fonts/laroka.otf` present) and applies to headings via the `h1..h6` base rule plus the `type-h1`/`type-h2`/`type-h3`/`type-display` utilities. Applied on `MobileJoin.tsx:186`, `HowItWorks.tsx:128,172,199,227`, `QrScannerModal.tsx:359`, `FeedbackCard.tsx:106`.
- [x] `Laroka` on room codes and numerals: `MobileJoin.tsx:240` sets `[font-family:var(--font-display)]` on `#{code}`, `OrbBadge.tsx:61` sets it on the numeral.
- [x] Responsive navigation split below and above `768px`. Desktop bar is `hidden ... md:block` (`DesktopTopPillBar.tsx:24`); mobile status header is `md:hidden` (`MobileStatusHeader.tsx:30`); mobile dock is `md:hidden` (`MobileBottomDock.tsx:58`). `AppShell.tsx:24-39` mounts all three once, so no duplicate chrome.
- [x] Mobile dock sits in the thumb zone with safe area: `fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50` (`MobileBottomDock.tsx:58`), ink pill surface, lime active tab with ink text, matching `docs/01-wireframe-and-pages.md` section 1 intent. Geometry uses `inset-x-4` and `calc(1rem + safe-area)` instead of the doc sketch `inset-x-5`/`bottom-5`, which is the safe-area hardening the contract asked for (F-12).
- [x] Dock is exactly 3 tabs `Send`, `Scan QR`, `50 Mins` per D-010 item 5: `MobileBottomDock.tsx:28-32`, label from `TTL_SHORT_LABELS` (`constants.ts:22-27`, `'50m': '50 Mins'`), default preset `DEFAULT_TTL_PRESET = '50m'` (`constants.ts:5`, `ShellProvider.tsx:51`).
- [x] All three tabs functional: `Send` calls `focusComposer()` and falls back to `navigate('/')` (`MobileBottomDock.tsx:42-48`), composer registered at `MobileJoin.tsx:147-156`; `Scan QR` calls `openScanner()` (`MobileBottomDock.tsx:49-53`, modal mounted at `AppShell.tsx:39`); `50 Mins` opens the timer sheet and applies the preset through `selectTtlPreset` (`MobileBottomDock.tsx:54,90-93`, `ShellProvider.tsx:65-68`) with the room registering the handler at `MobileJoin.tsx:144`.
- [x] Signature squiggle present on cards and hero surfaces: `MobileJoin.tsx:40,179` (`double-loop`, lime on cobalt), `HowItWorks.tsx:153-158` per step (tone `cobalt`, `lime`, `forest`), `FeedbackCard.tsx:88-93,109-113`.
- [x] Self-drawing only. Connector uses `pathLength="1"` with class `squiggle-path-draw` (`HowItWorks.tsx:111-112`), and `tokens.css:102-115` defines `stroke-dasharray: 1`, `stroke-dashoffset: 1`, `animation: squiggle-draw ... forwards` ending at `stroke-dashoffset: 0`. No fly-in, slide-in, bounce-in or translate keyframe exists on any squiggle. The connector's static `rotate-90 lg:rotate-0` (`HowItWorks.tsx:103`) is a layout transform, not an entrance animation.
- [x] Nested circle-icon pills and off-center orbs match `docs/Brand colours.jpg`: `NestedPillButton.tsx:8-30` (cobalt shell with lime circle, lime shell with cobalt circle, 44/48/56 px min heights) and `OrbBadge.tsx:7-23,46-64` (cobalt shell, off-center lime core).

## Gate 2: Playful Copy, Zero Em-Dash, Zero Emoji
- [x] Zero em dashes and zero en dashes anywhere in `web/src`: sweep for `U+2014` and `U+2013` returned no matches.
- [x] Zero emoji anywhere in `web/src`: sweep across the emoji ranges (`U+1F300-U+1FAFF`, `U+2600-U+27BF`, `U+FE0F`) returned no matches. Every icon is `lucide-react` or inline SVG (`QrCode`, `Send`, `Sparkles`, `CameraOff`, `ScanLine`, `Flashlight`, `ShieldCheck`, `X`, `ArrowRight`, `Ghost`, `Unplug`, `ImagePlus`, `Clock`, `Check`, `CheckCircle2`).
- [x] Zero `alert()` / `confirm()` / `prompt()` in `web/src` (sweep for `alert(` returned no matches) and no raw exception text reaches the DOM: `.message`, `String(error)`, `error.toString` return no matches in `*.tsx`, the camera catch discards the error (`QrScannerModal.tsx:233-237`), and `connectionError` is typed as a copy key, not a string (`useGhostRoom.ts:86,140`).
- [x] Success, error, empty and warning copy comes from the deck: `MobileJoin.tsx:71,168` via `buildFeedback` (`ERR_ROOM_NOT_FOUND` is `Hmm, check that code`, `copyDeck.ts:144-152`); camera fallback `ERR_CAMERA_DENIED` is `No camera? No problem!` plus `Just type the 6-letter code shown on your other screen below.` (`copyDeck.ts:161-168`, rendered `QrScannerModal.tsx:405-408`); alert cards `SUCCESS_FILE_SENT`, `INFO_TTL_EXPIRED`, `ERR_ROOM_NOT_FOUND` (`HowItWorks.tsx:83-87`).
- [x] No developer jargon on screen in the audited surface: `WebRTC`, `P2P`, `PeerJS`, `16KB`, `Backpressure`, `FILE_ACK`, `URL.revokeObjectURL`, `TTL`, `PWA`, `DOMException` appear only in comments and identifiers (`QrScannerModal.tsx:234`, `TtlPicker.tsx:14`, `PoofNotice.tsx:16-17`), never in rendered text.
- [x] Grandma-simple screen copy: `Send Photos or Files` (`MobileJoin.tsx:187`), `Tap below and it lands on your other screen.` (`MobileJoin.tsx:192`), `Connect to your screen` (`MobileJoin.tsx:48`, `QrScannerModal.tsx:360`), `Scan the code`, `Send photos or notes`, `Cleans up by itself` (`HowItWorks.tsx:47,59,71`), `No accounts, no passwords, and nothing saved anywhere.` (`HowItWorks.tsx:130`).

Tone notes, not gate failures: `Direct pairing` (`QrScannerModal.tsx:358`), `Instant camera connection`, `Direct screen to screen`, `50 minute automatic wipe` (`HowItWorks.tsx:50,62,74`) and the composer placeholder `Paste or type a note...` (`MobileJoin.tsx:209`, deck says `Type or paste a link or note...`) are tone-correct but not deck-sourced (F-09, F-10).

## Gate 5: PWA, Web Share Target and QR Scanner
- [ ] `manifest.webmanifest` includes `share_target` (`POST /share-target`) and 192/512 icons. FAIL and PRE-EXISTING: the generated manifest ships only `{"src":"/favicon.svg","sizes":"any","type":"image/svg+xml","purpose":"any"}` and no `share_target` (`web/vite.config.ts:42-58`, `web/dist/manifest.webmanifest`). Owned by Step 07 (`docs/tasks/step-07-pwa-and-share-target/`), which has task files but no Completion Notes, so this is not a Step 06 regression.
- [x] Scanner opens the environment camera cleanly: `getUserMedia({ video: { facingMode: 'environment' }, audio: false })` at `QrScannerModal.tsx:191-194`.
- [x] `jsQR` decode loop on `requestAnimationFrame` with `willReadFrequently`: canvas created once per effect (`QrScannerModal.tsx:111`), context at `156`, decode at `160`, single-accept guard at `82`, and `extractRoomCode` accepts both `${origin}/join?room=CODE` and a bare 6-character code (`31-48`).
- [x] Playful `No camera? No problem!` fallback for permission denied, no camera, busy camera, insecure context and unanswered prompt: insecure and unsupported guard `181-188`, every `getUserMedia` rejection lands in the same catch at `233-237`, plus the 8 second permission watchdog at `116-118`. Zero raw `DOMException` string rendered.
- [x] Full teardown on close, unmount and tab hide: `stop()` cancels the frame handle, stops every track and clears `video.srcObject` (`120-133`); called from effect cleanup on unmount or visibility change (`242-245`), on tab hide through the `visibilitychange` listener (`97-104,246`), on accepted code (`163-167`) and on failure (`135-142`). Late-resolving streams also stop their tracks (`196-199`). Returning to the tab restarts the camera (`106-107`).
- [x] Modal accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby` (`347-355`), labelled heading (`359-361`), focus trap with wrap and outside recovery (`263-298`), Escape closes (`272-276`), body scroll lock with scrollbar compensation and focus restore (`253-307`), backdrop click close (`324-326,344`), initial focus on the close button (`268-269`), 44 px close target (`367`), safe-area bottom padding (`354`).

## Gate 6: Responsive Viewports, Reduced Motion and Build Health
- [ ] Layouts verified at `360px`, `768px`, `1024px` and `1440px` with zero horizontal overflow. NOT RE-MEASURED IN THIS SESSION (no browser attached). Static analysis found no overflow source: dock uses `inset-x-4` with `flex-1` and `truncate` tabs (`MobileBottomDock.tsx:58,128-133`), `main` reserves `pb-44` for the dock and `md:pb-16` (`AppShell.tsx:32`), the modal is `w-full max-w-[440px]` inside a `p-3` overlay with `overflow-y-auto` and `max-h-[calc(100dvh-1.5rem)]` (`QrScannerModal.tsx:343,354`), step cards use `break-words` (`HowItWorks.tsx:172`) and the 3-column connector grid only activates at `lg` (`HowItWorks.tsx:134`). Completion Notes record `scrollWidth === clientWidth` at 360, 390 and 430 px on `/join?room=GHST48` and `/how-it-works`. Item left unchecked because this audit did not reproduce the measurement; no defect is claimed either way.
- [x] `prefers-reduced-motion: reduce` renders the squiggle fully drawn immediately: `tokens.css:117-128` sets `animation: none` and `stroke-dashoffset: 0` for `.squiggle-path-draw`; `index.css:273-303` parks the partial draw, tip pulse, dissolve, poof entrance and scanner sweep line. No continuous squiggle movement survives reduced motion.
- [x] 44 px targets across the audited surface: dock tabs `min-h-[44px]` (`MobileBottomDock.tsx:128`), timer rows `min-h-[44px]` (`95`), timer close `h-11 w-11` (`76`), modal close `h-11 w-11` (`QrScannerModal.tsx:367`), retry `min-h-[44px]` (`412`), torch `h-11 w-11` (`476`), `Back to the hub` `min-h-[44px]` (`MobileJoin.tsx:87`), pill buttons at 44/48/56 px (`NestedPillButton.tsx:21-23`).
- [x] Visible focus states: global `:focus-visible` with a 2 px cobalt outline and 2 px offset (`index.css:83-86`), explicit `focus-within:ring-2` on the code field (`QrScannerModal.tsx:507`) and a per-slot next-character ring (`513,522`).
- [x] `tsc --noEmit`, ESLint and `npm run build` all pass with zero errors (see Command Results).

---

## Findings by Severity

### Medium
**F-01 The canonical demo room code `GHOST8` cannot exist under the locked alphabet.**
`ROOM_CODE_ALPHABET` is `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (`web/src/types/protocol.ts:11`), so `O` and `0` are excluded, yet `GHOST8` is the example code in `docs/00-prd-source-of-truth.md:34` (`Join?room=GHOST8`), `docs/design.md:28` (`live #GHOST8 connection pill`) and `docs/01-wireframe-and-pages.md:28,31,40` (`[G] [H] [O] [S] [T] [8]`).
Code impact is latent only: `DEMO_ROOM_CODE = 'GHOST8'` (`web/src/lib/constants.ts:3`) is a dead export with no importer in `web/src` (grep: one hit, the declaration). No shipped screen renders `GHOST8`; `HomeHub.tsx:87` passes the `'......'` placeholder and the real code comes from `generateRoomCode`.
Behaviour is correct, not defective: `/join?room=GHOST8` normalises to a 6-character string that fails `isValidRoomCode` (`roomCode.ts:55-62`) and renders the deck card `Hmm, check that code` with `We could not find #GHOST8. Check the 6 letters and try again!` (`MobileJoin.tsx:255,69-92`). Typing `GHOST8` in the modal enables `Connect Now`, keeps the value and shows the same headline (`QrScannerModal.tsx:328-336,558-572`).
Action: orchestrator decision needed because docs and protocol conflict. Either move the canonical example to the protocol-valid `GHST48` across `docs/` and delete the unused constant, or keep the docs example and label it illustrative. QA does not edit docs or code.

### Low
**F-02 Raw hex outside tokens.** `web/src/components/qr/QrScannerModal.tsx:395` `backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)'`. Use `--color-surface` (`tokens.css:30`) to satisfy the Gate 1 token rule.

**F-03 Pasting a formatted code truncates before normalisation.** `web/src/components/qr/QrScannerModal.tsx:551` sets `maxLength={ROOM_CODE_LENGTH}`, so the browser trims the raw value before `onChange` runs `normalizeRoomCode(...).slice(0, 6)` (`541-544`). Pasting `gh st 48` yields `GHST` instead of `GHST48`. Drop `maxLength` and rely on the normalise plus slice that already enforce the limit.

**F-04 Camera fallback panel is not announced.** `web/src/components/qr/QrScannerModal.tsx:400-417` swaps the viewfinder for the `No camera? No problem!` panel with no live region, so a screen reader user hears nothing when the camera fails or the 8 second watchdog fires; the sibling error line does use `role="alert"` (`560-563`). Related in the same modal: the page behind the dialog is not set `inert` (`342-346`), so virtual cursor users can still browse the shell.

**F-05 Dock timer popover has partial dialog semantics.** `web/src/components/nav/MobileBottomDock.tsx:60-68` uses `role="dialog"` without moving focus into the sheet, without returning focus to the tab on close, and with the Escape handler bound to the sheet element only, so Escape works only once focus is inside. The trigger also pairs `aria-expanded` (`126`) with no `aria-controls`. Either drop `role="dialog"` and keep a disclosure with `aria-controls`, or add the focus move and return.

**F-06 No active dock tab on secondary pages.** `web/src/components/nav/MobileBottomDock.tsx:34-40` treats `/`, `/join` and `/room` as the Send page, so on `/how-it-works` no tab is highlighted although the Send tab still works and navigates home (`42-48`). Cosmetic state gap, not a dead control.

**F-07 Camera watchdog timer is not cleared on the success path.** `web/src/components/qr/QrScannerModal.tsx:116-118` schedules the 8 second fail guard, cleared only inside `stop()` (`121`), which never runs when the stream succeeds, so the timer fires once and no-ops on the `started` flag (`231`). Harmless, one stray timer per scan.

### Info
**F-08 `jsqr` is in the eager main chunk.** `web/src/components/shell/AppShell.tsx:2` imports the modal statically, and the build emits one 571.75 kB JS chunk (warning above 500 kB). Dynamically importing `QrScannerModal` when `scannerOpen` flips would keep the scanner weight off first paint.

**F-09 Composer placeholder differs from the deck.** `web/src/pages/MobileJoin.tsx:209` uses `Paste or type a note...`; `docs/02-brand-persona-and-copy.md:34` locks `Type or paste a link or note...`.

**F-10 Extra copy not sourced from the deck.** `Direct pairing` (`QrScannerModal.tsx:358`) and the three step pills `Instant camera connection`, `Direct screen to screen`, `50 minute automatic wipe` (`HowItWorks.tsx:50,62,74`). Tone-compliant and jargon-free, just not deck-authored.

**F-11 Decorative list items inside the ordered list.** `web/src/pages/HowItWorks.tsx:142-145` renders each connector as `<li aria-hidden="true">` inside the `<ol>`, so the exposed list is the 3 steps and screen readers hear `Step 1:` to `Step 3:` from the `sr-only` spans at `173`. Valid, slightly unusual markup.

**F-12 Dock geometry deviates from the doc sketch on purpose.** `MobileBottomDock.tsx:58` uses `inset-x-4` and `bottom-[calc(1rem+env(safe-area-inset-bottom))]` where `docs/01-wireframe-and-pages.md:17` sketches `bottom-5 inset-x-5`. The implementation adds the safe-area handling the contract required; record as intentional, not drift.

**F-13 Checklist wording superseded by D-010.** Gate 5 quotes the fallback as `Camera shy?`; the locked copy deck (`copyDeck.ts:161-168`, `docs/02-brand-persona-and-copy.md:64`) says `No camera? No problem!`. The scanner implements the deck, which is correct. Recommend a docs-only alignment pass on the checklist wording.

**F-14 Initial focus lands on the close button, not the code field.** `QrScannerModal.tsx:268-269`. The step checklist asked for the code field, the Implementation Contract asked for a trap and no layout jump, and the Completion Notes justify it because a phone keyboard would cover the viewfinder. Accepted deviation, one tap away, documented.

---

## Deferred and out of scope
- Gate 3 (wire protocol, 16KB chunks, backpressure) and Gate 4 (TTL revoke, unload cleanup) are Step 03 and Step 04 gates, not re-audited here.
- Gate 5 `share_target` and the PWA icon set belong to Step 07 (`web/vite.config.ts:42-58`).
- Missing `robots.txt` and the Lighthouse SEO 0.8 score from the Completion Notes are pre-existing and unrelated to this step.

## Gate Verdicts
| Gate | Verdict |
| :--- | :--- |
| Gate 1 Brand tokens, Laroka, nav split, squiggle | GATE PASS with one non-blocking Low (F-02 raw hex); every other item verified |
| Gate 2 Zero em dash, zero emoji, playful copy | GATE PASS |
| Gate 5 PWA, share target, QR scanner | GATE FAIL on the manifest item (pre-existing, owned by Step 07); scanner item fully PASS |
| Gate 6 Responsive, reduced motion, build health | GATE PASS on reduced motion, targets, focus and all three commands; the 360/768/1024/1440 px re-measure is unchecked in this session (method limit, no defect claimed) |

## Verdict
**Step 06: PASS. Zero blocking defects in the mobile hub, the 3-tab dock, the QR scanner and How It Works.**

The dock is exactly 3 working tabs inside the thumb zone with safe area, the desktop bar is hidden below 768 px, the scanner opens the environment camera, decodes on `requestAnimationFrame` with `willReadFrequently`, and stops every track and frame on close, unmount and tab hide while mapping every camera failure to the playful fallback with no raw `DOMException`. The manual code path uppercases, caps at 6, keeps an invalid value and shows `Hmm, check that code` on an unreachable-room code. How It Works ships the 3 exact step cards, the 3 deck alert cards and a draw-only squiggle connector with no fly-in. `npm run type-check`, `npm run lint` and `npm run build` all pass.

Blockers for the phase, both inherited and outside Step 06:
1. **B-01 Gate 5 manifest:** `share_target` (`POST /share-target`) and the 192x192 / 512x512 icons are missing (`web/vite.config.ts:42-58`). Owned by Step 07, which has no Completion Notes yet.
2. **B-02 F-01 docs and protocol conflict:** the canonical example code `GHOST8` cannot exist under `ROOM_CODE_ALPHABET`, and the dead `DEMO_ROOM_CODE` constant should be fixed or removed. Needs an orchestrator decision, not a QA edit.
