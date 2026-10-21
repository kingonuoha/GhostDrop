# Step 02: QA App and Tokens Scaffold Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-20

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `docs/08-qa-checklist.md` (Gate 1 Brand Tokens & Gate 6 Build Health)
- `docs/tokens/tokens.css`
- `docs/tokens/tokens.json`
- `docs/05-motion-spec.md`

## Objective
Verify that the `web/` application scaffold, brand tokens, `Laroka` font, and foundational components meet quality requirements.

## QA Checklists
- [x] Verify `web/` directory structure conforms to Vite + React 19 + TypeScript + Tailwind CSS v4 standards.
- [x] Confirm `Laroka` font file exists in `web/public/fonts/laroka.otf` and `@font-face` is properly defined.
- [x] Verify all CSS color variables match locked values (`#CDF22B`, `#1E45FB`, `#F7F6F2`, `#EBEAE4`, `#0D0F12`, `#124B38`).
- [x] Audit `<SquiggleLine />` and `<SquiggleCardBg />` SVG elements to ensure animation uses strictly `pathLength="1"` and `stroke-dashoffset: 1 -> 0`.
- [x] Verify zero occurrences of em dashes in scaffold files.
- [x] Verify zero occurrences of emojis in scaffold files; crisp SVG icons used throughout.
- [x] Verify `npm run type-check` and `npm run build` pass with zero errors in `web/`.

## Outcome
GATE PASS. 0 P0, 0 P1, 8 P2. Report: `qa-report.md`. Build: 1948 modules, CSS 28.21 kB, JS 249.15 kB, 8 precache entries. P2 follow-ups deferred as noted in the report.
