# GhostDrop: Canonical Brand and Architecture Context

> **MANDATORY READING:** Every agent must read this file and the `docs/` folder at session start before taking any action.

---

## 1. Product Identity

- **Project Name:** GhostDrop
- **Category:** Ephemeral P2P Device Bridge and Self-Destructing Drop Manager (Web App and Installable PWA)
- **Budget and Storage:** `$0.00 / month` · `100% Stateless` · Zero Cloud Database · No Admin Portal Needed
- **Core Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 + `vite-plugin-pwa` + `peerjs` (`0.peerjs.com`) + WebRTC `RTCDataChannel` + `lucide-react` (SVG icons)

---

## 2. Locked Visual Branding (in `docs/`)

1. **`docs/Brand colours.jpg`**:
   - **Acid Lime (`#CDF22B`)** - Color 1: Highlight cards, active TTL pills, progress strokes, and buttons on cobalt/dark surfaces.
   - **Electric Cobalt Blue (`#1E45FB`)** - Color 2: Primary brand action surface, Dropzone card, logo mark, and buttons on lime/light surfaces.
   - **Nested Circle-Icon Pill Badges:** Pill buttons (`rounded-full`) with a contrasting circular SVG icon (`Plus`, `ArrowUpRight`, `QrCode`, `Copy`) nested inside the right edge.
   - **Off-Center 8-Ball Orb Badge:** Blue circle (`#1E45FB`) with an off-center lime circle (`#CDF22B`) holding a `Laroka` numeral or SVG icon.
2. **`docs/Logo icon.jpg`**:
   - Fluid 3-lobe metaball splash + floating droplet circle in Electric Cobalt Blue (`#1E45FB`).
3. **`docs/laroka.otf`**:
   - **`Laroka`** chunky display font for all H1/H2/H3 headings, 6-character room codes, numerals, and playful toast titles.
4. **`docs/Woove - Branding line.jpg` and Swatch 3 of `docs/Brand colours.jpg`**:
   - **The Signature Squiggly Loop Line:** Continuous, round-capped looping line used inside individual card backgrounds, hero headers, and the live P2P connection bridge.
   - **Self-Drawing Animation Rule (Non-Negotiable):** Must animate via SVG `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset: 1 -> 0` so it looks like the line is being drawn into place. **NEVER** fly-in, slide-in, or bounce-in!

---

## 3. Navigation, Copy and Iconography Guardrails (Non-Negotiable)

1. **Zero Em-Dashes and Zero Emojis Anywhere:**
   - Never use an em dash anywhere in UI copy, error messages, or docs.
   - Never use emojis anywhere. Always use crisp **SVG icons** (`lucide-react` or custom brand SVGs) instead of emojis.
2. **Desktop Top Bar / FAB vs. Mobile Sleek Bottom Navbar:**
   - **Desktop (`>= 768px`):** Floating top pill navbar (or floating action bar).
   - **Mobile (`< 768px`):** Sleek floating bottom navbar / pill dock in the thumb zone, with a minimal top status bar.
3. **Playful and Joyful Voice Rule:**
   - Every headline, helper label, empty state, **joyful success message**, and **playful error message** must follow `docs/02-brand-persona-and-copy.md` and `docs/design.md`.

---

## 4. Folder Ownership and Agent Boundaries (5 Agents)

| Area / Scope | Folder / Path | Responsible Agent |
| :--- | :--- | :--- |
| **Phase and Task Orchestration** | `docs/tasks/`, `plans/`, `decisions.md` | `ghostdrop-orchestrator` |
| **Web and PWA Client** | `src/components/`, `src/pages/`, `src/hooks/` | `ghostdrop-web` |
| **UI Craft, Tokens and Squiggle Motion** | `docs/tokens/`, SVG squiggle draw, SVG icons, playful microcopy | `ghostdrop-ui-polish` |
| **P2P Wire Protocol, 16KB Streamer and SW** | `src/lib/p2p/`, `src/types/protocol.ts`, `src/sw.ts` | `ghostdrop-backend` |
| **Quality Assurance** | Read-only audit across all code and `docs/` | `ghostdrop-qa` |

---

## 5. Single Source of Truth References (`docs/`)

All agents MUST consult `docs/` before starting any task:
- `docs/00-README.md` - Read order and folder map
- `docs/00-prd-source-of-truth.md` - PRD and Shared P2P Wire Protocol
- `docs/design.md` and `docs/04-design-system.md` - Full UI Design System and Squiggle specs
- `docs/01-wireframe-and-pages.md` - Screen-by-screen wireframes and navigation layout
- `docs/02-brand-persona-and-copy.md` - Playful copy deck (errors, successes, empty states)
- `docs/05-motion-spec.md` - Self-drawing SVG squiggle animation and reduced-motion rules
- `docs/06-protocol-and-tech-spec.md` - WebRTC 16KB chunking, backpressure, PWA Share Target
- `docs/07-build-order.md` - Sequential build order
- `docs/08-qa-checklist.md` - 6-Gate QA acceptance checklist
- `docs/stage-design-prompts.md` - Copy-and-paste Stage prompts and attachment guide
