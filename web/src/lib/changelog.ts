/**
 * GhostDrop: Grandma-Friendly What is New Registry
 *
 * Single source of truth for release notes and version updates.
 *
 * Rules:
 * - Grandma 2-Second Rule: Zero technical jargon. No WebRTC, SDP, ICE, STUN,
 *   buffers, sockets, chunks, or function names.
 * - Prominent small date-time marker (DD MMM YYYY, HH:MM).
 * - Zero em dashes and zero emojis.
 */

import { APP_VERSION } from './constants'

export type ChangelogCategory = 'feature' | 'speed' | 'fix' | 'privacy'

export interface ChangelogItem {
  category: ChangelogCategory
  title: string
  description: string
}

export interface ChangelogRelease {
  version: string
  dateTime: string // e.g. "22 Oct 2026, 21:45"
  headline: string
  isCurrent?: boolean
  items: ChangelogItem[]
}

export const CHANGELOG_SEEN_KEY = 'ghostdrop.last_seen_version'

export const CHANGELOG_RELEASES: readonly ChangelogRelease[] = [
  {
    version: '1.0',
    dateTime: '29 Oct 2026, 12:22 AM',
    headline: 'Buttons now bounce when you tap them, and the pairing card gently breathes while it waits.',
    isCurrent: true,
    items: [
      {
        category: 'feature',
        title: 'Buttons that answer your tap',
        description:
          'The main button now dips under your finger and gives a small happy hop once the two screens are linked.',
      },
      {
        category: 'feature',
        title: 'A pairing card that feels alive',
        description:
          'The card around the pairing code slowly breathes while it waits, and gives a gentle nod when a screen joins.',
      },
      {
        category: 'feature',
        title: 'A little puff when things go',
        description:
          'Sent files get a quick playful pop on their way across, and a soft puff when their timer runs out.',
      },
    ],
  },
  {
    version: '0.18',
    dateTime: '26 Oct 2026, 9:10 PM',
    headline: 'A calmer pairing card, a share button, and a clear word about your files.',
    items: [
      {
        category: 'feature',
        title: 'Sound is still there',
        description:
          'The sound that links two screens now lives under More ways to link, so the code stays the first thing you see.',
      },
      {
        category: 'feature',
        title: 'Share the code from your phone',
        description:
          'You can now send the pairing code straight to your share sheet and pick how it travels.',
      },
      {
        category: 'privacy',
        title: 'Only the code travels',
        description:
          'Sharing sends the pairing code alone. Your files still go straight between your own screens over Wi-Fi.',
      },
    ],
  },
  {
    version: '0.17',
    dateTime: '26 Oct 2026, 7:40 PM',
    headline: 'A tiny code, a sound that links your screens, and one tap to share.',
    items: [
      {
        category: 'speed',
        title: 'A much smaller code',
        description:
          'The no internet code is far shorter now, so it scans in a blink instead of filling the screen.',
      },
      {
        category: 'feature',
        title: 'Link by sound',
        description:
          'No camera on one screen? Play a short sound and the other screen hears it and links up.',
      },
      {
        category: 'fix',
        title: 'A tidier no internet card',
        description:
          'The no internet card no longer stacks a tall form, so it is shorter and easier to take in.',
      },
      {
        category: 'feature',
        title: 'One tap to copy or share',
        description:
          'Copy the code or send it to a friend in one tap, whichever is easier for you.',
      },
    ],
  },
  {
    version: '0.16',
    dateTime: '26 Oct 2026, 5:20 PM',
    headline: 'A switch for pairings, a shorter code, and words that fit any device.',
    items: [
      {
        category: 'feature',
        title: 'One switch for how you link',
        description:
          'The pairing card now has an Online and a No internet switch in one place.',
      },
      {
        category: 'speed',
        title: 'An easier code to scan',
        description:
          'The everyday code is shorter now, so your phone camera reads it faster.',
      },
      {
        category: 'fix',
        title: 'Words for any device',
        description:
          'The pairing words no longer assume which device you are holding.',
      },
    ],
  },
  {
    version: '0.15',
    dateTime: '26 Oct 2026, 2:30 PM',
    headline: 'A tidier progress line, one shared timer, and a Remove that always lands.',
    items: [
      {
        category: 'fix',
        title: 'A tidier progress line',
        description:
          'The moving line on a file now sits exactly on top of the coloured fill, so the progress looks right.',
      },
      {
        category: 'fix',
        title: 'One timer for both screens',
        description:
          'Both screens now agree on when things tidy up, even if one of them joins later.',
      },
      {
        category: 'feature',
        title: 'Easier pairing without internet',
        description:
          'Pairing without internet is easier to follow, and a screen without a camera can paste a code instead.',
      },
      {
        category: 'fix',
        title: 'Remove works on both screens',
        description:
          'Remove now clears the item on both screens every time.',
      },
    ],
  },
  {
    version: '0.14',
    dateTime: '24 Oct 2026, 10:15 AM',
    headline: 'Watch a photo arrive, clear anything in one tap, and keep the timer close by.',
    items: [
      {
        category: 'feature',
        title: 'See it arrive',
        description:
          'A photo or file now shows its own progress bar while it lands on your screen, so you always know it is on the way.',
      },
      {
        category: 'feature',
        title: 'New file arrived',
        description:
          'The moment a file finishes, a friendly note names it and points you straight to the save button.',
      },
      {
        category: 'feature',
        title: 'Remove anything right away',
        description:
          'Every card now has a Remove button, so one tap clears a note or a file on both of your screens at once.',
      },
      {
        category: 'feature',
        title: 'Timer on the top bar',
        description:
          'On a computer, tap the clock in the top bar and pick how long things stay before they tidy themselves up.',
      },
      {
        category: 'feature',
        title: 'Long notes open up',
        description:
          'A long note now offers a Show full note button, so you can read every word without it running off the card.',
      },
      {
        category: 'speed',
        title: 'Notices close themselves',
        description:
          'Friendly messages now close on their own after five seconds, and they wait politely while you hover over them.',
      },
    ],
  },
  {
    version: '0.13',
    dateTime: '23 Oct 2026, 1:00 PM',
    headline: 'We could not wait. GhostDrop opened its doors early.',
    items: [
      {
        category: 'speed',
        title: 'Doors opened sooner',
        description:
          'We moved the opening time forward to 1pm because everything was ready and waiting. No more counting down.',
      },
      {
        category: 'feature',
        title: 'No internet needed',
        description:
          'Two screens on the same Wi-Fi or phone hotspot can now swap files with zero internet at all. Point, scan, done.',
      },
    ],
  },
  {
    version: '0.12',
    dateTime: '22 Oct 2026, 11:30 PM',
    headline: 'In-app feedback, dedicated release notes, and community milestone counters.',
    items: [
      {
        category: 'feature',
        title: 'Suggest features in-app',
        description:
          'Send ideas, bug reports, and feedback directly to our team with a single tap. Zero email hassle.',
      },
      {
        category: 'feature',
        title: 'What is new page',
        description:
          'Browse what changed across every release with clear explanations and date-time timestamps.',
      },
      {
        category: 'privacy',
        title: 'Private by design',
        description:
          'Feedback and usage counts never touch or log your file names, contents, or personal information.',
      },
      {
        category: 'speed',
        title: 'Milestone celebration',
        description:
          'Dynamic community counter badge that shines automatically once 100+ files are safely teleported.',
      },
    ],
  },
  {
    version: '0.11',
    dateTime: '22 Oct 2026, 9:45 PM',
    headline: 'Total offline linking on personal phone hotspots and Wi-Fi without internet.',
    items: [
      {
        category: 'privacy',
        title: 'Works with zero internet',
        description:
          'Send files and photos even when your mobile data is off or your Wi-Fi has no internet.',
      },
      {
        category: 'feature',
        title: 'Personal phone hotspot',
        description:
          'Connect your laptop and phone seamlessly over your mobile hotspot with zero setup.',
      },
    ],
  },
  {
    version: '0.10',
    dateTime: '22 Oct 2026, 12:45 PM',
    headline: 'Fluid animated backdrop and smoother launch countdown.',
    items: [
      {
        category: 'speed',
        title: 'Fluid animated backdrop',
        description:
          'Smooth brand colour motion and cleaner launch countdown for an even friendlier screen.',
      },
    ],
  },
  {
    version: '0.9',
    dateTime: '21 Oct 2026, 11:30 PM',
    headline: 'Exact seconds countdown and decluttered cards.',
    items: [
      {
        category: 'feature',
        title: 'Exact seconds timer',
        description:
          'Timers now show exact seconds left before drops disappear, so you always know.',
      },
      {
        category: 'fix',
        title: 'Simpler cards',
        description:
          'Removed duplicate step numbers for a calmer, easier-to-read screen layout.',
      },
    ],
  },
  {
    version: '0.8',
    dateTime: '21 Oct 2026, 6:30 PM',
    headline: 'One-tap photo copy and native phone sharing.',
    items: [
      {
        category: 'feature',
        title: 'Instant photo copy',
        description:
          'Copy pictures straight to your device clipboard with one tap, ready to paste into any app.',
      },
      {
        category: 'feature',
        title: 'Share using phone menu',
        description:
          'Send received files directly to other apps using your phone built-in share sheet.',
      },
    ],
  },
  {
    version: '0.7',
    dateTime: '21 Oct 2026, 11:15 AM',
    headline: 'Fresh look and feel, built-in camera scanner, and flexible auto-delete.',
    items: [
      {
        category: 'feature',
        title: 'Fresh look and feel',
        description:
          'Crisp Acid Lime and Electric Cobalt styling designed for maximum clarity and joy.',
      },
      {
        category: 'feature',
        title: 'Built-in camera scanner',
        description:
          'Scan codes with your camera without ever leaving the page or opening another app.',
      },
      {
        category: 'privacy',
        title: 'Self-destruct choices',
        description:
          'Choose when drops vanish: after 1 copy, 15 minutes, or 50 minutes.',
      },
    ],
  },
  {
    version: '0.6',
    dateTime: '20 Oct 2026, 4:00 PM',
    headline: 'The very first working link between computer and phone.',
    items: [
      {
        category: 'feature',
        title: 'The beginning',
        description:
          'First working link between your computer and mobile phone. No logins, no passwords.',
      },
    ],
  },
]

/**
 * Checks whether there are newer release notes the user has not seen yet.
 */
export function hasUnreadUpdates(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const seen = window.localStorage.getItem(CHANGELOG_SEEN_KEY)
    return seen !== APP_VERSION
  } catch {
    return false
  }
}

/**
 * Marks current app version notes as seen.
 */
export function markUpdatesAsSeen(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, APP_VERSION)
  } catch {
    // Graceful fallback for restricted storage contexts
  }
}
