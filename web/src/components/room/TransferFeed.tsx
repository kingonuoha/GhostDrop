import { useState } from 'react'
import { FolderPlus, ShieldCheck } from 'lucide-react'
import type { EphemeralItem } from '../../lib/p2p'
import { cn } from '../../lib/cn'
import { OrbBadge } from '../brand/OrbBadge'
import { FeedbackCard } from '../ui/FeedbackCard'
import { ClearedTransferRow, TransferCard } from './TransferCard'

const MAX_VISIBLE = 3

type TransferFeedProps = {
  items: readonly EphemeralItem[]
  peerLabel: string
  progress: Readonly<Record<string, number>>
  remainingMs: (id: string) => number | null
  onCopy: (id: string) => void
  /** Native OS share sheet, omitted on a browser without `navigator.share`. */
  onShare?: (id: string) => void
  onSave: (id: string) => void
  /** Manual burn, passed straight through to every card. */
  onBurn: (id: string) => void
  onChooseFile: () => void
  className?: string
}

/**
 * Shared Items feed. Three cards at most by default, newest first, so the newest
 * drop is always the first thing on the screen. A Show all toggle reveals every
 * active item, because a fourth drop must never be stranded off screen.
 * Layout reference: docs/design/ghostdrop_connected_workspace_grandma_friendly.
 */
export function TransferFeed({
  items,
  peerLabel,
  progress,
  remainingMs,
  onCopy,
  onShare,
  onSave,
  onBurn,
  onChooseFile,
  className,
}: TransferFeedProps) {
  const [showAll, setShowAll] = useState(false)
  const activeItems = items.filter((item) => item.status !== 'nuked')
  const rendered = showAll ? activeItems : activeItems.slice(-MAX_VISIBLE)
  const visible = [...rendered].reverse()
  const canToggle = activeItems.length > MAX_VISIBLE

  return (
    <section aria-labelledby="feed-title" className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="feed-title" className="type-h2">
            Shared Items
          </h2>
          {activeItems.length > 0 ? (
            <OrbBadge size="sm">{activeItems.length}</OrbBadge>
          ) : null}
        </div>
        {canToggle ? (
          <button
            type="button"
            aria-expanded={showAll}
            aria-controls="feed-list"
            onClick={() => setShowAll((current) => !current)}
            className="inline-flex min-h-[44px] items-center rounded-full border border-brand-line bg-brand-surface px-3.5 text-xs font-bold text-brand-ink transition-colors hover:bg-brand-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt"
          >
            {showAll ? `Latest ${MAX_VISIBLE}` : `Show all (${activeItems.length})`}
          </button>
        ) : (
          <p className="text-xs font-semibold text-brand-ink-muted">Newest on top</p>
        )}
      </div>

      {visible.length === 0 ? (
        <FeedbackCard
          tone="info"
          icon={FolderPlus}
          title="Nothing sent yet"
          body="Pick a photo, file, or note to send it across!"
          actionLabel="Choose File"
          onAction={onChooseFile}
        />
      ) : (
        <ul id="feed-list" className="flex flex-col gap-3">
          {visible.map((item, index) => (
            <li key={item.id}>
              {item.status === 'expired' ? (
                <ClearedTransferRow item={item} />
              ) : (
                <TransferCard
                  item={item}
                  peerLabel={peerLabel}
                  remainingMs={remainingMs(item.id)}
                  progress={progress[item.id] ?? 0}
                  tone={index % 2 === 0 ? 'surface' : 'stone'}
                  onCopy={onCopy}
                  onShare={onShare}
                  onSave={onSave}
                  onBurn={onBurn}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 rounded-[24px] bg-brand-stone px-4 py-3 text-brand-ink-muted">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-forest">
          <ShieldCheck size={17} strokeWidth={2} aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold">
          Lives on your screens only, then cleans itself up.
        </p>
      </div>
    </section>
  )
}
