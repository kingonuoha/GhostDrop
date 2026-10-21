# Step 01: QA Design Audit Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20

## 1. Audit Scope and Method

Read-only design gate audit of the Stage exports for Step 01, measured against `docs/design.md`, `docs/01-wireframe-and-pages.md`, `docs/02-brand-persona-and-copy.md`, `docs/05-motion-spec.md`, `docs/08-qa-checklist.md` (Gate 1 and Gate 2), `docs/tokens/tokens.json`, and `docs/tokens/tokens.css`.

Audited paths:
- `docs/design/` (8 screen folders plus `README.md`)
- `docs/design/ghostdrop_kinetic_system/DESIGN.md`

Method: file inventory, PNG signature and dimension validation, full read of all 8 `code.html` files, hex and font-family extraction, non-ASCII codepoint scan across all 41 `.md` and `.html` files under `docs/`, squiggle path attribute inspection, and navigation structure inspection.

No application code, design file, token file, or existing task file was modified. This report is the only artifact written.

## 2. Deliverable Inventory

| Folder | screen.png | code.html | Canvas | Result |
| :--- | :--- | :--- | :--- | :--- |
| `ghostdrop_ultra_clean_desktop_hub_grandma_edition` | yes | yes | 1280x882, 144,682 B | Complete |
| `ghostdrop_ultra_clean_desktop_hub` | yes | yes | 1600x1412, 263,161 B | Complete |
| `ghostdrop_connected_workspace_grandma_friendly` | yes | yes | 1280x890, 198,055 B | Complete |
| `ghostdrop_connected_workspace_phone_computer_linked` | yes | yes | 1600x1280, 258,817 B | Complete |
| `ghostdrop_mobile_grandma_friendly_hub` | yes | yes | 706x1600, 202,770 B | Complete |
| `connect_to_your_screen_modal` | yes | yes | 1280x878, 106,126 B | Complete |
| `how_ghostdrop_works_grandma_friendly_3_steps_1` | yes | yes | 1515x1600, 336,978 B | Complete |
| `how_ghostdrop_works_grandma_friendly_3_steps_2` | yes | yes | 1299x1600, 372,140 B | Complete |
| `ghostdrop_kinetic_system` | n/a | n/a | n/a | `DESIGN.md` only, expected for a style-system export |

All 8 PNGs carry a valid PNG signature (89504E470D0A1A0A) and non-zero file sizes.

## 3. Checklist (mirrors `docs/tasks/step-01-design-audit/qa-task.md`)

- [x] Confirm all 8 Stage screen directories contain valid `screen.png` and `code.html` references. Pass. The 9th folder, `ghostdrop_kinetic_system`, holds only `DESIGN.md`, which matches its expected scope.
- [x] Verify zero emojis across all Stage design templates and text. Pass. Zero emoji-range codepoints in 8 `code.html` files and 33 `.md` files.
- [x] Verify zero em dashes across all Stage design templates and text. Pass. Zero U+2014 and zero U+2013 characters.
- [x] Verify single-line room code representation on desktop hubs. Pass with one hardening note. `ghostdrop_ultra_clean_desktop_hub` uses `whitespace-nowrap` on both the label and the spaced `G H O S T 8` value. `ghostdrop_ultra_clean_desktop_hub_grandma_edition` renders `GHOST8` with letter tracking but without `whitespace-nowrap`.
- [x] Verify 3-tab sleek floating bottom navbar layout in mobile designs. Pass. `ghostdrop_mobile_grandma_friendly_hub` has a minimal top status header (logo plus connected pill) at lines 11 to 27, and a `fixed bottom-5 inset-x-5` dock at lines 134 to 158 with exactly three tabs: `Send`, `Scan QR`, `50 Mins`. No desktop top link bar exists in that file.
- [ ] Sign off on Step 01 design audit readiness. Fail. Blocking findings F-01 (P0) and F-02, F-03, F-05, F-06 (P1) are open.

## 4. Gate Mapping

### Gate 1: Brand Tokens, Laroka, Navigation Split, Squiggle Fidelity
- [ ] Only tokens from `docs/tokens/tokens.css` and `tokens.json` are used. Fail. See F-02, F-03, F-04.
- [ ] `Laroka` renders on all headings, 6-character room codes, numerals, and toast titles. Fail. See F-01.
- [x] Responsive navigation split. Pass. Desktop exports use a floating top pill bar; the mobile export uses a top status header plus a 3-tab bottom dock with no desktop link bar.
- [x] Signature squiggly loop line present on hero, card, bridge, and step layouts. Pass on presence. Found in all 8 exports, including the connected-device bridge.
- [ ] Self-drawing animation via `pathLength` plus `stroke-dashoffset: 1 -> 0`. Fail. See F-06.
- [x] Zero fly-in, slide-in, or bounce-in animation on squiggly lines. Pass. No transform-based entrance animation is applied to any squiggle path.
- [x] Nested Circle-Icon Pill buttons and off-center orb badges present. Pass. Examples: `ghostdrop_ultra_clean_desktop_hub:25-33`, `ghostdrop_mobile_grandma_friendly_hub:40-48`, `how_ghostdrop_works_grandma_friendly_3_steps_1:46-51`.

### Gate 2: Playful Copy, Zero Em-Dash, Zero Emoji
- [x] Zero em dashes. Pass. Grep verified across all Stage exports and `docs/*.md`.
- [x] Zero emojis, SVG or icon-font glyphs only. Pass on the emoji ban. Icon-source quality is tracked separately in F-08.
- [x] Joyful success and error copy. Pass in the alert rows. Examples: `All sent!`, `Poof! All gone.`, `Hmm, check that code` at `how_ghostdrop_works_grandma_friendly_3_steps_1:126-165`.
- [ ] No developer or protocol jargon in rendered UI. Fail. See F-05.
- [ ] No raw browser `alert()` in shipped interaction code. Fail at design-prototype level. See F-09.

## 5. Findings

| ID | Severity | Area | Finding | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| F-01 | P0 | Typography | Locked display font `Laroka` is entirely absent from all 8 exports. Every heading, step numeral, room code, and toast title is set in `Syne` loaded from Google Fonts. This breaks the explicit never-do rule that forbids substituting Laroka. | `docs/design/*/code.html` contain 0 occurrences of `Laroka`; Tailwind `fontFamily` maps `display-hero`, `headline-lg`, `headline-md`, `headline-sm` and their mobile variants to `Syne` in 7 to 8 places per file, for example `ghostdrop_ultra_clean_desktop_hub_grandma_edition:5`, `ghostdrop_ultra_clean_desktop_hub:4`, `connect_to_your_screen_modal:4`. Rule: `docs/design.md:218`. |
| F-02 | P1 | Brand palette | Locked Electric Cobalt `#1E45FB` never appears. Cobalt surfaces resolve to `#254AFF` (secondary-container) with `#0030D8` declared as secondary, so the two-color brand pair is visibly off. | 0 occurrences of `#1e45fb` across all 8 `code.html`. Usage: `bg-secondary-container` on the primary dropzone card, for example `ghostdrop_ultra_clean_desktop_hub_grandma_edition:87`; config value `secondary-container: #254aff` at line 5 of that file. |
| F-03 | P1 | Brand palette | Warm Stone `#EBEAE4`, Deep Forest `#124B38`, and Jet Ink `#0D0F12` never appear. Canvas is `#F9F9FD`, ink is `#1A1C1F`, forest accent is replaced by `#336853` and `#B6EFD4`. | 0 occurrences of each locked value in all 8 files. `surface: #f9f9fd` appears 3 times per file config; `on-surface: #1a1c1f`; `tertiary: #336853`. Warm Stone step card renders as `bg-surface-container` at `how_ghostdrop_works_grandma_friendly_3_steps_1:89`. |
| F-04 | P1 | Token architecture | Each export carries a full uncoupled Material 3 token ramp instead of referencing `docs/tokens/tokens.css` or `tokens.json`. Counts of raw hex literals per file are 47 to 52. No file references the token files. | `grep` for `tokens.css`, `tokens.json`, or `--color-` returns no match under `docs/design/`. Config blocks sit at line 4 or 5 of every `code.html`. |
| F-05 | P1 | Copy and jargon | Protocol jargon is rendered in visible UI chrome, which the Grandma 2-Second Rule bans. | `ghostdrop_ultra_clean_desktop_hub_grandma_edition:191` (P2P ENCRYPTED PAYLOAD TUNNEL, EPHEMERAL CHUNKS); `ghostdrop_ultra_clean_desktop_hub:4,222` (P2P Ready, Send Payload, Telemetry, CRYPTO SPEC, NETWORK ORBS); `ghostdrop_connected_workspace_phone_computer_linked:4,228` (P2P Encrypted Stream, WEBRTC ACTIVE, Drop Payload, Live Telemetry, Ephemeral Zero-Knowledge Relay); `how_ghostdrop_works_grandma_friendly_3_steps_2:299` (chunk stream, RAM buffer only, E2EE 256-GCM); `connect_to_your_screen_modal:4,138` (NODE::READY, SECURE EPHEMERAL MESH, E2EE 256-BIT). |
| F-06 | P1 | Squiggle motion | The required self-drawing animation is not implemented anywhere. Zero `@keyframes` exist in the export set. Only 2 of 8 files mark the squiggle with `pathLength=1` and `stroke-dasharray: 1`, and both sit at a static final `stroke-dashoffset: 0` with no state change, so nothing draws. The other 6 squiggles omit `pathLength` and use fixed dash values, a dashed connector, or a plain undashed wavy line. | `pathLength` present only at `ghostdrop_ultra_clean_desktop_hub:47,129` and `ghostdrop_ultra_clean_desktop_hub_grandma_edition:17,90`. Bridge uses `stroke-dasharray: 160` at `ghostdrop_connected_workspace_grandma_friendly:31`. Steps connector uses `stroke-dasharray: 8 8` at `how_ghostdrop_works_grandma_friendly_3_steps_1:36`. Mobile wave has no dash attributes at `ghostdrop_mobile_grandma_friendly_hub:61`. Modal has no dash attributes at `connect_to_your_screen_modal:8`. |
| F-07 | P2 | Design system doc | `ghostdrop_kinetic_system/DESIGN.md` diverges from the locked system: Syne display stack, squiggle spec written as `stroke-dasharray: 1000` with `stroke-dashoffset: 1000 -> 0`, a tonal Material 3 color ramp, and black-based orb badges instead of cobalt plus lime. Its prose color list does cite the correct brand hexes, so the document is internally inconsistent. | `DESIGN.md:51-87` (typography), `DESIGN.md:192-195` (squiggle engine), `DESIGN.md:3-50` (ramp), `DESIGN.md:188-190` (orb spec). |
| F-08 | P2 | Iconography | Material Symbols Outlined ligature font is used instead of `lucide-react` or custom inline SVGs, contrary to the SVG icon rule. Seven of 8 exports depend on it, with occurrence counts of 1, 2, 9, 15, 18, 19, and 21. | `material-symbols-outlined` counts per file; for example `how_ghostdrop_works_grandma_friendly_3_steps_2` has 21 uses with only 1 inline SVG. |
| F-09 | P2 | Prototype script | A raw browser `alert()` exists in the interactive prototype, which is the banned feedback pattern. It is prototype-only and not shipped code, but it should not be carried forward. | `ghostdrop_ultra_clean_desktop_hub_grandma_edition:174`. |
| F-10 | P2 | Glyphs | Bullet separators are used as decorative dividers in footers and meta rows instead of SVG or hyphen separators. Not an emoji, but outside the icon rule. | `ghostdrop_ultra_clean_desktop_hub:222`; `ghostdrop_ultra_clean_desktop_hub_grandma_edition:191`; `ghostdrop_connected_workspace_grandma_friendly:224`; `how_ghostdrop_works_grandma_friendly_3_steps_1:190`; `how_ghostdrop_works_grandma_friendly_3_steps_2:299`. |
| F-11 | P2 | Room code | The grandma-edition hub room code lacks `whitespace-nowrap`. It currently stays on one line because the value has no spaces, but the locked rule asks for explicit nowrap hardening. | `ghostdrop_ultra_clean_desktop_hub_grandma_edition:80` compared with the compliant `ghostdrop_ultra_clean_desktop_hub:108-113`. |
| F-12 | P2 | Documentation drift | Navigation item count conflicts between sources: `docs/design.md:28` specifies 4 dock items (Teleport, Scan QR, TTL Timer, Install App), while `docs/01-wireframe-and-pages.md:17-20` and the mobile export specify 3 (Send, Scan QR, 50 Mins). Separately, root `design/` contains only `README.md` although `AGENTS.md:22` describes it as a mirror of the exports. | `docs/design.md:28`; `docs/01-wireframe-and-pages.md:17-20`; `design/README.md`; `docs/design/ghostdrop_mobile_grandma_friendly_hub:134-158`. |

## 6. Verified Positives

- All 8 required screen folders are complete and openable, with valid PNG renders.
- Zero em dashes and zero emojis across the entire `docs/` Markdown and HTML surface.
- Mobile navigation split is correct: minimal top status header, 3-tab thumb-zone dock, no desktop link bar, and the active tab is a lime pill on the Jet Ink dock.
- Desktop exports consistently use a floating top pill bar with rounded-full geometry.
- Connected workspace exports include a dedicated squiggle bridge between `This Computer` and `My Phone`.
- Connect modal matches wireframe: camera viewfinder, scanline, corner brackets, six single-row code boxes `G H O S T 8`, and a `Connect Now` pill with nested circle icon.
- How-it-works exports contain 3 stepped cards plus 3 friendly alert cards with warm, non-technical copy.
- No fly-in, slide-in, bounce-in, or scale-in transform is applied to any squiggle line.
- Nested Circle-Icon Pills and off-center orb step badges follow the `docs/Brand colours.jpg` geometry.

## 7. Blocking Summary

| Severity | Open items |
| :--- | :--- |
| P0 | F-01 Laroka substituted with Syne in all 8 exports |
| P1 | F-02 Electric Cobalt drift, F-03 Warm Stone and canvas drift, F-04 uncoupled token ramp, F-05 rendered jargon, F-06 missing self-draw squiggle animation |
| P2 | F-07 to F-12 |

## 8. Recommended Remediation

1. Re-export or re-skin with self-hosted `Laroka` on every heading, room code, numeral, and toast title. Remove the `Syne` stack from the Tailwind font map.
2. Replace the Material 3 ramp with the locked token set: `#CDF22B`, `#1E45FB`, `#EBEAE4`, `#F7F6F2`, `#124B38`, `#0D0F12`, `#FFFFFF`. Map the cobalt surface to `#1E45FB` and the canvas to `#F7F6F2`.
3. Swap Material Symbols for inline SVG or `lucide-react` icons at 2px stroke.
4. Remove protocol jargon from all footer, nav, and status chrome; keep only plain-English labels.
5. Implement the squiggle as `pathLength=1` with `@keyframes squiggle-draw` running `stroke-dashoffset: 1` to `0`, with a `prefers-reduced-motion` fallback at offset `0`.
6. Treat the current exports as layout and hierarchy reference only until gates 1 and 2 are clean. Do not lift palette, font, or icon code from them into `src/`.

## 9. Verdict

GATE FAIL
