# Step 12: UI Polish Task - Brand Colour Slab Backdrop, Teaser Copy and Contrast
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - ui-polish-complete - 2026-10-22

## Assigned Agent
`@ghostdrop-ui-polish`

## Workspace Target
`web/` and `docs/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agents/rules/GEMINI.md`, `.agents/BRAND.md`
- `decisions.md` (`D-005`, `D-006`, `D-007`, `D-009`, `D-015`)
- `docs/design.md`
- `docs/02-brand-persona-and-copy.md`
- `docs/04-design-system.md`
- `docs/05-motion-spec.md`
- `docs/tokens/tokens.css`, `docs/tokens/tokens.json`
- `plans/coming-soon-wall-plan.md`
- `docs/tasks/step-12-v08-coming-soon-wall/brief.md`
- `docs/tasks/step-12-v08-coming-soon-wall/web-task.md`

## Objective
Build the continuously looping brand colour backdrop for the coming soon page, write the teaser copy into the deck, and guarantee legibility and reduced-motion safety.

---

## Detailed Implementation Specifications

### 1. `web/src/components/soon/ComingSoonBackdrop.tsx` (new)

A single presentational component. No props required, no state, no effects.

```text
<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
  <span className="soon-slab soon-slab-lime" />
  <span className="soon-slab soon-slab-cobalt" />
  <span className="soon-slab soon-slab-forest" />
  <span className="soon-slab soon-slab-stone" />
  <div className="soon-scrim" />
</div>
```

Requirements:
- `aria-hidden="true"` and `pointer-events-none` on the container. Decorative only.
- `overflow: hidden` is mandatory so a drifting slab can never create a scrollbar or horizontal scroll at `360px`.
- Four slabs, one per locked brand colour, mapped to tokens only:
  - `--color-lime-400` (Acid Lime `#CDF22B`)
  - `--color-cobalt-600` (Electric Cobalt `#1E45FB`)
  - `--color-forest-800` (Deep Forest `#124B38`)
  - `--color-stone-100` (Warm Stone `#EBEAE4`)
- Each slab is a large absolutely positioned field with a generous border radius from the radius tokens, so the four colours read as overlapping brand fields rather than hard rectangles.
- Sizes around `120%` to `160%` of the container per slab, offsets staggered so no two slabs cover the same quadrant at the same moment.

### 2. `web/src/components/soon/ComingSoonSquiggles.tsx` (new)

Five squiggly lines drawing themselves in at random corner and edge anchors. This layer MUST honour D-006 exactly: a squiggle is never translated, scaled, or faded. Only `stroke-dashoffset` moves.

Structure per instance:

```text
<svg aria-hidden="true" viewBox="..." className="soon-squiggle soon-squiggle-a">
  <path pathLength="1" strokeDasharray="1" d="..." />
</svg>
```

Motion contract, one cycle per squiggle:

1. Draw in, `stroke-dashoffset: 1 -> 0`, `~1150ms`, `--ease-draw`.
2. Hold fully drawn for a randomized 2 to 5 seconds.
3. Retract, `stroke-dashoffset: 0 -> 1`, `~900ms`.
4. **Only once the retract has completed**, teleport to the next anchor and repeat from step 1.

Rules:
- The anchor change happens while the path has zero visible length. No frame may show a visible squiggle being translated.
- Anchors are the four corners plus the four edge midpoints, so "any corner of the screen" is honoured literally. Shuffle the sequence once on mount with `Math.random()`, never during render, and advance one anchor per cycle so it never oscillates between two spots.
- Rotate each instance statically (a fixed `transform` in the class or an inline style) so the five do not read as a repeating stamp. Static rotation is fine; animated rotation is a breach.
- Stroke colours alternate `--color-forest-800` and `--color-cobalt-600`.
- Sizes vary between roughly `90px` and `220px` so the layer has depth.
- Layer container: `aria-hidden="true"`, `pointer-events-none`, `absolute inset-0`, `-z-10`, `overflow-hidden`, above the slabs and below `.soon-scrim`.
- No `will-change`. A handful of short paths animating `stroke-dashoffset` is cheap.
- Drive cycling with CSS animation plus one `setInterval` per squiggle that advances its anchor index at cycle end. Do not randomize inside the render body and do not create a new interval on every render.
- `prefers-reduced-motion: reduce` hides the layer entirely (`display: none`), which keeps the teaser calm and guarantees no motion.

### 3. `web/src/index.css`: keyframes

Add four keyframes and four slab classes, placed next to the existing motion block:

| Class | Token | Axis | Duration | Delay |
| :--- | :--- | :--- | :--- | :--- |
| `.soon-slab-lime` | `--color-lime-400` | up | `22s` | `0s` |
| `.soon-slab-cobalt` | `--color-cobalt-600` | right | `26s` | `-6s` |
| `.soon-slab-forest` | `--color-forest-800` | down | `30s` | `-12s` |
| `.soon-slab-stone` | `--color-stone-100` | left | `18s` | `-3s` |

Hard requirements:
- Animate `transform` only, using `translate3d()` so the work stays on the compositor. Never animate `top`, `left`, `width`, `height`, `margin`, or `filter`.
- `animation-direction: alternate` with `ease-in-out` so the reversal is invisible and the loop never snaps.
- Negative delays start each slab mid-cycle so the first paint is already a composed, asymmetric layout instead of four slabs at their start positions.
- `will-change: transform` on the four slab nodes only. Never on a container or a wildcard.
- No new timing tokens. Reuse `--ease-out` or `--ease-draw`, and use explicit `s` durations for the slow loops since these are far outside the UI token range.

### 4. Legibility scrim

`.soon-scrim` sits above the slabs and below the content in the DOM.

- Warm Stone base (`--color-stone-50`) at a measured opacity, plus a subtle vertical gradient so the headline area is the most opaque zone.
- Contrast must be measured against the composed result, not against the token colour. Target AA for the H1 and AAA for the countdown numerals.
- Verify specifically over the Cobalt slab at its most saturated moment. Cobalt at full bleed against Jet Ink text will fail; the scrim exists to prevent that.
- Report the measured contrast ratios in your completion notes with the tool or method used.

### 5. Teaser copy

Add a `SOON_*` block to `web/src/lib/copyDeck.ts` and mirror it into `docs/02-brand-persona-and-copy.md` as a new subsection under section 2:

| Key | Copy |
| :--- | :--- |
| `SOON_EYEBROW` | `Coming soon` |
| `SOON_HEADLINE` | `GhostDrop is almost here` |
| `SOON_SUB` | `Send photos and text between your screens. Then watch them vanish.` |
| `SOON_COUNTDOWN_LABEL` | `Doors open in` |
| `SOON_STEP_ONE` | `Scan the code` |
| `SOON_STEP_TWO` | `Drop it in` |
| `SOON_STEP_THREE` | `It poofs when you say` |
| `SOON_WELCOME` | `Welcome in. GhostDrop is live.` |
| `SOON_FOOTNOTE` | `No accounts. No uploads. Nothing left behind.` |

Rules:
- Playful, warm, grandma-simple voice per `docs/02-brand-persona-and-copy.md`.
- Zero em dashes, zero en dashes, zero emojis.
- No step-number prefixes on the three steps if the page renders a numbered badge next to them. If the page renders the steps as plain text pills with no badge, the numbers are not needed either.
- `SOON_WELCOME` is shown after the launch instant, just before the wall unveils itself. It must NOT reference any unlock gesture. No string in the deck, and nothing on the teaser, may contain `Ctrl`, `Alt`, a tap count, or the word "shortcut". The unlock stays invisible.

### 6. Typography craft

- H1 in `Laroka` using the existing `type-display` / `type-h2` scale, no new sizes if the scale already covers it.
- Countdown numerals in `Laroka` with `type-numeral`, tabular so digits do not jitter as they tick. This matters: without fixed digit widths the countdown visibly shudders every second.
- Eyebrow in tracked uppercase at the small size, Jet Ink or Deep Forest.
- Footnote at muted text colour from the token set.

### 7. Reduced motion

Inside the existing `@media (prefers-reduced-motion: reduce)` block, add:

- `animation: none !important` for all four slab classes.
- A static `transform` offset per slab so the composition still reads as four brand colours with clear separation and no overlap that hides a colour entirely.
- `display: none` for the squiggle layer, so no squiggle motion remains at all.

Verify by emulating reduced motion and confirming `getComputedStyle` reports `animation-name: none` on all four slabs and that the squiggle layer is not rendered.

### 8. Squiggle rule audit

Every squiggle on the teaser is an inline SVG `<path pathLength="1">` with `stroke-dasharray: 1` and only `stroke-dashoffset` animating. Assert explicitly:

- No squiggle path has an animated `transform`, `translate`, `top`, `left`, or `opacity` entrance.
- The anchor teleport happens at the end of a completed retract, never while the path is visible.
- Static rotation on a squiggle wrapper is permitted and is not an animated transform.

Slab translation is a separate permitted primitive per D-015 and must not be conflated with the line.

---

## NON-NEGOTIABLE GUARDRAILS
- **ZERO em dashes (U+2014), ZERO en dashes (U+2013), ZERO emojis** anywhere: CSS, TSX, copy deck, docs.
- **Tokens only.** Zero raw hex outside `docs/tokens/tokens.css` and `web/src/styles/tokens.css`.
- **`Laroka`** for the headline and countdown numerals.
- **Do not modify** `web/src/lib/p2p/*`, `web/src/types/protocol.ts`, `web/src/sw.ts`, `web/vite.config.ts`, `web/vite.localSignaling.ts`, `web/package.json`, `web/src/App.tsx`, `web/src/hooks/useLaunchGate.ts`, or `web/src/pages/ComingSoon.tsx`. Those are web jurisdiction.
- **No new dependencies.** CSS-only animation.
- **No visible unlock affordance** in any copy or UI you add.
- **Windows PowerShell safe file ops:** write tool to create, edit tool to modify. NEVER use bash heredocs.

## Verification Checklist
- [x] Four slabs render, one per locked brand colour, each mapped to a token with zero raw hex.
- [x] Each slab animates on its own axis (up, right, down, left) with `translate3d` only and `alternate` looping.
- [x] Five squiggles render at randomized corner and edge anchors, each drawing in and retracting via `stroke-dashoffset` only, with the anchor change occurring after the retract completes.
- [x] No squiggle path animates `transform`, `translate`, `top`, `left`, or `opacity`. Static rotation only.
- [x] Anchor sequences are computed once on mount, never during render, and each squiggle advances one anchor per cycle.
- [ ] Zero horizontal overflow and no scrollbar introduced from the slab or squiggle layers at `360`, `768`, `1024`, `1440`. Partly verified: `overflow: hidden` plus `absolute inset-0` measured `scrollWidth === clientWidth` on the document with the layers mounted. The live four-width pass needs `ComingSoon.tsx`, so it is handed to QA.
- [x] `prefers-reduced-motion: reduce` freezes all four slabs, hides the squiggle layer, and the composition still reads as four colours. Verified in the built CSS plus a cascade proof (`animation-name` resolves to `none` and the static offset applies). The connected browser exposes no reduced-motion emulation, so the media query itself was not flipped live.
- [x] Headline and countdown contrast measured against the composed scrim, AA or better, with the ratios reported. Worst case is Deep Forest under the lightest wash stop: 8.86:1 for Jet Ink, 7.55:1 for Ink 800, both AAA. Strongest stop is 12.13:1.
- [x] Countdown numerals use tabular figures so digits do not jitter while ticking. Note: Laroka ships proportional digits with no `tnum` feature, so the `.soon-countdown` and `.soon-countdown-digit` helpers give each digit a fixed cell. The page must apply them.
- [x] `SOON_*` keys exist in `web/src/lib/copyDeck.ts` and are mirrored into `docs/02-brand-persona-and-copy.md`, with `SOON_WELCOME` present and `SOON_LIVE` absent.
- [x] No copy string anywhere on the teaser mentions `Ctrl`, `Alt`, a tap count, or "shortcut".
- [x] `npm run type-check`, `npm run lint`, `npm run build` in `web/` all exit `0`.
- [x] Zero em dash, en dash, or emoji in every file touched.

---

## Completion Notes (`@ghostdrop-ui-polish`)

Files touched:
- `web/src/components/soon/ComingSoonBackdrop.tsx` (new)
- `web/src/components/soon/ComingSoonSquiggles.tsx` (new)
- `web/src/index.css` (slab keyframes, wash, squiggle cycle, countdown and footnote helpers, reduced-motion overrides)
- `web/src/lib/copyDeck.ts` (`SOON_*` block)
- `docs/02-brand-persona-and-copy.md` (the Prelaunch Coming Soon Wall subsection, numbered 2.1)

### Layer order for `@ghostdrop-web`

`ComingSoonBackdrop` renders the four slabs, then `ComingSoonSquiggles`, then `.soon-scrim`, all inside one stacking context at `-z-10`. That is the only way the mandated order (slab, then squiggle, then wash) holds, because a `-z-10` child of a `-z-10` container paints under its own sibling slabs. So the page renders `<ComingSoonBackdrop />` exactly once and does not render `<ComingSoonSquiggles />` separately, or the wall gets ten squiggles and the wash stops covering them. The page root must be a positioned ancestor for `absolute inset-0` to land on the viewport box.

### Squiggle cycle

Two keyframes: `soon-squiggle-draw` (`stroke-dashoffset: 1 -> 0`, `var(--dur-draw)`, `--ease-draw`) and `soon-squiggle-retract` (`0 -> 1`, `900ms`). Both sit on the path with `forwards` fill. The retract has no backwards fill, so it contributes nothing until its inline `--soon-retract-delay` (`draw + hold`) elapses, and that gap is the hold. One interval per squiggle, created once, fires after `draw + hold + retract` (plus a small tail) and does two things in the same commit: it advances the shuffled anchor index and it bumps a nonce that remounts the SVG. The remounted path starts at `stroke-dashoffset: 1`, so the anchor jump is never visible. Confirmed by driving the animations with explicit `currentTime` values: offset 1 at t0, 0 while holding, rising to 1 across the retract, and `transform: none`, `opacity: 1`, `left: auto`, `top: auto` on the path throughout.

### Contrast method

WCAG 2.x relative luminance and contrast ratio computed on the sRGB composite of each brand field under the wash at its lightest stop (62%). Deep Forest, not Cobalt, is the true worst case for dark ink text. Jet Ink `#0D0F12` measures 8.86:1 and Ink 800 `#1C2026` 7.55:1 there; the 76% stop measures 11.25:1 and 9.58:1. The muted token `#4E5562` only reaches 3.46:1 over Deep Forest at 62%, so the quiet footnote line uses `--color-ink-800` through `.soon-footnote` instead of the muted token.

### Handover items

1. `ComingSoon.tsx` should use `.soon-countdown` for the timer, `.soon-countdown-digit` around each digit, and `.soon-footnote` for the closing line.
2. QA should run the four-width overflow pass and the live reduced-motion emulation once the page exists.
3. `SOON_LIVE` appears nowhere in `web/src/` or `docs/`; the only occurrence in the repo is this task file naming it as the string that must stay absent.
