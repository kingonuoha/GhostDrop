import { useEffect, useRef, useState } from 'react'
import { Check, Clock, Plus } from 'lucide-react'
import { TTL_LABELS, TTL_PRESET_ORDER, TTL_SHORT_LABELS } from '../../lib/constants'
import { cn } from '../../lib/cn'
import { isPathActive, isPlainLeftClick, navigate, useRoute } from '../../lib/router'
import { Logo } from '../brand/Logo'
import { NestedPillButton } from '../brand/NestedPillButton'
import { useShell } from '../shell/ShellProvider'

type NavItem = {
  to: string
  label: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Teleport Hub' },
  { to: '/how-it-works', label: 'How It Works' },
]

export function DesktopTopPillBar() {
  const { path } = useRoute()
  const { openScanner, ttlPreset, selectTtlPreset, openFeedback } = useShell()
  const [timerOpen, setTimerOpen] = useState(false)
  const timerButtonRef = useRef<HTMLButtonElement>(null)
  const timerPanelRef = useRef<HTMLDivElement>(null)

  // The picker takes focus when it opens and hands it back when it closes,
  // exactly like the mobile dock, so keyboard users never lose their place.
  useEffect(() => {
    if (!timerOpen) return
    const selected = timerPanelRef.current?.querySelector<HTMLButtonElement>(
      'button[aria-pressed="true"]',
    )
    selected?.focus()
  }, [timerOpen])

  // A click anywhere outside the menu or its trigger closes the menu.
  useEffect(() => {
    if (!timerOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (timerPanelRef.current?.contains(target)) return
      if (timerButtonRef.current?.contains(target)) return
      setTimerOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [timerOpen])

  const closeTimer = () => {
    setTimerOpen(false)
    timerButtonRef.current?.focus()
  }

  return (
    <div
      className="sticky top-4 z-40 mx-auto hidden w-full max-w-[1120px] px-6 md:block"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && timerOpen) {
          event.preventDefault()
          closeTimer()
        }
      }}
    >
      <nav
        aria-label="Main"
        className="flex items-center justify-between gap-3 rounded-full border border-brand-line bg-brand-surface/95 px-4 py-2.5 shadow-soft backdrop-blur-md"
      >
        <a
          href="/"
          aria-label="GhostDrop home"
          onClick={(event) => {
            if (isPlainLeftClick(event)) {
              event.preventDefault()
              navigate('/')
            }
          }}
          className="inline-flex min-h-[44px] items-center rounded-full px-1"
        >
          <Logo size={32} withWordmark />
        </a>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isPathActive(path, item.to)
            return (
              <a
                key={item.to}
                href={item.to}
                aria-current={isActive ? 'page' : undefined}
                onClick={(event) => {
                  if (isPlainLeftClick(event)) {
                    event.preventDefault()
                    navigate(item.to)
                  }
                }}
                className={cn(
                  'inline-flex min-h-[44px] items-center rounded-full px-2.5 text-sm font-semibold transition-colors lg:px-3',
                  isActive
                    ? 'bg-brand-lime text-brand-ink'
                    : 'text-brand-ink-muted hover:bg-brand-stone hover:text-brand-ink',
                )}
              >
                {item.label}
              </a>
            )
          })}

          <button
            type="button"
            onClick={openFeedback}
            className="inline-flex min-h-[44px] items-center rounded-full px-2.5 text-sm font-semibold text-brand-ink-muted transition-colors hover:bg-brand-stone hover:text-brand-ink lg:px-3"
          >
            Feedback
          </button>
        </div>

        {/* The timer pill stays on screen from 768 up and opens its own menu. */}
        <div className="relative">
          <button
            ref={timerButtonRef}
            type="button"
            aria-expanded={timerOpen}
            aria-controls={timerOpen ? 'desktop-timer-menu' : undefined}
            onClick={() => setTimerOpen((open) => !open)}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-brand-line px-3 py-2 text-[0.8rem] font-semibold transition-colors hover:bg-brand-stone hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt',
              timerOpen ? 'bg-brand-stone text-brand-ink' : 'text-brand-ink-muted',
            )}
          >
            <Clock size={15} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            {/*
              Below 1024 the pill only has room for "50 Mins", which is a vague
              name on its own. The screen reader prefix names the control while
              the visible short label stays exactly as written, so voice control
              still matches what is on screen.
            */}
            <span className="sr-only lg:hidden">Auto-delete: </span>
            <span className="hidden whitespace-nowrap lg:inline">
              Auto-delete: {TTL_LABELS[ttlPreset]}
            </span>
            <span className="whitespace-nowrap lg:hidden">{TTL_SHORT_LABELS[ttlPreset]}</span>
          </button>

          {timerOpen ? (
            <div
              ref={timerPanelRef}
              id="desktop-timer-menu"
              role="group"
              aria-label="Auto-delete timer"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 rounded-[24px] border border-brand-line bg-brand-stone p-3 shadow-lift"
            >
              <p className="type-eyebrow px-2 text-brand-ink-muted">Cleans up after</p>

              <ul className="mt-1 flex flex-col gap-1">
                {TTL_PRESET_ORDER.map((preset) => {
                  const isSelected = preset === ttlPreset
                  return (
                    <li key={preset}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          selectTtlPreset(preset)
                          closeTimer()
                        }}
                        className={cn(
                          'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-full px-4 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cobalt',
                          isSelected
                            ? 'bg-brand-lime text-brand-ink'
                            : 'text-brand-ink hover:bg-brand-surface',
                        )}
                      >
                        <span>{TTL_LABELS[preset]}</span>
                        {isSelected ? (
                          <Check size={16} strokeWidth={2} aria-hidden="true" />
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <NestedPillButton size="sm" icon={Plus} onClick={() => openScanner()}>
          Enter a Code
        </NestedPillButton>
      </nav>
    </div>
  )
}
