import { companionTurn } from '../server/companion.js';

/** Vercel Function. Thin adapter — the logic lives in server/companion.js. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const result = await companionTurn({
      messages: body.messages,
      taste: body.taste,
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_CHAT_MODEL,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
