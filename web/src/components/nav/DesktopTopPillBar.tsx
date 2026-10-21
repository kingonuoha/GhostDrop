import { Clock, Plus } from 'lucide-react'
import { TTL_LABELS, TTL_SHORT_LABELS } from '../../lib/constants'
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
  const { openScanner, ttlPreset } = useShell()

  return (
    <div className="sticky top-4 z-40 mx-auto hidden w-full max-w-[1120px] px-6 md:block">
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
        </div>

        {/* The timer pill stays on screen from 768 up, short label first. */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-line px-3 py-2 text-[0.8rem] font-semibold text-brand-ink-muted">
          <Clock size={15} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          <span className="hidden whitespace-nowrap lg:inline">
            Auto-delete: {TTL_LABELS[ttlPreset]}
          </span>
          <span className="whitespace-nowrap lg:hidden">{TTL_SHORT_LABELS[ttlPreset]}</span>
        </div>

        <NestedPillButton size="sm" icon={Plus} onClick={openScanner}>
          Enter a Code
        </NestedPillButton>
      </nav>
    </div>
  )
}
