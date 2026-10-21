---
name: GhostDrop Kinetic System
colors:
  surface: '#f9f9fd'
  surface-dim: '#d9dade'
  surface-bright: '#f9f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f7'
  surface-container: '#eeedf2'
  surface-container-high: '#e8e8ec'
  surface-container-highest: '#e2e2e6'
  on-surface: '#1a1c1f'
  on-surface-variant: '#454934'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f0f0f5'
  outline: '#757961'
  outline-variant: '#c5c9ad'
  surface-tint: '#546500'
  primary: '#546500'
  on-primary: '#ffffff'
  primary-container: '#cdf22b'
  on-primary-container: '#596c00'
  inverse-primary: '#b2d400'
  secondary: '#0030d8'
  on-secondary: '#ffffff'
  secondary-container: '#254aff'
  on-secondary-container: '#dbdeff'
  tertiary: '#336853'
  on-tertiary: '#ffffff'
  tertiary-container: '#b6efd5'
  on-tertiary-container: '#396e59'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cdf22a'
  primary-fixed-dim: '#b2d400'
  on-primary-fixed: '#171e00'
  on-primary-fixed-variant: '#3e4c00'
  secondary-fixed: '#dee0ff'
  secondary-fixed-dim: '#bbc3ff'
  on-secondary-fixed: '#000f5d'
  on-secondary-fixed-variant: '#002dcc'
  tertiary-fixed: '#b6efd4'
  tertiary-fixed-dim: '#9bd2b9'
  on-tertiary-fixed: '#002116'
  on-tertiary-fixed-variant: '#18503c'
  background: '#f9f9fd'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e6'
typography:
  display-hero:
    fontFamily: Syne
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 60px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Syne
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Syne
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Syne
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Syne
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Syne
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  mono-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system combines ephemeral security with vibrant, avant-garde kinetic energy. Built for hyper-secure peer-to-peer file transfer, ephemeral payloads, and real-time chunk stream delivery, the identity bridges raw cryptographic precision and street-level electronic culture. 

The aesthetic merges **High-Contrast Bold** with **Tactile / Modular Neomorphic** accents. Physical button affordances, liquid-smooth state feedback, and mechanical telemetry counters balance an electric palette of volatile neon and structural blues. The atmosphere communicates both total privacy and relentless velocity: sterile, secure, yet bursting with energetic play.

## Colors
The palette balances ultra-saturated accents against warm architectural neutrals and carbon inks:

- **Primary (`#CDF22B` - Acid Lime):** Primary action drivers, glowing verification loops, active drag states, and real-time transfer indicators.
- **Secondary (`#1E45FB` - Electric Cobalt):** Interactive anchor points, key links, telemetry headers, and structural UI focus states.
- **Tertiary (`#124B38` - Deep Forest):** Cryptographic trust indicators, verified payload stamps, success badges, and secondary structural panels.
- **Neutral Dark (`#0D0F12` - Jet Ink):** Typography, high-contrast borders, solid tactile buttons, and strict bounding boxes.
- **Neutral Light (`#F7F6F2` canvas, `#EBEAE4` container - Warm Stone):** Calibrated tactile canvas surfaces preventing chromatic glare while letting Acid Lime and Electric Cobalt pop.
- **Highlight (`#FFFFFF` - Crisp White):** Dynamic cards, nested circular pill icons, and floating payload modules.

## Typography
Headlines adopt an expressive, avant-garde display voice via **Syne** (capturing the geometric punch and sculpted flares of custom display lettering), grounding the identity in high-fashion digital craftsmanship. 

**Plus Jakarta Sans** governs standard UI copy, body text, and contextual explanations, delivering maximum legibility and approachable balance.

**JetBrains Mono** powers operational metadata: hash chunks, TTL countdowns, streaming bandwidth, transfer progress counters, and cipher diagnostics.

## Layout & Spacing
A fluid 12-column grid anchors desktop views, contracting to 6 columns on tablet and 4 columns on mobile. Margins scale dynamically from `1.25rem` on mobile to `3rem` on ultra-wide screens. 

Outer containers rest on structured, modular spacing units designed to frame dropzones, live metrics, and chunk streams cleanly without layout shifts during fast micro-interactions.

## Elevation & Depth
Depth relies on crisp mechanical borders paired with tinted, directional offset shadows rather than generic blurry drops:

- **Surface Layers:** Base canvas starts at Warm Stone (`#F7F6F2`). Floating panels sit on Crisp White (`#FFFFFF`) with a 1.5px solid border in `#0D0F12` and a hard offset shadow: `4px 4px 0px #0D0F12`.
- **Active / Drag Elevation:** Lifted drag zones gain an electric drop shadow: `0px 12px 32px rgba(30, 69, 251, 0.16), 0px 4px 0px #0D0F12`.
- **Ephemeral Glow:** High-velocity drop zones and active transfer vectors utilize an outer radial bleed of Acid Lime (`rgba(205, 242, 43, 0.45)`).
- **Recessed Inset:** Telemetry monitors, chunk tracks, and TTL countdown fields use recessed surfaces: `#EBEAE4` with inner rim definition `inset 0px 2px 4px rgba(13, 15, 18, 0.08)`.

## Shapes
The system relies on an exaggerated pill-shape language (roundedness level 3). Cards, modals, and container bays use `rounded-xl` (48px / 3rem), while buttons, tags, chips, and progress wrappers use pure pill curvature (`9999px`). 

Key icon badges, status trackers, and chunk units inherit a strict 1:1 circular orb geometry.

## Components

### Tactile Nested Circle-Icon Pill Buttons
Primary buttons use continuous pill geometry (`rounded-full`) with a nested floating circular icon anchor:
- **Default State:** Jet Ink (`#0D0F12`) pill background with Crisp White text. The leading icon sits within a nested circle finished in Acid Lime (`#CDF22B`) with a Jet Ink glyph.
- **Hover/Active State:** Shifts into an electric press animation: `-translate-y-0.5` with an Electric Cobalt (`#1E45FB`) accent border, while the nested Acid Lime circle rotates 45 degrees.
- **Destructive/TTL Expire:** Replaces the nested accent with Deep Forest or high-urgency crimson red, featuring a monospaced countdown ticker inside the pill itself.

### 8-Ball Orb Badges
Status indicators take the shape of high-gloss mini billiard orbs:
- Fixed 28px or 32px circular pill tokens featuring a rich black base (`#0D0F12`), a glossy top highlight, and an inset white circular counter displaying active chunk counts, node ranks, or peer counts in JetBrains Mono.

### Continuous Self-Drawing Squiggly Loop
The signature brand device:
- An SVG vector loop path layered dynamically across transfer modules, dropzone perimeters, and success screens.
- **Animation Engine:** Uses `stroke-dasharray: 1000` and animates `stroke-dashoffset: 1000 -> 0` via cubic-bezier easing to dynamically "draw" itself as the transfer payload streams chunks. Rendered in Acid Lime (`#CDF22B`) or Electric Cobalt (`#1E45FB`) with a 2px stroke and round caps.

### Ephemeral Telemetry Cards & Dropzones
- **Payload Dropzone:** A dashed 2px Warm Stone/Jet Ink boundary over Warm Stone (`#F7F6F2`). On hover/file drag, transforms into a solid `#0D0F12` border with Acid Lime background wash and active loop drawing animation.
- **Telemetry Readout:** Recessed pill trays running JetBrains Mono data: current chunk stream rate (e.g. `24.8 MB/s`), transfer hash (`SHA-256`), and dynamic TTL countdown timer with an animated pulsing indicator.

### Checkboxes & Segmented Controls
- Binary toggles and checkboxes adopt pill-shaped tracks with sliding high-contrast spherical knobs. In the checked state, the active track illuminates in Acid Lime (`#CDF22B`) with a solid Jet Ink indicator.