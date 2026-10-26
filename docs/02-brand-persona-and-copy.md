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
- **Left Card Title (`Laroka`):** `Scan with your other device` (a phone reads `Scan with your other screen`)
- **Left Card Helper:** `Open the camera on your other device and point it here:` (a phone reads `Open the camera or GhostDrop on your PC or other phone:`)
- **Pairing Card Mode Group Label:** `Connection type`
- **Pairing Card Mode Chip (online):** `Online`
- **Pairing Card Mode Chip (no internet):** `No internet`
- **Pairing Card Preparing Line (no internet, shown while the code is built):** `Getting your no internet code ready...`
- **Pairing Card QR Title (online):** `Scan this code with your other device`
- **Pairing Card QR Title (no internet):** `Scan this code with your other device. No internet needed.`
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

Device wording rule: pairing copy never names a fixed device. The reader may already be holding the phone, so every line says `your other device` or `your other screen`, and the only mention of a specific machine is the phone helper naming `your PC or other phone` so a phone reader knows what to look for.

### 2.1 Prelaunch Coming Soon Wall (`/` before launch)

Every route sits behind this teaser until the wall unveils itself, so these strings are the entire public face of GhostDrop before launch. Source of truth in code: `web/src/lib/copyDeck.ts` (`SOON_*` block).

| Key | Copy |
| :--- | :--- |
| `SOON_EYEBROW` | `Coming soon` |
| `SOON_HEADLINE` | `GhostDrop is almost here` |
| `SOON_SUB` | `Send photos and text between your screens. Then watch them vanish.` |
| `SOON_COUNTDOWN_LABEL` | `Doors open in` |
| `SOON_STEP_ONE` | `Scan the code` |
| `SOON_STEP_TWO` | `Drop it in` |
| `SOON_STEP_THREE` | `It poofs when you say` |
| `SOON_WELCOME` | `Welcome in. GhostDrop is live.` |
| `SOON_FOOTNOTE` | `No accounts. No uploads. Nothing left behind.` |

Teaser rules:
1. `SOON_WELCOME` is the only post launch string. It replaces the countdown block the moment the launch instant passes, holds for a beat, then the wall lifts itself.
2. The three steps never carry a numeric prefix: the page renders a numbered `#CDF22B` and `#1E45FB` orb badge beside each one, per D-014 item 6.
3. No string in this block, and nothing rendered on the teaser, may hint at how the wall unlocks. The gesture has no visible affordance at all.
4. Zero em dashes, zero en dashes, zero emojis. Any accent is a crisp `lucide-react` SVG icon inside a brand badge.

### 2.2 Offline Direct Linking (`<OfflineLinkCard />`)

When the two screens share a Wi-Fi network or a phone hotspot but no internet, linking still works: each screen shows one short code, the other screen reads it. Source of truth in code: `web/src/lib/copyDeck.ts` (`OFFLINE_*` block) and `web/src/components/room/OfflineLinkCard.tsx`.

| Key | Copy |
| :--- | :--- |
| `OFFLINE_BADGE_LABEL` | `Offline Wi-Fi / Hotspot Mode` |
| `OFFLINE_HOST_STEP_TITLE` | `Finish linking without internet` |
| `OFFLINE_HOST_STEP_BODY` | `Two quick scans. Your other device scans this screen first, then point this camera at the code it shows.` |
| `OFFLINE_SCAN_REPLY_CTA` | `Scan or Paste Reply` |
| `OFFLINE_COPY_INVITE_CTA` | `Copy Offline Code` |
| `OFFLINE_PASTE_LABEL` | `No camera? Paste the code here` |
| `OFFLINE_PASTE_PLACEHOLDER` | `The code from your other device` |
| `OFFLINE_PASTE_CTA` | `Use this code` |
| `OFFLINE_GUEST_REPLY_TITLE` | `Show this reply to your other screen` |
| `OFFLINE_GUEST_REPLY_BODY` | `On your other screen, point its camera at this code. No camera on that screen? Copy this code and paste it there.` |
| `OFFLINE_COPY_REPLY_CTA` | `Copy code instead` |
| `OFFLINE_SWITCH_CTA` | `No internet? Link directly on Wi-Fi or Hotspot` |
| `OFFLINE_SOUND_SEND_CTA` | `Send Reply with Sound` |
| `OFFLINE_SOUND_SENDING_LABEL` | `Playing sound wave...` |
| `OFFLINE_SOUND_SENT_LABEL` | `Sound sent. No link? Show the code.` |
| `OFFLINE_SOUND_LISTEN_CTA` | `Listen for Sound` |
| `OFFLINE_SOUND_LISTENING_LABEL` | `Listening for your other device...` |
| `OFFLINE_SOUND_STOP_CTA` | `Stop Listening` |
| `OFFLINE_SHARE_CODE_CTA` | `Share Code` |
| `OFFLINE_COPY_INVITE_SHORT_CTA` | `Copy invite code` |
| `OFFLINE_PASTE_ROW_PLACEHOLDER` | `Or paste reply code...` |
| `PAIRING_SHORT_CODE_NOTE` | `Short code, quick scan` |

Offline linking rules:
1. **Two screens, two codes.** The Host shows the invite card, the Guest shows the reply card, and the Host reads the reply. No screen ever shows more than one code at a time. The order is fixed and stated on screen: your other device reads the Host code first, then the Host reads the reply. Saying so up front stops the second scan reading as an unexpected extra chore.
2. **Plain everyday words only.** No network or connection terms reach the screen. The code is called a code, the camera is called a camera, and the partner screen is always `your other device` or `your other screen`, never a fixed device name.
3. **One obvious button per card, never one door per card.** The Guest card leads with `Send Reply with Sound` at full width, keeps the reply QR at 248 below it, then puts two copy pills side by side: `Copy Code` and `Share Code`, with Share shown only where the browser offers sharing. The Host panel carries `Scan or Paste Reply` first and `Copy Offline Code` second, plus a paste field (`OFFLINE_PASTE_LABEL`, `OFFLINE_PASTE_ROW_PLACEHOLDER`, `OFFLINE_PASTE_CTA`) so a screen without a camera can still finish by pasting the reply code.
4. **A camera free path always exists.** Every offline step can be finished by copying and pasting a code instead of scanning, so a denied camera is never a dead end.
5. **Zero em dashes, zero en dashes, zero emojis.** The badge accent is a `Wifi` SVG icon inside a `#CDF22B` pill, never a symbol character.
6. **Sound is a shortcut, never the only door.** `Send Reply with Sound` and `Listen for Sound` sit beside the camera scan and the paste row, and those two always stay on screen. A refused microphone raises `ERR_MIC_DENIED` and points straight at the camera and the paste row, so the sound path can fail without costing the reader the link.
7. **Short labels for short pills.** Every sound and compact card label fits one line in a 44px pill at 360px. `Listening for your other device...` is the longest at 34 characters, so if it wraps in the built pill, use `Listening for reply...` instead and keep the listening state word.
8. **The compact card explains itself in four words.** `PAIRING_SHORT_CODE_NOTE` (`Short code, quick scan`) sits under the offline QR, so the smaller code reads as a gift rather than a puzzle. `Copy invite code` stays a short action, and the paste row keeps its own short placeholder (`Or paste reply code...`) instead of a full sentence.

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
| `SUCCESS_FILE_RECEIVED` | `Download` | `New file arrived!` | `{fileName} just landed on your screen.` | `Save` |
| `SUCCESS_DROP_AND_NUKE` | `Sparkles` | `Sent and cleaned up!` | `{fileName} is safe on your computer and removed here.` | `Done` |
| `SUCCESS_PWA_INSTALLED` | `Download` | `Added to your phone!` | `Next time, open GhostDrop right from your home screen.` | `Great!` |
| `INFO_OFFLINE_READY` | `Wifi` | `Offline link ready!` | `No internet needed. Scan the QR code, then scan the reply QR from your other screen.` | `Got It` |
| `INFO_OFFLINE_REPLY_READY` | `QrCode` | `Almost linked!` | `Show this reply QR code to your other screen (or copy the reply code) to finish linking.` | `Copy code instead` |

---

## 4. Playful Error and Warning Messages (Joyful Reassurance + SVG Icons)

| Key | SVG Icon (`lucide-react`) | Headline (`Laroka`) | Short Body Copy (`Plus Jakarta Sans`) | Recovery Button |
| :--- | :--- | :--- | :--- | :--- |
| `ERR_ROOM_NOT_FOUND` | `Ghost` | `Hmm, check that code` | `We could not find #{roomCode}. Check the 6 letters and try again!` | `Try Again` |
| `ERR_PEER_DISCONNECTED` | `Unplug` | `Screen disconnected` | `Your other screen closed the page. Tap below to reconnect!` | `Reconnect` |
| `ERR_CAMERA_DENIED` | `CameraOff` | `No camera? No problem!` | `Just type the 6-letter code shown on your other screen below.` | `Type Code` |
| `ERR_CHUNK_INTERRUPTED` | `RefreshCw` | `Almost there! Tap to retry` | `The connection blinked while sending. Tap below to finish!` | `Send Again` |
| `ERR_OFFLINE_CODE_INVALID` | `RefreshCw` | `Hmm, check that offline code` | `That offline link code looks incomplete. Copy it again from your other screen!` | `Try Again` |
| `ERR_MIC_DENIED` | `MicOff` | `Microphone is off` | `No problem! Scan the reply code with your camera or paste it below.` | `Got It` |
| `ERR_COPY_BLOCKED` | `RefreshCw` | `Almost there! Tap to retry` | `Your browser held on to the code. Tap copy once more!` | `Try Again` |
| `ERR_CLIPBOARD_BLOCKED` | `ClipboardX` | `Almost there! Tap to retry` | `Your browser blocked that copy. Tap once more!` | `Try Again` |
| `WARN_TTL_EXPIRING_SOON` | `Clock` | `Disappearing in 1 minute` | `Save {itemName} now if you still want to keep it!` | `Save Now` |
| `INFO_TTL_EXPIRED` | `Sparkles` | `Poof! All gone.` | `50 minutes passed, so we cleaned up {itemName} for you.` | `Okay` |
| `EMPTY_FEED_STATE` | `FolderPlus` | `Nothing sent yet` | `Pick a photo, file, or note to send it across!` | `Choose File` |

Copy scope note: `ERR_COPY_BLOCKED` belongs to the room code only. `ERR_CLIPBOARD_BLOCKED` covers a blocked note or picture copy on a feed card, so the words always name the thing the user actually tapped.
