# Offline Pairing UX Plan: One Scan, No Code Copying
**Device stamp:** `ASUS-LAPTOP-DNLA241D` - created - 2026-10-26

## 1. The Problem

Offline mode currently needs two exchanges:

1. The phone scans the computer's invite QR.
2. The computer scans the phone's reply QR, or the code is copied and pasted.

Step 2 is the friction. A laptop webcam is awkward to aim, and copying a 250 to 350 character code on a phone cannot paste into a computer while offline. The user compared this to Xender, which connects with one scan.

**Acceptance criteria for a fix**

- The phone does at most one scan.
- The computer never has to aim a camera at a phone, though it may as a fallback.
- No code is typed or pasted in the happy path.
- No internet and no server.
- Works with the existing WebRTC engine, chunking, TTL and QR code systems.

## 2. Why Xender Feels Simpler

Xender is a native app, and that changes what it is allowed to do.

- One device creates a Wi-Fi hotspot, usually the phone.
- The same device runs a small HTTP server on that hotspot.
- The QR code contains a URL such as `http://192.168.43.1:port`.
- The other device joins the hotspot, opens the URL in a browser or app, and they talk over plain HTTP.

Only one side ever needs to know anything, because one side is a server. That is why a single scan works. This is also how LocalSend works: a local REST API on port 53317 with multicast discovery, per its own documentation.

**A browser tab cannot do that.** A PWA has no listening TCP socket, no raw UDP, no multicast discovery, no mDNS advertisement, and no Bluetooth peripheral role. WebRTC is the only peer transport a PWA gets, and WebRTC requires an offer and an answer in both directions before media or data can flow.

So the two-way exchange is not a GhostDrop design flaw. It is the price of staying a PWA. The design question becomes: what is the cheapest possible return channel from the phone to the computer?

Options, in ascending order of effort: the computer's camera, the computer's microphone, a shorter typed code, or a native helper.

## 3. Options Compared

| Option | Scans | Computer hardware | Effort | Risk | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A. Camera for the second step, polished | 2 | Webcam | Low | Camera aiming still awkward | Baseline, keep as fallback |
| B. Paste field, already shipped | 2 | None | Done | Needs a way to move text offline | Keep as last resort |
| C. Sound return channel | 1 | Microphone | Medium | Browser and room noise | Recommended |
| D. Persisted certificates plus short code | 1 | Keyboard | High | Browser support for stored certificates | Research spike |
| E. Native bridge with a local server | 1 | None | High | Install friction, app stores | Strategic parity |
| F. OS share sheet to move the code | 1 to 2 | None | Low | Platform specific, still manual | Fallback copy only |

### Why sound is the strongest browser-only option

- Every laptop has a microphone, and asking for it is far less awkward than asking the user to aim the lid at a phone.
- The payload is small. A full reply token is roughly 230 to 400 characters, meaning 170 to 300 bytes after base45 decoding.
- The phone already holds the answer and can play it immediately after the scan, so the second step becomes a button tap and about a second of chirping.
- The computer can be listening the moment it shows its invite QR, so there is no extra screen to manage.

Data-over-sound libraries already exist and are proven for exactly this short payload use case.

**quiet-js (libquiet binding)**

- Ultrasonic and audible profiles. The audible profile sits around 4.2 kHz and the ultrasonic profiles around 19 kHz.
- Profiles are defined as byte-oriented with checksums and forward error correction, for example `ultrasonic-3600` with an OFDM scheme, or `audible-7k-channel-0`.
- Cable profiles reach 40 kbps, and the over-the-air profiles are designed for short payloads like this one.
- Licensing: BSD-3-Clause for quiet itself, LGPL for the recommended libfec error correction component. LGPL needs a licence review before shipping.
- Age: last meaningful activity in 2016. The code is stable but vendored Emscripten, so it must be loaded as static assets rather than imported as a modern module.

**ggwave**

- MIT licensed, maintained, tiny, and the npm package is current.
- Explicitly documented at 8 to 16 bytes per second.
- A 250 byte payload therefore takes 15 to 30 seconds. That is worse than one camera scan for most users.

**Recommendation:** prototype with quiet-js on the `audible-7k-channel-0` profile, targeting under two seconds for a full reply token. Keep ggwave out of scope because its throughput is too low for this payload.

### Why the persisted certificate idea is only a spike

Browsers expose `RTCPeerConnection.generateCertificate()`, and an `RTCCertificate` can outlive a page. If both devices remembered each other's DTLS fingerprint, the reply could drop from about 300 bytes to roughly 60 bytes of ICE material.

That is still too long to type comfortably and only saves a few seconds over sound, while adding certificate storage, migration and browser support risk. Park it. Revisit only if sound proves unreliable.

### Why native remains the only true parity

A Capacitor or Tauri build, or the planned Phase 2 Android app, can run the same local HTTP server Xender runs. That is the only route to a single scan with zero microphone and zero camera. It should be framed as the long-term parity story, not the next task.

## 4. Recommended Design: Sound Return Channel

### Flow

1. Computer opens the offline card. It shows the invite QR exactly as today and starts listening on the microphone while the card is open.
2. Phone scans the invite QR. It computes the reply as today.
3. Instead of showing a reply QR as the only option, the phone shows a primary button: `Send to computer`.
4. Tapping it plays the reply token as a short sound burst with a visible progress and volume cue.
5. The computer decodes it, validates the token with the existing `extractCompactTokenFromInput`, and finishes the handshake through `acceptOfflineToken`, unchanged.
6. On failure or unsupported hardware, the card falls back in this order: show the reply QR for the computer camera, then the paste field.

### Components

- `useSoundPairing` hook: capability detection, listen lifecycle, transmit lifecycle.
- `soundModem.ts` adapter: wraps quiet-js, encodes and decodes, exposes a promise with timeout.
- Offline card changes: a listening indicator on the computer, a `Send to computer` primary action on the phone.
- Capability gate: if `navigator.mediaDevices.getUserMedia` with audio is unavailable, or the browser is a known bad receiver, skip sound and show the existing QR path.
- Security: the sound payload is the same session SDP token, no secrets beyond the session. Add a checksum and a one-time nonce from the invite so a stray burst cannot inject an unrelated answer. Stop listening after 60 seconds or on card close.

### Permission and trust copy

Microphone access on a file transfer site is a serious ask. The copy must explain that the microphone is only used for a second or two to receive the pairing code, that no audio is recorded or stored, and that it stops as soon as linking ends. The listening state must be visible with a clear stop control.

### Browser matrix

| Browser | Transmit | Receive | Plan |
| :--- | :--- | :--- | :--- |
| Chrome and Edge desktop | Yes | Yes | Sound is primary |
| Chrome Android | Yes | Partial | Phone transmits, which is all we need |
| Firefox desktop | Yes | Audible profile only | Force the audible profile |
| Safari and iOS | Yes | No microphone path for this library | Fall back to QR and paste |

Because the phone is the transmitter and the computer is the receiver, the Matrix is favourable: the phone only ever transmits, and the computer is usually Chrome or Firefox. Safari desktops fall back to the camera.

### Risks and mitigations

| Risk | Mitigation |
| :--- | :--- |
| Room noise or a distant laptop mic | Repeat burst up to three times with rising volume, show a clear failure after that |
| Laptop speakers or mic filtering above 16 kHz | Prefer the audible 7 kHz profile over ultrasonic |
| Autoplay policy blocks playback | The phone action is a real user tap, so playback is allowed |
| Old vendored Emscripten assets | Serve from `public/sound/`, load lazily, keep them out of the entry chunk |
| LGPL review for libfec | Legal review before shipping, or test whether a no-FEC profile is reliable enough |
| Users distrust the mic | Secondary path stays one tap away, and the mic indicator is explicit |

## 5. Other Quick Wins, Independent of Sound

0. **Stop putting the offline token in the everyday QR.** The host pre-generates its offline offer on mount for fast failover, and the pairing link appended that token unconditionally, so the ordinary QR carried a 250 to 400 character payload and looked dense and hard to scan. Split the hook into a short `joinUrl` and a separate `offlineJoinUrl`, and only use the long one in the no internet view.
1. **Reply QR first on the phone.** Today the copy button sits under the QR with equal weight. Make the QR and the instruction `Point your computer camera here` the primary block, and demote copying to a text link.
2. **Pre-arm the computer camera.** Add a persistent `Scan reply` button under the invite QR with camera permission requested once. Keep the button visible while the phone is scanning.
3. **Torch and autofocus hints** in the scanner modal for QR reading at close range.
4. **Detect no camera** and reorder the card so paste is visible without scrolling, with copy that names the real constraint instead of hiding it.
5. **Share-sheet fallback copy.** When the phone copies the reply code, suggest moving it with AirDrop or Quick Share, which work offline.
6. **Swap, do not stack, the two codes.** A two-option toggle inside the pairing card, `Online` and `No internet`, keeps the card the same height. Selecting no internet swaps the QR to the long offline link at a larger size with a real quiet zone, then shows scan and paste directly beneath. The old layout appended a whole second card and grew the page.
7. **Never name a device in pairing copy.** The paste field said `from your phone` while the reader might be on the phone. Use `your other device` everywhere.

## 6. Phased Plan

### Phase 1: Quick wins, no new dependency

- Reply QR becomes the primary phone action.
- Computer card pre-arms the scanner and improves no-camera wording.
- Paste stays, discoverable.
- Gate: one manual two-device run, no gate regressions.

### Phase 2: Sound prototype behind a flag

- Vendor quiet-js assets into `public/sound/`.
- Build `soundModem.ts` and `useSoundPairing`.
- Add `Send to computer` on the phone and a listening state on the computer.
- Gate: five consecutive successful pairings on Windows Chrome plus Android Chrome in a quiet room, under three seconds median, and a clean fallback when the mic is denied.
- Version: this adds third-party code, so the whole version number moves per `AGENTS.md`.

### Phase 3: Sound as the default, with measurements

- Decide the default per browser from measured success rates.
- Keep camera and paste as visible fallbacks.
- Update online and in-app docs, `/whats-new`, and the offline copy deck.
- Gate: full six-gate QA plus a noisy-room test.

### Phase 4: Parity research

- Evaluate a Capacitor or Tauri shell that runs a local HTTP server for true one-scan pairing.
- Decide whether it is worth the install friction compared with the PWA plus sound.

## 7. Decisions Needed

1. Approve a microphone permission prompt as part of offline pairing, with explicit stop control and no recording.
2. Accept a new third-party audio dependency, and the LGPL review that comes with libfec, or restrict to a no-FEC profile.
3. Choose the default order per browser: sound, then camera, then paste, or camera first on machines with a known good webcam.
4. Confirm that Safari desktops may fall back to the camera rather than blocking offline pairing.

## 8. Sources Consulted
- Xender documentation and reviews: one device creates a local hotspot, the other joins, QR connects them, and the native app serves the transfer. `xender.org`, `xender.com/file_transfer_a2pc.html`.
- LocalSend README: local REST API over HTTPS on port 53317 with multicast discovery, native app, no internet. `github.com/localsend/localsend`.
- quiet-js README and API docs: Web Audio binding for libquiet, audible and ultrasonic profiles, cable up to 40 kbps, browser support table. `github.com/quiet/quiet-js`, `quiet.github.io/quiet-js/docs/Quiet.html`.
- quiet profiles: `ulnarasonic-3600`, `audible-7k-channel-0`, `audible`, and the FEC and modulation settings. `quiet-profiles.json`.
- ggwave README: 8 to 16 bytes per second, MIT licensed. `github.com/ggerganov/ggwave`, npm `ggwave`.

---

## 9. Bluetooth Assessment (2026-10-26)

### Verdict

Bluetooth cannot replace the sound burst in a pure PWA. Web Bluetooth only works in the central role. A website can connect to a remote GATT server, but a website cannot advertise or run a GATT server. Two browsers therefore cannot discover each other over Bluetooth, no matter what permissions the user grants.

Sources: MDN describes the API as the ability to connect and interact with Bluetooth Low Energy peripherals. The Chrome capability guide states the specification allows websites, running in the Central role, to connect to remote GATT servers. The Web Bluetooth implementation status table lists GATT server connect, read and write from the browser only.

Support is also asymmetric:

| Browser | Web Bluetooth |
| :--- | :--- |
| Chrome desktop, Edge, Opera, Samsung Internet, Android Chrome | Supported |
| Safari, iOS, iPadOS | Not supported, no plan |
| Firefox | Not supported, no plan |
| Linux Chrome | Partly, flag required |

Global coverage is about 76 percent, and the missing quarter is exactly the iPhone.

### What Bluetooth would require

One side has to be a native peripheral. The realistic shape:

1. A native Android or iOS app advertises a custom GATT service.
2. The laptop Chrome tab connects as central, reads the offer token, writes the answer token.
3. Both sides then open the WebRTC data channel over Wi-Fi or hotspot exactly as today.

Bluetooth would carry roughly 115 bytes of pairing token. It would never carry a file. The files stay on the existing 16KB WebRTC stream over Wi-Fi or the phone hotspot.

That means Bluetooth does not remove any native work compared with the Xender-style local server. It adds an app, an iOS gap, a permission chooser, custom service UUIDs and a pairing UX, to replace a sound burst that already works.

### Browser-only alternative that does use Bluetooth

The operating system share sheet. On Android, Nearby Share or Quick Share can hand a short text to a Windows laptop over Bluetooth or Wi-Fi Direct with no internet. On iPhone, AirDrop. The user still pastes the code on the other screen, but no browser API, no app and no dependency is involved. Files still go over WebRTC.

### Recommendation

1. Do not build Web Bluetooth for the PWA. It is architecturally impossible without a native peripheral.
2. Demote the sound path. It works, but it is unpleasant. Put it behind a secondary control such as `More ways to link`, default to the QR plus paste, and remember the user choice. Keep it available for camera-free laptops because it is the only browser-only one-scan path.
3. Reduce the annoyance if it stays: lower the gain, offer a near-ultrasonic profile around 17 to 19 kHz where the laptop microphone can still hear it, and shorten the burst.
4. Add the OS share sheet as the no-camera, no-sound fallback, with copy that says the pairing code only travels, never the files.
5. Revisit Bluetooth only with the planned native Phase 2 app, and then as a one-scan pairing channel with files still on WebRTC.

---

## 10. Demote the Offline Affordance (2026-10-26)

Offline mode still has rough edges, so it should not sit in a two-option control at the top of the pairing card where a first time user meets it before the normal code.

- Default card: normal QR, room code row, copy. Nothing about offline above the fold.
- Below the code row, one quiet text link: `No internet? Link directly`.
- Tapping it swaps the card into the no internet view, with one helper line and a `Back to the normal code` link.
- An automatic failover to the direct engine may still switch the card, because in that moment the normal code genuinely cannot work.
- Sound and share stay inside the existing `More ways to link` disclosure inside the offline view.
- Rationale: the common path is one QR scan with internet. Offline is a rescue path, and a rescue path should not be the first decision a user has to make.
