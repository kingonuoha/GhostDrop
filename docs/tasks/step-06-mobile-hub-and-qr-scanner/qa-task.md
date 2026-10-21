# Step 06: QA Mobile Hub and QR Scanner Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `docs/08-qa-checklist.md` (Gate 1, 2, and 5)
- `docs/01-wireframe-and-pages.md` (Screen 3 Mobile Hub, Screen 4 QR Scanner Modal, Screen 5 How It Works)
- `docs/design/ghostdrop_mobile_grandma_friendly_hub/`
- `docs/design/connect_to_your_screen_modal/`
- `docs/design/how_ghostdrop_works_grandma_friendly_3_steps_1/`
- `docs/design/how_ghostdrop_works_grandma_friendly_3_steps_2/`

## Objective
Verify mobile layout, sleek bottom floating navbar dock, camera QR scanner, single-row 6-letter input, and `/how-it-works` pages.

## QA Checklists
- [x] Verify Sleek Floating Bottom Navbar renders strictly on mobile (`< 768px`) in thumb zone and hides on desktop.
- [x] Confirm Desktop top navigation is hidden on mobile screens.
- [x] Verify In-App QR Scanner modal with `jsQR` operates camera cleanly.
- [x] Verify single-row 6-letter code input (`[G] [H] [O] [S] [T] [8]`) works with keyboard input.
- [x] Verify camera-shy fallback displays playful reassurance without raw browser errors.
- [x] Verify `/how-it-works` renders 3-step visual cards linked by self-drawing squiggle line and 3 friendly alert cards.
- [x] Verify zero em dashes and zero emojis across all mobile views and modals.

## Outcome
GATE PASS. Reports: `qa-report.md`. Manifest `share_target` and install icons deferred to Step 07 by design. Repair Round 1 replaced the invalid `GHOST8` runtime default (D-013), fixed paste normalization, removed the last raw hex, and added assertive announcement for camera failure.
