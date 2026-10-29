import { RuntimeLoader } from '@rive-app/canvas'
import { RIVE_WASM_URL } from './wasmUrl'

/**
 * Single, version matched Rive runtime entry point.
 *
 * Rive's runtime is a WebAssembly module. Left alone it downloads that module
 * from a public CDN on first paint, which would break GhostDrop's offline
 * claim and leak a request to a third party. The `?url` import in
 * `./wasmUrl.ts` makes Vite emit the exact WASM shipped inside
 * `@rive-app/canvas` as a local, content hashed asset, and
 * `RuntimeLoader.setWasmUrl` points the loader at it, so the runtime can only
 * ever come from the same origin as the app.
 *
 * The fallback URL is disabled for the same reason: its default is a CDN, and
 * a silent cross origin fallback defeats the guarantee above.
 *
 * Source: docs/tasks/rive-motion/brief.md phase 1, docs/06-protocol-and-tech-spec.md.
 */

/** Compiled Rive animation served from `web/public/rive/`. One file, four artboards. */
export const RIVE_MOTION_SRC = '/rive/ghostdrop-motion.riv'

export interface RiveMotionTarget {
  readonly artboard: string
  readonly stateMachine: string
}

/**
 * Artboard and state machine pairs exactly as they are named inside
 * `ghostdrop-motion.riv`. Components read these instead of repeating string
 * literals, so a rename in the `.riv` source surfaces in one place.
 * Source: docs/tasks/rive-motion/brief.md, approved artboards table.
 */
export const RIVE_MOTION_TARGETS = {
  cta: { artboard: 'CtaPill', stateMachine: 'cta' },
  qr: { artboard: 'QrFrame', stateMachine: 'qr' },
  teleport: { artboard: 'Teleport', stateMachine: 'teleport' },
  poof: { artboard: 'Poof', stateMachine: 'poof' },
} as const satisfies Record<string, RiveMotionTarget>

export type RiveMotionTargetName = keyof typeof RIVE_MOTION_TARGETS

let wasmRegistered = false

/**
 * Registers the self hosted WASM with the Rive loader. Idempotent: repeated
 * calls, whether from repeated imports or from several mounted canvases, never
 * re-register or restart a runtime load.
 */
export function ensureRiveWasm(): void {
  if (wasmRegistered) return
  wasmRegistered = true
  RuntimeLoader.setWasmUrl(RIVE_WASM_URL)
  RuntimeLoader.setWasmFallbackUrl(null)
  /*
   * The threaded build ships only with `@rive-app/webgl2-threads`, so this
   * package can never reach the URL it points at. It defaults to a public CDN
   * all the same, so it is nulled here explicitly: the offline promise then
   * rests on this file rather than on what the package happens to do with a
   * runtime it does not carry.
   */
  RuntimeLoader.setWasmThreadsUrl(null)
}

// Registering on import means any module that reaches this file has already
// pinned the local runtime before a single `<Rive>` can mount.
ensureRiveWasm()
