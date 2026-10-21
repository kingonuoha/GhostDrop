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

/** Trims a long note or link to one readable line for a feed card. */
export function shortenText(value: string, maxLength = 72): string {
  const singleLine = value.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= maxLength) return singleLine
  return `${singleLine.slice(0, maxLength - 1).trimEnd()}...`
}
