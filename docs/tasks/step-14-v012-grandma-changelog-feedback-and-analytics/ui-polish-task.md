# Step 14: UI Polish Task - Grandma Changelog Styling, Feedback Modal & Public Teleport Counter
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - ui-polish-completed - 2026-10-22

## Assigned Agent
`@ghostdrop-ui-polish`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md`
- `docs/tokens/tokens.css`
- `docs/design.md`
- `docs/02-brand-persona-and-copy.md`
- `docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/brief.md`

## Objectives
1. **Grandma-Friendly Changelog Cards & Date-Time Markers (`web/src/pages/WhatsNew.tsx`):**
   - Display headings in `Laroka` display font.
   - Design chronological release cards with Warm Stone backgrounds, subtle borders, and optional Acid Lime accent on the latest version card.
   - Render a small, distinct date-time marker badge beside each version tag (e.g., `22 Oct 2026, 21:45`) using `font-mono text-xs text-brand-ink-muted`.
   - Feature highlight items with crisp `lucide-react` SVG icons inside circular badges (e.g. `Sparkles` for new feature, `Zap` for speed/performance, `ShieldCheck` for privacy/offline, `Wrench` for bug fixes).
   - Add a subtle decorative self-drawing squiggly line accent (`stroke-dashoffset: 1 -> 0`) in the hero section.
2. **In-App Feedback Modal Styling (`web/src/components/feedback/FeedbackModal.tsx`):**
   - Headings in `Laroka` ("Tell us what is on your mind").
   - Segmented category toggle ("Suggest a Feature" vs "General Thought or Problem").
   - High-contrast text input area with rounded borders and clear focus rings.
   - Primary action button styled in locked Acid Lime (`bg-brand-lime text-brand-ink hover:bg-brand-lime/90 font-bold`).
   - Reassuring microcopy from `docs/02-brand-persona-and-copy.md`: "We read every single note. Zero ads, zero spam, zero databases."
3. **Public Teleport Counter Badge:**
   - Design a compact, celebratory pill badge for `HomeHub.tsx` (e.g., `Over 500+ files teleported safely`).
   - Uses `lucide-react` `Zap` or `CheckCircle2` SVG icon, styled with subtle border and playful typography.
4. **Unread Version Indicator Dot:**
   - Small, pulsing Acid Lime dot rendered beside `v0.11` / `v0.12` in the top navbar and mobile status header when unread updates exist.

---

## Verification Checklist
- [x] Every version card renders a clear date-time marker (e.g., `22 Oct 2026, 21:00`).
- [x] All typography uses `Laroka` for headings and `Plus Jakarta Sans` for body copy.
- [x] Zero technical jargon in any UI text or labels.
- [x] Zero em dashes and zero emojis across all components and copy.
- [x] Squiggly line animations use self-drawing `stroke-dashoffset` only.
