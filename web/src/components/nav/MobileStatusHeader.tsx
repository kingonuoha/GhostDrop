import { MessageSquare } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Logo } from '../brand/Logo'
import { useShell } from '../shell/ShellProvider'
import type { RoomPresence } from '../shell/ShellProvider'

function presenceLabel(presence: RoomPresence | null): string {
  if (!presence) return 'Ready'

  switch (presence.status) {
    case 'linked':
      return presence.peerName ? `Connected to ${presence.peerName}` : 'Connected'
    case 'connecting':
      return 'Linking up...'
    case 'waiting':
      return `#${presence.code}`
    case 'error':
      return 'Not linked yet'
  }
}

/**
 * Mobile compact top status header: droplet logo plus the live room pill.
 * Source: docs/01-wireframe-and-pages.md section 1, decisions.md D-008.
 */
export function MobileStatusHeader() {
  const { presence, openFeedback } = useShell()
  const isLinked = presence?.status === 'linked'

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-brand-line/70 bg-brand-canvas/90 px-4 py-3 backdrop-blur-md md:hidden">
      <Logo size={28} withWordmark wordmarkClassName="text-[1.05rem]" />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={openFeedback}
          aria-label="Share feedback or suggest a feature"
          title="Share feedback"
          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-brand-line bg-brand-surface text-brand-ink transition-colors hover:border-brand-cobalt/40 hover:bg-brand-stone"
        >
          <MessageSquare size={15} strokeWidth={2} aria-hidden="true" />
        </button>
        <span
          className={cn(
            'inline-flex min-w-0 max-w-[52vw] items-center gap-2 rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold',
            isLinked
              ? 'border-brand-lime bg-brand-lime text-brand-ink'
              : 'border-brand-line bg-brand-surface text-brand-ink-muted',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              isLinked ? 'bg-brand-forest' : 'bg-brand-lime',
            )}
          />
          <span className="line-clamp-2 min-w-0 text-left leading-tight">
            {presence?.status === 'waiting' ? (
              <>
                Room{' '}
                <span className="room-code text-[0.72rem] tracking-[0.1em]">#{presence.code}</span>
              </>
            ) : (
              presenceLabel(presence)
            )}
          </span>
        </span>
      </div>
    </div>
  )
}
