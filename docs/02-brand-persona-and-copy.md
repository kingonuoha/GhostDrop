# 02-brand-persona-and-copy.md: GhostDrop Brand Persona and Grandma-Friendly Copy Deck

> **Single Source of Truth for Voice, Tone, Headlines, Microcopy, Playful Successes, and Joyful Errors.**
> **STRICT GUARDRAILS:**
> 1. **Grandma 2-Second Rule:** Every screen and button must be understood in under 2 seconds by a non-technical user.
> 2. **Zero Technical Jargon in UI:** Never display `WebRTC`, `P2P`, `16KB chunks`, `FILE_ACK`, `URL.revokeObjectURL`, `TTL`, `PWA`, or `Backpressure` anywhere on screen.
> 3. **Zero Em-Dashes and Zero Emojis:** Every expressive accent uses crisp SVG icons (`lucide-react` or custom brand SVGs).

---

## 1. Brand Persona: "Playful, Warm, and Grandma-Simple"

- **Who We Are:** GhostDrop is the simplest way to send a photo, file, or note between your phone and computer. Scan the code, pick what to send, and it cleans itself up after 50 minutes.
- **Voice Traits:**
  1. **Everyday Human Words:** Say *"Disappears in 50 mins"* instead of *"50m TTL"*. Say *"Send Photos or Files"* instead of *"Stream 16KB Chunks"*.
  2. **Short and Scannable:** Titles are 3 to 5 words max. Helper text is 1 short line (under 10 words).
  3. **Warm and Reassuring:** Even when a connection drops or a code has a typo, GhostDrop stays cheerful and tells you the 1 button to press next.
  4. **Zero Emojis, Zero Em-Dashes:** Expressive energy comes from `Laroka` typography, self-drawing squiggly lines, and crisp SVG icons inside `#CDF22B` and `#1E45FB` circular badges.

---

## 2. Canonical Short Headlines and Button Copy

### Home and Pairing Screen (`/`)
- **Top Bar Timer Pill (`Clock` SVG icon):** `Auto-delete: 50 mins`
- **Top Bar Action Button (`Plus` SVG icon):** `Enter a Code`
- **Page H1 (`Laroka`):** `Send photos and text between your screens.`
- **Left Card Title (`Laroka`):** `Scan with your phone` (a phone reads `Scan with your other screen`)
- **Left Card Helper:** `Open your phone camera and point it here:` (a phone reads `Open the camera or GhostDrop on your PC or other phone:`)
- **Room Code Label:** `Or type code:`
- **Right Card Title (`Laroka`):** `Pick what to send`
- **Card Step Numbers:** The `<OrbBadge>` circle carries `1` on the pairing card and `2` on the send card. Card titles never repeat the number as `1.` or `2.` text.
- **Primary File Button (`Plus` SVG icon):** `Choose Photos or Files`
- **Dropzone Helper:** `Or drag files right here`
- **Text Box Placeholder:** `Type or paste a link or note...`
- **Send Button (`ArrowRight` SVG icon):** `Send`
- **Timer Presets (Plain English):**
  - `Delete after 1st copy`
  - `15 mins`
  - `50 mins`
  - `When I close this page`

---

## 3. Playful Success Messages (Joyful Acid Lime `#CDF22B` Cards/Toasts + SVG Icons)

| Key | SVG Icon (`lucide-react`) | Headline (`Laroka`) | Short Body Copy (`Plus Jakarta Sans`) | Button |
| :--- | :--- | :--- | :--- | :--- |
| `SUCCESS_PEER_JOINED` | `Zap` | `Connected!` | `Your screens are linked. Pick a photo or note to send!` | `Got It` |
| `SUCCESS_TEXT_SENT` | `Send` | `Sent!` | `Your note just popped up on your other screen.` | `Done` |
| `SUCCESS_TEXT_RECEIVED` | `ClipboardCheck` | `New note arrived!` | `Tap copy below to use it.` | `Copy` |
| `SUCCESS_COPIED` | `CheckCircle2` | `Copied!` | `Ready to paste wherever you need it.` | `Copied` |
| `SUCCESS_COPIED_IMAGE` | `ClipboardCheck` | `Copied the picture!` | `Paste it into any app you like.` | `Copied` |
| `SUCCESS_SAVED` | `SaveCheck` | `Saved!` | `{fileName} is on this device now.` | `Got It` |
| `SUCCESS_SHARED` | `Share2` | `Off it goes!` | `Handed straight to your share sheet.` | `Done` |
| `SUCCESS_FILE_SENT` | `Check` | `All sent!` | `{fileName} is ready on your other screen.` | `Save` |
| `SUCCESS_DROP_AND_NUKE` | `Sparkles` | `Sent and cleaned up!` | `{fileName} is safe on your computer and removed here.` | `Done` |
| `SUCCESS_PWA_INSTALLED` | `Download` | `Added to your phone!` | `Next time, open GhostDrop right from your home screen.` | `Great!` |

---

## 4. Playful Error and Warning Messages (Joyful Reassurance + SVG Icons)

| Key | SVG Icon (`lucide-react`) | Headline (`Laroka`) | Short Body Copy (`Plus Jakarta Sans`) | Recovery Button |
| :--- | :--- | :--- | :--- | :--- |
| `ERR_ROOM_NOT_FOUND` | `Ghost` | `Hmm, check that code` | `We could not find #{roomCode}. Check the 6 letters and try again!` | `Try Again` |
| `ERR_PEER_DISCONNECTED` | `Unplug` | `Screen disconnected` | `Your other screen closed the page. Tap below to reconnect!` | `Reconnect` |
| `ERR_CAMERA_DENIED` | `CameraOff` | `No camera? No problem!` | `Just type the 6-letter code shown on your other screen below.` | `Type Code` |
| `ERR_CHUNK_INTERRUPTED` | `RefreshCw` | `Almost there! Tap to retry` | `The connection blinked while sending. Tap below to finish!` | `Send Again` |
| `ERR_COPY_BLOCKED` | `RefreshCw` | `Almost there! Tap to retry` | `Your browser held on to the code. Tap copy once more!` | `Try Again` |
| `ERR_CLIPBOARD_BLOCKED` | `ClipboardX` | `Almost there! Tap to retry` | `Your browser blocked that copy. Tap once more!` | `Try Again` |
| `WARN_TTL_EXPIRING_SOON` | `Clock` | `Disappearing in 1 minute` | `Save {itemName} now if you still want to keep it!` | `Save Now` |
| `INFO_TTL_EXPIRED` | `Sparkles` | `Poof! All gone.` | `50 minutes passed, so we cleaned up {itemName} for you.` | `Okay` |
| `EMPTY_FEED_STATE` | `FolderPlus` | `Nothing sent yet` | `Pick a photo, file, or note to send it across!` | `Choose File` |

Copy scope note: `ERR_COPY_BLOCKED` belongs to the room code only. `ERR_CLIPBOARD_BLOCKED` covers a blocked note or picture copy on a feed card, so the words always name the thing the user actually tapped.
