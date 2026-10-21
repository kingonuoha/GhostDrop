# GhostDrop: Stage Design Prompts (Grandma-Friendly, Ultra-Clean Edition)

> **WHY THIS VERSION EXISTS:**
> Our first Stage pass had way too much text, developer jargon (`WebRTC`, `16KB chunks`, `URL.revokeObjectURL`, `TTL`, `FILE_ACK`), and too many small badges competing for attention.
> This edition enforces the **Grandma 2-Second Rule**: any person of any age must look at the screen and understand what to click in **under 2 seconds**.

---

## 1. Files to Attach in Stage (Upload These 4 Visual Files First)

Attach **only** these 4 brand files from `docs/` in Stage so Stage locks onto our colors, font, logo, and squiggly line without getting distracted by backend technical docs:

1. **`docs/Brand colours.jpg`** - Locks in **Acid Lime (`#CDF22B`)**, **Electric Cobalt Blue (`#1E45FB`)**, the nested circle-icon pill buttons (`#CDF22B +` and `#1E45FB +`), the top-right `8` orb badge, and **Swatch 3** (blue squiggly loop inside a lime card).
2. **`docs/Logo icon.jpg`** - Locks in the Electric Cobalt fluid droplet logo mark (`#1E45FB`).
3. **`docs/Woove - Branding line.jpg`** - Locks in the signature single-loop squiggly line, Warm Stone background (`#EBEAE4`), and Deep Forest accent (`#124B38`).
4. **`docs/laroka.otf`** - Locks in the chunky **`Laroka`** display font for short titles, 6-letter room codes, and numbers.

*(Do NOT attach protocol specs or PRD docs to Stage so Stage never prints developer jargon onto the UI!)*

---

## 2. The "Grandma 2-Second Rule" (Strict Anti-Clutter Guardrails)

1. **ZERO TECHNICAL JARGON ON SCREEN:**
   - **BANNED WORDS IN UI:** Never display `WebRTC`, `RTCDataChannel`, `P2P`, `16KB chunks`, `Backpressure`, `FILE_ACK`, `URL.revokeObjectURL`, `SCTP`, `ECDH`, `TTL`, `PWA`, `Mesh`, or `Telemetry`.
   - **PLAIN HUMAN REPLACEMENTS:**
     - Say **"Scan with your phone"** (not *"Optical QR Handshake"*).
     - Say **"Deletes in 50 mins"** (not *"50m Ephemeral TTL"*).
     - Say **"Send Files or Photos"** (not *"Beam 16KB Binary Chunks"*).
     - Say **"Add App"** (not *"Install PWA Service Worker"*).
2. **MAXIMUM 15 WORDS PER CARD:**
   - Every card has **1 short title (3 to 5 words)** + **1 clear visual (QR code or big button)** + **1 helper line (max 7 words)**.
   - **No multi-line paragraphs.** No corner status chips. No marketing cards underneath the main workspace.
3. **SQUIGGLE LINE SAFE ZONE (NEVER BEHIND SMALL TEXT):**
   - Keep the signature looping squiggly line (`stroke-dashoffset: 1 -> 0` self-drawing animation) tucked cleanly along the bottom/top card edge or at subtle contrast (`15%` to `25%` opacity when behind content) so text is always 100% effortless to read.
4. **ZERO EMOJIS AND ZERO EM DASHES:**
   - Use only clean vector **SVG icons** (Lucide style) inside circular badges. Never use emojis or em dashes anywhere.
5. **CLEAN RESPONSIVE NAVIGATION:**
   - **Desktop (`>= 768px`):** Simple floating top pill bar with only **Logo** on the left, **Timer pill (`Deletes in 50 mins`)** in the middle, and **`Scan Code` button** on the right.
   - **Mobile (`< 768px`):** Simple top header (**Logo** + **`Connected`** badge) and a **Sleek Floating Bottom Navbar** with 3 clear tabs: **`Send`**, **`Scan`**, **`Timer`**.

---

## 3. Copy-and-Paste Stage Prompts (Send One by One)

---

### Prompt 1: Desktop Home Screen - Simple 2-Card Pairing and Send Hub (`desktop_tablet_hub_pairing_ready_state`)

```markdown
Design an ultra-clean, spacious, grandma-friendly Desktop Web App screen (1440px x 900px) for "GhostDrop": a dead-simple tool to send photos, files, and text between your phone and computer.

CRITICAL SIMPLICITY & ANTI-CLUTTER RULES (MUST FOLLOW):
1. GRANDMA-FRIENDLY SIMPLICITY: A 75-year-old grandma must understand the entire screen in 2 seconds. Use big buttons, tons of breathing room (at least 40% open Warm Stone #F7F6F2 background space), and plain everyday words.
2. BANNED WORDS (DO NOT RENDER ANY OF THESE): Never write "WebRTC", "P2P", "RTCDataChannel", "16KB chunks", "Backpressure", "URL.revokeObjectURL", "FILE_ACK", "TTL", "PWA", or "Mesh".
3. NO PARAGRAPHS OR EXTRA CARDS: Do NOT add feature explanation cards at the bottom. Do NOT add tiny status pills in card corners. Keep only 1 Top Bar and 2 big, clean cards side-by-side.
4. ZERO EMOJIS & ZERO EM DASHES: Use only clean vector SVG icons inside circular badges. Never use emojis or em dashes.
5. SQUIGGLE READABILITY: Place the signature looping squiggly line (from Woove - Branding line.jpg and Swatch 3 of Brand colours.jpg) cleanly in the open background corners of the cards so it NEVER collides with or crosses behind text.

COLORS & TYPOGRAPHY (FROM ATTACHED BRAND FILES):
- Page Canvas: Warm Stone (#F7F6F2)
- Left Card Surface: Acid Lime (#CDF22B)
- Right Card Surface: Electric Cobalt Blue (#1E45FB)
- Ink / Text: Jet Ink (#0D0F12) and Crisp White (#FFFFFF)
- Display Font: "Laroka" (attached laroka.otf) for the 2 card titles and the 6-letter code.
- UI Font: "Plus Jakarta Sans" (600, 700) for buttons and short labels.

EXACT SCREEN LAYOUT (ONLY 3 THINGS ON THE ENTIRE PAGE):

1. Minimal Floating Top Pill Bar (`max-w-[1120px] mx-auto mt-6 rounded-full bg-white px-6 py-3 shadow-sm flex items-center justify-between`):
   - Left: Electric Cobalt (#1E45FB) droplet logo (from Logo icon.jpg) + "GhostDrop" in Laroka.
   - Center: Simple pill button with a Timer SVG icon: "Auto-delete: 50 mins".
   - Right: One Electric Cobalt (#1E45FB) pill button "Enter a Code" with a nested Acid Lime (#CDF22B) circle containing a Plus SVG icon.

2. Clean Centered Page Header (Above the 2 Cards):
   - Short H1 in Laroka (#0D0F12, 44px, single line): "Send photos and text between your screens."

3. Main 2-Card Split Grid (`max-w-[1120px] mx-auto grid grid-cols-12 gap-8`):

   - LEFT CARD (5 Columns) - "STEP 1: SCAN WITH YOUR PHONE" (`bg-[#CDF22B] rounded-[36px] p-10 flex flex-col items-center text-center relative overflow-hidden`):
     - Subtle #1E45FB squiggly loop line tucked cleanly along the bottom-right corner edge (never behind text).
     - Step Badge at top: Off-center #1E45FB circle with #CDF22B inner circle showing "1" in Laroka.
     - Card Title in Laroka (#0D0F12, 28px): "1. Scan with your phone"
     - Short helper line (#0D0F12, 16px): "Open your phone camera and point it here:"
     - Centered Crisp White QR Box (`bg-white rounded-[28px] p-6 shadow-md my-4`) with a clean QR code and the #1E45FB droplet logo in the center.
     - Single-Line Room Code Pill below QR (`bg-white rounded-full px-6 py-3 flex items-center gap-3`):
       - Label: "Or type code:"
       - Code in bold Laroka (#0D0F12, 24px, ALL ON ONE SINGLE LINE, never wrapping): `G H O S T 8`
       - Small circular #1E45FB Copy SVG icon button.

   - RIGHT CARD (7 Columns) - "STEP 2: SEND FILES OR TEXT" (`bg-[#1E45FB] rounded-[36px] p-10 flex flex-col justify-between relative overflow-hidden text-white`):
     - Subtle #CDF22B squiggly loop line along the top-right decorative edge (never crossing behind text).
     - Top Row: Step Badge showing "2" + simple pill badge: "Waiting for your phone...".
     - Card Title in Laroka (#FFFFFF, 32px, with plenty of margin below so it never overlaps): "2. Pick what to send"
     - Big Drag-and-Drop Box (`rounded-[28px] border-2 border-dashed border-[#CDF22B] bg-white/10 p-10 text-center my-4`):
       - Clean Upload Cloud SVG icon inside a #CDF22B circle.
       - Big Acid Lime (#CDF22B) pill button with #0D0F12 text: "Choose Photos or Files" with a nested #1E45FB circle Plus SVG icon.
       - Short 5-word hint below button (#E8ECFF): "Or drag files right here"
     - Simple Paste Box at Bottom of Card (`bg-white rounded-full p-2 pl-6 flex items-center justify-between`):
       - Input placeholder (#5A6270): "Type or paste a link or note..."
       - Button: Acid Lime (#CDF22B) pill button "Send" with a nested #1E45FB circle ArrowRight SVG icon.
```

---

### Prompt 2: Connected Workspace - Phone and Computer Linked (`connected_multi_device_live_workspace`)

```markdown
Design an ultra-clean, uncluttered "Connected Workspace" Desktop screen (1440px x 900px) for "GhostDrop" after a phone and computer are connected.

CRITICAL SIMPLICITY & ANTI-CLUTTER RULES:
1. GRANDMA-FRIENDLY SIMPLICITY: Zero technical numbers, zero chunk counters, zero speed graphs, zero developer terms. Never write "16KB chunks", "Backpressure", "FILE_ACK", "URL.revokeObjectURL", "TTL", or "WebRTC".
2. ZERO EMOJIS & ZERO EM DASHES: Use only crisp vector SVG icons inside circular badges.
3. GENEROUS WHITESPACE: Keep plenty of open Warm Stone (#F7F6F2) canvas around the cards. Maximum 3 items in the received list so nothing feels crowded.

EXACT SCREEN LAYOUT:

1. Top Connected Bar (`max-w-[1120px] mx-auto mt-6 bg-white rounded-full px-8 py-4 shadow-sm flex items-center justify-between`):
   - Left: GhostDrop #1E45FB logo + "GhostDrop" in Laroka.
   - Center Connection Bridge:
     - Pill 1: Laptop SVG icon + "This Computer"
     - Between them: A smooth horizontal #1E45FB and #CDF22B **Self-Drawing Squiggly Loop Line** connecting the two pills, with a simple green badge in the middle: "Connected!"
     - Pill 2: Smartphone SVG icon + "My Phone"
   - Right: Simple button "Disconnect" (Unplug SVG icon).

2. Main 2-Column Workspace (`max-w-[1120px] mx-auto mt-8 grid grid-cols-12 gap-8`):

   - LEFT COLUMN (5 Columns) - "SEND SOMETHING NEW" (`bg-[#1E45FB] text-white rounded-[36px] p-8 flex flex-col justify-between`):
     - Title in Laroka (28px): "Send to My Phone"
     - Big clickable Drop Box (`rounded-[28px] border-2 border-dashed border-[#CDF22B] bg-white/10 p-8 text-center my-4`):
       - Circular #CDF22B icon badge with ImagePlus SVG icon.
       - Big Acid Lime (#CDF22B) pill button: "Send Photos or Files" with nested #1E45FB circle Plus SVG.
     - Simple Text Input Pill (`bg-white rounded-full p-2 pl-5 flex items-center justify-between`):
       - Placeholder: "Paste a link or note..."
       - Acid Lime (#CDF22B) button: "Send" (ArrowRight SVG).
     - Bottom Simple Timer Row:
       - Clock SVG icon + "Items disappear after 50 mins" (with a simple "Change" link).

   - RIGHT COLUMN (7 Columns) - "SHARED ITEMS (3)" (`space-y-4`):
     - Section Header Row: Laroka Title "Shared Items" + simple ghost button "Clear All" (Trash2 SVG icon).

     - CARD 1 - PHOTO READY TO SAVE (`bg-[#CDF22B] rounded-[28px] p-5 flex items-center justify-between`):
       - Left: Clean rounded photo thumbnail (`64x64px`) + Title in Laroka (#0D0F12): "Receipt_Photo.jpg" + simple subline: "From My Phone · Disappears in 49 mins".
       - Right: One big #1E45FB Electric Cobalt pill button "Save Photo" with a nested #CDF22B circle Download SVG icon.

     - CARD 2 - TEXT LINK READY TO COPY (`bg-white rounded-[28px] p-5 shadow-sm flex items-center justify-between`):
       - Left: Link SVG icon in a #EBEAE4 circle + Title in Plus Jakarta Sans bold: "https://airline-check-in.com/boarding" + subline: "From My Phone · Disappears in 48 mins".
       - Right: One big #CDF22B Acid Lime pill button "Copy Link" with a nested #1E45FB circle Copy SVG icon.

     - CARD 3 - FILE CURRENTLY SENDING (`bg-[#EBEAE4] rounded-[28px] p-5`):
       - Top row: "Holiday_Video.mp4" + "Sending... 70%" in bold.
       - Progress Bar: A clean, thick horizontal **Squiggly Wave Line** in #1E45FB that is 70% drawn across a white pill track!
```

---

### Prompt 3: Mobile Phone Screen - Big Thumb Buttons and Sleek Bottom Navbar (`ghostdrop_mobile_pwa_teleport_hub`)

```markdown
Design an ultra-simple, uncluttered Mobile Web & App screen (390px x 844px) for "GhostDrop" when opened on a phone.

CRITICAL SIMPLICITY & ANTI-CLUTTER RULES:
1. GRANDMA-FRIENDLY MOBILE UI: Only 3 big sections on the screen. No overlapping squiggly lines behind dark text! Keep squiggly lines subtle and tucked at the bottom edges of cards.
2. BANNED WORDS: Never write "PWA", "TTL", "16KB", "P2P", "FILE_ACK", "WebRTC", or "Clipboard". Use plain words: "Send Photo", "Paste Text", "Save", "Copy".
3. ZERO EMOJIS & ZERO EM DASHES: Use only clean vector SVG icons inside circular badges.

EXACT MOBILE LAYOUT (TOP TO BOTTOM):

1. Minimal Top Header (`px-5 pt-4 pb-2 flex items-center justify-between`):
   - Left: #1E45FB GhostDrop droplet logo + "GhostDrop" in Laroka (22px).
   - Right: Green pill badge (`bg-[#CDF22B] text-[#0D0F12] px-4 py-1.5 rounded-full font-bold text-sm`): Green dot + "Connected to Computer".

2. Big Primary Action Card - SEND PHOTOS OR FILES (`mx-5 mt-3 bg-[#1E45FB] text-white rounded-[32px] p-6 text-center relative overflow-hidden`):
   - Subtle #CDF22B squiggly loop at bottom edge.
   - Big #CDF22B circle badge in center with `ImagePlus` SVG icon.
   - Laroka Title (26px, white): "Send Photos or Files"
   - Full-width Acid Lime (#CDF22B) pill button (`py-4 mt-4`): "Pick from Phone" with nested #1E45FB circle Plus SVG icon.
   - Simple toggle row below button: CheckCircle2 SVG + "Delete from phone after sending".

3. Simple Paste & Send Bar (`mx-5 mt-4 bg-white rounded-full p-2 pl-5 shadow-sm flex items-center justify-between border border-[#DDDCD4]`):
   - Text placeholder: "Paste or type a note..."
   - Button: #1E45FB Cobalt pill button "Send" with nested #CDF22B ArrowUp SVG icon.

4. Received from Computer (Only 2 Clean Cards, `mx-5 mt-6 space-y-3`):
   - Small section label: "FROM YOUR COMPUTER"
   - Card A (`bg-white rounded-[24px] p-4 shadow-sm flex items-center justify-between`):
     - Left: Text note `"Wi-Fi Password: SunnyDay2026"` + `"45 mins left"`.
     - Right: `#CDF22B` Lime pill button `"Copy"` with `#1E45FB` Copy SVG circle.
   - Card B (`bg-white rounded-[24px] p-4 shadow-sm flex items-center justify-between`):
     - Left: File icon + `"Ticket.pdf"` + `"49 mins left"`.
     - Right: `#1E45FB` Cobalt pill button `"Save"` with `#CDF22B` Download SVG circle.

5. Sleek Floating Bottom Navbar (`fixed bottom-5 inset-x-5 rounded-full bg-[#0D0F12] p-2 shadow-xl flex items-center justify-between`):
   - 3 large, clear thumb tabs (SVG icon + 1 word):
     - Tab 1 (Active): `bg-[#CDF22B] text-[#0D0F12] rounded-full px-6 py-3 font-bold` with `Send` SVG icon + `"Send"`
     - Tab 2: `text-white px-5 py-3` with `ScanLine` SVG icon + `"Scan QR"`
     - Tab 3: `text-white px-5 py-3` with `Clock` SVG icon + `"50 Mins"`
```

---

### Prompt 4: Simple QR Scanner & 6-Letter Code Screen (`ghostdrop_responsive_home_screen` or Scanner Modal)

```markdown
Design a super-clear, grandma-friendly "Connect Your Screen" Modal / View (centered card on Warm Stone #F7F6F2 background) for GhostDrop.

CRITICAL SIMPLICITY RULES:
1. Only TWO ways to connect: Point camera at QR code, OR type the 6 big letters.
2. Zero technical words, zero emojis, zero em dashes.
3. All 6 code boxes (`G H O S T 8`) must sit cleanly on ONE single horizontal row with large `Laroka` letters.

EXACT LAYOUT:
1. Centered Modal Card (`max-w-[480px] bg-white rounded-[36px] p-8 shadow-xl border-2 border-[#0D0F12]`):
   - Top Header: Laroka Title (28px, #0D0F12): "Connect to your other screen" + circular Close (`X` SVG) button.
   - Camera Box (`aspect-square rounded-[28px] bg-[#0D0F12] relative overflow-hidden my-5 flex flex-col items-center justify-center`):
     - Acid Lime (#CDF22B) rounded corner brackets framing the camera view.
     - Short pill badge at bottom of camera view: "Point camera at the QR code".
   - Clean Divider: "OR TYPE THE 6-LETTER CODE"
   - 6 Big Letter Boxes in a single horizontal row (`grid grid-cols-6 gap-2 my-4`):
     - `[G] [H] [O] [S] [T] [8]` in big 28px Laroka font inside `#F7F6F2` rounded boxes.
   - Full-Width Primary Button:
     - Electric Cobalt (#1E45FB) pill button (`py-4`) with white text "Connect Now" and a nested Acid Lime (#CDF22B) circle ArrowRight SVG icon.
```

---

### Prompt 5: Simple 1-2-3 "How It Works" & Playful Alerts Screen (`how_it_works_install_pwa`)

```markdown
Design a warm, joyful, grandma-friendly "How GhostDrop Works" screen (1440px Desktop) for GhostDrop.

CRITICAL SIMPLICITY & ANTI-CLUTTER RULES:
1. STRICT BAN ON CODE OR TECHNICAL DIAGRAMS: Do NOT show JSON packets, wire protocols, WebRTC diagrams, or chunk sizes!
2. Explain the whole product in **3 giant visual steps** connected by one continuous **Self-Drawing Squiggly Loop Line** (from attached Woove - Branding line.jpg).
3. Below the 3 steps, show **3 friendly message cards** (Success, Disappeared, and Wrong Code) to showcase the joyful brand tone.
4. Zero emojis and zero em dashes anywhere.

EXACT LAYOUT:

1. Minimal Top Pill Bar:
   - GhostDrop #1E45FB droplet logo + "GhostDrop" in Laroka + "Back to App" pill button on the right.

2. Big Friendly Header (Centered):
   - Laroka H1 (48px, #0D0F12): "How it works in 3 easy steps."
   - Short subtitle (18px, #5A6270): "No accounts, no passwords, and nothing saved in the cloud."

3. The 3 Giant Visual Step Cards (`grid grid-cols-3 gap-8 max-w-[1120px] mx-auto my-10 relative`, linked by a continuous #1E45FB Squiggly Loop Line):
   - STEP 1 CARD (`bg-[#CDF22B] rounded-[32px] p-8`):
     - Big #1E45FB circle badge with "1" in Laroka.
     - Laroka Title (26px): "Scan the code"
     - Simple sentence (12 words max): "Point your phone camera at the screen to link them together."
   - STEP 2 CARD (`bg-[#1E45FB] text-white rounded-[32px] p-8`):
     - Big #CDF22B circle badge with "2" in Laroka.
     - Laroka Title (26px): "Send photos or notes"
     - Simple sentence (12 words max): "Pick any photo, file, or text and it pops up on your other screen."
   - STEP 3 CARD (`bg-[#EBEAE4] rounded-[32px] p-8`):
     - Big #124B38 circle badge with "3" in Laroka.
     - Laroka Title (26px): "Cleans up by itself"
     - Simple sentence (12 words max): "After 50 minutes, everything disappears automatically so your screens stay tidy."

4. Playful Friendly Alerts Preview Row (`grid grid-cols-3 gap-6 max-w-[1120px] mx-auto`):
   - Alert 1 - Success (`bg-[#CDF22B] rounded-[24px] p-5 flex items-center gap-4`):
     - #1E45FB circle with Check SVG + Laroka title: "All sent!" + short text: "Your photo is ready on your computer."
   - Alert 2 - Auto-Cleaned (`bg-white rounded-[24px] p-5 flex items-center gap-4 border border-[#DDDCD4]`):
     - #124B38 circle with Sparkles SVG + Laroka title: "Poof! All gone." + short text: "50 minutes passed, so we cleaned this up."
   - Alert 3 - Friendly Mistake (`bg-[#FFE5E7] rounded-[24px] p-5 flex items-center gap-4`):
     - #FF5A65 circle with RotateCw SVG + Laroka title: "Hmm, check that code" + short text: "We could not find that 6-letter code. Try typing it again!"
```
