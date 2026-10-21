# 07-build-order.md: GhostDrop Sequential Agent Build Order

> **Orchestrator Gate Rule:** Do not advance to Step `N+1` until Step `N` has been verified against its acceptance criteria and signed off.

---

## Step-by-Step Build Sequence (9 Gates)

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
