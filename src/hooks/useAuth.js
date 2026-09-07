import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, firebaseEnabled } from '../lib/firebase.js';

/**
 * Optional Google sign-in, used only to unlock cross-device sync of the
 * want-to-watch list (see useSaved). Everything stays fully usable signed
 * out — this hook just tracks whether someone has opted in.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  const signIn = () => {
    if (!firebaseEnabled) return;
    signInWithPopup(auth, googleProvider).catch(() => {
      // popup closed/blocked — nothing to recover, user can just retry
    });
  };

  const signOut = () => {
    if (!firebaseEnabled) return;
    firebaseSignOut(auth).catch(() => {});
  };

  return { user, authReady, signIn, signOut, enabled: firebaseEnabled };
}
