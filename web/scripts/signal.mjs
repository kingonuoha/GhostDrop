/**
 * LAN signaling server for GhostDrop development.
 *
 * Why a script instead of the peerjs CLI:
 * The CLI parses `--path /` through the current shell. On Git Bash for Windows
 * that turns into `C:/Program Files/Git/`, so the client connects to `/peerjs`
 * while the server listens somewhere else. Passing the options as an object
 * keeps the path exactly `/` on every shell.
 *
 * Production still needs a hosted signaling server. See decisions.md D-014.
 */

import { PeerServer } from 'peer'

const port = Number(process.env.GHOSTDROP_SIGNAL_PORT ?? 9000)

PeerServer({
  port,
  host: '0.0.0.0',
  path: '/',
  key: 'peerjs',
  proxied: false,
})

console.log(`GhostDrop signaling ready on ws://0.0.0.0:${port}/peerjs`)
