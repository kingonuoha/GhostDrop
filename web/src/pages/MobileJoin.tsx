/**
 * Screen 3: the mobile join hub at /join?room=XXXXXX.
 * Source: docs/01-wireframe-and-pages.md Screen 3, docs/02-brand-persona-and-copy.md,
 * decisions.md D-007, D-008, D-010 and the Step 06 implementation contract.
 *
 * Layout reference: docs/design/ghostdrop_mobile_grandma_friendly_hub.
 * One cobalt send card, one paste bar, the shared items feed and the 3 tab dock.
 */

import { useCallback, useEffect, useRef } from 'react'
import { Ghost, ImagePlus, ScanLine, Unplug } from 'lucide-react'
import { NestedPillButton } from '../components/brand/NestedPillButton'
import { OrbBadge } from '../components/brand/OrbBadge'
import { SquiggleCardBg } from '../components/brand/SquiggleCardBg'
import { DropZone } from '../components/room/DropZone'
import { RoomToast } from '../components/room/RoomToast'
import { TextComposer } from '../components/room/TextComposer'
import { TransferFeed } from '../components/room/TransferFeed'
import { FeedbackCard } from '../components/ui/FeedbackCard'
import { useGhostRoomContext } from '../components/shell/GhostRoomProvider'
import { useShell } from '../components/shell/ShellProvider'
import type { RoomPresenceStatus } from '../components/shell/ShellProvider'
import { buildFeedback } from '../lib/copyDeck'
import { peerDisplayName } from '../lib/device'
import { isValidRoomCode, normalizeRoomCode } from '../lib/p2p'
import { navigate } from '../lib/router'

type MobileJoinProps = {
  roomCode: string | null
}

/** Start state: no code in the URL yet. */
function JoinStart() {
  const { openScanner } = useShell()

  return (
    <section
      aria-labelledby="join-start-title"
      className="relative overflow-hidden rounded-[32px] bg-brand-cobalt p-6 text-white shadow-pop-cobalt"
    >
      <SquiggleCardBg tone="lime" variant="double-loop" opacity={0.12} placement="bottom-right" />

      <div className="relative flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime text-brand-cobalt shadow-soft">
          <ScanLine size={28} strokeWidth={2} aria-hidden="true" />
        </span>

        <h1 id="join-start-title" className="type-h1 mt-4 max-w-[18ch] text-balance">
          Connect to your screen
        </h1>
        <p className="mt-2 max-w-[30ch] text-sm font-semibold text-white/85">
          Scan the code on your other screen.
        </p>

        <NestedPillButton
          size="lg"
          variant="cobalt-on-lime"
          icon={ScanLine}
          onClick={openScanner}
          className="relative mt-6 w-full justify-between"
        >
          Scan or Type a Code
        </NestedPillButton>
      </div>
    </section>
  )
}

/** The URL carried letters that cannot be a room code. */
function JoinInvalid({ code }: { code: string }) {
  const { openScanner } = useShell()
  const copy = buildFeedback('ERR_ROOM_NOT_FOUND', { roomCode: code })

  return (
    <div className="flex flex-col gap-4">
      <FeedbackCard
        tone="error"
        icon={Ghost}
        title={copy.title}
        body={copy.body}
        actionLabel={copy.actionLabel}
        headingLevel="h2"
        onAction={openScanner}
      />

      <button
        type="button"
        onClick={() => navigate('/')}
        className="mx-auto inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-brand-ink-muted transition-colors hover:bg-brand-stone hover:text-brand-ink"
      >
        Back to the hub
      </button>
    </div>
  )
}

type JoinRoomProps = {
  code: string
}

function JoinRoom({ code }: JoinRoomProps) {
  const room = useGhostRoomContext()
  const { publishPresence, publishTtlPreset, registerComposer, registerTtlHandler } = useShell()

  const {
    peers,
    items,
    progress,
    remainingMs,
    status,
    sendFiles,
    sendText,
    copyItem,
    shareItem,
    saveItem,
    connectionError,
    dismissFeedback,
    feedback,
    reconnect,
    localDeviceType,
  } = room

  const noteRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isLinked = peers.length > 0
  const firstPeer = peers[0]
  const peerName = firstPeer ? peerDisplayName(firstPeer.deviceType, localDeviceType) : null
  const peerLabel = peerName ?? 'your other screen'
  const presenceStatus: RoomPresenceStatus = isLinked
    ? 'linked'
    : status === 'error'
      ? 'error'
      : status === 'connecting' || status === 'reconnecting'
        ? 'connecting'
        : 'waiting'

  // The compact header pill reads this, so the dock page never guesses.
  useEffect(() => {
    publishPresence({ code, status: presenceStatus, peerName })
    return () => publishPresence(null)
  }, [publishPresence, code, presenceStatus, peerName])

  // The dock timer tab needs the room's real preset, both ways.
  useEffect(() => {
    publishTtlPreset(room.ttlPreset)
  }, [publishTtlPreset, room.ttlPreset])

  useEffect(() => registerTtlHandler(room.setTtlPreset), [registerTtlHandler, room.setTtlPreset])

  // Dock Send tab: focus the note field here instead of navigating away.
  useEffect(
    () =>
      registerComposer(() => {
        const input = noteRef.current
        if (!input) return
        input.scrollIntoView({ block: 'center', behavior: 'smooth' })
        input.focus({ preventScroll: true })
      }),
    [registerComposer],
  )

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      void sendFiles(files)
    },
    [sendFiles],
  )

  const handleNote = useCallback((text: string) => sendText(text), [sendText])

  // While the automatic rejoin is running the bridge carries the label, so the
  // blocking card waits until the attempts are truly spent.
  const failure =
    connectionError && status !== 'reconnecting'
      ? buildFeedback(connectionError, { roomCode: code })
      : null
  const failureIcon = connectionError === 'ERR_ROOM_NOT_FOUND' ? Ghost : Unplug
  // The inline card already carries this message, so the toast stays silent.
  const toast = feedback && feedback.key === connectionError ? null : feedback

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-[560px] md:gap-5">
      <section
        aria-labelledby="join-title"
        className="relative overflow-hidden rounded-[32px] bg-brand-cobalt p-5 text-white shadow-pop-cobalt md:p-7"
      >
        <SquiggleCardBg tone="lime" variant="double-loop" opacity={0.12} placement="bottom-right" />

        <div className="relative flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime text-brand-cobalt shadow-soft">
            <ImagePlus size={28} strokeWidth={2} aria-hidden="true" />
          </span>

          <h1 id="join-title" className="type-h1 mt-3 max-w-[16ch] text-balance">
            Send Photos or Files
          </h1>
          <p className="mt-1.5 max-w-[30ch] text-sm font-semibold text-white/85">
            {isLinked
              ? `Tap below to beam straight to ${peerLabel}.`
              : 'Tap below and it lands on your other screen.'}
          </p>
        </div>

        <DropZone
          inputRef={fileRef}
          onFiles={handleFiles}
          label="Choose Photos or Files"
          helper="Or drag files right here"
          className="relative mt-5"
        />
      </section>

      <TextComposer
        inputId="join-note"
        inputRef={noteRef}
        onSend={handleNote}
        className="shadow-soft"
      />

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

      <TransferFeed
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
        onChooseFile={() => fileRef.current?.click()}
      />

      <div className="flex items-center justify-center gap-2 pb-2">
        <OrbBadge size="sm" icon={ScanLine} />
        <p className="text-xs font-semibold text-brand-ink-muted">
          Room <span className="room-code text-sm tracking-[0.12em]">#{code}</span>
        </p>
      </div>

      <RoomToast feedback={toast} onDismiss={dismissFeedback} />
    </div>
  )
}

export function MobileJoin({ roomCode }: MobileJoinProps) {
  const normalized = roomCode ? normalizeRoomCode(roomCode) : ''

  if (normalized.length === 0) return <JoinStart />
  if (!isValidRoomCode(normalized)) return <JoinInvalid code={normalized} />

  return <JoinRoom code={normalized} />
}
