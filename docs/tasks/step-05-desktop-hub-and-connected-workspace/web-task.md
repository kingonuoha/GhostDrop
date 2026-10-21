# Step 05: Desktop Hub and Connected Workspace Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-21 · ASUS-LAPTOP-DNL - updated - 2026-10-21 (QA repair round 1)

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/01-wireframe-and-pages.md` (Screens 1 & 2)
- `docs/02-brand-persona-and-copy.md` (Headlines, Buttons, and Success Toasts)
- `docs/design/ghostdrop_ultra_clean_desktop_hub_grandma_edition/` (`screen.png` & `code.html`)
- `docs/design/ghostdrop_ultra_clean_desktop_hub/` (`screen.png` & `code.html`)
- `docs/design/ghostdrop_connected_workspace_grandma_friendly/` (`screen.png` & `code.html`)
- `docs/design/ghostdrop_connected_workspace_phone_computer_linked/` (`screen.png` & `code.html`)

## Objective
Build `/` Desktop Home Hub and `/room/:code` Connected Workspace strictly matching the Grandma-Friendly Stage designs in `docs/design/`.

## Checklists
- [x] Build `/` Desktop Home Hub in `web/src/pages/HomeHub.tsx` (DesktopHome superseded) with single-line H1 (`Send photos and text between your screens.`), Left Card (`1. Scan with your phone` with `#CDF22B` card and single-line `G H O S T 8` room code), and Right Card (`2. Pick what to send` with `#1E45FB` file button and simple paste bar).
- [x] Ensure single-line 6-character room code uses `white-space: nowrap` and never wraps onto multiple lines.
- [x] Build `/room/:code` Connected Workspace in `web/src/pages/ConnectedWorkspace.tsx` with `<SquiggleConnectionBridge />` (`This Computer` <-> Squiggle Line <-> `My Phone`).
- [x] Implement global `Ctrl+V` paste listener for instant text and screenshot transfers.
- [x] Implement drag-and-drop file dropzone on the send card with live upload progress.
- [x] Build clean Shared Items feed displaying received files/notes with big `Save` and `Copy` buttons and plain-English countdown labels.
- [x] Integrate joyful toast notices (`Connected!`, `Sent!`, `All sent!`) with SVG icons from `lucide-react`.
- [x] Verify zero emojis, zero em dashes, and strict Grandma 2-Second Rule compliance.

## Implementation Contract (Orchestrator, binding)
- The desktop hub lives in the existing `web/src/pages/HomeHub.tsx` route `/`. The older filename `DesktopHome.tsx` is superseded; do not create a duplicate page.
- Layout fidelity comes from `docs/design/ghostdrop_ultra_clean_desktop_hub_grandma_edition` and `ghostdrop_connected_workspace_grandma_friendly`. Brand tokens, Laroka, lucide icons, copy and motion come from `docs/`, never from Stage hex or font stacks (`decisions.md` D-010).
- Hub: single-line Laroka H1 `Send photos and text between your screens.`, exactly two primary cards. Left lime card `1. Scan with your phone` with `qrcode.react` QR encoding `${origin}/join?room=CODE`, single-line nowrap `G H O S T 8` code, and one `Copy Code` pill. Right cobalt card `2. Pick what to send` with `Choose Photos or Files`, dropzone helper, paste bar `Type or paste a link or note...`, and `Send`.
- Host flow: no `:code` on `/` creates a host room, keeps the QR live, and navigates to `/room/:code` when the first peer joins. `/room/:code` with no connection attempts guest join, shows the playful reconnect card on failure instead of raw errors.
- Workspace: `SquiggleConnectionBridge` with `This Computer` and the joined device label. Live feed of max 3 visible cards with `Save` or `Copy` and a plain-English countdown (`49 mins left`, `Deletes after first copy`, `Deletes when you close this page`). Use the existing `TtlPicker` and `FeedbackCard`.
- Global paste: `Ctrl+V` / `Cmd+V` captures text and image files outside of input, textarea, and contenteditable. Images paste as files. Ignore empty clipboard data and never hijack paste while typing.
- Drag and drop: dashed cobalt dropzone overlay on dragenter, drop sends files, keyboard accessible `Choose Photos or Files` input, per-file progress from the engine `transfer:progress` event surfaced in the feed.
- Extend `useGhostRoom` with per-item `progress` (0 to 1) and `remainingMs` helpers if not already exposed. Do not change the wire protocol.
- Toasts: use the copy deck keys. `Connected!`, `Sent!`, `All sent!`, `Poof! All gone.`, `Hmm, check that code`, `Screen disconnected`. No raw transport strings.
- Responsive: desktop >= 768px uses the floating top pill bar only. At < 768px the hub must not show the desktop link bar; the mobile layout is completed in Step 6, so keep it usable now.
- Accessibility: one H1 per page, buttons min 44px, focus-visible rings, aria-live for connection status and toast, `aria-label` on icon-only buttons, no horizontal overflow at 360, 768, 1024, 1440.

## Scope Guard
- Do not build the QR scanner modal, `/how-it-works` content, PWA manifest, or service worker in this step.

## Completion Notes
- Desktop hub: `web/src/pages/HomeHub.tsx` with exactly two cards, Laroka H1, lime QR card, cobalt send card, TtlPicker, DropOverlay, RoomToast.
- Workspace: `web/src/pages/ConnectedWorkspace.tsx` with `ConnectionBridge`, `TransferFeed` (latest 3), `TransferCard`, plain-English countdowns, playful empty state.
- New components: `RoomCodeCard`, `DropZone`, `TextComposer`, `TransferFeed`, `TransferCard`, `ConnectionBridge`, `DropOverlay`, `RoomToast`.
- New hooks: `useClipboardPaste` (input, textarea, contenteditable guarded), `useFileDropTarget`.
- QR: `qrcode.react` `QRCodeSVG` encodes `${origin}/join?room=CODE`; code rendered nowrap in Laroka.
- Host flow: `/` creates a host room and hands over to `/room/:code?host=1` on first peer, carrying a pending drop via `lib/pendingDrop`.
- Verification: `npm run type-check`, `npm run lint`, `npm run build` pass (1992 modules, 8 precache). Browser smoke at 1000px: Laroka applied, `#F7F6F2` canvas, desktop pill bar shown, mobile dock hidden, zero horizontal overflow, no React errors. `/room/TEST42` renders bridge, empty feed and plain-English states.
- Environment note: `wss://0.peerjs.com` handshake failed in the sandbox, so a live two-tab transfer could not be executed here. Signalling code path unchanged from the Step 3 audited revision.

## QA Repair Round 1

**Scope:** targeted polish from `qa-report.md` findings M-01, M-02, M-03 and L-04, inside `web/` only. No new dependency, no wire protocol change, no edit to `web/src/styles/tokens.css`.

### M-01: hub H1 on one line from 1024 up

- `web/src/index.css:112-135` adds `.hub-title`: token clamp below `1024`, `2.375rem` plus `white-space: nowrap` from `1024`, `2.5rem` from `1280`.
- `web/src/pages/HomeHub.tsx:81` applies `type-h1 hub-title` to the unchanged copy `Send photos and text between your screens.`
- Basis: parsed `public/fonts/laroka.otf` advance widths give `1279.5px` at `52px`, so the string advances about `24.6px` per font pixel. Lane is `976px` at `1024` and `1072px` at `1280` and `1440`.
- Verified in headless Chrome through CDP at 1024, 1168, 1280 and 1440: H1 `font-size` `38`, `38`, `40`, `40`, `white-space: nowrap`, line boxes `1`, rendered text width `894`, `894`, `941`, `941`, page horizontal overflow `0` at every width. Below 1024 the H1 keeps wrapping (2 lines at 768, 3 lines at 360), which the phone layout wants.

### M-02: room code fits at 360 and never ellipsizes anywhere

- `web/src/components/room/RoomCodeCard.tsx:99` tightens the pill row to `pl-3` below `sm` (`sm:pl-4` after).
- `web/src/components/room/RoomCodeCard.tsx:100` shrinks the `Or type code:` label to `0.58rem` / `0.06em` below `sm` and hides it only in the narrow `md` grid (`md:hidden lg:inline`), the fix the QA report suggested.
- `web/src/components/room/RoomCodeCard.tsx:105` sets the code size per breakpoint: `0.85rem`/`0.08em`, then `1.35rem`/`0.18em` at `sm`, `1.05rem`/`0.1em` at `md`, `1.1rem`/`0.1em` at `lg`, `1.25rem`/`0.12em` at `xl`. `whitespace-nowrap`, `overflow-hidden` and `text-ellipsis` stay as the last-resort guard.
- Worst case basis: the six widest glyphs in `ROOM_CODE_ALPHABET` (`M W W N G Q`). Measured with a DOM `Range` against the real span at each width, so the numbers include Laroka advances and tracking:

| Viewport | Code box | Worst-case content | Slack | Page overflow |
| :--- | ---: | ---: | ---: | ---: |
| 360 | 106 | 100.36 | 5.64 | 0 |
| 375 | 121 | 100.36 | 20.64 | 0 |
| 390 | 136 | 100.36 | 35.64 | 0 |
| 414 | 160 | 100.36 | 59.64 | 0 |
| 640 | 360 | 183.16 | 176.84 | 0 |
| 768 | 140 | 127.61 | 12.39 | 0 |
| 1024 | 144 | 133.75 | 10.25 | 0 |
| 1168 | 184 | 133.75 | 50.25 | 0 |
| 1280 | 184 | 156.39 | 27.61 | 0 |
| 1440 | 184 | 156.39 | 27.61 | 0 |

### M-03: copy raises the copy deck toast, failures stay playful

- `web/src/hooks/useGhostRoom.ts:83-84`, `:294-299` and `:763` expose `announceFeedback(key)`, which routes a `buildFeedback` entry into the same `feedback` state the page already renders. No protocol touch, no new state store.
- `web/src/pages/HomeHub.tsx:89` passes `onCopyFeedback={room.announceFeedback}` into the card.
- `web/src/components/room/RoomCodeCard.tsx:49-64` now emits `SUCCESS_COPIED` on a successful write and `ERR_COPY_BLOCKED` when the clipboard is missing or rejects, instead of returning silently. No `alert()`.
- `web/src/lib/copyDeck.ts:24` and `:177-183` add `ERR_COPY_BLOCKED` in the deck voice: `Almost there! Tap to retry` / `Your browser held on to the code. Tap copy once more!` / `Try Again`. `web/src/components/room/FeedbackNotice.tsx:31` maps it to the existing `RefreshCw` icon, so no new import.
- Verified in headless Chrome with clipboard permission granted: click produced the toast lines `Copied!`, `Ready to paste wherever you need it.`, `Copied`, the clipboard read back the room code, and the button swapped to the `Code copied` state. With `navigator.clipboard.writeText` forced to reject, the toast read `Almost there! Tap to retry`, `Your browser held on to the code. Tap copy once more!`, `Try Again`.
- Docs note for the orchestrator: `docs/02-brand-persona-and-copy.md` section 4 has no clipboard blocked row. Adding that row is a docs edit outside this repair's write scope, so the key is flagged here for a docs sync before Gate 2 re-audit.

### L-04: single Laroka source, no build warning

- `web/vite.config.ts:23-35` adds an inline postcss step that removes only `url(./laroka.otf) format("opentype")` from any `src` declaration, and `web/vite.config.ts:61-65` registers it through `css.postcss.plugins`.
- Why this shape: an overriding `@font-face` in `src/index.css` was tried first and did **not** silence the warning, because Vite still resolves the stale second source inside `tokens.css`. The postcss step runs after `@import` inlining and before Vite's url resolver, which is the only place the reference can be dropped without touching the locked file.
- `web/src/styles/tokens.css` is byte-identical to `docs/tokens/tokens.css` (md5 `d7dcd42993259d671ee3af70cdbd45d9` on both).
- Build output now has zero warnings, and the emitted CSS carries one source: `@font-face{font-family:Laroka;src:url(/fonts/laroka.otf)format("opentype")...}`.

### Command results

| Command | Result |
| :--- | :--- |
| `npm run type-check` | PASS, `tsc --noEmit` on `tsconfig.app.json` and `tsconfig.node.json`, no diagnostics |
| `npm run lint` | PASS, `eslint .`, zero warnings |
| `npm run build` | PASS with **zero warnings**, `2005 modules transformed`, CSS `34.34 kB (gzip 7.47 kB)`, JS `420.17 kB (gzip 126.45 kB)`, PWA precache `8 entries (445.21 KiB)` |

Content scan over the touched files (`index.css`, `HomeHub.tsx`, `RoomCodeCard.tsx`, `FeedbackNotice.tsx`, `copyDeck.ts`, `useGhostRoom.ts`, `vite.config.ts`): 0 em dashes, 0 emojis, 0 `alert(` calls.

### Carried forward

- Not in this round: L-01 (numerals in the body font), L-03 (lime on lime copied pill), L-05 (mobile dock timer), L-06 (reduced-motion transforms), L-07 (aria-label on a span), L-08 (silent no-op before the room code exists).
- Live two-tab transfer still unverified in this sandbox because `wss://0.peerjs.com` handshakes fail here; all rendering checks above ran against the local dev server in headless Chrome.
