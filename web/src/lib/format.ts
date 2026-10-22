/**
 * Plain English formatters for the ephemeral feed.
 * Source: docs/02-brand-persona-and-copy.md section 2.
 *
 * No jargon, no emojis, no em dashes. Every string here is read by a person.
 */

const KILOBYTE = 1024

/** "1.8 MB" or "820 KB". Deliberately rounded, never a byte count. */
export function formatFileSize(bytes: number | undefined): string | null {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return null
  if (bytes < KILOBYTE) return `${Math.max(1, Math.round(bytes))} B`
  if (bytes < KILOBYTE * KILOBYTE) return `${Math.round(bytes / KILOBYTE)} KB`

  const megabytes = bytes / (KILOBYTE * KILOBYTE)
  const rounded = megabytes >= 10 ? Math.round(megabytes) : Math.round(megabytes * 10) / 10
  return `${rounded} MB`
}

/**
 * Countdown in everyday words.
 * A missing timer means burn on copy or tab close, so the label says which.
 *
 * Granularity rules (decisions.md D-014 item 4):
 * - the final minute ticks in seconds, so 59 seconds never reads "1 min left"
 * - anything under an hour ticks in minutes and seconds, so a 15 minute drop
 *   visibly moves instead of sitting on "15 mins left" for a whole minute
 */
export function formatTimeLeft(remainingMs: number | null, burnOnCopy: boolean): string {
  if (remainingMs === null) {
    return burnOnCopy ? 'Deletes after first copy' : 'Deletes when you close this page'
  }

  if (remainingMs <= 0) return 'Deleting now'

  if (remainingMs < 60_000) {
    return `${Math.max(1, Math.ceil(remainingMs / 1000))} secs left`
  }

  if (remainingMs < 3_600_000) {
    const totalSeconds = Math.ceil(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds}s left`
  }

  const hours = Math.ceil(remainingMs / 3_600_000)
  return hours === 1 ? '1 hour left' : `${hours} hours left`
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** One countdown segment, already zero padded, with its unit letter. */
export type CountdownSegment = {
  value: string
  unit: 'd' | 'h' | 'm' | 's'
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/**
 * Distance to the launch instant, as whole segments.
 *
 * The launch wall renders one fixed width cell per digit, so it needs the
 * segments before they become a string. Returning `[]` past zero is the signal
 * that the digits must be replaced by the welcome copy rather than showing a
 * frozen zero.
 *
 * Pure: no `Date.now()` inside, so the caller owns the clock.
 */
export function countdownSegments(remainingMs: number): CountdownSegment[] {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return []

  // Floor, not ceil, so the last minute reads 59s down to 00s and never 60s.
  const days = Math.floor(remainingMs / DAY_MS)
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((remainingMs % HOUR_MS) / MINUTE_MS)
  const seconds = Math.floor((remainingMs % MINUTE_MS) / 1000)

  if (days > 0) {
    return [
      { value: String(days), unit: 'd' },
      { value: pad(hours), unit: 'h' },
      { value: pad(minutes), unit: 'm' },
      { value: pad(seconds), unit: 's' },
    ]
  }

  if (hours > 0) {
    return [
      { value: pad(hours), unit: 'h' },
      { value: pad(minutes), unit: 'm' },
      { value: pad(seconds), unit: 's' },
    ]
  }

  if (minutes > 0) {
    return [
      { value: pad(minutes), unit: 'm' },
      { value: pad(seconds), unit: 's' },
    ]
  }

  // A lone seconds cell has nothing to count down to: at zero whole seconds the
  // list stays empty so a caller shows the welcome copy, never a bare `00s`.
  if (seconds === 0) return []

  return [{ value: pad(seconds), unit: 's' }]
}

/** Trims a long note or link to one readable line for a feed card. */
export function shortenText(value: string, maxLength = 72): string {
  const singleLine = value.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= maxLength) return singleLine
  return `${singleLine.slice(0, maxLength - 1).trimEnd()}...`
}
