import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode } from 'lucide-react'
import type { DeviceType, PeerInfo } from '../../lib/p2p'
import { cn } from '../../lib/cn'
import {
  DEVICE_ICON,
  expectedPeerLabel,
  expectedPeerType,
  peerDisplayName,
  waitingLabel,
} from '../../lib/device'
import { SquiggleConnectionBridge } from '../brand/SquiggleConnectionBridge'
import { SquiggleCardBg } from '../brand/SquiggleCardBg'
import type { GhostRoomStatus } from '../../hooks/useGhostRoom'

const MAX_CHIPS = 3

function statusLabel(
  status: GhostRoomStatus,
  peerCount: number,
  localDeviceType: DeviceType,
): string {
  if (status === 'error') return 'Not linked'
  if (status === 'connecting') return 'Linking up'
  if (status === 'reconnecting') return 'Reconnecting'
  if (status === 'connected' && peerCount > 0) return 'Connected'
  return waitingLabel(localDeviceType)
}

function statusDot(status: GhostRoomStatus, peerCount: number): string {
  if (status === 'error') return 'bg-brand-error'
  if (status === 'connected' && peerCount > 0) return 'bg-brand-lime'
  if (status === 'connecting' || status === 'reconnecting') return 'bg-brand-warning'
  return 'bg-brand-lime/60'
}

type DeviceChipProps = {
  deviceName: string
  deviceType: DeviceType
  tone: 'host' | 'peer'
}

function DeviceChip({ deviceName, deviceType, tone }: DeviceChipProps) {
  const Icon = DEVICE_ICON[deviceType]

  return (
    <span
      className={cn(
        'inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        tone === 'host'
          ? 'bg-brand-cobalt text-white'
          : 'bg-brand-surface text-brand-ink',
      )}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span className="max-w-[9rem] truncate">{deviceName}</span>
    </span>
  )
}

type ConnectionBridgeProps = {
  code: string | null
  status: GhostRoomStatus
  peers: readonly PeerInfo[]
  /** Runtime detected class of this screen, from `useGhostRoom`. */
  localDeviceType: DeviceType
  /** Self label for this screen, from `useGhostRoom`, never hardcoded here. */
  localDeviceName: string
  /** Pairing link encoded in the in-room QR drawer. */
  joinUrl: string
  className?: string
}

/**
 * Connected Workspace bridge card: room code, the self drawing squiggle bridge
 * and one chip per linked screen.
 * Layout reference: docs/design/ghostdrop_connected_workspace_grandma_friendly.
 */
export function ConnectionBridge({
  code,
  status,
  peers,
  localDeviceType,
  localDeviceName,
  joinUrl,
  className,
}: ConnectionBridgeProps) {
  const [qrOpen, setQrOpen] = useState(false)
  const isLinked = peers.length > 0
  const firstPeer = peers[0]
  const peerLabel = firstPeer
    ? peerDisplayName(firstPeer.deviceType, localDeviceType)
    : expectedPeerLabel(localDeviceType)
  const peerDeviceType = firstPeer?.deviceType ?? expectedPeerType(localDeviceType)
  const label = statusLabel(status, peers.length, localDeviceType)
  const chips = peers.slice(0, MAX_CHIPS)

  return (
    <section
      aria-labelledby="bridge-title"
      className={cn(
        'relative overflow-hidden rounded-[32px] border border-brand-line bg-brand-stone p-5 shadow-soft md:p-6',
        className,
      )}
    >
      <SquiggleCardBg
        tone="forest"
        variant="double-loop"
        opacity={0.08}
        placement="bottom-right"
      />

      <h1 id="bridge-title" className="sr-only">
        Your GhostDrop room for {code ?? 'this screen'}
      </h1>

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-eyebrow text-brand-ink-muted">Your code</p>
          <p className="room-code mt-0.5 text-[1.6rem] tracking-[0.14em] sm:text-[2rem]">
            {code ?? '......'}
          </p>
        </div>

        <p
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-canvas px-3.5 py-2 text-xs font-bold text-brand-ink"
        >
          <span
            aria-hidden="true"
            className={cn('h-2 w-2 rounded-full', statusDot(status, peers.length))}
          />
          {label}
        </p>
      </div>

      <SquiggleConnectionBridge
        status={isLinked ? 'connected' : 'idle'}
        hostLabel={localDeviceName}
        hostDeviceType={localDeviceType}
        peerLabel={peerLabel}
        peerDeviceType={peerDeviceType}
        className="relative mt-4"
      />

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <DeviceChip deviceName={localDeviceName} deviceType={localDeviceType} tone="host" />
        {chips.length > 0 ? (
          chips.map((peer) => (
            <DeviceChip
              key={peer.peerId}
              deviceName={peerDisplayName(peer.deviceType, localDeviceType)}
              deviceType={peer.deviceType}
              tone="peer"
            />
          ))
        ) : (
          <span className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-dashed border-brand-line px-3 py-1 text-xs font-semibold text-brand-ink-muted">
            {waitingLabel(localDeviceType)}
          </span>
        )}
      </div>

      {isLinked ? null : (
        <p className="relative mt-3 max-w-[46ch] text-xs font-semibold text-brand-ink-muted">
          Type this code on your other screen.
        </p>
      )}

      <div className="relative mt-4 flex flex-col gap-3">
        <button
          type="button"
          aria-expanded={qrOpen}
          aria-controls={qrOpen ? 'room-qr-panel' : undefined}
          onClick={() => setQrOpen((open) => !open)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-full bg-brand-surface px-4 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt"
        >
          <QrCode size={16} strokeWidth={2} aria-hidden="true" />
          <span>{qrOpen ? 'Hide QR Code' : 'Show QR Code'}</span>
        </button>

        {qrOpen ? (
          <div
            id="room-qr-panel"
            className="flex w-full flex-col items-center gap-3 rounded-[24px] bg-brand-surface p-4"
          >
            <div className="text-brand-ink">
              <QRCodeSVG
                value={joinUrl}
                size={148}
                /*
                  Two modules of white inside the SVG, plus the panel padding and
                  the caption gap, keeps the quiet zone above the four module
                  minimum on every edge so a rear camera locks on first try.
                */
                marginSize={2}
                bgColor="transparent"
                fgColor="currentColor"
                title="Scan this code with your other screen"
              />
            </div>
            <p className="text-center text-xs font-semibold text-brand-ink-muted">
              Scan with your other screen to link up
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
