/**
 * GhostDrop: In-App Feedback Pipeline Client
 *
 * Submits user thoughts, bugs, and feature requests directly to a Google Sheets
 * endpoint (via Google Apps Script Web App).
 *
 * Architecture and Decisions:
 * - decisions.md D-018: In-App Feedback intake via Google Sheets.
 * - Zero database overhead, zero email clutter, instant spreadsheet visibility.
 * - Graceful fallback if endpoint is not configured or network request fails.
 * - Zero emojis, zero em dashes.
 */

import { APP_VERSION } from './constants'
import { detectDeviceType } from './device'
import type { DeviceType } from '../types/protocol'

export type FeedbackCategory = 'feature_request' | 'general_feedback'

export interface FeedbackPayload {
  category: FeedbackCategory
  message: string
  version?: string
  device?: DeviceType
  timestamp?: string
}

export interface FeedbackResult {
  success: boolean
  error?: string
}

/**
 * Resolves the configured Google Apps Script Web App endpoint URL.
 * Checks VITE_FEEDBACK_SHEETS_URL and VITE_FEEDBACK_URL.
 */
export function getFeedbackEndpointUrl(): string | null {
  const envUrl =
    import.meta.env.VITE_FEEDBACK_SHEETS_URL ||
    import.meta.env.VITE_FEEDBACK_URL ||
    ''

  const trimmed = envUrl.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Submits user feedback to the Google Sheets endpoint.
 *
 * Note on CORS with Google Apps Script:
 * Google Apps Script Web Apps redirect (HTTP 302) on POST requests.
 * Sending with mode: 'no-cors' and Content-Type: 'text/plain;charset=utf-8'
 * ensures the browser delivers the payload without blocking on preflight OPTIONS,
 * and the Google Apps Script doPost handler parses the body reliably.
 *
 * If the endpoint URL is not configured yet (e.g. during local evaluation),
 * this function logs a console notice and returns { success: true } so UI modals
 * can complete their flow without crashing or blocking the user.
 */
export async function sendFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
  const endpoint = getFeedbackEndpointUrl()

  const normalizedPayload: Required<FeedbackPayload> = {
    category: payload.category,
    message: payload.message.trim(),
    version: payload.version || APP_VERSION,
    device: payload.device || detectDeviceType(),
    timestamp: payload.timestamp || new Date().toISOString(),
  }

  if (!normalizedPayload.message) {
    return {
      success: false,
      error: 'Feedback message cannot be empty.',
    }
  }

  // Graceful fallback when endpoint is unset
  if (!endpoint) {
    console.warn(
      '[GhostDrop Feedback] VITE_FEEDBACK_SHEETS_URL is not set. Submission simulated:',
      normalizedPayload,
    )
    return { success: true }
  }

  try {
    // text/plain avoids CORS preflight OPTIONS rejection in Google Apps Script
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(normalizedPayload),
    })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network request failed.'
    console.error('[GhostDrop Feedback] Failed to submit feedback:', message)
    return {
      success: false,
      error: message,
    }
  }
}
