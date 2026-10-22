# Step 12: v0.8 Coming Soon Wall Brief
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22

## 1. Executive Summary

GhostDrop is functionally complete after Step 10 but not ready to be public. Step 12 gates every route behind a "coming soon" teaser with a continuously looping brand colour animation, a live countdown to 23 October 2026 at 17:00 local, and two hidden unlock gestures so Kingsley keeps full access on PC and phone.

| # | Requirement | Root Cause / Gap in Current Code | Assigned Specialist |
| :--- | :--- | :--- | :--- |
| **1** | Public teaser gate on every route | `web/src/App.tsx` renders `/`, `/join`, `/room/*`, and `/how-it-works` straight through to `GhostRoomProvider`. Anyone with the URL reaches a half-tested app, and the P2P engine opens signaling and registers a room peer id even for a visitor who only wants to look. | `@ghostdrop-web` |
| **2** | Hidden unlock, no visible UI | There is no launch gate at all. Needs `Ctrl+Alt+C` for desktop plus a 3-tap logo gesture for touch devices, persisted in `localStorage`. | `@ghostdrop-web` |
| **3** | Live countdown to 23 Oct 17:00 | `web/src/lib/format.ts` has `formatTimeLeft` for TTL items but nothing that formats a distance-to-date clock, and `web/src/lib/constants.ts` has no launch constant. | `@ghostdrop-web` |
| **4** | Brand colour slab animation loop | `web/src/index.css` carries squiggle, poof, and scanline keyframes but no large-surface colour motion for a hero. Brand colours currently only appear as small accents. | `@ghostdrop-ui-polish` |
| **5** | Teaser copy and contrast | The copy deck has no prelaunch block, and a full-bleed Cobalt field would drop headline contrast below AA without a Warm Stone scrim. | `@ghostdrop-ui-polish` |
| **6** | Version bump and verification | `web/package.json` is `0.7`. This adds no dependency, so the decimal place moves to `0.8` per `AGENTS.md` Section 5. | `@ghostdrop-web` + `@ghostdrop-qa` |

---

## 2. Execution Order and Agent Ownership

1. **`@ghostdrop-web`** (`web-task.md`): `useLaunchGate` hook, `App.tsx` gate wrap above `GhostRoomProvider`, `ComingSoon` page shell, `formatCountdown`, `LAUNCH_AT` and `LAUNCH_UNLOCK_KEY` constants, `APP_VERSION` to `0.8`, `web/package.json` to `0.8`, prelaunch `index.html` title.
2. **`@ghostdrop-ui-polish`** (`ui-polish-task.md`): `ComingSoonBackdrop` slab component, four slab keyframes with a reduced-motion override, Warm Stone legibility scrim, teaser copy block in `web/src/lib/copyDeck.ts` and `docs/02-brand-persona-and-copy.md`, measured contrast.
3. **`@ghostdrop-qa`** (`qa-task.md`): gate isolation proof, both unlock gestures, countdown edge cases, overflow at four widths, reduced motion, full 6-gate regression, `qa-report.md`.

---

## 3. Non-Negotiable Guardrails for All Agents

- **Gate position is a P0.** The wall renders ABOVE `GhostRoomProvider`. While locked there must be no `/peerjs` WebSocket, no `0.peerjs.com` traffic, and no room peer id registered. A teaser visitor must never consume signaling state.
- **No visible unlock affordance.** No button, badge, tooltip, or hint may advertise `Ctrl+Alt+C` or the 3-tap logo gesture. The gestures are discoverable only by the person who was told about them.
- **Zero Em-Dashes and Zero Emojis (P0):** Never use a single em dash (`U+2014`), en dash (`U+2013`), or emoji anywhere in code, comments, UI copy, or docs. Use crisp `lucide-react` SVG icons only.
- **Squiggly line rule (D-006):** Any squiggly line on the teaser animates exclusively through `pathLength="1"`, `stroke-dasharray: 1`, and `stroke-dashoffset: 1 -> 0`. Colour slab translation is a separate, permitted primitive per D-015, and it uses `transform: translate3d()` only.
- **No New Dependencies:** CSS-only animation. No `framer-motion`, no animation library. Version moves `0.7` to `0.8` as a decimal bump.
- **Tokens only:** Zero raw hex outside `docs/tokens/tokens.css` and `web/src/styles/tokens.css`. `Laroka` for the headline and the countdown numerals.
- **Reduced motion is mandatory:** `prefers-reduced-motion: reduce` freezes all four slabs and still reads as four brand colours.
- **Service worker untouched:** `web/src/sw.ts` and the `/share-target` handoff stay as they are, so a share during prelaunch is stashed and surfaces after unlock.
- **Step 11 stays deferred.** Do not touch `docs/tasks/step-11-improvements/` or implement anything from it.
- **Windows PowerShell Safe File Operations:** Always use file Write and Edit tools; never use bash heredocs (`cat << 'EOF'`).

---

## 4. Reference

- Full plan: `plans/coming-soon-wall-plan.md`
- Decision record: `decisions.md` D-015
- Brand tokens: `docs/tokens/tokens.css`, `docs/tokens/tokens.json`
- Motion rules: `docs/05-motion-spec.md`
- Copy deck: `docs/02-brand-persona-and-copy.md`

---

## 5. Completion Notes (Orchestrator Closeout)

**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - step-12-closed - 2026-10-22

**Verdict:** PASS. `qa-report.md` records 0 P0, 0 P1, 1 P2, 7 P3. The single P2 and two robustness P3s were closed before signoff.

### Execution order
Sequence was deliberately reversed from the brief. `@ghostdrop-ui-polish` ran first because `ComingSoon.tsx` imports the backdrop and squiggle components, so the presentational layer had to exist before the page could type-check.

1. `@ghostdrop-ui-polish`: `ComingSoonBackdrop.tsx` (four token-mapped slabs plus `.soon-scrim`), `ComingSoonSquiggles.tsx` (five draw and retract squiggles on shuffled corner and edge anchors), slab and squiggle keyframes, reduced-motion overrides, and the nine `SOON_*` copy keys mirrored into `docs/02-brand-persona-and-copy.md`.
2. `@ghostdrop-web`: `useLaunchGate` plus `useTripleTapLogo`, the `App.tsx` gate above `GhostRoomProvider`, `ComingSoon.tsx`, `countdownSegments`, `LAUNCH_AT`, `LAUNCH_UNLOCK_KEY`, `APP_VERSION` and `package.json` to `0.8`, and the prelaunch `index.html` title.
3. `@ghostdrop-qa`: full audit plus the 6-gate regression.

### Gate isolation
`App` returns `<ComingSoon />` before any provider mounts, and `GhostDropApp` is now the sole owner of `useState(createHubCode)`. While locked there is no `/peerjs` WebSocket, no `ghostdrop-room-` peer id, no ICE gathering, and no nav chrome. Proven by counting `crypto.getRandomValues` calls in a real-module Node render: 0 locked, 1 unlocked.

### Post-audit closures
- **P2.1** `ComingSoon.tsx` now treats a remaining value under `1000ms` as launched, and `countdownSegments` returns no lone `00s` cell, so the teaser can never park on a stale seconds digit.
- **P3.2** Removed the dead `formatCountdown` export. `countdownSegments` is the single formatter.
- **P3.3 and P3.4** `ComingSoonSquiggles` now watches the `prefers-reduced-motion` media query for its lifetime and clears timers on flip, and builds its specs in a `useState` initialiser so no effect reads a ref filled by another effect. The 240ms scheduling margin between latest retract end and earliest anchor advance is preserved.
- **P3.5** The tap gesture ignores any pointer event whose `button` is not `0`, so a right click no longer counts toward the unlock.
- **P3.7** The copy deck subsection is now numbered `2.1` to match the task references.

### D-006 verdict
Recorded as compliant. Slabs translate, squiggles do not. Every squiggle is a `<path pathLength="1" strokeDasharray="1">` whose only animated property is `stroke-dashoffset`, and the anchor change occurs only after a completed retract at zero visible length. No decision was amended to achieve this.

### Final gate evidence
- `npm run type-check` exit `0`, `npm run build` exit `0`, `npx eslint src` exit `0` and `npx eslint .` exit `0` excluding one unrelated untracked file noted below.
- Version `0.8` in `web/package.json`, `web/package-lock.json` (root and `packages[""]`), and `web/src/lib/constants.ts`.
- Six runtime dependencies and twelve dev dependencies, unchanged.
- Zero `U+2014`, zero `U+2013`, zero emoji across `web/src/` and the Step 12 task folder.

### Out-of-contract finding, surfaced not fixed
`web/scripts/render-og.mjs` plus `web/public/og-image.png` and `web/public/og-image.svg` appeared in the working tree during this step, authored outside this session. The script destructures `title` and `subtitle` without using them, which fails `@typescript-eslint/no-unused-vars` and makes a repo-wide `npm run lint` exit `1`. All three files were left untracked and out of the Step 12 commit. They need either finishing or removing before the next push.

