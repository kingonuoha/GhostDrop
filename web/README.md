# GhostDrop Web and PWA

Vite + React 19 + TypeScript + Tailwind CSS v4 client for GhostDrop.

## Commands

```bash
npm run dev         # Vite dev server
npm run build       # Type check plus production PWA build
npm run preview     # Preview the production build
npm run lint        # ESLint with typescript-eslint
npm run type-check  # TypeScript check, no emit
```

## Structure

```text
public/fonts/laroka.otf     Locked Laroka display font
public/icons/logo.jpg       Locked brand mark reference
public/favicon.svg          Branded favicon
src/styles/tokens.css       Locked tokens copied from docs/tokens/tokens.css
src/index.css               Tailwind entry plus token theme bridge
src/lib/router.tsx          Hand rolled History API router
src/components/brand/       Logo, squiggle line, squiggle card, bridge, pill, orb
src/components/nav/         Desktop top pill bar, mobile status header, mobile dock
src/components/shell/       App shell with landmarks and skip link
src/components/ui/          Feedback card and toast
src/pages/                  Route screens
```

## Brand rules

- Zero em dashes and zero emojis. Icons are lucide-react or inline SVG.
- Colors come from `var(--color-*)` tokens through the Tailwind theme bridge.
- Headings and room codes use Laroka. Body copy uses Plus Jakarta Sans. Timers use JetBrains Mono.
- Squiggly lines draw themselves with SVG `pathLength="1"` and `stroke-dashoffset: 1 -> 0`. Never fly, slide, or bounce.
- Mobile dock is exactly three tabs: Send, Scan QR, and the auto-delete timer.
