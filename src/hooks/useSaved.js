import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { DEFAULT_WATCH_STATUS } from '../lib/watchStatus.js';

const KEY = 'tsugi:saved';
const COMPLETIONS_KEY = 'tsugi:completions';

/** Guards against malformed/foreign JSON crashing the grid on import. */
export function isValidSavedItem(m) {
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

/** Backfills watchStatus on items saved before status tracking existed. */
function withDefaultStatus(items) {
  return items.map((m) => (m.watchStatus ? m : { ...m, watchStatus: DEFAULT_WATCH_STATUS }));
}

/**
 * Want-to-watch list. Two entirely separate lists, never merged: a local
 * one (localStorage), used whenever signed out, and a cloud one
 * (Firestore, under the signed-in user's own uid), used whenever signed
 * in. Signing in shows exactly what's already saved to that account
 * (empty on a first sign-in); signing out reveals the local list again,
 * untouched. Whichever one is active also mirrors live across other
 * signed-in devices via a Firestore listener.
 *
 * Each item carries its own watchStatus (planning/watching/completed),
 * defaulting to planning when first saved.
 *
 * `completions` is a { year: count } tally of titles marked Completed —
 * tracked separately from the list itself (same local/cloud split) so
 * it keeps counting toward "titles watched this year / all-time" even
 * after a title is later removed from the list, matching the "how many
 * have I watched" feeling rather than "how many are currently marked
 * done."
 *
 * Stores whole media objects so the list renders offline without refetching.
 */
export function useSaved(user) {
  const [localSaved, setLocalSaved] = useState([]);
  const [localReady, setLocalReady] = useState(false);
  const [cloudSaved, setCloudSaved] = useState([]);
  const [cloudReady, setCloudReady] = useState(false);

  const [localCompletions, setLocalCompletions] = useState({});
  const [cloudCompletions, setCloudCompletions] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLocalSaved(withDefaultStatus(JSON.parse(raw)));
      const rawCompletions = localStorage.getItem(COMPLETIONS_KEY);
      if (rawCompletions) setLocalCompletions(JSON.parse(rawCompletions));
    } catch {
      // corrupt or unavailable storage — start clean rather than crash
    }
    setLocalReady(true);
  }, []);

  useEffect(() => {
    if (!localReady) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(localSaved));
    } catch {
      // quota or private mode — the list stays in memory for this session
    }
  }, [localSaved, localReady]);

  useEffect(() => {
    if (!localReady) return;
    try {
      localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(localCompletions));
    } catch {
      // quota or private mode — the tally stays in memory for this session
    }
  }, [localCompletions, localReady]);

  useEffect(() => {
    if (!user || !db) {
      setCloudSaved([]);
      setCloudCompletions({});
      setCloudReady(false);
      return undefined;
    }
    setCloudReady(false);
    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setCloudSaved(withDefaultStatus(snap.data()?.saved || []));
        setCloudCompletions(snap.data()?.completions || {});
        setCloudReady(true);
      },
      () => setCloudReady(true) // offline/blocked — show empty rather than hang
    );
    return () => unsubscribe();
  }, [user?.uid]);

  const saved = user ? cloudSaved : localSaved;
  const ready = user ? cloudReady : localReady;
  const completions = user ? cloudCompletions : localCompletions;

  const isSaved = useCallback((id) => saved.some((m) => m.id === id), [saved]);

  const toggle = useCallback((media) => {
    if (user && db) {
      setCloudSaved((prev) => {
        const next = prev.some((m) => m.id === media.id)
          ? prev.filter((m) => m.id !== media.id)
          : [{ ...media, watchStatus: DEFAULT_WATCH_STATUS }, ...prev];
        setDoc(doc(db, 'users', user.uid), { saved: next, updatedAt: Date.now() }).catch(() => {});
        return next;
      });
    } else {
      setLocalSaved((prev) =>
        prev.some((m) => m.id === media.id)
          ? prev.filter((m) => m.id !== media.id)
          : [{ ...media, watchStatus: DEFAULT_WATCH_STATUS }, ...prev]
      );
    }
  }, [user]);

  const setWatchStatus = useCallback((id, watchStatus) => {
    const apply = (prev) => prev.map((m) => (m.id === id ? { ...m, watchStatus } : m));
    const wasCompleted = (prev) => prev.find((m) => m.id === id)?.watchStatus === 'completed';
    const bumpCompletions = watchStatus === 'completed';

    if (user && db) {
      setCloudSaved((prev) => {
        if (bumpCompletions && !wasCompleted(prev)) {
          const year = String(new Date().getFullYear());
          setCloudCompletions((prevCompletions) => {
            const nextCompletions = { ...prevCompletions, [year]: (prevCompletions[year] || 0) + 1 };
            setDoc(doc(db, 'users', user.uid), { completions: nextCompletions }, { merge: true }).catch(() => {});
            return nextCompletions;
          });
        }
        const next = apply(prev);
        setDoc(doc(db, 'users', user.uid), { saved: next, updatedAt: Date.now() }).catch(() => {});
        return next;
      });
    } else {
      setLocalSaved((prev) => {
        if (bumpCompletions && !wasCompleted(prev)) {
          const year = String(new Date().getFullYear());
          setLocalCompletions((prevCompletions) => ({ ...prevCompletions, [year]: (prevCompletions[year] || 0) + 1 }));
        }
        return apply(prev);
      });
    }
  }, [user]);

  /** Unions an imported list into the current (active) one, deduped by id — never overwrites. */
  const merge = useCallback((items) => {
    const incoming = withDefaultStatus(Array.isArray(items) ? items.filter(isValidSavedItem) : []);
    const known = new Set(saved.map((m) => m.id));
    const fresh = incoming.filter((m) => !known.has(m.id));
    if (fresh.length) {
      if (user && db) {
        setCloudSaved((prev) => {
          const next = [...fresh, ...prev];
          setDoc(doc(db, 'users', user.uid), { saved: next, updatedAt: Date.now() }).catch(() => {});
          return next;
        });
      } else {
        setLocalSaved((prev) => [...fresh, ...prev]);
      }
    }
    return {
      added: fresh.length,
      skipped: incoming.length - fresh.length,
      invalid: (Array.isArray(items) ? items.length : 0) - incoming.length,
    };
  }, [saved, user]);

  return { saved, isSaved, toggle, setWatchStatus, merge, ready, completions };
}
