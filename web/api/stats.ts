/**
 * GhostDrop: Public Aggregate Stats Serverless Function
 *
 * Endpoint: /api/stats
 * Caches aggregate teleport count from PostHog Query API.
 * Never exposes private PostHog API keys to client browsers.
 *
 * Architecture and Decisions:
 * - decisions.md D-017: Privacy-First PostHog Analytics and Public Stats Counter API.
 * - Cache-Control: public, s-maxage=600, stale-while-revalidate=1200
 * - Fallback defaults if POSTHOG_API_KEY is not configured or query fails.
 * - Zero emojis, zero em dashes.
 */

export interface StatsResponse {
  totalTeleports: number
  activeRooms: number
}

export const FALLBACK_STATS: StatsResponse = {
  totalTeleports: 0,
  activeRooms: 1,
}

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

/**
 * Queries the total number of file_teleported events from PostHog.
 * Gracefully catches all errors and returns fallback values.
 */
export async function fetchAggregateStats(): Promise<StatsResponse> {
  const apiKey = process.env.POSTHOG_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID || '@current'
  const host = (process.env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(
    /\/+$/,
    '',
  )

  if (!apiKey) {
    return FALLBACK_STATS
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    // HogQL query for total file_teleported events
    const queryUrl = `${host}/api/projects/${projectId}/query/`
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query: "SELECT count() FROM events WHERE event = 'file_teleported'",
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(
        `[GhostDrop Stats] PostHog returned HTTP ${response.status}. Using fallback stats.`,
      )
      return FALLBACK_STATS
    }

    const data = (await response.json()) as { results?: unknown[][] }
    const rawCount = data?.results?.[0]?.[0]
    const parsedCount =
      typeof rawCount === 'number'
        ? rawCount
        : typeof rawCount === 'string'
          ? parseInt(rawCount, 10)
          : NaN

    if (!Number.isNaN(parsedCount) && parsedCount >= 0) {
      return {
        totalTeleports: parsedCount,
        activeRooms: 1,
      }
    }

    return FALLBACK_STATS
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[GhostDrop Stats] Failed to query PostHog (${message}). Using fallback stats.`)
    return FALLBACK_STATS
  }
}

interface NodeApiRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

interface NodeApiResponse {
  status?: (code: number) => NodeApiResponse
  writeHead?: (code: number, headers?: Record<string, string>) => NodeApiResponse
  setHeader?: (name: string, value: string) => NodeApiResponse
  json?: (body: unknown) => void
  end?: (chunk?: unknown) => void
}

/**
 * Universal Vercel Serverless Function handler.
 * Supports both Web Standard (Request -> Response) and Node (req, res).
 */
export default async function handler(
  _req?: NodeApiRequest | Request,
  res?: NodeApiResponse,
): Promise<Response | void> {
  const stats = await fetchAggregateStats()

  const cacheHeader = 'public, s-maxage=600, stale-while-revalidate=1200'

  // Node serverless signature: handler(req, res)
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', cacheHeader)

    const sendJson = res.json
    if (typeof res.status === 'function' && typeof sendJson === 'function') {
      res.status(200)
      sendJson(stats)
      return
    }

    if (typeof res.writeHead === 'function' && typeof res.end === 'function') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': cacheHeader,
      })
      res.end(JSON.stringify(stats))
      return
    }
  }

  // Web Standard / Edge signature: handler(request: Request): Response
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheHeader,
    },
  })
}
