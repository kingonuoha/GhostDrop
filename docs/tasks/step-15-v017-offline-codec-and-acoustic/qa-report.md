# Step 15: QA Report - v0.17 Binary Offline Codec, Acoustic Handshake and Compact Pairing UI
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-26

**Auditor:** `@ghostdrop-qa` (read-only audit, this file is the only write)
**Scope:** `docs/tasks/step-15-v017-offline-codec-and-acoustic/brief.md`
**Verdict:** PASS, 0 P0, 0 P1, 5 P2, 10 P3. Real-room sound remains manual and unproven.

---

## 1. Executive Summary

Step 15 shipped the binary token, the acoustic module, a zero dependency test harness, and the two offline cards. All four commands exit 0, the version is consistent in all three places, and `web/package.json` differs from HEAD only by the version and the `test` script. Zero dependency changes.

The codec is the strongest part. A realistic Chrome offer packs into a 115 character `GD2.` token against 423 characters for the same payload as `GD1.`, a 73 percent reduction. Every fallback probed returns `null` instead of throwing. The guest reply QR drops from version 13 at 3.40px per module to version 6 at 5.51px at 248px.

The acoustic path is honest but narrower than the build notes suggest. Synthetic loops decode 20 of 20 at up to 8 percent white noise across 16, 22.05, 44.1 and 48 kHz, including the 240 byte cap. The committed tests only guard 0.5 percent noise. Real rooms add reverb, device response and clock mismatch. Clock drift beyond about 0.2 percent fails completely, and there is no automatic retry.

Sound is safe to enable by default because the host only offers listening where capture works, and the QR, copy, share and paste paths stay mounted through the burst. Two conditions: do not offer a one way burst on an insecure origin, and make the sent state point at the QR.

---

## 2. Acceptance Matrix

### Goal 1: GD2 binary token

| Check | Result | Evidence |
| :--- | :--- | :--- |
| `GD2.` plus base64url | PASS | `compactSdp.ts`, canonical re-encode guard on decode |
| Header 3 bytes, candidate 7 bytes | PASS | Independent decoder asserts 83 bytes and offsets 3, 9, 13, 37, 69 |
| Candidate cap 3, private IPv4 host first | PASS | `MAX_BINARY_CANDIDATES`, probe kept `192.168.1.42` ahead of a public srflx |
| Returns null, never throws, when unpackable | PASS | 8 of 8 fallbacks returned null |
| GD1 and GD1Z still decode | PASS | 16 tests, GD1Z inflate path exercised |
| Typical length | 115 chars (range 92 to 159) | The 86 in the request was physically impossible |
| Human grouping round trip | PASS | Spaces, bare, `#gd=`, `?gd=` and prose extraction all re-extract |

### Goal 2: Acoustic return channel

| Check | Result | Evidence |
| :--- | :--- | :--- |
| No module scope DOM | PASS | `window`, `AudioContext`, `navigator` only inside functions |
| Frame and CRC | PASS | 5 bytes overhead, CRC vector `0x29B1` |
| 240 byte cap | PASS | Encode and decode enforced |
| Playback closes context | PASS | Single `finally`, source disconnected, listeners removed |
| Listener cleanup | PASS with one edge (F-08) | Tracks, interval, Blob URL released on every normal exit |
| Synthetic reliability | PASS, weakly guarded | 20/20 at 0, 0.5, 2, 5, 8 percent noise, four rates |
| Real room | MANUAL | Section 9 script required |

### Goal 3: Compact pairing UI

| Check | Result | Evidence |
| :--- | :--- | :--- |
| Guest sound double tap guard | PASS | `soundState` guard plus disabled plus `aria-busy` |
| Host listener double start guard | PASS | Synchronous ref check before any await |
| 20 second auto stop | PASS | `LISTEN_TIMEOUT_MS = 20000` |
| Unmount aborts mic and playback | PASS | Cleanup aborts controller and playback, clears timers |
| Mic denial maps to copy deck | PASS | `ERR_MIC_DENIED`, no raw error |
| Share gated on `navigator.share` | PASS | Double guard |
| Scanner routes GD2 | PASS | `GD[12]Z?\.` and `gd=` |
| Reply QR 248 level L | PASS | `marginSize={2}` |
| Card close to online height | FAIL on the letter, PASS on intent | About 186px taller. See F-05 |

---

## 3. Build and Test Proof

Run in `web/` on Node `v22.18.0`.

| Command | Exit | Result |
| :--- | ---: | :--- |
| `npm test` | 0 | 28 tests, 28 pass, 0 fail, 0 skipped |
| `npm run type-check` | 0 | Three projects clean |
| `npm run lint` | 0 | Zero errors, zero warnings |
| `npm run build` | 0 | Client 1.76s, service worker 53ms |

| Suite | Cases |
| :--- | ---: |
| `compactSdp.test.ts` | 16 |
| `acousticModem.test.ts` | 12 |
| Total | 28 |

### Chunks

| Artifact | Raw | Gzip |
| :--- | ---: | ---: |
| `vendor-react` | 218.75 kB | 68.27 kB |
| `index` | 249.02 kB | 71.84 kB |
| `QrScannerModal` | 149.50 kB | 53.93 kB |
| `vendor-peerjs` | 86.67 kB | 23.14 kB |
| `vendor-qr` | 16.17 kB | 6.01 kB |
| `index.css` | 56.59 kB | 10.82 kB |
| `rolldown-runtime` | 0.72 kB | 0.42 kB |
| `sw.mjs` | 18.64 kB | 6.38 kB |
| Precache | 18 entries, 764.02 KiB | |

`jsqr` still appears only in the async `QrScannerModal` chunk. `web/package-lock.json` untouched.

### Version

| Location | Value |
| :--- | :--- |
| `web/package.json` | `0.17` |
| `APP_VERSION` | `0.17` |
| `CHANGELOG_RELEASES[0]` | `0.17`, `26 Oct 2026, 7:40 PM`, only `isCurrent` |

---

## 4. Findings

| ID | Sev | Finding | Owner | Fix |
| :--- | :--- | :--- | :--- | :--- |
| F-01 | P2 | `docs/06` has no GD2 or acoustic record and D-016 still claims the token is 110 to 180 chars and only GD1 shapes exist | orchestrator + backend | Add the protocol subsection and a locked decision, correct D-016 |
| F-02 | P2 | Capture needs a secure context, so on an `http://192.168.x.x` host the listen button is hidden, but the guest still offers `Send Reply with Sound`, promising a link nobody can hear | web | Hide the guest sound CTA when `window.isSecureContext` is false, or name the working path |
| F-03 | P2 | The join code field uses `autoCapitalize="characters"` and an uppercase class, so typing a case sensitive `GD2.` body corrupts it | web | Offline codes must preserve case in that field |
| F-04 | P2 | `node --test .test-build` runs only `test/index.js`, so an unimported suite is silently skipped | backend | Run the glob `.test-build/test/*.test.js` instead |
| F-05 | P2 | Offline card is about 186px taller than online, largely the 288 QR panel plus 152px of controls | orchestrator | Reword the acceptance line, or trim the panel and note |
| F-06 | P3 | `decodeCompactSdpSync` accepts GD2 and GD1 but throws on GD1Z, while the brief says all three | backend | Document the split in the module header and docs |
| F-07 | P3 | Abort during `context.resume()` or synthesis is ignored, so the burst still plays | backend | Re-check the signal before `start()` |
| F-08 | P3 | Stop during `addModule` can attach a worklet to an already closed context and keep a closure | backend | Check the closed flag after `addModule` |
| F-09 | P3 | Stopping while the permission prompt is open can still raise the mic denied toast. The 20s timer starts at tap, not when the mic opens | web | Ignore errors after abort, start the timer on listen ready, soft line for `mic-unavailable` |
| F-10 | P3 | The guest pill is disabled while sending, so it leaves the tab order and the sending label is not announced | web | Keep it enabled with the internal guard, or announce in the live region |
| F-11 | P3 | Tests guard only 0.5 percent noise, not the 5 and 8 percent results or the 240 byte case | backend | Parameterise noise and cap cases |
| F-12 | P3 | Full 6s demod costs about 43ms per 250ms on this laptop, main thread | backend | Measure on a phone, try a shorter first window |
| F-13 | P3 | `AGENTS.md` baseline and `docs/07` have no step 15 entry | orchestrator | Update both |
| F-14 | P3 | `docs/02` rule 3 still says the guest card has only `Copy code instead` | ui-polish | Rewrite the rule |
| F-15 | P3 | `Sound sent. Waiting for the link...` gave no fallback hint and no retry. Now `Sound sent. No link? Show the code.` | ui-polish | Fixed |

No P0, no P1.

---

## 5. Named Risk Judgements

1. **Acoustic reliability.** Ship enabled by default, no first use modal, conditional on F-02 and F-15. The button only exists where capture works and every fallback stays mounted.
2. **GD2 at 115 chars.** Acceptable. 86 was impossible because the 32 byte fingerprint and the 16 to 32 byte ICE password are mandatory. The QR improvement is real.
3. **Space grouping, case sensitive.** Defensible because spaces cannot collide with base64url and the round trip is exact. Fix F-03 so manual entry is not actively corrupted.
4. **Single test entry.** Real false green, one line fix, verified with a control fixture.
5. **Offline height.** Structural, not slack. Either reword or trim about 66px.

---

## 6. Gate Results

| Gate | Result |
| :--- | :--- |
| 1 Brand tokens, Laroka, nav, squiggle draw | PASS |
| 2 Copy, zero em dash, en dash, emoji | PASS, docs rule drift is F-14 |
| 3 Wire protocol and 16KB chunking | PASS, untouched |
| 4 TTL and memory | PASS, worklet URL revoked |
| 5 PWA, share target, QR scanner | PASS, GD2 routed |
| 6 Responsive, reduced motion, build | PASS, layout by budget only |

---

## 7. Manual Two Device Script

1. Both devices show `v0.17`.
2. Host: `No internet`. Confirm invite QR, short code note, scan and listen pills, one inline paste pill, copy invite. No tall stacked form.
3. Guest scans the invite. Reply card shows `Send Reply with Sound`, QR, `Copy Code`, and `Share Code` on a phone.
4. Host scans the reply QR. Both link.
5. Guest copies the reply, pastes it grouped into the host paste row. Both link, proving spaces round trip.
6. Host taps `Listen for Sound`. Browser asks for the mic, pill becomes `Stop Listening`, listening line shows.
7. Guest taps `Send Reply with Sound`. Expect `Playing sound wave...`, a burst of about 3 seconds, then `Sound sent. No link? Show the code.`, and the devices link with no second tap.
8. Repeat 5 times at 30cm, 3 at 1m, 2 at 2m. Below 8 of 10 inside 1m blocks the default-on decision.
9. Repeat with a fan or music, phone at maximum volume, and phone at 50 percent.
10. Tap `Stop Listening` immediately after starting. Mic indicator off within a second, no error.
11. Leave listening for 20 seconds. It stops itself, mic off, no error.
12. Navigate away while listening. Mic indicator off.
13. Deny the mic permission and start listening. Expect `Microphone is off` with the camera and paste paths still usable.
14. Mute the phone and send the burst. No link, sent label shows, all fallbacks available, nothing stuck.
15. Paste a `GD1.` or `GD1Z.` token from a `v0.16` session. Still links.
16. Close both tabs. No mic indicator, no audio.

Record pass or fail per line with device models, distance, and room description.

---

## 8. Sign-off

**PASS.** 0 P0, 0 P1, 5 P2, 10 P3, 28 of 28 tests, 6 of 6 gates.

Conditions:
1. F-01 and F-13 are documentation of record and must land before the next main push.
2. F-02, F-03 and F-04 are user visible or false green and belong in the same batch.
3. Section 7 must be run on two real devices before the sound path is described as working.

**Signed:** `@ghostdrop-qa`, read-only, 2026-10-26.

---

## 9. Post-Audit Remediation (2026-10-26)

Every finding above was addressed in the same session, before commit. Re-verified with `npm test`, `npm run type-check`, `npm run lint` and `npm run build`, all exit 0, 31 of 31 tests.

| ID | Status | Evidence |
| :--- | :--- | :--- |
| F-01 | FIXED | `docs/06-protocol-and-tech-spec.md` now records the three token shapes, the GD2 byte table, the 92 to 159 char envelope and the acoustic frame. `decisions.md` D-022 locks both. D-016 is superseded by the recorded 282 to 423 char GD1 range |
| F-02 | FIXED | Guest sound CTA renders only when `window.isSecureContext` is true. On an insecure LAN origin the guest sees the QR, Copy and Share only |
| F-03 | FIXED | Offline-looking input keeps its exact case, `autoCapitalize="none"`, no uppercase transform, room code field unchanged |
| F-04 | FIXED | Runner now executes `.test-build/test/*.test.js` with a glob, plus guards for zero compiled tests and stale output. `test/index.ts` deleted. A probe suite that no file imported was picked up |
| F-05 | ACCEPTED AND TRIMMED | QR 264 to 248, panel 288 to 272, about 8px at 360 and 16px on desktop reclaimed. The remaining ~174px delta is structural and the brief acceptance line was amended in section 8 |
| F-06 | FIXED | Module header and `docs/06` state that the sync decoder handles GD2 and GD1 and throws on GD1Z by design |
| F-07 | FIXED | Abort re-checked after resume and synthesis and immediately before `start()`, so an aborted burst never plays or announces |
| F-08 | FIXED | Closed flag checked after `addModule` and again after node creation, with the fallback attach also gated |
| F-09 | FIXED | Errors ignored after abort, 20 second timer starts when listening is actually ready, `mic-unavailable` maps to the playful mic copy |
| F-10 | FIXED | Guest pill stays enabled and focusable, internal sending guard absorbs a second tap, no double announcement |
| F-11 | FIXED | Tests now cover 0, 2, 5 and 8 percent noise, a 1.002 clock stretch and the full 240 byte payload |
| F-12 | OPEN, manual | Main thread demod cost needs a measurement on the target phone. Not release blocking at the current 115 byte payload |
| F-13 | FIXED | `AGENTS.md` baseline is `0.17` and `docs/07-build-order.md` gains steps 14 and 15 with the 15 gate count |
| F-14 | FIXED | `docs/02` rule 3 now describes the sound CTA plus the two copy pills and the current paste key |
| F-15 | FIXED | Sent line is now `Sound sent. No link? Show the code.`, 35 chars, mirrored in the copy doc |

**Final state:** 0 P0, 0 P1, 0 open P2. One open P3 (F-12) and the manual real-room sound verification in section 7. Verdict remains PASS.

---

## 10. v0.18 Direction Change: Offline Demoted, Share Added

After the first 0.17 build the user confirmed sound works but is unpleasant to hear, and asked for Bluetooth instead. Research rejected Web Bluetooth for a PWA: the spec is central role only, a site cannot advertise or run a GATT server, and Safari, iOS and Firefox have no support. Bluetooth pairing would need a native peripheral, and files would still travel over WebRTC.

The user then chose to demote sound and add the OS share sheet, then asked that offline stop being a two-option toggle at the top of the card.

| Change | Result |
| :--- | :--- |
| Sound demoted | Sound moved under a `More ways to link` disclosure on both cards. The QR and the copy pair lead. |
| OS share | Guest `Share Code` and host `Share invite` use `navigator.share`, with `inviteUrl` where available. |
| Code only warning | `Sound sends the pairing code only. Your files go over Wi-Fi.` and the share equivalent show with their path. |
| Toggle removed | The `Online` / `No internet` segmented control is gone. Offline is one quiet link below the normal code, `No internet? Link directly`, with `Back to the normal code` inside. Failover still auto-switches. |
| Dead copy | The three `PAIRING_MODE_*` exports retired. |

Gates after the change: `npm test` 31 of 31, `type-check` 0, `lint` 0, `build` 0. Entry 253.75 kB, `jsqr` still isolated, precache 18 entries 769.20 KiB, zero dependencies.

Still manual: the 0.17 two device sound matrix, muted or noisy room retries, and the 360px check of the quiet link and the open `More ways` panel.
