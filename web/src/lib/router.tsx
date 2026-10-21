import { useEffect, useState } from 'react'

export type AppRoute = {
  path: string
  query: URLSearchParams
}

function readLocation(): AppRoute {
  return {
    path: window.location.pathname,
    query: new URLSearchParams(window.location.search),
  }
}

export function useRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(readLocation)

  useEffect(() => {
    const handleLocationChange = () => setRoute(readLocation())
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  return route
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const url = new URL(to, window.location.origin)
  const next = `${url.pathname}${url.search}${url.hash}`

  if (options.replace) {
    window.history.replaceState({}, '', next)
  } else {
    window.history.pushState({}, '', next)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))

  if (!url.hash) {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}

export function isPlainLeftClick(event: {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  return (
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
  )
}

export function matchRoomPath(path: string): string | null {
  const match = /^\/room\/([A-Za-z0-9]{4,12})\/?$/.exec(path)
  const code = match?.[1]
  return code ? code.toUpperCase() : null
}

export function isPathActive(path: string, target: string): boolean {
  if (target === '/') {
    return path === '/' || path.startsWith('/room')
  }
  return path === target || path.startsWith(`${target}/`)
}
