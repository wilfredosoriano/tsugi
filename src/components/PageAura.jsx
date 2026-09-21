/**
 * Ambient page background — "Abyssal Floor" in dark mode, "Ocean Pearl"
 * in light mode (see the .aura-* rules in index.css for the actual
 * per-theme gradients/blend-modes, and the .aura-grain rule for the
 * tiled film-grain texture). Renders every layer unconditionally; which
 * set is visible, and at what blur, is entirely CSS-driven off
 * `data-theme` and viewport width, not a prop here.
 */
export default function PageAura() {
  return (
    <div className="aura-bg" aria-hidden="true">
      <div className="aura-layer aura-layer-1" />
      <div className="aura-layer aura-layer-2" />
      <div className="aura-grain" />
    </div>
  );
}
