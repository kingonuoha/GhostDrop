/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import {
  SHARE_HANDOFF_ERROR_PATH,
  SHARE_HANDOFF_MAX_BYTES,
  SHARE_HANDOFF_SUCCESS_PATH,
  SHARE_TARGET_PATH,
  saveSharePayload,
} from './lib/shareHandoff'

interface PrecacheManifestEntry {
  url: string
  revision: string | null
}

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheManifestEntry | string>
}

const APP_SHELL_URL = '/index.html'
const OFFLINE_BODY = 'GhostDrop is offline. Reconnect and try that share again.'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function redirectTo(path: string): Response {
  return Response.redirect(new URL(path, self.location.origin).href, 303)
}

function isSharedFile(entry: FormDataEntryValue): entry is File {
  return typeof entry !== 'string' && entry.size > 0
}

function readFormText(form: FormData, key: string): string | null {
  const value = form.get(key)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function declaredLength(request: Request): number {
  const header = request.headers.get('content-length')
  if (!header) return 0
  const parsed = Number(header)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

async function handleShareTarget(request: Request): Promise<Response> {
  try {
    if (declaredLength(request) > SHARE_HANDOFF_MAX_BYTES) {
      console.warn('[ghostdrop-sw] share target rejected: payload over the size cap')
      return redirectTo(SHARE_HANDOFF_ERROR_PATH)
    }

    const form = await request.formData()
    const files = form.getAll('files').filter(isSharedFile)
    const text = readFormText(form, 'text')
    const title = readFormText(form, 'title')
    const url = readFormText(form, 'url')

    const saved = await saveSharePayload({ files, text, title, url })
    if (!saved) {
      console.warn('[ghostdrop-sw] share target rejected: nothing to hand off')
      return redirectTo(SHARE_HANDOFF_ERROR_PATH)
    }

    return redirectTo(SHARE_HANDOFF_SUCCESS_PATH)
  } catch {
    console.warn('[ghostdrop-sw] share target rejected: unreadable share payload')
    return redirectTo(SHARE_HANDOFF_ERROR_PATH)
  }
}

async function serveAppShell(request: Request): Promise<Response> {
  try {
    const cached = await caches.match(APP_SHELL_URL, { ignoreSearch: true })
    if (cached) return cached
  } catch {
    // A missing or blocked Cache API falls through to the network.
  }

  try {
    return await fetch(request)
  } catch {
    return new Response(OFFLINE_BODY, {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method === 'POST') {
    const path = new URL(request.url).pathname
    if (path === SHARE_TARGET_PATH) {
      event.respondWith(handleShareTarget(request))
    }
    return
  }

  if (request.method === 'GET' && request.mode === 'navigate') {
    event.respondWith(serveAppShell(request))
  }
})
