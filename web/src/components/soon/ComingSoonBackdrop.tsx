import { ComingSoonSquiggles } from './ComingSoonSquiggles'

/**
 * Decorative backdrop for the prelaunch coming soon wall.
 *
 * Four locked brand colours drift as soft fields on four axes using
 * `transform: translate3d()` only, the squiggle layer draws itself over them,
 * and the Warm Stone wash carries the text. The fields and the line are two
 * separate motion primitives: D-006 bans fly, slide and bounce on the squiggly
 * line, D-015 item 7 permits the slab drift, and neither borrows from the other.
 *
 * Sources: plans/coming-soon-wall-plan.md sections 5.1 and 5.4, decisions.md
 * D-015 items 6 to 9, docs/05-motion-spec.md.
 *
 * The layer is `absolute inset-0` and `overflow: hidden`, so a drifting field can
 * never add a scrollbar or a horizontal scroll at 360px. The page renders this
 * once, on a positioned ancestor, and renders nothing else from this folder.
 */
export function ComingSoonBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <span className="soon-slab soon-slab-lime" />
      <span className="soon-slab soon-slab-cobalt" />
      <span className="soon-slab soon-slab-forest" />
      <span className="soon-slab soon-slab-stone" />
      <ComingSoonSquiggles />
      <div className="soon-scrim" />
    </div>
  )
}
