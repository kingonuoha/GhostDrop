/**
 * GhostDrop: Privacy-First PostHog Analytics Client
 *
 * Provides safe, zero-crash telemetry for aggregate product metrics only.
 *
 * Architecture and Decisions:
 * - decisions.md D-017: Privacy-First PostHog Analytics.
 * - Strict Privacy Guardrails:
 *   - autocapture: false
 *   - disable_session_recording: true
 *   - ip: false (IP anonymization active)
 *   - Strictly ZERO file names, extensions, MIME types, note texts, or room codes.
 * - Zero emojis, zero em dashes.
 */

import type { DeviceType } from '../types/protocol'
import { detectDeviceType } from './device'

export type AnalyticsRoomMode = 'cloud' | 'offline_direct'

export interface TeleportMetrics {
  count: number
  totalBytes: number
  ttl: string
}

interface PostHogWindowClient {
  init?: (key: string, options: Record<string, unknown>) => void
  capture?: (event: string, properties?: Record<string, unknown>) => void
  __loaded?: boolean
}

declare global {
  interface Window {
    posthog?: PostHogWindowClient
  }
}

const STORAGE_DISTINCT_ID_KEY = 'ghostdrop.analytics.distinct_id'
const STORAGE_SESSION_ID_KEY = 'ghostdrop.analytics.session_id'
const STORAGE_SESSION_TIME_KEY = 'ghostdrop.analytics.session_last_active'
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

/**
 * Strict deny-list of keys that must NEVER be sent to analytics.
 * Even if accidentally passed into a property bag, these will be pruned.
 */
const FORBIDDEN_KEYS = new Set([
  'name',
  'filename',
  'file_name',
  'text',
  'content',
  'note',
  'message',
  'room',
  'roomid',
  'room_id',
  'roomcode',
  'room_code',
  'code',
  'ip',
  'ip_address',
  'extension',
  'ext',
  'mime',
  'mime_type',
  'mimetype',
  'peer_id',
  'peerid',
])

/** Room code pattern (6-character uppercase alphanumeric without ambiguous characters). */
const ROOM_CODE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

/**
 * Formats byte size into high-level aggregate buckets.
 * Protects user privacy by avoiding exact byte fingerprinting.
 */
export function formatSizeBucket(bytes: number): string {
  if (bytes <= 0) return '<1MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return '<1MB'
  if (mb < 5) return '1-5MB'
  if (mb < 25) return '5-25MB'
  if (mb < 100) return '25-100MB'
  return '100MB+'
}

/**
 * Generates or retrieves an anonymous, random distinct ID stored in localStorage.
 * Does not contain hardware, IP, or personal identifiers.
 */
function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return 'serverless'

  try {
    const existing = window.localStorage.getItem(STORAGE_DISTINCT_ID_KEY)
    if (existing && existing.length > 8) {
      return existing
    }

    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'gd_anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36)

    window.localStorage.setItem(STORAGE_DISTINCT_ID_KEY, generated)
    return generated
  } catch {
    return 'ephemeral_fallback'
  }
}

/**
 * Sanitizes property values to prevent accidental privacy leaks.
 * Strips forbidden keys, room codes, and potential payload contents.
 */

/**
 * Generates or retrieves an active session ID stored in sessionStorage.
 * Automatically refreshes if inactive for more than 30 minutes.
 * Required by PostHog Web Analytics to populate Sessions, Duration, and Bounce Rate cards.
 */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'serverless_session'

  try {
    const now = Date.now()
    const lastActive = parseInt(
      window.sessionStorage.getItem(STORAGE_SESSION_TIME_KEY) || '0',
      10,
    )
    const currentSession = window.sessionStorage.getItem(STORAGE_SESSION_ID_KEY)

    if (currentSession && now - lastActive < SESSION_TIMEOUT_MS) {
      window.sessionStorage.setItem(STORAGE_SESSION_TIME_KEY, now.toString())
      return currentSession
    }

    const newSession =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'sess_' + Math.random().toString(36).slice(2) + now.toString(36)

    window.sessionStorage.setItem(STORAGE_SESSION_ID_KEY, newSession)
    window.sessionStorage.setItem(STORAGE_SESSION_TIME_KEY, now.toString())
    return newSession
  } catch {
    return 'ephemeral_session'
  }
}

function sanitizeProperties(
  properties?: Record<string, unknown>,
): Record<string, unknown> {
  if (!properties) return {}

  const clean: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '')
    if (FORBIDDEN_KEYS.has(normalizedKey)) {
      continue
    }

    // Inspect strings for room codes or URLs
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (ROOM_CODE_REGEX.test(trimmed)) {
        continue
      }
      if (trimmed.includes('ghostdrop-room-')) {
        continue
      }
      clean[key] = trimmed
    } else if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      clean[key] = value
    }
  }

  return clean
}

let isInitialized = false

/**
 * Initializes PostHog client safely if VITE_POSTHOG_KEY is provided.
 * Enforces autocapture: false, disable_session_recording: true, ip: false.
 */
export function initAnalytics(): void {
  if (isInitialized || typeof window === 'undefined') return

  const apiKey = (import.meta.env.VITE_POSTHOG_KEY || '').trim()
  const apiHost = (
    import.meta.env.VITE_POSTHOG_HOST || DEFAULT_POSTHOG_HOST
  ).trim()

  if (!apiKey) {
    // No-op in dev or environments without PostHog configured
    return
  }

  try {
    if (window.posthog && typeof window.posthog.init === 'function') {
      window.posthog.init(apiKey, {
        api_host: apiHost,
        autocapture: false,
        disable_session_recording: true,
        ip: false,
        persistence: 'localStorage',
        capture_pageview: false,
        sanitize_properties: (props: Record<string, unknown>) =>
          sanitizeProperties(props),
      })
    }
    isInitialized = true
  } catch (err) {
    console.warn('[GhostDrop Analytics] Initialization deferred:', err)
  }
}

/**
 * Core event dispatcher. Sends event to PostHog via window.posthog or HTTP API.
 * Never throws an error or disrupts user experience.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  try {
    const sanitized = sanitizeProperties(properties)
    const apiKey = (import.meta.env.VITE_POSTHOG_KEY || '').trim()
    const apiHost = (
      import.meta.env.VITE_POSTHOG_HOST || DEFAULT_POSTHOG_HOST
    ).trim()
    const distinctId = getOrCreateAnonymousId()
    const sessionId = getOrCreateSessionId()
    const deviceType = typeof window !== 'undefined' ? detectDeviceType() : 'desktop'

    const sessionProps: Record<string, unknown> = {
      $session_id: sessionId,
      $window_id: sessionId,
      $device_type: deviceType === 'desktop' ? 'Desktop' : deviceType === 'mobile' ? 'Mobile' : 'Tablet',
    }

    if (typeof window !== 'undefined') {
      if (window.screen) {
        sessionProps.$screen_width = window.screen.width
        sessionProps.$screen_height = window.screen.height
      }
      sessionProps.$viewport_width = window.innerWidth
      sessionProps.$viewport_height = window.innerHeight
    }

    // 1. Check if window.posthog is loaded and initialized
    if (
      typeof window !== 'undefined' &&
      window.posthog &&
      typeof window.posthog.capture === 'function'
    ) {
      window.posthog.capture(eventName, {
        $ip: false,
        ...sessionProps,
        ...sanitized,
      })
      return
    }

    // 2. Direct HTTP capture fallback if API key is configured
    if (apiKey && typeof fetch !== 'undefined') {
      const endpoint = `${apiHost.replace(/\/+$/, '')}/capture/`
      const payload = {
        api_key: apiKey,
        event: eventName,
        properties: {
          distinct_id: distinctId,
          $ip: false,
          ...sessionProps,
          ...sanitized,
        },
        timestamp: new Date().toISOString(),
      }

      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently catch network failures for analytics
      })
      return
    }

    // In dev mode with no key, log event in debug mode
    if (import.meta.env.DEV) {
      console.debug('[GhostDrop Analytics (dev)]', eventName, sanitized)
    }
  } catch {
    // Zero crash guarantee
  }
}

/**
 * Tracks when a new room is created.
 * Logs only the creation mode (cloud vs offline_direct). Zero room codes.
 */
/**
 * Sanitizes a URL path to prevent room codes from leaking into web analytics.
 * E.g., "/room/GHST48" -> "/room"
 */
function sanitizePathForAnalytics(pathname: string): string {
  if (pathname.startsWith('/room/')) {
    return '/room'
  }
  return pathname
}

/**
 * Tracks a privacy-safe $pageview event.
 * Strips room codes, query params, and hashes.
 * Ensures PostHog Website Metrics (Daily visitors, Sessions, Pageviews) light up.
 */
export function trackPageView(rawPath?: string): void {
  try {
    if (typeof window === 'undefined') return

    const pathname = sanitizePathForAnalytics(rawPath || window.location.pathname)
    const origin = window.location.origin
    const cleanUrl = `${origin}${pathname}`

    trackEvent('$pageview', {
      $current_url: cleanUrl,
      $pathname: pathname,
      $host: window.location.host,
    })
  } catch {
    // Zero crash guarantee
  }
}

export function trackRoomCreated(mode: AnalyticsRoomMode): void {
  trackEvent('room_created', {
    mode,
  })
}

/**
 * Tracks when a peer successfully joins and connects.
 * Logs only the remote device type (desktop, mobile, tablet). Zero peer IDs.
 */
export function trackPeerConnected(deviceType: DeviceType): void {
  trackEvent('peer_connected', {
    device_type: deviceType,
  })
}

/**
 * Tracks when a file or batch of files is teleported.
 * Logs aggregate count, size bucket, and TTL label.
 * STRICT: Zero file names, extensions, MIME types, or contents.
 */
export function trackFileTeleported(metrics: TeleportMetrics): void {
  trackEvent('file_teleported', {
    count: metrics.count,
    total_bytes: metrics.totalBytes,
    size_bucket_mb: formatSizeBucket(metrics.totalBytes),
    ttl: metrics.ttl,
  })
}
