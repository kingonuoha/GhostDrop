import { useEffect, useRef, useState } from 'react'
import { Check, Clock, MessageSquare, ScanLine, Send, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { TTL_LABELS, TTL_PRESET_ORDER, TTL_SHORT_LABELS } from '../../lib/constants'
import { navigate, useRoute } from '../../lib/router'
import { useShell } from '../shell/ShellProvider'

type DockTabId = 'send' | 'scan' | 'timer'

type DockTab = {
  id: DockTabId
  label: string
  icon: LucideIcon
}

/**
 * Mobile Sleek Floating Bottom Navbar: exactly 3 tabs.
 * Source: docs/01-wireframe-and-pages.md section 1 and decisions.md D-010.
 * Send focuses the note composer, Scan QR opens the pairing modal and the
 * timer tab applies the chosen auto-delete preset to the open room.
 */
export function MobileBottomDock() {
  const { path } = useRoute()
  const {
    focusComposer,
    openScanner,
    scannerOpen,
    ttlPreset,
    selectTtlPreset,
    openFeedback,
  } = useShell()
  const [timerOpen, setTimerOpen] = useState(false)
  const timerTabRef = useRef<HTMLButtonElement>(null)
  const timerPanelRef = useRef<HTMLDivElement>(null)

  // The picker takes focus when it opens and hands it back when it closes.
  useEffect(() => {
    if (!timerOpen) return
    const selected = timerPanelRef.current?.querySelector<HTMLButtonElement>(
      'button[aria-pressed="true"]',
    )
    selected?.focus()
  }, [timerOpen])

  const closeTimer = () => {
    setTimerOpen(false)
    timerTabRef.current?.focus()
  }

  const tabs: DockTab[] = [
    { id: 'send', label: 'Send', icon: Send },
    { id: 'scan', label: 'Scan QR', icon: ScanLine },
    { id: 'timer', label: TTL_SHORT_LABELS[ttlPreset], icon: Clock },
  ]

  const isSendPage = path === '/' || path === '/join' || path.startsWith('/room')

  /*
    S-06: How It Works has no dock tab of its own, and a dock with no lit tab
    reads as broken on a 360px phone. The Send tab is the way back into the flow,
    so it stays lit there while `aria-current` keeps telling the truth about the
    route. Source: docs/tasks/step-08-brand-motion-and-copy-polish/qa-report.md.
  */
  const isSendRoute = isSendPage || path === '/how-it-works'

  const isActive = (id: DockTabId): boolean => {
    if (id === 'send') return isSendRoute && !timerOpen
    if (id === 'scan') return scannerOpen
    return timerOpen
  }

  const handleTabPress = (id: DockTabId) => {
    if (id === 'send') {
      setTimerOpen(false)
      if (focusComposer()) return
      navigate('/')
      return
    }
    if (id === 'scan') {
      setTimerOpen(false)
      openScanner()
      return
    }
    setTimerOpen((open) => !open)
  }

  return (
    <div
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-3 md:hidden"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && timerOpen) {
          event.preventDefault()
          closeTimer()
        }
      }}
    >
      {timerOpen ? (
        <div
          ref={timerPanelRef}
          id="mobile-timer-panel"
          role="group"
          aria-label="Auto-delete timer"
          className="rounded-[28px] border border-brand-line bg-brand-stone p-4 shadow-lift"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="type-eyebrow text-brand-ink-muted">Cleans up after</p>
            <button
              type="button"
              onClick={closeTimer}
              aria-label="Close timer options"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-surface text-brand-ink transition-colors hover:bg-brand-line"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

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
                      'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-full px-4 text-left text-sm font-semibold transition-colors',
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

          <div className="mt-3 border-t border-brand-line/60 pt-3">
            <button
              type="button"
              onClick={() => {
                closeTimer()
                openFeedback()
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-brand-line bg-brand-surface/70 px-4 text-xs font-bold text-brand-ink transition-colors hover:bg-brand-surface"
            >
              <MessageSquare size={14} strokeWidth={2} aria-hidden="true" />
              <span>Have an idea or feedback?</span>
            </button>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Quick actions"
        className="flex items-center justify-between gap-1 rounded-full bg-brand-ink p-2 shadow-lift"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.id)
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              ref={tab.id === 'timer' ? timerTabRef : undefined}
              onClick={() => handleTabPress(tab.id)}
              aria-current={isSendPage && active && tab.id === 'send' ? 'page' : undefined}
              aria-expanded={tab.id === 'timer' ? timerOpen : undefined}
              aria-controls={
                tab.id === 'timer' && timerOpen ? 'mobile-timer-panel' : undefined
              }
              className={cn(
                'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full px-2 text-[0.8rem] font-semibold transition-colors duration-200',
                active ? 'bg-brand-lime text-brand-ink' : 'text-white/75 hover:text-white',
              )}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              {tab.id === 'timer' ? (
                <span className="sr-only">Auto-delete: </span>
              ) : null}
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
