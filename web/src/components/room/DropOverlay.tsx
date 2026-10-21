import { CloudUpload } from 'lucide-react'

/**
 * Whole window drag target veil. Appears while files are held over the page
 * and never blocks the drop itself, which the window listener handles.
 */
export function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-brand-canvas/80 p-6 backdrop-blur-sm"
    >
      <div className="absolute inset-4 rounded-[32px] border-2 border-dashed border-brand-cobalt" />
      <div className="relative flex max-w-[22rem] flex-col items-center gap-3 rounded-[32px] bg-brand-surface px-6 py-7 text-center shadow-lift">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-lime text-brand-ink">
          <CloudUpload size={26} strokeWidth={2} aria-hidden="true" />
        </span>
        <p className="type-h3">Drop it here</p>
        <p className="text-sm font-semibold text-brand-ink-muted">
          We will send it straight to your other screen.
        </p>
      </div>
    </div>
  )
}
