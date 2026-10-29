import riveWasmUrl from '@rive-app/canvas/rive.wasm?url'

/**
 * Version matched URL of the Rive WebAssembly runtime.
 *
 * Rive's loader downloads its WASM from a public CDN by default. The `?url`
 * import asks Vite to publish the exact file that ships inside
 * `@rive-app/canvas`, as a local content hashed asset, so the runtime always
 * comes from the same origin as the app and works offline once precached.
 *
 * This module is deliberately tiny: it carries the asset URL without pulling
 * the Rive JavaScript runtime into any bundle that only needs the path.
 *
 * Source: docs/tasks/rive-motion/brief.md phase 1.
 */
export const RIVE_WASM_URL: string = riveWasmUrl
