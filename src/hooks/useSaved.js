import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

const KEY = 'tsugi:saved';

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

/**
 * Want-to-watch list. Always persisted to localStorage (so the app works
 * fully with no login), and additionally mirrored to Firestore while
 * `user` is signed in, so it follows them to other devices.
 *
 * Stores whole media objects so the list renders offline without refetching.
 */
export function useSaved(user) {
  const [saved, setSaved] = useState([]);
  const [ready, setReady] = useState(false);
  const savedRef = useRef(saved);
  savedRef.current = saved;

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

  // While signed in, mirror this list with the user's Firestore doc. On
  // first sign-in (or a fresh device), this unions whatever's already
  // local into the cloud copy rather than letting either side clobber the
  // other. After that, a live listener picks up changes made from other
  // signed-in devices; `hasPendingWrites` skips the instant echo of our
  // own writes so it doesn't fight with the optimistic local update below.
  useEffect(() => {
    if (!ready || !user || !db) return undefined;
    const ref = doc(db, 'users', user.uid);
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(ref);
        const cloud = snap.exists() ? (snap.data().saved || []) : [];
        const known = new Set(cloud.map((m) => m.id));
        const merged = [...cloud, ...savedRef.current.filter((m) => !known.has(m.id))];
        if (!cancelled) await setDoc(ref, { saved: merged, updatedAt: Date.now() });
      } catch {
        // offline or blocked — local list still works, will retry next sign-in
      }
    })();

    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const data = snap.data();
      if (data) setSaved(data.saved || []);
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [ready, user?.uid]);

  const pushCloud = useCallback((next) => {
    if (user && db) {
      setDoc(doc(db, 'users', user.uid), { saved: next, updatedAt: Date.now() }).catch(() => {});
    }
  }, [user]);

  const isSaved = useCallback((id) => saved.some((m) => m.id === id), [saved]);

  const toggle = useCallback((media) => {
    setSaved((prev) => {
      const next = prev.some((m) => m.id === media.id)
        ? prev.filter((m) => m.id !== media.id)
        : [media, ...prev];
      pushCloud(next);
      return next;
    });
  }, [pushCloud]);

  /** Unions an imported list into the current one, deduped by id — never overwrites. */
  const merge = useCallback((items) => {
    const incoming = Array.isArray(items) ? items.filter(isValidSavedItem) : [];
    const known = new Set(saved.map((m) => m.id));
    const fresh = incoming.filter((m) => !known.has(m.id));
    if (fresh.length) {
      setSaved((prev) => {
        const next = [...fresh, ...prev];
        pushCloud(next);
        return next;
      });
    }
    return {
      added: fresh.length,
      skipped: incoming.length - fresh.length,
      invalid: (Array.isArray(items) ? items.length : 0) - incoming.length,
    };
  }, [saved, pushCloud]);

  return { saved, isSaved, toggle, merge, ready };
}
