import { notifyAiring } from '../server/notify-airing.js';

/**
 * Vercel Function, triggered once a day by the cron entry in vercel.json.
 * Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
 * invocations — checked here so a random visitor can't trigger a mass
 * notification run. A `?secret=` query param is also accepted so this can
 * be triggered manually (e.g. from a browser) without waiting a full day.
 */
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const authorized = Boolean(secret) && (req.headers.authorization === `Bearer ${secret}` || req.query?.secret === secret);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await notifyAiring({
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      },
      vapid: {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
        subject: process.env.VAPID_SUBJECT,
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
