# Step 14: QA Task - 6-Gate Verification for Changelog, Feedback & Analytics
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md`
- `docs/08-qa-checklist.md`
- `docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/brief.md`

## Audit Scope
Execute complete 6-gate QA verification and write `qa-report.md`:

1. **Gate 1 - Zero Technical Jargon & Grandma 2-Second Rule Audit:**
   - Verify every string on `/whats-new` and inside the feedback modal.
   - Confirm zero mentions of `WebRTC`, `SDP`, `ICE`, `STUN`, `DataChannel`, `mDNS`, `blobUrl`, `IndexedDB`, `ServiceWorker`, `PeerJS`, or developer code functions.
   - Confirm every version card displays its exact date-time marker (e.g. `22 Oct 2026, 21:00`).
2. **Gate 2 - Zero Em-Dashes and Zero Emojis (P0):**
   - Grep entire repository for em dashes (U+2014), en dashes (U+2013), and emoji characters in new files (`changelog.ts`, `WhatsNew.tsx`, `FeedbackModal.tsx`, `analytics.ts`, `feedback.ts`).
3. **Gate 3 - Feedback Submission & Fallback Flow:**
   - Test submitting feedback from desktop and mobile viewports.
   - Verify modal closes and displays playful success toast.
   - Test offline or failed submission behavior (shows friendly error notice without crashing).
4. **Gate 4 - Version Pill Navigation & Unread State:**
   - Verify clicking navbar version badge routes to `/whats-new`.
   - Verify unread dot shows when version is unvisited and clears upon page visit.
5. **Gate 5 - Analytics Privacy Audit:**
   - Inspect network payloads for PostHog event calls.
   - Verify zero file names, text notes, IP addresses, or room codes are included in event properties.
   - Verify `/api/stats` caching headers (`Cache-Control: s-maxage=600`).
6. **Gate 6 - Production Build & Lint:**
   - `npm run type-check` exits 0.
   - `npm run lint` exits 0.
   - `npm run build` exits 0.

Write the final audit to `docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/qa-report.md`.
