# design.md: GhostDrop Brand and UI Design System

> **Single Source of Truth for UI, Branding, Navigation, Motion, and Tone.**
> Every agent (`ghostdrop-web`, `ghostdrop-ui-polish`, `ghostdrop-web-admin`, `ghostdrop-qa`) MUST build strictly from the tokens, brand assets, and rules in this document and `docs/tokens/`.

---

## 1. Brand Assets in `docs/` (Canonical Visual References)

| Asset File | Role in GhostDrop | Locked Details |
| :--- | :--- | :--- |
| **`docs/Brand colours.jpg`** | Core 2-Color High-Energy Palette + Squiggle Card Pattern | **Color 1:** `#CDF22B` (Acid Lime) · **Color 2:** `#1E45FB` (Electric Cobalt Blue) · **Swatch 3:** Thick `#1E45FB` looping squiggly ribbon inside a `#CDF22B` rounded card. |
| **`docs/Logo icon.jpg`** | Official GhostDrop Brand Mark | Fluid, organic 3-lobe metaball splash + floating droplet circle in Electric Cobalt Blue (`#1E45FB`). |
| **`docs/laroka.otf`** | Primary Display Typeface (`Laroka`) | Chunky, expressive, joyful display font used for all H1/H2/H3 headings, 6-character room codes, stat numerals, and playful toast headers. |
| **`docs/Woove - Branding line.jpg`** | Signature Squiggly Loop Line ("The Woove Line") | Continuous, thick, round-capped looping line that enters from the left, executes a playful vertical loop-the-loop, and waves out to the right. Also provides Warm Stone canvas (`#EBEAE4`) and Deep Forest accent (`#124B38`). |

---

## 2. Design Intent, Responsive Navigation and Playful Vibe

GhostDrop is an **instant, zero-account P2P device teleportation bridge** (laptop to phone, tablet, or any browser/PWA). Instead of looking like a sterile enterprise utility or a generic developer tool, GhostDrop feels **tactile, joyful, kinetic, and irresistibly playful**:

1. **Zero Em-Dashes and Zero Emojis Anywhere (SVG Icons Only):**
   - **Strict Typography Rule:** Never use a single em dash anywhere in UI copy, labels, toasts, or code. Use standard hyphens (`-`), colons (`:`), periods (`.`), or commas.
   - **Strict Iconography Rule:** Never use emojis anywhere in the app. Every expressive accent, status badge, button icon, and playful illustration MUST use crisp **SVG icons** (`lucide-react` stroke icons at `2px` stroke width, or custom vector SVG icons) housed inside `#CDF22B` or `#1E45FB` circular badges.
2. **Responsive Navigation Split (Desktop Top Bar / FAB vs. Mobile Sleek Bottom Navbar):**
   - **Desktop (`>= 768px`):** Uses a **Floating Top Pill Bar** (or Floating Action Bar) inset from the top viewport edge, housing the GhostDrop fluid droplet logo, view switchers (`Teleport Hub`, `How It Works`), default TTL selector pill (`50m TTL`), and the primary `"Scan / Pair Device"` Nested Circle-Icon Pill button.
   - **Mobile (`< 768px`):** Uses a **Sleek Floating Bottom Navbar** anchored in the thumb zone (`bottom-4 inset-x-4 rounded-full bg-[#0D0F12] p-2 shadow-float`) with 4 pill items (`Teleport`, `Scan QR`, `TTL Timer`, `Install App` with crisp SVG icons), while the top of the mobile screen shows only a minimal status header (Logo + live `#GHOST8` connection pill).
3. **Bold Pop Contrast (`#CDF22B` + `#1E45FB` on `#F7F6F2` / `#EBEAE4`):**
   - High-energy Acid Lime (`#CDF22B`) and Electric Cobalt Blue (`#1E45FB`) create instant visual delight against warm stone/cream (`#F7F6F2`, `#EBEAE4`), crisp white (`#FFFFFF`), and deep ink (`#0D0F12`).
4. **The Signature Squiggly Loop Line ("Woove Line") Everywhere:**
   - The continuous looping line from `docs/Woove - Branding line.jpg` and Swatch 3 of `docs/Brand colours.jpg` is our unmistakable brand DNA.
   - It lives inside **individual card backgrounds** (clipped cleanly by the card's `32px` border radius), across **hero backdrops**, inside **empty state cards**, and as the **live P2P connection bridge** linking connected devices.
5. **Self-Drawing Line Animation (NEVER Fly-In / Fly-Out):**
   - Whenever a squiggly line appears (on page load, when a card mounts, when a peer connects, or when a file beams across), **it MUST animate as if being drawn into place from start to finish** using SVG `pathLength="1"`, `stroke-dasharray: 1`, and `stroke-dashoffset: 1 -> 0`.
   - **STRICT BAN:** Never animate the squiggly line with fly-in, slide-in, bounce-in, or scale-in transforms. The line itself draws smoothly along its curve.
6. **Playful, Joyful Copy (Especially Errors and Successes):**
   - Every interaction talks like a cheerful, witty friend cheering you on.
   - **Success messages** celebrate every drop (*"Boom! Teleported in 0.4s. Zero cloud, pure magic."*, *"Snagged it! Ready to paste like a boss."*).
   - **Error messages** stay upbeat, reassuring, and playful (*"Whoops! That room code ghosted us. Double-check the 6 letters and give it another spin!"*, *"Uh-oh, our squiggle line got a tiny knot! Peer disconnected. Tap to re-link."*).

---

## 3. Color Tokens (Locked in `docs/tokens/tokens.json` and `tokens.css`)

```css
:root {
  /* Primary Brand Duo (from Brand colours.jpg) */
  --color-lime-400: #CDF22B;      /* Color 1: Acid Lime - primary highlight cards, badges, CTAs, squiggle strokes */
  --color-lime-300: #DDF768;      /* Hover / soft lime glow */
  --color-lime-100: #F4FCD1;      /* Soft lime pill/chip tint */

  --color-cobalt-600: #1E45FB;    /* Color 2: Electric Cobalt Blue - primary brand surface, logo, squiggle strokes, primary buttons */
  --color-cobalt-700: #1433CC;    /* Pressed / active cobalt */
  --color-cobalt-400: #5271FF;    /* Focus rings & secondary badges */
  --color-cobalt-100: #E8ECFF;    /* Soft cobalt tint surface */

  /* Editorial Accent & Canvas (from Woove - Branding line.jpg) */
  --color-forest-800: #124B38;    /* Deep Forest Green - secondary squiggle variant & TTL shield badge */
  --color-stone-100: #EBEAE4;     /* Warm Stone background canvas */
  --color-stone-50:  #F7F6F2;     /* Primary page background */
  --color-surface:   #FFFFFF;     /* Clean card surface */

  /* Ink & Borders */
  --color-ink-950: #0D0F12;       /* Display headings, dark cards, mobile bottom dock, tactile 2px borders */
  --color-ink-800: #1C2026;       /* Secondary dark surface */
  --color-ink-500: #5A6270;       /* Muted metadata text */
  --color-line:    #DDDCD4;       /* Subtle card divider */
  --color-line-strong: #0D0F12;   /* Playful neo-brutalist / tactile border option */

  /* Playful Feedback States */
  --color-success-bg: #CDF22B;    /* Joyful Acid Lime success surface */
  --color-success-ink: #0D0F12;
  --color-warning-bg: #FFE45E;    /* Sunny yellow TTL expiring-soon warning */
  --color-warning-ink: #0D0F12;
  --color-error-bg: #FF5A65;      /* Playful Coral-Watermelon error badge */
  --color-error-tint: #FFE5E7;    /* Playful error card surface */
  --color-error-ink: #0D0F12;
}
```

### Card Color Rhythm and Pairing Rules
Never render a row or grid of identical plain white cards. Rotate card treatments using our 4 signature card skins:
1. **The "Swatch 3" Lime Card (`#CDF22B` bg + `#1E45FB` self-drawing squiggly loop in background + `#0D0F12` text):** Used for the Hero QR / Room Code Card and "Drop Complete!" celebration cards.
2. **The Electric Cobalt Card (`#1E45FB` bg + `#CDF22B` self-drawing squiggly loop in background + `#FFFFFF` text):** Used for the Primary File Dropzone / Active Transfer Banner.
3. **The Warm Stone / Woove Card (`#EBEAE4` bg + `#124B38` or `#1E45FB` self-drawing squiggly loop + `#0D0F12` text):** Used for Connected Devices and Ephemeral TTL Settings.
4. **The Crisp Surface Card (`#FFFFFF` bg + subtle `#E8ECFF` squiggly watermark + `#0D0F12` text + `--shadow-card`):** Used for individual items in the Live Transfer Feed (text snippets, links, file chunks).

---

## 4. Typography (`Laroka` + `Plus Jakarta Sans` + `JetBrains Mono`)

| Role | Font Family | Source | Weights and Usage |
| :--- | :--- | :--- | :--- |
| **Display, Headings, Room Code, Numerals, Toast Titles** | **`Laroka`** | Local font `docs/laroka.otf` (`/fonts/laroka.otf`) | Bold/Regular. Tight tracking (`-0.02em`), line-height `1.05`. Gives GhostDrop its unmistakable chunky, joyful personality (matches `COLOR PALETTE` header in `Brand colours.jpg`). |
| **Body, UI Controls, Buttons, Helper Copy** | **`Plus Jakarta Sans`** | Google Fonts | `500`, `600`, `700`. Super legible at small sizes, friendly rounded terminals. |
| **6-Char Room Code Input, Chunk Progress, Byte Counters, Peer IDs** | **`JetBrains Mono`** | Google Fonts | `600`, `700`. Used for `G H O S T 8` room badges, `16 KB` chunk telemetry, and live `49:59` TTL countdown timers. |

### Fluid Type Scale
- `--fs-display`: `clamp(2.5rem, 5vw + 1rem, 4.5rem)` - Hero headlines
- `--fs-h1`: `clamp(2rem, 3.5vw + 0.75rem, 3.25rem)` - Page and modal titles
- `--fs-h2`: `clamp(1.5rem, 2.5vw + 0.5rem, 2.25rem)` - Section headers and empty state headers
- `--fs-h3`: `clamp(1.2rem, 1.2vw + 0.5rem, 1.5rem)` - Card titles
- `--fs-room-code`: `clamp(2rem, 4vw + 0.5rem, 3.25rem)` - 6-character pairing code display

---

## 5. The Signature Squiggly Loop Line ("Woove Line") Specification

### 5.1 Visual Anatomy
Inspired directly by `docs/Woove - Branding line.jpg` and Swatch 3 of `docs/Brand colours.jpg`:
- **Stroke Style:** Thick, uniform tubular stroke (`stroke-width: 18` to `44` depending on container size), `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`.
- **Path Geometry:** Enters gracefully from the lower-left edge, rises into a smooth, playful **360-degree vertical loop-the-loop** (or double loop on wide cards, exactly like Swatch 3 of `Brand colours.jpg`), and glides out toward the right edge.
- **Placement Variants:**
  1. **Card Background Squiggle (`<SquiggleCardBg variant="single-loop" | "double-loop" />`):** Positioned `absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]` behind card content.
  2. **P2P Bridge Squiggle (`<SquiggleConnectionBridge />`):** Connects the Host Device avatar on the left to the Joined Device avatar(s) on the right. While waiting for a peer, the line draws halfway and pulses gently at the tip; the moment a peer connects, the line **draws all the way across into the peer badge** and turns Acid Lime (`#CDF22B`)!
  3. **Toast and Empty State Doodle Squiggle:** Mini self-drawing loop underline beneath joyful success and error headlines.

### 5.2 Canonical SVG Path and Self-Drawing Animation
Every squiggly line MUST use `pathLength="1"` so CSS can animate `stroke-dashoffset` from `1` to `0` deterministically regardless of viewport width:

```tsx
/* Canonical Single-Loop Squiggle (Woove - Branding line.jpg) */
<svg
  viewBox="0 0 600 320"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  className="pointer-events-none select-none"
  aria-hidden="true"
>
  <path
    d="M -30 260 C 80 235, 195 170, 195 95 C 195 30, 105 30, 105 105 C 105 185, 235 235, 370 185 C 470 148, 540 125, 630 120"
    stroke="currentColor"
    strokeWidth="28"
    strokeLinecap="round"
    strokeLinejoin="round"
    pathLength="1"
    className="squiggle-path-draw"
  />
</svg>

/* Canonical Double-Loop Card Squiggle (Brand colours.jpg Swatch 3) */
<svg
  viewBox="0 0 600 280"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  className="pointer-events-none select-none"
  aria-hidden="true"
>
  <path
    d="M 45 290 C 65 110, 165 25, 225 90 C 275 145, 210 265, 145 250 C 80 235, 165 95, 295 125 C 415 155, 445 255, 375 270 C 305 285, 330 165, 445 195 C 510 212, 545 180, 565 75 C 575 20, 440 -10, 435 55 C 430 125, 535 165, 585 95 L 605 290"
    stroke="currentColor"
    strokeWidth="36"
    strokeLinecap="round"
    strokeLinejoin="round"
    pathLength="1"
    className="squiggle-path-draw"
  />
</svg>
```

---

## 6. Playful and Joyful Feedback System (Zero Emojis, Zero Em-Dashes, Crisp SVG Icons)

Nothing in GhostDrop is allowed to sound robotic (no `"Error 500"`, `"Invalid Input"`, or `"File uploaded successfully"`). Every state uses a playful headline in `Laroka`, a clear helpful subline in `Plus Jakarta Sans`, a crisp SVG icon (`lucide-react`), and a self-drawing squiggle accent:

### 6.1 Joyful Success Messages (`#CDF22B` Acid Lime Card + `#1E45FB` Squiggle)
| Trigger Event | SVG Icon (`lucide-react`) | Playful Headline (`Laroka`) | Subline (`Plus Jakarta Sans`) | Action / Pill |
| :--- | :--- | :--- | :--- | :--- |
| **Room Connected (Peer Joined)** | `Zap` | `"Boom! You're linked up!"` | `"Direct P2P tunnel is wide open. Zero cloud, zero middleman. Start tossing stuff across!"` | `[Wave Hello]` |
| **Clipboard Text Received** | `ClipboardCheck` | `"Fresh snippet just landed!"` | `"Beamed straight to your screen at warp speed."` | `[Copy to Clipboard]` |
| **Clipboard Copied** | `CheckCircle2` | `"Snagged it! Copied to clipboard"` | `"Go ahead and hit Ctrl+V or Paste wherever you need it."` | `Auto-dismiss 2.5s` |
| **File Transfer Complete (`FILE_ACK`)** | `Rocket` | `"Touchdown! File teleported intact"` | `"All 16KB chunks snapped together like LEGO bricks."` | `[Save File]` |
| **Drop and Nuke Confirmed** | `Flame` | `"Beamed to PC and vanished!"` | `"Your laptop caught the file and returned the OK signal."` | `[Done]` |
| **PWA Share Target Received** | `Share2` | `"Caught it from your share sheet!"` | `"Ready to beam this straight to your connected room."` | `[Beam Now]` |

### 6.2 Playful Error and Warning Messages (`#FFE5E7` Coral Tint Card + `#FF5A65` Squiggle)
| Trigger Event | SVG Icon (`lucide-react`) | Playful Headline (`Laroka`) | Subline (`Plus Jakarta Sans`) | Recovery CTA |
| :--- | :--- | :--- | :--- | :--- |
| **Invalid / Expired 6-Char Room Code** | `Ghost` | `"Whoops! That room ghosted us"` | `"We couldn't find an active room with code #XXXXXX. Check for typos or scan a fresh QR code!"` | `[Try Another Code]` |
| **WebRTC / Peer Disconnected Mid-Session** | `Unplug` | `"Uh-oh, the squiggle got unplugged!"` | `"Your paired device closed its tab or hopped networks. Don't worry, we can re-link in 2 seconds."` | `[Reconnect Room]` |
| **Camera Permission Denied (QR Scanner)** | `CameraOff` | `"No camera? No problem!"` | `"Just type the 6-letter code shown on your other screen below."` | `[Type Code]` |
| **Transfer Interrupted / Backpressure Timeout** | `RefreshCw` | `"Whoa, that file tripped mid-jump!"` | `"The P2P tunnel hiccupped before chunk #42 finished. Tap retry to beam it again!"` | `[Beam Again]` |
| **TTL Self-Destruct Expired** | `Sparkles` | `"Poof! Self-destruct timer hit zero"` | `"As promised, that file was scrubbed from browser memory. Nothing left behind!"` | `[Got It]` |

---

## 7. Core UI Components and Tactile Craft

1. **Desktop Top Bar / FAB vs. Mobile Sleek Bottom Navbar:**
   - **Desktop (`>= 768px`):** Sticky floating top pill bar (`rounded-full bg-white/90 backdrop-blur-md border border-[#DDDCD4] px-6 py-3`) with optional floating action bar (`FAB`) for quick paste/drop.
   - **Mobile (`< 768px`):** Sleek floating bottom navbar (`fixed bottom-4 inset-x-4 z-50 rounded-full bg-[#0D0F12] text-white px-3 py-2 shadow-float flex items-center justify-around`) where the active tab highlights as a `#CDF22B` Acid Lime pill with `#0D0F12` text and a crisp SVG icon.
2. **Color-Swatch Pill Badges (Inspired by `#CDF22B +` and `#1E45FB +` pills in `Brand colours.jpg`):**
   - Look at the bottom-right corner of the color blocks in `Brand colours.jpg`: a rounded pill (`border-radius: 9999px`) in the opposite brand color containing a label on the left and a nested circular SVG `Plus` or `ArrowUpRight` icon on the right!
   - **Rule:** Every primary CTA button, room-code copy button, and card action button uses this exact **Nested Circle-Icon Pill** geometry:
     - On a `#CDF22B` Lime card: Button is `#1E45FB` Cobalt Blue pill with white text and a `#CDF22B` Lime circle (`Plus` or `ArrowRight` SVG in `#0D0F12`) nested inside the right edge!
     - On a `#1E45FB` Cobalt card: Button is `#CDF22B` Lime pill with `#0D0F12` text and a `#1E45FB` Cobalt circle (`Plus` or `ArrowRight` SVG in `#FFFFFF`) nested inside the right edge!
3. **8-Ball / Orb Floating Badges (Inspired by the top-right blue-and-lime `8` orb in `Brand colours.jpg`):**
   - Circular badge (`w-14 h-14 rounded-full bg-[#1E45FB]`) with an off-center nested `#CDF22B` lime circle containing a number or SVG icon in `Laroka` font (used for connected peer count, active chunk queue count, or step numbers `1`, `2`, `3`).
4. **Ephemeral TTL Pill Selector:**
   - Tactile segmented pill toggle with SVG icons (`Flame`, `Timer`, `Infinity`): `[Burn on Copy]` · `[15m]` · `[50m (Default)]` · `[24h]` · `[Until Tab Close]`.
   - Active preset lights up in `#CDF22B` Acid Lime with a subtle self-drawing loop underline.

---

## 8. "Never Do" List (Strict Guardrails)

- **NEVER fail the "Grandma 2-Second Rule":** Every screen must be immediately understandable in under 2 seconds by a non-technical grandparent. Keep a maximum of 15 words per card, 1 obvious button per card, and generous open background space.
- **NEVER display developer or protocol jargon in the UI:** Ban `WebRTC`, `RTCDataChannel`, `P2P`, `16KB chunks`, `Backpressure`, `FILE_ACK`, `URL.revokeObjectURL`, `TTL`, `PWA`, and `SCTP` from user-facing screens. Use plain English (*"Scan with your phone"*, *"Disappears in 50 mins"*, *"Send Photos or Files"*).
- **NEVER let the squiggly line collide with text:** Place card squiggly lines in decorative corners/edges or at subtle opacity so text is always 100% crisp and readable.
- **NEVER let the 6-letter room code wrap onto two lines:** Always render `G H O S T 8` on a single unbroken horizontal line (`white-space: nowrap`).
- **NEVER use a single em dash anywhere** in the UI copy, code comments, error messages, or docs.
- **NEVER use emojis anywhere** in the UI copy, buttons, badges, or docs. Always use crisp SVG icons (`lucide-react` or custom brand SVGs).
- **NEVER animate the squiggly line with fly-in, slide-in, or bounce-in.** It must ALWAYS animate via `stroke-dashoffset` (`pathLength="1"`) so it looks like an invisible hand is drawing the curve in real time.
- **NEVER use boring, robotic, or scary system error messages** (no `"WebRTC ICE Failed"`, `"Error: Peer unavailable"`, or plain browser `alert()`). Always use the playful GhostDrop toast/card voice.
- **NEVER show a desktop top nav link bar on mobile, or a mobile bottom dock on desktop.** Keep the responsive navigation split clean.
- **NEVER substitute `Laroka` on display headings or room codes.** `docs/laroka.otf` is a locked brand asset.
- **NEVER leave object URLs (`Blob` URLs) in memory** after an item's TTL expires or the tab closes.
