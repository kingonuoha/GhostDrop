/**
 * GhostDrop local signaling helper for Vite dev and preview.
 *
 * Source: decisions.md D-014 item 2 and
 * docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/backend-task.md.
 *
 * What lives here:
 * 1. An in-process PeerJS signaling server on 127.0.0.1:9000, so Vite can proxy
 *    `/peerjs` over the single port the user already opened. A phone on the
 *    same Wi-Fi or hotspot never touches port 9000, and Windows Firewall never
 *    sees a second inbound port.
 * 2. `GET /__ghostdrop/lan-info`, which reports the host machine's real
 *    LAN/hotspot IPv4 addresses so a QR code never encodes `localhost`.
 * 3. Optional zero-dependency self-signed TLS, generated with node:crypto, so a
 *    phone on plain http://10.x.x.x gets a secure context and the camera prompt.
 *
 * Zero new packages, zero em dashes, zero emojis.
 */

import { generateKeyPairSync, randomBytes, sign } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer as createNetServer, createConnection } from 'node:net'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

import type { Connect, Plugin } from 'vite'

/** Port the embedded and the standalone (`npm run signal`) signaling server use. */
export const GHOSTDROP_SIGNAL_PORT = 9000
/** Loopback only: every device reaches signaling through the Vite proxy. */
const GHOSTDROP_SIGNAL_HOST = '127.0.0.1'
const GHOSTDROP_SIGNAL_PATH = '/peerjs'
const LAN_INFO_PATH = '/__ghostdrop/lan-info'

/** Adapter names that are virtual, tunnel or link-local only. */
const VIRTUAL_ADAPTER_PATTERN =
  /vEthernet|vethernet|Hyper-V|WSL|VirtualBox|VMware|Loopback|Teredo|Docker|Bluetooth|Npcap|Tailscale|ZeroTier|OpenVPN|Hamachi/i

/** Adapter names that are usually the real Wi-Fi or wired link. */
const PHYSICAL_ADAPTER_PATTERN = /Wi-?Fi|WLAN|Wireless|Ethernet|eth\d|en\d|wlp|Local Area Connection/i

export interface LanCandidate {
  name: string
  address: string
  url: string
}

export interface LanInfo {
  candidates: LanCandidate[]
  port: number
  protocol: 'http' | 'https'
}

function isIpv4(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(value)
}

function isLinkLocal(address: string): boolean {
  return address.startsWith('169.254.')
}

/**
 * Lower score wins. Hotspot subnets come first because that is the topology
 * where a wrong IP breaks the whole session, then physical adapters, then the
 * remaining private ranges, then anything public.
 */
function scoreSubnet(address: string): number {
  if (address.startsWith('192.168.43.')) return 0
  if (address.startsWith('192.168.137.')) return 1
  if (address.startsWith('172.20.10.')) return 2
  if (address.startsWith('10.')) return 3
  if (address.startsWith('192.168.')) return 4
  if (address.startsWith('172.')) return 5
  return 9
}

function isLoopbackName(name: string): boolean {
  return /loopback/i.test(name)
}

/**
 * Enumerates every usable IPv4 interface. Never throws: a platform that hides
 * `networkInterfaces()` still gets an empty list instead of a broken endpoint.
 */
export function collectLanCandidates(
  port: number,
  protocol: 'http' | 'https',
): LanCandidate[] {
  let interfaces: ReturnType<typeof networkInterfaces>
  try {
    interfaces = networkInterfaces()
  } catch {
    return []
  }

  const candidates: LanCandidate[] = []

  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries) continue
    if (VIRTUAL_ADAPTER_PATTERN.test(name) || isLoopbackName(name)) continue

    for (const entry of entries) {
      const family = String(entry.family)
      if (family !== 'IPv4' && family !== '4') continue
      if (entry.internal) continue
      if (!isIpv4(entry.address)) continue
      if (isLinkLocal(entry.address)) continue

      candidates.push({
        name,
        address: entry.address,
        url: `${protocol}://${entry.address}:${port}`,
      })
    }
  }

  return candidates.sort((left, right) => {
    const bySubnet = scoreSubnet(left.address) - scoreSubnet(right.address)
    if (bySubnet !== 0) return bySubnet

    const leftPhysical = PHYSICAL_ADAPTER_PATTERN.test(left.name) ? 0 : 1
    const rightPhysical = PHYSICAL_ADAPTER_PATTERN.test(right.name) ? 0 : 1
    if (leftPhysical !== rightPhysical) return leftPhysical - rightPhysical

    const byName = left.name.localeCompare(right.name)
    if (byName !== 0) return byName
    return left.address.localeCompare(right.address)
  })
}

function readRequestPort(hostHeader: string, protocol: 'http' | 'https'): number {
  const trimmed = hostHeader.trim()
  if (trimmed.length > 0) {
    const ipv6 = /^\[[^\]]+\]:(\d+)$/.exec(trimmed)
    if (ipv6) return Number(ipv6[1])
    const tail = /:(\d+)$/.exec(trimmed)
    if (tail) return Number(tail[1])
  }
  return protocol === 'https' ? 443 : 80
}

function isSecureRequest(req: { socket?: unknown }): boolean {
  const socket = req.socket as { encrypted?: boolean } | undefined
  return socket?.encrypted === true
}

function respondJson(res: {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Fail soft on every path: the endpoint always answers valid JSON with a
 * candidates array, because the QR panel treats it as optional decoration.
 */
function createLanInfoMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const rawUrl = req.url ?? ''
    if (!rawUrl.startsWith(LAN_INFO_PATH)) {
      next()
      return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      respondJson(res, 405, { candidates: [], port: 0, protocol: 'http', error: 'METHOD_NOT_ALLOWED' })
      return
    }

    try {
      const protocol: 'http' | 'https' = isSecureRequest(req) ? 'https' : 'http'
      const hostHeader = typeof req.headers.host === 'string' ? req.headers.host : ''
      const port = readRequestPort(hostHeader, protocol)
      const payload: LanInfo = {
        candidates: collectLanCandidates(port, protocol),
        port,
        protocol,
      }
      respondJson(res, 200, payload)
    } catch {
      respondJson(res, 200, { candidates: [], port: 0, protocol: 'http' })
    }
  }
}

function probePortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createNetServer()
    probe.once('error', () => {
      resolve(false)
    })
    probe.once('listening', () => {
      probe.close(() => resolve(true))
    })
    probe.listen(port, host)
  })
}

/**
 * A `npm run signal` terminal binds 0.0.0.0:9000, which Windows happily shares
 * with a 127.0.0.1 bind, so a bind probe alone cannot see it. A short connect
 * probe catches both bind styles and keeps a single signaling realm.
 */
function probePortAnswered(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host })
    const finish = (answered: boolean) => {
      socket.destroy()
      resolve(answered)
    }
    socket.setTimeout(400)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

type PeerServerStatus = 'idle' | 'running' | 'reused' | 'failed' | 'starting'

let peerServerStatus: PeerServerStatus = 'idle'

/**
 * Starts the embedded signaling server once per Vite process.
 * A standalone `npm run signal` already on port 9000 is reused instead of
 * crashing, so both workflows stay valid.
 */
export async function ensureEmbeddedPeerServer(
  log: (message: string) => void,
): Promise<PeerServerStatus> {
  if (peerServerStatus === 'running' || peerServerStatus === 'reused') return peerServerStatus
  if (peerServerStatus === 'starting') return peerServerStatus

  peerServerStatus = 'starting'

  const answered = await probePortAnswered(GHOSTDROP_SIGNAL_PORT, GHOSTDROP_SIGNAL_HOST)
  const free = answered ? false : await probePortFree(GHOSTDROP_SIGNAL_PORT, GHOSTDROP_SIGNAL_HOST)
  if (answered || !free) {
    peerServerStatus = 'reused'
    log(
      `GhostDrop signaling: port ${GHOSTDROP_SIGNAL_PORT} is already in use, reusing that server on ${GHOSTDROP_SIGNAL_PATH}.`,
    )
    return peerServerStatus
  }

  try {
    const { PeerServer } = await import('peer')
    PeerServer({
      port: GHOSTDROP_SIGNAL_PORT,
      host: GHOSTDROP_SIGNAL_HOST,
      path: '/',
      key: 'peerjs',
      proxied: true,
    })
    peerServerStatus = 'running'
    log(
      `GhostDrop signaling ready at ${GHOSTDROP_SIGNAL_PATH} on the app port (internal ${GHOSTDROP_SIGNAL_HOST}:${GHOSTDROP_SIGNAL_PORT}).`,
    )
  } catch {
    peerServerStatus = 'failed'
    log(
      'GhostDrop signaling could not start. Run npm run signal in another terminal, or reinstall with npm install.',
    )
  }

  return peerServerStatus
}

/* ------------------------------------------------------------------ */
/* Self-signed TLS with node:crypto only                               */
/* ------------------------------------------------------------------ */

interface LocalCertificate {
  key: string
  cert: string
}

function derLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length])
  const bytes: number[] = []
  let remaining = length
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff)
    remaining = Math.floor(remaining / 256)
  }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}

function derTag(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(content.length), content])
}

function derSequence(...children: Buffer[]): Buffer {
  return derTag(0x30, Buffer.concat(children))
}

function derSet(...children: Buffer[]): Buffer {
  return derTag(0x31, Buffer.concat(children))
}

function derInteger(bytes: Buffer): Buffer {
  let value = bytes
  while (value.length > 1 && value[0] === 0x00 && (value[1] & 0x80) === 0) {
    value = value.subarray(1)
  }
  if (value.length === 0) value = Buffer.from([0])
  if ((value[0] & 0x80) !== 0) value = Buffer.concat([Buffer.from([0x00]), value])
  return derTag(0x02, value)
}

function derOid(value: string): Buffer {
  const parts = value.split('.').map((part) => Number(part))
  const bytes: number[] = [parts[0] * 40 + parts[1]]
  for (const part of parts.slice(2)) {
    const chunk: number[] = [part & 0x7f]
    let remaining = Math.floor(part / 128)
    while (remaining > 0) {
      chunk.unshift((remaining & 0x7f) | 0x80)
      remaining = Math.floor(remaining / 128)
    }
    bytes.push(...chunk)
  }
  return derTag(0x06, Buffer.from(bytes))
}

function derUtf8(value: string): Buffer {
  return derTag(0x0c, Buffer.from(value, 'utf8'))
}

function derUtcTime(date: Date): Buffer {
  const pad = (value: number) => String(value).padStart(2, '0')
  const text =
    pad(date.getUTCFullYear() % 100) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  return derTag(0x17, Buffer.from(text, 'ascii'))
}

function derBoolean(value: boolean): Buffer {
  return derTag(0x01, Buffer.from([value ? 0xff : 0x00]))
}

function derOctetString(value: Buffer): Buffer {
  return derTag(0x04, value)
}

function ipv4Bytes(address: string): Buffer {
  return Buffer.from(address.split('.').map((part) => Number(part) & 0xff))
}

function derRdn(commonName: string): Buffer {
  return derSequence(derSet(derSequence(derOid('2.5.4.3'), derUtf8(commonName))))
}

function derExtension(oid: string, critical: boolean, value: Buffer): Buffer {
  const parts: Buffer[] = [derOid(oid)]
  if (critical) parts.push(derBoolean(true))
  parts.push(derOctetString(value))
  return derSequence(...parts)
}

function derSubjectAltName(hostnames: string[], addresses: string[]): Buffer {
  const names: Buffer[] = []
  for (const hostname of hostnames) {
    names.push(derTag(0x82, Buffer.from(hostname, 'ascii')))
  }
  for (const address of addresses) {
    if (!isIpv4(address)) continue
    names.push(derTag(0x87, ipv4Bytes(address)))
  }
  // ::1 so a https://localhost and https://[::1] probe both validate.
  const loopbackV6 = Buffer.alloc(16)
  loopbackV6[15] = 1
  names.push(derTag(0x87, loopbackV6))
  return derSequence(...names)
}

const ECDSA_WITH_SHA256 = derSequence(derOid('1.2.840.10045.4.3.2'))

function pemEncode(label: string, der: Buffer): string {
  const body = der.toString('base64').replace(/(.{64})/g, '$1\n')
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`
}

/**
 * Builds a v3 self-signed certificate with node:crypto only. No package, no
 * openssl, no shell. Callers must wrap this in try/catch: if any platform
 * detail changes, plain HTTP dev stays the fallback.
 */
function createSelfSignedCertificate(
  hostnames: string[],
  addresses: string[],
): LocalCertificate {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const spki = publicKey.export({ type: 'spki', format: 'der' })

  const now = Date.now()
  const notBefore = new Date(now - 24 * 60 * 60 * 1000)
  const notAfter = new Date(now + 825 * 24 * 60 * 60 * 1000)

  const extensions = derSequence(
    derExtension('2.5.29.19', true, derSequence()),
    derExtension(
      '2.5.29.37',
      false,
      derSequence(derOid('1.3.6.1.5.5.7.3.1'), derOid('1.3.6.1.5.5.7.3.2')),
    ),
    derExtension('2.5.29.17', false, derSubjectAltName(hostnames, addresses)),
  )

  const name = derRdn('GhostDrop Local Dev')
  const tbs = derSequence(
    derTag(0xa0, derInteger(Buffer.from([2]))),
    derInteger(randomBytes(16)),
    ECDSA_WITH_SHA256,
    name,
    derSequence(derUtcTime(notBefore), derUtcTime(notAfter)),
    name,
    spki,
    derTag(0xa3, extensions),
  )

  const signatureValue = sign('sha256', tbs, privateKey)
  const certificate = derSequence(
    tbs,
    ECDSA_WITH_SHA256,
    derTag(0x03, Buffer.concat([Buffer.from([0x00]), signatureValue])),
  )

  return {
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    cert: pemEncode('CERTIFICATE', certificate),
  }
}

const CERT_DIRECTORY = fileURLToPath(new URL('./.certs/', import.meta.url))
const CERT_KEY_FILE = join(CERT_DIRECTORY, 'ghostdrop-dev-key.pem')
const CERT_FILE = join(CERT_DIRECTORY, 'ghostdrop-dev-cert.pem')

/**
 * Resolves optional TLS for dev and preview. Returns undefined when disabled or
 * when generation fails, and never throws, so `npm run dev`, `npm run build`
 * and `npm run preview` keep working with zero TLS configuration.
 */
export function resolveLocalHttps(
  enabled: boolean,
  log: (message: string) => void,
): { key: string; cert: string } | undefined {
  if (!enabled) return undefined

  try {
    if (existsSync(CERT_KEY_FILE) && existsSync(CERT_FILE)) {
      return {
        key: readFileSync(CERT_KEY_FILE, 'utf8'),
        cert: readFileSync(CERT_FILE, 'utf8'),
      }
    }

    const addresses = collectLanCandidates(443, 'https').map((candidate) => candidate.address)
    const hostnames = ['localhost', 'ghostdrop.local']
    const generated = createSelfSignedCertificate(hostnames, ['127.0.0.1', ...addresses])

    mkdirSync(CERT_DIRECTORY, { recursive: true })
    writeFileSync(CERT_KEY_FILE, generated.key, { mode: 0o600 })
    writeFileSync(CERT_FILE, generated.cert, { mode: 0o644 })

    log(
      'GhostDrop HTTPS: self signed certificate created in web/.certs. Open the https URL once and accept the browser warning, then the phone camera works.',
    )
    return generated
  } catch {
    log(
      'GhostDrop HTTPS: could not create a local certificate, so the server stays on plain http. Remove web/.certs and try again.',
    )
    return undefined
  }
}

/* ------------------------------------------------------------------ */
/* Vite plugin                                                         */
/* ------------------------------------------------------------------ */

function createStatsMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const rawUrl = req.url ?? ''
    if (!rawUrl.startsWith('/api/stats')) {
      next()
      return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      respondJson(res, 405, { error: 'METHOD_NOT_ALLOWED' })
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
    res.end(JSON.stringify({ totalTeleports: 0, activeRooms: 1 }))
  }
}

function attachSignaling(server: { middlewares: Connect.Server }, log: (message: string) => void): void {
  server.middlewares.use(createLanInfoMiddleware())
  server.middlewares.use(createStatsMiddleware())
  void ensureEmbeddedPeerServer(log)
}

/**
 * Serves `/peerjs` signaling and `/__ghostdrop/lan-info` on the same host and
 * port as the app for both `npm run dev` and `npm run preview`.
 * `apply: 'serve'` keeps `vite build` free of any listening socket.
 */
export function ghostdropLocalSignalingPlugin(): Plugin {
  const log = (message: string) => {
    console.log(`[ghostdrop] ${message}`)
  }

  return {
    name: 'ghostdrop-local-signaling',
    apply: 'serve',
    configureServer(server) {
      attachSignaling(server, log)
    },
    configurePreviewServer(server) {
      attachSignaling(server, log)
    },
  }
}
