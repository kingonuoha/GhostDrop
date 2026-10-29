import { useEffect, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Live `prefers-reduced-motion: reduce` flag.
 *
 * The query is subscribed, not read once, so a reader who turns motion off
 * while the page is open sees the motion layer go still straight away.
 * Source: docs/05-motion-spec.md section 1 item 4, docs/design.md section 8.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersReducedMotion)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    setReducedMotion(query.matches)

    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return reducedMotion
}
