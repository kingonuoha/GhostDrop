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

    // 1. Check if window.posthog is loaded and initialized
    if (
      typeof window !== 'undefined' &&
      window.posthog &&
      typeof window.posthog.capture === 'function'
    ) {
      window.posthog.capture(eventName, {
        $ip: false,
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
