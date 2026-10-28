# 00-README.md: GhostDrop Handoff Pack and Agent Read Order

**Mandatory Read Order for All Agents:**
1. `AGENTS.md` and `.agent/BRAND.md` and `.agent/rules/GEMINI.md`
2. `docs/00-README.md` (this file)
3. `docs/00-prd-source-of-truth.md` (Product Requirements and Shared Wire Protocol)
4. `docs/design.md` and `docs/tokens/tokens.css` (Locked Branding, Colors, `Laroka` Font, Self-Drawing Squiggly Line, Navigation Split, Zero Emojis/Em-Dashes)
5. `docs/01-wireframe-and-pages.md` (Screens, Views, Modals and Responsive Layouts)
6. `docs/02-brand-persona-and-copy.md` (Playful/Joyful Voice, Error and Success Copy Deck)
7. `docs/05-motion-spec.md` (Self-Drawing SVG Squiggle Line and Reduced-Motion Rules)
8. `docs/06-protocol-and-tech-spec.md` (WebRTC 16KB Chunking, PeerJS Multi-Peer Room, PWA Share Target)
9. `docs/07-build-order.md` and `docs/08-qa-checklist.md` (Sequential Gates and QA Verification)
10. `docs/09-large-file-throughput-and-media-transfer-spec.md` (Large File WebRTC Throughput Optimization Spec)

---

## 1. Project Summary

**GhostDrop** is a zero-cost (`$0.00/mo`), 100% stateless, ephemeral P2P device bridge and screenshot/file teleportation web app and installable Progressive Web App (PWA).
- **Phase 1 Focus (Current Scope):** Standalone Web App and Installable PWA on Vercel (`Vite + React + TypeScript + Tailwind CSS`) that connects any laptop, phone, tablet, or desktop browser via QR code, deep link (`/join?room=XXXXXX`), or 6-character room code.
- **Phase 2 Deferred:** We are **NOT** building the native Android APK right now, but our WebRTC DataChannel wire protocol (`TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`) is 100% compatible with it from day one.

---

## 2. Locked Architectural and Brand Decisions

| Area | Locked Choice |
| :--- | :--- |
| **Framework** | Vite + React 19 + TypeScript + Tailwind CSS + `vite-plugin-pwa` + `lucide-react` (SVG icons) |
| **Signaling Layer** | Public PeerJS (`0.peerjs.com`) with room prefix `ghostdrop-room-XXXXXX` behind a clean `SignalingAdapter` interface (ready for Supabase Realtime Broadcast swap/fallback) |
| **Room Topology** | Multi-peer room (1 Host device + multiple connected Guest devices, or any device can host/join) |
| **PWA Enhancements** | Installable PWA + **Web Share Target API** (`/share-target`) + **Built-in In-App QR Scanner** + **Local In-Memory TTL Auto-Expire** (`15m`, `50m`, `24h`, `Burn on Copy`) |
| **Responsive Navigation** | **Desktop (`>= 768px`):** Floating top pill navbar / FAB · **Mobile (`< 768px`):** Sleek floating bottom navbar / dock in the thumb zone |
| **Typography & Icon Guardrail** | **Zero em-dashes and zero emojis anywhere.** Use standard hyphens/colons/periods, and use crisp **SVG icons** (`lucide-react` or custom SVGs) instead of emojis |
| **Brand Palette** | Acid Lime `#CDF22B` + Electric Cobalt Blue `#1E45FB` + Warm Stone `#EBEAE4`/`#F7F6F2` + Deep Forest `#124B38` + Jet Ink `#0D0F12` (`docs/Brand colours.jpg` and `docs/Woove - Branding line.jpg`) |
| **Typography** | `Laroka` (`docs/laroka.otf`) for Display/Headings/Room Codes + `Plus Jakarta Sans` for UI/Body + `JetBrains Mono` for Telemetry/Timers |
| **Signature Visual** | **Squiggly Loop Line** (`docs/Woove - Branding line.jpg` and Swatch 3 of `docs/Brand colours.jpg`) inside card backgrounds, hero sections, and P2P connection bridges |
| **Signature Animation** | **Self-Drawing SVG Path (`stroke-dashoffset: 1 -> 0`)** - looks like the line is being drawn into place in real time. **NEVER** fly-in or fly-out! |
| **Brand Vibe** | **Playful, Joyful, Witty** - both success messages and error messages use warm, celebratory, human copy |

---

## 3. Folder Map

```text
GhostDrop/
├── .agent/ / .agents/             # Antigravity Kit + GhostDrop trained agents
│   ├── agents/GhostDrop/          # orchestrator.md, web.md, web-admin.md, ui-polish.md, qa.md, backend.md
│   ├── rules/GEMINI.md            # Always-on global agent rules
│   └── BRAND.md                   # Canonical brand and architecture summary
├── design/                        # Root folder for importing Stage-generated UI designs
├── docs/                          # Single Source of Truth (ALL agents must read before acting)
│   ├── Brand colours.jpg          # Locked Color 1 (#CDF22B), Color 2 (#1E45FB) and Swatch 3 squiggle card
│   ├── Logo icon.jpg              # Locked Electric Cobalt liquid-droplet logo
│   ├── Woove - Branding line.jpg  # Locked signature looping squiggly line
│   ├── laroka.otf                 # Locked Laroka display font file
│   ├── design.md                  # Full UI, Color, Typography and Self-Drawing Squiggle Design System
│   ├── stage-design-prompts.md    # Detailed copy-and-paste prompts + attachment list for Stage
│   ├── 00-README.md
│   ├── 00-prd-source-of-truth.md
│   ├── 01-wireframe-and-pages.md
│   ├── 02-brand-persona-and-copy.md
│   ├── 04-design-system.md
│   ├── 05-motion-spec.md
│   ├── 06-protocol-and-tech-spec.md
│   ├── 07-build-order.md
│   ├── 08-qa-checklist.md
│   ├── 09-large-file-throughput-and-media-transfer-spec.md
│   ├── design/                    # Mirror design export folder inside docs/
│   ├── tasks/                     # Agent task briefs and QA reports
│   └── tokens/                    # tokens.json and tokens.css
├── plans/                         # Phase plans
├── AGENTS.md                      # Master Agent Index
├── decisions.md                   # Locked Architecture and Brand Decisions
└── opencode.jsonc                 # OpenCode V2 Agent Routing Configuration
```
