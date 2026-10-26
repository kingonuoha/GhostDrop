import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import {
  GHOSTDROP_SIGNAL_PORT,
  ghostdropLocalSignalingPlugin,
  resolveLocalHttps,
} from './vite.localSignaling.ts'

type PostCssDecl = { prop: string; value: string }

type PostCssRoot = {
  walkDecls: {
    (callback: (decl: PostCssDecl) => void): void
    (prop: string, callback: (decl: PostCssDecl) => void): void
  }
}

/**
 * Step 05 L-04: `src/styles/tokens.css` is kept byte-identical to
 * `docs/tokens/tokens.css`, so its second Laroka source (`url('../laroka.otf')`,
 * a docs-relative path with no file beside it in `src/`) cannot be deleted on
 * disk. This postcss step drops that stale source after `@import` inlining and
 * before Vite resolves CSS urls, so the published `/fonts/laroka.otf` stays the
 * only source and the build carries no unresolved url warning.
 */
const singleLarokaSource = {
  postcssPlugin: 'ghostdrop-single-laroka-source',
  Once(root: PostCssRoot) {
    root.walkDecls('src', (decl) => {
      decl.value = decl.value.replace(
        /\s*,\s*url\((['"]?)\.{1,2}\/laroka.otf\1\)\s*format\((['"])opentype\2\)/,
        '',
      )
    })
  },
}

/**
 * Same-origin signaling proxy, shared by `npm run dev` and `npm run preview`.
 *
 * No path rewrite: the embedded PeerJS server mounts with `path: '/'` and
 * `key: 'peerjs'`, so it already expects `/peerjs/id` over HTTP and the
 * `/peerjs` WebSocket upgrade. Stripping the prefix would 404 every request.
 * `ws: true` upgrades the browser WebSocket on the same Vite port, which is the
 * only port a phone on a hotspot can reach (decisions.md D-014 item 2).
 */
const peerSignalingProxy = {
  target: `http://127.0.0.1:${GHOSTDROP_SIGNAL_PORT}`,
  changeOrigin: true,
  ws: true,
}

function isEnabledFlag(value: string | undefined): boolean {
  const trimmed = value?.trim().toLowerCase()
  return trimmed === '1' || trimmed === 'true' || trimmed === 'yes'
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Optional plain-HTTP default: TLS only turns on when VITE_HTTPS=1 is set.
  const https =
    command === 'serve' && isEnabledFlag(env.VITE_HTTPS)
      ? resolveLocalHttps(true, (message) => console.log(`[ghostdrop] ${message}`))
      : undefined

  return {
    plugins: [
      ghostdropLocalSignalingPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'og-image.png',
          'og-image.svg',
          'fonts/laroka.otf',
          'icons/logo.jpg',
          'icons/pwa-192x192.png',
          'icons/pwa-512x512.png',
          'icons/pwa-512x512-maskable.png',
        ],
        manifest: {
          name: 'GhostDrop',
          short_name: 'GhostDrop',
          description: 'Send photos and text between your screens. GhostDrop cleans up after itself.',
          theme_color: '#CDF22B',
          background_color: '#F7F6F2',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/pwa-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
              files: [
                {
                  name: 'files',
                  accept: ['image/*', 'video/*', 'application/pdf', 'text/*', '*/*'],
                },
              ],
            },
          },
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html}'],
        },
      }),
    ],
    // Binding every interface is what lets a phone on the same Wi-Fi or hotspot
    // reach the dev and preview server without a `-- --host` flag.
    server: {
      host: true,
      proxy: { '/peerjs': peerSignalingProxy },
      ...(https ? { https } : {}),
    },
    preview: {
      host: true,
      proxy: { '/peerjs': peerSignalingProxy },
      ...(https ? { https } : {}),
    },
    css: {
      postcss: {
        plugins: [singleLarokaSource],
      },
    },
    /**
     * Vendor chunking keeps the first paint payload small and lets the browser
     * cache the big libraries separately from the app shell. `jsqr` is already
     * split by its lazy import in `AppShell.tsx`; these groups cover the two
     * dependencies that every route needs but seldom changes.
     */
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
              {
                name: 'vendor-peerjs',
                test: /node_modules[\\/](peerjs|peerjs-js-binarypack|eventemitter3|webrtc-adapter|@msgpack[\\/]msgpack)[\\/]/,
              },
              {
                name: 'vendor-qr',
                test: /node_modules[\\/]qrcode\.react[\\/]/,
              },
            ],
          },
        },
      },
    },
  }
})
