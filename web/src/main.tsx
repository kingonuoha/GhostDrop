import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

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
