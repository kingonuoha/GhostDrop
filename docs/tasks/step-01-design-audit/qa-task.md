# Step 01: QA Design Audit Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-20

## Assigned Agent
`@ghostdrop-qa`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/08-qa-checklist.md` (Gate 1 & Gate 2)
- `docs/design.md`
- `docs/01-wireframe-and-pages.md`

## Objective
Audit all 8 Stage screen folders in `docs/design/` against locked design tokens, layout hierarchy, and copy rules.

## QA Checklists
- [x] Confirm all 8 Stage screen directories contain valid `screen.png` and `code.html` references.
- [x] Verify zero emojis across all Stage design templates and text.
- [x] Verify zero em dashes across all Stage design templates and text.
- [x] Verify single-line room code representation on desktop hubs.
- [x] Verify 3-tab sleek floating bottom navbar layout in mobile designs.
- [x] Sign off on Step 01 design audit readiness. Conditional: signed off as layout reference gate under `decisions.md` D-010. Brand drift inside the immutable exports is not carried into `web/src/`.

## Outcome
`qa-report.md` recorded the raw export drift (Syne substitution, cobalt and canvas drift, Material 3 ramp, Material Symbols icons, jargon chrome, no self-draw keyframes). Orchestrator resolution: `decisions.md` D-010.
