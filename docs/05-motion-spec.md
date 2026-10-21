# 05-motion-spec.md: GhostDrop Motion and Self-Drawing Squiggle Specification

> **CRITICAL BRAND MANDATE:**
> The signature GhostDrop squiggly loop line (`docs/Woove - Branding line.jpg` and Swatch 3 of `docs/Brand colours.jpg`) **MUST ALWAYS ANIMATE BY DRAWING ITSELF INTO PLACE (`stroke-dashoffset: 1 -> 0`)**.
> **NEVER** use fly-in, fly-out, slide-in, or bounce-in animations on the squiggly line!

---

## 1. Core Motion Principles

1. **Self-Drawing Squiggly Lines (`stroke-dashoffset`):**
   - Every squiggly line on hero backgrounds, individual cards, P2P connection bridges, and toast accents is an inline SVG `<path pathLength="1">` with `stroke-dasharray: 1` and `stroke-dashoffset` transitioning smoothly from `1` to `0`.
   - It visually looks like an invisible marker is drawing the loop from start to end in real time.
2. **Playful Tactile Physics on Buttons, Desktop Top Bar and Mobile Bottom Navbar:**
   - Nested Circle-Icon Pill buttons (`#CDF22B` and `#1E45FB`) compress slightly on press (`scale(0.97)`) and expand the inner SVG icon circle (`scale(1.1) rotate(15deg)`) on hover.
   - Mobile Sleek Bottom Navbar tabs morph the active `#CDF22B` Acid Lime pill indicator smoothly across items (`180ms` spring).
3. **Ephemeral "Poof" Dissolve on TTL Expiry:**
   - When an item's countdown reaches `00:00`, the card scales gently to `0.95` while fading opacity to `0` (`320ms`), replaced briefly by the playful `"Poof! Self-destruct timer hit zero"` badge with a `Sparkles` SVG icon.
4. **Mandatory `prefers-reduced-motion` Fallback:**
   - If the user has `prefers-reduced-motion: reduce` enabled, `stroke-dashoffset` renders immediately at `0` (fully drawn) without motion, and all transforms reduce to instant opacity fades.

---

## 2. Timing and Easing Tokens

```css
:root {
  --ease-draw: cubic-bezier(0.33, 1, 0.68, 1);     /* Smooth natural pen-drawing curve */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* Crisp UI reveals */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);/* Playful button/badge pop */

  --dur-fast: 180ms;         /* Button hover/press, pill toggles */
  --dur-base: 420ms;         /* Toast & feed card entrance */
  --dur-draw-card: 850ms;    /* Card background squiggle self-draw */
  --dur-draw: 1150ms;        /* Hero & P2P Connection Bridge squiggle self-draw */
  --stagger: 70ms;
}
```

---

## 3. Behavior Table by Element

| Element | Trigger | Animation Effect | Duration | Easing | Prohibited Effect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero & Card Squiggly Loop Line** | Mount / In-View | SVG `stroke-dashoffset: 1 -> 0` (`pathLength="1"`). Draws along the path from left to loop to right. | `850ms-1150ms` | `--ease-draw` | NEVER fly-in, slide-in, or fade-up the line |
| **P2P Connection Bridge Squiggle** | Peer `RTCDataChannel` Open | Line draws from Host avatar through the loop into Peer avatar (`stroke-dashoffset: 1 -> 0`) and stroke transitions from `#1E45FB` to `#CDF22B`. | `950ms` | `--ease-draw` | NEVER slide the SVG container |
| **16KB Chunk Progress Squiggle** | `FILE_CHUNK` progress (`0% -> 100%`) | `stroke-dashoffset` binds directly to `1 - (receivedChunks / totalChunks)`, drawing the squiggle as chunks arrive! | Live data-bound | `linear` (`80ms` smoothing) | No jumpy width reflows |
| **Nested Circle-Icon Pill Button** | `:hover` / `:active` | Inner circle scales `1.08` and SVG icon rotates `45deg` (or `Plus` SVG spins `90deg`). Active press: `scale(0.97)`. | `180ms` | `--ease-spring` | No layout-shifting padding changes |
| **Mobile Sleek Bottom Navbar Pill** | Tab selection | Active `#CDF22B` pill indicator slides/morphs to selected tab; SVG icon pops (`scale(1.08)`). | `220ms` | `--ease-spring` | No page jump |
| **Joyful Toast / Alert Card** | Event trigger | Card pops in (`scale(0.94 -> 1)`, `opacity: 0 -> 1`) while its mini squiggly underline draws (`stroke-dashoffset: 1 -> 0`). | `420ms` | `--ease-spring` | No jarring screen shake |
| **TTL Self-Destruct Card Purge** | Timer hits `00:00` or `[Burn Now]` clicked | Card dissolves (`scale(0.95)`, `opacity: 0`) after calling `URL.revokeObjectURL`. | `320ms` | `--ease-out` | Never leave dead DOM nodes |
