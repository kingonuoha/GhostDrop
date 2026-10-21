---
trigger: always_on
---

# GEMINI.md: Antigravity Kit (GhostDrop)

## COMMUNICATION STYLE (HIGHEST PRIORITY - READ FIRST)

Respond like smart caveman. Cut all filler, keep technical substance.
Drop articles (a, an, the), filler (just, really, basically, actually).
Drop pleasantries (sure, certainly, happy to). No hedging.
Fragments fine. Short synonyms. Technical terms stay exact.
Code blocks unchanged.
Pattern: [thing] [action] [reason]. [next step].

**Exceptions - full explanations allowed when:**
- User says "explain" or asks "why"
- Debugging unfamiliar errors (walk-throughs needed)
- Architecture/design discussions requiring trade-off reasoning

---

## BRAND AND DOCS CONTEXT (READ ONCE PER SESSION)

> **MANDATORY:** Read `.agent/BRAND.md` and `docs/00-README.md` at session start.
> **MANDATORY DOCS REFERENCE:** Every agent MUST check the `docs/` folder (`docs/design.md`, `docs/00-prd-source-of-truth.md`, `docs/01-wireframe-and-pages.md`, `docs/02-brand-persona-and-copy.md`, `docs/05-motion-spec.md`, `docs/06-protocol-and-tech-spec.md`, `docs/tokens/`) before taking any action.

**Quick facts:** GhostDrop - 100% Stateless Ephemeral P2P Device Bridge and PWA. Vite + React 19 + TypeScript + Tailwind CSS v4 + PeerJS/WebRTC (`16KB` chunk streaming) + `lucide-react` SVG icons. Windows/PowerShell only.

---

## PACKAGE.JSON SAFETY (CRITICAL)

1. Check `package.json` before suggesting or installing any package.
2. Never duplicate existing dependencies.
3. Never use bash heredocs (`cat << 'EOF'`) on Windows PowerShell. Always use file Write/Edit tools.

---

## PROJECT SAFETY, BRANDING AND PROTOCOL RULES

- **ZERO EM-DASH AND ZERO EMOJI RULE (P0 - NON-NEGOTIABLE):**
  - Never use a single em dash anywhere in UI copy, code, or docs. Use hyphens (`-`), colons (`:`), or periods (`.`).
  - Never use emojis anywhere in UI copy, badges, buttons, or docs. Always use crisp SVG icons (`lucide-react` or custom SVGs) instead of emojis.
- **Responsive Navigation Architecture (Desktop Top Bar / FAB vs. Mobile Sleek Bottom Navbar):**
  - Desktop (`>= 768px`) uses a floating top pill navbar (or floating action bar).
  - Mobile (`< 768px`) uses a sleek floating bottom navbar / pill dock in the thumb zone, paired with a compact top status header.
- **Locked Brand Assets (`docs/`):**
  - Colors: Acid Lime `#CDF22B` + Electric Cobalt Blue `#1E45FB` + Warm Stone `#EBEAE4`/`#F7F6F2` + Deep Forest `#124B38` + Jet Ink `#0D0F12` (`docs/Brand colours.jpg` and `docs/Woove - Branding line.jpg`).
  - Display Font: `Laroka` (`docs/laroka.otf`) for all headings, 6-char room codes, numerals, and toast headers.
  - Logo: Fluid droplet mark (`docs/Logo icon.jpg`).
- **Signature Squiggly Loop Line (Self-Drawing Animation ONLY):**
  - Implement the looping squiggly line (`docs/Woove - Branding line.jpg` and Swatch 3 of `docs/Brand colours.jpg`) across card backgrounds, hero sections, and the P2P connection bridge.
  - **Animation Rule:** Must animate strictly via SVG `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset: 1 -> 0` so it draws itself into place. **NEVER** use fly-in, fly-out, slide-in, or bounce-in on squiggly lines!
- **Playful and Joyful Copy (Errors and Successes):**
  - Every success message, error state, and empty state must use the joyful, witty voice from `docs/02-brand-persona-and-copy.md` and `docs/design.md` (with SVG icons, zero emojis).
- **Mandatory Design Asset Audit (P0 - Non-Negotiable):**
  - Before building or modifying any UI page or component, read the Stage-exported screen design in `design/` or `docs/design/` (`code.html` and `screen.png`) plus `docs/design.md`.
- **Strict P2P Wire Protocol and Ephemeral Cleanup:**
  - Adhere strictly to `HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK` (`16,384` bytes max with `bufferedAmountLowThreshold` backpressure), `FILE_END`, and `FILE_ACK`.
  - Always call `URL.revokeObjectURL` when an item's TTL expires or the tab closes.

---

## TASK FILE DEVICE STAMP (P0 - Docs Only)

Every agent creating or updating a task file in `docs/tasks/**` must maintain a device stamp directly under the H1:
```markdown
**Device stamp:** `<hostname>` - created - YYYY-MM-DD
```
Append updates with ` · `, keeping the last 5 entries. Never put device stamps in application source code.

---

## INTELLIGENT AGENT ROUTING

1. **Analyze (Silent):** Detect domain from request.
2. **Select Agent(s):** Choose appropriate GhostDrop specialist (`ghostdrop-orchestrator`, `ghostdrop-web`, `ghostdrop-ui-polish`, `ghostdrop-qa`, `ghostdrop-backend`).
3. **Apply:** Operate strictly within the agent's jurisdiction and rule set.

---

## RESPONSE MODE: "12yrold"

**Trigger:** User says `12yrold`.
**Action:** Reply with **exactly one paragraph**, written for a 12-year-old. No jargon, no paths, no SHAs, no bullet lists. Plain words only. State what is happening and what happens next, then stop.
