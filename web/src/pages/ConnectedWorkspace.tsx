import { useCallback, useEffect, useRef } from 'react'
import { Ghost, Unplug, Wifi } from 'lucide-react'
import { SquiggleCardBg } from '../components/brand/SquiggleCardBg'
import { ConnectionBridge } from '../components/room/ConnectionBridge'
import { DropOverlay } from '../components/room/DropOverlay'
import { DropZone } from '../components/room/DropZone'
import { OfflineLinkCard } from '../components/room/OfflineLinkCard'
import { RoomToast } from '../components/room/RoomToast'
import { TextComposer } from '../components/room/TextComposer'
import { TransferFeed } from '../components/room/TransferFeed'
import { TtlPicker } from '../components/room/TtlPicker'
import { useGhostRoomContext } from '../components/shell/GhostRoomProvider'
import { useShell } from '../components/shell/ShellProvider'
import { FeedbackCard } from '../components/ui/FeedbackCard'
import { useClipboardPaste } from '../hooks/useClipboardPaste'
import { useFileDropTarget } from '../hooks/useFileDropTarget'
import { useJoinUrl } from '../hooks/useJoinUrl'
import { buildFeedback } from '../lib/copyDeck'
import { peerDisplayName } from '../lib/device'
import { takePendingDrop } from '../lib/pendingDrop'

/**
 * Screen 2: the connected workspace.
 * Layout reference: docs/design/ghostdrop_connected_workspace_grandma_friendly.
 *
 * The room lives in the app level provider, so arriving here from the hub never
 * rebuilds the engine and the other screen stays linked. Reconnect rebuilds the
 * engine in place and keeps every item already on screen.
 */
export function ConnectedWorkspace() {
  const room = useGhostRoomContext()
  const {
    peers,
    items,
    progress,
    remainingMs,
    sendFiles,
    sendText,
    copyItem,
    shareItem,
    saveItem,
    burnItem,
    dismissFeedback,
    feedback,
    connectionError,
    status,
    reconnect,
    sessionCode: code,
    localDeviceType,
    localDeviceName,
  } = room

  const isLinked = peers.length > 0
  const firstPeer = peers[0]
  const peerLabel = firstPeer
    ? peerDisplayName(firstPeer.deviceType, localDeviceType)
    : 'your other screen'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { publishPresence, openScanner } = useShell()
  const { joinUrl } = useJoinUrl(code, room.offlineInviteToken)

  // Keeps the compact mobile header pill in step with this room.
  useEffect(() => {
    if (!code) return
    publishPresence({
      code,
      status: isLinked
        ? 'linked'
        : status === 'error'
          ? 'error'
          : status === 'connecting' || status === 'reconnecting'
            ? 'connecting'
            : 'waiting',
      peerName: firstPeer ? peerDisplayName(firstPeer.deviceType, localDeviceType) : null,
    })
    return () => publishPresence(null)
  }, [publishPresence, code, isLinked, firstPeer, localDeviceType, status])

  // A drop picked on the hub before the link existed rides along in memory.
  useEffect(() => {
    if (!isLinked) return
    const pending = takePendingDrop()
    if (!pending) return
    if (pending.files.length > 0) void sendFiles(pending.files)
    if (pending.text) void sendText(pending.text)
  }, [isLinked, sendFiles, sendText])

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      void sendFiles(files)
    },
    [sendFiles],
  )

  const handleNote = useCallback((text: string) => sendText(text), [sendText])

  const isDragging = useFileDropTarget({ onFiles: handleFiles })
  useClipboardPaste({ onFiles: handleFiles, onText: (text) => void handleNote(text) })

  // The rejoin is still running, so the bridge says Reconnecting instead of a
  // blocking dead end card. An offline handshake in progress also owns the
  // screen, so no red card covers the reply code.
  const offlineHandshaking =
    room.isOfflineDirect &&
    (room.offlineStep === 'host-waiting-for-reply' ||
      room.offlineStep === 'guest-showing-reply')
  const failure =
    connectionError && status !== 'reconnecting' && !offlineHandshaking
      ? buildFeedback(connectionError, { roomCode: code ?? undefined })
      : null
  const failureIcon = connectionError === 'ERR_ROOM_NOT_FOUND' ? Ghost : Unplug

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <h1 className="sr-only">Connected Room {code ? `#${code}` : ''}</h1>
      <ConnectionBridge
        code={code}
        status={status}
        peers={peers}
        localDeviceType={localDeviceType}
        localDeviceName={localDeviceName}
        joinUrl={joinUrl}
      />

      {!isLinked && room.offlineStep === 'guest-showing-reply' ? (
        <OfflineLinkCard
          mode="guest-reply"
          token={room.offlineReplyToken}
          onCopyFeedback={room.announceFeedback}
        />
      ) : null}

      {!isLinked && room.isOfflineDirect && room.role === 'host' ? (
        <OfflineLinkCard
          mode="host-waiting"
          token={room.offlineInviteToken}
          onOpenReplyScanner={() => openScanner('reply')}
          onCopyFeedback={room.announceFeedback}
        />
      ) : null}

      {failure ? (
        <FeedbackCard
          tone="error"
          icon={failureIcon}
          title={failure.title}
          body={failure.body}
          actionLabel={failure.actionLabel}
          headingLevel="h2"
          onAction={() => reconnect()}
        />
      ) : null}

      {!isLinked && (failure || room.isOfflineDirect) ? (
        <button
          type="button"
          onClick={() => {
            void room.activateOfflineDirect()
            openScanner('join')
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-full bg-brand-stone px-4 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-line"
        >
          <Wifi size={16} strokeWidth={2} aria-hidden="true" />
          <span>Link Offline (QR or Code)</span>
        </button>
      ) : null}

      <div className="grid items-start gap-5 md:grid-cols-12 md:gap-6">
        <section
          aria-labelledby="room-send-title"
          className="relative flex flex-col gap-5 overflow-hidden rounded-[32px] bg-brand-cobalt p-6 text-white shadow-pop-cobalt md:col-span-5 md:p-7"
        >
          <SquiggleCardBg tone="lime" variant="single-loop" opacity={0.18} />

          <div className="relative flex flex-col gap-2">
            <h2 id="room-send-title" className="type-h2">
              Pick what to send
            </h2>
            <p className="text-sm font-semibold text-white/85">
              Anything you send lands on {peerLabel}.
            </p>
          </div>

          <DropZone
            inputRef={fileInputRef}
            onFiles={handleFiles}
            helper="Or drag files right here"
            className="relative"
          />

          <TextComposer
            inputId="room-note"
            onSend={handleNote}
            className="relative"
          />

          <div className="relative flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/85">
              Cleans up after
            </p>
            <TtlPicker value={room.ttlPreset} onChange={room.setTtlPreset} />
          </div>
        </section>

        <TransferFeed
          className="md:col-span-7"
          items={items}
          peerLabel={peerLabel}
          progress={progress}
          remainingMs={remainingMs}
          onCopy={(id) => {
            void copyItem(id)
          }}
          onShare={(id) => {
            void shareItem(id)
          }}
          onSave={(id) => saveItem(id)}
          onBurn={(id) => {
            burnItem(id)
          }}
          onChooseFile={() => fileInputRef.current?.click()}
        />
      </div>

      <DropOverlay visible={isDragging} />
      <RoomToast feedback={feedback} onDismiss={dismissFeedback} />
    </div>
  )
}
