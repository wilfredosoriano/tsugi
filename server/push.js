/**
 * The one place the actual Web Push send lives. Imported by both the
 * "send me a test" endpoint and, later, the daily airing digest — mirrors
 * how server/rank.js centralizes the Groq call for the same reason.
 */

import webpush from 'web-push';

/**
 * Sends a single Web Push message to a single subscription.
 * Returns { ok: true } on success, or { ok: false, expired: true } if the
 * push service says the subscription no longer exists (uninstalled,
 * permission revoked, etc.) — callers should drop an expired subscription
 * from storage rather than retry it.
 */
export async function sendPush({ subscription, payload, vapidPublicKey, vapidPrivateKey, vapidSubject }) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    const err = new Error("Push notifications aren't configured on the server yet.");
    err.status = 503;
    throw err;
  }
  if (!subscription?.endpoint) {
    const err = new Error('No subscription provided.');
    err.status = 400;
    throw err;
  }

  webpush.setVapidDetails(vapidSubject || 'https://tsugi.app', vapidPublicKey, vapidPrivateKey);

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { ok: false, expired: true };
    }
    throw err;
  }
}
