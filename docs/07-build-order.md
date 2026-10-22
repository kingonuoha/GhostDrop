# 07-build-order.md: GhostDrop Sequential Agent Build Order

> **Orchestrator Gate Rule:** Do not advance to Step `N+1` until Step `N` has been verified against its acceptance criteria and signed off.

---

## Step-by-Step Build Sequence (13 Gates)

1. **Step 1: Stage UI Design Import and Audit (`ghostdrop-orchestrator`)**
   - Verify Stage/Stitch design exports are placed in `design/` or `docs/design/`.
   - Audit screen designs against `docs/design.md` and `docs/01-wireframe-and-pages.md`.
2. **Step 2: Vite + React + TypeScript + Tailwind + Tokens Scaffold (`ghostdrop-web`)**
   - Initialize Vite React-TS app, install `lucide-react`, load `docs/laroka.otf` (`Laroka` font), and wire `docs/tokens/tokens.css` and `docs/tokens/tokens.json`.
   - Build reusable `<SquiggleLine />` and `<SquiggleCardBg />` SVG components with `pathLength="1"` self-drawing animation (`stroke-dashoffset: 1 -> 0`), Nested Circle-Icon Pill buttons, Desktop Floating Top Pill Bar / FAB, and Mobile Sleek Floating Bottom Navbar.
3. **Step 3: P2P Wire Protocol, 16KB File Streamer and Signaling Adapter (`ghostdrop-backend`)**
   - Implement `src/types/protocol.ts`, `src/lib/p2p/adapter.ts`, `src/lib/p2p/peerjsEngine.ts` (`0.peerjs.com` multi-peer host/client rooms), and `src/lib/p2p/fileStreamer.ts` (`16,384-byte` chunks with `bufferedAmountLowThreshold` backpressure + `FILE_ACK`).
4. **Step 4: Ephemeral Memory Store and TTL Self-Destruct Janitor (`ghostdrop-backend` + `ghostdrop-web`)**
   - Implement `useGhostRoom.ts` and `useTtlJanitor.ts` with live countdown timers (`15m`, `50m`, `24h`, `Burn on Copy`), automatic `URL.revokeObjectURL` cleanup, and `beforeunload` memory scrub.
5. **Step 5: Desktop/Tablet Host View and Connected Workspace UI (`ghostdrop-web`)**
   - Build Screen 1 (Pairing Hub with `#CDF22B` QR card + `#1E45FB` Dropzone + Desktop Top Pill Bar) and Screen 2 (Connected Multi-Peer Workspace with `<SquiggleConnectionBridge />`, global `Ctrl+V` paste listener, drag-and-drop file streamer, and Live Transfer Feed).
6. **Step 6: Mobile Web Join View, Sleek Bottom Navbar and Built-in In-App QR Scanner (`ghostdrop-web`)**
   - Build Screen 3 (`/join?room=XXXXXX` thumb-zone mobile deck + Sleek Floating Bottom Navbar) and Screen 4 (`QrScannerModal` using `jsQR` + 6-character `Laroka` code input + playful camera-shy fallback).
7. **Step 7: Installable PWA and Web Share Target API (`ghostdrop-web` + `ghostdrop-backend`)**
   - Configure `vite-plugin-pwa`, `manifest.webmanifest` (`share_target`), and `src/sw.ts` (`POST /share-target` handoff) so mobile users can share screenshots directly from their OS share menu into GhostDrop.
8. **Step 8: Playful Microcopy, Zero Emojis / Zero Em-Dashes, Self-Drawing Squiggle and Reduced-Motion Polish (`ghostdrop-ui-polish`)**
   - Audit every success toast, error state, empty state, SVG icon, and TTL poof animation against `docs/design.md`, `docs/02-brand-persona-and-copy.md`, and `docs/05-motion-spec.md`.
9. **Step 9: Comprehensive 6-Gate QA Audit (`ghostdrop-qa`)**
   - Execute all checks in `docs/08-qa-checklist.md` and write `docs/tasks/<slug>/qa-report.md`.
10. **Step 10: v0.7 Offline, Hotspot, Camera, TTL and UX Fixes (`ghostdrop-backend` -> `ghostdrop-web` -> `ghostdrop-ui-polish` -> `ghostdrop-qa`)**
   - Same-port `/peerjs` signaling, `/__ghostdrop/lan-info`, offline ICE, `burnOnRead` protocol, dynamic device identity, QR camera fallback, `BURN_ON_COPY` sync, clipboard and share actions. Signed off PASS.
11. **Step 11: Improvements (`docs/tasks/step-11-improvements/`)**
   - DEFERRED. Not executed. Runs after Step 13.
12. **Step 12: v0.8 Coming Soon Wall and Teaser Animation (`ghostdrop-ui-polish` -> `ghostdrop-web` -> `ghostdrop-qa`)**
   - Gate every route behind a public teaser rendered above `GhostRoomProvider` so no signaling or room state is consumed while locked.
   - Hidden unlock gestures only: `Ctrl+Alt+C` on desktop and tapping the GhostDrop logo 3 times fast on any device, persisted in `localStorage`.
   - Live countdown to 23 October 2026 17:00 local with a live state at zero and no auto-launch.
   - Full-bleed brand colour slabs drifting up, right, down, and left on 18s to 30s loops, `translate3d` only, with a mandatory reduced-motion override and a Warm Stone legibility scrim. Recorded as D-015. Signed off PASS.
13. **Step 13: v0.11 Total Offline and Hotspot Direct WebRTC Bridge (`ghostdrop-backend` -> `ghostdrop-ui-polish` -> `ghostdrop-web` -> `ghostdrop-qa`)**
   - Build `compactSdp.ts`, `iceUnmask.ts`, and `offlineDirectEngine.ts` (`P2PSignalingAdapter` over native `RTCPeerConnection` + `RTCDataChannel` + `BroadcastChannel` shortcut) so two cached PWAs on the same Wi-Fi or phone hotspot connect with zero internet and zero server via a 2-step QR or copyable Offline Code (`GD1...` / `#gd=...`) handshake.
   - Fix `navigator.onLine` false positives on offline Wi-Fi/hotspots with fast `2,500ms` signaling failover and unmask RFC1918 hotspot IPv4 `host` candidates when mobile data is ON or OFF. Recorded as D-016.
   - Version `0.10` to `0.11` (zero new dependencies).
