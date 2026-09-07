import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, firebaseEnabled } from '../lib/firebase.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function describeAuthError(err) {
  if (err?.code === 'auth/network-request-failed') return "Couldn't reach the sign-in service — check your connection.";
  return 'Sign-in failed. Please try again.';
}

/**
 * Optional Google sign-in, used only to unlock cross-device sync of the
 * want-to-watch list (see useSaved). Everything stays fully usable signed
 * out — this hook just tracks whether someone has opted in.
 *
 * Identity comes from Google Identity Services (see GoogleSignInButton),
 * not Firebase's own signInWithPopup/signInWithRedirect — both of those
 * route through the separate `firebaseapp.com` auth domain, and modern
 * browsers' anti-bounce-tracking storage protections (Safari ITP,
 * Chrome's DIPS) silently break that round trip: no error, but the
 * storage carrying the sign-in result back gets wiped. GIS issues a
 * credential directly in this page instead, so there's no cross-site
 * redirect to break; handleGoogleCredential below just exchanges that
 * credential for a normal Firebase session.
 */
export function useAuth(onError) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  const handleGoogleCredential = useCallback((idToken) => {
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).catch(
      (err) => onError?.(describeAuthError(err))
    );
  }, [onError]);

  const signOut = useCallback(() => {
    if (!firebaseEnabled) return;
    firebaseSignOut(auth).catch((err) => onError?.(describeAuthError(err)));
  }, [onError]);

  return {
    user,
    authReady,
    signOut,
    handleGoogleCredential,
    enabled: firebaseEnabled && Boolean(GOOGLE_CLIENT_ID),
  };
}
