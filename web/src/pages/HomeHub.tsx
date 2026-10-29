import { useCallback, useEffect, useRef } from 'react'
import { OrbBadge } from '../components/brand/OrbBadge'
import { SquiggleCardBg } from '../components/brand/SquiggleCardBg'
import { TeleportCounterBadge } from '../components/brand/TeleportCounterBadge'
import { InstallCard } from '../components/pwa/InstallCard'
import { DropOverlay } from '../components/room/DropOverlay'
import { DropZone } from '../components/room/DropZone'
import { RoomCodeCard } from '../components/room/RoomCodeCard'
import { RoomToast } from '../components/room/RoomToast'
import { TextComposer } from '../components/room/TextComposer'
import { TtlPicker } from '../components/room/TtlPicker'
import { useGhostRoomContext } from '../components/shell/GhostRoomProvider'
import { useShell } from '../components/shell/ShellProvider'
import { useClipboardPaste } from '../hooks/useClipboardPaste'
import { useFileDropTarget } from '../hooks/useFileDropTarget'
import { useJoinUrl } from '../hooks/useJoinUrl'
import { useShareIntake } from '../hooks/useShareIntake'
import { waitingLabel } from '../lib/device'
import { stashPendingDrop } from '../lib/pendingDrop'
import { navigate } from '../lib/router'

/**
 * Screen 1: the desktop hub.
 * Layout reference: docs/design/ghostdrop_ultra_clean_desktop_hub_grandma_edition.
 * Two cards only, no marketing strip.
 *
 * The room comes from the app level provider, so handing over to the workspace
 * keeps the same engine and the other screen never sees a disconnect.
 */
export function HomeHub() {
  const room = useGhostRoomContext()
  const { openScanner } = useShell()
  const { sendFiles, sendText, dismissFeedback, feedback, peers } = room
  const roomCode = room.roomCode
  const isLinked = peers.length > 0
  const localDeviceType = room.localDeviceType
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { notice: shareNotice, dismiss: dismissShareNotice } = useShareIntake()
  const { joinUrl, offlineJoinUrl, lanCandidates, activeLanUrl, setActiveLanUrl } = useJoinUrl(
    roomCode,
    room.offlineInviteToken,
  )

  const openRoom = useCallback(() => {
    if (!roomCode) return
    // `host=1` keeps this screen as the room host after the route change, so
    // the same six letters stay live for the other device.
    navigate(`/room/${roomCode}?host=1`)
  }, [roomCode])

  // A share caught on boot is already staged, so Beam Now opens the room where
  // it will fly the moment the other screen links.
  const handleBeamNow = useCallback(() => {
    dismissShareNotice()
    openRoom()
  }, [dismissShareNotice, openRoom])

  // The moment another screen joins, the hub hands over to the workspace.
  useEffect(() => {
    if (isLinked) openRoom()
  }, [isLinked, openRoom])

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0 || !roomCode) return
      if (isLinked) {
        void sendFiles(files)
        return
      }
      stashPendingDrop({ files, text: null })
      openRoom()
    },
    [isLinked, openRoom, roomCode, sendFiles],
  )

  const handleNote = useCallback(
    async (text: string): Promise<boolean> => {
      if (!roomCode) return false
      if (isLinked) return sendText(text)

      stashPendingDrop({ files: [], text })
      openRoom()
      return true
    },
    [isLinked, openRoom, roomCode, sendText],
  )

  const isDragging = useFileDropTarget({ onFiles: handleFiles })

  useClipboardPaste({
    onFiles: handleFiles,
    onText: (text) => {
      void handleNote(text)
    },
  })

  return (
    <section aria-labelledby="hub-title" className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <TeleportCounterBadge />
        <h1 id="hub-title" className="type-h1 hub-title mx-auto text-balance">
          Send photos and text between your screens.
        </h1>
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-12 md:gap-6">
        <RoomCodeCard
          code={roomCode ?? '......'}
          joinUrl={joinUrl}
          offlineJoinUrl={offlineJoinUrl}
          deviceType={localDeviceType}
          lanOptions={lanCandidates}
          activeLanUrl={activeLanUrl}
          onSelectLan={setActiveLanUrl}
          onCopyFeedback={room.announceFeedback}
          isOfflineDirect={room.isOfflineDirect}
          offlineInviteToken={room.offlineInviteToken}
          onOpenReplyScanner={() => openScanner('reply')}
          onAcceptReplyCode={(raw) => room.acceptOfflineToken(raw)}
          onActivateOffline={() => {
            void room.activateOfflineDirect()
          }}
          peerCount={peers.length}
          className="md:col-span-5"
        />

        <section
          aria-labelledby="send-title"
          className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-[32px] bg-brand-cobalt p-6 text-white shadow-pop-cobalt md:col-span-7 md:p-8"
        >
          <SquiggleCardBg
            tone="lime"
            variant="double-loop"
            opacity={0.14}
            placement="bottom-right"
          />

          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <OrbBadge size="md">2</OrbBadge>
              <h2 id="send-title" className="type-h2">
                Pick what to send
              </h2>
            </div>

            <p className="inline-flex items-center gap-2 rounded-full bg-brand-ink/25 px-3.5 py-1.5 text-xs font-semibold text-white">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-brand-lime"
              />
              {isLinked ? 'Your screens are linked' : waitingLabel(localDeviceType)}
            </p>
          </div>

          <DropZone inputRef={fileInputRef} onFiles={handleFiles} className="relative" />

          <TextComposer
            inputId="hub-note"
            onSend={handleNote}
            placeholder="Type or paste a link or note..."
            className="relative"
          />

          <div className="relative flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/85">
              Cleans up after
            </p>
            <TtlPicker value={room.ttlPreset} onChange={room.setTtlPreset} />
          </div>
        </section>
      </div>

      <InstallCard />

      <DropOverlay visible={isDragging} />
      {shareNotice ? (
        <RoomToast
          feedback={shareNotice}
          onDismiss={dismissShareNotice}
          onAction={
            shareNotice.key === 'SUCCESS_SHARE_CAUGHT' ? handleBeamNow : undefined
          }
        />
      ) : (
        <RoomToast feedback={feedback} onDismiss={dismissFeedback} />
      )}
    </section>
  )
}
