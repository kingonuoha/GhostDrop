# 09-large-file-throughput-and-media-transfer-spec.md: GhostDrop Large File Throughput Spec

> **Master Technical Reference and Action Plan for `ghostdrop-orchestrator`, `ghostdrop-backend`, `ghostdrop-web`, and `ghostdrop-qa`.**
> **Scope:** High-speed WebRTC data streaming, eliminating the 200MB transfer bottleneck, aligning throughput with Xender ($15 - 40\text{ MB/s}$), and establishing the implementation roadmap.

---

## 1. Executive Summary and Problem Statement

### 1.1 The Pain Point
Small files (<1MB) and clipboard text transfer seamlessly in under 5 seconds across GhostDrop. However, large files (such as a 200MB video or archive) experience severe throughput collapse:
- **Observed behavior:** At 20 seconds of transfer time, the progress bar remains stuck at only 1% to 2%.
- **Effective throughput:** Moving 2MB to 4MB in 20 seconds equates to **$100\text{ KB/s} - 200\text{ KB/s}$** ($0.1 - 0.2\text{ MB/s}$). A 200MB file takes 15 to 30 minutes to complete.
- **The Benchmark:** The same 200MB file sent between the same two mobile/laptop devices over Xender completes in approximately **20 seconds** (an effective throughput of **$10\text{ MB/s}$**, which is 50x to 100x faster).

### 1.2 WebRTC Native Capability vs Current Stack Reality
The observed gap is **not** an inherent WebRTC protocol limitation:
- An `RTCDataChannel` running over modern SCTP (`dcSctp` in Chromium, `usrsctp` in WebKit/Gecko) on a standard 5GHz Wi-Fi LAN routinely achieves **$20 - 40\text{ MB/s}$**.
- On a mobile phone Wi-Fi hotspot, an optimized `RTCDataChannel` achieves **$8 - 18\text{ MB/s}$**.
- GhostDrop currently operates at less than 1% of the channel's available bandwidth. This document details why this occurs, categorizes the bottlenecks, defines diagnostic verification steps, and provides an actionable implementation plan for orchestrator delegation.

---

## 2. Root Cause Analysis: The 7 Compounding Friction Points

The throughput collapse is caused by seven compounding layers of friction in the current architecture:

> An eighth factor, **ordered-delivery head-of-line blocking**, is not a construction defect but a protocol choice. It is documented in Task C.4 rather than below, because it only becomes addressable after the framing change in Task C.2.

```
[File on Disk]
     |
     v
(1) Sequential Disk Slice (file.slice + await arrayBuffer)  --> 12,800 sequential yields, zero read and send overlap
     |
     v
(2) D-011 Dual-Message Framing (JSON Text + Binary Frame)   --> 25,600 WebRTC messages
     |
     v
(3) PeerJS Chunker Trap (chunkedMTU = 16300 vs 16384)       --> Splits binary frame into 2 parts + BinaryPack
     |                                                         = 38,400 messages total on wire
     v
(4) Stop-and-Go Backpressure (256KB Cap / 64KB Low Drain)   --> 1,066 stall cycles (RTT-bound)
     |
     v
(5) Single-Thread Promise Chain Latency (76,800 promises)   --> Massive microtask scheduling latency
     |
     v
(6) Multi-Device Star Relay (Host upload halved)            --> Severe penalty when peers > 2
     |
     v
(7) In-Memory Receiver Stacking (12,800 ArrayBuffers)       --> Memory pressure and GC thrashing
```

---

### Detailed Breakdown of Each Friction Point

#### 1. The PeerJS Serialization Trap and `chunkedMTU = 16300` (The Smoking Gun)
- **Location:** `web/src/lib/p2p/peerjsEngine.ts` line 630-634; `node_modules/peerjs/dist/bundler.mjs` line 11-12.
- **The Code:**
  ```ts
  openedPeer.connect(roomPeerId(code), {
    serialization: 'binary',
    reliable: true,
  })
  ```
- **The Mechanism:**
  1. PeerJS `serialization: 'binary'` uses a pure-JavaScript `BinaryPack` encoder (MessagePack variant).
  2. PeerJS hardcodes its internal maximum transmission unit to `chunkedMTU = 16300`.
  3. GhostDrop's locked chunk size in `web/src/types/protocol.ts` is `CHUNK_SIZE_BYTES = 16384` (16 KB).
  4. Because $16,384 > 16,300$, PeerJS's internal chunker triggers on **every single chunk**.
  5. PeerJS slices GhostDrop's 16,384-byte chunk into two pieces (16,300 bytes and 84 bytes), wraps both in `{ __peerData, n, data }`, and runs pure-JS BinaryPack encoding on each.
  6. On the receiving end, PeerJS intercepts both fragments, unpacks each with BinaryPack, caches them in `this._chunkedData`, glues them together, and emits the `data` event.
  7. In PeerJS `_trySend`, if `dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT`, it schedules a `setTimeout(..., 50)`, introducing an artificial 50ms pause.
     - **Correction, verified against peerjs 1.5.5 (2026-10-23):** that threshold is `8,388,608` bytes (`bundler.mjs:1152`), and GhostDrop's own drain gate caps the channel at `262,144` bytes. The 50ms path therefore does **not** fire in the current configuration and is not a present bottleneck. It only becomes reachable later, and it is a reason to keep the in-flight window below PeerJS's 8MB ceiling rather than a reason to expect a 50ms stall per chunk today.

#### 2. D-011 Dual-Message Wire Framing
- **Location:** `web/src/lib/p2p/fileStreamer.ts` lines 212-220; `decisions.md` D-011.
- **The Code:**
  ```ts
  const header: FileChunkPacket = {
    type: 'FILE_CHUNK',
    id: transferId,
    index,
    byteLength: buffer.byteLength,
  }
  await connection.sendFrame(serializeWirePacket(header), buffer)
  ```
- **The Cost on 200MB:**
  - $209,715,200 \div 16,384 = \mathbf{12,800\text{ chunks}}$.
  - For each chunk, GhostDrop transmits:
    1. A JSON text packet: `{"type":"FILE_CHUNK","id":"...","index":N,"byteLength":16384}`
    2. The binary chunk payload.
  - Combined with PeerJS re-chunking (Friction 1), a 200MB transfer sends:
    $$\mathbf{12,800\text{ JSON headers}} + \mathbf{25,600\text{ binary fragments}} = \mathbf{38,400\text{ WebRTC messages}}$$
  - 12,800 `JSON.stringify` executions on sender, 12,800 `JSON.parse` executions on receiver.
  - Alternating string control frames and binary frames forces SCTP into sub-optimal packet aggregation.

#### 3. Obsolete 16KB Micro-Chunking
- **Location:** `web/src/types/protocol.ts` line 6.
- The 16KB (`16384` bytes) limit is a **GhostDrop design decision, not a browser limitation**. `decisions.md` D-011 locked `CHUNK_SIZE_BYTES = 16384` to keep the wire protocol identical for the deferred Phase 2 Android client. The only historical constraint nearby is inside PeerJS itself, whose source notes that 60,000 bytes does not survive Firefox to Chrome because Chrome delivers anything above 16,384 in fragments. Modern SCTP stacks (`dcSctp` in Chromium, `usrsctp` in WebKit and Gecko) handle messages well beyond 16KB, so raising this is safe at the transport level and only requires a D-011 amendment for client parity.
- Modern WebRTC engines support `maxMessageSize` up to 256KB natively.
- Chunk count comparison for 200MB:
  - At 16KB: **12,800 chunks**
  - At 64KB: **3,200 chunks** (4x reduction in JS overhead)
  - At 256KB: **800 chunks** (16x reduction in JS overhead)

#### 4. The Bandwidth-Delay Product (BDP) and Stop-and-Go Drain Gate
- **Location:** `web/src/types/protocol.ts` lines 7-8; `web/src/lib/p2p/fileStreamer.ts` lines 81-91, 113-115.
- **The Constants:**
  - `BUFFERED_LOW_THRESHOLD = 65536` (64 KB)
  - `MAX_BUFFERED_AMOUNT = 262144` (256 KB)
- **The Physics:**
  $$\text{Maximum Throughput} \approx \frac{\text{Buffer Window}}{\text{Round Trip Time (RTT)}}$$
  - On a typical phone Wi-Fi hotspot with an RTT of 60ms:
    $$\text{Max Throughput} = \frac{256\text{ KB}}{0.060\text{ s}} \approx \mathbf{4.2\text{ MB/s}}$$
  - If RTT spikes to 200ms (common under mobile CPU load or RF interference):
    $$\text{Max Throughput} = \frac{256\text{ KB}}{0.200\text{ s}} \approx \mathbf{1.28\text{ MB/s}}$$
  - **The Drain Penalty:** The sender pauses at 256KB and only resumes when `bufferedAmount` falls below 64KB. This requires draining **192KB** before sending can resume.
  - For a 200MB transfer, this forces approximately **1,066 full stop-and-wait cycles**, leaving the network pipe idle during every drain wait.

#### 5. Main-Thread Sequential Disk I/O and Microtask Bloat
- **Location:** `web/src/lib/p2p/fileStreamer.ts` lines 196-224; `web/src/lib/p2p/peerjsEngine.ts` lines 460-466.
- The streaming loop is strictly sequential:
  1. `file.slice(...)` + `await slice.arrayBuffer()` (disk read)
  2. `await waitForBufferDrain(...)` (network wait)
  3. `await connection.sendFrame(...)` (transport schedule)
- Network transmission cannot proceed while disk reads are resolving, and disk reads do not prefetch while the network is transmitting.
- Chaining every chunk via `this.chain = this.chain.then(run, run)` produces 76,800 Promise allocations for 200MB. This is real overhead and worth removing, but it is secondary: microtask hops cost single-digit microseconds, so the aggregate is well under a second. The dominant per-iteration cost is the awaited Blob read plus the network wait, not the promise chain. Measurement in Experiment 2 settles which one leads.
- In `web/src/types/protocol.ts` line 286 (`toBinaryFrame`), when a `Uint8Array` view arrives from PeerJS, it executes `copy.set(view)`. That is a 16KB copy **per chunk**, roughly 200MB of cumulative allocation churn across a 200MB transfer, not one 200MB allocation. Worth fixing, but it is CPU churn, not the throughput cap. Note that Phase B Option 1 (`serialization: 'raw'`) delivers a true `ArrayBuffer` and takes the zero-copy branch already, which makes Task A.3 moot if B.1 lands first.
- Awaiting a Blob read does not block the main thread, it yields it. The accurate framing is 12,800 sequential yields with no overlap between reading and sending, which is why Task A.2 matters.

#### 6. Multi-Device Star Relay Penalty
- **Location:** `web/src/lib/p2p/peerjsEngine.ts` lines 958-990.
- GhostDrop uses a star topology where the Host device relays packets to all peers in the room.
- If a room has 3 devices (Host + 2 Peers), any transfer between the two peers is double-hopped through the Host.
- Host upload bandwidth is halved, and Host CPU performs dual-serialization.

#### 7. In-Memory ArrayBuffer Accumulation on Receiver
- **Location:** `web/src/lib/p2p/chunkReceiver.ts` lines 66, 166, 298.
- The receiver stores chunks in a JavaScript array: `chunks: ArrayBuffer[]`.
- For 200MB, this holds 12,800 separate `ArrayBuffer` instances in JavaScript heap memory.
- At transfer completion, `new Blob(transfer.chunks)` attempts a massive contiguous reallocation.
- On iOS Safari or low-spec Android devices, holding >300MB of heap in an active tab triggers aggressive WebKit memory eviction or tab reloads.

---

## 3. Comparison Matrix: GhostDrop vs Xender

| Metric / Dimension | GhostDrop (Current v0.12) | GhostDrop (Target State) | Xender (Direct Link) |
| :--- | :--- | :--- | :--- |
| **Transport Layer** | WebRTC SCTP / DTLS / UDP | WebRTC SCTP / DTLS / UDP | Direct Raw TCP Socket |
| **Chunk / Buffer Size** | 16 KB (split to 16,300 bytes) | **64 KB - 256 KB** | 64 KB - 1 MB writes |
| **Control Overhead** | JSON string per chunk | **Single start header + 8B binary tag** | Single HTTP start header |
| **In-Flight Send Window** | 256 KB (drain to 64 KB) | **2 MB - 4 MB (drain to ceiling - 2 chunks)** | Auto-tuning OS TCP buffer |
| **Serialization** | JSON + JS BinaryPack | **Zero (Raw TypedArray / Buffer)** | Zero (Kernel zero-copy) |
| **Messages for 200MB** | ~38,400 messages | **800 - 3,200 messages** | 1 continuous TCP stream |
| **Disk / Network Flow** | Strict sequential blocking | **Pipelined ring prefetch** | Threaded kernel I/O |
| **Receiver Memory** | Array of 12,800 ArrayBuffers | **Stream direct to OPFS / FSA** | Direct write to filesystem |
| **Effective 200MB Speed** | $0.1 - 0.2\text{ MB/s}$ (15-30 min) | **$15 - 35\text{ MB/s}$ (6-15 sec)** | $10 - 25\text{ MB/s}$ (8-20 sec) |

---

## 4. Pre-Implementation Diagnostic Protocol

Before modifying production code, the executing engineer should run this diagnostic protocol to establish exact baseline numbers:

### Experiment 1: The OfflineDirectEngine A/B Test (Zero Cost)
- **Objective:** Measure the isolated impact of PeerJS BinaryPack serialization vs the 256KB buffer window.
- **Procedure:**
  1. Transfer the same 200MB file using standard Online mode (PeerJS). Record transfer duration and effective MB/s.
  2. Transfer the same 200MB file using **Offline Direct Mode** (`OfflineDirectEngine`). Record transfer duration.
- **Analysis:**
  - `OfflineDirectEngine` already talks directly to native `RTCDataChannel`, completely bypassing PeerJS and BinaryPack.
  - If Offline Direct is significantly faster, PeerJS re-chunking and BinaryPack are the primary drag.
  - If both run at roughly $0.2\text{ MB/s}$, the 256KB drain window and 16KB micro-slicing are the dominant bottlenecks.

### Experiment 2: Three-Metric Profiling Instrumentation
Add temporary high-resolution timestamps in `fileStreamer.ts`:
```ts
const t0 = performance.now()
const slice = file.slice(offset, offset + CHUNK_SIZE_BYTES)
buffer = await slice.arrayBuffer()
const tRead = performance.now() - t0

const t1 = performance.now()
await waitForBufferDrain(connection, { signal })
const tDrain = performance.now() - t1

const t2 = performance.now()
await connection.sendFrame(...)
const tSend = performance.now() - t2
```
Aggregate p50 and p95 for `tRead`, `tDrain`, and `tSend` over 1,000 chunks. This provides empirical proof of where the thread spends its time.

### Experiment 3: `chrome://webrtc-internals` Inspection
During a transfer, open `chrome://webrtc-internals`:
1. Inspect `RTCDataChannel (label: data)` statistics.
2. Check `bytesSent`, `bytesReceived`, and `messagesSent`.
3. Check if SCTP buffer saturation drops to zero periodically (confirming stop-and-go starvation).

> **Crucial Testing Rule:** Always test with strictly **two devices**. Introducing a third device activates the multi-peer relay in `peerjsEngine.ts`, halving bandwidth and invalidating measurements.

---

## 5. Architectural Solution Roadmap (3 Phased Tiers)

To ensure smooth delivery without destabilizing the current baseline, the solution is partitioned into three discrete phases:

```
[Phase A: Safe In-Place Optimizations]
  - No protocol changes
  - Zero risk to Phase 2 Android spec
  - 4x to 10x throughput boost
          |
          v
[Phase B: Transport Optimization]
  - Raw RTCDataChannel data channel for bulk data
  - Bypass PeerJS BinaryPack entirely
  - 10x to 25x throughput boost
          |
          v
[Phase C: Modern WebRTC Protocol Overhaul]
  - Amend Decision D-011
  - 64KB - 256KB native chunks
  - 8-byte binary framing
  - 25x to 50x throughput boost (Matches Xender)
```

---

### Phase A: Safe In-Place Optimizations (Zero Protocol Changes)
*These changes do not alter wire packet structures and do not violate Decision D-011.*

#### Task A.1: Expand the In-Flight Window and Retune the Drain Gate
- File: `web/src/types/protocol.ts`, `web/src/lib/p2p/fileStreamer.ts`
- Action:
  - Increase `MAX_BUFFERED_AMOUNT` from 256KB to **`2,097,152` (2 MB)** or **`4,194,304` (4 MB)**.
  - Change `BUFFERED_LOW_THRESHOLD` to `MAX_BUFFERED_AMOUNT - (CHUNK_SIZE_BYTES * 2)` (e.g., 2MB minus 32KB).
- Effect:
  - Eliminates the 192KB drain stall cycle.
  - The sender only pauses when the buffer reaches 2MB, and resumes as soon as 2 chunks have cleared.
  - Maintains continuous saturation of the SCTP socket.

#### Task A.2: Prefetch Disk Ring Buffer
- File: `web/src/lib/p2p/fileStreamer.ts`
- Action:
  - Implement a 4 to 8 slot lookahead ring buffer for `file.slice().arrayBuffer()`.
  - While chunk $N$ is being transmitted and drained over WebRTC, chunks $N+1$ through $N+4$ are read from disk in the background.
- Effect:
  - Removes disk read latency from the critical transmission path.

#### Task A.3: Eliminate Redundant Memory Copies in `toBinaryFrame`
- File: `web/src/types/protocol.ts`
- Action:
  - In `toBinaryFrame(data)`, when `ArrayBuffer.isView(data)` is true, check if `view.byteOffset === 0 && view.byteLength === view.buffer.byteLength`.
  - If already matching, return `view.buffer` directly instead of allocating a new `Uint8Array` and calling `copy.set(view)`.
- Effect:
  - Eliminates roughly 200MB of cumulative allocation churn per transfer, which is 16KB per chunk rather than a single large allocation.
  - **Sequencing note:** if Task B.1 (`serialization: 'raw'`) lands first, PeerJS delivers a true `ArrayBuffer` and `toBinaryFrame` already takes the zero-copy path, so this task becomes unnecessary. Do B.1 before A.3, or skip A.3.

#### Task A.4: Raise `MAX_TOTAL_TRANSFER_BYTES`
- File: `web/src/types/protocol.ts`
- Action:
  - Increase `MAX_TOTAL_TRANSFER_BYTES` from `268435456` (256 MB) to **`536870912` (512 MB)** as an interim step, and only raise to **`2147483648` (2 GB)** once Task A.5 (OPFS streaming) has landed.
  - A 200MB file currently consumes 78% of the entire application budget, so one extra item in flight can cause a rejection.
- Safety interlock:
  - This constant is the receiver's **RAM** budget today, because `chunkReceiver.ts` accumulates every chunk in memory before building the Blob. Raising it without A.5 converts a clean rejection into a browser tab crash on mobile. Do not raise past 512 MB while the in-memory path is still the only path.

#### Task A.5: Stream Received Chunks to Disk (OPFS / File System Access)
- File: `web/src/lib/p2p/chunkReceiver.ts`
- Action:
  - For files exceeding 50MB, initialize an Origin Private File System (OPFS) draft file or `FileSystemWritableFileStream`.
  - As chunks arrive, write them directly to the file stream rather than appending them to `chunks: ArrayBuffer[]`.
  - At `FILE_END`, produce the file handle or trigger a direct save without allocating a massive in-memory Blob.
- Effect:
  - Keeps browser heap usage constant (<30MB) regardless of whether the incoming file is 200MB or 2GB.

---

### Phase B: Transport Optimization (Bypassing PeerJS for Bulk Data)
*Leaves signaling on PeerJS while streaming bulk payload bytes over raw RTCDataChannel.*

#### Task B.1: Configure PeerJS `serialization: 'raw'` or Dedicated Bulk DataChannel
- File: `web/src/lib/p2p/peerjsEngine.ts`
- Action:
  - Option 1: Initialize the PeerJS data connection with `serialization: 'raw'` (None). This instructs PeerJS to pass `ArrayBuffer` directly to `RTCDataChannel.send()` with zero BinaryPack wrapping.
  - Option 2: Maintain the PeerJS connection for signaling, but open a dedicated raw `RTCDataChannel` (e.g. label `ghostdrop-bulk`) on the underlying `RTCPeerConnection` for file chunk streaming.
- Effect:
  - Bypasses PeerJS's hardcoded `chunkedMTU = 16300` logic completely.
  - Drops the message count from 38,400 back to 25,600.
  - Removes the 50ms `_bufferedSend` timer path. Note this timer is dormant today (PeerJS triggers it only above 8MB of buffered data, and our gate holds the channel at 256KB), so treat this as headroom for a wider window, not as a current throughput gain.
  - **Caveat on Option 2 (dedicated bulk channel):** SCTP has one congestion window and one association per peer connection, so a second channel does **not** add bandwidth. It helps by keeping small control and text frames from queueing behind bulk data. Creating it also requires reaching PeerJS's `connection.peerConnection` and relying on the remote side's `ondatachannel` handler, so it is a larger change than Option 1 for a smaller gain.

---

### Phase C: Modern WebRTC Protocol Overhaul (Requires Amending Decision D-011)
*This phase alters the wire protocol and requires formal coordination with decisions.md and the Phase 2 Android specification.*

#### Task C.1: Amend Decision D-011 (Increase Chunk Size to 64KB or 256KB)
- Reference: `decisions.md` D-011
- Action:
  - Formalize Decision D-017 (or amendment to D-011) to adopt dynamic or negotiated chunk sizing.
  - Read `RTCSctpTransport.maxMessageSize` (typically 256KB in modern browsers).
  - Set `CHUNK_SIZE_BYTES = 65536` (64 KB) or `131072` (128 KB) or `262144` (256 KB).
- Effect:
  - Cuts total chunk count from 12,800 down to **800 - 3,200**.
  - Eliminates 75% to 94% of all event loop interrupts and serialization steps.

#### Task C.2: Streamlined Binary Framing (Eliminate Per-Chunk JSON)
- Reference: `docs/06-protocol-and-tech-spec.md` section 3
- Action:
  - Retain `FILE_START` JSON packet for metadata exchange (`id`, `name`, `size`, `mime`, `totalChunks`).
  - Eliminate the separate `FILE_CHUNK` JSON packet.
  - Option A: Send pure raw binary frames. Because `RTCDataChannel` with `ordered: true` guarantees in-order, lossless delivery over SCTP, the receiver simply counts received bytes against `size`.
  - Option B: Prefix an 8-byte binary header to each chunk:
    - Bytes 0-3: `uint32` transfer ID hash
    - Bytes 4-7: `uint32` chunk sequence index
    - Bytes 8+: raw payload bytes
- Effect:
  - Halves the total wire message count.
  - Zero JSON stringification on the wire during active file streaming.

#### Task C.3: Android Phase 2 Spec Synchronization
- Reference: `docs/00-prd-source-of-truth.md`
- Action:
  - Update Phase 2 Android protocol documentation to reflect the streamlined binary framing and 64KB/256KB chunk sizes.

#### Task C.4: Remove Head-of-Line Blocking (Unordered Delivery plus Index Reassembly)
- File: `web/src/lib/p2p/peerjsEngine.ts` (channel creation), `web/src/lib/p2p/offlineDirectEngine.ts`, `web/src/lib/p2p/chunkReceiver.ts`
- Current state: both engines create the channel with `ordered: true`, and `fileStreamer.ts` relies on strict adjacency between a `FILE_CHUNK` header and its binary frame (D-011 item 3).
- Why this matters: on a reliable **ordered** SCTP stream, one dropped packet stalls every later chunk until it is retransmitted. On a phone hotspot with power-save and RF interference this is often the difference between a saturated pipe and apparent stall, and it is invisible in a clean lab test.
- Action, only **after** Task C.2 collapses each chunk into a single self-describing binary frame:
  - Create the data channel with `{ ordered: false, maxRetransmits: undefined }` (still reliable, just not ordered).
  - Reassemble by the chunk index carried in the binary header instead of by arrival order, buffering out-of-order chunks in a sparse map until the contiguous prefix is complete.
  - Keep `FILE_START` metadata unchanged so `chunkReceiver` still validates `totalChunks` and total size.
- Effect:
  - Eliminates head-of-line blocking. This is the same design choice QUIC made over TCP, and it is the main remaining lever on lossy links after the window is widened.
- Constraint:
  - This is impossible while D-011 item 3 (header immediately followed by its binary frame) still holds, because that adjacency depends on ordering. It is therefore strictly later than C.2, and needs its own decision record.
  - It also requires **Task C.2 Option B** (an 8-byte binary header carrying the chunk index). C.2 Option A, pure byte counting, silently assumes ordered arrival and cannot be combined with this. Choose Option B if C.4 is planned.
- Verification:
  - Must be measured under induced loss (for example `tc`/`clumsy` at 1 to 3 percent loss) against the ordered baseline. On a clean link the difference should be near zero, so a lab-only test proves nothing.

#### Task C.5: Consider Off-Main-Thread Reads (Optional)
- File: `web/src/lib/p2p/fileStreamer.ts`
- Action:
  - If Experiment 2 shows `tRead` dominating rather than `tDrain`, move Blob slicing into a Worker and pass the resulting `ArrayBuffer` back as a transferable.
- Note:
  - Do not do this speculatively. It adds a Worker to the critical path and only pays off if disk read time is the measured leader.

---

## 6. Orchestrator Task Delegation Plan

When the orchestrator is instructed to execute this throughput upgrade, tasks should be delegated according to the agent ownership matrix:

| Task ID | Work Package | Primary Agent | Scope & Restrictions |
| :--- | :--- | :--- | :--- |
| **THROUGHPUT-P1** | Buffer Window Tuning & Prefetch Ring | `ghostdrop-backend` | Edit `protocol.ts` and `fileStreamer.ts`. Keep wire protocol intact. Higher expected gain than P3 for the hotspot case, so run it first. |
| **THROUGHPUT-P2** | OPFS / Disk Stream Receiver | `ghostdrop-backend` | Edit `chunkReceiver.ts` to stream large files direct to disk. Required before `MAX_TOTAL_TRANSFER_BYTES` goes past 512 MB. |
| **THROUGHPUT-P3** | Raw DataChannel Bulk Bypass | `ghostdrop-backend` | Switch the PeerJS connection to `serialization: 'raw'`. One line plus receiver verification. Removes BinaryPack and the 16,300 chunker, and makes A.3 unnecessary. |
| **THROUGHPUT-P4** | Protocol D-011 Amendment (64KB/256KB) | `ghostdrop-orchestrator` | Update `decisions.md`, `docs/06-protocol-and-tech-spec.md`. Must also record the C.2 framing change and the C.4 ordering change if both proceed. |
| **THROUGHPUT-P5** | UI Progress Smoothing & Quota Handling | `ghostdrop-web` | Update progress updates and disk quota error states. Note that `useGhostRoom.ts` already dedupes progress to whole percent steps, so check before rewriting it. |
| **THROUGHPUT-P6** | Microcopy and Toasts | `ghostdrop-ui-polish` | Witty toasts for rapid transfers (zero emojis, zero em dashes). |
| **THROUGHPUT-P7** | Multi-Platform Performance Verification | `ghostdrop-qa` | Run 2-device benchmarks (Wi-Fi and Hotspot), audit memory, and run the induced-loss comparison for C.4. |
| **THROUGHPUT-P8** | Unordered Delivery and Index Reassembly | `ghostdrop-backend` | Blocked by P3 and P4. Needs its own decision entry and an induced-loss benchmark. |

---

## 7. QA Verification and Acceptance Criteria

The throughput optimization is considered complete only when all criteria below pass:

1. **200MB Transfer Duration Target:**
   - On 5GHz Local Wi-Fi: 200MB completes in **under 25 seconds** (average $\ge 8\text{ MB/s}$).
   - On Phone Wi-Fi Hotspot: 200MB completes in **under 45 seconds** (average $\ge 4.5\text{ MB/s}$).
   - These two numbers are the release bar. The 6 to 15 second figure in the comparison matrix is an optimistic target for a clean 5GHz link with every phase landed, not the acceptance threshold.
2. **Zero Small-File Regression:**
   - Files <1MB and clipboard text snippets continue to transfer in **under 3 seconds**.
3. **Memory Footprint Ceiling:**
   - Browser heap consumption during a 200MB or 500MB transfer remains **under 50 MB** on both sender and receiver tabs.
4. **Reliability and Integrity:**
   - SHA-256 hash of the received file matches the original file exactly.
   - TTL auto-expiry and manual burn continue to function cleanly.
5. **Loss-Path Behaviour (applies only if THROUGHPUT-P8 ships):**
   - At 1 to 3 percent induced packet loss, unordered plus index reassembly must measurably beat the ordered baseline, with zero integrity regressions.
   - On a clean link the change must show no measurable regression.
6. **Brand and Code Rules:**
   - Strictly zero emojis in new UI microcopy or logs.
   - Strictly zero em dashes in comments, copy, or documentation.
