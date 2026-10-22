# Step 12: QA Task - Verification of Launch Gate, Unlock Gestures, Countdown and Slab Motion
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/` (Read-Only Audit; writes ONLY `docs/tasks/step-12-v08-coming-soon-wall/qa-report.md`)

## Mandatory Pre-Read References
- `AGENTS.md`, `.agents/rules/GEMINI.md`, `decisions.md` (`D-006`, `D-008`, `D-009`, `D-015`)
- `docs/08-qa-checklist.md` (all 6 gates)
- `docs/05-motion-spec.md`
- `plans/coming-soon-wall-plan.md`
- `docs/tasks/step-12-v08-coming-soon-wall/brief.md`
- `docs/tasks/step-12-v08-coming-soon-wall/web-task.md`
- `docs/tasks/step-12-v08-coming-soon-wall/ui-polish-task.md`

## Objective
Prove the gate actually isolates the P2P runtime, both hidden unlock gestures work, the countdown is correct at every boundary, the slab motion is reduced-motion safe, and nothing in Steps 01 through 10 regressed.

---

## Audit Checklists

### 1. Gate Isolation (P0, highest priority)
- [ ] Locked: `web/src/App.tsx` returns `<ComingSoon />` before any `GhostRoomProvider` mount.
- [ ] Locked: devtools Network shows no `/peerjs` WebSocket, no `0.peerjs.com`, and no `wss://` signaling, in both dev and preview.
- [ ] Locked: no `ghostdrop-room-` peer id is registered. Confirm against the PeerServer directly if possible, otherwise confirm the absence of the WebSocket that would register it.
- [ ] Locked: `createHubCode()` / `generateRoomCode()` is not evaluated. Grep order in `App.tsx` plus a runtime check that no room code appears in the DOM or `localStorage`.
- [ ] Locked: no `AppShell`, no `DesktopTopPillBar`, no `MobileStatusHeader`, no `MobileBottomDock` in the DOM.
- [ ] Unlocked: the full Step 10 app tree returns unchanged, room code allocated, `/peerjs` connects.

### 2. Unlock Gestures
- [ ] `Ctrl+Alt+C` unlocks with focus in the body, inside an input, and after clicking a static element. `preventDefault` observed, key repeat does not re-trigger.
- [ ] Logo tapped 3 times inside `900ms` unlocks. 3 taps spread over 3 seconds does NOT unlock.
- [ ] Tap gesture works via `onPointerDown` on a touch emulation viewport, and in the standalone PWA if installable in the audit environment.
- [ ] Unlock persists across reload via `localStorage` key `ghostdrop.launch.unlocked`.
- [ ] Clearing site data re-locks. `localStorage` failure (simulated) leaves the session usable and only loses persistence.
- [ ] No visible button, badge, tooltip, or copy anywhere on the locked page advertises either gesture. Grep the teaser copy and the copy deck for `Ctrl`, `Alt`, `shortcut`, and tap counts.

### 3. Countdown and Automatic Unveil
- [ ] `formatCountdown` exact strings for `0`, `9_000`, `59_000`, `60_000`, `3_600_000`, `86_399_000`, `86_400_000`, and a value far past zero.
- [ ] `LAUNCH_AT === Date.UTC(2026, 9, 23, 16, 0, 0)`. It must equal `2026-10-23T16:00:00.000Z`. Verify a UTC+1 render shows 17:00 is the zero point.
- [ ] At or past `LAUNCH_AT` the digits are replaced by `SOON_WELCOME`, then after the hold the gate unlocks itself, persists, and renders the hub. Zero digits never render.
- [ ] A fresh visitor on a clock past launch follows welcome, hold, in, with no manual gesture and no reload.
- [ ] The hold timer is cleared on unmount and cannot unlock after teardown.
- [ ] Only the countdown subtree re-renders on each tick. Neither the slab layer nor the squiggle layer re-renders every second.
- [ ] `role="timer"`, `aria-live="off"`, static `aria-label` naming the launch date.
- [ ] Tabular numerals, digits do not shift width while ticking.
- [ ] No copy string anywhere on the teaser or in the copy deck mentions `Ctrl`, `Alt`, a tap count, or "shortcut".

### 4. Slab and Squiggle Motion, Reduced Motion
- [ ] Four slabs, one per locked brand colour, all mapped to tokens, zero raw hex.
- [ ] Each slab animates on a distinct axis: up, right, down, left. Verified from the computed `animation-name` per class.
- [ ] Slab animation uses `transform` only. No `top`, `left`, `width`, `height`, `filter` in the keyframes.
- [ ] Five squiggles render at randomized corner and edge anchors, all with `pathLength="1"` and `stroke-dasharray: 1`.
- [ ] Squiggle motion is `stroke-dashoffset` only. Assert no animated `transform`, `translate`, `top`, `left`, or `opacity` on any squiggle path. Anchor repositioning must occur after a completed retract.
- [ ] Anchor randomness is computed once on mount, not during render, and each squiggle advances one anchor per cycle.
- [ ] No scrollbar and no horizontal overflow introduced by either decorative layer at `360`, `768`, `1024`, `1440`.
- [ ] `prefers-reduced-motion: reduce` emulated: `animation-name: none` on all four slabs, squiggle layer hidden, and the four colours still read distinctly.
- [ ] D-006 verdict recorded explicitly: slabs are permitted per D-015, squiggles must remain draw-only.

### 5. Full 6-Gate Regression (`docs/08-qa-checklist.md`)
- [ ] **Gate 1:** brand tokens, `Laroka`, responsive nav split at `768px` on the unlocked app, self-drawing squiggle fidelity.
- [ ] **Gate 2:** playful copy, zero em dashes (`U+2014`), zero en dashes (`U+2013`), zero emojis, zero `alert()`.
- [ ] **Gate 3:** shared wire protocol and 16KB chunk streaming untouched.
- [ ] **Gate 4:** TTL self-destruct, `URL.revokeObjectURL` ledger reconciliation, `Blob` release.
- [ ] **Gate 5:** installable PWA, Web Share Target `POST /share-target` still stashes to `pendingDrop` and surfaces after unlock.
- [ ] **Gate 6:** accessibility, `>= 44px` touch targets, zero horizontal overflow at four widths, clean build.

### 6. Version and Build
- [ ] `web/package.json` `0.8`, `web/package-lock.json` root and `packages[""]` `0.8`, `APP_VERSION === '0.8'`, no new dependency.
- [ ] The `v0.8` pill renders on the teaser logo and on both app navbars after unlock.
- [ ] `npm run type-check`, `npm run lint`, `npm run build` in `web/` all exit `0`, with exact output recorded.

### 7. Step 11 Non-Interference
- [ ] `docs/tasks/step-11-improvements/` is unmodified and none of its items were implemented in this step.

---

## OUTPUT
Write `docs/tasks/step-12-v08-coming-soon-wall/qa-report.md` with:
- H1 title, then `**Device stamp:** \`ASUS-LAPTOP-DNLA241D\` - created - 2026-10-22`
- `**Verdict:** PASS` or `**Verdict:** FAIL`
- Section 1: gate isolation evidence, including the Network panel observation.
- Section 2: unlock gesture results.
- Section 3: countdown boundary table with actual returned strings.
- Section 4: slab motion and reduced-motion evidence with computed `animation-name` values.
- Section 5: 6-gate regression table.
- Section 6: build output and exact exit codes.
- Section 7: findings labelled `P0` / `P1` / `P2` / `P3` with `file:line` and a one-line fix.
- Section 8: residual risks.

Severity: `P0` = gate leak (any signaling or room state while locked), brand rule breach (em dash, emoji, raw hex), failing build, or TTL leak. `P1` = a Step 12 acceptance item that does not work as specified. `P2` = polish or accessibility gap. `P3` = nit.

## RULES
- **Zero em dashes (U+2014), zero en dashes (U+2013), zero emojis** anywhere in the report. Only permitted non-ASCII is the `U+00B7` device stamp separator.
- Evidence must be reproducible: quote the command, the grep, the `file:line`, or the observed value. No "looks good" verdicts.
- Do NOT fix anything. Report it.
- Windows PowerShell safe file ops: write the report with the write tool. NEVER use bash heredocs.
