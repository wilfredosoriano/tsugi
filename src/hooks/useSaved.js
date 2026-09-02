import { useCallback, useEffect, useState } from 'react';

const KEY = 'tsugi:saved';

/**
 * Want-to-watch list, persisted to localStorage.
 * Stores whole media objects so the list renders offline without refetching.
 */
export function useSaved() {
  const [saved, setSaved] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      // corrupt or unavailable storage — start clean rather than crash
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // quota or private mode — the list stays in memory for this session
    }
  }, [saved, ready]);

  const isSaved = useCallback((id) => saved.some((m) => m.id === id), [saved]);

  const toggle = useCallback((media) => {
    setSaved((prev) =>
      prev.some((m) => m.id === media.id)
        ? prev.filter((m) => m.id !== media.id)
        : [media, ...prev]
    );
  }, []);

  return { saved, isSaved, toggle, ready };
}
