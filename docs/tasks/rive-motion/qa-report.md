# Rive Motion Layer QA Report

**Device stamp:** `Kingsley` - created - 2026-10-29

**Audit target:** `docs/tasks/rive-motion/brief.md`, 2026-10-29
**Auditor:** `ghostdrop-qa` (read only)
**Verdict:** functional gates pass (protocol, offline, build, reduced motion, accessibility). Three P1 findings, all cosmetic or governance. No P0.

---

## 1. Blockers

### P0

None. No protocol change, no memory leak path, no offline break, no build break.

### P1

**P1-1 - Gate 2 fails on the scaffold file: 6 em dashes in `ghostdrop-motion/AGENTS.md`.**
Application surface is clean, but the new Rive CLI project folder carries a scaffold document with 6 em dashes on lines 9, 11, 13, 18, 20, 28. Fix: replace with hyphens or colons.

**P1-2 - Pairing card: the QR frame ring is occluded by the DOM QR plate.**
`QrFrame` authors the ring as a 168px ellipse with a 5 unit stroke on a 240x240 artboard. Rendered in a 264px box the ring draws at 184.8px diameter (radius 92.4). The QR plate above it is a 168x168 CSS square whose half diagonal is 118.8, larger than the ring radius, so the plate covers the ring except at four axis arcs. The lime corner brackets are overlapped by about 13px per inner edge.

**P1-3 - `CtaPill` body hides the button hover colour.**
The canvas paints a fixed cobalt body over `hover:bg-brand-cobalt-deep`, leaving only a thin darker rim as hover feedback. Acceptable as a graceful degradation, not as a finished state.

---

## 2. Gate results

| Gate | Result | Note |
| :--- | :--- | :--- |
| 1. Brand tokens, Laroka, nav split, squiggle fidelity | PASS | Palette locked, squiggle components byte identical. |
| 2. Playful copy, zero em dash, zero emoji | FAIL (scoped) | 0 in app surface, 6 in the scaffold doc. See P1-1. |
| 3. Wire protocol and 16KB backpressure | PASS | No protocol file changed. |
| 4. Ephemeral TTL and zero memory leaks | PASS | All four `revokeObjectURL` sites unchanged. |
| 5. PWA, share target, QR scanner | PASS | Manifest, share target, camera fallback intact. |
| 6. Viewports, reduced motion, build health | PASS (build and motion), UNVERIFIED (viewport pixels) | No browser attached to the audit session. |

---

## 3. Evidence

### Palette inside `scene.rml`

16 `colorValue` literals, 6 unique, all brand tokens: `FFCDF22B` (8), `FF1E45FB` (3), `FF0D0F12` (2), `FFF7F6F2` (1), `FF124B38` (1), `FFEBEAE4` (1). Zero deviations.

### Em dash and emoji scan

| Scope | Em dash | Emoji |
| :--- | ---: | ---: |
| `ghostdrop-motion/scene.rml` | 0 | 0 |
| `web/src/lib/rive/**` | 0 | 0 |
| `web/src/components/rive/**` | 0 | 0 |
| Modified UI components | 0 | 0 |
| Foundation files | 0 | 0 |
| `ghostdrop-motion/AGENTS.md` | 6 | 0 |
| Whole of `web/src`, `web/public`, `docs/` | 0 | 0 |

### Protocol and cleanup

`CHUNK_SIZE_BYTES = 16384` unchanged at `web/src/types/protocol.ts:6`. `bufferedAmountLowThreshold = 65536` unchanged at `web/src/lib/p2p/fileStreamer.ts:81`. `revokeObjectURL` call sites unchanged at `janitor.ts:545`, `useGhostRoom.ts:316`, `acousticModem.ts:938`, `QrScannerModal.ts:172`.

### Offline proof from the real build

- `dist/sw.js` precache holds 21 entries including `rive/ghostdrop-motion.riv` and `assets/rive-Bx4V2fOF.wasm` (2,183,014 bytes).
- The 4 MiB cap is required: the WASM is 2.08 MiB, above the Workbox 2 MiB default, so without it the runtime is silently dropped from the manifest.
- Loader path has no live CDN fetch. `setWasmFallbackUrl(null)` is set and `setWasmUrl(<local hashed asset>)` runs at import time.

### Build health

| Command | Result |
| :--- | :--- |
| `npm run type-check` | PASS, three projects, zero errors |
| `npm run lint` | PASS |
| `npm run build` | PASS, 21 precache entries, 3248.77 KiB |
| `npm test` | PASS, 31 tests |

### Bundle split

`RiveSurface-Ct0KmElU.js` 346.19 kB (87.10 kB gzip) is a lazy chunk. `RuntimeLoader` appears 4 times in that chunk and 0 times in the first paint `index` chunk.

### Artifact

`web/public/rive/ghostdrop-motion.riv`, 5304 bytes, magic `52495645`, sha256 `2a85ca0eccf822f2dd979267bb7b79813cb7ae1fef9c4ca60cebcc0e45840018`. Four artboards, four state machines, six triggers, ten animations, exact match with the brief.

---

## 4. Accessibility

Every canvas sits inside `<div aria-hidden="true">`. The emitted `<canvas>` carries no role, no tabindex and no aria attributes. The CTA remains a real `<button>` with real DOM text, so the accessible name, focus ring, disabled handling and pointer handler stay on the DOM node.

---

## 5. Reduced motion

`useReducedMotion.ts` subscribes to `matchMedia('(prefers-reduced-motion: reduce)')` with a change listener and a synchronous initial value, so there is no first frame flash. `RiveSurface.tsx:81` passes `autoplay: !reducedMotion` and holds one painted frame. The CSS squiggle override in `index.css` is unchanged.

---

## 6. Accepted caveats

| Caveat | Verdict |
| :--- | :--- |
| State machine inputs deprecated in favour of data binding | Acceptable. Works in the pinned versions, isolated behind `useRiveTrigger.ts` and `motionContext.ts`. Record as follow up. |
| Only the `lime-on-cobalt` skin gets the Rive body | Acceptable. The artboard hardcodes cobalt with a lime orb, so other skins keep CSS. |
| Offline invite QR keeps its plain card | Acceptable. The offline rescue path must not load a 346 kB runtime. |

---

## 7. P2 notes

1. `@rive-app/canvas` is used directly in `wasmUrl.ts` but declared only transitively. Pin it explicitly in `web/package.json`.
2. `RuntimeLoader.setWasmThreadsUrl(null)` is never called. The threaded path is unreachable in this package, but nulling it makes the offline guarantee independent of package internals.
3. `RiveCanvas.ready` is set when the trigger table publishes, not when the `.riv` decodes, so a pulse in that window is lost. Cosmetic.
4. The `fallback` prop is never passed, so the reduced-motion path still downloads the runtime to paint one frame.
5. The teleport canvas omits `pointer-events-none`, unlike the other four call sites.
6. `scene.rml` header comment lists five tokens, artwork uses six.

---

## 8. Not verified

Rendered pixels, viewport overflow at 360/768/1024/1440, and a cold offline network run. No browser was attached to the audit session. Static review found no new overflow vector: the QR box caps at a fixed width, the transfer row uses `shrink-0` plus `min-w-0 flex-1`, and every canvas sits in a fixed size or absolutely positioned box.
