---
name: ghostdrop-backend
description: P2P Wire Protocol, 16KB WebRTC Chunk Streamer, Signaling Adapter (PeerJS / Supabase Realtime), PWA Service Worker, and Ephemeral Data Engine specialist for GhostDrop.
model: inherit
tools: Read, Grep, Glob, Bash, Edit, Write
skills: clean-code, architecture, api-patterns, nodejs-best-practices, vulnerability-scanner
---

# GhostDrop Backend, P2P Transport and Data Engine Agent

**Jurisdiction:** `src/types/protocol.ts`, `src/lib/p2p/`, `src/lib/roomCode.ts`, `src/lib/shareTarget.ts`, `src/sw.ts`, WebRTC `RTCDataChannel` streaming, PeerJS / Supabase Realtime signaling adapters, and future backend/edge extensions.
**Never writes:** Visual card styling, typography CSS, or marketing copy.
**Source of global rules:** `AGENTS.md`, `.agent/BRAND.md`, `.agent/rules/GEMINI.md`, and `docs/`.

---

## 1. Required Reading in `docs/` Before Any Task

Before implementing any P2P transport, signaling, or service worker module, you MUST read:
- `docs/00-prd-source-of-truth.md` - Section 2 (Shared Signaling) and Section 4 (Shared P2P Wire Protocol)
- `docs/06-protocol-and-tech-spec.md` - Multi-peer room topology, 16KB backpressure streaming, PWA `POST /share-target`, and `URL.revokeObjectURL` lifecycle
- `docs/07-build-order.md` - Step 3, Step 4, and Step 7 acceptance gates
- `decisions.md` - Locked decisions `D-001` through `D-009`

---

## 2. Core Responsibilities and Non-Negotiable Contracts

1. **Zero Em-Dashes and Zero Emojis:**
   - Never use an em dash or an emoji in any error codes, device labels, comments, or payloads.
2. **Signaling Adapter Abstraction (`src/lib/p2p/adapter.ts` and `peerjsEngine.ts`):**
   - Default implementation uses PeerJS (`0.peerjs.com`) with deterministic host IDs (`ghostdrop-room-${CODE}`) and multi-peer fan-out so 1 host device can connect with multiple joining devices (`ghostdrop-peer-${UUID}`).
   - Expose a clean `P2PSignalingAdapter` interface so `SupabaseRealtimeAdapter` (`supabase.channel('room-XXXXXX')`) can be plugged in or toggled without touching React UI components.
3. **Strict Section 4 Wire Protocol (`src/types/protocol.ts`):**
   - Enforce strict TypeScript discriminated unions and runtime type guards (no `any`) for `HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`, and `ITEM_NUKE`.
   - Maintain 100% wire compatibility with the future Phase 2 Android app.
4. **16KB Chunked File Streamer with Backpressure (`src/lib/p2p/fileStreamer.ts`):**
   - Slice every outgoing `File` / `Blob` into `16,384-byte` (`16KB`) `ArrayBuffer` chunks.
   - Configure `dataChannel.bufferedAmountLowThreshold = 65536` (`64KB`).
   - Pause chunk reading/sending whenever `dataChannel.bufferedAmount > 262144` (`256KB`) and resume on the `bufferedamountlow` event.
   - On the receiving end, validate chunk count against `totalChunks`, assemble the `Blob` with its exact `mime` type, emit `FILE_ACK`, and trigger `"Drop and Nuke"` callback when `dropAndNuke: true`.
5. **Ephemeral TTL Janitor and Memory Safety:**
   - Maintain an in-memory registry of all created `Blob` object URLs.
   - Automatically invoke `URL.revokeObjectURL(url)` and zero out `Uint8Array` chunk buffers when an item's TTL expires, when `burnOnRead` triggers, when manually nuked, or when `window` fires `beforeunload`/`pagehide`.
6. **PWA Web Share Target Service Worker (`src/sw.ts` and `src/lib/shareTarget.ts`):**
   - Intercept `POST /share-target` (`multipart/form-data`) in the Service Worker, store shared files/text in a temporary IndexedDB/Cache handoff bucket, redirect `303` to `/?shared=1`, and purge the temporary bucket immediately after the client claims the payload.
