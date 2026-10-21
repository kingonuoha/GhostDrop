# Step 03: QA P2P Protocol and Streamer Re-Audit Report
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-20 · ASUS-LAPTOP-DNLA241D - re-audit - 2026-10-20

> Status: authoritative report for Step 03 after the P1 repair round. It supersedes the prior GATE FAIL verdict and keeps that round as a short history in section 4.

## 1. Scope and Method

**Trigger:** `docs/tasks/step-03-p2p-protocol-and-streamer/backend-task.md` section QA Repair Round 1, which claims fixes for the three P1 findings plus P2-4.

**Contract sources:** `docs/06-protocol-and-tech-spec.md` sections 2 and 3, `docs/08-qa-checklist.md` Gate 3, `decisions.md` D-002, D-003, D-011.

**Files audited read-only:** `web/src/types/protocol.ts` and all of `web/src/lib/p2p/` (adapter, errors, roomCode, peerjsEngine, fileStreamer, chunkReceiver, index).

**Method:** full re-read of every file above, grep hygiene sweeps, an independent compiled runtime harness for `ChunkReceiver` executed in `%TEMP%/opencode/qa-step03/out` outside the repository (no repository file written outside this report), and the three build commands inside `web/`. No live two-tab WebRTC session was run, so byte identity on a 25MB transfer is still judged structurally (section 5).

**Harness:** `tsc --ignoreConfig` emitted `chunkReceiver.ts`, `errors.ts` and `protocol.ts` as CommonJS into the temp directory, then a Node 22 script exercised 6 receiver scenarios plus bounded-set checks. All checks passed.

## 2. Repair Verification

### B1: late FILE_END, zero-byte double error, bounded settled set
- [x] Fixed.
- `chunkReceiver.ts:24` `MAX_SETTLED_TRANSFER_IDS = 64` and `chunkReceiver.ts:73` `settledTransferIds`.
- `chunkReceiver.ts:245-255` `finishTransfer` returns silently when the id is settled, and only reports `UNKNOWN_TRANSFER` for an id never seen.
- Success path settles at `chunkReceiver.ts:295-296`; failure path settles at `chunkReceiver.ts:318-324`, so a failed transfer does not re-report on its trailing `FILE_END`.
- `chunkReceiver.ts:327-336` `markSettled` re-inserts for recency and evicts oldest-first while size exceeds 64, so memory is constant.
- Zero-byte files finish at `FILE_START` (`chunkReceiver.ts:207-209`), settling the id before the trailing `FILE_END` arrives.
- Runtime evidence:
  - one chunk then late `FILE_END`: 1 item, 1 `OK` ACK, 0 errors
  - zero-byte then two `FILE_END`: 1 item, 1 `OK` ACK, 0 errors
  - 80 sequential transfers: 80 items, 0 errors
  - replay `FILE_END` for the newest of 80 ids: silent. Replay for the oldest: `UNKNOWN_TRANSFER`, proving eviction is active and the set is capped
  - unknown id never started: exactly 1 `UNKNOWN_TRANSFER`
  - short transfer: exactly 1 error and 1 `ERROR` ACK

### B2: relay drain before each pair, no pause inside a pair, bounded buffering
- [x] Fixed for the PeerJS buffer and for pair adjacency.
- `peerjsEngine.ts:51` imports `waitForBufferDrain`, the same gate `streamFile` uses.
- `peerjsEngine.ts:669-674` holds one `FILE_CHUNK` header per source peer instead of forwarding it loose.
- `peerjsEngine.ts:687-707` `handleBinary` consumes that header and enqueues one pair per target. A headerless binary is refused with `PROTOCOL_ERROR` instead of being fanned out.
- `peerjsEngine.ts:716-734` per-target `relayChains` keep one drain gate and one pair in flight per channel, and preserve frame order.
- `peerjsEngine.ts:736-743` `writeRelayPair` awaits `waitForBufferDrain(transport)` then `transport.sendFrame(headerText, data)`.
- Drain gate itself, `fileStreamer.ts:72-123`: threshold 65536 at line 79, pause above 262144 at line 87, resume on `bufferedamountlow` at lines 111-117, 15s timeout at lines 118-120, full cleanup at lines 96-101.
- No pause inside a pair: `DataChannelTransport.write` sends the header and the binary inside one FIFO chain entry (`peerjsEngine.ts:243-256`), and `sendFrame` validates the budget before queueing (`peerjsEngine.ts:195-202`). A concurrent `sendText` is scheduled before or after the pair, never between the two frames.
- Bounded buffering: at most one in-flight pair per target beyond the drain window, so PeerJS no longer accumulates a whole file. Residual queue-depth behaviour is R-1 in section 4.
- Cleanup: `peerjsEngine.ts:780-782` clears both relay maps on peer drop; `peerjsEngine.ts:810-814` clears them on teardown.

### B3: transport rejects empty and larger-than-16384 binary frames
- [x] Fixed on both surfaces.
- `peerjsEngine.ts:115-123` `frameBudgetError` returns `P2PError` with code `PROTOCOL_ERROR` when `byteLength === 0` or `byteLength > CHUNK_SIZE_BYTES`.
- Adapter surface: `peerjsEngine.ts:186-193` `sendBinary` and `peerjsEngine.ts:195-202` `sendFrame` reject before queueing, so nothing over budget enters the FIFO chain.
- Engine surface: `peerjsEngine.ts:418-420` `PeerJsEngine.sendBinary` rejects before target resolution, so a broadcast cannot smuggle an oversized frame.
- `fileStreamer.ts:191-196` keeps its caller-side pre-check, so the streamer fails earlier with a specific message.
- Contract documented at `adapter.ts:92-99` and `adapter.ts:119-123`. No public signature changed.

### B4: relayed HELLO_PEER must not alter presence or relay further
- [x] Fixed.
- `peerjsEngine.ts:653-660` drops any `HELLO_PEER` whose `peerId` is not the direct connection peer, before `updatePeerInfo` and before the `packet` event, so presence cannot be relabelled.
- `peerjsEngine.ts:664-667` never relays a `HELLO_PEER` from the host, removing the duplicate presence source and any relay loop risk.
- Side effect recorded as R-3 in section 4: third guests stay invisible in a guest peer list until Step 04 adds a host-authored presence packet.

## 3. Gate 3 Re-Check

### 3.1 Packet union (PASS)
Union at `protocol.ts:80-87` composes seven interfaces that match the spec field for field.

| Packet | Declared at | Fields |
| :--- | :--- | :--- |
| `HELLO_PEER` | `protocol.ts:24-29` | `type`, `peerId`, `deviceName`, `deviceType` |
| `TEXT` | `protocol.ts:31-38` | `type`, `id`, `text`, `timestamp`, `ttlMs`, `burnOnRead?` |
| `FILE_START` | `protocol.ts:40-49` | `type`, `id`, `name`, `size`, `mime`, `totalChunks`, `ttlMs`, `dropAndNuke?` |
| `FILE_CHUNK` | `protocol.ts:56-61` | `type`, `id`, `index`, `byteLength` (D-011 JSON header) |
| `FILE_END` | `protocol.ts:63-66` | `type`, `id` |
| `FILE_ACK` | `protocol.ts:68-72` | `type`, `id`, `status` OK or ERROR |
| `ITEM_NUKE` | `protocol.ts:74-78` | `type`, `id`, `reason` |

Optional fields are exactly `TextPacket.burnOnRead` and `FileStartPacket.dropAndNuke`. The `FILE_CHUNK` guard at `protocol.ts:221-228` rejects `byteLength` of 0 or above `CHUNK_SIZE_BYTES`. Inbound text passes `parseWirePacket` at `peerjsEngine.ts:634-643`; outbound packets are re-validated at `peerjsEngine.ts:399-403`.

### 3.2 Chunk budget (PASS)
`CHUNK_SIZE_BYTES = 16384` at `protocol.ts:6`. Grep for 16384, 16300, 16385, 65536, 262144 and 262145 across `web/src` returns only the three constants at `protocol.ts:6-8` plus two comments at `peerjsEngine.ts:112` and `peerjsEngine.ts:130`, so no duplicated literal exists. Slicing at `fileStreamer.ts:187-188` advances by the actual `byteLength` at `fileStreamer.ts:209`, the last slice reference is dropped at `fileStreamer.ts:212` and in `finally` at `fileStreamer.ts:241-244`, and sender math `fileStreamer.ts:161` matches the receiver expectation at `chunkReceiver.ts:185-189`.

### 3.3 Direct-path backpressure thresholds (PASS)
`BUFFERED_LOW_THRESHOLD = 65536` and `MAX_BUFFERED_AMOUNT = 262144` at `protocol.ts:7-8`, applied at `fileStreamer.ts:79` and `fileStreamer.ts:87`, resumed at `fileStreamer.ts:111-117`, abort pre-check at `fileStreamer.ts:84-86`, live abort listener at `fileStreamer.ts:115` and `fileStreamer.ts:121`, removed in cleanup at `fileStreamer.ts:96-101`, double-settle guard at `fileStreamer.ts:103-109`. The transport applies the threshold in its constructor at `peerjsEngine.ts:151` and through the setter at `peerjsEngine.ts:166-169`.

### 3.4 Room id mapping and alphabet (PASS)
`ROOM_PREFIX` and `PEER_PREFIX` at `protocol.ts:12-13`. Host id `ghostdrop-room-CODE` built at `roomCode.ts:65-67` and used at `peerjsEngine.ts:346`. Guest id `ghostdrop-peer-uuid8` at `roomCode.ts:70-81` with a 4-byte hex fallback. Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` at `protocol.ts:11`, length 32, excludes 0, O, 1, I. Rejection sampling at `roomCode.ts:36-46` uses limit 256, so every character is exactly uniform, and a missing `crypto.getRandomValues` raises `ROOM_CODE_UNAVAILABLE` at `roomCode.ts:16-24`. Validation and normalization at `roomCode.ts:51-62`, enforced on connect at `peerjsEngine.ts:334-337`.

### 3.5 FILE_ACK on rebuilt exact Blob (PASS)
`chunkReceiver.ts:276-280` builds `new Blob(transfer.chunks, { type: transfer.start.mime })` and re-checks `blob.size` against the declared size. Success order is delete, settle, progress, `FILE_ACK OK` at `chunkReceiver.ts:314`, then the item callback at `chunkReceiver.ts:315`. `FILE_ACK ERROR` is emitted on every validation failure at `chunkReceiver.ts:322` and on a rejected start at `chunkReceiver.ts:339`. Harness confirmed a 4-byte blob with the declared MIME type and exactly one `OK` ACK.

### 3.6 Hygiene (PASS)
- Grep across `web/src` for word-boundary `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `console.`, `window.alert` and `dangerouslySetInnerHTML`: no matches.
- Non-ASCII scan of all 32 files under `web/src`: zero characters above U+007E. That is zero em dashes, zero en dashes and zero emojis in source, comments and strings.
- No React import in `lib/p2p` or `types`. No UI copy in the protocol layer. Public barrel `index.ts` unchanged.

### 3.7 Command results (PASS)
| Command | Working dir | Result | Output |
| :--- | :--- | :--- | :--- |
| `npm run type-check` | `web/` | PASS | `tsc --noEmit` on `tsconfig.app.json` then `tsconfig.node.json`, no diagnostics |
| `npm run lint` | `web/` | PASS | `eslint .`, no findings |
| `npm run build` | `web/` | PASS | `tsc -b` plus `vite build`, 1948 modules, `dist/` emitted, PWA `generateSW`, 8 precache entries |

Pre-existing and out of this gate: the Vite warning about `./laroka.otf` failing to resolve at build time, which is Gate 1 font work.

## 4. Findings

### History: round 1 (closed)
Prior verdict was GATE FAIL on three P1 items and one P2. All four are now closed with the evidence in section 2.

| ID | Original issue | State |
| :--- | :--- | :--- |
| P1-1 | every successful transfer emitted a false `UNKNOWN_TRANSFER` | closed, B1 |
| P1-2 | host relay bypassed backpressure and the frame budget | closed, B2 |
| P1-3 | transport did not enforce the 16384-byte budget | closed, B3 |
| P2-4 | relayed `HELLO_PEER` overwrote the host presence entry | closed, B4 |

### Remaining, none release blocking

**R-1 (P2) relay queue depth is bounded by in-flight file size, not by drain.** `enqueueRelayPair` appends one pair per inbound frame with no depth cap, `peerjsEngine.ts:716-734`. A slow guest can therefore leave up to one file worth of 16KB frames queued at the host while the source keeps streaming at full speed, because the source backpressures only on its own channel to the host. PeerJS internals are now protected, so this is memory proportional to file size per slow target, not unbounded growth. Fix later with a per-target queue cap that fails the slow target, or with sender-side flow control.

**R-2 (P2) a rejected `FILE_START` still produces one error per trailing frame.** `rejectStart` at `chunkReceiver.ts:338-341` sends `FILE_ACK ERROR` but does not settle the id, so a sender that keeps streaming after an `ERROR` ACK yields one `PROTOCOL_ERROR`, then one `UNKNOWN_TRANSFER` per chunk header, then one `PROTOCOL_ERROR` for the orphan binary, then one `UNKNOWN_TRANSFER` for `FILE_END`. Harness observed 4 errors for a single rejected file with one chunk. Step 04 must not map every `onError` to a toast until this is fixed, or a rejected large file would produce thousands. Fix: settle the id inside `rejectStart` and ignore chunk headers and binaries for settled ids.

**R-3 (P2) guests still never learn about other guests.** Dropping the HELLO relay removes the wrong relabel but also the only presence source for third peers, so a guest peer list shows only the host. Step 04 needs a host-authored presence or guest-list packet.

**R-4 (P2) deferred from round 1, unchanged:** inbound frame cap at the engine boundary (P2-1), idle transfer eviction and `peer:leave` wiring to `dispose` (P2-2), `FILE_ACK` dedupe so a sender cannot receive two `OK` ACKs (P2-3), close-time queued header without its frame (P2-5), string size caps in `isWirePacket` (P2-6), guest id collision retry (P2-7).

## 5. Verification Gaps and Follow-ups
1. **Live 25MB transfer still not executed.** Gate 3 item 3 names 25MB+ files. This round verified control flow, constants, drain gating and cleanup statically, plus the receiver at runtime. Step 04 should run one host and two guests, one 25MB file, and assert byte-identical SHA-256 on both receivers with zero dropped frames.
2. **`ChunkReceiver` and `streamFile` still have no consumers.** Grep shows imports only from `lib/p2p/index.ts`. ACK consumption, `dispose` on `peer:leave` and `P2PErrorCode` to playful copy mapping remain Step 04 scope.
3. **Gate 4 out of scope.** No `URL.revokeObjectURL` exists in `web/src` yet, which is expected for Step 03 and is not a regression.
4. **No committed test suite** for `lib/p2p`. Both the round 1 harness and this round harness were temporary. Recommend committing the receiver and engine cases, R-2 in particular.

## 6. Verdict

The four repair targets are genuinely fixed, with line-level evidence and independent runtime confirmation for receiver idempotence and the bounded settled set. The original Gate 3 items hold: exact packet union, the 16384 constant, direct-path thresholds of 65536 and 262144, deterministic room ids on the unambiguous alphabet, `FILE_ACK` after an exact-size Blob with the declared MIME type, and zero `any`, `@ts-ignore`, em dash or emoji. Type-check, lint and build all pass.

Residual R-1 to R-4 are P2 and belong to the Step 04 integration pass. R-2 must be fixed before `onError` drives toasts.

GATE PASS
