# 08-qa-checklist.md: GhostDrop 6-Gate QA Acceptance Checklist

> **Mandatory Verification Standard for `ghostdrop-qa`.**
> All 6 gates must pass before any build phase is marked complete.

---

## Gate 1: Brand Tokens, `Laroka` Font, Navigation Split and Squiggly Line Fidelity
- [ ] Only tokens from `docs/tokens/tokens.css` and `docs/tokens/tokens.json` are used (`#CDF22B` Acid Lime, `#1E45FB` Electric Cobalt Blue, `#EBEAE4`/`#F7F6F2` Warm Stone, `#124B38` Deep Forest, `#0D0F12` Jet Ink).
- [ ] `Laroka` (`docs/laroka.otf`) renders properly on all H1/H2/H3 headings, 6-character room codes, and toast titles.
- [ ] **Responsive Navigation Split Verified:** Desktop (`>= 768px`) renders the floating top pill navbar / FAB; Mobile (`< 768px`) renders the sleek floating bottom navbar in the thumb zone + minimal top status bar.
- [ ] Signature Squiggly Loop Line appears on hero backgrounds, feature/pairing cards (e.g., `#1E45FB` squiggle on `#CDF22B` card and vice versa), and the P2P connection bridge.
- [ ] **Self-Drawing Animation Verified:** Every squiggly line animates strictly via SVG `pathLength="1"` and `stroke-dashoffset: 1 -> 0` (drawing itself into place). Zero fly-in, slide-in, or bounce-in animations on squiggly lines.
- [ ] Nested Circle-Icon Pill buttons match the `#CDF22B +` and `#1E45FB +` pill design in `docs/Brand colours.jpg`.

## Gate 2: Playful Copy Compliance and Strict Zero Em-Dash / Zero Emoji Check
- [ ] **Zero Em-Dashes Anywhere:** Grep confirms zero occurrences of the em-dash character in source code, UI copy, or templates.
- [ ] **Zero Emojis Anywhere:** Grep confirms zero Unicode emojis in source code or UI copy; all icons are crisp SVG icons (`lucide-react` or custom inline SVGs).
- [ ] All success messages, error states, warnings, and empty states use the joyful, witty copy from `docs/02-brand-persona-and-copy.md` and `docs/design.md`.
- [ ] Zero raw technical errors (`Error 500`, `PeerJS Error`, `DOMException`) or browser `alert()` dialogs are shown to users.

## Gate 3: Shared Wire Protocol and 16KB Chunk Streaming
- [ ] Wire packets strictly match `docs/06-protocol-and-tech-spec.md` (`HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`, `ITEM_NUKE`).
- [ ] Files are sliced into `16,384-byte` (`16KB`) `ArrayBuffer` chunks.
- [ ] `RTCDataChannel` backpressure (`bufferedAmountLowThreshold = 65536`) pauses and resumes chunk streaming cleanly without dropping packets on large (`25MB+`) files.
- [ ] Receiver reassembles chunks into a downloadable `Blob` with the exact byte size and MIME type, and emits `FILE_ACK`.

## Gate 4: Ephemeral TTL Self-Destruct and Zero Memory Leaks
- [ ] TTL presets (`15m`, `50m`, `24h`, `Burn on Copy/Download`) count down live every second.
- [ ] When an item expires or is burned, `URL.revokeObjectURL(blobUrl)` is called and chunk references are cleared from memory.
- [ ] Closing/reloading the tab triggers `beforeunload`/`pagehide` cleanup and notifies connected peers.

## Gate 5: PWA, Web Share Target and QR Scanner
- [ ] PWA `manifest.webmanifest` includes valid icons (`192x192`, `512x512`) and `share_target` (`POST /share-target`).
- [ ] In-App QR Scanner (`jsQR`) opens camera cleanly and gracefully shows the playful `"No camera? No problem!"` 6-letter code input fallback from `docs/02-brand-persona-and-copy.md` when camera permission is denied.

## Gate 6: Accessibility, Responsive Viewports and Build Health
- [ ] Layouts verified at `360px`, `768px`, `1024px`, and `1440px` with zero horizontal scroll overflow.
- [ ] `prefers-reduced-motion: reduce` disables continuous movement and renders squiggly lines at `stroke-dashoffset: 0` immediately.
- [ ] `tsc --noEmit`, ESLint, and `npm run build` pass with zero errors.
