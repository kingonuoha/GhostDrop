/**
 * Whole window file drop target, used by the hub and the workspace.
 * Source: the Step 5 contract, drag and drop overlay requirement.
 *
 * The window owns the drop so a file dropped anywhere never makes the browser
 * navigate away from the app. Only drags that carry files are intercepted, so
 * dragging a text selection still behaves like plain text selection.
 */

import { useEffect, useRef, useState } from 'react'

export interface FileDropOptions {
  onFiles: (files: File[]) => void
  enabled?: boolean
}

function carriesFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.from(types).includes('Files')
}

export function useFileDropTarget({ onFiles, enabled = true }: FileDropOptions): boolean {
  const [isDragging, setIsDragging] = useState(false)
  const depthRef = useRef(0)
  const onFilesRef = useRef(onFiles)

  useEffect(() => {
    onFilesRef.current = onFiles
  }, [onFiles])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const reset = () => {
      depthRef.current = 0
      setIsDragging(false)
    }

    const handleEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depthRef.current += 1
      setIsDragging(true)
    }

    const handleOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }

    const handleLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depthRef.current = Math.max(0, depthRef.current - 1)
      if (depthRef.current === 0) setIsDragging(false)
    }

    const handleDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      reset()

      const files = event.dataTransfer ? Array.from(event.dataTransfer.files) : []
      if (files.length > 0) onFilesRef.current(files)
    }

    window.addEventListener('dragenter', handleEnter)
    window.addEventListener('dragover', handleOver)
    window.addEventListener('dragleave', handleLeave)
    window.addEventListener('drop', handleDrop)
    window.addEventListener('dragend', reset)

    return () => {
      window.removeEventListener('dragenter', handleEnter)
      window.removeEventListener('dragover', handleOver)
      window.removeEventListener('dragleave', handleLeave)
      window.removeEventListener('drop', handleDrop)
      window.removeEventListener('dragend', reset)
    }
  }, [enabled])

  return isDragging
}
