import { useEffect, useRef } from 'react';
import { loadGoogleIdentity } from '../lib/googleIdentity.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Google's own rendered "Sign in with Google" button, via Google Identity
 * Services — not a custom-styled button. See useAuth.js for why: GIS
 * supports FedCM, which survives the storage protections that silently
 * broke both the popup and redirect approaches tried before this.
 *
 * Always rendered with the light "outline" theme, deliberately not tied
 * to the app's own dark/light toggle: Google's button doesn't reliably
 * honor the "filled_black" dark-mode theme (it still renders light in
 * FedCM-enabled browsers), so re-requesting a theme on every toggle just
 * tore the iframe down and rebuilt it — a visible blink — for a color
 * change that never actually landed. It sits in its own neutral card
 * (see .google-signin-btn-wrap in index.css) instead of trying to blend
 * into either theme.
 */
export default function GoogleSignInButton({ onCredential }) {
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
        theme: 'outline',
        size: 'medium',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
      });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [onCredential]);

  return (
    <div className="google-signin-btn-wrap">
      <div ref={ref} className="google-signin-btn" />
    </div>
  );
}
