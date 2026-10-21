/**
 * LAN and hotspot address discovery for the pairing QR code.
 * Source: decisions.md D-014 item 2, docs/tasks/step-10-v07-offline-hotspot-camera-ttl-and-ux/web-task.md item 4.
 *
 * Why this file exists: opening the hub at `http://localhost:5173` produced a QR
 * code pointing at `localhost`, so the phone scanned it and tried to reach
 * itself. The dev and preview server answers `GET /__ghostdrop/lan-info` with the
 * machine's real Wi-Fi and hotspot IPv4 addresses, and the QR code prefers one of
 * those whenever the page itself is on loopback.
 *
 * The endpoint only exists while the Vite server is running, so every read here
 * is fail soft: a production host without the middleware simply keeps the page
 * origin and nothing on screen changes.
 */

export interface LanCandidate {
  /** Adapter name, for example "Wi-Fi" or "Local Area Connection". */
  name: string
  /** IPv4 address, for example "192.168.43.1". */
  address: string
  /** Full origin, for example "http://192.168.43.1:5173". */
  url: string
}

export interface LanInfo {
  candidates: LanCandidate[]
  port: number
  protocol: 'http' | 'https'
}

const LAN_INFO_PATH = '/__ghostdrop/lan-info'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readCandidate(value: unknown): LanCandidate | null {
  if (!isRecord(value)) return null
  const name = value.name
  const address = value.address
  const url = value.url
  if (typeof name !== 'string' || name.length === 0) return null
  if (typeof address !== 'string' || address.length === 0) return null
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null
  return { name, address, url }
}

/** True when this page was opened on the machine that is serving it. */
export function isLoopbackHost(hostname: string | undefined): boolean {
  if (!hostname) return false
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

/** One fail soft read of the LAN address list. Never throws. */
export async function fetchLanInfo(): Promise<LanInfo | null> {
  if (typeof fetch !== 'function') return null
  try {
    const response = await fetch(LAN_INFO_PATH, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload: unknown = await response.json()
    if (!isRecord(payload)) return null

    const rawCandidates = Array.isArray(payload.candidates) ? payload.candidates : []
    const candidates: LanCandidate[] = []
    for (const entry of rawCandidates) {
      const candidate = readCandidate(entry)
      if (candidate) candidates.push(candidate)
    }

    const port = typeof payload.port === 'number' && Number.isFinite(payload.port) ? payload.port : 0
    const protocol = payload.protocol === 'https' ? 'https' : 'http'
    return { candidates, port, protocol }
  } catch {
    // Production builds without the dev middleware land here, which is fine.
    return null
  }
}

/**
 * Base origin the pairing QR code should encode.
 * A loopback page always prefers a real LAN or hotspot address when one exists,
 * because a QR code carrying `localhost` sends the phone to itself.
 */
export function resolveJoinOrigin(
  pageOrigin: string,
  pageHostname: string | undefined,
  candidates: readonly LanCandidate[],
  selectedUrl: string | null,
): string {
  if (!isLoopbackHost(pageHostname)) return pageOrigin
  if (selectedUrl) return selectedUrl
  return candidates[0]?.url ?? pageOrigin
}
