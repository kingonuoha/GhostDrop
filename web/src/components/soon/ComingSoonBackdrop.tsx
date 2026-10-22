import { ComingSoonSquiggles } from './ComingSoonSquiggles'

/**
 * Decorative backdrop for the prelaunch coming soon wall.
 *
 * Four locked brand colours drift periodically on four axes (up, down, right, left),
 * while authentic brand squiggles self-draw gracefully from perimeter edges.
 *
 * Requirements:
 * - Brand color slabs sliding continuously in an animation loop.
 * - Genuine brand colors (Acid Lime #CDF22B, Electric Cobalt #1E45FB, Deep Forest #124B38).
 * - Equalized perimeter squiggles with round tips (never flat).
 */
export function ComingSoonBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-brand-canvas"
    >
      {/* 4 brand color fields sliding periodically on 4 axes */}
      <span className="soon-slab soon-slab-lime" />
      <span className="soon-slab soon-slab-cobalt" />
      <span className="soon-slab soon-slab-forest" />
      <span className="soon-slab soon-slab-stone" />

      {/* Subtle brand tactile dot texture */}
      <div className="soon-brand-texture pointer-events-none absolute inset-0" />

      {/* Center contrast wash for crisp typography */}
      <div className="soon-scrim" />

      {/* Equalized perimeter self-drawing squiggles */}
      <ComingSoonSquiggles />
    </div>
  )
}
