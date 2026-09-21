/**
 * Ambient page background — "Deep Current" in dark mode, "Ocean Pearl"
 * in light mode (see the .aura-* rules in index.css for the actual
 * per-theme gradients/blend-modes). Renders every layer unconditionally;
 * which set is visible, and at what blur, is entirely CSS-driven off
 * `data-theme` and viewport width, not a prop here.
 */
export default function PageAura() {
  return (
    <div className="aura-bg" aria-hidden="true">
      <div className="aura-layer aura-layer-1" />
      <div className="aura-layer aura-layer-2" />
      <div className="aura-layer aura-layer-3" />
      <div className="aura-grain">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="auraGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0.181 0.608 0.061 0 0.075
                      0.181 0.608 0.061 0 0.075
                      0.181 0.608 0.061 0 0.075
                      0     0     0     1 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#auraGrain)" />
        </svg>
      </div>
    </div>
  );
}
