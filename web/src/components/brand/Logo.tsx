import { useId } from 'react'
import { APP_VERSION } from '../../lib/constants'
import { cn } from '../../lib/cn'

type LogoProps = {
  size?: number
  withWordmark?: boolean
  className?: string
  wordmarkClassName?: string
}

export function Logo({ size = 36, withWordmark = false, className, wordmarkClassName }: LogoProps) {
  const filterId = `gd-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={withWordmark ? undefined : 'img'}
      aria-hidden={withWordmark ? true : undefined}
      aria-label={withWordmark ? undefined : 'GhostDrop'}
      focusable="false"
      className="shrink-0 text-brand-cobalt"
    >
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
          />
        </filter>
      </defs>
      <g fill="currentColor" filter={`url(#${filterId})`}>
        <circle cx="24" cy="38" r="13" />
        <circle cx="40" cy="42" r="10" />
        <circle cx="33" cy="24" r="8.5" />
      </g>
      <circle cx="50" cy="15" r="5.5" fill="currentColor" />
    </svg>
  )

  if (!withWordmark) {
    return <span className={cn('inline-flex', className)}>{mark}</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {mark}
      {/*
        Wordmark plus the v0.7 version pill.

        The pill is nested inside the wordmark span on purpose: `em` resolves
        against the wordmark's own computed size, so the badge tracks the 1.35rem
        desktop wordmark and the smaller mobile wordmark with no second breakpoint
        to maintain. Padding and gap are `em` based too, which lands the pill's
        height on the wordmark cap height at both sizes, and `items-baseline` on
        the parent keeps the pill optically seated on the wordmark baseline.
        Laroka numerals per docs/design.md section 4, locked tokens only.
      */}
      <span
        className={cn(
          'brand-wordmark inline-flex items-baseline gap-[0.3em] whitespace-nowrap text-brand-ink',
          wordmarkClassName,
        )}
      >
        GhostDrop
        <span
          aria-label={`Version ${APP_VERSION}`}
          className="type-numeral inline-flex shrink-0 items-center rounded-full bg-brand-lime px-[0.5em] py-[0.22em] text-[0.5em] font-bold leading-none text-brand-ink"
        >
          v{APP_VERSION}
        </span>
      </span>
    </span>
  )
}
