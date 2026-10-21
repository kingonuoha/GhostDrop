/**
 * One shot handoff between the hub and the workspace.
 *
 * A host that picks a file before its other screen is linked is taken to the
 * room screen, and the drop rides along in memory. Nothing is written to
 * storage, nothing survives a reload, and the workspace clears the slot the
 * first time it reads it.
 */

export interface PendingDrop {
  files: File[]
  text: string | null
}

let pending: PendingDrop | null = null

export function stashPendingDrop(next: PendingDrop): void {
  pending = next
}

export function takePendingDrop(): PendingDrop | null {
  const next = pending
  pending = null
  return next
}
