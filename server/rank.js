/**
 * The one place the Groq call lives.
 *
 * Imported by three runtimes that all speak plain JS:
 *   api/recommend.js            → Vercel Function (Node)
 *   functions/api/recommend.js  → Cloudflare Pages Function (Workers)
 *   vite.config.js              → local dev server
 *
 * Design rule: the model ranks and explains a pool of real AniList entries.
 * It never supplies a title, a cover, or a score. Anything it returns that
 * isn't in the pool gets dropped by the caller.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

const MAX_QUESTION = 500;
const MAX_POOL = 60;
const PICKS = 10;

const SYSTEM_PROMPT = [
  'You recommend anime, choosing ONLY from the catalog rows provided.',
  'Never invent a title or an id. Never return an id that is not in the list.',
  `Pick the ${PICKS} best matches for the request, best first.`,
  'Reply with JSON only — no markdown fence, no commentary — shaped exactly:',
  '{"intro":"one sentence addressing the request","picks":[{"id":123,"why":"one sentence"}]}',
  'Each "why" must name the concrete thing that matches: a tone, a structure,',
  'a kind of protagonist, a pacing quality. Never vague praise, never plot spoilers.',
].join(' ');

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Compact one AniList entry into a single prompt line.
 * `pool` arrives from the client, so every field is trusted-but-verify: a
 * crafted POST straight to this endpoint (bypassing the UI) could otherwise
 * pad each row with huge strings and multiply that by MAX_POOL rows to blow
 * up the prompt — and the token bill — on a public, unauthenticated route.
 */
function toRow(m) {
  const title = String(m.title || 'Untitled').slice(0, 100);
  const genres = Array.isArray(m.genres)
    ? m.genres.slice(0, 4).map((g) => String(g).slice(0, 30)).join(', ')
    : '';
  const episodes = Number.isFinite(m.episodes) ? m.episodes : '?';
  const score = Number.isFinite(m.score) ? m.score : '?';
  const id = Number.isFinite(m.id) ? m.id : 0;
  return `${id} | ${title} | ${genres} | ${episodes} ep | ${score}/100`;
}

export async function rankPicks({ question, pool, apiKey, model }) {
  if (!apiKey) {
    throw fail(503, 'GROQ_API_KEY is not set on the server. Add it to .env for local dev, or to your project environment variables when deployed.');
  }
  if (typeof question !== 'string' || !question.trim()) {
    throw fail(400, 'Ask a question first.');
  }
  if (!Array.isArray(pool) || pool.length === 0) {
    throw fail(400, 'No candidates were sent to rank.');
  }

  const trimmed = question.trim().slice(0, MAX_QUESTION);
  const rows = pool.slice(0, MAX_POOL).map(toRow).join('\n');
  const effectiveModel = model || DEFAULT_MODEL;
  // Reasoning models (gpt-oss, qwen, deepseek, …) interleave <think> text into
  // the response by default, which breaks JSON parsing. Groq requires
  // reasoning_format to be explicitly parsed/hidden when combined with JSON
  // mode for these models — non-reasoning models don't accept the field.
  // Their hidden reasoning also eats the token budget non-deterministically
  // at default effort — sometimes leaving too little for the JSON itself and
  // returning a truncated response Groq rejects with "Failed to validate/
  // generate JSON". "low" effort is plenty for a pick-and-justify task and
  // keeps reasoning tokens small and consistent.
  const isReasoningModel = /gpt-oss|qwen|deepseek/i.test(effectiveModel);

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        temperature: 0.4,
        max_tokens: 1300,
        response_format: { type: 'json_object' },
        ...(isReasoningModel && { reasoning_format: 'hidden', reasoning_effort: 'low' }),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Request: ${trimmed}\n\nCatalog (id | title | genres | length | score):\n${rows}`,
          },
        ],
      }),
    });
  } catch {
    throw fail(502, "Couldn't reach Groq. Check your network and try again.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401) throw fail(401, 'Groq rejected the API key.');
    if (res.status === 429) throw fail(429, 'Groq rate limit hit. Wait a few seconds.');
    if (res.status === 404) {
      throw fail(404, `Model "${effectiveModel}" is not available on this account. Check the current model list at console.groq.com and set GROQ_MODEL.`);
    }
    throw fail(res.status, `Groq returned ${res.status}. ${detail.slice(0, 160)}`);
  }

  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw fail(502, 'Groq returned something that was not valid JSON. Try asking again.');
  }

  const allowed = new Set(pool.map((m) => Number(m.id)));
  const picks = (Array.isArray(parsed.picks) ? parsed.picks : [])
    .map((p) => ({ id: Number(p.id), why: String(p.why || '').trim() }))
    .filter((p) => allowed.has(p.id))
    .slice(0, PICKS);

  return {
    intro: typeof parsed.intro === 'string' ? parsed.intro : '',
    picks,
  };
}
