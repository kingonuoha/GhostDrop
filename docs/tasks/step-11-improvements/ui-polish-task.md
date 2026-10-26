# Step 11: UI Polish Task - Receiver Progress Craft, Arrival Toast Copy, Desktop Timer Popover, QR Drawer and Action Bar Polish
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-21

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
- `docs/tasks/step-11-improvements/brief.md`
- `docs/tasks/step-11-improvements/web-task.md`

## Objective
Ensure all 10 Step 11 UX additions meet GhostDrop's locked visual design system, Grandma 2-Second Rule, accessibility standards, and playful copy deck:
1. **Add `SUCCESS_FILE_RECEIVED` to the Copy Deck (`docs/02-brand-persona-and-copy.md` and `web/src/lib/copyDeck.ts`):**
   - Key: `SUCCESS_FILE_RECEIVED`
   - Icon: `Download` (or `CheckCircle2`)
   - Headline (`Laroka`): `New file arrived!`
   - Body (`Plus Jakarta Sans`): `{fileName} just landed on your screen.`
   - Action Label: `Save`
2. **Polish `TransferCard.tsx` Multi-Action Layout (`Copy` / `Share` / `Save` / `Open` / `Remove now`):**
   - Verify that adding the `Trash2` (`Remove item now`) button, `ExternalLink` (`Open`) link pill, and `Show full note` toggle keeps every interactive control at `>= 44x44px` touch target size with zero horizontal overflow at `360px`, `768px`, `1024px`, and `1440px`.
   - Ensure the receiving progress card (`Receiving... {percent}%`) uses the data-bound `<ProgressSquiggle />` (`pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset: 1 - clamped`) and respects `prefers-reduced-motion: reduce`.
3. **Polish Desktop Top Bar Timer Popover (`DesktopTopPillBar.tsx`) & In-Room QR Drawer (`ConnectionBridge.tsx`):**
   - Ensure the Desktop `Auto-delete` popover matches the Warm Stone / Acid Lime active chip aesthetic of `MobileBottomDock.tsx`, supports `Escape` and outside-click dismissal, and maintains `2px solid var(--color-cobalt-400)` `:focus-visible` outlines.
   - Ensure the collapsible QR panel on `ConnectionBridge.tsx` and the compact `<SquiggleConnectionBridge />` on `MobileJoin.tsx` maintain card color rhythm (`lime`, `cobalt`, `warm stone`, `surface`) and squiggle safe zones.
4. **Polish 5-Second Emptying Toast Progress Bar & Clean `HowItWorks.tsx` Layout:**
   - Style the 5-second emptying progress bar at the bottom of `FeedbackCard` (when rendered inside `RoomToast` or `Toast`) with `@keyframes toast-progress-empty` (`transform-origin: left; transform: scaleX(1) -> scaleX(0)` over `5000ms linear`), using contrasting brand tokens (`bg-brand-cobalt` on lime/surface/warning toasts, `bg-brand-error` on error-tint toasts) and respecting `prefers-reduced-motion: reduce` (where the toast still auto-dismisses at 5s without rapid motion).
   - Verify `HowItWorks.tsx` spacing and heading hierarchy (`H1` -> `H2` steps -> `H2` bottom question card, with zero skipped heading levels) after removing the `Kind language for peace of mind` section.

---

## Verification Checklist
- [x] `SUCCESS_FILE_RECEIVED` is documented in `docs/02-brand-persona-and-copy.md` and implemented in `web/src/lib/copyDeck.ts` and `web/src/components/room/FeedbackNotice.tsx`.
- [x] All interactive controls in `DesktopTopPillBar`, `ConnectionBridge`, `TransferFeed`, and `TransferCard` measure `>= 44px` in both dimensions and have visible `:focus-visible` rings.
- [x] `HowItWorks.tsx` has the `Kind language for peace of mind` section removed and maintains clean heading hierarchy (`H1` -> `H2`).
- [x] All toasts display the 5-second emptying progress bar (`100% -> 0%`) and auto-dismiss after `5000ms`.
- [x] Zero horizontal overflow (`scrollWidth === clientWidth`) across `/`, `/room/GHST48`, `/join?room=GHST48`, and `/how-it-works` at `360px`, `768px`, `1024px`, and `1440px`.
- [x] Zero em dashes (`U+2014`), zero en dashes (`U+2013`), zero emojis, zero technical jargon in rendered DOM text, and all squiggles animate exclusively via `stroke-dashoffset`.
- [x] `npm run type-check`, `npm run lint`, and `npm run build` in `web/` exit `0`.
