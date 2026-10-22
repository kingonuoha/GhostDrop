# Step 12: Web Task - Launch Gate, Hidden Unlock Gestures, Countdown and Version 0.8
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - web-complete - 2026-10-22

## Assigned Agent
`@ghostdrop-web`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agents/rules/GEMINI.md`, `.agents/BRAND.md`
- `decisions.md` (`D-006`, `D-008`, `D-009`, `D-015`)
- `docs/01-wireframe-and-pages.md`
- `docs/02-brand-persona-and-copy.md`
- `docs/05-motion-spec.md`
- `plans/coming-soon-wall-plan.md`
- `docs/tasks/step-12-v08-coming-soon-wall/brief.md`

## Objective
Gate every route behind a public teaser rendered ABOVE the P2P runtime, provide two hidden unlock gestures, ship a live countdown to 23 October 2026 at 17:00 local, and bump the version to `0.8` with no new dependency.

---

## Detailed Implementation Specifications

### 1. Launch constants in `web/src/lib/constants.ts`

```ts
export const APP_VERSION = '0.8'

/**
 * Prelaunch gate. Launch is 23 October 2026 at 17:00 WAT (UTC+1), which is
 * 16:00 UTC. Fixed global instant so every visitor counts to the same moment.
 */
export const LAUNCH_AT = Date.UTC(2026, 9, 23, 16, 0, 0)

/** localStorage key for the hidden unlock, see decisions.md D-015. */
export const LAUNCH_UNLOCK_KEY = 'ghostdrop.launch.unlocked'
```

Use `Date.UTC(...)`, **not** the local `new Date(year, monthIndex, ...)` constructor and not an ISO string without an offset. The launch is one absolute moment worldwide: `2026-10-23T16:00:00Z`. A visitor in Lagos sees the countdown hit zero at 17:00, a visitor in London at 16:00, and both unveil simultaneously. Month index `9` is October.

Also set `web/package.json` `"version": "0.8"`, then run `npm install --package-lock-only --no-audit --no-fund` inside `web/` so the lockfile root and `packages[""]` version agree at `0.8`. Do not install any package.

### 2. `web/src/lib/format.ts`: `formatCountdown`

Add alongside the existing `formatTimeLeft`:

```ts
export function formatCountdown(remainingMs: number): string
```

Rules:
- `remainingMs <= 0` returns an empty string. The page renders the live copy instead of digits.
- `>= 1 day`: `1d 04h 22m 09s`
- `< 1 day`: `04h 22m 09s`
- `< 1 hour`: `22m 09s`
- `< 1 minute`: `09s`
- Always zero-pad to two digits, except the day segment which is unpadded.
- Pure function, no `Date.now()` inside it, so it is trivially testable.

### 3. `web/src/hooks/useLaunchGate.ts` (new)

```ts
export type LaunchGate = {
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

export function useLaunchGate(): LaunchGate
```

Requirements:
- Read `localStorage.getItem(LAUNCH_UNLOCK_KEY) === '1'` in a lazy `useState` initializer, wrapped in `try/catch` because Safari private mode throws on access. A thrown read means locked.
- `unlock()` writes `'1'` inside the same `try/catch` and sets state. A failed write still unlocks for the session.
- `lock()` removes the key and sets state to `false`. Not wired to any UI.
- `Ctrl+Alt+C` listener registered on `window` in the capture phase:
  - fires when `event.ctrlKey && event.altKey && (event.code === 'KeyC' || event.key.toLowerCase() === 'c')`
  - calls `event.preventDefault()`
  - ignores `event.repeat`
  - ignores combinations that also hold `event.metaKey`
  - fires regardless of where focus sits
  - removed on unmount
- Export a second hook for the tap gesture so the page can own the DOM target:

```ts
export function useTripleTapLogo(onUnlock: () => void, windowMs?: number): {
  onPointerDown: () => void
}
```

  - Three taps inside `900ms` (default, overridable) call `onUnlock()` and reset the counter.
  - Uses `onPointerDown` so it works in the installed PWA and on iOS Safari without the 300ms click delay.
  - A tap that arrives after the window closes starts a fresh count at `1`.
  - Clean up the internal timestamp ref on unmount.

### 4. `web/src/App.tsx`: gate above the P2P runtime

Current shape renders `<GhostRoomProvider session={session}><AppShell>{page}</AppShell></GhostRoomProvider>` unconditionally.

Target shape:

```tsx
export default function App() {
  const { unlocked } = useLaunchGate()
  if (!unlocked) return <ComingSoon />
  // ... existing router, session, and provider tree, unchanged
}
```

Hard requirements:
- The gate is evaluated BEFORE `createHubCode()` runs. `useState(createHubCode)` currently allocates a room code on mount; while locked that must not happen. Either move the hub code allocation below the gate or make it lazy in a way that the locked path never evaluates.
- While locked there must be no `GhostRoomProvider`, no `AppShell`, no `ShellProvider`, therefore no `/peerjs` WebSocket, no room peer id registration, and no ICE gathering.
- `useRoute()` may still run, it is harmless, but nothing may navigate away from the teaser while locked.
- Keep the existing router and session logic byte-identical for the unlocked path so Step 10 behaviour is untouched.

### 5. `web/src/pages/ComingSoon.tsx` (new)

Composition, single centred column, max width `1120px`, `min-h-dvh`:

```text
<ComingSoonBackdrop />                     (ui-polish owns this file)
<button id="coming-soon-logo">             (brand mark plus v0.8 pill, 44px target)
<eyebrow>   Coming soon
<h1>        GhostDrop is almost here        (Laroka, focus on mount)
<p>         Send photos and text between your screens. Then watch them vanish.
<label>     Doors open in
<timer>     1d 04h 22m 09s                  (Laroka numerals, role="timer")
<3 steps>   Scan the code / Drop it in / It poofs when you say
<footer>    No accounts. No uploads. Nothing left behind.
```

Behaviour:
- One `useEffect` with `setInterval(1000)` writes a `now` state. Scope it so only the countdown subtree re-renders, never the backdrop and never the squiggle layer. Clear the interval on unmount.
- Compute `remaining = LAUNCH_AT - now`.
- **At or past launch the wall unveils itself:**
  - Replace the entire countdown block with the welcome state (`SOON_WELCOME` from the copy deck plus a `lucide-react` icon).
  - After a `2600ms` hold, call `unlock()` so the gate persists the unlock and swaps to the full app.
  - A visitor who arrives after `LAUNCH_AT` follows the identical path on mount: welcome, hold, in.
  - Clear the hold timer on unmount so a fast navigation cannot unlock after teardown.
  - Manual gestures still work during the hold, so a returning visitor is never blocked by the animation.
  - Zero digits must ever render. Never display `0d 00h 00m 00s`.
- `role="timer"` with `aria-live="off"` and a static `aria-label` naming the launch date, so a screen reader is not interrupted every second.
- Focus the H1 on mount.
- The logo unlock target is a real `<button type="button">` with `aria-label="GhostDrop"`, no visible button chrome, a `>= 44px` hit area, and `{...useTripleTapLogo(unlock)}` wired to `onPointerDown`. It must render the brand mark plus the `v0.8` pill already used by `<Logo withWordmark />` so the version rule from `AGENTS.md` Section 5 holds on the teaser too.
- No desktop nav bar and no mobile dock on this page. Those are app chrome and belong behind the gate.
- No inputs, no scanner, no P2P affordance.
- Mobile: stacked order, safe-area bottom padding, zero horizontal overflow at `360px`.
- No copy string anywhere on this page may mention `Ctrl`, `Alt`, a tap count, or the word "shortcut".

### 6. `web/index.html`

Prelaunch `<title>` and description so link previews read as a teaser, not as a live product. Example title: `GhostDrop - Coming soon`. Keep `<meta name="theme-color" content="#CDF22B" />` unchanged. Zero em dashes in the description.

### 7. Copy consumption

Do not hardcode foreground copy in the page if `@ghostdrop-ui-polish` has added the `SOON_*` keys to `web/src/lib/copyDeck.ts`. Read them from the deck. If the keys are not present yet when you start, write the page against the key names listed in the brief and coordinate through the copy deck rather than inventing parallel strings.

---

## NON-NEGOTIABLE GUARDRAILS
- **Gate position is a P0.** Wall above `GhostRoomProvider`. No signaling, no room id, no ICE while locked.
- **No visible unlock affordance.** Nothing on the page may hint at `Ctrl+Alt+C` or the 3-tap gesture.
- **ZERO em dashes (U+2014), ZERO en dashes (U+2013), ZERO emojis.** Use `lucide-react` SVGs.
- **No new dependencies.** `web/package.json` changes only the `version` field.
- **Do not touch** `web/src/lib/p2p/*`, `web/src/types/protocol.ts`, `web/src/sw.ts`, `web/vite.config.ts`, `web/vite.localSignaling.ts`, or `web/src/index.css` (index.css belongs to ui-polish).
- **Tokens only**, no raw hex outside the token files. `Laroka` for headline and countdown numerals.
- **Windows PowerShell safe file ops:** write tool to create, edit tool to modify. NEVER use bash heredocs.

## Verification Checklist
- [x] `web/package.json` and `web/package-lock.json` read `0.8`, `APP_VERSION` is `'0.8'`, no dependency added.
- [ ] Locked: devtools Network shows no `/peerjs` WebSocket and no `0.peerjs.com`; no `ghostdrop-room-` peer id; `localStorage` holds no room keys.
- [ ] `Ctrl+Alt+C` unlocks from any focus position, `preventDefault` fires, and key repeat does not re-trigger.
- [ ] Three taps on the logo inside `900ms` unlock; three slow taps do not.
- [ ] Reload after unlock stays unlocked. Clearing site data re-locks.
- [x] `formatCountdown` returns the exact strings for `0`, `9000`, `59_000`, `3_600_000`, `86_399_000`, and `86_400_000` ms.
- [x] `LAUNCH_AT` equals `Date.UTC(2026, 9, 23, 16, 0, 0)` and resolves to 23 October 2026 at 17:00 in a UTC+1 timezone and 16:00 in UTC.
- [ ] At or past `LAUNCH_AT` the digits are replaced by the welcome state, and after the hold the gate unlocks itself and persists. Zero digits never render.
- [ ] A visitor arriving after launch reaches the app through welcome, hold, in, with no manual gesture.
- [ ] The hold timer is cleared on unmount and cannot unlock after teardown.
- [x] `role="timer"`, `aria-live="off"`, static `aria-label` naming the launch date, H1 focused on mount.
- [x] No copy string on the page mentions `Ctrl`, `Alt`, a tap count, or "shortcut".
- [x] `npm run type-check`, `npm run lint`, `npm run build` in `web/` all exit `0`.
- [x] Zero em dash, en dash, or emoji in every file touched.

---

## Web Completion Notes (2026-10-22)

**Gate isolation evidence.** No desktop browser was connected to this session, so live Network capture is deferred to `@ghostdrop-qa`. Isolation was proven at render level instead. `App` returns `<ComingSoon />` before `<GhostDropApp />` is ever created, and `GhostDropApp` is the only component that calls `useState(createHubCode)`. A temporary SSR harness (Vite `ssrLoadModule` plus `renderToStaticMarkup`, deleted after the run) rendered the locked gate with `crypto.getRandomValues` counted: the locked render made `0` calls, the same render with the unlock flag stored made `1` call, which is the hub code allocation. The locked markup contained no `peerjs`, `0.peerjs.com`, or `ghostdrop-room-` string, and `localStorage` received no key. `new Peer(...)` exists only inside `PeerJsEngine.connect`, which only runs from the engine created in the `useGhostRoom` mount effect, reachable only when `GhostRoomProvider` mounts.

**`formatCountdown` outputs:** `0` -> `""`, `9000` -> `09s`, `59000` -> `59s`, `3600000` -> `01h 00m 00s`, `86399000` -> `23h 59m 59s`, `86400000` -> `1d 00h 00m 00s`.

**Left for QA (runtime only):** live Network capture, `Ctrl+Alt+C` from a focused field, three fast taps versus three slow taps, reload persistence, auto-unveil at `LAUNCH_AT`, and hold timer teardown against a real clock.

**Version:** `web/package.json`, `web/package-lock.json` root and `packages[""]`, and `APP_VERSION` all read `0.8`. No dependency added.
