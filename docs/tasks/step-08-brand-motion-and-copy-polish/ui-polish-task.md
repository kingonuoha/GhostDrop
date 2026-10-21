# Step 08: Brand Motion and Copy Polish Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · `ASUS-LAPTOP-DNLA241D` - updated - 2026-10-21

## Assigned Agent
`@ghostdrop-ui-polish`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/01-wireframe-and-pages.md`
- `docs/02-brand-persona-and-copy.md`
- `docs/05-motion-spec.md`
- `docs/design.md`

## Objective
Audit and polish Grandma 2-Second Rule compliance across all components in `web/`, eliminate all technical jargon on screen, verify zero emojis and zero em dashes across all files, ensure squiggly line safe zones, verify self-drawing animation and `prefers-reduced-motion` compliance.

## Checklists
- [x] Verify Grandma 2-Second Rule: All titles under 5 words, helpers under 10 words, plain human words only.
- [x] Audit for technical jargon: Zero instances of `WebRTC`, `16KB chunks`, `URL.revokeObjectURL`, `TTL`, `FILE_ACK`, `PWA`, or `Backpressure` in visible UI copy.
- [x] Audit for zero emojis: Verify all icons use `lucide-react` or custom SVG elements inside styled pill/circle badges.
- [x] Audit for zero em dashes: Verify hyphen, colon, or period usage only.
- [x] Verify squiggly lines only animate via SVG `pathLength="1"` and `stroke-dashoffset: 1 -> 0` (zero fly-in/bounce-in).
- [x] Verify squiggly line safe zones: No text overlapping or legibility issues.
- [x] Verify `prefers-reduced-motion: reduce` renders squiggly lines at `stroke-dashoffset: 0` without animation.
- [x] Verify `Laroka` font renders consistently on all headings, codes, and numerical badges.

## Implementation Contract (Orchestrator, binding)
- Audit scope: `web/src/**` plus `web/index.html`, `web/public/favicon.svg`. Do not edit `web/src/lib/p2p/`, `web/src/types/protocol.ts`, `web/src/sw.ts`, `web/src/lib/shareHandoff.ts`, or `vite.config.ts`. Report functional defects instead of changing protocol or worker code.
- Fix carried polish items where they are pure UI:
  1. Reduced-motion partial squiggle must resolve to `stroke-dashoffset: 0` immediately (Step 02 QA P2).
  2. Squiggle tip pulse and any transform animation must be disabled under reduced motion.
  3. Laroka must apply to all numerals in orb badges, countdowns, and room codes.
  4. Card color rhythm: lime, cobalt, warm stone, crisp surface. No row of identical white cards.
  5. Copy deck wording must match `docs/02-brand-persona-and-copy.md` exactly for every rendered string.
  6. Remove dead code or unused styles discovered during the audit, but no speculative refactors.
- Enforce: no `TTL`, `PWA`, `P2P`, `WebRTC`, `chunk`, `ACK`, `payload`, `telemetry`, `crypto`, `zero-knowledge`, `E2EE` in rendered copy. These words may appear only in code identifiers, comments, or docs.
- Enforce: all squiggle paths `pathLength="1"` + `stroke-dasharray: 1` + `stroke-dashoffset` driven draw or data progress. No fly-in, slide-in, bounce, scale entrance, or `translate` entrance on an SVG squiggle.
- Safe zones: decorative squiggle never crosses body text; card squiggles clipped by the card radius at low opacity.
- Validate at 360, 768, 1024, and 1440 with zero horizontal overflow and no clipped controls.
- Zero em dashes, zero emojis, zero `alert()`, zero `any`.

---

## Completion Notes

**Status:** COMPLETE. All Step 08 checklist items closed. Every carried pure-UI finding from Steps 02, 04, 05, 06, and 07 is either fixed here or recorded as residual with a reason.

**Scope touched:** `web/src/index.css`, `web/src/styles/tokens.css`, `web/src/components/**` (brand, nav, pwa, qr, room, ui), `web/src/pages/**`. No file under `lib/p2p/`, `types/protocol.ts`, `sw.ts`, `lib/shareHandoff.ts`, or `vite.config.ts` was edited. No dependency added.

### 1. Copy changes (before, after)

| Location | Before | After | Why |
| :--- | :--- | :--- | :--- |
| `HomeHub.tsx` send card status pill | `Waiting for your phone...` | `Waiting for your phone` | Trailing ellipsis is punctuation noise, not a loading state |
| `HowItWorks.tsx` step 1 body | `Point your phone camera at the code on your other screen to link them together.` (16 words) | `Point your phone camera at the code on your other screen.` (10 words) | Card body budget is 15 words, helper budget is 10 |
| `InstallCard.tsx` body | `Add it once, then open it right from your home screen.` | `Next time, open GhostDrop right from your home screen.` | Now the exact `SUCCESS_PWA_INSTALLED` body from `docs/02` |
| `MobileJoin.tsx` composer placeholder | `Paste or type a note...` | `Type or paste a link or note...` (deck literal, via the shared default) | Copy deck exactness |
| `DesktopTopPillBar.tsx` timer pill, 768 to 1023 px | Rendered nothing (pill was `lg` only) | `50 Mins` compact pill | Closes Step 02 P2-6: no auto-delete control in that band |
| `DesktopTopPillBar.tsx` timer pill, 1024 px and up | `Auto-delete: 50 mins` from `lg` | `Auto-delete: 50 mins` from `lg` (unchanged wording) | Deck literal kept, only the breakpoint moved earlier |

Rendered-string scan across `/`, `/room/8STB5D`, `/join?room=8STB5D`, `/how-it-works` at 360 and 1440: `0` jargon hits (`WebRTC`, `P2P`, `TTL`, `PWA`, `chunk`, `ACK`, `payload`, `telemetry`, `crypto`, `E2EE`, `Backpressure`, `revokeObjectURL`, `PeerJS`, `DataChannel`, `SCTP`), `0` em or en dashes, `0` emojis, `0` curly quotes.

### 2. Motion changes (before, after)

| Location | Before | After | Why |
| :--- | :--- | :--- | :--- |
| `index.css` reduced motion, partial squiggle | `stroke-dashoffset: var(--squiggle-offset, 0.5)`, so the idle bridge parked half drawn | `stroke-dashoffset: 0 !important`, fully drawn at once | Step 02 P2-4, Gate 6 wording |
| `index.css` tip dot pulse | `scale(0.85)` to `scale(1.15)` loop, opacity loop | Opacity only, `0.35` to `0.95`, no transform | Step 02 P2-5, no transform animation in the squiggle layer |
| `index.css` reduced motion, tip dot | Static `opacity: 0.6`, transform `none` | `animation: none`, `opacity: 0.9`, transform `none` | Idle pulse fully disabled |
| `index.css` reduced motion, global | Only named keyframes were neutralised, so `transition-transform` and `active:scale-[0.97]` still animated | All `animation-*` and `transition-duration` collapse to `1ms`; every squiggle class forced to offset `0` | Step 05 L-06, `docs/05-motion-spec.md` 1.4 |
| `ConnectionBridge.tsx` card backdrop | `animate={false}`, a static fully drawn line | Self-drawing `squiggle-path-draw` | Step 02 P2-3, every squiggle draws itself |
| `SquiggleLine.tsx` | Unused `duration` prop with animation override | Removed | Dead code, contract item 6 |

Squiggle verification at all 16 route and width combinations: `0` paths missing `pathLength="1"`, `pathLength`/`stroke-dasharray` present on every path, `0` transform, translate or scale animations on a squiggle. Idle bridge keyframe end state measured at `0.5px`; draw keyframe end state measured at `0px` (drawn) through the Web Animations API.

### 3. Card rhythm, icons, nav, buttons

| Area | Before | After |
| :--- | :--- | :--- |
| Auto-delete picker (`TtlPicker.tsx`) | White surface pill | Warm stone control with lime active chip, matching `docs/design.md` section 3 item 3 (settings live on warm stone) |
| Install card | White surface card | Warm stone card with a forest squiggle |
| Connection bridge card | White surface card | Warm stone card with a forest squiggle (connected devices skin) |
| Feed note cards | Every note card white | White and warm stone alternate by position, so no row of identical white cards |
| Feed file cards | Flat lime card | Lime card with a cobalt watermark squiggle at 14 percent |
| Sending and cleared rows | Warm stone, no squiggle | Warm stone with a forest squiggle at 8 to 9 percent |
| Peer device chip on the bridge | Warm stone chip on a warm stone card | White chip on warm stone |
| Room code copy button, copied state | Lime icon on a lime card (Step 05 L-03) | Jet Ink pill with a lime check icon |
| Lucide icon stroke width | Mixed `2.1` to `2.6` | Uniform `2` on every lucide icon (16 files). Brand line widths (`28`, `36`, `30`, `5`, `4`) untouched |
| Desktop nav active item | `bg-brand-lime-tint` | `bg-brand-lime`, matching the mobile dock |
| Mobile dock timer panel | Escape handler lived on the panel, so it never fired while focus was on the tab | Escape handled on the dock wrapper, focus moves to the selected preset, closing restores focus to the tab |

### 4. Safe zones and contrast

| Change | Detail |
| :--- | :--- |
| Hub cobalt card squiggle | Moved from `top-right` (behind the status pill and H2 lane) to `bottom-right` under the opaque timer pill, opacity `0.18` to `0.14` |
| Join cards squiggle | Moved from `top-right` to `bottom-right`, opacity `0.2` and `0.18` to `0.12` |
| Hub status pill | `bg-white/15` to `bg-brand-ink/25`, so white text keeps contrast over any squiggle behind it |
| Cobalt card helper and eyebrow copy | `text-white/70` and `text-white/75` raised to `text-white/85` (the `/70` pair measured 3.85:1, under AA) |
| Card squiggles | Every one stays inside an `overflow-hidden` rounded card and sits at 5 to 22 percent opacity, so no squiggle crosses body text |

Measured WCAG AA contrast failures: `0` on all four routes at 360 and 1440 (alpha composited text colour against the computed card background, large-text rules applied).

### 5. Typography and accessibility

| Change | Detail |
| :--- | :--- |
| `.room-code` utility | Laroka, `0.14em` tracking, tabular figures, never wraps. Used on the hub card, the bridge and the phone footer (Step 02 P2-8) |
| `.type-numeral` utility plus `ui/Numerals.tsx` | Countdown digits and percentages render in Laroka while the words around them stay Plus Jakarta Sans (Step 05 L-01) |
| File size chip | JetBrains Mono, the allowed byte-counter role |
| `FeedbackCard` heading level | New `headingLevel` prop. Page-level error cards use `h2`, section cards keep `h3`, so no page skips a heading level (Step 02 P2-7) |
| Room code announcement | `aria-label` removed from a plain span, replaced with a spaced visual code plus an `sr-only` `Room code XXXXXX` (Step 05 L-07) |
| QR scanner dialog | Page chrome marked `inert` while open, restored on close (Step 06 F-04), plus an always-mounted `aria-live="assertive"` region so a camera failure is announced |
| Mobile status header | Room code now renders in Laroka |

Heading order per page: `/` H1,H2,H2. `/room` H1,H2,H2,H3. `/join` H1,H2. `/how-it-works` H1,H2,H2,H2,H2,H3,H3,H3,H2. One H1 per page everywhere.

### 6. Measured responsive audit

Preview build served from `dist/` on `http://localhost:4173`, measured in-page at true media-query widths.

| Route | 360 px | 768 px | 1024 px | 1440 px |
| :--- | :--- | :--- | :--- | :--- |
| `/` | overflow 0 px, 1 H1, 2 squiggles, 0 clipped text | overflow 0 px, nav bar shown, dock hidden | overflow 0 px, hub H1 one line at 38 px | overflow 0 px, hub H1 one line at 40 px |
| `/room/8STB5D` | overflow 0 px, 1 H1, 5 squiggles, code uncut | overflow 0 px | overflow 0 px | overflow 0 px |
| `/join?room=8STB5D` | overflow 0 px, 1 H1, 3 squiggles, dock shown | overflow 0 px, dock hidden | overflow 0 px | overflow 0 px |
| `/how-it-works` | overflow 0 px, 1 H1, 11 squiggles | overflow 0 px | overflow 0 px | overflow 0 px |

Supporting numbers: desktop pill bar inner width `703/703` at 768 with `0` overflow and the compact `50 Mins` pill, `0` nav overflow at 1024 and 1440. Room code fits without ellipsis at every width (`106/117`, `140`, `144`, `184` px). Minimum interactive target `44 px` everywhere except the intentionally `sr-only` skip link. Desktop H1 wraps to two lines below 1024 by design and is single line from 1024 up.

Console: `0` messages, errors or warnings, on all four routes. Lighthouse accessibility, best practices and SEO all `100` with `0` failures on all four routes.

### 7. Commands

| Command | Result |
| :--- | :--- |
| `npm run type-check` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0, precache 11 entries, 607.9 KiB |

Remaining build advisories, both outside UI scope: the Vite over 500 kB chunk hint (Step 07 F-05, needs a code split) and the `vite-plugin-pwa` `inlineDynamicImports` deprecation. The Laroka second-source font warning is gone (Step 02 P2-2, Step 05 L-04): `web/src/styles/tokens.css` now declares only the resolvable `/fonts/laroka.otf`, and the built CSS references that single source.

### 8. Residual issues and deliberate deviations

1. **Hub H1 is 7 words.** `Send photos and text between your screens.` is the locked deck headline, and the contract makes the deck authoritative over the 3 to 5 word guideline. Kept verbatim. It is still one line from 1024 up.
2. **`/room/:code` keeps an `sr-only` H1.** The visible heading is the room code in Laroka. Unchanged from Step 05 and still one H1 per page.
3. **Motion timing not observed frame by frame.** The audit desktop window is not visible, so Chrome throttles `requestAnimationFrame` and animations sit at `currentTime: 0` while `playState` stays `running`. End states were proven by finishing each animation and reading the computed `stroke-dashoffset` (draw `0`, idle partial `0.5`), and the reduced-motion branch was verified in the compiled CSS.
4. **`prefers-reduced-motion` was not OS-emulated.** It was verified as compiled output: the media block sets every squiggle class to `stroke-dashoffset: 0 !important` with `animation: none`, kills the tip pulse, and collapses transitions to `1ms`.
5. **Live two-peer transfer not exercised.** No second device or signalling peer was available in this sandbox, so the data-bound progress squiggle (`strokeDashoffset = 1 - clamped`) and the file card rotation were verified by code and DOM inspection, not by a live receive.
6. **`HomeHub.tsx` early drop before the room code exists still no-ops silently** (Step 05 L-08). Fixing it means new feedback copy, which is an orchestrator copy decision, not a pure UI change.
7. **`DEMO_ROOM_CODE` in `lib/constants.ts` is exported and unused.** Left in place because decisions.md D-013 documents it as the valid demo literal; removing it would contradict a locked decision.
8. **Out-of-contract items not touched:** share-handoff background sweep (Step 07 F-01), copy wording drift in `docs/08-qa-checklist.md` for the camera-denied line (Step 07 F-04, docs only), and the bundle split (Step 07 F-05).

