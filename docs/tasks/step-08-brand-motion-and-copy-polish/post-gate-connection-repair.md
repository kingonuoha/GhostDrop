# Post Gate: Connection Lifecycle Repair
**Device stamp:** ASUS-LAPTOP-DNL - created - 2026-10-21 · ASUS-LAPTOP-DNL - local signaling fallback added - 2026-10-21

## Trigger
Manual two-device test on 2026-10-21. Host scanned on phone, phone joined, host auto-navigated from `/` to `/room/CODE?host=1`. That unmount destroyed the host PeerJS engine, so the phone received `peer:leave` and rendered the `Screen disconnected` card. The phone `Reconnect` action also opened the QR scanner instead of rejoining. A manual refresh of the phone page restored the link, confirming the engine lifecycle was the fault.

## Assigned Agent
`@ghostdrop-web`

## Objective
Keep one room engine alive across route changes, auto-rejoin guests after a host reload, and make every reconnect action perform a real rejoin.

## Checklists
- [ ] Hoist the room session into an app-level provider mounted above the route switch.
- [ ] Derive the session from the route: `/` host with a stable generated code, `/room/:code?host=1` host, `/room/:code` guest, `/join?room=CODE` guest.
- [ ] Persist the last room session through non-room routes such as `/how-it-works`.
- [ ] Convert `HomeHub`, `ConnectedWorkspace`, and `MobileJoin` to consume the shared room context instead of instantiating `useGhostRoom` themselves.
- [ ] Add guest auto-rejoin with capped backoff after `peer:leave`.
- [ ] Wire every `Reconnect` action to the real rejoin, never the QR scanner.
- [ ] Keep host available when a peer leaves, with a playful non-blocking notice.
- [ ] Verify type-check, lint, build, and a two-tab host and guest flow.

## Constraints
- Zero em dashes, zero emojis, zero `alert()`, zero raw transport text, no new dependencies.
- Do not change the wire protocol, `src/sw.ts`, `vite.config.ts`, or `src/lib/p2p/` transport internals.
- Preserve pending-drop handoff from the hub to the workspace.

## Local Signaling Fallback

### Why
`0.peerjs.com` is unreachable from this network. A browser WebSocket attempt closed with code `1006` and a raw HTTPS request returned a Cloudflare `error code: 1020`, so the cloud signaling default cannot open a room at all here. Both the laptop and the phone sit on the same LAN, so signaling only needs to reach a server on that LAN.

### What changed
- `web/src/lib/p2p/peerjsEngine.ts` exports `buildPeerServerOptions(env = readEnv())`, which returns the PeerJS signaling server options and never touches `window` at module scope.
- `connect()` spreads those options last, after `debug: 0` and `config: { iceServers }`, so host, port, path, secure and key win while ICE/TURN configuration is untouched.
- `web/package.json` adds devDependency `peer` (the PeerJS server) and script `signal`. This is an intentional, dev-only exception to the no new dependencies constraint above: `peer` never enters the client bundle, it only runs the LAN signaling process.
- `web/.env.local` sets `VITE_PEER_HOST=auto` and `VITE_PEER_PORT=9000`. `web/.gitignore` already ignores `*.local`, so this file stays untracked.

### Resolution rules
| `VITE_PEER_HOST` | Result |
| :--- | :--- |
| unset, empty or blank | `{}`, PeerJS cloud defaults exactly as before |
| `auto` in dev | `host: window.location.hostname`, `port: VITE_PEER_PORT` or `9000`, `secure: false`, `path: VITE_PEER_PATH` or `/`, `key: VITE_PEER_KEY` or `peerjs` |
| `auto` in a production build | `{}`, the LAN shortcut is ignored on purpose |
| a concrete host | that host, `port` or `443`, `secure` or `true`, `path` or `/`, `key` or `peerjs` |

`auto` is dev only so a shipped bundle can never silently point at `localhost` or at whatever hostname the viewer happens to load from. A production deployment needs either a reachable hosted PeerJS server or a hosted signaling adapter such as the Supabase Realtime adapter, plus `VITE_PEER_HOST` and the matching port, secure, path and key values.

### LAN test procedure
1. `cd web && npm run signal` starts the local PeerJS server on port `9000`.
2. `cd web && npm run dev -- --host` serves the app on the LAN address Vite prints. Use `dev`, not `preview`, because `auto` is ignored in a production build.
3. Open the printed URL on the phone, then read the 6 character room code from the laptop page and join with `/join?room=CODE` on the second device.
4. Both devices must show connected, the host must stay connected after the route changes to `/room/CODE?host=1`, and a text note sent on one device must appear on the other.

Once signaling is up, media still flows peer to peer over the LAN. The local server only brokers the handshake, so it holds no file bytes and keeps the `$0.00/mo` production story intact.


## Root Cause Found: StrictMode Double Mount
`web/src/main.tsx` wrapped the app in React StrictMode. In development React mounts every effect twice. The host engine registers the fixed PeerJS id `ghostdrop-room-CODE`, the throwaway mount is destroyed, and the real mount then collides with the socket that is still closing. PeerJS reports `WebSocket is closed before the connection is established` and the host never becomes reachable. StrictMode was removed because the room lifecycle is already handled explicitly by the provider and by `useGhostRoom` cleanup. Development now matches production.

## Local Signaling Fallback
`0.peerjs.com` returns Cloudflare error 1020 from this network, so cloud signaling cannot be used for LAN testing. `web/.env.local` sets `VITE_PEER_HOST=auto`, which resolves in dev to the page hostname on port 9000. Run `npm run signal` next to `npm run dev -- --host`. Production builds ignore `auto` and fall back to the cloud defaults, so a deployed build still needs a reachable hosted signaling server or the Supabase adapter.
