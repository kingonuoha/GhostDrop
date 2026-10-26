# AGENTS.md: GhostDrop Web and PWA Ecosystem

> **STOP. READ `.agent/rules/GEMINI.md`, `.agent/BRAND.md`, AND `docs/00-README.md` FIRST.**
> Every agent MUST consult the `docs/` folder before taking any action to ensure 100% alignment with our locked branding, wireframes, playful copy deck, navigation rules, and P2P wire protocol.

---

## 1. Project Overview and Architecture

**GhostDrop** is a zero-cost (`$0.00/mo`), 100% stateless, ephemeral peer-to-peer (P2P) device bridge and self-destructing file, screenshot, and clipboard teleportation Web App and Installable PWA.
- **Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 + `vite-plugin-pwa` + `peerjs` (`0.peerjs.com` default with clean adapter abstraction for Supabase Realtime Broadcast) + `qrcode.react` + `jsqr` + `lucide-react` (SVG icons).
- **Current Scope (Phase 1):** Web and PWA connection between laptop, phone, tablet, or any device at all (multi-peer room support, 16KB chunked WebRTC streaming, PWA Web Share Target API, built-in In-App QR Scanner, and local in-memory TTL auto-expiry). The native Android app (Phase 2) is deferred.

### Repository Structure

```text
.agents/        Antigravity Kit (.agent is a directory junction to .agents)
  agents/       GhostDrop agent definitions (GhostDrop/orchestrator.md, web.md, ui-polish.md, qa.md, backend.md)
  rules/        Core operating rules (GEMINI.md)
  skills/       Trimmed domain skills for Web, PWA, UI craft, TypeScript, and QA
  workflows/    Standardized slash workflows
design/         Exported Stage/Stitch UI page designs (also mirrored at docs/design/)
docs/           Single Source of Truth (MANDATORY reading before any task)
  Brand colours.jpg           Locked Acid Lime (#CDF22B), Electric Cobalt (#1E45FB) and Swatch 3 squiggle card
  Logo icon.jpg               Locked Electric Cobalt fluid droplet logo mark
  Woove - Branding line.jpg   Locked signature looping squiggly line ("The Woove Line")
  laroka.otf                  Locked chunky display font ("Laroka")
  design.md                   Master Brand, Token, Squiggle Line and Playful UI Design System
  stage-design-prompts.md     Detailed copy-and-paste prompts and attachment checklist for Stage
  00-README.md                Handoff pack overview and read order
  00-prd-source-of-truth.md   Product Requirements and Shared P2P Wire Protocol
  01-wireframe-and-pages.md   Screen wireframes, navigation bars, and component hierarchy
  02-brand-persona-and-copy.md Playful/joyful voice, error and success message deck (zero emojis, zero em dashes)
  04-design-system.md         Component and token checklist
  05-motion-spec.md           Self-drawing SVG squiggle line animation spec
  06-protocol-and-tech-spec.md WebRTC 16KB chunking, backpressure, PWA Share Target
  07-build-order.md           Sequential 9-step build gates
  08-qa-checklist.md          6-gate QA verification checklist
  tokens/                     tokens.json and tokens.css
  tasks/                      Per-phase agent task files and QA reports
plans/          Phase planning documents
decisions.md    Locked architecture, protocol, and branding decisions
opencode.jsonc  OpenCode V2 agent routing configuration
```

---

## 2. Standard Dev Commands (Vite + React + TypeScript)

```bash
npm run dev         # Start Vite dev server
npm run build       # Production typecheck + Vite PWA bundle build
npm run preview     # Preview production PWA build locally
npm run lint        # ESLint check
npm run type-check  # tsc --noEmit
```

---

## 3. Core Brand, UI, Copy and Protocol Rules (Non-Negotiable)

1. **ZERO EM DASHES AND ZERO EMOJIS RULE (P0 - STRICT BAN):**
   - **Never use a single em dash** anywhere in UI copy, error messages, code comments, or rendered pages. Use standard hyphens (`-`), colons (`:`), periods (`.`), or commas instead.
   - **Never use emojis anywhere** in UI copy, buttons, badges, toasts, or pages. Whenever an expressive indicator is needed, **always use clean SVG icons** (`lucide-react` icons or custom SVG icons) inside styled pill/circle badges.
2. **Responsive Navigation Rule (Desktop Top Bar / FAB vs. Mobile Sleek Bottom Navbar):**
   - **Desktop (`>= 768px`):** Render a sleek floating top pill navbar (or floating action bar) containing the brand mark, workspace navigation, TTL selector pill, and primary pair/scan CTA.
   - **Mobile (`< 768px`):** Render a minimal top status header (logo + active room pill) and a **sleek floating bottom navbar / dock** anchored in the thumb zone (`Teleport Hub`, `Scan QR`, `TTL Timer`, `Install PWA`). Never show a desktop top link bar on mobile or a mobile bottom navbar on desktop.
3. **Locked Brand Palette and `Laroka` Font (`docs/Brand colours.jpg`, `docs/laroka.otf`, `docs/Woove - Branding line.jpg`):**
   - **Acid Lime (`#CDF22B`)** + **Electric Cobalt Blue (`#1E45FB`)** + **Warm Stone (`#F7F6F2` / `#EBEAE4`)** + **Deep Forest (`#124B38`)** + **Jet Ink (`#0D0F12`)** + **Crisp White (`#FFFFFF`)**.
   - Display headings, 6-character room codes, numerals, and toast headers MUST use **`Laroka`** (`docs/laroka.otf`).
   - All styling must reference CSS variables/tokens in `docs/tokens/tokens.css` and `docs/tokens/tokens.json`.
4. **Signature Squiggly Loop Line and Self-Drawing Animation (`docs/Woove - Branding line.jpg` and `docs/design.md`):**
   - The continuous looping squiggly line is a core brand signature across hero backdrops, individual card backgrounds, and the P2P connection bridge.
   - **CRITICAL ANIMATION RULE:** The squiggly line MUST animate as if being drawn into place from start to finish using SVG `pathLength="1"`, `stroke-dasharray: 1`, and `stroke-dashoffset: 1 -> 0` (`@keyframes squiggle-draw`). **NEVER** use fly-in, fly-out, slide-in, or bounce-in animations on the squiggly line!
5. **Playful, Joyful Tone on All Copy (Especially Errors and Successes):**
   - All UI microcopy, empty states, **success messages**, and **error messages** must follow the warm, witty, joyful tone in `docs/02-brand-persona-and-copy.md` and `docs/design.md` (paired with SVG icons, never emojis or em dashes). Never display raw technical error strings or plain browser `alert()` boxes.
6. **Mandatory Design Asset Audit (P0 - Non-Negotiable):**
   - Before building or modifying any UI page or component, agents MUST check `design/` and `docs/design/` for Stage-exported designs (`code.html` / `screen.png`) and read `docs/design.md` in full.
7. **Strict Shared P2P Wire Protocol and 16KB Backpressure (`docs/06-protocol-and-tech-spec.md`):**
   - All WebRTC `RTCDataChannel` transfers must strictly adhere to `HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK` (`16,384` bytes max with `bufferedAmountLowThreshold` backpressure control), `FILE_END`, and `FILE_ACK`.
   - When an item's TTL expires or the tab closes, `URL.revokeObjectURL` must be called immediately so zero bytes linger in browser RAM.

---

## 4. Agent Delegation Matrix (5 Agents)

| Agent | Ownership / Scope | Restrictions |
| :--- | :--- | :--- |
| **`ghostdrop-orchestrator`** | `docs/tasks/`, `plans/`, `decisions.md`, phase gates | Never writes application code in `src/` |
| **`ghostdrop-web`** | Web and PWA screens, desktop top bar / FAB, mobile sleek bottom navbar, QR pairing, dropzone, feed | Never breaks wire protocol types |
| **`ghostdrop-ui-polish`** | `docs/tokens/`, `Laroka` font, self-drawing SVG squiggle lines, SVG icons, playful microcopy and motion | Never modifies P2P protocol or WebRTC chunking logic |
| **`ghostdrop-backend`** | `src/lib/p2p/`, `src/types/protocol.ts`, `src/sw.ts`, WebRTC 16KB streamer, signaling adapters, TTL engine | Never modifies visual card layouts |
| **`ghostdrop-qa`** | Read-only audit across all code and docs | Writes ONLY `docs/tasks/<slug>/qa-report.md` |

---

## 5. Versioning and GitHub Main-Branch Bump Rule (P0)

1. **Current Baseline Version:** `0.16` (`v0.16`), synced in `web/package.json` (`"version": "0.16"`) and `APP_VERSION = '0.16'` in `web/src/lib/constants.ts`. Step 11 shipped 0.14, and the 0.16 fix batch (progress wave, shared timer, burn notice, offline pairing card) added no dependencies.
2. **Navbar Display:** Render the baseline as small display text directly beside the `GhostDrop` wordmark in `<Logo />` on both Desktop (`DesktopTopPillBar`) and Mobile (`MobileStatusHeader`). The version is read from `APP_VERSION`, never hardcoded in a component.
3. **Version Anatomy (`<whole>.<decimal>`):**
   - **Whole number (`X` in `X.Y`):** Increments whenever a **new dependency** is installed in `web/package.json` (and resets `.Y` to `.0`, or `.1` for the first task in that major version).
   - **Decimal place (`Y` in `X.Y`):** Represents the cumulative number of tasks/fixes completed in the current whole-number version. For minor fixes, features, or polish without adding a new dependency, increment the decimal place (e.g., `0.13 -> 0.14`).
   - Every bump must also add a matching `CHANGELOG_RELEASES` entry in `web/src/lib/changelog.ts` with a small `DD MMM YYYY, H:MM AM/PM` marker, grandma-friendly wording, and no technical jargon.
4. **GitHub Main Push Mandate:** Whenever pushing changes to the `main` branch on GitHub for `web/`, agents MUST bump the version number in `web/package.json` and `web/src/lib/constants.ts` according to this rule before pushing.

---

## 6. Task File Device Stamp (P0 - Docs Only)

Every agent creating or updating a task file in `docs/tasks/**` must maintain the device stamp on the first line below the H1:

```markdown
**Device stamp:** `<hostname>` - created - YYYY-MM-DD
```

Append updates with ` · `, retaining the last 5 entries. Never put device stamps in application source code.

---

## 7. Out-of-Scope Breakage Protocol

If a task encounters pre-existing breakage outside its scope:
1. **STOP** and surface it prominently in completion notes.
2. Minimal quarantine repair is permitted ONLY if it blocks your task verification, labeled `OUT-OF-CONTRACT REPAIR`.
3. Never perform silent drive-by refactors on unrelated code.

---

## 8. Response Mode: "12yrold"

**Trigger:** User says `12yrold`.
**Action:** Reply with **exactly one paragraph**, written for a 12-year-old. No jargon, no paths, no SHAs, no bullet lists. Plain words only. State what is happening and what happens next, then stop.
