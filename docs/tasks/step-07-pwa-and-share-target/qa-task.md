# Step 07: QA PWA and Web Share Target Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-21

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `docs/08-qa-checklist.md` (Gate 5 PWA, Web Share Target and QR Scanner)
- `docs/06-protocol-and-tech-spec.md` (Section 4 PWA Web Share Target API)

## Objective
Verify Progressive Web App installability, manifest configuration, Service Worker `POST /share-target` interception, and handoff to active room.

## QA Checklists
- [x] Confirm `web/manifest.webmanifest` contains valid icons (`192x192` and `512x512`), theme color (`#CDF22B`), and `share_target` parameters.
- [x] Verify Service Worker (`web/src/sw.ts`) intercepts `POST /share-target`, caches files in temporary IndexedDB, and redirects to `/?shared=1`.
- [x] Verify app boot consumes `/?shared=1`, stages shared files into the room, and scrubs temporary storage.
- [x] Verify install prompt UI is brand styled, hidden when unsupported or installed, and uses deck copy.
- [x] Verify zero em dashes, zero emojis, no `alert()`, and no raw technical strings on screen.
- [x] Verify `npm run type-check`, `npm run lint`, and `npm run build` pass.

## Outcome
GATE PASS. Report: `qa-report.md`. `dist/manifest.webmanifest` and `dist/sw.js` inspected; icons decoded to real cobalt and lime pixels. Non-blocking follow-ups F-01 to F-03 (IDB TTL purge only on read, single latest slot, post-buffer cap) carried to Step 08 triage.
