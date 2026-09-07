let scriptPromise = null;

/** Loads Google Identity Services once and caches the promise across callers. */
export function loadGoogleIdentity() {
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}
