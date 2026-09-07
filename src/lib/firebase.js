/**
 * Firebase init for optional Google sign-in + cross-device sync of the
 * want-to-watch list. This is the public web-app config — safe to ship
 * client-side; real access control lives in Firestore security rules
 * (see firestore.rules), not in hiding these values.
 *
 * If the VITE_FIREBASE_* env vars aren't set, `firebaseEnabled` is false
 * and auth/db stay null — sign-in is simply hidden and the app keeps
 * working localStorage-only, exactly as before.
 */
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

const app = firebaseEnabled ? (getApps()[0] || initializeApp(config)) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
