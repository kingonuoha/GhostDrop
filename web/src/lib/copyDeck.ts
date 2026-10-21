/**
 * Playful room feedback copy deck.
 * Source: docs/02-brand-persona-and-copy.md sections 3 and 4.
 *
 * Rules enforced here:
 * - every user facing string is plain English, zero emojis, zero em dashes
 * - raw transport and protocol text never reaches the screen
 * - components render these strings, they never build their own error text
 */

import type { TtlPreset } from '../types/protocol'

export type RoomFeedbackKey =
  | 'SUCCESS_PEER_JOINED'
  | 'SUCCESS_TEXT_SENT'
  | 'SUCCESS_TEXT_RECEIVED'
  | 'SUCCESS_COPIED'
  | 'SUCCESS_COPIED_IMAGE'
  | 'SUCCESS_SAVED'
  | 'SUCCESS_SHARED'
  | 'SUCCESS_FILE_SENT'
  | 'SUCCESS_DROP_AND_NUKE'
  | 'SUCCESS_PWA_INSTALLED'
  | 'SUCCESS_SHARE_CAUGHT'
  | 'ERR_SHARE_MISSED'
  | 'ERR_ROOM_NOT_FOUND'
  | 'ERR_PEER_DISCONNECTED'
  | 'ERR_CAMERA_DENIED'
  | 'ERR_COPY_BLOCKED'
  | 'ERR_CLIPBOARD_BLOCKED'
  | 'ERR_CHUNK_INTERRUPTED'
  | 'WARN_TTL_EXPIRING_SOON'
  | 'INFO_TTL_EXPIRED'

export type RoomFeedbackTone = 'success' | 'error' | 'warning' | 'info'

export interface RoomFeedback {
  key: RoomFeedbackKey
  tone: RoomFeedbackTone
  /** Laroka display headline. */
  title: string
  /** One short reassuring line. */
  body: string
  actionLabel: string
  /** Item name used by the Poof notice, when the caller knows it. */
  itemName?: string
  /** Preset that fired the notice, when the caller knows it. */
  preset?: TtlPreset
  roomCode?: string
}

export interface FeedbackContext {
  roomCode?: string
  fileName?: string
  itemName?: string
  preset?: TtlPreset
}

const FALLBACK_ITEM = 'that item'

function poofBody(preset: TtlPreset | undefined, itemName: string | undefined): string {
  const name = itemName ?? FALLBACK_ITEM

  switch (preset) {
    case 'BURN_ON_COPY':
      return `You copied it once, so we cleaned up ${name} for you.`
    case '15m':
      return `15 minutes passed, so we cleaned up ${name} for you.`
    case '24h':
      return `24 hours passed, so we cleaned up ${name} for you.`
    case 'TAB_CLOSE':
      return 'You closed the page, so everything was cleaned up for you.'
    case '50m':
    default:
      return `50 minutes passed, so we cleaned up ${name} for you.`
  }
}

/**
 * Builds one feedback card from a copy deck key.
 * Callers pass data (file name, room code), never a raw error message.
 */
export function buildFeedback(
  key: RoomFeedbackKey,
  context: FeedbackContext = {},
): RoomFeedback {
  const roomCode = context.roomCode
  const fileName = context.fileName
  const itemName = context.itemName

  switch (key) {
    case 'SUCCESS_PEER_JOINED':
      return {
        key,
        tone: 'success',
        title: 'Connected!',
        body: 'Your screens are linked. Pick a photo or note to send!',
        actionLabel: 'Got It',
      }
    case 'SUCCESS_TEXT_SENT':
      return {
        key,
        tone: 'success',
        title: 'Sent!',
        body: 'Your note just popped up on your other screen.',
        actionLabel: 'Done',
      }
    case 'SUCCESS_TEXT_RECEIVED':
      return {
        key,
        tone: 'success',
        title: 'New note arrived!',
        body: 'Tap copy below to use it.',
        actionLabel: 'Copy',
      }
    case 'SUCCESS_COPIED':
      return {
        key,
        tone: 'success',
        title: 'Copied!',
        body: 'Ready to paste wherever you need it.',
        actionLabel: 'Copied',
      }
    case 'SUCCESS_COPIED_IMAGE':
      // Images land on the picture clipboard, so the words name the picture.
      return {
        key,
        tone: 'success',
        title: 'Copied the picture!',
        body: 'Paste it into any app you like.',
        actionLabel: 'Copied',
      }
    case 'SUCCESS_SAVED':
      return {
        key,
        tone: 'success',
        title: 'Saved!',
        body: `${fileName ?? 'Your file'} is on this device now.`,
        actionLabel: 'Got It',
      }
    case 'SUCCESS_SHARED':
      return {
        key,
        tone: 'success',
        title: 'Off it goes!',
        body: 'Handed straight to your share sheet.',
        actionLabel: 'Done',
      }
    case 'SUCCESS_FILE_SENT':
      return {
        key,
        tone: 'success',
        title: 'All sent!',
        body: `${fileName ?? 'Your file'} is ready on your other screen.`,
        actionLabel: 'Save',
        roomCode,
      }
    case 'SUCCESS_DROP_AND_NUKE':
      return {
        key,
        tone: 'success',
        title: 'Sent and cleaned up!',
        body: `${fileName ?? 'Your file'} is safe on your computer and removed here.`,
        actionLabel: 'Done',
        roomCode,
      }
    case 'SUCCESS_PWA_INSTALLED':
      return {
        key,
        tone: 'success',
        title: 'Added to your phone!',
        body: 'Next time, open GhostDrop right from your home screen.',
        actionLabel: 'Great!',
      }
    case 'SUCCESS_SHARE_CAUGHT':
      // Source: docs/design.md section 6.1 PWA Share Target Received.
      return {
        key,
        tone: 'success',
        title: 'Caught it from your share sheet!',
        body: 'Ready to beam this straight to your connected room.',
        actionLabel: 'Beam Now',
      }
    case 'ERR_SHARE_MISSED':
      return {
        key,
        tone: 'error',
        title: 'That share slipped away',
        body: 'Pick the file again, or drop it right here. Nothing was kept.',
        actionLabel: 'Got It',
      }
    case 'ERR_ROOM_NOT_FOUND':
      return {
        key,
        tone: 'error',
        title: 'Hmm, check that code',
        body: `We could not find ${roomCode ? `#${roomCode}` : 'that room'}. Check the 6 letters and try again!`,
        actionLabel: 'Try Again',
        roomCode,
      }
    case 'ERR_PEER_DISCONNECTED':
      return {
        key,
        tone: 'error',
        title: 'Screen disconnected',
        body: 'Your other screen closed the page. Tap below to reconnect!',
        actionLabel: 'Reconnect',
      }
    case 'ERR_CAMERA_DENIED':
      return {
        key,
        tone: 'error',
        title: 'No camera? No problem!',
        body: 'Just type the 6-letter code shown on your other screen below.',
        actionLabel: 'Type Code',
      }
    case 'ERR_CHUNK_INTERRUPTED':
      return {
        key,
        tone: 'error',
        title: 'Almost there! Tap to retry',
        body: 'The connection blinked while sending. Tap below to finish!',
        actionLabel: 'Send Again',
      }
    case 'ERR_COPY_BLOCKED':
      return {
        key,
        tone: 'error',
        title: 'Almost there! Tap to retry',
        body: 'Your browser held on to the code. Tap copy once more!',
        actionLabel: 'Try Again',
      }
    case 'ERR_CLIPBOARD_BLOCKED':
      // The note and picture clipboard path. The room code keeps ERR_COPY_BLOCKED.
      return {
        key,
        tone: 'error',
        title: 'Almost there! Tap to retry',
        body: 'Your browser blocked that copy. Tap once more!',
        actionLabel: 'Try Again',
      }
    case 'WARN_TTL_EXPIRING_SOON':
      return {
        key,
        tone: 'warning',
        title: 'Disappearing in 1 minute',
        body: `Save ${itemName ?? 'it'} now if you still want to keep it!`,
        actionLabel: 'Save Now',
        itemName,
      }
    case 'INFO_TTL_EXPIRED':
      return {
        key,
        tone: 'info',
        title: 'Poof! All gone.',
        body: poofBody(context.preset, itemName),
        actionLabel: 'Okay',
        itemName,
        preset: context.preset,
      }
    default:
      return {
        key,
        tone: 'info',
        title: 'Poof! All gone.',
        body: poofBody(context.preset, itemName),
        actionLabel: 'Okay',
        itemName,
        preset: context.preset,
      }
  }
}

/** Short plain English label for a preset, used on timer pills. */
export function ttlPresetLabel(preset: TtlPreset): string {
  switch (preset) {
    case 'BURN_ON_COPY':
      return 'Delete after 1st copy'
    case '15m':
      return '15 mins'
    case '24h':
      return '24 hours'
    case 'TAB_CLOSE':
      return 'When I close this page'
    case '50m':
    default:
      return '50 mins'
  }
}
