# 04-design-system.md: GhostDrop Design System Reference

> This file mirrors and extends `docs/design.md` as part of the numbered agent handoff pack (`00` through `08`). For full brand rules, self-drawing squiggly line SVG specs, responsive navigation rules, and playful feedback tables, read `docs/design.md` and `docs/tokens/tokens.css`.

## Quick Token and Component Checklist for Agents

1. **Zero Em-Dashes and Zero Emojis (SVG Icons Only):**
   - Never use an em dash anywhere. Use hyphens (`-`), colons (`:`), or periods (`.`).
   - Never use emojis anywhere. Use crisp SVG icons (`lucide-react` or custom brand vector SVGs).
2. **Responsive Navigation Split:**
   - **Desktop (`>= 768px`):** Floating Top Pill Navbar (and optional FAB).
   - **Mobile (`< 768px`):** Sleek Floating Bottom Navbar (`rounded-full bg-[#0D0F12]`) in the thumb zone + minimal top status header.
3. **Brand Colors (`docs/Brand colours.jpg` and `docs/Woove - Branding line.jpg`):**
   - `--color-lime-400`: `#CDF22B` (Acid Lime)
   - `--color-cobalt-600`: `#1E45FB` (Electric Cobalt Blue)
   - `--color-stone-100`: `#EBEAE4` (Warm Stone Canvas)
   - `--color-stone-50`: `#F7F6F2` (Light Page Background)
   - `--color-forest-800`: `#124B38` (Deep Forest Squiggle Accent)
   - `--color-ink-950`: `#0D0F12` (Display Ink)
   - `--color-surface`: `#FFFFFF` (Clean White Card)
4. **Typography (`docs/laroka.otf`):**
   - Display / Headings / 6-Char Room Code: `Laroka` (`--font-display`)
   - Body / UI Controls: `Plus Jakarta Sans` (`--font-body`)
   - Telemetry / Timers / Chunks: `JetBrains Mono` (`--font-mono`)
5. **Signature Craft Elements:**
   - **Self-Drawing Squiggly Loop Line:** SVG `<path pathLength="1" className="squiggle-path-draw" />` inside card backgrounds, hero headers, and P2P connection bridges. Animates strictly via `stroke-dashoffset: 1 -> 0` (never fly-in/out).
   - **Nested Circle-Icon Pill Buttons:** Exact replica of the `#CDF22B` and `#1E45FB` pill badges in `docs/Brand colours.jpg` (pill container with a contrasting circular SVG `Plus` or `ArrowRight` badge tucked inside the right end).
   - **Off-Center Orb Badge:** Inspired by the blue and lime `8` pool-ball orb in `docs/Brand colours.jpg`, used for peer counters and step badges.
   - **Playful Joyful Feedback:** Every toast, empty state, error card, and success banner uses the joyful voice from `docs/design.md` Section 6 and `docs/02-brand-persona-and-copy.md`.
