import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { Send } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NestedPillButton } from '../brand/NestedPillButton'

type TextComposerProps = {
  onSend: (text: string) => Promise<boolean> | boolean
  placeholder?: string
  label?: string
  inputId?: string
  /** Lets the mobile dock focus this field from the Send tab. */
  inputRef?: RefObject<HTMLInputElement | null>
  disabled?: boolean
  className?: string
}

/**
 * One line note sender. Keeps the typed value until the send succeeds, then
 * clears it, so a failed send never eats the person's words.
 */
export function TextComposer({
  onSend,
  placeholder = 'Type or paste a link or note...',
  label = 'Type or paste a link or note',
  inputId = 'ghostdrop-note',
  inputRef,
  disabled = false,
  className,
}: TextComposerProps) {
  const [value, setValue] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = value.trim()
    if (text.length === 0 || isSending) return

    setIsSending(true)
    try {
      const sent = await onSend(text)
      if (sent) setValue('')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
      className={cn(
        'flex items-center gap-2 rounded-full bg-brand-surface p-1.5 pl-5 shadow-soft',
        className,
      )}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        name="note"
        type="text"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="min-h-[44px] w-full min-w-0 bg-transparent text-sm font-medium text-brand-ink outline-none placeholder:text-brand-ink-muted disabled:opacity-60"
      />
      <NestedPillButton
        type="submit"
        variant="cobalt-on-lime"
        size="sm"
        icon={Send}
        disabled={disabled || isSending || value.trim().length === 0}
        className="shrink-0"
      >
        Send
      </NestedPillButton>
    </form>
  )
}
