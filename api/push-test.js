import { sendPush } from '../server/push.js';

/** Vercel Function. Sends one immediate test push — bypasses Firestore and
 *  the daily digest entirely, so the whole pipeline (service worker →
 *  subscription → server send → device) can be verified on demand. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const result = await sendPush({
      subscription: body.subscription,
      payload: {
        title: 'Tsugi',
        body: "Notifications are working — you'll hear from us when your shows air.",
        url: '/',
      },
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
      vapidSubject: process.env.VAPID_SUBJECT,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
