# Step 03: QA P2P Wire Protocol and 16KB Streamer Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-20

## Assigned Agent
`@ghostdrop-qa`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `docs/08-qa-checklist.md` (Gate 3 Shared Wire Protocol and 16KB Chunk Streaming)
- `docs/06-protocol-and-tech-spec.md` (Wire Protocol Contract and Backpressure)

## Objective
Verify the shared P2P wire protocol definitions, PeerJS signaling integration, 16KB chunk slicing, and backpressure handling.

## QA Checklists
- [x] Confirm `web/src/types/protocol.ts` strictly matches the packet contract: `HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`, `ITEM_NUKE`.
- [x] Verify chunk size constant is exactly `16384` bytes (`16KB`).
- [x] Verify backpressure logic implements `bufferedAmountLowThreshold = 65536` and pauses transfer above `262144`.
- [x] Confirm deterministic PeerJS room IDs map to `ghostdrop-room-${CODE}` and use unambiguous 6-letter character set (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- [x] Verify `FILE_ACK` is sent by receiver upon complete Blob reconstruction.
- [x] Verify `npm run type-check` in `web/` completes with zero type errors.

## Outcome
GATE PASS after Repair Round 1 (late FILE_END idempotency, relay backpressure, frame budget, HELLO presence). Report: `qa-report.md`. Carried follow-ups R-2 (settle rejected FILE_START before Step 04 toasts) and R-3 (guest presence of third peers) are tracked for Step 04 and Step 05.
