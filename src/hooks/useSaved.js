import { useCallback, useEffect, useState } from 'react';

const KEY = 'tsugi:saved';

/** Guards against malformed/foreign JSON crashing the grid on import. */
function isValidSavedItem(m) {
  return (
    m != null &&
    typeof m === 'object' &&
    Number.isInteger(m.id) &&
    m.title && typeof m.title === 'object' &&
    (typeof m.title.romaji === 'string' || typeof m.title.english === 'string') &&
    m.coverImage && typeof m.coverImage === 'object' &&
    typeof m.coverImage.large === 'string'
  );
}

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

  /** Unions an imported list into the current one, deduped by id — never overwrites. */
  const merge = useCallback((items) => {
    const incoming = Array.isArray(items) ? items.filter(isValidSavedItem) : [];
    const known = new Set(saved.map((m) => m.id));
    const fresh = incoming.filter((m) => !known.has(m.id));
    if (fresh.length) setSaved((prev) => [...fresh, ...prev]);
    return {
      added: fresh.length,
      skipped: incoming.length - fresh.length,
      invalid: (Array.isArray(items) ? items.length : 0) - incoming.length,
    };
  }, [saved]);

  return { saved, isSaved, toggle, merge, ready };
}
