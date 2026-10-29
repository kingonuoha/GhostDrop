# Plan: Rive Motion Layer (bouncy, morphing, QR-linked)

**Device stamp:** `Kingsley` - created - 2026-10-28
**Owner:** `ghostdrop-orchestrator` (plan), `ghostdrop-ui-polish` (motion craft), `ghostdrop-web` (wiring), `ghostdrop-backend` (PWA cache + wasm), `ghostdrop-qa` (gates)
**Status:** Proposed, awaiting approval

---

## 1. Goal

Add smooth, bouncy, morphing interaction motion to GhostDrop using Rive as the animation runtime, focused on three moments:

1. **Button click morph:** primary CTA presses, squashes with spring overshoot, then morphs its icon and fill into the next state (Pair to Scan, Drop to Sending, Sending to Done).
2. **QR pairing chrome:** Rive draws the animated frame around the QR, the accent ring, and the "waiting for a peer" pulse, with the real QR code rendered as a crisp DOM layer on top.
3. **Link continuity:** the same Rive trigger vocabulary fires across Home, QR modal, Transfer feed, and Poof/success states, so every transition feels like one system.

---

## 2. Research Findings (verified against Rive docs, 2026)

### 2.1 Package choice

| Package | Renderer | Verdict |
| :--- | :--- | :--- |
| `@rive-app/react-webgl2` | Rive Renderer | Best fidelity, vector feathering, shared GPU context. Heavier. |
| `@rive-app/react-canvas` | Canvas2D | Smaller, fine for flat brand shapes. Recommended default. |
| `@rive-app/react-canvas-lite` | Canvas2D | Smallest, no Rive Text/Audio. Secondary option. |

- Current published versions: `@rive-app/react-canvas` **4.38.0** (wraps `@rive-app/canvas` **2.48.0**). `@rive-app/react-webgl2` also **4.38.0**.
- React peer range: `^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0`. React 19.3 in `web/package.json` is supported.
- GhostDrop art is flat vector plus one squiggle, no feathering or text layout inside the artboard, so **`@rive-app/react-canvas` is the correct pick**.

### 2.2 Missing pieces we must handle ourselves

- **WASM is fetched from a CDN by default.** That breaks the offline-first claim. Must self-host and pin:

```ts
import riveWasmUrl from '@rive-app/canvas/rive.wasm?url'
import { RuntimeLoader } from '@rive-app/react-canvas'

RuntimeLoader.setWasmUrl(riveWasmUrl)
```

- **Service worker precache currently ignores non-JS assets.** `web/vite.config.ts` line 136 has `globPatterns: ['**/*.{js,css,html}']`. Needs `riv` and `wasm` added, or the animations vanish offline.

### 2.3 API surface we will use

```tsx
import Rive, { useRive, useRiveFile, Layout, Fit, Alignment } from '@rive-app/react-canvas'
```

- `<Rive src stateMachine artboard layout autoplay />` for static decoration.
- `useRive({...}, { useDevicePixelRatio: true, shouldResizeCanvasToContainer: true, shouldUseIntersectionObserver: true })` for interactive pieces. Intersection observer is on by default and pauses offscreen rendering, which we want.
- `rive.stateMachineInputs(name)` plus `useStateMachineInput(rive, smName, inputName)` for triggers and booleans. **Deprecated in favour of data binding.**
- Preferred modern path, data binding hooks:
  - `useViewModel(rive, { useDefault: true })`
  - `useViewModelInstance(vm, { rive })`
  - `useViewModelInstanceTrigger('onTap', instance)` returns `{ trigger }`
  - `useViewModelInstanceBoolean`, `Number`, `String`, `Enum`, `Color`
  - `useViewModelInstanceImage('qrImage', instance)` accepts a decoded `RiveRenderImage` via `decodeImage(new Uint8Array(bytes))`
- `rive.pause()` / `rive.play()` for reduced motion and idle pause.

### 2.4 Where the bounce comes from

Bounce is **authored in the Rive editor, not in code**:

- **Interpolation panel** offers Elastic (amplitude plus period) for overshoot and settle.
- **Cubic Value** gives draggable Bezier handles that can overshoot past the keyed value, which is what real squash and stretch needs. Plain cubic cannot exceed its key values, so it cannot bounce a 0 to 0 property.
- State machine transitions with duration plus interpolation give the press, release, and morph states.

This means the animation quality lives in `.riv` files. Code only fires triggers.

---

## 3. Hard Constraint: The Squiggly Line Rule

`AGENTS.md` and `docs/05-motion-spec.md` lock the squiggle to a self-drawing SVG (`stroke-dasharray`, `stroke-dashoffset: 1 -> 0`) and **ban bounce, fly-in, and fly-out on it**.

Ruling for this plan:

- **Do not replace** `SquiggleLine.tsx`, `SquiggleCardBg.tsx`, `SquiggleConnectionBridge.tsx` with Rive. They stay SVG and stay QA-gated.
- Rive may animate **separate** shapes: button pills, icon circles, QR frame ring, badges, poof particles.
- If a Rive-authored squiggle is ever wanted, it must be drawn with a **Trim Path** keyed 0 to 100 percent, which is the same visual grammar as `stroke-dashoffset`. Any bounce, elastic, or overshoot on that path is a P0 violation.

---

## 4. Hard Constraint: QR Must Stay Scannable

Putting the QR inside the Rive artboard is technically possible (`useViewModelInstanceImage`), but rejected as the default:

- Scaling, rotating, or bouncing a QR inside a GPU canvas produces resampling artefacts that kill scan reliability on cheap phone cameras.
- Rive text and image assets cannot guarantee an integer module grid.

Decision: **Rive animates the frame and ring, the QR stays a `qrcode.react` `<QRCodeSVG>` in a DOM layer** centred inside the Rive canvas with a fixed quiet zone and a minimum 160px width. Optional later enhancement: feed the QR as a texture for the morph-in moment only, then hand off to the crisp DOM QR once settled.

---

## 5. Asset Plan (Rive editor, 4 files)

All exports land in `web/public/rive/` and each stays under roughly 120 KB.

| File | Artboard | State machine | Used by | Motion |
| :--- | :--- | :--- | :--- | :--- |
| `cta-pill.riv` | `CtaPill` | `cta` | Pair, Scan, Send, Install CTAs | Idle breathe, press squash, release overshoot, icon morph swap |
| `qr-frame.riv` | `QrFrame` | `qr` | `RoomCodeCard`, QR modal, `MobileJoin` | Ring draw, waiting pulse, connected lock, corner brackets snap |
| `teleport-flash.riv` | `Teleport` | `flash` | `TransferCard`, success toast | Droplet squash, launch, sparkle burst, settle |
| `poof-dissolve.riv` | `Poof` | `poof` | `PoofNotice`, expiry | Card crumple and dissolve with elastic settle |

Data binding properties per file: `onTap` (trigger), `state` (enum: idle, active, success, error), `progress` (number 0 to 100), `prefersReducedMotion` (boolean).

View model path convention: `Main` view model, properties referenced by name (`onTap`, `state`, `progress`).

---

## 6. Implementation Phases

### Phase R0 - Foundation (back end plus shell)
1. Install `@rive-app/react-canvas` (`4.38.0`). This is a **new dependency**, so the version rule forces `0.18` to `1.0`.
2. Add `web/src/lib/rive/runtime.ts` that sets the self-hosted WASM URL once, guarded by a module flag.
3. Extend `web/vite.config.ts` precache glob to `**/*.{js,css,html,riv,wasm}`.
4. Add `web/src/components/rive/RiveCanvas.tsx`: thin wrapper that lazy loads the `.riv`, exposes `<canvas aria-hidden>` to screen readers, pauses on `prefers-reduced-motion`, and fails silently to a static fallback child.
5. Commit the four `.riv` exports to `web/public/rive/`.

### Phase R1 - CTA morph
6. `web/src/components/rive/useCtaMotion.ts` hook: returns `firePress()`, `setState(enum)`, `progress`.
7. Wrap `NestedPillButton` so a `<RiveCanvas>` paints the pill body while the label stays real DOM text in the brand font, keeping accessible text and `Laroka` rendering intact.
8. Wire `HomeHub`, `ConnectedWorkspace`, `InstallCard` CTAs.
9. Keep CSS `:active` transform as the reduced-motion fallback.

### Phase R2 - QR pairing chrome
10. `RoomCodeCard` and `QrScannerModal` get `qr-frame.riv` behind the existing `QRCodeSVG`.
11. Fire `state = connected` on peer join, `state = waiting` on idle, `state = error` on failed scan.
12. Verify scan still works at 240px viewport width, in sunlight, and at 1x device pixel ratio.

### Phase R3 - Transfer and expiry
13. `TransferCard` uses `teleport-flash.riv` for send and receive moments, driven by real progress from the wire protocol. No protocol change is allowed here.
14. `PoofNotice` uses `poof-dissolve.riv` on TTL expiry, still calling `URL.revokeObjectURL` on the same tick.

### Phase R4 - QA and rollout
15. Run the 6-gate QA in `docs/08-qa-checklist.md`, adding two new checks: reduced-motion honoured, and `.riv` plus `.wasm` present in the built precache manifest.
16. Bump `web/package.json` to `1.0` and `APP_VERSION` to `1.0`, add a grandma-friendly `CHANGELOG_RELEASES` entry with the `DD MMM YYYY, H:MM AM/PM` marker.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
| :--- | :--- |
| WASM CDN fetch breaks offline PWA | Self-host via `?url`, precache `wasm`, verify with devtools offline mode |
| Canvas pill body hides accessible button text | Rive canvas is decorative, real `<button>` plus DOM label sits on top |
| Bounce motion triggers motion sickness | `prefersReducedMotion` boolean into the artboard plus `rive.pause()`, and a CSS-only fallback |
| Bundle growth | `canvas` variant not `webgl2`, lazy `import()` per `.riv`, files capped near 120 KB |
| QR unreadable after GPU scaling | QR stays DOM, Rive frame only |
| Design drift from locked palette | Every Rive fill must use token hex values from `docs/tokens/tokens.json`, audited in QA gate 1 |
| No `.riv` files exist yet | Phase R0 step 5 is a hard gate, code cannot ship before exports land |

---

## 8. Open Decisions

1. Who authors the `.riv` files: you in the Rive editor, or should the plan include a generated placeholder artboard so wiring can land first?
2. Scope of `teleport-flash.riv`: keep it to a 200ms micro-flash, or go for a full droplet launch sequence?
3. Version bump: confirm `0.18` to `1.0` under the new-dependency rule, or keep `0.19` and treat Rive as an exception.
