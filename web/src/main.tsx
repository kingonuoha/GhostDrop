import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * Pin the self hosted Rive runtime asset into the build.
 *
 * Vite only publishes a `?url` import when the module holding it is part of the
 * graph. The Rive canvas itself stays lazy, so without this reference the WASM
 * would be missing from `dist/` and the service worker could not precache it,
 * which is exactly what breaks the offline promise for motion.
 */
import './lib/rive/wasmUrl'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

/**
 * StrictMode is intentionally omitted.
 *
 * React StrictMode mounts every effect twice in development. A signaling engine
 * owns a single fixed PeerJS id for the room host, so the throwaway first mount
 * registers the id, is destroyed, and the real mount then collides with the
 * socket that is still closing. PeerJS reports "WebSocket is closed before the
 * connection is established" and the host never becomes reachable.
 *
 * The room lifecycle is covered by the provider and by explicit cleanup in
 * useGhostRoom, so development matches production here.
 */
createRoot(rootElement).render(<App />)
