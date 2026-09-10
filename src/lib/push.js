/**
 * Web Push subscription management. Only meaningful for signed-in users —
 * the daily airing digest is driven server-side off each account's
 * Firestore doc, and there's no reliable way to notify a signed-out/local
 * -only session (no server-side record to send to).
 */
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const pushSupported =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY);

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Turns push on: asks OS/browser permission, subscribes, and saves the subscription to the signed-in user's Firestore doc. */
export async function enablePush(user) {
  if (!pushSupported) throw new Error("This browser can't receive push notifications.");
  if (!user || !db) throw new Error('Sign in first — notifications are tied to your synced account.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications were blocked — enable them for this app in your browser/OS settings, then try again.'
        : 'Permission dismissed.'
    );
  }

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await setDoc(
    doc(db, 'users', user.uid),
    { notificationsEnabled: true, pushSubscriptions: arrayUnion(sub.toJSON()) },
    { merge: true }
  );

  return sub;
}

/** Turns push off: unsubscribes this device and removes its subscription from Firestore. */
export async function disablePush(user) {
  if (!pushSupported) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();

  if (sub && user && db) {
    await setDoc(doc(db, 'users', user.uid), { pushSubscriptions: arrayRemove(sub.toJSON()) }, { merge: true }).catch(() => {});
  }
  if (sub) await sub.unsubscribe();
  if (user && db) {
    await setDoc(doc(db, 'users', user.uid), { notificationsEnabled: false }, { merge: true }).catch(() => {});
  }
}
