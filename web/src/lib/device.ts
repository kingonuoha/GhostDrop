/**
 * Dynamic device identity for every screen that names a device.
 * Source: decisions.md D-014 item 3, docs/01-wireframe-and-pages.md Screen 2.
 *
 * Why this file exists: the sharing screen, the connection bridge, the status
 * pills and the feed cards all used to hardcode "This Computer" and "Waiting for
 * your phone", so a phone saw itself called a computer. Every label here is
 * derived at runtime from the browser, never written into a component.
 *
 * Rules kept here: no emojis, no em dashes, plain English only.
 */

import { Laptop, Smartphone, Tablet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DeviceType } from '../types/protocol'

export type { DeviceType }

/** One crisp SVG icon per device class, used by chips, badges and the bridge. */
export const DEVICE_ICON: Record<DeviceType, LucideIcon> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
}

/** User agent data is only present in Chromium, so it is read defensively. */
interface NavigatorWithUaData extends Navigator {
  userAgentData?: { mobile?: boolean }
}

function readNavigator(): NavigatorWithUaData | null {
  if (typeof navigator === 'undefined') return null
  return navigator as NavigatorWithUaData
}

/** Short side of the physical screen, or 0 when the platform hides it. */
function screenShortSide(): number {
  if (typeof window === 'undefined' || !window.screen) return 0
  const width = window.screen.width ?? 0
  const height = window.screen.height ?? 0
  if (width <= 0 || height <= 0) return 0
  return Math.min(width, height)
}

/**
 * Detects whether this screen is a computer, a phone or a tablet.
 *
 * Order matters:
 * 1. iPad and Android tablets report as tablets even though their user agents
 *    also contain mobile tokens.
 * 2. iPadOS 13 and later masquerade as `Macintosh`, so a touch capable Mac
 *    user agent is a tablet, never a desktop.
 * 3. `userAgentData.mobile` is the most reliable signal where it exists.
 * 4. An `Android` user agent without the `Mobile` token is a tablet.
 * 5. Touch capability plus a wide short side is the last resort tablet signal.
 */
export function detectDeviceType(): DeviceType {
  const nav = readNavigator()
  if (!nav) return 'desktop'

  const agent = typeof nav.userAgent === 'string' ? nav.userAgent : ''
  const touchPoints = typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0

  if (/iPad/i.test(agent) || /Tablet/i.test(agent)) return 'tablet'
  if (/Macintosh/i.test(agent) && touchPoints > 1) return 'tablet'
  if (nav.userAgentData?.mobile === true) return 'mobile'
  if (/Android/i.test(agent)) return /Mobile/i.test(agent) ? 'mobile' : 'tablet'
  if (/iPhone|iPod|Windows Phone|IEMobile|Opera Mini|Mobile/i.test(agent)) return 'mobile'
  if (touchPoints > 1 && screenShortSide() >= 768) return 'tablet'

  return 'desktop'
}

/** How this screen names itself on its own UI: "This Phone", "This Computer". */
export function localSelfLabel(type: DeviceType): string {
  if (type === 'mobile') return 'This Phone'
  if (type === 'tablet') return 'This Tablet'
  return 'This Computer'
}

/**
 * The short name announced on the wire in `HELLO_PEER`. The receiving screen
 * never renders this raw: it runs it through `peerDisplayName` first, so the
 * other side reads "Your Phone" instead of a bare "Phone".
 */
export function deviceNameFor(type: DeviceType): string {
  if (type === 'mobile') return 'Phone'
  if (type === 'tablet') return 'Tablet'
  return 'Computer'
}

/** Icon for a device class, for callers that only need the glyph. */
export function deviceIconFor(type: DeviceType): LucideIcon {
  return DEVICE_ICON[type]
}

/**
 * How a connected peer is named on this screen.
 * "Your Phone" when the two screens differ, "Other Phone" when they match, so
 * two phones in one room are never both called "your phone".
 */
export function peerDisplayName(peerDeviceType: DeviceType, localDeviceType: DeviceType): string {
  const same = peerDeviceType === localDeviceType
  if (peerDeviceType === 'mobile') return same ? 'Other Phone' : 'Your Phone'
  if (peerDeviceType === 'tablet') return same ? 'Other Tablet' : 'Your Tablet'
  return same ? 'Other Computer' : 'Your Computer'
}

/**
 * Waiting state pill: what this screen is still looking for.
 *
 * The line never names a device. The reader may already be holding the phone,
 * so "waiting for your phone" would tell them to wait for themselves. One
 * neutral sentence serves a computer, a tablet and a phone alike, and it keeps
 * the same length as the old lines so the pill does not change shape. The
 * parameter stays in the signature because every caller still passes this
 * screen's type, and the bridge draws the likely device icon beside this line
 * rather than spelling the device out in words.
 */
export function waitingLabel(_localDeviceType: DeviceType): string {
  return 'Waiting for your other screen'
}

/**
 * Placeholder name for the not yet connected slot on the bridge.
 *
 * This is the label under the empty peer badge, so it follows the same rule as
 * `waitingLabel`: no fixed device. The slot already carries the likely device
 * icon from `expectedPeerType`, and "Other Screen" is the phrasing the rest of
 * the pairing copy uses, so a second wording would only be a second thing to
 * learn.
 */
export function expectedPeerLabel(_localDeviceType: DeviceType): string {
  return 'Other Screen'
}

/** Device class the not yet connected slot on the bridge is drawn as. */
export function expectedPeerType(localDeviceType: DeviceType): DeviceType {
  return localDeviceType === 'desktop' ? 'mobile' : 'desktop'
}

/**
 * Hub pairing card title, phrased for whichever screen is reading it.
 * A computer never names the phone, because the reader may be the phone.
 */
export function scanCardTitle(localDeviceType: DeviceType): string {
  return localDeviceType === 'desktop' ? 'Scan with your other device' : 'Scan with your other screen'
}

/** Hub pairing card helper line under the title. */
export function scanCardHelper(localDeviceType: DeviceType): string {
  return localDeviceType === 'desktop'
    ? 'Open the camera on your other device and point it here:'
    : 'Open the camera or GhostDrop on your PC or other phone:'
}

/** True when the OS share sheet can carry files, used to gate the Share button. */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({
      files: [new File([new Blob(['ghostdrop'])], 'ghostdrop.txt', { type: 'text/plain' })],
    })
  } catch {
    return false
  }
}

/** True when this browser exposes the native OS share sheet at all. */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}
