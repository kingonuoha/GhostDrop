# Step 05: QA Desktop Hub and Connected Workspace Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `docs/08-qa-checklist.md` (Gate 1, 2, and 6)
- `docs/01-wireframe-and-pages.md` (Screen 1 Desktop Home Hub and Screen 2 Connected Workspace)
- `docs/design/ghostdrop_ultra_clean_desktop_hub_grandma_edition/`
- `docs/design/ghostdrop_connected_workspace_grandma_friendly/`

## Objective
Verify visual fidelity, navigation responsiveness, clipboard paste, dropzone, and shared feed on desktop viewports.

## QA Checklists
- [ ] Verify Desktop Floating Top Pill Bar renders correctly at `>= 768px`.
- [ ] Confirm single-line 6-character room code `G H O S T 8` fits on one row without line breaks across desktop widths.
- [ ] Verify 2-card desktop layout matching `ghostdrop_ultra_clean_desktop_hub_grandma_edition`.
- [ ] Verify `<SquiggleConnectionBridge />` links host and connected devices in `/room/:code`.
- [ ] Verify global `Ctrl+V` paste beams text and clipboard images.
- [ ] Verify Grandma 2-Second Rule: zero technical jargon on screen, plain human labels only.
- [ ] Verify zero em dashes and zero emojis throughout desktop views.
