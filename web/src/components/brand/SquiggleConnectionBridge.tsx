import type { LucideIcon } from 'lucide-react'
import type { DeviceType } from '../../lib/p2p'
import { cn } from '../../lib/cn'
import { DEVICE_ICON, localSelfLabel, peerDisplayName } from '../../lib/device'
import { SquiggleLine } from './SquiggleLine'

export type BridgeStatus = 'idle' | 'connected'

type DeviceBadgeProps = {
  icon: LucideIcon
  label: string
  tone: 'cobalt' | 'lime' | 'stone'
}

function DeviceBadge({ icon: Icon, label, tone }: DeviceBadgeProps) {
  const shell =
    tone === 'cobalt'
      ? 'bg-brand-cobalt text-brand-lime'
      : tone === 'lime'
        ? 'bg-brand-lime text-brand-ink'
        : 'bg-brand-stone text-brand-ink-muted'

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center sm:w-20">
      <span className={cn('flex h-12 w-12 items-center justify-center rounded-full', shell)}>
        <Icon size={22} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-brand-ink">{label}</span>
    </div>
  )
}

type SquiggleConnectionBridgeProps = {
  status?: BridgeStatus
  hostLabel?: string
  /** Runtime detected class of this screen. Defaults to a computer. */
  hostDeviceType?: DeviceType
  peerLabel?: string
  /** Runtime detected class of the other screen. Defaults to a phone. */
  peerDeviceType?: DeviceType
  className?: string
}

export function SquiggleConnectionBridge({
  status = 'idle',
  hostLabel,
  hostDeviceType = 'desktop',
  peerLabel,
  peerDeviceType = 'mobile',
  className,
}: SquiggleConnectionBridgeProps) {
  const isConnected = status === 'connected'
  // A caller that omits the labels still gets device aware wording, never a
  // hardcoded "computer" on a phone.
  const resolvedHostLabel = hostLabel ?? localSelfLabel(hostDeviceType)
  const resolvedPeerLabel = peerLabel ?? peerDisplayName(peerDeviceType, hostDeviceType)

  return (
    <div
      role="group"
      aria-label="Device connection"
      className={cn('flex w-full items-center gap-2 sm:gap-4', className)}
    >
      <DeviceBadge icon={DEVICE_ICON[hostDeviceType]} label={resolvedHostLabel} tone="cobalt" />

      <div
        className={cn(
          'relative h-16 min-w-[88px] flex-1 transition-colors duration-700',
          isConnected ? 'text-brand-lime' : 'text-brand-cobalt',
        )}
      >
        <SquiggleLine
          variant="single-loop"
          animate={isConnected}
          progress={isConnected ? 1 : 0.5}
          className="absolute inset-0 h-full w-full"
        />
        {isConnected ? null : (
          <span className="squiggle-tip-pulse absolute left-1/2 top-1/2 block h-3 w-3 rounded-full bg-brand-cobalt" />
        )}
        <span className="sr-only">
          {isConnected ? 'Screens linked' : 'Waiting for a screen to join'}
        </span>
      </div>

      <DeviceBadge
        icon={DEVICE_ICON[peerDeviceType]}
        label={resolvedPeerLabel}
        tone={isConnected ? 'lime' : 'stone'}
      />
    </div>
  )
}
