import { useEffect, useRef } from 'react';

/**
 * Calls `onIntersect` whenever the returned ref's element scrolls near the
 * viewport — attach it to a sentinel placed after the last page of results.
 * `rootMargin` triggers the load a bit before the sentinel is actually
 * visible, so the next page is ready before the user hits the bottom.
 */
export function useInfiniteScroll(onIntersect, enabled) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onIntersect(); },
      { rootMargin: '600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return ref;
}
