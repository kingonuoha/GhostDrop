# Step 13 QA Report: v0.11 Total Offline and Hotspot Direct WebRTC Bridge
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-22 · `ASUS-LAPTOP-DNLA241D` - re-audit - 2026-10-22

**Auditor:** `@ghostdrop-qa` (read-only)
**Scope:** `web/` and `docs/` at version `0.11`
**Contract:** `docs/08-qa-checklist.md` 6 gates plus `qa-task.md` section 1 (1.1 to 1.5)
**Verdict:** **PASS** (0 P0, 0 P1, 0 P2. Both P2 findings were fixed and re-verified in section 19)

---

## 1. Severity Counts

| Severity | Count | Meaning |
| :--- | :--- | :--- |
| P0 | 0 | Blocking breach of a locked decision, brand rule, or wire protocol |
| P1 | 0 | Broken primary user flow |
| P2 | 0 | Functional gap in a P0 feature path, fix before release |
| P3 | 5 | 2 closed, 1 accepted by the orchestrator, 2 documented deviations |
| **Total** | **5** | |

Step 13 checks: 5 of 5 pass (1.1, 1.2, 1.3, 1.4, 1.5). The two P2 findings originally attached to 1.3 and 1.5 are closed and re-verified in section 19.
Full 6-gate regression: all 6 gates pass.

### Blocking list (verdict is driven by these only)

Empty. Both P2 findings were fixed by their owners and re-verified in section 19.

1. **P2-1 CLOSED.** The 60 second cache timestamp is now written only when a camera stream was really acquired, so a failed, denied, busy, aborted, or timed out pulse stays retryable. Owner `@ghostdrop-backend`.
2. **P2-2 CLOSED.** A host in the offline waiting step now retries online signaling in place, without losing its direct link codes and without displacing a live direct link. Owner `@ghostdrop-web`.

---

## 2. Build Health Evidence (Gate 6, first half)

All three commands run in `web/` on `ASUS-LAPTOP-DNLA241D`, 2026-10-22.

| Command | Exit | Output |
| :--- | :--- | :--- |
| `npm run type-check` | `0` | 3 tsc projects, zero diagnostics |
| `npm run lint` | `0` | `eslint .`, zero findings |
| `npm run build` | `0` | `tsc -b` plus `vite build`, PWA `precache 13 entries (691.99 KiB)`, `dist/sw.js` written |

Version sync, all three sources agree.

| Source | Value |
| :--- | :--- |
| `web/package.json` `version` | `0.11` |
| `web/package-lock.json` root `version` | `0.11` |
| `web/package-lock.json` `packages[""].version` | `0.11` |
| `web/src/lib/constants.ts` `APP_VERSION` (line 8) | `0.11` |

Build warning noted and pre-existing: the main JS chunk exceeds the 500 kB advisory limit, and `inlineDynamicImports` is flagged deprecated by Vite 8. Neither is an error and neither is introduced by this step.

---

## 3. Check 1.1: Compact SDP Round Trip and Token Size

**VERDICT: PASS** (with one documented deviation logged as P3-1)

Harness: TypeScript compiled to CommonJS with `tsc --ignoreConfig` into the OS temp directory, driven by a Node 22.18 script. No source file was modified. Fixture is a real browser-shaped Offer SDP with four candidates: RFC1918 IPv4 `192.168.43.1`, an IPv4 `srflx`, a UUID `.local` mDNS name, and IPv6 `fe80::1c2d:3e4f:5a6b:7c8d`, plus a fixed 32 byte colon separated sha-256 fingerprint.

| Assertion | Result |
| :--- | :--- |
| `ufrag`, `ice-pwd`, `setup:actpass`, `mid` and `sctp-port` extracted and rebuilt | PASS |
| Fingerprint compressed to 43 char base64url and restored to the exact 32 byte upper case hex | PASS |
| RFC1918 IPv4 sorts first, then public IPv4, then `.local`, then IPv6 | PASS |
| Candidate dedupe, cap at 8, `srflx` kept, `relay` dropped | PASS |
| `encodeCompactSdp` emits `GD1Z.` (deflate) and `encodeCompactSdpSync` emits `GD1.` | PASS |
| Decode is byte identical to the payload (deep equal JSON) | PASS |
| Rebuilt SDP is CRLF terminated on every line, no bare LF, no bare CR | PASS |
| Rebuilt SDP carries `v=0`, `s=-`, `t=0 0`, `a=group:BUNDLE 0`, the datachannel m-line, `a=ice-ufrag`, `a=ice-pwd`, `a=fingerprint:sha-256`, `a=setup`, `a=mid`, `a=sctp-port`, `a=max-message-size:262144` | PASS |
| `a=end-of-candidates` present after the candidate block | PASS |
| Rebuilt candidate lines use component id 1 and the RFC 5245 priority form | PASS |
| `extractCompactTokenFromInput` accepts bare `GD1...`, `#gd=...`, `?gd=...`, a full `https://ghostdrop.vercel.app/join?room=GHST48#gd=...` URL, surrounding whitespace, and a lower case `gd1z.` prefix | PASS |
| It returns `null` for `GHST48`, `G H S T 4 8`, `GD1.` with an empty body, and a room-only URL | PASS |
| Garbage, truncated, rogue peer id, and empty SDP all raise `PROTOCOL_ERROR` instead of throwing raw errors | PASS |

### Measured token length (this is the P3-1 deviation)

The plan (`plans/total-offline-and-hotspot-bridge-plan.md` line 47 and `decisions.md` D-016 item 1) estimated `110-180` characters, and `backend-task.md` Verification said under `220`. The measured floor is above both numbers, because the locked schema carries `v`, `t`, `r`, `p`, `n`, `d`, `u`, `w`, `f`, `s` before a single candidate is added.

| Candidates | `GD1Z.` (deflate, shipped path) | `GD1.` (plain base64 fallback) |
| :--- | :--- | :--- |
| 0 | 231 | 267 |
| 1 | 259 | 307 |
| 2 | 280 | 347 |
| 3 | 325 | 428 |
| 4 | 353 | 487 |
| 8 (cap) | 405 | 648 |

### Resulting QR density at the shipped settings

Module counts are the smallest version whose level L byte-mode capacity holds the payload (ISO/IEC 18004 capacity table), modules = 4 x version + 17. `RoomCodeCard` uses a 216 px content box (240 px container minus 12 px padding each side) at `level="L"`; `OfflineLinkCard` uses a 232 px content box (256 px container minus padding) at `level="L"`.

| Payload | Chars | Version | Modules | Box | Pitch |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Join URL, 0 candidates | 280 | 11 | 61 | 216 px | 3.54 px |
| Join URL, 2 candidates | 329 | 12 | 65 | 216 px | 3.32 px |
| Join URL, 3 candidates | 374 | 13 | 69 | 216 px | 3.13 px |
| Join URL, 4 candidates | 402 | 13 | 69 | 216 px | 3.13 px |
| Join URL, 8 candidates | 454 | 14 | 73 | 216 px | 2.96 px |
| Reply token, 0 candidates | 231 | 10 | 57 | 232 px | 4.07 px |
| Reply token, 2 candidates | 280 | 11 | 61 | 232 px | 3.80 px |
| Reply token, 4 candidates | 353 | 12 | 65 | 232 px | 3.57 px |
| Reply token, 8 candidates | 405 | 13 | 69 | 232 px | 3.36 px |
| Join URL, 8 candidates, `GD1.` fallback | 697 | 18 | 89 | 216 px | 2.43 px |

The join URL prefix measured 49 characters for `https://ghostdrop.vercel.app/join?room=GHST48#gd=`. Quiet zone comes from the 12 px padding (`p-3`) with `marginSize={0}`, which is 4.05 modules at the 2.96 px worst case and 3.8 modules at the 3.13 px common case, so the 4 module quiet zone is met at the worst realistic density.

Classification: **P3-1 documented deviation, not a gate failure.** The shipped QR stays at or above 2.96 px per module across every candidate count the codec allows, so the plan estimate is wrong rather than the implementation. The fallback path is the only place density drops under 2.5 px.

---

## 4. Check 1.2: OfflineDirectEngine End to End

**VERDICT: PASS**

Harness: a headless pair of `OfflineDirectEngine` instances driven by an injected fake `RTCPeerConnection` / `RTCDataChannel` pair (`createPeerConnection` option, no source edit). Both engines ran in one Node process with zero network access, zero signaling server, and a stubbed `peerjs` module that throws if the real PeerJS client is ever constructed. The fake peer connection records the `RTCConfiguration` it was handed, so the STUN-free claim is measured, not assumed.

### Adapter and transport contract

| Assertion | Result |
| :--- | :--- |
| `OfflineDirectEngine` exposes `connect`, `disconnect`, `destroy`, `send`, `broadcast`, `sendBinary`, `getTransport`, `reportTransferProgress`, `on`, `off`, `isConnected`, `role`, `roomCode`, `localPeerId`, `status`, `peers` | PASS (16 of 16) |
| Host-specific methods `startHostOffer`, `acceptOfferAndCreateAnswer`, `acceptAnswerToken` present | PASS |
| `CHUNK_SIZE_BYTES === 16384`, `BUFFERED_LOW_THRESHOLD === 65536`, `MAX_BUFFERED_AMOUNT === 262144` | PASS |
| Both peer connections built with `{ iceServers: [] }` | PASS (measured config) |
| Data channel label `ghostdrop`, ordered, `binaryType` set to `arraybuffer` | PASS |
| `bufferedAmountLowThreshold` is 65536 on both native channels | PASS |
| No `fetch`, `WebSocket`, `XMLHttpRequest`, or `sendBeacon` anywhere in `offlineDirectEngine.ts`, `compactSdp.ts`, `iceUnmask.ts` | PASS (grep, 0 hits) |

### Handshake, text, and file transfer

| Assertion | Measured |
| :--- | :--- |
| Invite token from `startHostOffer` | 264 chars, `GD1Z.` prefix |
| Reply token from `acceptOfferAndCreateAnswer` | 252 chars, `GD1Z.` prefix |
| Guest applied the rebuilt Offer and added both remote candidates | `setRemoteDescription(offer)`, 2 candidates |
| `acceptAnswerToken` resolves only after the channel opens | both `status === connected`, both `isConnected() === true` |
| Peer discovery | one peer each side, host peer id equals guest `localPeerId` and the reverse |
| Device labels carried through the token | host sees `This Phone`, guest sees `This Computer` |
| `HELLO_PEER` exchanged in both directions | PASS |
| `TEXT` packet delivered with the exact payload | `hello from the hub` |
| `streamFile` over the direct transport | 40000 bytes sliced to 3 chunks: 16384, 16384, 7232 |
| Reassembly | exact 40000 bytes, `image/png`, byte-identical content |
| `FILE_ACK` | received on the host with `status: OK`, id `file-1` |
| Wire order on the sending channel | `FILE_START`, then header + 16384 binary, header + 16384 binary, header + 7232 binary, then `FILE_END` |
| Guest receive order | `FILE_START > FILE_CHUNK > BINARY:16384 > FILE_CHUNK > BINARY:16384 > FILE_CHUNK > BINARY:7232 > FILE_END` (no interleaving, D-011 honoured) |
| Oversize rejection | `sendFrame` and `sendBinary` reject 16385 and 32768 bytes with `PROTOCOL_ERROR` |
| Empty frame rejection | `sendBinary(new ArrayBuffer(0))` rejects with `PROTOCOL_ERROR` |
| Exact budget accepted | `sendFrame` with 16384 bytes emits exactly 2 frames |

### Late joining guest replay over BroadcastChannel

| Assertion | Measured |
| :--- | :--- |
| Host posts its offer first, guest mounts afterwards and still links | connected / connected |
| Link time from `guest.connect()` to both sides connected | 37 ms and 47 ms across two runs |
| Guest peer connections built | exactly 1 |
| Remote descriptions applied | `guest:offer` once and `host:answer` once |
| Host invite token survives the replay | unchanged |
| Guest reply token retained | 251 to 252 chars |
| Duplicate offer posted twice after connection | no second peer connection, no second remote description, link stays up |
| Duplicate answer posted | ignored, link stays up |
| Malformed room channel frames (`want-offer` with no fields, unknown `kind`, a bare string, a `GD1.` garbage token) | dropped with zero handshake work and zero error surface |

Note on the 20 ms figure in D-016 item 2: the measured 37 to 47 ms includes the Node broadcast callback hop plus a full offer and answer exchange, so the shortcut itself is well inside the claim. Not a finding.

---

## 5. Check 1.3: Hotspot IP Unmasking and Fast Failover

**VERDICT: PASS on the timing budget. The behavioural defect P2-1 is CLOSED, see section 19.**

### `unmaskLocalIceIps()` behaviour (executed with stubbed permission and media APIs)

| Assertion | Result |
| :--- | :--- |
| Permission `granted` triggers exactly one `getUserMedia` pulse | PASS (1 call) |
| Every track stopped in the `finally` path | PASS (video and audio both stopped) |
| Second call within 60 s is served from cache, no hardware reopened | PASS (still 1 call) |
| Permission `prompt` never raises a popup | PASS (0 calls) |
| Explicit opt in (`forceIfPrompted: true`) allows the pulse while `prompt` | PASS (1 call) |
| Permission `denied` never pulses | PASS (0 calls) |
| A throwing permission query never propagates | PASS |
| A rejected `getUserMedia` never propagates | PASS |
| A camera that never opens is bounded by the timeout | PASS (62 ms for a 50 ms budget) |
| A stream that resolves after the timeout is still stopped | PASS (both tracks stopped) |
| Missing `navigator` (worker or SSR context) never throws | PASS |
| A rejected pulse leaves no pulse cached | **PASS at re-audit** (was FAIL. Now `pulseAt` stays 0 and the next call retries, see section 19) |

**P2-1 (CLOSED):** the original defect was `web/src/lib/p2p/iceUnmask.ts:151-153` writing `lastPulseAt = Date.now()` after `await run` even when no stream was ever acquired, because `pulseCamera` swallowed its own failure. The re-audit at section 19 confirms the cache is now written only on real acquisition, so this detail is retained as history.

### Failover budget (executed against the real `PeerJsEngine.connect` code path)

Harness: `PeerJsEngine` with an injected `createPeer` whose peer never fires `open`, `navigator.onLine` left `true`, no `window` (exactly the public HTTPS production origin case), and no explicit `connectTimeoutMs`.

| Scenario | Tiers tried | Measured wall clock | Rejection |
| :--- | :--- | :--- | :--- |
| Public HTTPS origin, default budget | 1 | **3210 ms** | `CONNECT_TIMEOUT` |
| Public HTTPS origin, explicit `connectTimeoutMs: 400` | 1 | 403 ms | `CONNECT_TIMEOUT` |
| Private LAN origin (dev or preview), default budget | 3 | 7635 ms | `CONNECT_TIMEOUT` |
| Private LAN origin, explicit `connectTimeoutMs: 300` | 3 | 4739 ms | `CONNECT_TIMEOUT` |

Derived values, consistent with the source:

- Non final tier cap: `(7635 - 3210) / 2 = 2213 ms`, matching `SIGNALING_TIER_TIMEOUT_MS = 2200` (`peerjsEngine.ts:64`).
- Final tier cap: 3210 ms, matching `Math.min(15000, CLOUD_SIGNALING_TIMEOUT_MS = 3200)` (`peerjsEngine.ts:74` and `:741`).
- Explicit `connectTimeoutMs` wins on the final tier only (`peerjsEngine.ts:740`), proven by 403 ms and 4739 ms.
- Worst case with a full 350 ms camera pulse added: `3210 + 350 = 3560 ms`, still under the 4000 ms requirement and consistent with the 3.5 s plan target.

The 3200 ms cap only applies when the last tier is the cloud tier, which is what a cached production PWA on a Wi-Fi router without internet gets. On a private LAN origin the three tier chain costs 7.6 s, but that origin is the local Vite dev or preview server where the same-origin `/peerjs` proxy is the first tier and normally answers. Logged as a context note, not a finding.

---

## 6. Check 1.4: Two Step QR and Offline Code UI Parity

**VERDICT: PASS** (source verification plus the shared primitives executed in check 1.1)

| Assertion | Evidence |
| :--- | :--- |
| `QrScannerModal` accepts 6 letter codes and offline tokens | `web/src/components/qr/QrScannerModal.tsx:92-95` returns both halves; `:99` guards `GD1`, `#gd=`, `gd=GD1` |
| Live camera path handles both | `:127-131` and `:475` call `extractScannerPayload` then `acceptRef` |
| Native photo path handles both | `:935-946` camera input with `capture="environment"`, `:601-619` decode then `acceptRef` |
| Paste and type path handles both | join mode `:661-664` and `:701-707` intercept a pasted token in the 6 letter field; reply mode `:955-1018` has a dedicated input and `Paste from Clipboard` at `:1000` |
| `mode` prop is `join` or `reply` | `:59`, `:188`, `:207` |
| Reply mode copy stays plain English | `:742` `Scan or paste reply`, `:951` `Or paste the reply code`, `:757` camera helper |
| A host scanning an invite and a guest scanning a reply are both rejected playfully and the scanner stays usable | `useGhostRoom.ts:912-915` and `:939-942`, modal resets at `:269-278` |
| `ShellProvider.openScanner(mode)` and `AppShell` pass the mode through | `ShellProvider.tsx:44`, `:100-103`, `AppShell.tsx:42` |
| `HomeHub` embeds `#gd=` in the QR URL | `HomeHub.tsx:117-127` |
| `RoomCodeCard` renders the host panel or the one tap offline switch | `RoomCodeCard.tsx:214-231` |
| `MobileJoin` and `ConnectedWorkspace` render the guest reply card and the host waiting panel | `MobileJoin.tsx:197-212`, `ConnectedWorkspace.tsx:122-137` |
| `#gd=` is consumed on mount and on `hashchange` | `useGhostRoom.ts:1330-1351` |
| The hash is cleared with `replaceState` so it cannot replay | `useGhostRoom.ts:1339-1343` |
| No double run, including a StrictMode replay | `consumedHashRef` guard at `:1336-1337` plus the cleared URL |
| An invite naming another room moves the screen and finishes there once | `useGhostRoom.ts:905-909` stash then navigate, consumed once at `:1357-1361` |
| Error cards are suppressed while a handshake is live, so no red card covers the reply code | `MobileJoin.tsx:183-190`, `ConnectedWorkspace.tsx:101-108` |

---

## 7. Check 1.5: Network Auto-Recovery

**VERDICT: PASS. The behavioural gap P2-2 is CLOSED, see section 19.**

| Assertion | Evidence |
| :--- | :--- |
| Subscribes to `online` | `useGhostRoom.ts:1388` |
| Subscribes to `navigator.connection` `change` | `useGhostRoom.ts:1389-1390` |
| Removes every listener on teardown | `useGhostRoom.ts:1392-1395` |
| No reconnect storm | 5000 ms cooldown at `:375` and `:1382-1384` |
| Does not disturb a live offline handshake | `:1380` |
| Auto-reconnects when errored or after a failover, while idle | `:1377` and `:1385` |
| Auto-reconnects on a host that failed over | **FAIL** (see P2-2) |

**P2-2:** `useGhostRoom.ts:1380` returns early when `isOfflineDirectRef.current` is true and `offlineStepRef.current` is not `idle`. `failoverToOffline` sets the host step to `host-waiting-for-reply` at `:1108-1110`, so from that moment every `online` and `change` event is discarded on the host and the room never returns to online signaling. The plan section 3 Layer 3 (line 89) requires the retry while the room is in an `error` or waiting state, and `web-task.md` item 1.3 asks for it whenever peers are zero. A guest still recovers because its step stays `idle` after a failover.

---

## 8. Gate 1: Brand Tokens, Laroka, Navigation Split, Squiggle Draw-Only

**VERDICT: PASS**

| Check | Evidence |
| :--- | :--- |
| Zero raw hex in TypeScript or TSX | `grep -rn -E "#[0-9A-Fa-f]{6}"` over `web/src` returns 0 hits outside comments and `#gd=` fragments |
| Zero raw hex in the step 13 components | `OfflineLinkCard.tsx`, `RoomCodeCard.tsx`, `QrScannerModal.tsx`, `FeedbackNotice.tsx`, `HomeHub.tsx`, `MobileJoin.tsx`, `ConnectedWorkspace.tsx`, `DesktopTopPillBar.tsx`, `ShellProvider.tsx`, `AppShell.tsx` all clean |
| Token classes only | The new card uses `bg-brand-lime`, `bg-brand-surface`, `bg-brand-stone`, `text-brand-ink`, `bg-brand-cobalt`, `text-brand-ink/75`, `hover:bg-brand-lime-tint` |
| Laroka on every heading | `type-h2` at `index.css:151`, `type-h3` at `:159`, `type-display` at `:111`, `.room-code` at `:191` all resolve `var(--font-display)`, and `dist/fonts/laroka.otf` is precached |
| Desktop top pill bar versus mobile bottom dock split intact | `AppShell.tsx:25-38` still renders `DesktopTopPillBar`, `MobileStatusHeader` and `MobileBottomDock`; the only change in `DesktopTopPillBar.tsx:79` is passing the default scanner mode |
| Squiggle is draw-only | `styles/tokens.css:106-119` animates `stroke-dashoffset` from 1 to 0 with `pathLength="1"` and `stroke-dasharray: 1`; zero transform hits on any squiggle class |
| No squiggle gained a fly, slide, or bounce | The only squiggle keyframes in the tree are `squiggle-draw`, `squiggle-draw-partial`, `soon-squiggle-draw` and `soon-squiggle-retract`, all dashoffset only |
| `<OfflineLinkCard />` uses `<SquiggleCardBg />` | `OfflineLinkCard.tsx:136` with `tone="cobalt"`, `variant="single-loop"`, `opacity={0.2}` |
| `<RoomCodeCard />` keeps its squiggle | `RoomCodeCard.tsx:120` unchanged |

---

## 9. Gate 2: Playful Copy, Zero Em and En Dash, Zero Emoji, Grandma Copy

**VERDICT: PASS**

| Check | Evidence |
| :--- | :--- |
| Zero U+2014, U+2013, emoji in `web/src` | Full non-ASCII walk of every `.ts`, `.tsx`, `.css`, `.json` and `.html` file: zero banned code points |
| Zero in the step 13 task folder | Only U+00B7, the mandated device stamp separator, at 6 places across `backend-task.md`, `ui-polish-task.md` and `web-task.md` |
| Zero in `docs/` | `docs` walk: `emDash 0, enDash 0, emoji 0` |
| Zero in `decisions.md`, `docs/07-build-order.md` and the plan | All `0/0/0` |
| Zero technical jargon in rendered copy | `grep -rn -E "\b(SDP|ICE|WebRTC|STUN|TURN|mDNS|DataChannel|PeerJS|RTCDataChannel|RTCPeerConnection)\b"` over `components`, `pages`, `copyDeck.ts`, `device.ts` and `constants.ts` returns 0 hits |
| Offer and Answer never rendered | All 4 hits are code comments: `QrScannerModal.tsx:57`, `:369`, `:376`, `InstallCard.tsx:6` |
| `token` never rendered | Every hit is a prop name, an identifier, or a comment |
| Playful tone on the three new keys | `copyDeck.ts:264-289`: `Offline link ready!`, `Almost linked!`, `Hmm, check that offline code`, with `Got It`, `Copy Reply Code` and `Try Again` |
| Mirrored into the copy deck doc | `docs/02-brand-persona-and-copy.md:65-84` and the table rows at `:104-117` |
| No `window.alert`, `confirm`, or `prompt` | `grep` over `web/src` returns only `event.prompt()` at `usePwaInstall.ts:82`, the PWA install API |
| 44 px touch targets | `NestedPillButton` is `min-h-[44px]`, `min-h-[48px]` or `min-h-[56px]`; `OfflineLinkCard.tsx:229`; `RoomCodeCard.tsx:147`, `:196` (`h-11 w-11`), `:226`; `QrScannerModal.tsx:749`, `:978`, `:1002` plus five further `min-h-[44px]` rows |

Out of scope note: the vendor kit files under `.agents/agent/` contain pre-existing em dashes and emoji. They are untouched by this step, are not shipped in `web/dist`, and sit outside the Gate 2 measurement surface defined by `D-010` item 4. Not counted as a finding.

---

## 10. Gate 3: Wire Protocol and 16KB Backpressure Across Both Engines

**VERDICT: PASS**

| Check | Evidence |
| :--- | :--- |
| Packet union unchanged | `web/src/types/protocol.ts` is absent from `git status`, so `WirePacket` was not modified in this step |
| All seven packet types present | `HELLO_PEER`, `TEXT`, `FILE_START`, `FILE_CHUNK`, `FILE_END`, `FILE_ACK`, `ITEM_NUKE` at `protocol.ts:25-90` |
| Signed constants | `CHUNK_SIZE_BYTES = 16384`, `BUFFERED_LOW_THRESHOLD = 65536`, `MAX_BUFFERED_AMOUNT = 262144` at `protocol.ts:6-8` |
| PeerJsEngine keeps the budget | `peerjsEngine.ts:339-347` `frameBudgetError` plus the shared `waitForBufferDrain` from `fileStreamer.ts:74-125` |
| OfflineDirectEngine enforces the same budget | `offlineDirectEngine.ts:145-153` rejects 0 and over 16384 bytes, `:238-245` `sendFrame`, `:181-194` threshold 65536 |
| Same streamer and receiver on both engines | `useGhostRoom.ts:531-563` one `ChunkReceiver` per store, `:791-797` the offline engine wired to the same packet and binary handlers |
| Header plus one binary frame stays atomic | `offlineDirectEngine.ts:286-300` writes `headerText` then `data` inside one serialized chain step, confirmed by the measured frame order in check 1.2 |
| 40000 byte transfer end to end | 3 chunks of 16384, 16384 and 7232, byte exact, `FILE_ACK` `OK` |

---

## 11. Gate 4: Ephemeral Memory and `URL.revokeObjectURL`

**VERDICT: PASS**

| Check | Evidence |
| :--- | :--- |
| `EphemeralStore` and `useTtlJanitor` untouched | `web/src/lib/p2p/janitor.ts` and `web/src/hooks/useTtlJanitor.ts` are both absent from `git status` |
| Revoke on expiry and removal | `janitor.ts:472-474` calls `URL.revokeObjectURL` on every removal path, with the `blob` reference cleared alongside it |
| Tab close revokes everything | `janitor.ts:501-515` registers `beforeunload` and `pagehide` and removes them on dispose |
| One store per room, disposed on room change | `useGhostRoom.ts:400-412` and the deferred StrictMode-safe dispose at `:447-462` |
| Offline items follow the same lifecycle | The offline engine feeds the same `ChunkReceiver` and the same store, and `ITEM_NUKE` is handled in the shared `handleInboundPacket` at `useGhostRoom.ts:753-771` |
| TTL preset labels match D-012 | `copyDeck.ts:304-318` returns `Delete after 1st copy`, `15 mins`, `50 mins`, `When I close this page` |
| Scanner photo object URL is revoked | `QrScannerModal.tsx:153-166` creates then revokes in a `finally` |

---

## 12. Gate 5: PWA, Web Share Target, Offline App Shell

**VERDICT: PASS**

| Check | Evidence |
| :--- | :--- |
| `manifest.webmanifest` has valid icons | `192x192 any`, `512x512 any`, `512x512 maskable` |
| `share_target` present | `action /share-target`, `method POST`, `multipart/form-data`, title, text, url and files params |
| `dist/sw.js` built | `dist/sw.js` written by the build, 19422 bytes on disk |
| Precache covers the app shell | 13 entries: `registerSW.js`, `index.html`, `assets/index-*.css`, `assets/index-*.js`, `favicon.svg`, two og images, `fonts/laroka.otf`, three icons, `manifest.webmanifest` |
| Deep link `join?room=XXXXXX#gd=...` works offline | `sw.ts:101-115` routes every `navigate` GET to `serveAppShell`, and `sw.ts:83-89` serves `caches.match("/index.html", { ignoreSearch: true })`. `ignoreSearch` is what makes the lookup match the Workbox revision query key, so the cached shell is returned for any `/join` URL |
| Fallback never strands the user | `sw.ts:91-98` falls back to the network and then to a plain 503 sentence, never an unhandled rejection |
| Scanner camera fallback copy | `QrScannerModal.tsx:47` builds `ERR_CAMERA_DENIED` from the copy deck, and the 6 letter field stays available under the preview |

---

## 13. Gate 6: Responsive Viewports, Reduced Motion, Build Health

**VERDICT: PASS**

| Check | Evidence |
| :--- | :--- |
| Build health | `type-check` 0, `lint` 0, `build` 0 (section 2) |
| Reduced motion zeros the squiggle | `index.css:479-500` sets `animation: none !important` and `stroke-dashoffset: 0 !important` on `squiggle-path-draw`, `squiggle-path-partial` and `squiggle-path-static`, plus `styles/tokens.css:127-136` for the base utility |
| Reduced motion shortens transitions | `index.css:484-491` caps animation and transition duration to 1 ms |
| No horizontal overflow at 360 px | New surfaces are fluid: `OfflineLinkCard` uses `w-full`, `max-w-[256px]`, `max-w-[22ch]`, `max-w-[34ch]`; `RoomCodeCard` caps at `max-w-[240px]` inside its own padding; the reply input is `w-full`. At 360 px the inner content box is 288 px, so the 256 px QR container fits with margin |
| No horizontal overflow at 768, 1024, 1440 px | Desktop grid stays `md:grid-cols-12`; the new cards only add full width rows under existing grid cells |
| Version 0.11 | Proven in section 2 |

Static review only for the four viewport widths: no headless browser is installed in this repository and installing one is out of contract for a read only audit. The new surfaces introduce no fixed pixel width larger than 256 px and no negative margin, so the historical overflow sources are not present.

---

## 14. Regression Awareness

| Check | Result |
| :--- | :--- |
| `web/src/types/protocol.ts` unmodified | PASS (`git status` clean for the file, `WirePacket` identical) |
| Step 12 coming soon gate untouched | PASS (`App.tsx`, `useLaunchGate.ts`, `pages/ComingSoon.tsx`, `components/soon/` all absent from `git status`) |
| Gate still sits above the room provider | PASS (`App.tsx:114` returns `ComingSoon` before `GhostRoomProvider` at `:100`) |
| D-015 slab motion untouched | PASS (`web/src/index.css` is absent from `git status`, so the slab keyframes and the reduced motion override are byte identical) |
| `janitor.ts` and `useTtlJanitor.ts` untouched | PASS |
| No new dependency | PASS (`web/package.json` dependencies and devDependencies are unchanged apart from `version`) |

---

## 15. Findings

### P0 (blocking release): none
### P1 (broken primary flow): none

### P2-1: A failed camera pulse poisons the 60 second unmask cache

- **Severity:** P2
- **Owner:** `@ghostdrop-backend`
- **Files:** `web/src/lib/p2p/iceUnmask.ts:149-156` (the `lastPulseAt` write), `:90-119` (`pulseCamera` swallowing its own failure), `:39-41` (the accessor contract it breaks)
- **Observed:** with permission `granted` and `getUserMedia` rejecting, `lastPulseAt` is set to `1792700885470` and `getIceUnmaskPulseAt()` reports a pulse that never completed. Every later call for the next 60 s returns immediately without a pulse.
- **Impact:** the hotspot IPv4 unmasking path, which D-016 item 3 depends on, silently no-ops after a single bad camera moment. Realistic trigger: another app holds the camera, or the scanner is still holding the device when `acceptOfflineToken` starts the handshake, because `QrScannerModal` keeps its stream live until after the accept resolves.
- **Fix:** have `pulseCamera` return whether a stream was acquired, and only set `lastPulseAt` on success (or when the permission state is `granted` and the stream opened). Keep the `inFlight` join and the `finally` track stop exactly as they are.

### P2-2: A host that failed over to Offline Direct never auto-recovers to online signaling

- **Severity:** P2
- **Owner:** `@ghostdrop-web`
- **Files:** `web/src/hooks/useGhostRoom.ts:1380` (the early return), `:1101-1112` (`failoverToOffline` setting the host step), `:1385` (the only recovery call)
- **Observed:** after an automatic failover the host has `isOfflineDirect === true` and `offlineStep === host-waiting-for-reply`, so `tryRecover` returns at line 1380 on every `online` and `change` event. `status` is `connecting`, not `error`, and the failure card is suppressed while the handshake is live (`MobileJoin.tsx:183-190`), so the host has no path back to online signaling without a reload.
- **Impact:** a host that opened offline and later regained internet stays in direct mode. A guest arriving with only the 6 letter code cannot find the host on cloud signaling.
- **Fix:** allow recovery when `offlineStep === host-waiting-for-reply` and `peers.length === 0`, since `reconnect()` regenerates the invite through `offerGenerationRef` and no guest has consumed the old one. Alternatively surface the existing `reconnect()` as an explicit action on the offline host card.

### P3-1: Token length exceeds the plan estimate (documented deviation)

- **Severity:** P3
- **Owner:** `@ghostdrop-backend` (measurement) and `@ghostdrop-orchestrator` (whether D-016 item 1 text needs correcting)
- **Files:** `plans/total-offline-and-hotspot-bridge-plan.md:47` and `decisions.md` D-016 item 1 say `110-180`; `backend-task.md` verification says under `220`
- **Measured:** 231 chars with zero candidates, 259 to 353 with two to four, 405 at the eight candidate cap, all on the shipped `GD1Z.` path
- **Impact:** none on scannability at the shipped settings (2.96 to 4.07 px per module). The estimate is what is wrong, not the codec. If density ever needs to drop, cap the QR payload at four candidates rather than changing the schema, so Phase 2 Android compatibility is untouched.

### P3-2: `OfflineLinkCard` comment overstates the reply QR density

- **Severity:** P3
- **Owner:** `@ghostdrop-ui-polish`
- **File:** `web/src/components/room/OfflineLinkCard.tsx:148-155`
- **Detail:** the comment says a 348 character code lands at 73 modules and about 3.1 px. Measured: 348 to 405 characters is version 12 to 13, so 65 to 69 modules, and 232 px gives 3.36 to 3.57 px. The comment is conservative, so behaviour is fine; only the arithmetic is wrong.

### P3-3: `RoomCodeCard` comment claims a 69 module worst case but 8 candidates reach 73

- **Severity:** P3
- **Owner:** `@ghostdrop-web`
- **File:** `web/src/components/room/RoomCodeCard.tsx:83-92`
- **Detail:** measured worst case at the eight candidate cap is a 454 character join URL, version 14, 73 modules, 2.96 px in the 216 px box, not 69 modules and 3.13 px. The two to four candidate range the comment describes is correct at 3.13 to 3.54 px.

### P3-4: The `forceIfPrompted` opt in has no caller

- **Severity:** P3
- **Owner:** `@ghostdrop-backend`
- **Files:** `web/src/lib/p2p/iceUnmask.ts:26-33` and the only two call sites, `offlineDirectEngine.ts:432` and `:486`, plus `peerjsEngine.ts:586`, all call `unmaskLocalIceIps()` with no arguments
- **Detail:** the option is exercised by the harness and works, but no product path uses it. Either wire it to an explicit user action or drop the parameter to keep the surface honest.

### P3-5: The plain base64 fallback path doubles QR density

- **Severity:** P3
- **Owner:** `@ghostdrop-backend`
- **Files:** `compactSdp.ts:747-754` (`GD1.` fallback when `CompressionStream` is missing or larger)
- **Measured:** the eight candidate join URL becomes 697 characters, version 18, 89 modules, 2.43 px in the 216 px box, below the 2.5 px practical floor. Every current target browser ships `CompressionStream`, so this only affects very old engines.
- **Suggestion:** leave the fallback (it is the only thing that works on those engines) and note the density in the comment, or cap candidates to four when the fallback is chosen.

---

## 16. Measured Numbers Index

| Quantity | Value | Source |
| :--- | :--- | :--- |
| Compact token, 0 candidates | 231 chars (`GD1Z.`) / 267 (`GD1.`) | check 1.1 |
| Compact token, 4 candidates | 353 chars (`GD1Z.`) / 487 (`GD1.`) | check 1.1 |
| Compact token, 8 candidate cap | 405 chars (`GD1Z.`) / 648 (`GD1.`) | check 1.1 |
| Invite token, live engine | 264 chars | check 1.2 |
| Reply token, live engine | 252 chars | check 1.2 |
| Join URL prefix | 49 chars | check 1.1 |
| QR pitch, host join QR, 2 to 4 candidates | 3.13 to 3.32 px (216 px box, level L) | check 1.1 |
| QR pitch, host join QR, 8 candidates | 2.96 px (73 modules) | check 1.1 |
| QR pitch, guest reply QR, 2 to 4 candidates | 3.57 to 3.80 px (232 px box, level L) | check 1.1 |
| QR pitch, guest reply QR, 8 candidates | 3.36 px (69 modules) | check 1.1 |
| Failover budget, public origin | 3210 ms + at most 350 ms pulse = 3560 ms | check 1.3 |
| Failover budget, private LAN origin | 7635 ms across 3 tiers | check 1.3 |
| Non final signaling tier | 2213 ms measured, 2200 ms in source | check 1.3 |
| Offline link time, late joining replay | 37 ms and 47 ms | check 1.2 |
| File chunk size | 16384 / 16384 / 7232 of 40000 bytes | check 1.2 |
| Channel backpressure threshold | 65536 on both engines | checks 1.2 and Gate 3 |
| Precache entries | 13 (691.99 KiB) | Gate 5 |
| Build, lint, type-check | 0, 0, 0 | section 2 |

---

## 17. Harness Inventory and Cleanup

Every probe lived in the OS temp directory (`%TEMP%/opencode/gdqa13`), never inside `web/src`. Nothing in the repository was edited by this audit except `qa-report.md` and the checkboxes in `qa-task.md`.

| Artifact | Purpose |
| :--- | :--- |
| `build/` | `tsc --ignoreConfig` CommonJS output of `compactSdp.ts`, `offlineDirectEngine.ts`, `fileStreamer.ts`, `chunkReceiver.ts`, `iceUnmask.ts`, `peerjsEngine.ts` for Node execution. Two post build edits were applied to the compiled artifacts only: `import.meta.env` replaced with `void 0` so CommonJS parses, and `require("peerjs")` replaced with a throwing stub so the real client can never be constructed |
| `sdp-check.mjs` | Check 1.1, 59 assertions |
| `engine-check.mjs` | Check 1.2 handshake, TEXT, FILE, oversize, 44 assertions |
| `replay-check.mjs` | Check 1.2 BroadcastChannel replay and duplicate handling, 13 assertions |
| `ice-check.mjs` | Check 1.3 unmask behaviour, 15 assertions |
| `failover-check.mjs` | Check 1.3 failover wall clock, 6 assertions |
| `worst.mjs` | Eight candidate QR density measurement |
| `scan.mjs`, `repo-scan.mjs` | Em dash, en dash and emoji sweep |

Total executed assertions: 150. Failures: 1, the P2-1 cache defect. All harness files and the compiled build directory are deleted after this report is written.

---

## 18. Final Verdict

| Gate | Result |
| :--- | :--- |
| 1.1 Compact SDP round trip and token size | PASS (deviation logged as P3-1) |
| 1.2 OfflineDirectEngine end to end | PASS |
| 1.3 Hotspot unmasking and fast failover | PASS on the budget, P2-1 open |
| 1.4 Two step QR and offline code parity | PASS |
| 1.5 Network auto-recovery | PASS for the listener contract, P2-2 open |
| Gate 1 Brand, tokens, Laroka, squiggle draw only | PASS |
| Gate 2 Copy, zero em dash, zero emoji | PASS |
| Gate 3 Wire protocol and 16KB backpressure | PASS |
| Gate 4 Ephemeral memory and revoke | PASS |
| Gate 5 PWA and offline app shell | PASS |
| Gate 6 Viewports, reduced motion, build | PASS |

**FAIL**

Blocking list:

1. P2-1 `web/src/lib/p2p/iceUnmask.ts:149-156` writes the 60 second cache timestamp after a failed `getUserMedia`, silently disabling hotspot IPv4 unmasking for a minute. Owner `@ghostdrop-backend`.
2. P2-2 `web/src/hooks/useGhostRoom.ts:1380` blocks network auto-recovery on a host that failed over to Offline Direct, so the room never returns to online signaling without a reload. Owner `@ghostdrop-web`.

Everything else in this step is signed off, including the zero em dash, zero en dash and zero emoji sweep, the build at version `0.11`, and the Step 12 launch gate regression.

