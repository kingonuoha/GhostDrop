import {
  CameraOff,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardX,
  Clock,
  Download,
  Ghost,
  RefreshCw,
  SaveCheck,
  Send,
  Share2,
  Sparkles,
  Unplug,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RoomFeedback, RoomFeedbackKey } from '../../lib/copyDeck'
import { FeedbackCard } from '../ui/FeedbackCard'
import { PoofNotice } from './PoofNotice'

const ICONS: Record<RoomFeedbackKey, LucideIcon> = {
  SUCCESS_PEER_JOINED: Zap,
  SUCCESS_TEXT_SENT: Send,
  SUCCESS_TEXT_RECEIVED: ClipboardCheck,
  SUCCESS_COPIED: CheckCircle2,
  SUCCESS_COPIED_IMAGE: ClipboardCheck,
  SUCCESS_SAVED: SaveCheck,
  SUCCESS_SHARED: Share2,
  SUCCESS_FILE_SENT: Check,
  SUCCESS_DROP_AND_NUKE: Sparkles,
  SUCCESS_PWA_INSTALLED: Download,
  SUCCESS_SHARE_CAUGHT: Share2,
  ERR_SHARE_MISSED: RefreshCw,
  ERR_ROOM_NOT_FOUND: Ghost,
  ERR_PEER_DISCONNECTED: Unplug,
  ERR_CAMERA_DENIED: CameraOff,
  ERR_COPY_BLOCKED: RefreshCw,
  ERR_CLIPBOARD_BLOCKED: ClipboardX,
  ERR_CHUNK_INTERRUPTED: RefreshCw,
  WARN_TTL_EXPIRING_SOON: Clock,
  INFO_TTL_EXPIRED: Sparkles,
}

type FeedbackNoticeProps = {
  feedback: RoomFeedback
  onDismiss: () => void
  /** Optional action that is not a plain dismiss, such as Beam Now. */
  onAction?: () => void
  className?: string
}

/**
 * Renders any copy deck entry as a joyful card.
 * Expiry always routes through PoofNotice so the Sparkles notice stays one
 * implementation.
 */
export function FeedbackNotice({
  feedback,
  onDismiss,
  onAction,
  className,
}: FeedbackNoticeProps) {
  if (feedback.key === 'INFO_TTL_EXPIRED') {
    return (
      <PoofNotice
        preset={feedback.preset ?? '50m'}
        itemName={feedback.itemName}
        onDismiss={onDismiss}
        className={className}
      />
    )
  }

  const Icon = ICONS[feedback.key]

  return (
    <div role="status" aria-live="polite" className={className}>
      <FeedbackCard
        tone={feedback.tone}
        icon={Icon}
        title={feedback.title}
        body={feedback.body}
        actionLabel={feedback.actionLabel}
        onAction={onAction ?? onDismiss}
        onDismiss={onDismiss}
      />
    </div>
  )
}
