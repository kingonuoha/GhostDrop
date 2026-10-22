# Plan: v0.8 Coming Soon Wall and Teaser Animation Loop

**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22
**Version target:** `0.8` (no new dependency, so a decimal bump per `AGENTS.md` Section 5)
**Task folder:** `docs/tasks/step-12-v08-coming-soon-wall/`
**Launch target:** 23 October 2026 at 17:00 WAT (UTC+1), which is 16:00 UTC. Fixed global instant, identical for every visitor.

---

## 1. Goal

Gate the GhostDrop Web App and PWA behind a public "coming soon" teaser so nobody reaches a half-tested app before launch, while keeping full local access for Kingsley on both PC and phone through hidden unlock gestures.

The teaser is not a static placeholder. It carries a continuously looping brand colour animation built from the four locked brand colours, plus a live countdown to the 23 October 17:00 launch.

---

## 2. Locked Decisions (from user answers, 2026-10-22)

| # | Decision | Value |
| :--- | :--- | :--- |
| 1 | Unlock gestures | `Ctrl+Alt+C` on desktop. Tap the GhostDrop logo 3 times fast on any device. |
| 2 | Lock scope | ALL routes, including `/join` and `/room/*`. Nothing renders until unlocked. |
| 3 | At countdown zero | Show a welcome state, then the gate unveils itself automatically. |
| 4 | Slab motion | Full-bleed bands on four axes: up, right, down, left. |

Unlock state persists in `localStorage` under `ghostdrop.launch.unlocked` so a reload does not re-lock a device that was already unlocked. Locking again is only possible by clearing site data or by the explicit `lock()` path in the hook (not exposed in the UI).

---

## 3. Architecture

### 3.1 Gate position (the critical part)

`web/src/App.tsx` currently renders:

```text
App
  GhostRoomProvider (session)
    AppShell (nav chrome)
      page
```

The wall MUST sit ABOVE `GhostRoomProvider`, otherwise the P2P engine still:

- opens a signaling WebSocket to the same-origin `/peerjs` proxy or `0.peerjs.com`,
- allocates a `ghostdrop-room-XXXXXX` peer id and registers it on the server,
- starts ICE gathering and a reconnect timer,

all while the visitor only sees a teaser. That is wasted server state, wasted battery, and a room code registered by someone who is not using the app.

Target shape:

```text
App
  useLaunchGate()
  if (!unlocked) -> <ComingSoon />
  else           -> GhostRoomProvider > AppShell > page
```

Consequence: while locked there is **zero** P2P surface. QA verifies by Network tab that no `/peerjs` WebSocket is opened and `localStorage` holds no room state.

### 3.2 Files

| File | Change | Owner |
| :--- | :--- | :--- |
| `web/src/hooks/useLaunchGate.ts` | NEW. Unlock state, gesture listeners, `localStorage` persistence | `@ghostdrop-web` |
| `web/src/pages/ComingSoon.tsx` | NEW. Teaser page composition | `@ghostdrop-web` |
| `web/src/App.tsx` | Gate wrap around the existing tree | `@ghostdrop-web` |
| `web/src/lib/format.ts` | NEW `formatCountdown(targetMs, nowMs)` | `@ghostdrop-web` |
| `web/src/lib/constants.ts` | `APP_VERSION = '0.8'`, `LAUNCH_AT`, `LAUNCH_UNLOCK_KEY` | `@ghostdrop-web` |
| `web/package.json` | `"version": "0.8"` | `@ghostdrop-web` |
| `web/src/components/soon/ComingSoonBackdrop.tsx` | NEW. Four drifting colour slabs, `aria-hidden` | `@ghostdrop-ui-polish` |
| `web/src/components/soon/ComingSoonSquiggles.tsx` | NEW. Five draw-and-retract squiggles at random corner anchors | `@ghostdrop-ui-polish` |
| `web/src/index.css` | Four slab keyframes plus reduced-motion override | `@ghostdrop-ui-polish` |
| `web/src/lib/copyDeck.ts` | Teaser copy block | `@ghostdrop-ui-polish` |
| `docs/02-brand-persona-and-copy.md` | Teaser section so copy has one source of truth | `@ghostdrop-ui-polish` |
| `web/index.html` | Prelaunch `<title>` and description | `@ghostdrop-web` |
| `docs/07-build-order.md`, `decisions.md` | Step 12 gate, D-015 | orchestrator |

### 3.3 Non-goals and untouched surfaces

- `web/src/sw.ts`: untouched. `POST /share-target` still stashes to `pendingDrop` and surfaces after unlock, so a share during prelaunch is not lost.
- `web/src/lib/p2p/*`, `web/src/types/protocol.ts`: untouched.
- `web/vite.config.ts`, `web/vite.localSignaling.ts`: untouched. The `/peerjs` proxy stays wired for after unlock.
- Step 11 (`docs/tasks/step-11-improvements/`): stays deferred. Not executed by this plan.

---

## 4. Teaser Composition

Single centred column, max width `1120px`, one layout that works at every width. No desktop nav bar and no mobile dock on the wall, because those are app chrome that belongs behind the gate.

```text
[ brand mark + v0.8 pill ]
COMING SOON                        (eyebrow, tracked caps)
GhostDrop is almost here           (H1, Laroka)
Send photos and text between your
screens. Then watch them vanish.   (sub, Plus Jakarta Sans)
Doors open in                      (label)
1d 04h 22m 09s                     (countdown, Laroka numerals)
[ Scan the code ] [ Drop it in ] [ It poofs when you say ]
No accounts. No uploads. Nothing left behind.
```

Mobile: same order, stacked, safe-area padding at the bottom, `min-h-dvh`.

Countdown states:

| Remaining | Format |
| :--- | :--- |
| 1 day or more | `1d 04h 22m 09s` |
| under 1 day | `04h 22m 09s` |
| under 1 hour | `22m 09s` |
| under 1 minute | `09s` |
| zero or past | welcome state, all digits replaced, then auto-unlock |

`LAUNCH_AT` is a single fixed UTC instant (`Date.UTC(2026, 9, 23, 16, 0, 0)`), which is 17:00 WAT on 23 October 2026. Every visitor counts down to the same absolute moment; only the rendered digits vary with their local offset.

---

## 5. Motion Specification

### 5.1 Colour slabs

| Slab | Token | Axis | Duration | Delay | Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Acid Lime | `--color-lime-400` | up | 22s | 0s | 140% x 140% |
| Electric Cobalt | `--color-cobalt-600` | right | 26s | -6s | 130% x 160% |
| Deep Forest | `--color-forest-800` | down | 30s | -12s | 150% x 130% |
| Warm Stone | `--color-stone-100` | left | 18s | -3s | 120% x 150% |

- Container: `absolute inset-0 -z-10 overflow-hidden` plus `aria-hidden="true"`. `overflow: hidden` guarantees the drifting slabs can never create a scrollbar or a horizontal scroll at `360px`.
- Animation uses `transform: translate3d()` only, so every slab stays on the compositor and triggers no layout or paint on scroll.
- Each keyframe loop is `alternate` with `ease-in-out`, so the reversal is invisible and the loop never snaps.
- Legibility scrim: a Warm Stone layer at measured opacity sits between the slabs and the content. Cobalt at full bleed would otherwise drop the headline to roughly 2:1 contrast.
- `will-change: transform` on the four slab nodes only.

### 5.2 The squiggle rule (must be recorded, not assumed)

`decisions.md` D-006 bans fly-in, fly-out, slide-in, and bounce-in **on the squiggly line**. These slabs are colour fields, not the line. Two consequences:

1. Slab translation is permitted and is recorded as **D-015** so no future QA pass flags it as a D-006 breach.
2. If the teaser uses any squiggly line (the plan allows one hero squiggle behind the H1), that line still animates exclusively through `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset: 1 -> 0`. It is never translated, never scaled, never faded in.

### 5.3 Reduced motion

`prefers-reduced-motion: reduce` sets `animation: none !important` on all four slabs plus a static `transform` offset per slab, so the composition still reads as four brand colours but nothing moves. This matches the existing override block at `web/src/index.css` around lines 310 to 340.

### 5.4 Background squiggle layer (rule compliant)

Five squiggly lines live in a second decorative layer, `ComingSoonSquiggles.tsx`, above the colour slabs and below the scrim.

**Motion contract.** Each squiggle obeys D-006 exactly:

1. Draw in with `stroke-dashoffset: 1 -> 0` over roughly `1150ms` on `--ease-draw`.
2. Hold fully drawn for a random few seconds.
3. Retract with `stroke-dashoffset: 0 -> 1`.
4. **Only after the retract completes**, teleport to a newly randomized corner or edge anchor and restart at step 1.

Because the position change happens while the line has zero visible length, the eye reads "a line drew itself over there, vanished, drew itself over there." There is no frame where a visible squiggle is translated. A slide, fly, or bounce on a squiggle remains a P0 breach per D-006.

**Placement.** Anchor points are the four corners plus the four edge midpoints, so "any corner of the screen" is honoured literally. Each of the five squiggles is assigned a shuffled sequence of anchors on mount, and advances one step per cycle, so the layout is random but never oscillates between two fixed spots.

**Rendering contract.**
- Inline SVG `<path pathLength="1">` with `stroke-dasharray: 1`, one per squiggle.
- Stroke colours alternate Deep Forest `--color-forest-800` and Electric Cobalt `--color-cobalt-600`.
- Opacity low enough that the headline stays dominant, and the layer sits under the Warm Stone scrim so contrast is unaffected.
- Sizes and rotations vary per squiggle so the layer does not read as a repeating stamp. Rotation is a static transform on each instance, never animated, so it is not a violation of the draw-only rule.
- `aria-hidden="true"` and `pointer-events-none` on the layer.
- No `will-change`; the draw is `stroke-dashoffset` on a handful of short paths, which is cheap.
- `prefers-reduced-motion: reduce` disables the whole layer, or at minimum renders every squiggle fully drawn and static. Disabling is preferred so the teaser stays calm.

**Randomness without re-render thrash.** The anchor sequence is computed once on mount from `Math.random()`, and cycling is driven by CSS animation delays plus a single `setInterval` that advances an index per squiggle at the end of each cycle. Never randomize during render.

---

## 6. Unlock Protocol

### 6.1 `Ctrl+Alt+C`

- `keydown` listener on `window`, capture phase.
- Fires when `event.ctrlKey && event.altKey && (event.code === 'KeyC' || event.key.toLowerCase() === 'c')`.
- Calls `event.preventDefault()` and ignores `event.repeat`.
- Must fire even when focus is inside an input, a textarea, the code entry, or the QR modal. The wall has no inputs, but the shortcut stays correct if the wall is ever shown over app chrome.
- Ignored on macOS `metaKey` combinations to avoid clashing with system shortcuts; documented in the hook.
- Listener removed on unmount.

### 6.2 Tap the logo 3 times fast

- Taps within a `900ms` window on `#coming-soon-logo`.
- Third tap inside the window unlocks and resets the counter.
- Implemented with `onPointerDown` rather than `onClick` so it works in the installed PWA and on iOS Safari without the 300ms click delay.
- The logo is a `<button type="button">` with `aria-label="GhostDrop"` and no visible button chrome, so the gesture is discoverable by touch but invisible to the eye.

### 6.3 Persistence

- Key: `ghostdrop.launch.unlocked`, value `'1'`.
- Written on unlock, read on mount, wrapped in `try/catch` because Safari private mode throws on `localStorage`.
- On a `storage` failure the gate still works for the session; it just re-locks on reload.

### 6.4 Automatic unveil after launch

- When `remaining <= 0`, the page renders the welcome state instead of the countdown.
- After a hold of about `2600ms`, the page calls `unlock()`, which persists to `localStorage` and swaps the gate to the full app.
- A visitor who arrives after launch follows the identical path: welcome, hold, in.
- The hold exists so the welcome is actually perceived rather than flashing past. It is cleared on unmount so a fast navigation cannot unlock after teardown.
- Manual gestures still work during the hold, so a repeat visitor is never blocked by the animation.

---

## 7. Copy Draft

All strings live in `web/src/lib/copyDeck.ts` and are mirrored into `docs/02-brand-persona-and-copy.md` section 2.

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

Zero em dashes, zero en dashes, zero emoji. Icons are `lucide-react` SVGs only. No string may reference `Ctrl`, `Alt`, a tap count, or the word "shortcut". The welcome copy is the only post-launch string and it mentions no gesture.

---

## 8. Accessibility

- Countdown: `role="timer"` with a static `aria-label` naming the launch date, and `aria-live="off"` so a screen reader is not interrupted every second.
- Slab layer: `aria-hidden="true"` and `pointer-events-none`.
- Focus moves to the H1 on mount so keyboard users land on the page content, not the top of the DOM.
- The logo unlock target is `>= 44px` on both axes.
- Contrast measured against the scrim, not against the moving slab behind it.
- Zero horizontal overflow at `360`, `768`, `1024`, `1440`.

---

## 9. Version and Metadata

- `web/package.json` `"version": "0.8"`.
- `web/package-lock.json` root and `packages[""]` version `0.8` (regenerate with `npm install --package-lock-only`).
- `web/src/lib/constants.ts` `APP_VERSION = '0.8'` so the navbar pill reads `v0.8` after unlock.
- `web/index.html` `<title>` becomes a prelaunch title. After unlock the in-app document title follows the existing route behaviour.

---

## 10. Verification Plan

1. **Gate isolation:** locked, devtools Network shows no `/peerjs` WebSocket and no `0.peerjs.com`; `localStorage` has no `ghostdrop.room.*` keys.
2. **Unlock paths:** `Ctrl+Alt+C` unlocks with focus in the body; tap the logo 3 times in under `900ms` unlocks on a touch emulation viewport; 3 slow taps do not unlock.
3. **Persistence:** reload after unlock stays unlocked; clear site data re-locks.
4. **Countdown:** unit-style check of `formatCountdown` at `0`, `59s`, `1h`, `23h59m`, `1d`, and past zero.
5. **Auto-unveil:** with the clock past `LAUNCH_AT`, the welcome renders, then the gate unlocks itself and persists, and the hub loads. No digits of zero ever display.
6. **Squiggle layer:** five paths, all with `pathLength="1"` and `stroke-dasharray: 1`; computed animation only touches `stroke-dashoffset`; no `translate`, `scale`, or `rotate` animation on any squiggle path; positions change only while the path has zero visible length.
7. **Overflow:** `scrollWidth === clientWidth` at `360`, `768`, `1024`, `1440`, both locked and unlocked.
8. **Reduced motion:** emulate `prefers-reduced-motion: reduce`, confirm `animation-name` is `none` on all four slabs and the squiggle layer is static or absent, and the layout still reads.
9. **Zero em dash, zero en dash, zero emoji** scan across `web/src/` and the docs touched.
10. **`npm run type-check`, `npm run lint`, `npm run build`** all exit `0`.
11. **QA report** at `docs/tasks/step-12-v08-coming-soon-wall/qa-report.md` with 0 P0 and 0 P1 before the gate closes.

---

## 11. Risks

| Risk | Mitigation |
| :--- | :--- |
| `Ctrl+Alt+C` is AltGr+C on some non-US layouts and would type a character instead | Bind on `event.code === 'KeyC'` and always `preventDefault()`. The logo tap path covers any layout. |
| A visitor shares the app before launch and loses the file | `POST /share-target` still stashes to `pendingDrop`; it surfaces after unlock. |
| Cobalt full bleed drops headline contrast below AA | Warm Stone scrim layer at measured opacity, contrast checked against the scrim. |
| Slab drift creates a scrollbar on mobile | `overflow: hidden` on the slab layer, `translate3d` only, no width growth. |
| Wall ships and Step 11 fixes never reach users | Step 11 stays deferred and its own gate runs before any further production push. |
| PWA queued update serves the unlocked bundle to a locked visitor | Unlock is read at runtime from `localStorage`, never baked into the bundle. |

---

## 12. Execution Order

1. `@ghostdrop-web`: gate hook, `App.tsx` wrap, `ComingSoon.tsx` shell, `formatCountdown`, constants, version bump, `index.html`.
2. `@ghostdrop-ui-polish`: `ComingSoonBackdrop`, slab keyframes, reduced motion, copy deck plus `docs/02` teaser section, contrast scrim.
3. `@ghostdrop-qa`: verify section 10 in full, write the QA report.
4. Orchestrator: close the gate in `docs/07-build-order.md`, append completion notes, bump `v0.8` across `package.json`, `package-lock.json`, and `constants.ts`, then push a verified commit to `main` and `staging`.
