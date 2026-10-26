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
    version: '0.14',
    dateTime: '24 Oct 2026, 10:15 AM',
    headline: 'Watch a photo arrive, clear anything in one tap, and keep the timer close by.',
    isCurrent: true,
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
