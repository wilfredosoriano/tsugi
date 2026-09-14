import { useEffect, useRef } from 'react';

// Each blob drifts vertically at its own fraction of scroll distance —
// the differing speeds (rather than one flat image scrolling 1:1) are
// what actually reads as depth. Kept purely on `transform` and driven
// from a single rAF-throttled scroll listener instead of React state,
// so it never triggers a re-render or layout work.
const LAYERS = [
  { className: 'parallax-shape parallax-shape-a', speed: 0.10 },
  { className: 'parallax-shape parallax-shape-b', speed: 0.22 },
  { className: 'parallax-shape parallax-shape-c', speed: 0.15 },
];

export default function ParallaxBackground() {
  const refs = useRef([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = null;
    const apply = () => {
      frame = null;
      const y = window.scrollY;
      LAYERS.forEach((layer, i) => {
        const el = refs.current[i];
        if (el) el.style.transform = `translate3d(0, ${(y * layer.speed).toFixed(1)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (frame == null) frame = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="parallax-bg" aria-hidden="true">
      {LAYERS.map((layer, i) => (
        <div key={i} ref={(el) => { refs.current[i] = el; }} className={layer.className} />
      ))}
    </div>
  );
}
