# Step 10: UI Polish Task - v0.7 Badge Craft, File Card Copy/Share/Save Layout, Copy Deck Alignment and Step 08 Residual Polish
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21 · `ASUS-LAPTOP-DNLA241D` - ui-polish-complete - 2026-10-21

## Assigned Agent
`@ghostdrop-ui-polish`

## Workspace Target
`web/` and `docs/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md` (`D-005` through `D-014`)
- `docs/design.md`
- `docs/01-wireframe-and-pages.md`
- `docs/02-brand-persona-and-copy.md`
- `docs/05-motion-spec.md`
- `docs/tasks/step-08-brand-motion-and-copy-polish/qa-report.md` (Findings `S-01` through `S-06`)
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/brief.md`
- `docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/web-task.md`

## Objective
Polish the visual craft, responsive layout, copy deck consistency, and accessibility of all Step 10 UI updates while closing the low-severity residual polish items (`S-01` through `S-06`) from the Step 08 QA report:
1. **`v0.7` Navbar Version Pill Styling:** Ensure the `v0.7` badge beside `GhostDrop` in `<Logo withWordmark />` uses `Laroka` or `JetBrains Mono` (`var(--font-mono)` / `.type-numeral`), sits in balanced alignment on both Desktop (`DesktopTopPillBar`) and Mobile (`MobileStatusHeader`), and causes zero horizontal overflow at `360px` and `768px`.
2. **Card Heading Deduplication & Copy Deck Sync:** Update `docs/02-brand-persona-and-copy.md` (`lines 28, 31`) and verify `RoomCodeCard.tsx` and `HomeHub.tsx` so card titles read `Scan with your phone` (or `Scan with your other screen` on mobile) and `Pick what to send` without repeating `1.` and `2.` beside the `<OrbBadge>` circles.
3. **Image & File Card Action Bar (`Copy`, `Share`, `Save`):** Polish `TransferCard.tsx` so image and file cards present a clean, grandma-simple action group:
   - Primary action for images: `Copy` (`Copy` / `Check` SVG icon in `<NestedPillButton>`).
   - Secondary actions: `Share` (`Share2` SVG icon) and `Save` (`Download` SVG icon) styled as 44x44px minimum accessible circular/pill buttons with clear labels or `aria-label`s, zero crowding at `360px`, and thumbnail preview inside the 56x56px (`h-14 w-14`) rounded frame.
4. **Close Step 08 QA Low Findings (`S-01` to `S-06`):**
   - **S-01:** In `TransferCard.tsx`, use `copy.body` from `buildFeedback('ERR_CHUNK_INTERRUPTED')` for inline failed transfers instead of a divergent hardcoded string.
   - **S-02:** Keep all helper lines concise and grandma-simple.
   - **S-03:** Remove unused `.ttl-dissolve` and `@keyframes ttl-dissolve` dead CSS from `web/src/index.css` (or wire it cleanly).
   - **S-04:** In `web/src/index.css`, keep `transform: translate(-50%, -50%)` on `.squiggle-tip-pulse` under `@media (prefers-reduced-motion: reduce)` so the idle bridge midpoint dot stays centered on the squiggle line.
   - **S-05:** Add `id` to the mobile timer dialog panel in `MobileBottomDock.tsx` and wire `aria-controls` on the timer tab button.
   - **S-06:** Highlight the appropriate state or keep navigation clear when viewing `/how-it-works` on mobile.

---

## Verification Checklist
- [x] `v0.7` badge beside `GhostDrop` renders cleanly on both Desktop (`>= 768px`) and Mobile (`< 768px`) with zero overflow at `360px`, `768px`, `1024px`, and `1440px`.
- [x] No card on `/` or `/how-it-works` duplicates the step number in both `<OrbBadge>` and the `<h2>` heading text; `docs/02-brand-persona-and-copy.md` is updated to match.
- [x] Image and file cards in `TransferCard.tsx` display `Copy`, `Share`, and `Save` with `>= 44px` touch targets, `lucide-react` SVG icons at `strokeWidth={2}`, and zero horizontal overflow on a `360px` mobile screen.
- [x] Step 08 QA findings `S-01`, `S-03`, `S-04`, and `S-05` are resolved.
- [x] Zero em dashes (`U+2014`), zero en dashes (`U+2013`), zero emojis, zero raw hex outside `tokens.css`, and all squiggly lines animate strictly via `pathLength="1"` and `stroke-dashoffset: 1 -> 0`.
- [x] `npm run type-check`, `npm run lint`, and `npm run build` in `web/` exit `0`.
