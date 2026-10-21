# Step 02: QA App and Tokens Scaffold Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20

**Auditor:** `@ghostdrop-qa`
**Workspace:** `web/`
**Mode:** Read-only audit. No application code, config, or design files were modified.
**Verdict:** GATE PASS (0 P0, 0 P1, 8 P2)

---

## 1. Scope and Pre-Reads

Read and applied before grading:
- `AGENTS.md`, `.agent/BRAND.md`, `.agents/agents/GhostDrop/qa.md`
- `decisions.md` D-005 to D-010
- `docs/08-qa-checklist.md` Gate 1 and Gate 6
- `docs/tokens/tokens.css` and `docs/tokens/tokens.json`
- `docs/05-motion-spec.md`
- `docs/tasks/step-02-app-and-tokens-scaffold/qa-task.md` and `web-task.md`

---

## 2. Mirrored QA Checklist (qa-task.md)

- [x] Vite + React 19 + TypeScript + Tailwind CSS v4 structure conforms. Evidence: `web/package.json:6-12` scripts, `web/tsconfig.app.json` strict true, `web/vite.config.ts` uses `@tailwindcss/vite`, `web/src/index.css:1` imports Tailwind v4.
- [x] `Laroka` file exists at `web/public/fonts/laroka.otf` (68,228 bytes, OTTO OpenType header) and `@font-face` is defined at `web/src/styles/tokens.css:2-9`. Runtime `document.fonts.check("700 32px Laroka")` returned true.
- [x] All color variables match locked values. `web/src/styles/tokens.css` is byte-identical to `docs/tokens/tokens.css` (3,433 bytes, diff clean). Runtime computed values: #cdf22b, #1e45fb, #f7f6f2, #ebeae4, #0d0f12, #124b38.
- [x] `SquiggleLine` and `SquiggleCardBg` use SVG `pathLength="1"` with `stroke-dasharray: 1` and `stroke-dashoffset: 1 -> 0`. Evidence: `web/src/components/brand/SquiggleLine.tsx:71`, `web/src/styles/tokens.css:102-115`. Runtime animation: `squiggle-draw`, duration 1.15s, dasharray 1px.
- [x] Zero em dashes. Node scan of 36 files across `web/src`, `web/public`, configs, and README found 0 occurrences of U+2013 and U+2014.
- [x] Zero emojis. Same scan found 0 pictographic characters. All icons are `lucide-react` SVGs or inline brand SVG (`Logo.tsx`, `favicon.svg`).
- [x] `npm run type-check` and `npm run build` pass with zero errors. `npm run lint` also passes.

Additional requested checks:
- [x] No `react-router-dom`, `axios`, `zustand`, or UI kit. Routing is the hand-rolled History API router in `web/src/lib/router.tsx`.
- [x] No duplicate dependencies. `npm ls` shows `react@19.3.1` deduped across `react-dom`, `qrcode.react`, and `lucide-react`.
- [x] No `Syne` and no Material Symbols or icon fonts anywhere in `src`, `public`, or `index.html`.
- [x] No raw brand hex in TSX or TS source. Grep for `#[0-9A-Fa-f]{6}` across `src` only matches `tokens.css`. Mapped brand hex appears only in `web/index.html:10`, `web/vite.config.ts:17-18`, and `web/public/favicon.svg:2-3`.
- [x] No rendered jargon and no `alert()`. Grep for WebRTC, P2P, TTL, PWA, 16KB, FILE_ACK, revokeObjectURL, PeerJS, DataChannel found no hits in `src`; runtime route sweep also found none.
- [x] Responsive nav split. Desktop top pill bar is hidden below `md` and visible from `md` (`DesktopTopPillBar.tsx:22`). Mobile dock and status header are `md:hidden` (`MobileBottomDock.tsx:53`, `MobileStatusHeader.tsx:5`). Dock renders exactly 3 tabs: `Send`, `Scan QR`, `50 Mins` (`MobileBottomDock.tsx:22-26`).

---

## 3. Gate 1: Brand Tokens, Laroka, Navigation Split and Squiggle Fidelity

- [x] Only locked tokens used. Core hexes exact: #CDF22B, #1E45FB, #F7F6F2, #EBEAE4, #0D0F12, #124B38. No unmapped raw hex in components.
- [x] `Laroka` applies to all headings through base rules (`web/src/index.css:61-71`) and the `type-display`, `type-h1`, `type-h2`, `type-h3`, and `type-room-code` utilities (`web/src/index.css:96-135`). Room codes and numerals resolve to Laroka (`ConnectedWorkspace.tsx:33`, `OrbBadge.tsx:61`).
- [x] Desktop `>= 768px` renders the floating top pill navbar. Mobile `< 768px` renders the bottom dock plus compact top status header. No duplicate visible nav at any tested width.
- [x] Squiggly line appears in hero and card backdrops (`HomeHub.tsx:21,62`, `HowItWorks.tsx:50,63`, `FeedbackCard.tsx:88`), and in the connection bridge (`SquiggleConnectionBridge.tsx:61`). Animation is draw-only. No fly, slide, or bounce entrance exists.
- [x] Nested Circle-Icon Pill buttons use the locked lime and cobalt pairings with a nested circular SVG (`NestedPillButton.tsx:8-18`). Off-center Orb badge is a cobalt circle with a lime core (`OrbBadge.tsx:46-56`).

Gate 1 result: PASS with P2 notes P2-3, P2-4, P2-5, P2-6, P2-8.

---

## 4. Gate 6: Responsive Viewports, Reduced Motion and Build Health

- [x] Layouts verified at 360, 768, 1024, and 1440 px with zero horizontal overflow. Iframe viewport sweep results: 360 px clientWidth 345 and scrollWidth 345; 768 px 768/768; 1024 px 1024/1024; 1440 px 1440/1440. Dock visible only at 360; top bar visible at 768, 1024, and 1440; status header visible only at 360.
- [x] `prefers-reduced-motion: reduce` disables the draw animation and sets `.squiggle-path-draw` to `stroke-dashoffset: 0` immediately (`tokens.css:117-127`), verified in the built CSS media rule. Partial variant caveat in P2-4.
- [x] `tsc --noEmit`, ESLint, and `npm run build` pass with zero errors. One non-fatal Vite warning remains (P2-2).

Gate 6 result: PASS with P2 notes P2-2 and P2-4.

---

## 5. Command Results

| Command | Exit | Result |
| :--- | :--- | :--- |
| `npm run type-check` | 0 | `tsc --noEmit -p tsconfig.app.json` and `tsconfig.node.json`, no diagnostics. |
| `npm run lint` | 0 | ESLint 10.13.0 plus typescript-eslint, no errors and no warnings. |
| `npm run build` | 0 | `tsc -b` clean, Vite 8.3.4 built 1948 modules. CSS 28.21 kB, JS 249.15 kB, PWA precache 8 entries at 272.20 KiB. One font-src warning (P2-2). |
| `npm ci --dry-run` | 0 | Removes `oxlint 1.89.0` and `@oxlint/binding-win32-x64-msvc 1.89.0`. Lockfile drift noted in P2-1. |
| `npm ls --depth=0` | 0 | No duplicate deps. Two extraneous oxlint packages from the template remain in `node_modules`. |

---

## 6. Runtime Verification

Production preview at `http://localhost:4173/`:
- Viewport sweep 360, 768, 1024, 1440: no horizontal overflow, correct nav split, 3 dock tabs at mobile, Laroka loaded true at every width.
- Route sweep `/`, `/how-it-works`, `/join?room=GHOST8`, `/room/GHOST8`, `/nope`: zero jargon hits, zero em or en dashes, zero emojis, zero horizontal overflow, zero console warnings or errors.
- Computed body font: `Plus Jakarta Sans, system-ui, -apple-system, sans-serif`. Computed h1 font: `Laroka, Bricolage Grotesque, system-ui, sans-serif`.
- Tokens resolved in the browser: `--color-lime-400` #cdf22b, `--color-cobalt-600` #1e45fb, `--color-stone-50` #f7f6f2, `--color-stone-100` #ebeae4, `--color-ink-950` #0d0f12, `--color-forest-800` #124b38.
- Squiggle paths: `pathLength="1"`, class `squiggle-path-draw`, animation `squiggle-draw`, duration 1.15s, dasharray 1px.

---

## 7. Findings

### P0 (Blockers)
- None.

### P1 (High)
- None.

### P2 (Low, non-blocking)

**P2-1 Lockfile drift and extraneous oxlint packages.**
`web/package-lock.json:2` declares `"name": "web"` while `web/package.json:2` declares `"ghostdrop-web"`. `web/package-lock.json:25` still lists `"oxlint": "^1.88.0"` after the manifest replaced oxlint with ESLint. `npm ci --dry-run` exits 0 but reports removal of `oxlint 1.89.0` and its binding, and `npm ls --depth=0` reports both as extraneous. No unlisted dependency exists in `package.json`, so this is metadata hygiene, not an installed contract breach. Fix: regenerate the lockfile with `npm install` before CI.

**P2-2 Non-fatal font src build warning.**
`web/src/styles/tokens.css:5` keeps the upstream second source `url("../laroka.otf")`, which cannot resolve from `web/src/styles/`; Vite warns that `./laroka.otf` remains unchanged and resolves at runtime. The first source `url("/fonts/laroka.otf")` resolves and the font loads. The file is intentionally byte-identical to `docs/tokens/tokens.css`, so fix upstream and recopy in a later step.

**P2-3 One static squiggle backdrop.**
`web/src/pages/ConnectedWorkspace.tsx:26` passes `animate={false}` to `SquiggleCardBg`, so that card backdrop renders fully drawn with no self-draw. No prohibited fly, slide, bounce, or scale entrance is used, but the literal rule that every squiggle draws itself is not met for this instance.

**P2-4 Reduced-motion partial squiggle holds offset 0.5.**
`web/src/index.css:191-195` disables animation but keeps `stroke-dashoffset: var(--squiggle-offset, 0.5)` for `.squiggle-path-partial`. `web/src/components/brand/SquiggleConnectionBridge.tsx:61-66` sets progress 0.5 in the idle state, so reduced-motion users see a static half-drawn bridge rather than offset 0. Motion risk is zero, but Gate 6 wording expects offset 0.

**P2-5 Tip dot uses a looping scale pulse.**
`web/src/index.css:173-189` runs `squiggle-tip-pulse` with `scale(0.85)` to `scale(1.15)`, applied at `web/src/components/brand/SquiggleConnectionBridge.tsx:68`. It animates the indicator dot, not the squiggle path, and is disabled under reduced motion, but it is the only looping transform animation in the squiggle layer and should be reviewed against the motion mandate.

**P2-6 TTL selector gap between 768 and 1023 px.**
`web/src/components/nav/DesktopTopPillBar.tsx:68` hides the TTL pill below `lg`, while `web/src/components/nav/MobileBottomDock.tsx:53` hides the dock from `md` upward. At 768 to 1023 px there is no on-screen TTL selector. This is the documented deviation at `web-task.md:75` to prevent pill bar overflow, but D-008 lists the TTL selector as part of the desktop top bar.

**P2-7 Heading level skip on NotFound.**
`web/src/pages/NotFound.tsx:8` renders a visually hidden h1, then `web/src/components/ui/FeedbackCard.tsx:106` renders an h3 with no h2 between. Heading order skips a level for assistive tech. Minor.

**P2-8 Room codes use the generic display utility.**
`web/src/pages/HomeHub.tsx:43` and `web/src/pages/MobileJoin.tsx:25` use `type-display` instead of the dedicated `type-room-code` utility. Both resolve to Laroka, so the font mandate passes; only semantic consistency differs.

---

## 8. Out of Scope Observations

- PWA manifest currently ships an SVG icon only and has no `share_target`. `web-task.md:76` assigns the full manifest share target and `src/sw.ts` to Step 07, so Gate 5 was not graded here.
- Wire protocol, 16KB chunking, TTL revocation, and QR scanner are not present in this scaffold step. Gates 3, 4, and 5 remain for later steps.

---

## 9. Verdict

Step 02 scaffold satisfies Gate 1 and Gate 6 within this step scope. All three quality commands pass with zero errors. The 8 P2 findings are non-blocking hygiene, motion edge-case, or spec-consistency notes.

GATE PASS
