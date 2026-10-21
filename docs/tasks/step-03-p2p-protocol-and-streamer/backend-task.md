# Step 03: P2P Wire Protocol and 16KB Streamer Task
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNL - updated - 2026-10-20 · ASUS-LAPTOP-DNLA241D - updated - 2026-10-20

## Assigned Agent
`@ghostdrop-backend`

## Workspace Target
`web/`

## Mandatory Pre-Read References
- `AGENTS.md` and `.agent/BRAND.md`
- `docs/00-prd-source-of-truth.md` (Section 4 Wire Protocol Contract)
- `docs/06-protocol-and-tech-spec.md` (Section 2 Signaling & Section 3 16KB Backpressure Engine)
- `decisions.md` (D-002 Signaling Layer & D-003 Multi-Peer Topology)

## Objective
Implement GhostDrop shared P2P wire protocol types, signaling engine (`0.peerjs.com`) with `P2PSignalingAdapter` interface, and 16KB chunk file streamer with `bufferedAmountLowThreshold` backpressure and `FILE_ACK`.

## Checklists
- [x] Define shared protocol types in `web/src/types/protocol.ts` strictly matching `docs/06-protocol-and-tech-spec.md` (`HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`, `ITEM_NUKE`).
- [x] Implement `P2PSignalingAdapter` abstract interface in `web/src/lib/p2p/adapter.ts`.
- [x] Implement `PeerJsEngine` in `web/src/lib/p2p/peerjsEngine.ts` supporting Host mode (`ghostdrop-room-${CODE}`) and Peer mode (`ghostdrop-peer-${UUID}`) on `0.peerjs.com` with multi-peer relay.
- [x] Implement unambiguous 6-character room code generator in `web/src/lib/p2p/roomCode.ts` using charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- [x] Implement `FileStreamer` in `web/src/lib/p2p/fileStreamer.ts` slicing files into exact 16,384-byte chunks with backpressure handling (`bufferedAmountLowThreshold = 65536` and pause when `bufferedAmount > 262144`).
- [x] Implement chunk receiver and reassembler in `web/src/lib/p2p/chunkReceiver.ts` creating downloadable Blob and transmitting `FILE_ACK`.
- [x] Enforce zero emojis and zero em dashes in code and log outputs.
- [x] Verify TypeScript types with `npm run type-check` inside `web/`.

## Implementation Contract (Orchestrator, binding)
- `FILE_CHUNK` framing follows `decisions.md` D-011: JSON header then exactly one binary `ArrayBuffer` frame of at most `16,384` bytes, serialized per file id.
- Use `peerjs` `serialization: 'binary'`. Host relays JSON packets and binary frames to every other connected peer without re-chunking.
- Public API surface: `protocol.ts` (constants, packet union, guards), `adapter.ts` (`P2PSignalingAdapter`, event map), `peerjsEngine.ts` (`PeerJsEngine`), `roomCode.ts`, `fileStreamer.ts`, `chunkReceiver.ts`.
- No React imports inside `src/lib/p2p/` or `src/types/`. No UI copy strings. No `any`. No `@ts-ignore`. No `console.log` of payload contents.
- Backpressure: set `bufferedAmountLowThreshold = 65536`, pause when `bufferedAmount > 262144`, resume on `bufferedamountlow`, and support an abort signal that rejects cleanly. Always release readers and timers.
- Receiver emits `FILE_ACK` (`OK` or `ERROR`) after reconstructing an exact-size Blob with the declared MIME type, and on validation failure.
- Types must compile under `strict` with `noUncheckedIndexedAccess` if already enabled.

---

## Completion Notes

**Status:** Complete. All eight checklist items passed.

**Files created (no files outside `web/src/` and this task file were touched):**
- `web/src/types/protocol.ts`
- `web/src/lib/p2p/adapter.ts`
- `web/src/lib/p2p/errors.ts`
- `web/src/lib/p2p/roomCode.ts`
- `web/src/lib/p2p/peerjsEngine.ts`
- `web/src/lib/p2p/fileStreamer.ts`
- `web/src/lib/p2p/chunkReceiver.ts`
- `web/src/lib/p2p/index.ts`

**API summary:**
- `protocol.ts`: `CHUNK_SIZE_BYTES` (16384), `BUFFERED_LOW_THRESHOLD` (65536), `MAX_BUFFERED_AMOUNT` (262144), `ROOM_CODE_LENGTH`, `ROOM_CODE_ALPHABET`, `ROOM_PREFIX`, `PEER_PREFIX`, `MAX_CONCURRENT_TRANSFERS` (8), `MAX_TOTAL_TRANSFER_BYTES` (268435456). `WirePacket` union (`HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`, `ITEM_NUKE`) with one exported interface per packet. `TtlPreset`, `TTL_PRESET_MS`, `ttlPresetToMs`, `isTtlPreset`, `DeviceType`, `NukeReason`, `AckStatus`, `TransferProgress`, `EphemeralItem`. Guards: `isWirePacket`, `parseWirePacket`, `serializeWirePacket`, `toBinaryFrame`, `isDeviceType`.
- `adapter.ts`: `P2PSignalingAdapter` (`role`, `roomCode`, `localPeerId`, `status`, `peers`, `isConnected`, `connect`, `disconnect`, `send`, `sendBinary`, `broadcast`, `getTransport`, `reportTransferProgress`, `on`, `off`), `P2PTransport` (per-peer channel contract with `sendText`, `sendBinary`, `sendFrame` for atomic D-011 header plus binary pairing, `onBufferedAmountLow`), event map types for `peer:join`, `peer:leave`, `packet`, `binary`, `status`, `error`, `transfer:progress`.
- `errors.ts`: `P2PError` with `P2PErrorCode` union, `isP2PError`, `toP2PError`, `createAbortError`.
- `roomCode.ts`: `generateRoomCode` (crypto rejection sampling), `normalizeRoomCode`, `isValidRoomCode`, `roomPeerId`, `peerPeerId`.
- `peerjsEngine.ts`: `PeerJsEngine implements P2PSignalingAdapter`, `buildIceServers` (three default STUN servers plus optional `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`), `isHostId`, `isGuestId`. Host registers `ghostdrop-room-CODE`, guest registers `ghostdrop-peer-uuid8` and dials the host with `serialization: 'binary'`, reliable channel and device metadata. Host relays every validated packet and binary frame to all other peers, never back to the sender. Outbound text frames queue while a channel is not open (capped at 128), binary frames reject with `NO_OPEN_CHANNEL`, FIFO chain preserves header plus binary adjacency, and signaling disconnects retry with cancellable exponential backoff (1s to 15s, 5 attempts).
- `fileStreamer.ts`: `streamFile` (slice plus `arrayBuffer` per 16KB chunk, `FILE_START`, header plus binary per chunk, `FILE_END`, progress with bytes, chunks and throughput) and `waitForBufferDrain` (sets threshold 64KB, resolves when `bufferedAmount <= 262144`, waits on `bufferedamountlow` with a 15s safety timeout, rejects on abort with `ABORTED` or `BACKPRESSURE_TIMEOUT`).
- `chunkReceiver.ts`: `ChunkReceiver` with `handlePacket`, `handleBinary`, `dispose(id)`, `disposeAll()`, `activeCount`, `bufferedBytes`. Validates index order, header byte length, total bytes and `FILE_START` chunk math, rebuilds an exact-size `Blob` with the declared MIME type, emits `ReceivedFileItem`, and sends `FILE_ACK` OK or ERROR. Caps concurrent transfers at 8 and buffered bytes at 256 MB.

**Verification commands (run in `web/`):**
- `npm run type-check` - PASS (no output beyond the script banner).
- `npm run lint` - PASS (no findings).
- `npm run build` - PASS (`tsc -b` plus `vite build`, 1948 modules, PWA precache 8 entries). Existing Vite warning about `./laroka.otf` resolution is pre-existing and unrelated to this task.
- Runtime smoke harness (temporary, compiled with `tsc` to CommonJS and executed in Node 22, then deleted) - 31 checks PASS: room code generation and validation, packet guard and round trip, 16KB chunk framing, header and binary pairing, byte-identical Blob reassembly with MIME and name, `FILE_ACK` OK and ERROR paths, out-of-order rejection, concurrency cap, backpressure wait and resume, and typed `NO_OPEN_CHANNEL` failure.

**Notes and boundaries:**
- No `any`, no `@ts-ignore`, no emoji, no em dash, no `alert`, no React imports inside `src/lib/p2p/` or `src/types/`, no payload logging. No `package.json` changes were needed.
- `FILE_CHUNK` follows D-011: JSON header then exactly one binary frame, serialized per transfer id. `P2PTransport.sendFrame` keeps the pair adjacent on the channel.
- `ChunkReceiver` emits `ReceivedFileItem` (Blob plus transfer metadata); the reusable `EphemeralItem` type lives in `protocol.ts` for the Step 05 TTL janitor and feed layer.
- `transfer:progress` is published through `PeerJsEngine.reportTransferProgress` so Step 04 and Step 05 can forward streamer and receiver progress without importing transport code.
- PeerJS `serialization: 'binary'` wraps frames in BinaryPack and splits them at its internal 16300-byte MTU before reassembly. The application-level frame budget stays exactly 16384 bytes, and the receiver validates the reassembled payload length, so wire compatibility with the future Android client is unaffected.

---

## QA Repair Round 1

**Source:** `docs/tasks/step-03-p2p-protocol-and-streamer/qa-report.md` (verdict: GATE FAIL, three P1 findings plus one P2).
**Scope:** `web/src/lib/p2p/chunkReceiver.ts`, `web/src/lib/p2p/peerjsEngine.ts`, and doc-only wording in `web/src/lib/p2p/adapter.ts`. No public signature removed, no new dependency, no React, no UI copy, no `any`, no em dash, no emoji.

### P1-1: idempotent transfer completion (`chunkReceiver.ts`)
- `chunkReceiver.ts:24` adds `MAX_SETTLED_TRANSFER_IDS = 64`, and `chunkReceiver.ts:73` adds the bounded `settledTransferIds` set.
- `chunkReceiver.ts:245-255` `finishTransfer` now looks up the settled set before reporting: a `FILE_END` for a known settled transfer returns silently, so a late `FILE_END` after the last chunk auto-finish is a no-op.
- `chunkReceiver.ts:296` and `chunkReceiver.ts:321` record the id on success and on failure, so a failed transfer does not emit a second `UNKNOWN_TRANSFER` when its `FILE_END` arrives.
- `chunkReceiver.ts:327-336` `markSettled` refreshes recency and evicts oldest-first, so memory stays constant.
- Zero-byte files complete at `FILE_START` (`chunkReceiver.ts:207-209`), then the trailing `FILE_END` is silent. No success path emits `onError`.
- Still reported as errors: an unknown id that was never started, late chunk headers, and every validation failure inside `finishTransfer`.

### P1-2: relay backpressure and atomic pairs (`peerjsEngine.ts`)
- `peerjsEngine.ts:51` imports `waitForBufferDrain` from `fileStreamer.ts`, so relay reuses the exact gate used by `streamFile` (64KB low threshold, pause above 262144, `bufferedamountlow` resume, 15s timeout).
- `peerjsEngine.ts:672` holds each inbound `FILE_CHUNK` header per source peer instead of forwarding it immediately.
- `peerjsEngine.ts:687-707` `handleBinary` consumes the held header and relays the pair per target, refusing a headerless binary instead of fanning it out blindly.
- `peerjsEngine.ts:716-734` `enqueueRelayPair` chains relay work per target, so only one drain gate runs per channel and frame order is preserved.
- `peerjsEngine.ts:736-743` `writeRelayPair` awaits `waitForBufferDrain(transport)` and then `transport.sendFrame(headerText, data)`, so there is never a pause between a `FILE_CHUNK` header and its binary frame and PeerJS never accumulates an unbounded relay buffer.
- `peerjsEngine.ts:781-782` and `peerjsEngine.ts:812-813` clear both relay maps on peer drop and on teardown.

### P1-3: frame budget at the transport boundary (`peerjsEngine.ts`)
- `peerjsEngine.ts:115-123` adds `frameBudgetError`, which rejects an empty buffer and any buffer above `CHUNK_SIZE_BYTES` with `PROTOCOL_ERROR`.
- `peerjsEngine.ts:186-202` `DataChannelTransport.sendBinary` and `sendFrame` now reject before queuing, so the adapter surface enforces D-011 item 2 instead of trusting the caller.
- `peerjsEngine.ts:418-420` `PeerJsEngine.sendBinary` rejects the same two cases, so a broadcast cannot smuggle an oversized frame through.
- `fileStreamer.ts:191-196` keeps its own pre-checks, so internal `FILE_CHUNK` usage stays compliant and fails earlier with a clear message.
- `adapter.ts:92-99` and `adapter.ts:120-123` document the rejection contract. No signature change.

### P2-4: relayed `HELLO_PEER` (`peerjsEngine.ts`)
- `peerjsEngine.ts:653-660` accepts a `HELLO_PEER` only when `packet.peerId === fromPeerId`, which is the direct connection case. A relayed HELLO is dropped before presence tracking, so the host id can no longer be relabelled with a guest name.
- `peerjsEngine.ts:664-667` never relays a `HELLO_PEER` from the host, because every guest already announces itself directly on `afterConnectionOpen`. This removes the duplicate presence source and any relay loop risk.

### Repair verification (run in `web/`)
- `npm run type-check` - PASS, zero diagnostics (`tsc --noEmit` on both app and node configs).
- `npm run lint` - PASS, `eslint .` no findings.
- `npm run build` - PASS, `tsc -b` plus `vite build`, 1948 modules, `dist/` plus PWA `generateSW` 8 precache entries. Only the pre-existing `laroka.otf` warning remains.
- Temporary Node harness (compiled with the local `tsc`, executed, then deleted; not committed):
  - Receiver, 13 checks PASS: one-chunk success with late `FILE_END` yields one item, one `OK` ack and zero errors; zero-byte file yields one item, one `OK` ack and zero errors even with a repeated `FILE_END`; unknown id still reports `UNKNOWN_TRANSFER`; a short transfer reports exactly one error and one `ERROR` ack; two sequential multi-chunk transfers stay clean.
  - Engine with injected fake Peer and fake data channels, 21 checks PASS: engine and transport reject 16385 bytes and empty frames with `PROTOCOL_ERROR` and accept exactly 16384; relayed HELLO is ignored, does not relabel the host and is not forwarded; a direct HELLO still updates presence; a relayed chunk arrives as an adjacent header plus binary pair with `bufferedAmountLowThreshold` set to 65536; with `bufferedAmount = 262145` the relay pauses, subscribes to `bufferedamountlow`, then resumes on drain; a headerless binary is refused and reported.

**Known deferrals unchanged:** P2-1 inbound frame cap, P2-2 idle transfer eviction and `peer:leave` wiring, P2-3 ACK dedupe, P2-5 close-time header queue, P2-6 string caps, P2-7 guest id retry. Live two-tab 25MB transfer remains the Step 04 runtime check.

