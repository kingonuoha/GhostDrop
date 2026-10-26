import type { TtlPreset } from '../types/protocol'

/**
 * Shipped app version, rendered as `v0.17` beside the GhostDrop wordmark on
 * both the desktop top pill bar and the mobile status header.
 * Source: AGENTS.md section 5, decisions.md D-014 item 1.
 */
export const APP_VERSION = '0.17'

/**
 * How long a toast stays on screen before it closes itself. The drain bar in
 * `FeedbackCard` empties over the same window, so the visible countdown and the
 * dismissal can never disagree.
 * Source: docs/tasks/step-11-improvements/web-task.md item 12.
 */
export const TOAST_AUTO_DISMISS_MS = 5000

/**
 * Prelaunch gate. Launch is 23 October 2026 at 13:00 WAT (UTC+1), which is
 * 12:00 UTC. Fixed global instant so every visitor counts to the same moment.
 */
export const LAUNCH_AT = Date.UTC(2026, 9, 23, 12, 0, 0)

/** localStorage key for the hidden unlock, see decisions.md D-015. */
export const LAUNCH_UNLOCK_KEY = 'ghostdrop.launch.unlocked'

/** Demo code for docs and manual testing, kept inside ROOM_CODE_ALPHABET per decisions.md D-013. */
export const DEMO_ROOM_CODE = 'GHST48'

export const DEFAULT_TTL_PRESET: TtlPreset = '50m'

/**
 * Auto-delete choices exactly as the copy deck names them.
 * Source: docs/02-brand-persona-and-copy.md section 2, decisions.md D-012.
 */
export const TTL_PRESET_ORDER: readonly TtlPreset[] = ['BURN_ON_COPY', '15m', '50m', 'TAB_CLOSE']

export const TTL_LABELS: Readonly<Record<TtlPreset, string>> = {
  BURN_ON_COPY: 'Delete after 1st copy',
  '15m': '15 mins',
  '50m': '50 mins',
  '24h': '24 hours',
  TAB_CLOSE: 'When I close this page',
}

/** Short dock label for the same presets. */
export const TTL_SHORT_LABELS: Readonly<Record<TtlPreset, string>> = {
  BURN_ON_COPY: '1 Copy',
  '15m': '15 Mins',
  '50m': '50 Mins',
  '24h': '24 Hours',
  TAB_CLOSE: 'On Close',
}
