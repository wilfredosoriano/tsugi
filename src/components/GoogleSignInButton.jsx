import { useEffect, useRef } from 'react';
import { loadGoogleIdentity } from '../lib/googleIdentity.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Google's own rendered "Sign in with Google" button, via Google Identity
 * Services — not a custom-styled button. See useAuth.js for why: GIS
 * supports FedCM, which survives the storage protections that silently
 * broke both the popup and redirect approaches tried before this.
 */
export default function GoogleSignInButton({ onCredential, theme }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleIdentity().then((google) => {
      if (cancelled || !ref.current || !google) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      });
      ref.current.innerHTML = '';
      google.accounts.id.renderButton(ref.current, {
        type: 'standard',
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        size: 'medium',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
      });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [theme, onCredential]);

  return <div ref={ref} className="google-signin-btn" />;
}
