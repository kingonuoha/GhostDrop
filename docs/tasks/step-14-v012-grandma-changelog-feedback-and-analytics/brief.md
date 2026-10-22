# Step 14: Grandma-Friendly Changelog with Date-Time Markers, Google Sheets Feedback Modal, and PostHog Analytics Brief
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - completed - 2026-10-22

## 1. Executive Summary and Product Goals

This step introduces three essential product features into GhostDrop:

| # | Feature Area | User Experience & Technical Implementation | Assigned Specialist |
| :--- | :--- | :--- | :--- |
| **1** | **Grandma-Friendly "What is New" Page (`/whats-new`)** | A dedicated `/whats-new` view showing chronological release cards backdated to `v0.6`. Every card displays a clear, small date-time marker (e.g., `22 Oct 2026, 21:00`). Copy is strictly grandma-friendly: zero technical jargon (no WebRTC, SDP, ICE, buffers, sockets, or function names). Only plain human outcomes (e.g., "Works with zero internet", "Instant photo copying"). Linked directly from the clickable version badge (`v0.11` / `v0.12`) in desktop top pill bar and mobile status header, with an unread Acid Lime dot indicator stored in `localStorage`. | `@ghostdrop-web` + `@ghostdrop-ui-polish` |
| **2** | **In-App Feedback and Feature Request Modal (Google Sheets)** | An intuitive native modal ("Have an idea or spotted a problem?") styled in locked GhostDrop tokens. Lets users select between "I want a new feature" and "General thought or bug", type their message, and submit. Submissions post to a Google Apps Script web app endpoint that writes a row directly into a private Google Sheet (`Timestamp`, `Category`, `Message`, `App Version`, `Device Type`). Zero database overhead, zero email hassle, instant access on mobile. | `@ghostdrop-web` + `@ghostdrop-ui-polish` + `@ghostdrop-backend` |
| **3** | **PostHog Analytics + Public Teleport Counter** | Client-side tracking using PostHog with strict privacy controls (IP anonymized, session recording disabled, autocapture disabled). Emits only aggregate usage events (`room_created`, `peer_connected`, `file_teleported` with file count and size bucket). Strictly zero file names, types, or content logged. A serverless `/api/stats` endpoint queries aggregate teleport counts and caches the result for 10 minutes, powering a proud live counter badge ("500+ files teleported so far") without exposing private read keys. | `@ghostdrop-backend` + `@ghostdrop-web` |
| **4** | **Agent System Message Training** | Update system prompts in `.agents/agents/GhostDrop/` (`web.md`, `backend.md`, `ui-polish.md`, `orchestrator.md`) and log decisions in `decisions.md` so all AI agents maintain grandma-friendly changelogs, privacy-first PostHog capture, and Google Sheets feedback rules going forward. | `@ghostdrop-orchestrator` |

---

## 2. Grandma-Friendly Copy and Date-Time Marker Specification

Every entry in `web/src/lib/changelog.ts` must follow these rules:
1. **Small Date-Time Marker:** Formatted as `DD MMM YYYY, HH:MM` (e.g., `22 Oct 2026, 21:00`). Rendered cleanly in a compact pill badge beside the version tag.
2. **Grandma 2-Second Rule:** Use short words. Explain what the user can do, not how code works.
   - Banned: `WebRTC`, `SDP`, `ICE`, `STUN`, `DataChannel`, `mDNS`, `blobUrl`, `IndexedDB`, `ServiceWorker`, `PeerJS`, or any function names.
   - Required: "Works without internet", "Send pictures faster", "Clearer countdown timer".
3. **P0 Guardrails:** Zero em dashes (`—` or `–`) and zero emojis anywhere in copy or UI. Use `lucide-react` SVG icons inside circular badges.

### Backdated Changelog Baseline

- **v0.11** - `22 Oct 2026, 21:45`:
  - *Works with zero internet:* Send files and photos even when your mobile data is off or your Wi-Fi has no internet.
  - *Personal phone hotspot:* Connect your laptop and phone seamlessly over your mobile hotspot.
- **v0.10** - `22 Oct 2026, 12:45`:
  - *Fluid animated backdrop:* Smooth brand colour motion and cleaner launch countdown.
- **v0.9** - `21 Oct 2026, 23:30`:
  - *Exact seconds timer:* Timers now show exact seconds left before drops disappear.
  - *Simpler cards:* Removed duplicate step numbers for a cleaner screen.
- **v0.8** - `21 Oct 2026, 18:30`:
  - *Instant photo copy:* Copy pictures straight to your device clipboard with one tap.
  - *Share using phone menu:* Send received files directly to other apps using your phone share sheet.
- **v0.7** - `21 Oct 2026, 11:15`:
  - *Fresh look and feel:* Crisp Acid Lime and Electric Cobalt styling.
  - *Built-in QR scanner:* Scan codes with your camera without ever leaving the page.
  - *Self-destruct choices:* Choose when drops vanish: after 1 copy, 15 minutes, or 50 minutes.
- **v0.6** - `20 Oct 2026, 16:00`:
  - *The beginning:* First working link between your computer and mobile phone.

---

## 3. Feedback Pipeline Specification (Google Sheets)

1. **In-App Modal:** Triggered via a "Feedback" button in the navigation bar and mobile dock / footer.
2. **Payload:**
   ```json
   {
     "category": "feature_request" | "general_feedback",
     "message": "User text content",
     "version": "0.11",
     "device": "desktop" | "mobile" | "tablet",
     "timestamp": "2026-10-22T21:00:00.000Z"
   }
   ```
3. **Endpoint:** Google Apps Script Web App receiving JSON `POST`, appending a row to the configured Google Sheet:
   - Column A: `Timestamp` (ISO string or formatted date)
   - Column B: `Category` ("Feature Request" or "General Feedback")
   - Column C: `Message` (Full text)
   - Column D: `Version` (`v0.11`)
   - Column E: `Device` (`Desktop` / `Mobile` / `Tablet`)
4. **User Feedback Toast:** On submission, close modal and show a playful success toast (`"Message sent! Thank you for helping us improve GhostDrop."`).

---

## 4. PostHog Analytics and Public Counter Specification

1. **Client Setup:** Initialize PostHog via snippet or client library with:
   - `persistence: 'localStorage'`
   - `autocapture: false`
   - `disable_session_recording: true`
   - `ip: false` (IP anonymization active)
2. **Tracked Events (Strict Zero-Content Logging):**
   - `room_created`: `{ mode: 'cloud' | 'offline_direct' }`
   - `peer_connected`: `{ device_type: 'desktop' | 'mobile' | 'tablet' }`
   - `file_teleported`: `{ count: number, size_bucket_mb: string, ttl: string }`
3. **Public Stats Endpoint (`/api/stats`):**
   - Vercel serverless function querying PostHog Query API using private `POSTHOG_API_KEY`.
   - Returns `{ totalTeleports: number, activeRooms: number }`.
   - Edge cached with `Cache-Control: s-maxage=600, stale-while-revalidate=1200` to prevent rate limits.
   - Frontend displays: `"Over 500+ files teleported safely"` pill badge.

---

## 5. Execution Order and Specialist Ownership

1. **`@ghostdrop-backend`** (`docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/backend-task.md`):
   - Create Google Apps Script template and `/api/feedback` handler.
   - Create PostHog client configuration module (`src/lib/analytics.ts`) with privacy guardrails and capture helpers.
   - Create `/api/stats` serverless query endpoint with 10-minute cache headers.
2. **`@ghostdrop-ui-polish`** (`docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/ui-polish-task.md`):
   - Style the `/whats-new` timeline cards, version badges, date-time markers, and SVG category icons.
   - Style the in-app Feedback Modal (`Laroka` headings, Acid Lime submit button, Warm Stone backdrop, zero emojis, zero em dashes).
   - Style the public stats badge ("500+ files teleported").
3. **`@ghostdrop-web`** (`docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/web-task.md`):
   - Build `src/lib/changelog.ts` with backdated entries and date-time markers.
   - Build `src/pages/WhatsNew.tsx` and wire route in `router.tsx`.
   - Update `DesktopTopPillBar.tsx` and `MobileStatusHeader.tsx` to link version badge to `/whats-new` with an unread dot indicator.
   - Build `FeedbackModal.tsx` and wire trigger button into nav/footer.
   - Mount public stats counter badge on `HomeHub.tsx` and `HowItWorks.tsx`.
4. **`@ghostdrop-qa`** (`docs/tasks/step-14-v012-grandma-changelog-feedback-and-analytics/qa-task.md`):
   - Verify date-time markers on every changelog card.
   - Audit all changelog and modal copy for zero technical jargon, zero em dashes, and zero emojis.
   - Test Google Sheets feedback submission and unread version dot persistence.
   - Verify PostHog telemetry emits zero file names or personal data. Write `qa-report.md`.

---

## 6. Completion Notes and Sign-off

- **Executed by:** `@ghostdrop-backend`, `@ghostdrop-ui-polish`, `@ghostdrop-web`, and audited by `@ghostdrop-qa`.
- **Signed off:** 2026-10-22 by `@ghostdrop-orchestrator`.
- **Outcomes Delivered:**
  1. **Grandma-Friendly What is New Page (`/whats-new`):** Backdated release cards from `v0.6` through `v0.11` with `DD MMM YYYY, HH:MM` date-time markers, circular SVG category icons, and unread Acid Lime dot badge indicator on navbar version pills.
  2. **In-App Feedback Modal (Google Sheets):** Native modal with feature request / feedback toggle and text area, submitting to Google Apps Script web app endpoint with zero database setup. Available on desktop top bar, mobile status header, and mobile dock.
  3. **PostHog Analytics & Public Milestone Counter:** Privacy-first event instrumentation (`trackRoomCreated`, `trackPeerConnected`, `trackFileTeleported`) with strict property denylist (zero file names, zero notes, zero IPs, zero room codes). Serverless `/api/stats` endpoint with 10-minute edge cache serving celebratory "500+ files teleported safely" milestone counter badge.
  4. **Build & Quality Health:** All 6 QA gates passed. TypeScript, ESLint, and Vite production PWA build exit 0. Zero em dashes and zero emojis verified across repository.
