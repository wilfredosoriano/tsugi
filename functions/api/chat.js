import { companionTurn } from '../../server/companion.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Cloudflare Pages Function. Secrets arrive on context.env, not process.env. */
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const result = await companionTurn({
      messages: body.messages,
      taste: body.taste,
      apiKey: context.env.GROQ_API_KEY,
      model: context.env.GROQ_CHAT_MODEL,
    });
    return json(result);
  } catch (err) {
    return json({ error: err.message }, err.status || 500);
  }
}

export async function onRequest() {
  return json({ error: 'Use POST.' }, 405);
}
