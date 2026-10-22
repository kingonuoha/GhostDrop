# Step 14: Backend Task - Feedback Google Sheets Handler, PostHog Client & Public Stats API
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - backend-completed - 2026-10-22

## Assigned Agent
`@ghostdrop-backend`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `decisions.md`
- `docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/brief.md`

## Objectives
1. **Google Sheets Feedback Pipeline:**
   - Provide the standalone Google Apps Script snippet (`scripts/google-apps-script-feedback.js`) that receives a JSON `POST` request and appends a row to the Google Sheet (`Timestamp`, `Category`, `Message`, `App Version`, `Device Type`).
   - Create a clean frontend API client function in `web/src/lib/feedback.ts` that submits to the Google Apps Script Web App URL with proper error handling and fallback.
2. **PostHog Analytics Client (`web/src/lib/analytics.ts`):**
   - Provide a safe, zero-crash analytics wrapper.
   - Enforce privacy flags: `autocapture: false`, `disable_session_recording: true`, `ip: false`.
   - Implement typed helper functions:
     - `trackRoomCreated(mode: 'cloud' | 'offline_direct')`
     - `trackPeerConnected(deviceType: DeviceType)`
     - `trackFileTeleported(metrics: { count: number; totalBytes: number; ttl: string })`
   - **STRICT PRIVACY GUARDRAIL:** Never accept or transmit file names, file extensions, MIME types, text note content, IP addresses, or room codes to PostHog.
3. **Public Stats Serverless Function (`web/api/stats.ts`):**
   - Read PostHog Query API using environment variable `POSTHOG_API_KEY`.
   - Query total count of `file_teleported` events.
   - Return `{ totalTeleports: number, activeRooms: number }`.
   - Set cache header `Cache-Control: public, s-maxage=600, stale-while-revalidate=1200`.
   - If PostHog query fails or environment variable is missing, return fallback default count gracefully.

---

## Verification Checklist
- [x] `scripts/google-apps-script-feedback.js` is documented and ready for deployment in Google Apps Script.
- [x] `web/src/lib/feedback.ts` handles network failures gracefully and returns a clean boolean status.
- [x] `web/src/lib/analytics.ts` initializes PostHog safely with session recording and autocapture strictly disabled.
- [x] Zero file names, notes, or room codes are transmitted in event properties.
- [x] `web/api/stats.ts` caches aggregate counts and never leaks private keys.
- [x] Zero em dashes and zero emojis anywhere in code or comments.
