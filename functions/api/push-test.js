import { sendPush } from '../../server/push.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Cloudflare Pages Function. Secrets arrive on context.env, not process.env. */
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const result = await sendPush({
      subscription: body.subscription,
      payload: {
        title: 'Tsugi',
        body: "Notifications are working — you'll hear from us when your shows air.",
        url: '/',
      },
      vapidPublicKey: context.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: context.env.VAPID_PRIVATE_KEY,
      vapidSubject: context.env.VAPID_SUBJECT,
    });
    return json(result);
  } catch (err) {
    return json({ error: err.message }, err.status || 500);
  }
}

export async function onRequest() {
  return json({ error: 'Use POST.' }, 405);
}
