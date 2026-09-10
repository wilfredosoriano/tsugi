/**
 * The daily airing-digest job (Vercel Cron calls this once a day). For
 * every signed-in user who's opted into notifications, checks their
 * Watching-status titles for anything airing within roughly the next day,
 * and sends one digest push per device.
 *
 * Needs Firebase Admin credentials (a service account, not the public web
 * config already used client-side) since it has to look up every opted-in
 * user, not just one signed-in session.
 */
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore as getFirestoreForApp } from 'firebase-admin/firestore';
import { fetchAiringForIds } from '../src/lib/anilist.js';
import { sendPush } from './push.js';

// 30h rather than exactly 24 — comfortably covers "today" regardless of
// the cron's exact run time or the user's timezone, without stretching
// into "tomorrow" territory.
const WINDOW_MS = 30 * 60 * 60 * 1000;

function getFirestore({ projectId, clientEmail, privateKey }) {
  const app = getApps().length
    ? getApp()
    : (() => {
        if (!projectId || !clientEmail || !privateKey) {
          const err = new Error("Firebase Admin credentials aren't configured on the server yet.");
          err.status = 503;
          throw err;
        }
        return initializeApp({
          // Vercel env vars can't hold real newlines — the private key is
          // pasted with literal "\n" sequences, so they need un-escaping here.
          credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
        });
      })();
  return getFirestoreForApp(app);
}

const displayName = (m) => m.title.english || m.title.romaji;

export async function notifyAiring({ firebase, vapid }) {
  const db = getFirestore(firebase);

  const snap = await db.collection('users').where('notificationsEnabled', '==', true).get();
  const users = snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => Array.isArray(u.pushSubscriptions) && u.pushSubscriptions.length > 0);

  if (!users.length) return { usersChecked: 0, notified: 0 };

  // One AniList round-trip for every distinct Watching-status title across
  // ALL opted-in users, instead of one per user — stays cheap even as the
  // user count grows.
  const ids = new Set();
  for (const u of users) {
    for (const m of u.saved || []) {
      if (m.watchStatus === 'watching') ids.add(m.id);
    }
  }
  const airing = ids.size ? await fetchAiringForIds([...ids]) : [];
  const airingById = new Map(airing.map((a) => [a.media.id, a]));

  const now = Date.now();
  let notified = 0;

  for (const u of users) {
    const due = (u.saved || [])
      .filter((m) => m.watchStatus === 'watching')
      .map((m) => airingById.get(m.id))
      .filter((a) => a && a.airingAt * 1000 > now && a.airingAt * 1000 - now <= WINDOW_MS);

    if (!due.length) continue;

    const payload = {
      title: 'Tsugi',
      body: due.length === 1
        ? `${displayName(due[0].media)} — episode ${due[0].episode} airs today`
        : `${due.length} shows on your list air today: ${due.map((d) => displayName(d.media)).join(', ')}`,
      url: '/',
    };

    const stillValid = [];
    for (const sub of u.pushSubscriptions) {
      try {
        const result = await sendPush({
          subscription: sub,
          payload,
          vapidPublicKey: vapid.publicKey,
          vapidPrivateKey: vapid.privateKey,
          vapidSubject: vapid.subject,
        });
        if (!result.expired) stillValid.push(sub);
      } catch {
        stillValid.push(sub); // transient send failure — keep it, don't punish for a blip
      }
    }
    if (stillValid.length !== u.pushSubscriptions.length) {
      await db.collection('users').doc(u.uid).set({ pushSubscriptions: stillValid }, { merge: true });
    }
    notified += 1;
  }

  return { usersChecked: users.length, notified };
}
