# Step 05: QA Desktop Hub and Connected Workspace Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-21

**Auditor:** `@ghostdrop-qa` (read-only)
**Scope:** `web/src/pages/HomeHub.tsx`, `web/src/pages/ConnectedWorkspace.tsx`, `web/src/components/room/*`, `web/src/hooks/useClipboardPaste.ts`, `web/src/hooks/useFileDropTarget.ts`, plus the shared brand and nav surfaces they render.
**References:** `AGENTS.md`, `.agent/BRAND.md`, `docs/08-qa-checklist.md` (Gates 1, 2, 6), `docs/01-wireframe-and-pages.md` (Screens 1 and 2), `docs/02-brand-persona-and-copy.md`, `docs/05-motion-spec.md`, `decisions.md` D-009 and D-010, Step 05 `web-task.md` and Completion Notes.
**Stage references (layout only, D-010):** `docs/design/ghostdrop_ultra_clean_desktop_hub_grandma_edition/screen.png`, `docs/design/ghostdrop_connected_workspace_grandma_friendly/screen.png`.

## 0. Method Note: No Live Browser Pass

- A Vite dev server is listening on `localhost:5173` and answers `GET /` with `200`, `GET /room/TEST42` with `200`, and `GET /fonts/laroka.otf` with `200` (`68,228` bytes).
- The desktop browser tool is not connected to this session (`browser.disconnected`), and no Playwright, Puppeteer, or jsdom is installed in `web/`. A rendered screenshot pass was therefore **not possible**.
- Responsive verification below is a static CSS breakpoint audit **plus real font metrics**: `public/fonts/laroka.otf` was parsed (sfnt `head`/`hhea`/`hmtx`/`cmap`) to compute exact advance widths for the H1 and the 6-character room code at `360`, `375`, `390`, `414`, `640`, `768`, `1024`, `1440`. Any finding that depends on rendered layout is labelled **arithmetic, needs browser confirmation**.

---

## 1. Command Results

| Command | Result | Notes |
| :--- | :--- | :--- |
| `npm run type-check` | **PASS** | `tsc --noEmit -p tsconfig.app.json` and `-p tsconfig.node.json`, exit 0, no diagnostics. |
| `npm run lint` | **PASS** | `eslint .`, exit 0, zero warnings. |
| `npm run build` | **PASS with 1 warning** | `tsc -b && vite build`, `2005 modules transformed`, `dist/assets/index-w5h4Go4S.js 419.62 kB (gzip 126.29 kB)`, CSS `33.71 kB (gzip 7.35 kB)`, PWA `generateSW` precache `8 entries (444.05 KiB)`. Warning: `./laroka.otf referenced in ./laroka.otf didn't resolve at build time` (finding L-04). |

Content scans over `web/src` plus `web/index.html` (52 files, Node scan):

| Scan | Result |
| :--- | :--- |
| Em dash `U+2014` | **0 occurrences** |
| Unicode emoji ranges | **0 occurrences** |
| `window.alert(` / bare `alert(` | **0 occurrences** |
| Raw `#RRGGBB` in `src/**/*.ts` and `src/**/*.tsx` | **0 occurrences** (all colour via `var(--color-brand-*)`) |
| Raw `#RRGGBB` in `src/index.css` | **0 occurrences** (canonical values live only in `src/styles/tokens.css`) |

---

## 2. Checklist Mirror

### 2.1 Step 05 audit items

- [x] Hub structure: exactly two primary cards (`HomeHub.tsx:85-136`), no marketing strip, single H1.
- [ ] Hub H1 renders on one line at desktop widths. **FAIL with Laroka** (M-01): measured `1280px` of text at the `52px` clamp maximum against `1072px` of available width at `1440`. Wraps to two balanced lines at `1024` and `1440`.
- [x] QR encodes `${origin}/join?room=CODE` (`HomeHub.tsx:74-77` consumed at `RoomCodeCard.tsx:76-85`).
- [x] Room code is `whitespace-nowrap`, letter-spaced, `type-display` Laroka, single line by construction (`RoomCodeCard.tsx:9-11`, `:88-97`).
- [ ] Room code fully visible at `360` without clipping (M-02, arithmetic): the code span needs `119px` and is given `115px` at `360` because of the fixed `Or type code:` label, `pl-4 pr-2`, two `8px` gaps, and the `44px` copy button.
- [x] Copy action works via `navigator.clipboard.writeText` with icon swap and an `aria-live` confirmation (`RoomCodeCard.tsx:13-23`, `:46-53`, `:98-121`). Copy-deck toast not used (M-03).
- [x] Workspace connection bridge: `This Computer` <-> self-drawing squiggle <-> joined device label (`ConnectionBridge.tsx:115-120`, `SquiggleConnectionBridge.tsx:39-77`).
- [x] Latest-3 feed, newest first (`TransferFeed.tsx:8`, `:36-39`); `Save` and `Copy` actions (`TransferCard.tsx:186-194`, `:230-243`).
- [x] Plain-English countdown labels: `49 mins left`, `Deletes after first copy`, `Deletes when you close this page`, `Deleting now` (`lib/format.ts:25-34`).
- [x] Playful empty state: `Nothing sent yet` with `FolderPlus` icon and `Choose File` action (`TransferFeed.tsx:53-61`, copy deck `docs/02-brand-persona-and-copy.md:68`).
- [x] No raw transport text on screen: `copyDeck.ts` is the only copy source for feedback (`copyDeck.ts:1-9`); grep finds protocol words only in type imports and feedback keys, never in JSX text.
- [x] Ctrl+V / Cmd+V guard: skips `input`, `textarea`, `select`, `isContentEditable`, and `[contenteditable="true"]` ancestors (`useClipboardPaste.ts:20-27`, `:68`).
- [x] Paste handles text and image files, files win over their text twin, nameless pasted images are renamed, empty payloads ignored (`useClipboardPaste.ts:29-49`, `:73-84`).
- [x] Drag and drop plus file input: window level, `Files` type gate, drag depth counter, drop effect `copy`, resets on `dragend` (`useFileDropTarget.ts:17-81`); dashed cobalt overlay (`DropOverlay.tsx:11-25`).
- [x] Keyboard accessible upload: one full-width button opens the hidden picker, visible focus ring, `Choose Photos or Files` label, `aria-label` on the input (`DropZone.tsx:46-74`).
- [x] Progress surfaced: `transfer:progress` subscription feeds `progress[id]` (`useGhostRoom.ts:464`), rendered as `Sending... {percent}%` plus a data-bound squiggle with `role="progressbar"` and `aria-valuenow` (`TransferCard.tsx:29-66`, `:117-143`).

### 2.2 Gate 1: Brand tokens, Laroka, navigation split, squiggles

- [x] Only token colours are used. `web/src` has zero raw hex in TS/TSX; components use `bg-brand-*`/`text-brand-*` mapped to `var(--color-*)` (`index.css:12-39`). Canonical values only in `src/styles/tokens.css:13-47`.
- [x] Laroka loads and applies. `@font-face` from `/fonts/laroka.otf` (`tokens.css:2-9`), preloaded in `index.html:15`, served `200`; base `h1..h6` and `type-h1/h2/h3/display/room-code` all use `var(--font-display)` (`index.css:61-71`, `:96-135`).
- [x] Toast headers use Laroka through `FeedbackCard` `h3` `type-h3` (`FeedbackCard.tsx:106`), and room codes use `type-display` (`RoomCodeCard.tsx:94`, `ConnectionBridge.tsx:97`).
- [x] Responsive navigation split at exactly `768px`. Desktop pill bar is `hidden md:block` (`DesktopTopPillBar.tsx:22`); mobile status header and bottom dock are `md:hidden` (`MobileStatusHeader.tsx:5`, `MobileBottomDock.tsx:53`). No desktop link bar on mobile, no dock on desktop.
- [x] Signature squiggle present on both hub cards (`HomeHub.tsx:96-101`, `RoomCodeCard.tsx:63`), the workspace send card (`ConnectedWorkspace.tsx:96`), the connection bridge (`SquiggleConnectionBridge.tsx:61-66`), and every feedback card (`FeedbackCard.tsx:88-93`, `:109-113`).
- [x] Self-drawing only. Every squiggle is `pathLength="1"` with `stroke-dasharray: 1` and `stroke-dashoffset: 1 -> 0` (`SquiggleLine.tsx:65-74`, `tokens.css:102-115`, `index.css:156-171`). Zero fly-in, slide-in, bounce-in, or fade-up on a squiggle. The only other motion is the data-bound chunk progress squiggle (`TransferCard.tsx:54-62`), which `docs/05-motion-spec.md:48` explicitly allows.
- [x] Nested Circle-Icon Pill buttons match the `#CDF22B +` / `#1E45FB +` reference: cobalt shell with lime circle and lime shell with cobalt circle (`NestedPillButton.tsx:8-18`), plus the dropzone pill (`DropZone.tsx:66-71`).
- [ ] Countdown and percent numerals stay in the body font, not Laroka (L-01). `docs/design.md:91-95` lists numerals under Laroka.

### 2.3 Gate 2: Playful copy, zero em dash, zero emoji

- [x] Zero em dashes anywhere in `web/src` and `web/index.html` (Node scan, 0 hits; `grep -P "\x{2014}"` also clean).
- [x] Zero emojis; every expressive accent is a `lucide-react` icon marked `aria-hidden` (for example `TransferFeed.tsx:2`, `TransferCard.tsx:2-12`, `FeedbackNotice.tsx:1-14`).
- [x] Success, error, warning, and empty states match `docs/02-brand-persona-and-copy.md`: `Connected!`, `Sent!`, `All sent!`, `Copied!`, `New note arrived!`, `Poof! All gone.`, `Hmm, check that code`, `Screen disconnected`, `Nothing sent yet` (`copyDeck.ts:84-205`, `TransferFeed.tsx:53-61`).
- [x] Zero raw technical errors and zero `alert()`: transport failures map to copy-deck keys before render (`ConnectedWorkspace.tsx:73-89`, `useGhostRoom.ts:142-145`, `:365-367`, `:495-496`). Reconnect is a remount, so no exception text is ever shown (`ConnectedWorkspace.tsx:148-164`).
- [x] Grandma 2-Second Rule holds: one action per card, helper lines under 10 words, button copy straight from the deck.

### 2.4 Gate 6: Responsive, motion, build health

- [x] Build health: type-check, lint, and build all pass (section 1).
- [x] Static breakpoint audit finds no horizontal overflow driver at `360`, `768`, `1024`, `1440`: `main` is `max-w-[1120px] px-4 md:px-6` (`AppShell.tsx:25-31`), the hub grid is `md:grid-cols-12` with `5/7` spans (`HomeHub.tsx:85-94`), the workspace grid mirrors it (`ConnectedWorkspace.tsx:91-129`), the QR is capped at `212px` (`RoomCodeCard.tsx:75`), the bridge squiggle keeps `min-w-[88px]` (`SquiggleConnectionBridge.tsx:56-57`), the dock is `inset-x-5` with truncated labels (`MobileBottomDock.tsx:53`, `:128`), toasts are `inset-x-4` with `max-w-[380px]` (`RoomToast.tsx:18-19`), and the drag overlay card is `max-w-[22rem]` inside a padded fixed layer (`DropOverlay.tsx:13-16`).
- [x] `prefers-reduced-motion: reduce` renders squiggles at `stroke-dashoffset: 0` immediately and kills the tip pulse, the dissolve, and the poof entrance (`tokens.css:117-128`, `index.css:224-248`).
- [x] One H1 per page: `HomeHub.tsx:81`, plus a single screen-reader H1 in the workspace bridge (`ConnectionBridge.tsx:90-92`). Section titles are H2/H3.
- [x] Focus states: global `:focus-visible` cobalt outline (`index.css:83-86`) plus a white ring on the cobalt dropzone (`DropZone.tsx:60`).
- [x] Live regions: bridge status `role="status" aria-live="polite"` (`ConnectionBridge.tsx:102-105`), toast `role="status" aria-live="polite"` (`FeedbackNotice.tsx:62`, `PoofNotice.tsx:26`), copy confirmation `aria-live="polite"` (`RoomCodeCard.tsx:119-121`).
- [x] Minimum target size: copy `44px` (`RoomCodeCard.tsx:105`), send `44px` (`NestedPillButton.tsx:21`), dropzone `48px` (`DropZone.tsx:66`), composer input `44px` (`TextComposer.tsx:67`), timer presets `64px` and `48px` (`TtlPicker.tsx:57`), dock tabs `44px` (`MobileBottomDock.tsx:123`), dismiss `44px` (`FeedbackCard.tsx:122`).
- [x] Skip link and focusable `main` (`AppShell.tsx:13-31`).

---

## 3. Findings by Severity

### MEDIUM

**M-01: Hub H1 does not stay on one line in Laroka at 1024 and 1440.**
`web/src/pages/HomeHub.tsx:81` with `--fs-h1: clamp(2rem, 3.5vw + 0.75rem, 3.25rem)` (`web/src/styles/tokens.css:55`).
Parsed Laroka advance widths give the H1 string `1280px` at the `52px` maximum, against `1072px` of usable width at `1440` (1120 max width minus `48px` padding) and `1178px` needed against `976px` at `1024`. Result: two balanced lines (`text-balance`) on every desktop width. This contradicts the Step 05 checklist line "single-line H1" (`web-task.md:23`) and the Stage reference, which is single line at 1280 because it uses a narrower prototype font (D-010 allows the width difference, not the wrap). Arithmetic, needs browser confirmation.
Suggested fix (web plus ui-polish, no global token change): give the hub H1 its own class with a `clamp()` cap near `2.6rem` to `2.75rem`, or widen the H1 lane to full bleed, whichever the orchestrator prefers.

**M-02: Room code can ellipsize at exactly 360px.**
`web/src/components/room/RoomCodeCard.tsx:88-97`.
At 360 the row receives `280px` of card content, minus `pl-4 (16)`, `pr-2 (8)`, two `8px` gaps, the `44px` copy button, and the `shrink-0` `Or type code:` label (`81px` measured at `0.62rem` with `0.08em` tracking), leaving `115px` for a code that measures `119px` at `1.05rem` with `0.14em` tracking. The span has `overflow-hidden text-ellipsis whitespace-nowrap`, so it never wraps (good) but the final digit can render as an ellipsis at 360. It fits from about `375px` up.
Suggested fix: drop the tracking to `0.1em` (saves about `7px`), or use `pl-3` at the smallest breakpoint, or hide the `Or type code:` label below `sm` since the QR carries the instruction.

**M-03: Hub copy feedback bypasses the copy deck and fails silently.**
`web/src/components/room/RoomCodeCard.tsx:46-53` and `:98-121`.
The copy button swaps to a `Check` icon and announces through an `sr-only` live region, but it never emits `buildFeedback('SUCCESS_COPIED')` (available at `web/src/lib/copyDeck.ts:109-116`, already used for feed copies at `useGhostRoom.ts:692`). Line 48 also returns silently when `navigator.clipboard` is unavailable or rejects, so a blocked clipboard produces no feedback at all.
Suggested fix: accept an `onCopied` callback or surface the copy deck toast, and show a friendly retry line when the write fails.

### LOW

**L-01: Numerals outside headings use the body font.**
`web/src/components/room/TransferCard.tsx:83-89` (countdown) and `:130-133` (`Sending... {percent}%`). `docs/design.md:91-95` lists numerals under Laroka. Room codes, headings, step orbs, and toast titles are correct.

**L-02: Hub send card adds a timer block that the Stage layout does not have.**
`web/src/pages/HomeHub.tsx:129-134`. The reference keeps the timer in the top pill bar only. Functionally valuable and on-brand, so this is a composition deviation, not a gate failure.

**L-03: Copied state pill is lime on lime.**
`web/src/components/room/RoomCodeCard.tsx:104-109` renders `bg-brand-lime` inside a `bg-brand-lime` card, so only the icon changes. A cobalt or lime-tint fill would read better.

**L-04: Build warning on the second Laroka font source.**
`web/src/styles/tokens.css:5` declares `url('../laroka.otf')` as a second `src`. Vite reports `didn't resolve at build time`. Harmless at runtime because the first source `/fonts/laroka.otf` is published (`dist/fonts/laroka.otf`, served `200`). Removing the second source clears the only build warning.

**L-05: Mobile dock timer is local-only.**
`web/src/components/nav/MobileBottomDock.tsx:19` and `:85-88` keep `timerId` in component state and never call `room.setTtlPreset`, so the dock pill does not change the real TTL. Out of Step 05 scope (mobile is Step 06), but it must not ship as a dead control.

**L-06: Reduced motion does not neutralise transform transitions.**
`web/src/index.css:224-248` removes keyframes, but hover and press transforms still animate through `transition-transform` and `active:scale-[0.97]` (`NestedPillButton.tsx:74`, `DropZone.tsx:62`). `docs/05-motion-spec.md:20` asks for transforms to reduce to instant fades. Cosmetic.

**L-07: `aria-label` on a non-interactive span.**
`web/src/components/room/RoomCodeCard.tsx:92-94`. Some assistive tech ignores labels on a plain `span` with no role. The text content still reads, so impact is minimal.

**L-08: Silent no-op before the room code exists.**
`web/src/pages/HomeHub.tsx:42` and `:55` return early when `roomCode` is null, so a very fast drop or paste during the first tick gives no acknowledgement.

### Positive notes (no action)

- Paste guard order is correct: typing target first, then files before text, then the empty check (`useClipboardPaste.ts:65-85`). One screenshot never sends twice.
- Drag handling prevents browser navigation away from the app without swallowing plain text drags (`useFileDropTarget.ts:17-66`).
- The feed keeps state honest: `nuked` items are filtered out, `expired` items become a muted `ClearedTransferRow`, and `sending` and `error` have their own playful states (`TransferFeed.tsx:36-80`, `TransferCard.tsx:117-160`, `:249-260`).
- No `URL.revokeObjectURL` or protocol logic is duplicated in the audited UI components; they consume `useGhostRoom` only.

---

## 4. Gate Verdicts

| Gate | Verdict | Basis |
| :--- | :--- | :--- |
| **Gate 1: tokens, Laroka, nav split, squiggle fidelity** | **GATE PASS** with findings M-01, L-01, L-02, L-03 | Tokens only, Laroka loaded and applied to headings, codes, step orbs, and toast titles, `768px` nav split exact, squiggles self-draw only, nested pill buttons match the reference. No token, font, motion, or navigation violation found. |
| **Gate 2: playful copy, zero em dash, zero emoji** | **GATE PASS** with finding M-03 | 0 em dashes, 0 emojis, 0 `alert()` calls, all feedback and empty states from the copy deck, no raw transport text on screen. |
| **Gate 6: responsive, reduced motion, build health** | **GATE PASS** with findings M-02, L-06 | type-check, lint, and build all exit 0, reduced motion honoured, one H1 per page, live regions present, 44px targets, no overflow driver found in the static breakpoint audit. |

Gates 3, 4, and 5 are out of scope for this step and were not re-graded here.

---

## 5. Verdict and Blockers

**Verdict: PASS WITH FINDINGS.** Gates 1, 2, and 6 all pass. The hub and the workspace are structurally faithful to the Stage layout references while using locked tokens, Laroka, lucide icons, and the copy deck.

**Blockers for Step 06: none.** Two MEDIUM deviations need an accept-or-fix decision from the orchestrator, and both are small:

1. **M-01** single-line hub H1 in Laroka (`HomeHub.tsx:81`, `tokens.css:55`). Fix with a local H1 clamp, not a token change.
2. **M-02** 360px room code fit (`RoomCodeCard.tsx:88-97`). About 4px short; a tracking or padding tweak clears it.

**Not verified here, carry forward:** a rendered browser pass at `360`, `768`, `1024`, `1440`, and a live two-tab transfer, because no browser or headless engine was available to this session, and the previous session recorded that `wss://0.peerjs.com` handshakes fail in this sandbox (`web-task.md:56`).

**Recommended follow-up order:** M-02, M-01, M-03, then L-04 (clears the last build warning) and L-05 (before the Step 06 mobile lock).
