import { useEffect, useRef } from 'react';
import { Flower2, Sparkles, Star, Clapperboard, Film, Wand2 } from 'lucide-react';

// Anime-flavored decorations, scattered across the viewport and drifting
// past at their own speed as the page scrolls — faster ones read as
// "closer," slower ones as "further back," which is what sells the
// depth illusion. Each also gets its own gentle continuous 3D
// tilt/bob animation (see .floating-object-inner) so they feel alive
// even before you scroll.
const OBJECTS = [
  { Icon: Flower2, top: '8%', left: '6%', size: 40, speed: 0.15, color: 'var(--accent-strong)', duration: 7 },
  { Icon: Sparkles, top: '16%', left: '84%', size: 30, speed: 0.28, color: 'var(--accent)', duration: 6 },
  { Icon: Star, top: '44%', left: '12%', size: 26, speed: 0.08, color: 'var(--text-soft)', duration: 9 },
  { Icon: Clapperboard, top: '60%', left: '88%', size: 36, speed: 0.20, color: 'var(--accent-strong)', duration: 8 },
  { Icon: Film, top: '78%', left: '20%', size: 32, speed: 0.12, color: 'var(--accent)', duration: 10 },
  { Icon: Wand2, top: '30%', left: '48%', size: 28, speed: 0.24, color: 'var(--text-soft)', duration: 7.5 },
];

export default function ParallaxBackground() {
  const refs = useRef([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = null;
    const apply = () => {
      frame = null;
      const y = window.scrollY;
      OBJECTS.forEach((obj, i) => {
        const el = refs.current[i];
        if (el) el.style.transform = `translate3d(0, ${(-y * obj.speed).toFixed(1)}px, 0)`;
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
    <div className="floating-objects" aria-hidden="true">
      {OBJECTS.map(({ Icon, top, left, size, color, duration }, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="floating-object"
          style={{ top, left }}
        >
          <div className="floating-object-inner" style={{ animationDuration: `${duration}s` }}>
            <Icon size={size} color={color} strokeWidth={1.5} />
          </div>
        </div>
      ))}
    </div>
  );
}
