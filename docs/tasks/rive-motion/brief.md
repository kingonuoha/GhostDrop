# Rive Motion Layer (Bouncy Morphing Interactions)

**Device stamp:** `Kingsley` - created - 2026-10-29

## Goal

Add smooth, bouncy, morphing interaction motion using Rive, covering the paired CTA button, the QR frame, the transfer moment, and the TTL poof.

## Approved decisions

- Runtime: `@rive-app/react-canvas` (Canvas2D, React 19 supported).
- Assets are authored as RML text in `ghostdrop-motion/` and compiled with the official Rive CLI to `web/public/rive/ghostdrop-motion.riv`. One file, four artboards.
- Version: new dependency means the whole number bumps, `0.18` to `1.0`, with a `CHANGELOG_RELEASES` entry.
- QR motion: QR stays a crisp DOM layer painted over the Rive frame centre. Morphing happens in the frame, brackets, and ring, and the DOM QR scales in sync. Reason: resampling a QR inside a GPU canvas breaks scanning on cheap cameras.

## Approved artboards

| Artboard | Size | State machine | Triggers | Animations |
| :--- | :--- | :--- | :--- | :--- |
| `CtaPill` | 360x88 | `cta` | `press`, `success` | Idle, Press, Success |
| `QrFrame` | 240x240 | `qr` | `connect`, `error` | Idle, Connect, Error |
| `Teleport` | 160x160 | `teleport` | `launch` | Idle, Launch |
| `Poof` | 200x140 | `poof` | `vanish` | Idle, Vanish |

Triggers fire only from the idle state. One-shots return to idle by exit time, so re-firing needs no reset.

## Constraints

- Zero em dashes, zero emojis. SVG icons only.
- Squiggly line components stay SVG with `stroke-dashoffset` drawing. Rive must never animate the squiggle.
- Wire protocol untouched. Animations are additive and must not block, delay, or alter `FILE_CHUNK` streaming or `URL.revokeObjectURL`.
- `prefers-reduced-motion`: pause or skip Rive, keep CSS fallback.
- Offline first: `.riv` and the Rive WASM must be precached, never fetched from a CDN at runtime.

## Phases

1. Back end: dependency, self-hosted WASM loader, PWA precache glob, version `1.0`, changelog entry.
2. Web: `RiveCanvas` wrapper, trigger hook, four component integrations, reduced-motion handling.
3. QA: 6 gates plus offline precache proof and reduced-motion proof.

---

## Completion notes, 2026-10-29

Shipped at `1.0`.

- **Assets:** `ghostdrop-motion/scene.rml` authored with the official Rive CLI (RML, not the editor). One artifact, `web/public/rive/ghostdrop-motion.riv`, 5304 bytes, four artboards, four state machines, six triggers, ten animations. `rive.yaml` writes the build straight to `web/public/rive`.
- **Foundation:** `@rive-app/react-canvas@4.38.0` plus a pinned `@rive-app/canvas@2.48.0`, self hosted WASM with both CDN fallbacks nulled, precache glob `**/*.{js,css,html,riv,wasm}` and a 4 MiB cache cap because the WASM is 2.08 MiB against a 2 MiB Workbox default.
- **UI:** CTA press and success, QR connect and error, transfer launch, expiry vanish. Reduced motion handled live. Rive runtime stays a 346 kB lazy chunk, main bundle unchanged.
- **QA outcome:** gates 1, 3, 4, 5, 6 pass. Gate 2 failed only on six em dashes in the generated `ghostdrop-motion/AGENTS.md`, now replaced. P1-2 ring occlusion fixed by widening the ring to 200 artboard units and setting the frame to 288 CSS px with a 160 px QR plate. P1-3, the Rive body covering the pill hover colour, is accepted as a deliberate trade and left as a follow up.
- **Follow ups:** migrate state machine inputs to data binding when the runtime removes them, add a hover state to `CtaPill` so the hover cue returns, and pass a real `fallback` so reduced motion can skip downloading the runtime.
