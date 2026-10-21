# Step 04: QA TTL Memory Janitor Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `docs/08-qa-checklist.md` (Gate 4 Ephemeral TTL Self-Destruct and Zero Memory Leaks)
- `docs/06-protocol-and-tech-spec.md` (Section 5 Ephemeral Memory and Security Rules)

## Objective
Verify that in-memory payload lifecycle, TTL countdown timers, and immediate `URL.revokeObjectURL` cleanup operate correctly without memory leaks.

## QA Checklists
- [x] Verify TTL presets countdown live every second (`Delete after 1st copy`, `15 mins`, `50 mins`, `When I close this page` per `decisions.md` D-012).
- [x] Confirm `URL.revokeObjectURL(blobUrl)` is immediately called on item expiry, burn-on-copy, or manual burn.
- [x] Verify `beforeunload` and `pagehide` event listeners properly revoke all tracked object URLs.
- [x] Verify dropped items and files live strictly in React/JS memory with zero persistent storage in `localStorage` or external endpoints.
- [x] Verify zero emojis and zero em dashes in notifications.

## Outcome
GATE PASS after Repair Round 1 (local receive clock, duplicate-id guard, error-item sweep, post-dispose leak counters, mount guards). Report: `qa-report.md`. 64/64 harness assertions, 14 URLs created = 14 revoked, 0 double revokes.
