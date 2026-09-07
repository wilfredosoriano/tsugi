import { useEffect, useRef } from 'react';
import { loadGoogleIdentity } from '../lib/googleIdentity.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9087-2.2581c-.8064.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3319C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853" />
      <path d="M3.9641 10.71c-.18-.54-.2823-1.1164-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.9641 10.71z" fill="#FBBC05" />
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z" fill="#EA4335" />
    </svg>
  );
}

/**
 * A custom-styled "Sign in with Google" button that drives Google
 * Identity Services' OAuth2 token client rather than rendering Google's
 * own iframe widget (see GoogleSignInButton's earlier history / useAuth.js
 * for the full story): that iframe ignores the "filled_black" dark-mode
 * theme it's explicitly asked for and always renders light, and there's
 * no way to override that from our side — confirmed by inspecting the
 * actual iframe request, which correctly asked for filled_black and got
 * a light button back anyway.
 *
 * The token client's popup communicates back via postMessage, not the
 * cross-origin IndexedDB/localStorage relay signInWithPopup/Redirect
 * used — so it isn't subject to the anti-bounce-tracking storage
 * clearing (Safari ITP, Chrome's DIPS) that broke those. It returns an
 * access token, which Firebase can turn into a session just as well as
 * an ID token (see useAuth.js's handleGoogleCredential).
 */
export default function GoogleSignInButton({ onCredential }) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleIdentity().then((google) => {
      if (cancelled || !google) return;
      clientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: (response) => {
          if (response.access_token) onCredential(response.access_token);
        },
      });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [onCredential]);

  return (
    <button className="google-btn" onClick={() => clientRef.current?.requestAccessToken()}>
      <GoogleIcon /> Sign in with Google
    </button>
  );
}
