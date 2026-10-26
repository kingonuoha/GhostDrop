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
  | 'SUCCESS_FILE_RECEIVED'
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
  | 'INFO_OFFLINE_READY'
  | 'INFO_OFFLINE_REPLY_READY'
  | 'ERR_OFFLINE_CODE_INVALID'
  | 'ERR_MIC_DENIED'

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
    case 'SUCCESS_FILE_RECEIVED':
      // The receiving side. The file already landed, so Save keeps it.
      return {
        key,
        tone: 'success',
        title: 'New file arrived!',
        body: `${fileName ?? 'Your file'} just landed on your screen.`,
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
    case 'INFO_OFFLINE_READY':
      // Offline direct step one. The words never name the transport.
      return {
        key,
        tone: 'info',
        title: 'Offline link ready!',
        body: 'No internet needed. Scan the QR code, then scan the reply QR from your other screen.',
        actionLabel: 'Got It',
      }
    case 'INFO_OFFLINE_REPLY_READY':
      // Offline direct step two. The guest holds the screen the host reads.
      return {
        key,
        tone: 'success',
        title: 'Almost linked!',
        body: 'Show this reply QR code to your other screen (or copy the reply code) to finish linking.',
        actionLabel: 'Copy code instead',
      }
    case 'ERR_OFFLINE_CODE_INVALID':
      return {
        key,
        tone: 'error',
        title: 'Hmm, check that offline code',
        body: 'That offline link code looks incomplete. Copy it again from your other screen!',
        actionLabel: 'Try Again',
      }
    case 'ERR_MIC_DENIED':
      // Sound is always a shortcut, never the only door, so this points at the
      // two paths that still work. Source: docs/02-brand-persona-and-copy.md 2.2.
      return {
        key,
        tone: 'error',
        title: 'Microphone is off',
        body: 'No problem! Scan the reply code with your camera or paste it below.',
        actionLabel: 'Got It',
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

/*
  Prelaunch coming soon wall.
  Source: docs/02-brand-persona-and-copy.md section 2.1, decisions.md D-015.

  These strings are the whole visible teaser. None of them hints at how the
  wall unlocks: the gesture stays invisible by design, and the welcome line is
  the only post launch string.
*/
export const SOON_EYEBROW = 'Coming soon'
export const SOON_HEADLINE = 'GhostDrop is almost here'
export const SOON_SUB =
  'Send photos and text between your screens. Then watch them vanish.'
export const SOON_COUNTDOWN_LABEL = 'Doors open in'
export const SOON_STEP_ONE = 'Scan the code'
export const SOON_STEP_TWO = 'Drop it in'
export const SOON_STEP_THREE = 'It poofs when you say'
export const SOON_WELCOME = 'Welcome in. GhostDrop is live.'
export const SOON_FOOTNOTE = 'No accounts. No uploads. Nothing left behind.'

/*
  Hub pairing card.
  Source: docs/02-brand-persona-and-copy.md section 2, "Home and Pairing Screen".

  The card offers two ways to connect and one shared QR title, so the reader can
  pick a mode without meeting a network term. No line here names a fixed device:
  the reader might already be holding the phone, so the partner is always "your
  other device".
*/
export const PAIRING_MODE_GROUP_LABEL = 'Connection type'
export const PAIRING_MODE_ONLINE_LABEL = 'Online'
export const PAIRING_MODE_OFFLINE_LABEL = 'No internet'
export const PAIRING_OFFLINE_PREPARING = 'Getting your no internet code ready...'
export const PAIRING_QR_TITLE_ONLINE = 'Scan this code with your other device'
export const PAIRING_QR_TITLE_OFFLINE =
  'Scan this code with your other device. No internet needed.'

/*
  Offline direct linking.
  Source: docs/02-brand-persona-and-copy.md section 2.2, decisions.md D-016 item 2.

  Two screens, one short code each, no internet in between. Linking needs two
  exchanges because each screen has to learn the other's network details, so the
  Host body names both scans up front instead of letting the second one arrive
  as a surprise. Every line here is plain everyday English so a first time user
  never meets a network term.
*/
export const OFFLINE_BADGE_LABEL = 'Offline Wi-Fi / Hotspot Mode'
export const OFFLINE_HOST_STEP_TITLE = 'Finish linking without internet'
export const OFFLINE_HOST_STEP_BODY =
  'Two quick scans. Your other device scans this screen first, then point this camera at the code it shows.'
export const OFFLINE_SCAN_REPLY_CTA = 'Scan or Paste Reply'
export const OFFLINE_COPY_INVITE_CTA = 'Copy Offline Code'
export const OFFLINE_PASTE_LABEL = 'No camera? Paste the code here'
export const OFFLINE_PASTE_PLACEHOLDER = 'The code from your other device'
export const OFFLINE_PASTE_CTA = 'Use this code'
export const OFFLINE_GUEST_REPLY_TITLE = 'Show this reply to your other screen'
export const OFFLINE_GUEST_REPLY_BODY =
  'On your other screen, point its camera at this code. No camera on that screen? Copy this code and paste it there.'
export const OFFLINE_COPY_REPLY_CTA = 'Copy code instead'
export const OFFLINE_SWITCH_CTA = 'No internet? Link directly on Wi-Fi or Hotspot'

/*
  Offline sound handshake and the compact pairing card.
  Source: docs/02-brand-persona-and-copy.md section 2.2, step 15 brief section 5.

  Sound is a shortcut past the camera, never a replacement for it: the camera
  scan and the paste row stay on screen at all times. Nothing here names the
  sound itself, a signal, a channel or a device: the reader's partner is always
  "your other device". Every label is short enough for a 44px pill at 360px.
*/
export const OFFLINE_SOUND_SEND_CTA = 'Send Reply with Sound'
export const OFFLINE_SOUND_SENDING_LABEL = 'Playing sound wave...'
export const OFFLINE_SOUND_LISTEN_CTA = 'Listen for Sound'
// Longest pill label in the deck at 34 characters. If it wraps inside the pill
// at 360px, swap in the shorter 21 character "Listening for reply..." and keep
// the listening state word visible.
export const OFFLINE_SOUND_LISTENING_LABEL = 'Listening for your other device...'
export const OFFLINE_SOUND_STOP_CTA = 'Stop Listening'
// Sent state, 35 characters. It names the fallback out loud, so a quiet room or
// a missed sound never leaves the reader staring at a dead button.
export const OFFLINE_SOUND_SENT_LABEL = 'Sound sent. No link? Show the code.'
export const OFFLINE_SHARE_CODE_CTA = 'Share Code'
export const OFFLINE_COPY_INVITE_SHORT_CTA = 'Copy invite code'
export const OFFLINE_PASTE_ROW_PLACEHOLDER = 'Or paste reply code...'
export const PAIRING_SHORT_CODE_NOTE = 'Short code, quick scan'
