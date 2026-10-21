# 01-wireframe-and-pages.md: GhostDrop Sitemap, Navigation, and Grandma-Simple Wireframes

> **Canonical Structural Map for Stage UI Generation and Frontend Implementation.**
> Every screen follows the **Grandma 2-Second Rule**: big clear buttons, maximum 15 words per card, zero technical jargon on screen, crisp **SVG Icons Only (Zero Emojis, Zero Em-Dashes)**, and the **Desktop Top Bar vs. Mobile Sleek Bottom Navbar** split.

---

## 1. Responsive Navigation Architecture (Desktop vs. Mobile)

1. **Desktop Navigation (`>= 768px`): Minimal Floating Top Pill Bar**
   - **Floating Top Pill Bar:** Sticky top container (`max-w-[1120px] mx-auto mt-6 rounded-full bg-white px-6 py-3 shadow-card flex items-center justify-between`):
     - Left: GhostDrop fluid droplet logo (`docs/Logo icon.jpg` in `#1E45FB`) + **`GhostDrop`** wordmark in `Laroka`.
     - Center: Simple timer pill (`Clock` SVG icon + `"Auto-delete: 50 mins"`).
     - Right: Primary `#1E45FB` Cobalt Nested Circle-Icon Pill button (`"Enter a Code"` with nested `#CDF22B` circle containing a `Plus` SVG icon).
2. **Mobile Navigation (`< 768px`): Minimal Top Status Header + Sleek Floating Bottom Navbar**
   - **Minimal Top Status Header:** Compact bar showing only the GhostDrop droplet logo + `Laroka` wordmark on the left, and the live Connection Pill on the right (green dot + `"Connected"`).
   - **Sleek Floating Bottom Navbar (Thumb-Zone Dock):** Fixed at the bottom of the mobile screen (`fixed bottom-5 inset-x-5 z-50 rounded-full bg-[#0D0F12] p-2 shadow-float flex items-center justify-between`):
     - Tab 1: `Send` SVG icon + `"Send"` (Active tab styled as a `#CDF22B` Acid Lime pill with `#0D0F12` text)
     - Tab 2: `ScanLine` SVG icon + `"Scan QR"` (Opens QR Scanner Modal)
     - Tab 3: `Clock` SVG icon + `"50 Mins"` (Opens simple auto-delete timer picker)

---

## 2. Application Screens Overview

| Screen ID | Route / State | Purpose |
| :--- | :--- | :--- |
| **Screen 1** | `/` *(Desktop Home: Simple 2-Card Pairing & Send Hub)* | Top Pill Bar, single-line H1, Left Card (`Scan with your phone` + QR + single-line `G H O S T 8`), Right Card (`Pick what to send` + big file button + simple paste bar). The `<OrbBadge>` circles carry `1` and `2`, so the card titles never repeat the number. |
| **Screen 2** | `/room/:code` *(Connected Workspace: Active Session)* | Top Connected Bridge Bar (`This Computer` <-> Squiggle Line <-> `My Phone`), Left Send Card (`Send Photos or Files`), Right Shared Items List (max 3 clean cards with big `Save` / `Copy` buttons). |
| **Screen 3** | `/join?room=XXXXXX` *(Mobile Phone Screen)* | Minimal top header, 1 big `Send Photos or Files` Cobalt card, 1 simple paste bar, 2 clean received item cards, and the **3-tab Sleek Floating Bottom Navbar**. |
| **Screen 4** | `Modal: Connect Your Screen (QR & 6-Letter Code)` | Clean camera viewfinder + 6 big `Laroka` letter boxes on a single row (`[G] [H] [O] [S] [T] [8]`) + `Connect Now` button. |
| **Screen 5** | `/how-it-works` *(3 Easy Steps & Friendly Alerts)* | 3 giant visual step cards (`1. Scan the code`, `2. Send photos or notes`, `3. Cleans up by itself`) linked by a self-drawing squiggle line + 3 friendly alert cards. |

---

## 3. Anti-Clutter Layout Rules Across All Screens

1. **No Developer Jargon:** Never display `WebRTC`, `16KB chunks`, `Backpressure`, `FILE_ACK`, `URL.revokeObjectURL`, `TTL`, or `PWA` in the UI.
2. **No Extra Marketing Strip on the Home Workspace:** Keep `/` focused strictly on the 2 primary action cards so the user is never overwhelmed.
3. **Single-Line 6-Character Room Code:** The 6-letter code (`G H O S T 8`) must use `white-space: nowrap` and fit comfortably on a single line at all viewport widths.
4. **Squiggle Line Safe Zone:** Decorative self-drawing squiggly lines (`stroke-dashoffset: 1 -> 0`) must stay in card corners/edges or at subtle opacity so they never cross behind dark body text.
