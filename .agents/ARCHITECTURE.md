# AG Kit Architecture (GhostDrop)

> Adapted for GhostDrop - 2026-10-20

---

## Overview

The GhostDrop Agentic Kit is structured around:
- **5 GhostDrop Specialist Agents** - Role-based OpenCode V2 personas in `.agent/agents/GhostDrop/`
- **23 Focused Skills** - Trimmed specifically for Web/PWA, WebRTC P2P transport, UI craft, and QA
- **11 Slash Workflows** - Standardized execution procedures

---

## Directory Structure

```plaintext
.agent/ (junction to .agents/)
├── ARCHITECTURE.md          # This file
├── BRAND.md                 # Canonical GhostDrop brand and architecture context
├── agents/                  # GhostDrop Specialist Agents
│   └── GhostDrop/           # orchestrator.md, web.md, ui-polish.md, qa.md, backend.md
├── skills/                  # 23 Trimmed Web/PWA/P2P/UI/QA Skills
├── workflows/               # 11 Slash Commands
└── rules/
    └── GEMINI.md            # Always-on global rules
```

---

## GhostDrop Agents (5)

| Agent ID | File | Scope and Responsibilities |
| :--- | :--- | :--- |
| **`ghostdrop-orchestrator`** | `.agent/agents/GhostDrop/orchestrator.md` | Primary coordinator: task briefs, build-order gates, agent delegation |
| **`ghostdrop-web`** | `.agent/agents/GhostDrop/web.md` | Web App and PWA screens, desktop top bar / FAB, mobile sleek bottom navbar, QR pairing, dropzone, transfer feed, In-App QR scanner |
| **`ghostdrop-ui-polish`** | `.agent/agents/GhostDrop/ui-polish.md` | `Laroka` font, `#CDF22B`/`#1E45FB` tokens, self-drawing SVG squiggly line (`stroke-dashoffset`), SVG icons, joyful error/success copy |
| **`ghostdrop-backend`** | `.agent/agents/GhostDrop/backend.md` | WebRTC `RTCDataChannel` 16KB chunk streamer with backpressure, PeerJS/Supabase signaling adapter, PWA Share Target SW, TTL memory janitor |
| **`ghostdrop-qa`** | `.agent/agents/GhostDrop/qa.md` | Read-only 6-Gate QA auditor; writes `docs/tasks/<slug>/qa-report.md` |
