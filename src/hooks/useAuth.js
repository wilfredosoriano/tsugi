import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, firebaseEnabled } from '../lib/firebase.js';

/**
 * Optional Google sign-in, used only to unlock cross-device sync of the
 * want-to-watch list (see useSaved). Everything stays fully usable signed
 * out — this hook just tracks whether someone has opted in.
 *
 * Uses a full-page redirect rather than a popup: the popup flow relies on
 * syncing pending sign-in state between the opener and the popup through
 * IndexedDB, which browsers that partition third-party storage (Safari
 * ITP, incognito, some Chrome versions) block whenever authDomain
 * (*.firebaseapp.com) differs from the site's own domain — the exact
 * setup here — causing an internal Firebase assertion failure instead of
 * a clean error. The redirect flow doesn't depend on that cross-window
 * storage access at all.
 */
function describeAuthError(err) {
  if (err?.code === 'auth/unauthorized-domain') return "Sign-in isn't enabled for this address yet.";
  if (err?.code === 'auth/network-request-failed') return "Couldn't reach the sign-in service — check your connection.";
  return 'Sign-in failed. Please try again.';
}

export function useAuth(onError) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    // Resolves the sign-in after signInWithRedirect below sends the user
    // back here; harmless no-op on any load that isn't that return trip.
    getRedirectResult(auth).catch((err) => onError?.(describeAuthError(err)));
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  const signIn = () => {
    if (!firebaseEnabled) return;
    signInWithRedirect(auth, googleProvider).catch((err) => onError?.(describeAuthError(err)));
  };

  const signOut = () => {
    if (!firebaseEnabled) return;
    firebaseSignOut(auth).catch((err) => onError?.(describeAuthError(err)));
  };

  return { user, authReady, signIn, signOut, enabled: firebaseEnabled };
}
