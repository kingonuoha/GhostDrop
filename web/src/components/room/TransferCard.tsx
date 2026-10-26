import { useEffect, useId, useRef, useState } from 'react'
import {
  Check,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Link2,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { EphemeralItem } from '../../lib/p2p'
import { cn } from '../../lib/cn'
import { buildFeedback } from '../../lib/copyDeck'
import { canNativeShare } from '../../lib/device'
import { formatFileSize, formatTimeLeft, shortenText } from '../../lib/format'
import { NestedPillButton } from '../brand/NestedPillButton'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'
import { Numerals } from '../ui/Numerals'

/** Card skins from docs/design.md section 3, rotated so no two notes match. */
export type FeedCardTone = 'surface' | 'stone'

type TransferCardProps = {
  item: EphemeralItem
  peerLabel: string
  remainingMs: number | null
  progress: number
  /** Alternates white and warm stone for neighbouring note cards. */
  tone?: FeedCardTone
  onCopy: (id: string) => void
  /** Native OS share sheet. Absent on a browser without `navigator.share`. */
  onShare?: (id: string) => void
  onSave: (id: string) => void
  /** Manual burn: clears the item here and on the linked screen. */
  onBurn: (id: string) => void
}

/**
 * Transfer progress: a lime fill and a cobalt wave that ride the very same
 * progress edge.
 *
 * The wave is not revealed with stroke dashes any more, because a dash offset
 * reveals from the path start, not from the left edge, so the wave never landed
 * on the fill. Instead one clipPath window does the revealing: its rect is
 * `300 * clamped` wide, the same clamped number that sets the fill width, so the
 * clip right edge and the fill right edge are the same point at every value.
 *
 * The wave itself is a 30 unit period extended one whole period past both ends
 * and drifting sideways by exactly one period, so the loop has no seam. This is
 * a progress accent, not the brand squiggle draw: see docs/05-motion-spec.md.
 */
const WAVE_D =
  'M -30 8 Q -15 3, 0 8 T 30 8 T 60 8 T 90 8 T 120 8 T 150 8 T 180 8 T 210 8 T 240 8 T 270 8 T 300 8 T 330 8'

function ProgressSquiggle({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(1, Math.max(0, value))
  // useId can emit characters such as `:` that break `url(#...)`, so the id is
  // narrowed to letters, digits, hyphen and underscore and stays unique per card.
  const clipId = `progress-wave-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className="relative h-4 w-full overflow-hidden rounded-full bg-brand-surface"
    >
      {/* Lime fill. Its right edge is the progress edge. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-full bg-brand-lime/40"
        style={{ width: `${clamped * 100}%` }}
      />
      <svg
        viewBox="0 0 300 16"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full text-brand-cobalt"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {/* Same clamped value as the fill width, so both edges agree. */}
            <rect x={0} y={0} width={300 * clamped} height={16} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path
            d={WAVE_D}
            stroke="currentColor"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="progress-wave-drift"
          />
        </g>
      </svg>
    </div>
  )
}

function MetaLine({
  direction,
  peerLabel,
  timeLeft,
  tone,
}: {
  direction: EphemeralItem['direction']
  peerLabel: string
  timeLeft: string
  tone: 'ink' | 'muted' | 'cobalt'
}) {
  const base = tone === 'cobalt' ? 'text-white/75' : 'text-brand-ink-muted'
  const strong = tone === 'cobalt' ? 'text-white' : 'text-brand-ink'

  return (
    <p className={cn('mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold', base)}>
      <span>
        {direction === 'received' ? 'From' : 'To'} {peerLabel}
      </span>
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current opacity-60" />
      <span className={strong}>
        <Numerals text={timeLeft} />
      </span>
    </p>
  )
}

/**
 * One ephemeral drop in the feed.
 * Layout reference: docs/design/ghostdrop_connected_workspace_grandma_friendly.
 */
export function TransferCard({
  item,
  peerLabel,
  remainingMs,
  progress,
  tone = 'surface',
  onCopy,
  onShare,
  onSave,
  onBurn,
}: TransferCardProps) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const canShare = canNativeShare()
  const timeLeft = formatTimeLeft(remainingMs, item.burnOnCopy)
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)

  if (item.status === 'sending') {
    // A file arriving and a file leaving share this card, so the words, the
    // pill, the icon and the progressbar label all flip on the direction.
    const isReceiving = item.direction === 'received'
    const SendingIcon = isReceiving ? Download : FileText

    return (
      <article className="relative flex flex-col gap-3 overflow-hidden rounded-[24px] bg-brand-stone p-5 shadow-soft">
        <SquiggleCardBg
          tone="forest"
          variant="single-loop"
          opacity={0.08}
          placement="bottom-right"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-cobalt">
              <SendingIcon size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="type-h3 truncate text-[1.05rem]">{item.fileName ?? 'Your file'}</h3>
              <p className="text-xs font-semibold text-brand-ink-muted">
                {isReceiving ? 'Landing on your screen' : 'On its way across'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand-ink">
            <span className="h-2 w-2 rounded-full bg-brand-cobalt" aria-hidden="true" />
            {isReceiving ? 'Receiving...' : 'Sending...'} <Numerals text={`${percent}%`} />
          </span>
        </div>

        <ProgressSquiggle
          value={progress}
          label={isReceiving ? 'Receiving progress' : 'Sending progress'}
        />

        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-semibold text-brand-ink-muted">
          <span className="min-w-0 break-words">
            {isReceiving ? 'From' : 'To'} {peerLabel}
          </span>
          <span className="shrink-0">{percent < 90 ? 'Almost there' : 'Finishing up'}</span>
        </div>
      </article>
    )
  }

  if (item.status === 'error') {
    // The failed row speaks the same deck words as the toast, never a second
    // hand written sentence. Source: docs/02-brand-persona-and-copy.md line 65.
    const copy = buildFeedback('ERR_CHUNK_INTERRUPTED')

    return (
      <article className="flex items-center gap-3 rounded-[24px] border border-brand-error/40 bg-brand-error-tint p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-error text-white">
          <RefreshCw size={18} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="type-h3 truncate text-[1.05rem]">{item.fileName ?? copy.title}</h3>
          <p className="text-xs font-semibold text-brand-ink/70">{copy.body}</p>
        </div>
      </article>
    )
  }

  if (item.kind === 'text') {
    const value = item.text ?? ''
    const trimmed = value.trim()
    // Only a real http or https address is offered as a link, so a note
    // carrying `javascript:` or `data:` text renders as plain words.
    let safeUrl: string | null = null
    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') safeUrl = trimmed
    } catch {
      safeUrl = null
    }

    const isLong = value.length > 72
    const Icon = safeUrl ? Link2 : ClipboardCheck

    return (
      <article
        className={cn(
          'relative flex flex-col gap-3 overflow-hidden rounded-[24px] p-5 shadow-soft lg:flex-row lg:items-center lg:justify-between',
          tone === 'stone' ? 'bg-brand-stone' : 'bg-brand-surface',
        )}
      >
        <SquiggleCardBg
          tone={tone === 'stone' ? 'forest' : 'cobalt'}
          variant="single-loop"
          opacity={tone === 'stone' ? 0.09 : 0.05}
          placement="bottom-right"
        />

        <div className="relative flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-brand-cobalt-tint text-brand-cobalt">
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {isLong && expanded ? (
              <p className="break-words whitespace-pre-wrap text-sm font-bold leading-snug text-brand-ink">
                {value}
              </p>
            ) : (
              <p className="break-words text-sm font-bold leading-snug text-brand-ink">
                {shortenText(value)}
              </p>
            )}

            {isLong ? (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((current) => !current)}
                className="-ml-2 mt-1 inline-flex min-h-[44px] items-center rounded-full px-2 text-xs font-bold text-brand-cobalt transition-colors hover:bg-brand-cobalt-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt"
              >
                {expanded ? 'Show less' : 'Show full note'}
              </button>
            ) : null}

            <MetaLine
              direction={item.direction}
              peerLabel={peerLabel}
              timeLeft={timeLeft}
              tone="muted"
            />
          </div>
        </div>

        <div className="relative flex w-full shrink-0 flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
          <NestedPillButton
            variant="cobalt-on-lime"
            size="sm"
            icon={Copy}
            onClick={() => onCopy(item.id)}
            className="w-full justify-between lg:w-auto lg:justify-center"
          >
            Copy
          </NestedPillButton>

          {safeUrl ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-full bg-brand-cobalt px-4 text-sm font-semibold text-white shadow-pop-cobalt transition-colors hover:bg-brand-cobalt-deep lg:w-auto lg:justify-center"
            >
              <span>Open</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-ink transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:rotate-12">
                <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
              </span>
            </a>
          ) : null}

          <NestedPillButton
            variant="ink"
            size="sm"
            icon={Trash2}
            aria-label="Remove item now"
            onClick={() => onBurn(item.id)}
            className="w-full justify-between lg:w-auto lg:justify-center"
          >
            Remove
          </NestedPillButton>
        </div>
      </article>
    )
  }

  const isImage = (item.mime ?? '').startsWith('image/')
  const size = formatFileSize(item.size)
  const fileName = item.fileName ?? 'Your file'

  return (
    <article className="relative flex flex-col gap-3 overflow-hidden rounded-[24px] bg-brand-lime p-5 text-brand-ink shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <SquiggleCardBg tone="cobalt" variant="single-loop" opacity={0.14} placement="bottom-right" />

      <div className="relative flex min-w-0 items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-brand-surface text-brand-cobalt shadow-soft">
          {isImage && item.blobUrl ? (
            <img
              src={item.blobUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : isImage ? (
            <FileImage size={24} strokeWidth={2} aria-hidden="true" />
          ) : (
            <FileText size={24} strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="type-h3 max-w-full truncate text-[1.05rem]">{fileName}</h3>
            {size ? (
              <span className="type-mono rounded-full bg-brand-surface px-2 py-0.5 text-[0.65rem] font-bold text-brand-ink">
                {size}
              </span>
            ) : null}
          </div>
          <MetaLine
            direction={item.direction}
            peerLabel={peerLabel}
            timeLeft={timeLeft}
            tone="ink"
          />
        </div>
      </div>

      {/*
        Action group, one obvious lead per card.
        Images lead with Copy (clipboard image), with Share and Save beside it.
        Non image files lead with Save, because a PDF cannot go on the image
        clipboard. Every control is a 44px nested circle-icon pill carrying a
        visible label, and the rows stack full width at 360px so nothing crowds
        or pushes the card sideways.
      */}
      <div className="relative flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
        {isImage ? (
          <NestedPillButton
            variant="lime-on-cobalt"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={() => {
              onCopy(item.id)
              setCopied(true)
              if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
              copyTimerRef.current = setTimeout(() => setCopied(false), 2200)
            }}
            className="w-full justify-between sm:w-auto sm:justify-center"
          >
            {copied ? 'Copied' : 'Copy'}
          </NestedPillButton>
        ) : null}

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {canShare ? (
            <NestedPillButton
              variant="ink"
              size="sm"
              icon={Share2}
              onClick={() => onShare?.(item.id)}
              className="min-w-0 flex-1 justify-between sm:flex-none sm:justify-center"
            >
              Share
            </NestedPillButton>
          ) : null}

          <NestedPillButton
            variant={isImage ? 'ink' : 'lime-on-cobalt'}
            size="sm"
            icon={saved ? Check : Download}
            onClick={() => {
              onSave(item.id)
              setSaved(true)
              if (timerRef.current !== null) clearTimeout(timerRef.current)
              timerRef.current = setTimeout(() => setSaved(false), 2200)
            }}
            className="min-w-0 flex-1 justify-between sm:flex-none sm:justify-center"
          >
            {saved ? 'Saved' : 'Save'}
          </NestedPillButton>
        </div>

        <NestedPillButton
          variant="ink"
          size="sm"
          icon={Trash2}
          aria-label="Remove item now"
          onClick={() => onBurn(item.id)}
          className="w-full justify-between sm:w-auto sm:justify-center"
        >
          Remove
        </NestedPillButton>
      </div>
    </article>
  )
}

/** Muted row for a drop that already cleaned itself up. */
export function ClearedTransferRow({ item }: { item: EphemeralItem }) {
  return (
    <article className="flex items-center gap-3 rounded-[24px] bg-brand-stone p-4 text-brand-ink-muted">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-surface">
        <Sparkles size={18} strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold">
        {item.fileName ?? 'That note'} was cleaned up. Nothing left behind.
      </p>
    </article>
  )
}
