# Step 11: QA Report - Improvements at v0.14
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-24

**Auditor:** `@ghostdrop-qa` (read-only audit), remediation verified by `@ghostdrop-orchestrator`
**Build audited:** `web/package.json` version `0.14`, `APP_VERSION = '0.14'` in `web/src/lib/constants.ts`
**Baseline:** committed tree at `368130d` (v0.13 launch bump) plus the Step 11 change set
**Mandatory reading completed:** `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, `decisions.md` (D-001 to D-019), `docs/08-qa-checklist.md`, `docs/00-prd-source-of-truth.md`, `docs/01-wireframe-and-pages.md`, `docs/02-brand-persona-and-copy.md`, `docs/05-motion-spec.md`, `docs/06-protocol-and-tech-spec.md`, `docs/design.md`, `docs/tokens/`, and all four Step 11 task files including `brief.md` section 0.

---

## 1. Executive Summary

Step 11 was deferred in `docs/07-build-order.md` while Steps 12, 13 and 14 shipped, then resumed on 2026-10-24 against the `0.13` codebase and delivered at `0.14`. All 12 items are present in source and all 6 QA gates pass.

**Verdict: PASS.** 0 P0, 0 P1. One P2 remains open and it is a manual verification gap, not a code defect: the three headline transfer behaviours have never been exercised on two physical screens because this workspace has no second device and no automated test harness. Every other P2 and P3 raised during the audit was fixed in the same session and re-verified, with the evidence recorded in section 8.

Strongest evidence in this audit:
- `ChunkReceiver.onStart` fires only after every `FILE_START` validation gate passes, and a rejected start returns before it (`web/src/lib/p2p/chunkReceiver.ts`, `startTransfer`).
- Promotion keeps one item id and mints exactly one object URL, because the placeholder is created with no `file` and therefore no URL (`web/src/lib/p2p/janitor.ts`, `addFile` and `completeReceivedFile`).
- The arrival toast is suppressed when the placeholder was burned mid flight (`web/src/hooks/useGhostRoom.ts`, receiver `onItem`).
- Global TTL sync has exactly one publisher and one registered handler, both in `RoomShellSync` (`web/src/components/shell/RoomShellSync.tsx`), and `MobileJoin` registers nothing.
- The new receive path cannot hang forever: `IDLE_TIMEOUT_MS = 30000` settles a stalled transfer through the existing `failTransfer` path.

---

## 2. Step 11 Item Acceptance Matrix

| # | Item | Status | Proof |
| :--- | :--- | :--- | :--- |
| 1 | Receiver live progress | PASS | `onStart` in `ChunkReceiverOptions` fires after the duplicate, concurrency, size, chunk-count and memory-budget rejects, then emits a 0 percent progress entry. `useGhostRoom` stages `status: 'sending'` with `ttlMs: null` and records the id in `pendingReceiveIdsRef`. `TransferCard` renders `Landing on your screen`, `Receiving... N%`, `From <peer>`, the `Download` badge and the progressbar label `Receiving progress`. Placeholder TTL starts at completion, not at start, so a slow transfer cannot spend its own life while assembling |
| 2 | Arrival toast | PASS | `SUCCESS_FILE_RECEIVED` in `copyDeck.ts`, `docs/02-brand-persona-and-copy.md` and the `FeedbackNotice` icon map. Fires on completion only when `landed` is true. A placeholder burned mid flight returns `null` from `completeReceivedFile`, so the id is not re-added and nothing is announced |
| 3 | Manual burn | PASS | `onBurn` is a required prop on `TransferCard` and `TransferFeed`, bound to `room.burnItem` in both pages. The control is a `Trash2` pill labelled `Remove item now` at 44px. The action calls `store.burnNow` (revoke first) and sends `ITEM_NUKE` with `MANUAL_BURN` |
| 4 | Desktop timer popover and global TTL sync | PASS | Trigger and menu with `aria-expanded`, `aria-controls`, `aria-pressed`, `role="group"`, selected row focus on open, focus return on close, Escape and outside pointerdown. `RoomShellSync` is mounted inside `ShellChrome`, so the room preset and both navbars share one source of truth. `MobileJoin` keeps no duplicate registration |
| 5 | In-room QR drawer | PASS | `ConnectionBridge` takes a required `joinUrl`, renders a `Show QR Code` toggle with `aria-expanded` and `aria-controls`, and a panel with `QRCodeSVG size={148}` plus `marginSize={2}` for a real quiet zone. `HomeHub` and `ConnectedWorkspace` share one `useJoinUrl` hook, and the hub diff is a pure extraction |
| 6 | Mobile squiggle bridge | PASS | `MobileJoin` renders `SquiggleConnectionBridge` with live labels from `useGhostRoom` device detection and a direction aware status |
| 7 | Safe links and expandable notes | PASS | `new URL` parse accepts only `http:` and `https:`, rendered as an `Open` anchor with `target="_blank"` and `rel="noopener noreferrer"`. Notes longer than 72 characters get `Show full note` / `Show less` with `aria-expanded` and `whitespace-pre-wrap`. Zero `dangerouslySetInnerHTML` or `innerHTML` in the app |
| 8 | Feed toggle | PASS | `Show all (N)` / `Latest 3` with `aria-expanded` and `aria-controls="feed-list"`, and the target always exists because the toggle only renders above three active items. Badge and toggle now both report active items |
| 9 | Lazy scanner | PASS | `AppShell` uses `lazy` plus `Suspense` and still passes `mode={scannerMode}`. `jsqr` appears in exactly one emitted file, the async scanner chunk |
| 10 | Boot share sweep | PASS | `sweepExpiredShareHandoff` deletes only malformed or expired records, keeps fresh ones, and returns false without IndexedDB. `sweepExpiredShareHandoffOnce` owns the once per page life guard and is called from `ShellChrome`, so every route sweeps, and a `?shared` boot never races the claim |
| 11 | HowItWorks cleanup | PASS | No `ALERTS`, no `Kind language for peace of mind`, no alerts section, no unused imports. Heading order is `h1` then `h2` with no skip, and the root wrapper keeps exactly three children |
| 12 | Five second toasts | PASS | `TOAST_AUTO_DISMISS_MS = 5000`. One remaining-time value drives both dismissal and the drain bar, with independent pointer and focus pause flags so a click cannot strand the clock. Inline cards pass neither `autoDismissMs` nor `onDismiss` and stay static. Every toast call site opts in |

---

## 3. Six Gate Matrix

| Gate | Result | Basis |
| :--- | :--- | :--- |
| 1. Brand tokens, Laroka, nav split, squiggle draw | PASS | No raw hex in components, token parity, Laroka on display roles and numerals, `md` split, dashoffset only |
| 2. Playful copy, zero em dash, zero en dash, zero emoji, zero jargon | PASS | 0 / 0 / 0 across `web/src`, `docs/`, `design/` (162 text files scanned) and root docs after remediation. Zero `alert()` and zero raw transport strings in the DOM |
| 3. Wire protocol, 16,384 byte chunks, backpressure, `FILE_ACK`, `ITEM_NUKE` | PASS | Packet union unchanged, `CHUNK_SIZE_BYTES = 16384`, `BUFFERED_LOW_THRESHOLD = 65536`, ACK on both settle paths, manual burn reason preserved |
| 4. Ephemeral TTL, zero memory leaks | PASS | Single mint per id, idempotent revoke, unload hooks, `leakedObjectUrlCount` structurally zero, stalled transfers now settle to `error` |
| 5. PWA, share target, QR scanner, precache after the vendor split | PASS | 18 entry precache covering all 7 emitted chunks, `jsqr` async only, share target POST wired |
| 6. Accessibility, responsive, build health | PASS for build and structure, MANUAL for viewport measurement | `type-check`, `lint`, `build` exit 0, 44px targets, visible focus rings, reduced motion overrides, four width matrix deferred to section 10 |

---

## 4. Build Proof

Run in `web/` on 2026-10-24 after all remediation.

| Gate | Command | Result |
| :--- | :--- | :--- |
| Types | `npm run type-check` | exit 0 (app, node and sw projects) |
| Lint | `npm run lint` | exit 0 |
| Production build | `npm run build` | exit 0, zero chunk size warnings |

### Chunk table

| File | Raw | Gzip | Class | First load |
| :--- | ---: | ---: | :--- | :--- |
| `assets/index-DbFKqaVl.js` | 222.67 kB | 63.23 kB | app entry | yes |
| `assets/vendor-react-CC1gocAt.js` | 218.75 kB | 68.27 kB | vendor | yes |
| `assets/vendor-peerjs-CCGx1ouz.js` | 86.67 kB | 23.14 kB | vendor | yes |
| `assets/vendor-qr-DmswBBjB.js` | 16.17 kB | 6.01 kB | vendor | yes |
| `assets/rolldown-runtime-XKyaHtl9.js` | 0.72 kB | 0.42 kB | runtime | yes |
| `assets/index-Bbk4OV0D.css` | 54.98 kB | 10.58 kB | stylesheet | yes |
| `assets/QrScannerModal-DF3gdMLK.js` | 149.86 kB | 54.05 kB | async, carries `jsqr` | no |
| `sw.js` | 18.64 kB | 6.38 kB | service worker | n/a |

- Main entry is 222.67 kB raw and 63.23 kB gzip, well under the 500 KB gate. No individual chunk exceeds 500 KB, so the Vite warning is gone.
- `jsqr` isolation confirmed: the byte scan finds it only in `QrScannerModal`.
- Precache reports 18 entries, 737.07 KiB, including all 7 emitted JavaScript files, the stylesheet, the shell, fonts, icons and the manifest, so the vendor split created no offline hole.
- The only build warning is a deprecation notice emitted by `vite-plugin-pwa` internals (`inlineDynamicImports`), not by `vite.config.ts`, and it does not affect output.

### Repository scans

| Pattern | Scope | Count |
| :--- | :--- | ---: |
| U+2014 em dash | `web/src`, `docs/`, `design/` | 0 |
| U+2013 en dash | `web/src`, `docs/`, `design/` | 0 |
| Emoji ranges | `web/src`, `docs/`, `design/` | 0 |
| U+2014 em dash | repository root docs (`implementation_plan.md`) | 0 after remediation |
| `: any`, `as any`, `<any>` | `web/src` | 0 |
| `dangerouslySetInnerHTML`, `innerHTML` | `web/src` | 0 |
| `window.alert`, bare `alert(` | `web/src` | 0 |

Scope note for future audits: `.agents` and `.agent` are the same vendored Antigravity Kit tree through a junction, and its third party payload contains dashes and emoji that are not GhostDrop authored content. Gate 2 measures `web/src`, `docs/`, `design/` and root authored docs, per `decisions.md` D-010 item 4. All GhostDrop authored agent files measure zero.

---

## 5. Protocol and Ephemeral Integrity

1. **Byte budgets.** `CHUNK_SIZE_BYTES = 16384`, `BUFFERED_LOW_THRESHOLD = 65536`, `MAX_BUFFERED_AMOUNT = 262144`, `MAX_CONCURRENT_TRANSFERS = 3`, `MAX_TOTAL_TRANSFER_BYTES` unchanged.
2. **Sender.** Slices at `Math.min(offset + CHUNK_SIZE_BYTES, totalBytes)`, re-checks each frame, waits on `bufferedAmountLowThreshold` with a timeout and abort listener, and cleans up on every exit.
3. **Receiver.** Validates chunk length against the header, the 16KB budget and the remaining declared size; rebuilds an exact-size Blob with the declared MIME; emits `FILE_ACK` `OK` before handing the item up and `ERROR` on any failure.
4. **One URL per id.** A placeholder is registered with no `file`, so no URL is minted and no timer starts. `completeReceivedFile` revokes any prior URL, mints exactly one, stamps the completion clock and commits once.
5. **Failure paths.** `updateItem` with `error`, `expired` or `nuked` revokes and releases. `removeItem`, `burnNow`, `consumeBurnOnCopy`, `acknowledgeDelivery`, `sweep` and `revokeAll` all revoke through the idempotent ledger. `beforeunload` and `pagehide` share one handler.
6. **Stalled transfer.** New `IDLE_TIMEOUT_MS = 30000` arms per transfer, re-arms on every accepted chunk, and is cleared in `finishTransfer`, `failTransfer`, `dispose(id)` and `disposeAll()`. Expiry routes through `failTransfer` with `BACKPRESSURE_TIMEOUT`, so the placeholder settles to `error` with the playful retry copy instead of spinning forever.
7. **Error scope.** `P2PError` carries an optional `transferId`. `onError` settles only that id when present, and falls back to the whole pending sweep only when the id is absent (stray binary frames carry no id). One `ERR_CHUNK_INTERRUPTED` toast per event.

---

## 6. Accessibility and Craft

1. **Focus.** Global `:focus-visible` outline in `index.css`; every component that suppresses the outline pairs it with a `ring-2` in cobalt.
2. **Targets.** Every new control is at least 44 by 44: timer trigger and preset rows, QR toggle, feed toggle, note toggle, burn, dismiss.
3. **Names and state.** `aria-expanded`, `aria-controls` and `aria-pressed` on all disclosure controls, from a real node when open and `undefined` when closed. Timer trigger reads `Auto-delete: <preset>` at both breakpoints while the visible short label stays intact on desktop and mobile.
4. **Reduced motion.** The draw utilities force `stroke-dashoffset: 0` under `prefers-reduced-motion: reduce`, the idle dot animation stops, and the drain bar adds no animation, so the toast still reads correctly without extra motion.
5. **Contrast.** The error tone drain bar moved from a 2.55:1 coral to Jet Ink at 15.8:1, above the 3:1 floor for a non-text indicator.
6. **Layout guards.** The feed header wraps instead of overflowing at 360px, the receiving footer wraps, the QR panel clears the squiggle watermark, and the mobile bridge card uses the room flow radius.

---

## 7. Findings

| ID | Severity | Area | Finding | Status |
| :--- | :--- | :--- | :--- | :--- |
| F-01 | P2 | Runtime proof | Receiver live progress, arrival toast and cross device manual burn have never been run on two physical screens | **OPEN, manual** |
| F-02 | P2 | Copy truthfulness | Page title, `og:title` and `twitter:title` still said `Coming soon` after launch | FIXED, all three now `GhostDrop: Send photos and text between your screens` |
| F-03 | P2 | Protocol robustness | No inbound idle timeout, so a stalled transfer left a permanent receiving card | FIXED, `IDLE_TIMEOUT_MS = 30000` watchdog |
| F-04 | P2 | Copy rule | One em dash in `implementation_plan.md` | FIXED |
| F-05 | P3 | Receive error scope | `onError` failed every pending receive, not only the failed one | FIXED, `P2PError.transferId` scoping with sweep fallback |
| F-06 | P3 | Accessibility | Nav popovers declared `role="dialog"` without a focus trap | FIXED, both are `role="group"` with the existing label |
| F-07 | P3 | Copy consistency | Feed badge counted visible rows while the toggle counted active items | FIXED, badge uses active count |
| F-08 | P3 | Boot sweep scope | Sweep only ran where `HomeHub` mounted | FIXED, `sweepExpiredShareHandoffOnce` called from `ShellChrome` |
| F-09 | P3 | Comment drift | `Logo.tsx` documented a `v0.7` pill | FIXED, version agnostic |
| F-10 | P3 | Bundle size | Aggregate first load JavaScript is 545.59 kB raw across five chunks, though no single chunk exceeds 500 KB | INFORMATIONAL, optional deferral of `qrcode.react` |
| F-11 | P3 | Audit hygiene | Vendored `.agents` payload contains dashes and emoji, junctioned twice | INFORMATIONAL, scope rule recorded in section 4 |
| F-12 | P3 | Event bus robustness | `emit` did not isolate listener exceptions in two engines | FIXED, per listener try/catch |
| F-13 | P3 | Responsive, unmeasured | Desktop bar must fit six groups at exactly 768px | **OPEN, manual** |
| F-14 | P3 | Duplication | Preset labels existed in both `constants.ts` and `TtlPicker.tsx` | FIXED, derived from `TTL_PRESET_ORDER` and `TTL_LABELS` |

Counts: **P0 = 0, P1 = 0, P2 = 1 open (F-01) plus 3 fixed, P3 = 11 fixed or informational, 1 open (F-13).**

---

## 8. Post-Audit Remediation Log

Each fix was applied by the owning specialist and re-verified by the orchestrator with `type-check`, `lint`, `build` and a targeted source check.

| Fix | Owner | Verified evidence |
| :--- | :--- | :--- |
| F-02 launch titles | `@ghostdrop-web` | `grep "Coming soon" web/index.html` returns zero; the three tags carry the launched message |
| F-03 idle watchdog | `@ghostdrop-backend` | `IDLE_TIMEOUT_MS` exported at 30000 and armed per transfer; cleared in all four settle paths; probes show one failure with `transferId` and none after settle or dispose |
| F-04 root em dash | `@ghostdrop-orchestrator` | `implementation_plan.md` line 1 now uses a hyphen; repository root scan reports 0 |
| F-05 error scope | `@ghostdrop-backend` | `P2PError.transferId` optional third argument; `onError` settles the named id only, sweep only when absent |
| F-06 popover role | `@ghostdrop-ui-polish` | Both nav panels render `role="group"` with `aria-label="Auto-delete timer"`; triggers unchanged |
| F-07 badge count | `@ghostdrop-web` | Badge and toggle both render `activeItems.length` |
| F-08 sweep scope | `@ghostdrop-web` | `sweepExpiredShareHandoffOnce` in `shareHandoff.ts`, called once from `ShellChrome`; `useShareIntake` is back to its claim only shape |
| F-09 comment | `@ghostdrop-web` | Logo comment reads `the app version pill` |
| F-12 listener isolation | `@ghostdrop-backend` | Both engines wrap each listener call in try/catch; probe with two throwing listeners still delivered to all four |
| F-14 label dedupe | `@ghostdrop-ui-polish` | `TTL_OPTIONS` maps `TTL_PRESET_ORDER`; rendered labels, order and icons byte identical to before |

---

## 9. Step 11 Scope Delivered Beyond the Original Brief

The rebase changed three assumptions in the original task files. All three are recorded in `brief.md` section 0 and were implemented as described there:

1. Global TTL sync cannot live in `GhostRoomProvider`, because it renders above `ShellProvider`. It lives in `RoomShellSync` inside `ShellChrome`.
2. `QrScannerModal` is mode aware, so the lazy render still forwards `mode`.
3. The join URL logic is shared through `useJoinUrl`, so the hub and the in-room QR drawer cannot drift.

---

## 10. Manual Verification Gaps

Nothing below is a code defect. Each is a check this environment cannot execute.

### 10.1 Two physical devices (closes F-01)

Desktop host plus phone guest on the same Wi-Fi or hotspot:

1. Open `/` on desktop, scan the QR on the phone, confirm the workspace opens with the phone chip present.
2. Phone sends a 12 MB photo. Desktop card must appear at 0 percent immediately with `Receiving...`, `Landing on your screen`, `From your phone`, and advance monotonically to 100.
3. `New file arrived!` appears once, names the file, and closes after five seconds with the drain bar emptying.
4. Press `Remove item now` on the desktop. The card disappears on both screens within one round trip, and no toast fires on the phone. Browser memory returns to the pre transfer level.
5. Repeat the send, then burn the receiving card at roughly 40 percent. The card stays gone and no arrival toast fires. This is the assertion that cannot be proven without two screens.
6. Change the preset in the desktop popover. The phone dock label, the phone page picker and both items retime. Change it on the phone and the desktop pill follows.
7. Open `Show QR Code` in the workspace and pair a second device from it without leaving the route.
8. Kill the phone tab mid transfer. The desktop must settle to the error card within 30 seconds rather than hanging, which proves the new watchdog.

### 10.2 Viewport matrix (closes F-13)

Measure `document.documentElement.scrollWidth` against `window.innerWidth` at 360, 768, 1024 and 1440 on `/`, `/room/<code>?host=1`, `/join?room=<code>` and `/how-it-works`. Check 768 first, where the desktop bar carries six groups.

### 10.3 Toast focus pause

Hold the pointer over a toast for five seconds, then Tab onto its dismiss button and hold focus. The bar must freeze in both cases and resume from the same position on leave or blur, closing at five seconds total active time.

### 10.4 Cold offline PWA boot

Install, load once online, enable airplane mode, cold start. The shell must paint from precache and the scanner chunk must load from precache on first tap. The precache manifest side is proven in section 4.

---

## 11. Sign-off

**Verdict: PASS.**

| Metric | Value |
| :--- | :--- |
| Step 11 items accepted | 12 of 12 |
| Gates passed | 6 of 6 (Gate 6 build and structure, viewport measurement deferred) |
| P0 | 0 |
| P1 | 0 |
| P2 open | 1 (F-01, manual two device run) |
| P3 open | 1 (F-13, 768px measurement) |
| Findings fixed in session | 10 |
| `npm run type-check` / `lint` / `build` | 0 / 0 / 0 |
| Entry chunk | 222.67 kB raw, 63.23 kB gzip |
| `jsqr` isolation | confirmed |
| Precache | 18 entries, 737.07 KiB |
| Em dash / en dash / emoji in authored scope | 0 / 0 / 0 |
| `any` in `web/src` | 0 |

Conditions attached to this PASS:
1. F-01 must be closed by the two device run in section 10.1 before `web/` is pushed to `main`. The version is already `0.14` in both required files.
2. F-13 must be measured at 768px in the same manual pass. If the bar wraps, drop the `Feedback` text button to an icon pill below `lg`.
3. F-10 is informational and gates nothing.

**Signed:** `@ghostdrop-qa` (audit) and `@ghostdrop-orchestrator` (remediation verification), 2026-10-24.
