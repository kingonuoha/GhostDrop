/**
 * Global Ctrl+V / Cmd+V capture for the hub and the workspace.
 * Source: docs/00-prd-source-of-truth.md FR-1.2 and the Step 5 contract.
 *
 * Guards:
 * - never hijacks a paste while the person is typing in a field
 * - ignores an empty clipboard instead of swallowing the keystroke
 * - image and file clipboard entries win over their text twin, so one
 *   screenshot never sends twice
 */

import { useEffect, useRef } from 'react'

export interface ClipboardPasteOptions {
  onText: (text: string) => void
  onFiles: (files: File[]) => void
  enabled?: boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false

  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return target.closest('[contenteditable="true"]') !== null
}

function readClipboardFiles(data: DataTransfer): File[] {
  const files: File[] = []

  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }

  if (files.length === 0) {
    for (const file of Array.from(data.files)) files.push(file)
  }

  return files.map((file, index) => {
    if (file.name.trim().length > 0) return file
    const extension = file.type.startsWith('image/') ? (file.type.split('/')[1] ?? 'png') : 'txt'
    return new File([file], `pasted-${index + 1}.${extension}`, {
      type: file.type || 'application/octet-stream',
    })
  })
}

export function useClipboardPaste({
  onText,
  onFiles,
  enabled = true,
}: ClipboardPasteOptions): void {
  const handlersRef = useRef({ onText, onFiles })

  useEffect(() => {
    handlersRef.current = { onText, onFiles }
  }, [onText, onFiles])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const handlePaste = (event: ClipboardEvent) => {
      // The person is typing into the composer or a code field, so the field
      // owns this paste. The composer has its own Send button.
      if (isTypingTarget(event.target)) return

      const data = event.clipboardData
      if (!data) return

      const files = readClipboardFiles(data)
      if (files.length > 0) {
        event.preventDefault()
        handlersRef.current.onFiles(files)
        return
      }

      const text = data.getData('text/plain')
      if (text.trim().length === 0) return

      event.preventDefault()
      handlersRef.current.onText(text)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [enabled])
}
