
# Step 12 QA Report: Launch Gate, Unlock Gestures, Countdown, Slab Motion and v0.8

**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22

**Verdict:** PASS

**Audited tree:** `web/` at `APP_VERSION = 0.8`, working tree, 2026-10-22. Read-only audit. The only file written by this task is this report.

**Environment:** Windows, Node v22.18.0, npm scripts run inside `web/`. No desktop browser was attached to this session: `browser.tabs.list()` returned `[browser.disconnected] No desktop browser is connected to this session`. Therefore no devtools Network panel, no live pointer or keyboard input, no viewport resize and no `getComputedStyle` read was possible. Every statement below is a command, a `file:line`, or a value produced by executing the real shipped modules in Node through a Vite `ssrLoadModule` harness. Items that could only be proven in a browser are listed in Section 8 and are not counted as passes.

---

## 1. Gate isolation (P0)

### 1.1 Call graph

| Claim | Evidence |
| :--- | :--- |
| Locked path returns before the P2P runtime | `web/src/App.tsx:112-114`: `const { unlocked, unlock } = useLaunchGate()` then `if (!unlocked) return <ComingSoon onUnlock={unlock} />`. `web/src/App.tsx:116` `return <GhostDropApp />` is the only other branch. |
| `GhostRoomProvider` is created only after unlock | the element is built at `web/src/App.tsx:100`, inside `GhostDropApp` declared at `web/src/App.tsx:62`. |
| `AppShell` and `ShellProvider` are created only after unlock | `web/src/App.tsx:101` renders `<AppShell>`; `web/src/components/shell/AppShell.tsx:46` renders `<ShellProvider>`. |
| `createHubCode` cannot run while locked | two occurrences in the whole tree: definition `web/src/App.tsx:20`, call `web/src/App.tsx:66` (a `useState` initializer inside `GhostDropApp`). |
| `generateRoomCode` cannot run while locked | import `web/src/App.tsx:7`, single call site `web/src/App.tsx:22`, reachable only through `createHubCode`. |
| No socket is created at import time | `new Peer(...)` exists only as a lazy factory closure at `web/src/lib/p2p/peerjsEngine.ts:512`; `new PeerJsEngine()` and `engine.connect(...)` both sit inside effects at `web/src/hooks/useGhostRoom.ts:616` and `:787`. |
| No module-level side effect in the entry | `web/src/main.tsx:1-23` performs one `createRoot(...).render(<App />)` and nothing else. |

Static greps backing the table: `grep -rn "createHubCode" web/src/` returns App.tsx:20 and App.tsx:66 only. `grep -rn "new Peer(" web/src/` returns peerjsEngine.ts:512 only. `grep -rn "GhostRoomProvider" web/src/` returns App.tsx:100 as the only render site.

### 1.2 Runtime proof from executing the real modules

Command, run inside `web/`: a Node ESM harness that creates a Vite server with `createServer({ configFile: false, root: process.cwd(), appType: "custom", server: { middlewareMode: true } })`, loads `/src/App.tsx` through `ssrLoadModule`, wraps `crypto.getRandomValues` with a call counter, and renders with `renderToStaticMarkup`.

```
LOCKED_crypto_getRandomValues_calls=0
LOCKED_html_bytes=5908
LOCKED_has_coming_soon_logo=true
LOCKED_soon_slab_count=4
LOCKED_has_desktop_nav_aria_Main=false
LOCKED_has_mobile_dock_aria_Quick_actions=false
LOCKED_has_mobile_status_header_class=false
LOCKED_has_mobile_timer_panel_id=false
LOCKED_signaling_strings=false
LOCKED_role_timer=true
LOCKED_aria_live_off=true
LOCKED_countdown_digit_cells=7
LOCKED_has_input=false
LOCKED_has_how_it_works_nav=false
```

Second harness run, with a shimmed `window` whose `localStorage` returns `1` for `ghostdrop.launch.unlocked`:

```
UNLOCKED_crypto_getRandomValues_calls=1
UNLOCKED_html_bytes=22383
UNLOCKED_has_coming_soon_logo=false
UNLOCKED_has_desktop_nav_aria_Main=true
UNLOCKED_has_mobile_dock_aria_Quick_actions=true
UNLOCKED_mobile_status_header_present=true
UNLOCKED_v08_pill_count=2
UNLOCKED_localStorage_keys=["ghostdrop.launch.unlocked"]
```

Reading: `0` room-code allocations while locked and exactly `1` while unlocked, which is the hub code from `useState(createHubCode)`. The unlocked render is also the only one of the two that needs a `window` global at all, which means no component on the locked path reads `window.location` (`web/src/lib/router.tsx:7-11`). That is an independent signal that the router is not on the locked path.

### 1.3 Network observation

No browser was attached, so the Network panel could not be observed and no live `/peerjs` or `0.peerjs.com` request could be captured. This is an explicit gap, logged in Section 8. The substitutes, in order of strength:

1. Section 1.2: the locked render never constructs the provider subtree, so the `useGhostRoom` effect that owns `new PeerJsEngine()` and `connect()` never runs. React cannot run an effect of a component that was not rendered.
2. `npm run dev` was started and `GET /` returned HTTP 200 with `<title>GhostDrop - Coming soon</title>` (`web/index.html:19`) and only two module scripts, `/@vite/client` and `/src/main.tsx` (`web/index.html:30`). No `peerjs` script tag, no preconnect hint, no inline signaling bootstrap.
3. A peer id cannot be registered without that socket. `ghostdrop-room-` is produced only by `web/src/lib/p2p/roomCode.ts:64` and `ROOM_PREFIX` at `web/src/types/protocol.ts:12`, and the string is absent from the locked markup (`LOCKED_signaling_strings=false`).
4. `localStorage` holds no room key at any point. The only `localStorage` writes in `web/src/` are the three in `web/src/hooks/useLaunchGate.ts:26,42,51`.

### 1.4 Locked DOM contains no app chrome

Grep targets taken from the components themselves: `aria-label="Main"` (`web/src/components/nav/DesktopTopPillBar.tsx:26`), `aria-label="Quick actions"` (`web/src/components/nav/MobileBottomDock.tsx:143`), the `md:hidden` status header (`web/src/components/nav/MobileStatusHeader.tsx:30`), `id="mobile-timer-panel"` (`web/src/components/nav/MobileBottomDock.tsx:94`). All four report `false` against the locked markup, and there is no `input`, `textarea` or `form` element.

The locked root element is:

```
<main class="relative isolate min-h-dvh w-full overflow-x-hidden bg-brand-canvas text-brand-ink">
```

and it contains exactly the `-z-10` backdrop, the logo button, the eyebrow, the H1, the sub, the timer, the three steps and the footnote.

### 1.5 Unlocked tree is the Step 10 tree

`git diff web/src/App.tsx` shows the Step 10 body moved verbatim into `GhostDropApp` with the gate added above it, and no other line changed. `git diff --stat` for the step touches no `web/src/lib/p2p/*`, no `web/src/types/protocol.ts`, no `web/src/sw.ts`, no `web/vite.config.ts` and no `web/vite.localSignaling.ts`; `git status --porcelain` on those paths is empty.

---

## 2. Unlock gestures

All of Section 2 is static verification. No browser was available to deliver a real keydown or pointer event, so each acceptance case was traced line by line against the source.

### 2.1 Ctrl+Alt+C

Source `web/src/hooks/useLaunchGate.ts:58-74`.

| Requirement | Line | Trace |
| :--- | :--- | :--- |
| Ctrl and Alt both held | `:62` | `if (!event.ctrlKey || !event.altKey) return` |
| C pressed, layout independent | `:64` | `event.code === "KeyC"` OR `event.key.toLowerCase() === "c"` |
| Key repeat does not re-trigger | `:61` | `if (event.repeat || event.metaKey) return` |
| Meta combinations ignored | `:61` | same guard |
| preventDefault fires | `:67` | `event.preventDefault()` before `unlock()` |
| Focus position irrelevant | `:72` | `window.addEventListener("keydown", handleKeyDown, true)`, capture phase |
| Removed on unmount | `:73` | `return () => window.removeEventListener(...)` |

Focus in the body, inside the countdown area, or after clicking static text cannot change the outcome: the listener is on `window` in the capture phase, and no handler in `web/src/` cancels a keydown. `grep -rn "stopPropagation" web/src/` returns `NONE`. The only other keydown listener is `web/src/components/qr/QrScannerModal.tsx:458` on `document` in the bubble phase, and that component is app chrome that cannot mount while locked.

Known quirk, already recorded in `plans/coming-soon-wall-plan.md` section 11: `AltGr` reports `ctrlKey + altKey` on Windows, so `AltGr+C` unlocks on a layout that maps C under AltGr. Logged as P3.6.

### 2.2 Triple tap on the logo

Source `web/src/hooks/useLaunchGate.ts:90-118`, wired at `web/src/pages/ComingSoon.tsx:128` as `onPointerDown`.

| Trace | Result |
| :--- | :--- |
| taps at 0ms, 400ms, 800ms | the filter at `:105` keeps both survivors, `:106` pushes the third, `:108` sees length 3, `:109` resets, `:110` unlocks |
| taps at 0ms, 1500ms, 3000ms | each filter at `:105` drops everything older than 900ms, so every tap restarts the count at 1 and 3 is never reached |
| 900ms boundary | `:105` uses `now - tap <= windowMs`, inclusive |
| window size | `:14` `DEFAULT_TAP_WINDOW_MS = 900` |
| pointer down, not click | `web/src/pages/ComingSoon.tsx:128` |

Hit target, from the rendered locked markup:

```
<button type="button" id="coming-soon-logo" aria-label="GhostDrop" class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent px-3 py-2 ...">
```

Both axes are at least 44px: `min-h-[44px]` and `min-w-[44px]` around a 40px mark plus `px-3 py-2`.

### 2.3 Persistence

| Requirement | Line | Result |
| :--- | :--- | :--- |
| Lazy read, Safari safe | `web/src/hooks/useLaunchGate.ts:22-31` | `useState(readUnlocked)`, `try/catch`, a thrown read means locked |
| Key name | `web/src/lib/constants.ts:17` | `ghostdrop.launch.unlocked` |
| Write on unlock | `web/src/hooks/useLaunchGate.ts:42` | `setItem(LAUNCH_UNLOCK_KEY, "1")` |
| Refused write still unlocks the session | `:43-46` | catch, then `setUnlocked(true)` |
| Clearing site data re-locks | `:26` | a missing key returns `null`, the comparison against `1` is `false` |

The unlocked harness render in Section 1.2 succeeded only because the shimmed store returned `1` for that exact key, so the read path is proven end to end. Reload persistence and clearing were not exercised live.

### 2.4 No visible affordance

Command: `grep -rniE "ctrl|alt+|shortcut|three taps|triple tap|3 taps|tap count" web/src/pages/ComingSoon.tsx web/src/components/soon/ web/src/lib/copyDeck.ts docs/02-brand-persona-and-copy.md` returns no match.

`web/src/lib/copyDeck.ts:299-308` holds all nine `SOON_*` keys with no gesture wording. `docs/02-brand-persona-and-copy.md:43-63` mirrors them and states the rule at line 62. The only accessible name added by the logo is `Version 0.8` (`web/src/components/brand/Logo.tsx:73`).

---

## 3. Countdown and automatic unveil

### 3.1 Boundary table

Values produced by loading the real `web/src/lib/format.ts` through the harness and calling the exported functions:

| remainingMs | countdownSegments | formatCountdown |
| :--- | :--- | :--- |
| `0` | `[]` | `""` |
| `9000` | `[{09,s}]` | `09s` |
| `59000` | `[{59,s}]` | `59s` |
| `60000` | `[{01,m},{00,s}]` | `01m 00s` |
| `3600000` | `[{01,h},{00,m},{00,s}]` | `01h 00m 00s` |
| `86399000` | `[{23,h},{59,m},{59,s}]` | `23h 59m 59s` |
| `86400000` | `[{1,d},{00,h},{00,m},{00,s}]` | `1d 00h 00m 00s` |
| `-86400000` | `[]` | `""` |

All eight match `docs/tasks/step-12-v08-coming-soon-wall/web-task.md` section 2 and the UI Polish completion note.

### 3.2 Launch instant

```
LAUNCH_AT=1792771200000  iso=2026-10-23T16:00:00.000Z
LAUNCH_AT_utc_plus_1=23 October 2026 at 17:00:00 GMT+1   (Africa/Lagos)
LAUNCH_UNLOCK_KEY=ghostdrop.launch.unlocked  APP_VERSION=0.8
```

`web/src/lib/constants.ts:14` is `Date.UTC(2026, 9, 23, 16, 0, 0)`, so `LAUNCH_AT === Date.UTC(2026, 9, 23, 16, 0, 0)` and equals `2026-10-23T16:00:00.000Z`. The `Africa/Lagos` rendering hits zero at 17:00 local, matching D-015 item 4.

### 3.3 Automatic unveil

| Requirement | Line | Result |
| :--- | :--- | :--- |
| Digits replaced by the welcome at or past zero | `web/src/pages/ComingSoon.tsx:55`, `:72-79` | `launched = remaining <= 0` and the whole countdown block returns the `SOON_WELCOME` state |
| Hold, then unlock | `:36`, `:64-70` | `UNVEIL_HOLD_MS = 2600`, `setTimeout(onUnlock, UNVEIL_HOLD_MS)` |
| Hold cleared on unmount | `:69` | `return () => clearTimeout(id)` |
| Unlock persists and the hub renders | `web/src/hooks/useLaunchGate.ts:42`, `web/src/App.tsx:114-116` | `setItem` then `setUnlocked(true)`, and `App` re-renders into `GhostDropApp` |
| Late visitor needs no gesture and no reload | `:53` | the initial `now` is `Date.now()`, so `launched` is true on the first render and the same welcome, hold, in path runs |
| Interval stops once launched | `:57-62` | the effect returns early when `launched` and the previous cleanup already cleared the interval |
| Manual gestures still work during the hold | `web/src/App.tsx:114` | either gesture flips the same `unlocked` state, which unmounts the wall and clears the hold |

One edge defect: `countdownSegments(999)` returns `[{value:"00",unit:"s"}]`, so `00s` renders for up to 1000ms immediately before `LAUNCH_AT`. The all-zero display does reach the screen, briefly. Finding P2.1.

### 3.4 Re-render scope

`now` is created and updated only inside `LaunchClock` (`web/src/pages/ComingSoon.tsx:52-53`, `:60`). `ComingSoon` (`:111`) holds only `headingRef` and the tap hook, and `<ComingSoonBackdrop />` at `:121` is a sibling of `<LaunchClock />` at `:148`, so a tick cannot re-render either decorative layer. Structural proof only, because no render counter could be attached without a browser.

### 3.5 Accessibility

Rendered locked markup, verbatim:

```
<div role="timer" aria-live="off" aria-label="Time left until GhostDrop opens on 23 October 2026" class="soon-countdown ...">
<h1 tabindex="-1" class="type-display max-w-[20ch] text-center text-balance outline-none">GhostDrop is almost here</h1>
```

Label constant at `web/src/pages/ComingSoon.tsx:33`, focus effect at `:115-117`.

### 3.6 Fixed digit cells

`.soon-countdown-digit{text-align:center;width:.66em;display:inline-block}` is present in the built stylesheet and applied at `web/src/pages/ComingSoon.tsx:97`, so the row width does not change while the seconds tick. `.soon-countdown` also sets `font-family: var(--font-display)` (Laroka) and `font-feature-settings: "tnum" 1`. Seven digit cells render at the current one-day distance, which is `1d HHh MMm SSs`.

---

## 4. Slab and squiggle motion

### 4.1 Four slabs, tokens only

| Class | Colour declaration | Axis | Duration and delay |
| :--- | :--- | :--- | :--- |
| `.soon-slab-lime` | `var(--color-lime-400)` (`web/src/index.css:354`) | up | `22s`, `0s` (`:355`) |
| `.soon-slab-cobalt` | `var(--color-cobalt-600)` (`:363`) | right | `26s`, `-6s` (`:364`) |
| `.soon-slab-forest` | `var(--color-forest-800)` (`:372`) | down | `30s`, `-12s` (`:373`) |
| `.soon-slab-stone` | `var(--color-stone-100)` (`:381`) | left | `18s`, `-3s` (`:383`) |

`grep -nE "#[0-9A-Fa-f]{3,8}" web/src/pages/ComingSoon.tsx web/src/components/soon/ComingSoonBackdrop.tsx web/src/components/soon/ComingSoonSquiggles.tsx` exits 1, so zero raw hex in the Step 12 surface. The four tokens resolve to `#CDF22B`, `#1E45FB`, `#124B38` and `#EBEAE4` at `web/src/styles/tokens.css:17,21,26,32`.

### 4.2 Computed animation-name

No browser was available for `getComputedStyle`, so these are the built declarations extracted from `dist/assets/index-CalMwRNJ.css` after `npm run build`. Each class has exactly one competing rule in the normal cascade:

```
.soon-slab-lime{... animation:22s ease-in-out infinite alternate soon-slab-drift-up ...}
.soon-slab-cobalt{... animation:26s ease-in-out -6s infinite alternate soon-slab-drift-right ...}
.soon-slab-forest{... animation:30s ease-in-out -12s infinite alternate soon-slab-drift-down ...}
.soon-slab-stone{... animation:18s ease-in-out -3s infinite alternate soon-slab-drift-left ...}
```

Computed `animation-name`: `soon-slab-drift-up`, `soon-slab-drift-right`, `soon-slab-drift-down`, `soon-slab-drift-left`. One distinct axis per class, all `infinite alternate`. Every keyframe body is `transform` only (`web/src/index.css:312-346`); no `top`, `left`, `width`, `height`, `margin`, `opacity` or `filter` appears inside a `soon-slab-drift-*` frame. The build rewrites the `translate3d` shorthand into `translate()` and `translateY()` (lightningcss), which is still a transform and still compositor only. Logged as P3.1.

### 4.3 Five squiggles, draw only

`SQUIGGLE_COUNT = 5` at `web/src/components/soon/ComingSoonSquiggles.tsx:61`. Built stylesheet:

```
soon-squiggle-draw{0%{stroke-dashoffset:1px}to{stroke-dashoffset:0}}
soon-squiggle-retract{0%{stroke-dashoffset:0}to{stroke-dashoffset:1px}}
.soon-squiggle-path{stroke-dasharray:1;stroke-dashoffset:1px;animation:soon-squiggle-draw var(--soon-draw,var(--dur-draw)) var(--ease-draw) forwards, soon-squiggle-retract .9s var(--ease-draw) var(--soon-retract-delay,3.15s) forwards}
```

Every path carries `pathLength="1"` and `strokeDasharray="1"` at `ComingSoonSquiggles.tsx:212-213` and `className="soon-squiggle-path"` at `:219`. `stroke-dashoffset` is the only animated property on any squiggle. No animated `transform`, `translate`, `top`, `left` or `opacity` exists on a squiggle path. The only transform is a static per-instance `rotate()` on the wrapper `svg` at `:207`, chosen once in `buildSpecs` at `:114`. No `will-change` on the layer.

### 4.4 Anchor change happens at zero visible length

| Quantity | Value | Source |
| :--- | :--- | :--- |
| Draw | `1150ms` | `:64`, `web/src/index.css:433` |
| Retract delay | `DRAW_MS + hold` | `ComingSoonSquiggles.tsx:186` |
| Retract | `900ms` | `:65` |
| Hold range | `2000` to `5000` | `:66-67` |
| Cycle tail | `240` | `:69` |
| Interval period | `1150 + 5000 + 900 + 240 + rand(0..900)` = `7290` to `8190` | `:109`, `:118` |

The latest possible retract end is `1150 + 5000 + 900 = 7050ms` and the earliest interval fire is `7290ms`, so the anchor change always lands at least `240ms` after the retract completes. The interval at `:151-168` bumps the nonce at `:163-164` in the same commit as the anchor step at `:157-158`, which remounts the `svg` through the key at `:190`; the fresh path restarts at `stroke-dashoffset: 1`, fully retracted.

Both animations use `forwards` fill and the retract has no backwards fill, so during its delay the retract declaration does not apply and the draw animation holds the path fully drawn. The sequencing claim in the UI Polish completion note is correct.

### 4.5 Randomness and advance

`shuffledAnchors()` at `:95-106` (Fisher-Yates) is called only from `buildSpecs()` at `:119`, which is called only from the mount effect at `:128`, never from the render body. There are eight anchors at `:25-34`, the four corners plus the four edge midpoints. The advance is `(steps[index] + 1) % ANCHORS.length` at `:158`, one anchor per cycle.

### 4.6 Exactly five squiggles render

`<ComingSoonBackdrop />` is rendered once at `web/src/pages/ComingSoon.tsx:121`. `ComingSoonSquiggles` is imported and rendered only by `web/src/components/soon/ComingSoonBackdrop.tsx:1,29`, so the page never renders it directly and the count is five, not ten. Layer order inside the backdrop is slab, squiggle, scrim.

### 4.7 Overflow

Structurally contained at every width: `main` is `overflow-x-hidden` (`ComingSoon.tsx:120`), the backdrop container is `absolute inset-0 ... overflow-hidden` (`ComingSoonBackdrop.tsx:23`), the squiggle layer is `absolute inset-0 overflow-hidden` (`ComingSoonSquiggles.tsx:179`), and every slab geometry is a percentage inside that clipped box (`web/src/index.css:349-384`). No descendant can widen the document. The four-width measurement at `360`, `768`, `1024` and `1440` was not executed; see Section 8.

### 4.8 Reduced motion

Last block of the built stylesheet, inside `@media (prefers-reduced-motion: reduce)`:

```
*,:before,:after{transition-duration:1ms!important;animation-duration:1ms!important;animation-iteration-count:1!important;animation-delay:0s!important}
.soon-slab-lime,.soon-slab-cobalt,.soon-slab-forest,.soon-slab-stone{will-change:auto;animation:none!important}
.soon-slab-lime{transform:translateY(-4%)}
.soon-slab-cobalt{transform:translate(4%)}
.soon-slab-forest{transform:translateY(4%)}
.soon-slab-stone{transform:translate(-4%)}
.soon-squiggle-layer{display:none}
```

The wildcard rule has specificity `(0,0,0)` and the slab class rules have `(0,1,0)`. Both are `!important`, so the class rule wins and computed `animation-name` is `none` on all four slabs. The squiggle layer is `display: none`. The static per-slab offsets stay, so the composition still reads as four separate colour fields. The runtime timers are also skipped at `ComingSoonSquiggles.tsx:145-147`. The media query itself was not flipped in a browser; the cascade proof above is the substitute.

### 4.9 D-006 verdict

**D-006 verdict: compliant.** The four slabs are colour fields, not the squiggly line, and are permitted by D-015 item 7; they animate `transform` only, so they are outside D-006 scope. Every squiggly line on the teaser is draw only per D-015 item 6: `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset` from `1` to `0` to `1`, with the anchor teleport executed while the path has zero visible length. There is no translation, scaling, fade, fly, slide or bounce anywhere on a squiggle. No P0 on either primitive.

---

## 5. Full 6-gate regression (`docs/08-qa-checklist.md`)

| Gate | Result | Key evidence |
| :--- | :--- | :--- |
| 1 Brand tokens, Laroka, nav split, squiggle fidelity | PASS | zero raw hex in the Step 12 TSX surface (grep exit 1); Laroka on headline and numerals; three-way nav split still keyed on `md` |
| 2 Playful copy, zero U+2014, zero U+2013, zero emoji, zero alert | PASS | 134 file scan, 0 dash hits, 0 emoji hits, no `alert()` |
| 3 Shared wire protocol and 16KB chunking | PASS | files untouched by this step; `CHUNK_SIZE_BYTES = 16384` |
| 4 TTL self-destruct and object URL ledger | PASS | `janitor.ts` untouched; `beforeunload` and `pagehide` registered; four revoke sites |
| 5 PWA, Web Share Target, QR scanner | PASS | `share_target` `POST /share-target` in the manifest; `sw.ts` untouched |
| 6 Accessibility, viewports, build health | PASS with scope note | 44px target, `role="timer"`, H1 focus, structural overflow containment, three scripts exit 0 |

### 5.1 Gate 1

- Tokens: only `web/src/index.css` and no token file changed. The three new TSX files use `var(--color-*)` and `text-brand-*` / `bg-brand-*` utilities only.
- Laroka: `.type-display` at `web/src/index.css:110` and the built `.soon-countdown` rule both resolve to `var(--font-display)`, which is `Laroka` first at `web/src/styles/tokens.css:54`, face declared at `:9`.
- Nav split at 768px: DesktopTopPillBar root `hidden ... md:block` (`web/src/components/nav/DesktopTopPillBar.tsx:21`), MobileStatusHeader root `md:hidden` (`web/src/components/nav/MobileStatusHeader.tsx:30`), MobileBottomDock root `md:hidden` (`web/src/components/nav/MobileBottomDock.tsx:83`). Section 1.2 already proved all three absent while locked and present after unlock.
- Squiggle fidelity: every squiggle path site uses `pathLength="1"` (`web/src/components/brand/SquiggleLine.tsx:64`, `web/src/components/soon/ComingSoonSquiggles.tsx:212`, `web/src/pages/HowItWorks.tsx:111`) or the numeric `pathLength={1}` (`web/src/components/room/TransferCard.tsx:71`). `stroke-dasharray: 1` at `web/src/index.css:219,230,430`. No fly, slide or bounce keyframe exists on any squiggle.

### 5.2 Gate 2

- Dash and emoji scan over 134 files (`web/src`, `docs`, `web/index.html`, extensions ts tsx css html md json webmanifest): `files_scanned=134 dash_hits=0 emoji_hits=0`, testing U+2014, U+2013 and the emoji blocks.
- `grep -rn "alert(" web/src/` returns `NO alert() CALLS`.
- Teaser copy is read from the deck (`web/src/pages/ComingSoon.tsx:19-29`), no raw technical string, no protocol jargon.
- Icons: `Sparkles` from `lucide-react` (`ComingSoon.tsx:13`), step badges are `OrbBadge`.

### 5.3 Gate 3

- `git status --porcelain web/src/lib/p2p web/src/types/protocol.ts` is empty, so the protocol and the streamer are byte identical to Step 10.
- `CHUNK_SIZE_BYTES = 16384` (`web/src/types/protocol.ts:6`).
- `channel.bufferedAmountLowThreshold = BUFFERED_LOW_THRESHOLD` (`web/src/lib/p2p/fileStreamer.ts:81`).

### 5.4 Gate 4

- `web/src/lib/p2p/janitor.ts` untouched.
- `beforeunload` and `pagehide` registered at `web/src/lib/p2p/janitor.ts:507-508`, removed at `:514-515`.
- `URL.revokeObjectURL` call sites: `web/src/lib/p2p/janitor.ts:474`, `web/src/hooks/useGhostRoom.ts:283`, `web/src/components/qr/QrScannerModal.tsx:132`.
- TTL labels unchanged and still match D-012: `web/src/lib/constants.ts:31-35` and `web/src/lib/copyDeck.ts:278-287`.

### 5.5 Gate 5

- `share_target` with `action: /share-target` and `method: POST` at `web/vite.config.ts:116-118`; icons 192, 512 and maskable at `:96-114`; all four files present in `web/public/icons/`.
- `web/src/sw.ts` untouched, routing `SHARE_TARGET_PATH` at `:106` and persisting through `saveSharePayload` at `:70`.
- `stashPendingDrop` and `takePendingDrop` unchanged (`web/src/hooks/useShareIntake.ts:18`, `web/src/pages/HomeHub.tsx:18`, `web/src/pages/ConnectedWorkspace.tsx:18`), so a share during prelaunch is stashed and surfaces after unlock.

### 5.6 Gate 6

- Touch target: `min-h-[44px] min-w-[44px]` on `#coming-soon-logo`.
- `role="timer"` with `aria-live="off"` and a static date label; H1 focused on mount with `tabindex="-1"`.
- Overflow: structural containment only (Section 4.7). This is the one Gate 6 line that was not measured live.
- Build health: Section 6.

---

## 6. Version and build

### 6.1 Version

| Artifact | Value | Evidence |
| :--- | :--- | :--- |
| `web/package.json` | `0.8` | `node -e "console.log(require("./package.json").version)"` -> `0.8` |
| `web/package-lock.json` root | `0.8` | `node -e "...l.version..."` -> `root: 0.8` |
| `web/package-lock.json` `packages[""]` | `0.8` | same command -> `packages[""]: 0.8` |
| `APP_VERSION` | `0.8` | `web/src/lib/constants.ts:8` |
| Teaser pill | 1 render | `LOCKED_v08_pill=1` |
| App navbars after unlock | 2 renders | `UNLOCKED_v08_pill_count=2` (DesktopTopPillBar plus MobileStatusHeader) |
| New dependency | none | `git diff web/package.json` is one line, the `version` field only |

### 6.2 Build output

```
$ npm run type-check
> ghostdrop-web@0.8 type-check
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.sw.json
TYPECHECK_EXIT=0

$ npm run lint
> ghostdrop-web@0.8 lint
> eslint .
LINT_EXIT=0

$ npm run build
> tsc -b && vite build
vite v8.3.4 building client environment for production...
transforming...
2021 modules transformed.
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.77 kB
dist/index.html                   1.25 kB | gzip:   0.62 kB
dist/assets/index-CalMwRNJ.css   46.45 kB | gzip:   9.45 kB
dist/assets/index-9ljuHSLs.js   605.83 kB | gzip: 188.84 kB
built in 3.79s
PWA v2.0.0  mode injectManifest  format es
dist/sw.mjs  18.52 kB | gzip: 6.34 kB
precache  11 entries (638.35 KiB)
dist/sw.js
BUILD_EXIT=0
```

All three scripts exit `0` in `web/`. Non-blocking build notice, recorded for completeness: `(!) Some chunks are larger than 500 kB after minification` against `index-9ljuHSLs.js` (605.83 kB). It is a warning, not an error, and the app ships a single entry chunk by configuration.

---

## 7. Findings

**P0: none.** No signaling, room state or nav chrome on the locked path, no visible translated squiggle, no em dash, en dash, emoji or raw hex, no failing build, no TTL leak.

**P1: none.**

**P2**

- **P2.1 `00s` renders for the final sub-second before launch.** `web/src/pages/ComingSoon.tsx:55` computes `launched = remaining <= 0` while `web/src/lib/format.ts:83` floors the seconds, so `countdownSegments(1..999)` returns `[{value:"00",unit:"s"}]`. Observed: `remaining=999 -> segments=[{value:"00",unit:"s"}]`. The terminal all-zero display therefore appears for up to 1000ms instead of never. Fix: change `web/src/pages/ComingSoon.tsx:55` to `const launched = remaining < 1000` so the welcome takes over for the whole final second.

**P3**

- **P3.1 Built CSS rewrites `translate3d()`.** lightningcss emits `translate()` and `translateY()` in `dist/assets/index-CalMwRNJ.css` even though `web/src/index.css:314-345` uses `translate3d`. Behaviour is unchanged and still transform only. Fix: none required; if the literal token matters to the D-015 item 7 wording, note the compiler rewrite in the decision record.
- **P3.2 `formatCountdown` is exported but unreachable from the UI.** No shipped module calls it; the page consumes `countdownSegments` (`web/src/lib/format.ts:117`, `web/src/pages/ComingSoon.tsx:81`), and there is no test file in `web/src`. Fix: keep it and add one unit test, or delete it and document the segment contract instead.
- **P3.3 Reduced motion is sampled once at mount.** `web/src/components/soon/ComingSoonSquiggles.tsx:145-147` returns early on the initial `matchMedia` result and never re-checks. Toggling the OS setting mid session leaves five intervals running, though `display: none` hides all motion. Fix: subscribe with `mq.addEventListener("change", ...)` and clear the timers when it flips to reduce.
- **P3.4 The interval effect depends on effect ordering.** `ComingSoonSquiggles.tsx:138-143` reads `specsRef.current` populated by the preceding effect at `:127-136`. Correct today because effects run in declaration order, but order sensitive. Fix: build the specs in the `useState` initializer of `cycleState` and derive the timers from that state.
- **P3.5 `onPointerDown` counts any button as a tap.** `web/src/pages/ComingSoon.tsx:128` forwards the handler with no event argument, so a right click or middle click on the logo counts (`web/src/hooks/useLaunchGate.ts:103`). Fix: take the event and ignore `event.button !== 0`.
- **P3.6 `AltGr+C` unlocks on Windows.** `AltGr` reports `ctrlKey + altKey`, and `web/src/hooks/useLaunchGate.ts:62` only checks those two flags. Already listed as a known risk in `plans/coming-soon-wall-plan.md` section 11. Fix: none required; the logo tap is the layout independent path.
- **P3.7 Teaser copy section is unnumbered.** `docs/02-brand-persona-and-copy.md:43` titles the block "Prelaunch Coming Soon Wall" while the Step 12 task files refer to "section 2.1". Fix: number the heading 2.1 or drop the number from the task references.

---

## 8. Residual risks

1. **No live browser.** Every interaction test in Section 2 (Ctrl+Alt+C from three focus positions, key repeat, three fast taps, three slow taps, reload persistence, cleared site data) is a source trace, not an execution. The logic is simple and was read line by line, but it was not exercised.
2. **No Network capture.** Gate isolation rests on the render harness plus the call graph, not on a devtools Network panel. A live capture with a clean `localStorage` is still worth doing before the public push, because it is the only check that observes the socket itself.
3. **No computed-style read and no reduced-motion emulation.** Sections 4.2 and 4.8 derive `animation-name` from the built cascade and CSS specificity, not from `getComputedStyle`.
4. **No four-width overflow measurement.** Section 4.7 is structural containment only. The tightest case is `360px` with seven digit cells at `clamp(1.75rem,7vw,3.25rem)`.
5. **Squiggle legibility is a visual judgement.** Whether five low opacity lines read as brand rather than noise under the Warm Stone wash needs eyes on the page.
6. **Contrast figures were not recomputed.** The 8.86:1 worst case for Jet Ink over Deep Forest at the lightest wash stop is taken from the UI Polish completion note, not measured here.
7. **Service worker update path unverified.** A visitor holding a cached prelaunch bundle keeps the wall until the SW swaps. Unlock is read from `localStorage` at runtime and never baked into the bundle, so the gate logic cannot serve an unlocked bundle to a locked visitor.
8. **Dev server port drift.** `npm run dev` started on `5174` because `5173` was already held by another process, and the local signaling plugin reported port `9000` in use and reused it. Nothing in this audit depended on either port, and the server started here was terminated afterwards.

---

## 9. Gate close recommendation

Zero P0 and zero P1 against `docs/tasks/step-12-v08-coming-soon-wall/qa-task.md`. Six of six brand and build gates pass. P2.1 is a one-line edge fix at `web/src/pages/ComingSoon.tsx:55` and is safe to apply before the push. P3.1 to P3.7 are optional. The four items in Section 8 rows 1 to 4 are the only acceptance lines this audit could not execute, and each carries a stated substitute.
