import { useRef } from 'react'
import type { RefObject } from 'react'
import { CloudUpload, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'

type DropZoneProps = {
  onFiles: (files: File[]) => void
  /** Lets a page open the picker from another surface, such as an empty feed. */
  inputRef?: RefObject<HTMLInputElement | null>
  label?: string
  helper?: string
  disabled?: boolean
  className?: string
}

/**
 * Cobalt card dropzone. One big target: the whole zone opens the picker, so a
 * grandma has one obvious button and the keyboard has one obvious stop.
 * Layout reference: docs/design/ghostdrop_ultra_clean_desktop_hub_grandma_edition.
 */
export function DropZone({
  onFiles,
  inputRef,
  label = 'Choose Photos or Files',
  helper = 'Or drag files right here',
  disabled = false,
  className,
}: DropZoneProps) {
  const localRef = useRef<HTMLInputElement>(null)
  const pickerRef = inputRef ?? localRef

  const handleChange = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onFiles(Array.from(files))
    // Reset so picking the same file twice still fires a change event.
    if (pickerRef.current) pickerRef.current.value = ''
  }

  return (
    <div
      className={cn(
        'relative rounded-[24px] border border-white/15 bg-white/10 p-5 text-center transition-colors duration-200 hover:bg-white/15 sm:p-7',
        className,
      )}
    >
      <input
        ref={pickerRef}
        type="file"
        multiple
        disabled={disabled}
        onChange={(event) => handleChange(event.target.files)}
        aria-label="Choose photos or files to send"
        className="hidden"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => pickerRef.current?.click()}
        className="group flex w-full flex-col items-center gap-3.5 rounded-[20px] text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-60"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-lime text-brand-ink shadow-soft transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-105">
          <CloudUpload size={26} strokeWidth={2} aria-hidden="true" />
        </span>

        <span className="inline-flex min-h-[48px] items-center gap-2.5 rounded-full bg-brand-lime py-2 pl-5 pr-2 text-[0.95rem] font-bold text-brand-ink shadow-soft">
          <span>{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-cobalt text-white">
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        </span>

        <span className="text-sm font-semibold text-white/90">{helper}</span>
      </button>
    </div>
  )
}
