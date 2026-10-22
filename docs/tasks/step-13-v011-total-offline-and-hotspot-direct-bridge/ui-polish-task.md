# Step 13 UI Polish Task: Grandma-Simple Offline Direct Copy Deck and `<OfflineLinkCard />` (`@ghostdrop-ui-polish`)
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - ui-polish-complete - 2026-10-22

**Assigned Agent:** `@ghostdrop-ui-polish` (`.agents/agents/GhostDrop/ui-polish.md`)
**Scope:** `web/src/lib/copyDeck.ts`, `docs/02-brand-persona-and-copy.md`, `web/src/components/room/OfflineLinkCard.tsx` (new).
**Out of Scope:** Do NOT edit `web/src/lib/p2p/*` or `web/src/types/protocol.ts`.

---

## Mandatory Pre-Read Before Coding

1. `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`
2. `docs/design.md`, `docs/02-brand-persona-and-copy.md`, `docs/05-motion-spec.md`, `docs/tokens/tokens.css`
3. `decisions.md` (specifically D-005, D-006, D-007, D-009, D-016)
4. `web/src/lib/copyDeck.ts`, `web/src/components/room/RoomCodeCard.tsx`, `web/src/components/brand/SquiggleCardBg.tsx`, `web/src/components/brand/NestedPillButton.tsx`

> **REMINDER (P0):**
> - **Zero Em-Dashes (`U+2014`), Zero En-Dashes (`U+2013`), and Zero Emojis** anywhere in code, comments, UI copy, or docs.
> - **Zero Technical Jargon:** Never use `SDP`, `ICE`, `WebRTC`, `STUN`, `Offer`, `Answer`, `mDNS`, or `PeerJS` in any user-facing string.
> - **Self-Drawing Squiggle Only (D-006):** Use `<SquiggleCardBg />` (`stroke-dashoffset: 1 -> 0`), never fly-in or slide-in.

---

## Task Checklist

### 1. Add Offline Direct Copy Keys to `web/src/lib/copyDeck.ts` and `docs/02-brand-persona-and-copy.md`
- [x] **1.1 Extend `RoomFeedbackKey` and `buildFeedback()` in `web/src/lib/copyDeck.ts`:**
  Add these three keys to `RoomFeedbackKey` and `buildFeedback()`:
  - `'INFO_OFFLINE_READY'`:
    - `tone`: `'info'`
    - `title`: `'Offline link ready!'`
    - `body`: `'No internet needed. Scan the QR code, then scan the reply QR from your other screen.'`
    - `actionLabel`: `'Got It'`
  - `'INFO_OFFLINE_REPLY_READY'`:
    - `tone`: `'success'`
    - `title`: `'Almost linked!'`
    - `body`: `'Show this reply QR code to your other screen (or copy the reply code) to finish linking.'`
    - `actionLabel`: `'Copy Reply Code'`
  - `'ERR_OFFLINE_CODE_INVALID'`:
    - `tone`: `'error'`
    - `title`: `'Hmm, check that offline code'`
    - `body`: `'That offline link code looks incomplete. Copy it again from your other screen!'`
    - `actionLabel`: `'Try Again'`
- [x] **1.2 Export Grandma-Simple Offline Direct UI Strings from `web/src/lib/copyDeck.ts`:**
  ```ts
  export const OFFLINE_BADGE_LABEL = 'Offline Wi-Fi / Hotspot Mode'
  export const OFFLINE_HOST_STEP_TITLE = 'Finish linking without internet'
  export const OFFLINE_HOST_STEP_BODY =
    '1. Scan this QR on your other screen. 2. Tap Scan Reply below and point at your other screen.'
  export const OFFLINE_SCAN_REPLY_CTA = 'Scan or Paste Reply'
  export const OFFLINE_COPY_INVITE_CTA = 'Copy Offline Code'
  export const OFFLINE_GUEST_REPLY_TITLE = 'Show this reply to your other screen'
  export const OFFLINE_GUEST_REPLY_BODY =
    'On your other screen, tap Scan or Paste Reply and point its camera right here.'
  export const OFFLINE_COPY_REPLY_CTA = 'Copy Reply Code'
  export const OFFLINE_SWITCH_CTA = 'No internet? Link directly on Wi-Fi or Hotspot'
  ```
- [x] **1.3 Mirror the new keys into `docs/02-brand-persona-and-copy.md`:**
  - Document `INFO_OFFLINE_READY`, `INFO_OFFLINE_REPLY_READY`, and `ERR_OFFLINE_CODE_INVALID` in `docs/02-brand-persona-and-copy.md` with zero em dashes and zero emojis.

---

### 2. Create `web/src/components/room/OfflineLinkCard.tsx`
- [x] **2.1 Build `<OfflineLinkCard />` for both Guest Reply QR display and Host Offline Step 2:**
  - Props contract:
    ```ts
    export interface OfflineLinkCardProps {
      mode: 'host-waiting' | 'guest-reply'
      /** For host-waiting: the Host's offline invite token (GD1...). For guest-reply: the Guest's reply token (GD1...). */
      token: string | null
      /** Triggered when the Host clicks 'Scan or Paste Reply' (opens QrScannerModal in reply mode). */
      onOpenReplyScanner?: () => void
      /** Triggered when copy succeeds or fails so the page toast announces it. */
      onCopyFeedback?: (key: RoomFeedbackKey) => void
      className?: string
    }
    ```
  - **When `mode === 'guest-reply'` (shown on the Guest screen right after scanning/pasting the Host's offline QR/code):**
    - High-craft `#CDF22B` (`bg-brand-lime text-brand-ink`) card with `rounded-[32px]`, `<SquiggleCardBg tone="cobalt" variant="single-loop" opacity={0.2} placement="bottom-right" />`.
    - `<OrbBadge size="md">2</OrbBadge>` + `Laroka` heading (`OFFLINE_GUEST_REPLY_TITLE`: `"Show this reply to your other screen"`) + helper text (`OFFLINE_GUEST_REPLY_BODY`).
    - Centered `bg-brand-surface rounded-[24px] p-3 shadow-soft` container rendering `<QRCodeSVG value={token} size={184} level="L" marginSize={0} />` (`level="L"` keeps module density ultra-low and easy for laptop/phone cameras to read in `< 150ms`).
    - Two accessible (`min-h-[44px]`) action buttons:
      1. Copy Reply Code button (`Copy` / `Check` SVG icon from `lucide-react`) that copies `token` to the clipboard (with `textarea` `execCommand('copy')` fallback for plain HTTP origins) and triggers `onCopyFeedback?.('SUCCESS_COPIED')`.
  - **When `mode === 'host-waiting'` (shown on the Host screen when in Offline Direct Mode):**
    - Compact, high-contrast panel (`rounded-[24px] bg-brand-surface p-4 text-brand-ink shadow-soft`) that sits cleanly inside `RoomCodeCard` or `ConnectedWorkspace`:
    - Displays a pill badge with `Wifi` / `Sparkles` SVG icon (`OFFLINE_BADGE_LABEL`), short 2-step helper text (`OFFLINE_HOST_STEP_BODY`), a primary `<NestedPillButton variant="lime-on-cobalt" icon={ScanLine} onClick={onOpenReplyScanner}>Scan or Paste Reply</NestedPillButton>`, and a secondary `min-h-[44px]` button (`Copy` SVG icon) to copy the Host's `token` (`OFFLINE_COPY_INVITE_CTA`) for camera-free code pasting.
  - Ensure all interactive buttons are at least `44x44px` (`min-h-[44px]`), use only token classes (`bg-brand-*`, `text-brand-*`), and have proper `aria-label`s.

---

## Verification Before Handing Off

- [x] Run `npm run type-check` and `npm run lint` in `web/` and confirm both exit `0`.
- [x] Verify zero raw hex values in `OfflineLinkCard.tsx` and zero em dashes (`U+2014`), en dashes (`U+2013`), or emojis across all touched files.
- [x] Check all checkboxes `[x]` in this file and update the device stamp on line 2 (`· <hostname> - ui-polish-complete - YYYY-MM-DD`).
