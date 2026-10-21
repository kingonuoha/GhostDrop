# Step 08: QA Brand Motion and Copy Polish Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `docs/08-qa-checklist.md` (Gate 1 & Gate 2)
- `docs/02-brand-persona-and-copy.md`
- `docs/05-motion-spec.md`

## Objective
Audit and verify Grandma 2-Second Rule compliance, playful copy voice, zero em dashes, zero emojis, self-drawing squiggle animation, and reduced motion accessibility.

## QA Checklists
- [x] Complete codebase scan verifying zero em dashes in source files, copy, and markup.
- [x] Complete codebase scan verifying zero emojis in source files, copy, and markup.
- [x] Confirm all icon placements use clean SVG icons (`lucide-react` or custom inline SVGs).
- [x] Verify squiggly lines animate strictly via SVG `pathLength="1"` and `stroke-dashoffset: 1 -> 0`.
- [x] Confirm no fly-in, fly-out, slide-in, or bounce-in animations on squiggly lines.
- [x] Verify `prefers-reduced-motion: reduce` renders squiggly paths with `stroke-dashoffset: 0` immediately without animation.
- [x] Confirm all visible UI text adheres to the Grandma 2-Second Rule with plain human words only.

## Outcome
GATE PASS, zero blockers. Report: `qa-report.md`.
- 61 source files with zero codepoints above U+007F, so zero em dash, en dash, emoji, curly quotes.
- 16 rendered DOM runs across 19 jargon terms: zero hits.
- 100 squiggle paths, all `pathLength="1"`, dasharray 1, no transform animation.
- Reduced motion: offset 0, animation none, transitions 1ms.
- 16 route and width combinations: zero horizontal overflow.
- type-check, lint, build all exit 0.
- Follow-ups: 7 LOW and 6 INFO, none gate blocking.
