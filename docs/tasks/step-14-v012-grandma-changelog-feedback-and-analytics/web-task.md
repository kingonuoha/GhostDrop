# Step 14: Web Task - Grandma Changelog Page, Feedback Modal & Telemetry Integration
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - updated - 2026-10-22

## Assigned Agent
@ghostdrop-web

## Workspace Target
web/

## Mandatory Pre-Read References
- AGENTS.md, .agent/BRAND.md, .agent/rules/GEMINI.md, and decisions.md
- docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/brief.md
- docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/ui-polish-task.md
- docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/backend-task.md

## Objectives
1. **Changelog Data Registry (`web/src/lib/changelog.ts`):**
   - Create typed schema:
     ```ts
     export interface ChangelogItem {
       category: 'feature' | 'speed' | 'fix' | 'privacy'
       title: string
       description: string
     }

     export interface ChangelogRelease {
       version: string
       dateTime: string // e.g. "22 Oct 2026, 21:45"
       headline: string
       isCurrent?: boolean
       items: ChangelogItem[]
     }
     ```
   - Populate with Grandma-friendly entries backdated from `v0.6` through `v0.11` (and `v0.12`).
2. **What is New Page & Route (`web/src/pages/WhatsNew.tsx` & `web/src/lib/router.tsx`):**
   - Implement `WhatsNew` page component rendering release cards and date-time markers.
   - Register route `/whats-new` in `router.tsx` and ensure navigation back to home works seamlessly.
   - In `DesktopTopPillBar.tsx` and `MobileStatusHeader.tsx`, make the `v0.11` / `v0.12` version pill clickable (`href="/whats-new"` or `navigate('/whats-new')`).
   - Implement unread dot logic: compare `APP_VERSION` with `localStorage.getItem('ghostdrop.last_seen_version')`. Mark as seen when `/whats-new` is mounted.
3. **In-App Feedback Modal (`web/src/components/feedback/FeedbackModal.tsx`):**
   - Build accessible modal component using React portal or shell overlay.
   - Wire input state (category and message textarea).
   - On submit, call `sendFeedback` from `web/src/lib/feedback.ts`.
   - On success, close modal, clear inputs, and trigger success toast via `RoomToast`.
   - Add trigger button ("Feedback" or "Suggest a Feature") in desktop top bar and mobile bottom dock / footer.
4. **Mount Public Stats Counter (`web/src/components/brand/TeleportCounterBadge.tsx`):**
   - Fetch `/api/stats` on load with fallback to initial static baseline (e.g., "500+ files teleported").
   - Mount badge in `HomeHub.tsx` hero section.
5. **PostHog Event Instrumentation:**
   - Call `trackRoomCreated` inside `useGhostRoom.ts` when a room is initialized.
   - Call `trackPeerConnected` when a peer completes handshake.
   - Call `trackFileTeleported` when a transfer completes successfully.

---

## Verification Checklist
- [x] `/whats-new` route renders smoothly on desktop and mobile.
- [x] Every release card displays its date-time marker (e.g., `22 Oct 2026, 21:00`).
- [x] Clicking the version badge in the desktop navbar and mobile status header opens `/whats-new`.
- [x] The unread version dot disappears once the user views `/whats-new`.
- [x] In-app feedback modal opens, validates input, submits to Google Sheets, and shows a playful success toast.
- [x] Public teleport counter badge renders on `HomeHub.tsx`.
- [x] Zero technical jargon in any UI copy.
- [x] Zero em dashes and zero emojis across all files.
- [x] `npm run type-check`, `npm run lint`, and `npm run build` pass with zero errors.
