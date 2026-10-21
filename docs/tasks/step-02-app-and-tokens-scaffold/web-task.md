# Step 02: App and Tokens Scaffold Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-20

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/00-prd-source-of-truth.md`
- `docs/design.md` and `docs/04-design-system.md`
- `docs/05-motion-spec.md`
- `docs/tokens/tokens.json` and `docs/tokens/tokens.css`
- `docs/laroka.otf`

## Objective
Scaffold the GhostDrop Web and PWA application inside `web/` using Vite + React 19 + TypeScript + Tailwind CSS v4. Wire brand tokens, configure the `Laroka` display font, and build the foundational UI shell components.

## Checklists
- [x] Initialize Vite + React 19 + TypeScript project in `web/` directory with `package.json`, `tsconfig.json`, and `vite.config.ts`.
- [x] Install dependencies in `web/`: `lucide-react`, `peerjs`, `qrcode.react`, `jsqr`, `vite-plugin-pwa`, `@tailwindcss/vite`, `tailwindcss`.
- [x] Copy `docs/laroka.otf` to `web/public/fonts/laroka.otf` and configure `@font-face` in `web/src/index.css`.
- [x] Copy `docs/Logo icon.jpg` to `web/public/icons/logo.jpg`.
- [x] Import and apply design tokens from `docs/tokens/tokens.css` in `web/src/index.css` (`#CDF22B` Acid Lime, `#1E45FB` Electric Cobalt, `#F7F6F2`/`#EBEAE4` Warm Stone, `#0D0F12` Jet Ink, `#124B38` Deep Forest).
- [x] Implement reusable `<SquiggleLine />` component in `web/src/components/brand/SquiggleLine.tsx` with SVG `pathLength="1"` and self-drawing keyframe animation (`stroke-dashoffset: 1 -> 0`).
- [x] Implement `<SquiggleCardBg />` decorative background component in `web/src/components/brand/SquiggleCardBg.tsx` positioned in safe zones.
- [x] Implement tactile Nested Circle-Icon Pill Button component in `web/src/components/brand/NestedPillButton.tsx` (`#CDF22B` and `#1E45FB` variants with nested SVG icon circle).
- [x] Implement Desktop Floating Top Pill Bar (`web/src/components/nav/DesktopTopPillBar.tsx`) visible on `>= 768px`.
- [x] Implement Mobile Sleek Floating Bottom Navbar (`web/src/components/nav/MobileBottomDock.tsx`) with 3 tabs (`Send`, `Scan QR`, `50 Mins`) visible on `< 768px`.
- [x] Implement `prefers-reduced-motion` utility ensuring immediate full-stroke rendering without animation.
- [x] Enforce zero emojis and zero em dashes across all components and styles.
- [x] Verify `npm run type-check` and `npm run build` pass inside `web/`.

## Implementation Contract (Orchestrator, binding)
- Routing: hand-rolled History API router in `web/src/lib/router.tsx` (`useRoute`, `navigate`). Do NOT add `react-router-dom`.
- Structure: `web/src/components/brand/`, `web/src/components/nav/`, `web/src/components/ui/`, `web/src/components/room/`, `web/src/components/qr/`; pages in `web/src/pages/`.
- Brand primitives owned by this step: `brand/Logo.tsx`, `brand/SquiggleLine.tsx`, `brand/SquiggleCardBg.tsx`, `brand/SquiggleConnectionBridge.tsx`, `brand/NestedPillButton.tsx`, `brand/OrbBadge.tsx`, `nav/DesktopTopPillBar.tsx`, `nav/MobileBottomDock.tsx`, `ui/FeedbackCard.tsx`.
- All color usage through `var(--color-*)` from `web/src/styles/tokens.css` copied from `docs/tokens/tokens.css`. No raw brand hex duplicated in TSX.
- `Laroka` only from local `web/public/fonts/laroka.otf`. Plus Jakarta Sans and JetBrains Mono via Google Fonts link.
- Mobile dock is exactly 3 tabs: `Send`, `Scan QR`, `50 Mins` (`decisions.md` D-010).
- Placeholder pages must render with zero jargon and zero emojis, and must not use `alert()`.
- Do not install `react-router-dom`, `axios`, `zustand`, or UI kits. Only the locked dependency list plus Vite/Tailwind/React/TypeScript dev dependencies.

## Completion Notes

Status: COMPLETE. `npm run type-check`, `npm run lint`, and `npm run build` all pass inside `web/`.

### Files created
- Tooling: `web/package.json`, `web/package-lock.json`, `web/index.html`, `web/vite.config.ts`, `web/eslint.config.js`, `web/tsconfig.json`, `web/tsconfig.app.json` (strict), `web/tsconfig.node.json`, `web/README.md`, `web/.gitignore`.
- Assets: `web/public/fonts/laroka.otf` (copied from `docs/laroka.otf`), `web/public/icons/logo.jpg` (copied from `docs/Logo icon.jpg`), `web/public/favicon.svg` (branded cobalt splash mark).
- Styles: `web/src/styles/tokens.css` (byte-identical copy of `docs/tokens/tokens.css`, verified equal length 3433 bytes), `web/src/index.css` (Tailwind entry, token theme bridge, typography helpers, squiggle partial draw and tip pulse, reduced-motion fallbacks).
- App: `web/src/main.tsx`, `web/src/App.tsx`, `web/src/components/shell/AppShell.tsx`.
- Router: `web/src/lib/router.tsx` (`useRoute`, `navigate`, `isPathActive`, `isPlainLeftClick`, `matchRoomPath`), `web/src/lib/cn.ts`, `web/src/lib/constants.ts`.
- Brand primitives: `web/src/components/brand/Logo.tsx`, `SquiggleLine.tsx`, `SquiggleCardBg.tsx`, `SquiggleConnectionBridge.tsx`, `NestedPillButton.tsx`, `OrbBadge.tsx`.
- Navigation: `web/src/components/nav/DesktopTopPillBar.tsx`, `MobileBottomDock.tsx`, `MobileStatusHeader.tsx`.
- Feedback: `web/src/components/ui/FeedbackCard.tsx`, `web/src/components/ui/Toast.tsx`.
- Pages: `web/src/pages/HomeHub.tsx`, `ConnectedWorkspace.tsx`, `MobileJoin.tsx`, `HowItWorks.tsx`, `NotFound.tsx`.

### Dependency versions installed
- Runtime: `react` 19.3.1, `react-dom` 19.3.1, `lucide-react` 1.60.0, `peerjs` 1.5.5, `qrcode.react` 4.2.0, `jsqr` 1.4.0.
- Build and lint: `vite` 8.3.4, `@vitejs/plugin-react` 6.1.2, `typescript` 6.0.3, `tailwindcss` 4.3.3, `@tailwindcss/vite` 4.3.3, `vite-plugin-pwa` 2.0.0, `eslint` 10.13.0, `typescript-eslint` 8.72.0, `@types/react` 19.3.0, `@types/react-dom` 19.3.0, `@types/node` 24.19.2.
- The Vite template shipped `oxlint`; it was replaced with ESLint plus `typescript-eslint` per the task contract. No `react-router-dom`, `axios`, `zustand`, or UI kit was added.

### Command results
- `npm run type-check`: pass, zero errors (`tsc --noEmit` on app and node configs).
- `npm run lint`: pass, zero errors and zero warnings.
- `npm run build`: pass, 1948 modules, CSS 28.21 kB, JS 249.15 kB, PWA service worker generated with 8 precache entries.
- Runtime smoke test at 1000 px viewport: Laroka and Plus Jakarta Sans load, tokens resolve to `#CDF22B`, `#1E45FB`, `#F7F6F2`, desktop pill bar visible, mobile dock hidden, all five routes plus trailing slash render, dock shows exactly three tabs, timer sheet opens with four presets, zero console errors, zero em dashes and zero emojis in `src/`, `public/`, configs, and README.

### Notes and deviations
- File names follow the binding Implementation Contract (`brand/`, `nav/`, `ui/` folders) rather than the older checklist paths (`components/DesktopTopBar.tsx`, `components/MobileBottomNav.tsx`).
- `SquiggleLine.tsx` is shared by `SquiggleCardBg`, the connection bridge, and feedback headlines. It uses `pathLength="1"` with `.squiggle-path-draw` from `tokens.css`, plus a `.squiggle-path-partial` state for the idle bridge.
- Desktop timer pill is hidden below the `lg` breakpoint so the 768 px pill bar never overflows. It is present in the DOM and visible from 1024 px upward.
- `vite-plugin-pwa` is wired with `registerType: 'autoUpdate'` and an SVG icon only. Full manifest share target and `src/sw.ts` remain Step 07 scope.
- Build emits one benign Vite warning: the second `src` in the locked `tokens.css` `@font-face` (`url('../laroka.otf')`) cannot resolve from `web/src/styles/`. The first `url('/fonts/laroka.otf')` resolves and the font loads. `tokens.css` was kept byte-identical per the task requirement.
