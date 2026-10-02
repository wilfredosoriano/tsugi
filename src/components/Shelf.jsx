import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A horizontal scroll-snap shelf. The prev/next buttons only show on
 * desktop (CSS); touch devices just swipe.
 */
export default function Shelf({ children, label }) {
  const trackRef = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, children]);

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="shelf">
      <button className="shelf-btn prev" onClick={() => scrollBy(-1)} disabled={edge.start} aria-label={`Scroll ${label} left`}>
        <ChevronLeft size={22} strokeWidth={3} />
      </button>
      <div className="shelf-track" ref={trackRef} onScroll={measure}>{children}</div>
      <button className="shelf-btn next" onClick={() => scrollBy(1)} disabled={edge.end} aria-label={`Scroll ${label} right`}>
        <ChevronRight size={22} strokeWidth={3} />
      </button>
    </div>
  );
}
