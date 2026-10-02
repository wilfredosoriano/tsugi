import { toPromptRows } from './anilist.js';

/**
 * Sends a pool of real catalog entries to /api/recommend and maps the
 * model's picks back onto them. Falls back to the pool's own order (marked
 * `degraded`) if the model is unavailable, so a request never comes back
 * empty-handed.
 */
export async function rankPool(requestText, pool) {
  let intro = '';
  let picks = pool.slice(0, 10);
  let degraded = '';

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: requestText, pool: toPromptRows(pool) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

    const byId = new Map(pool.map((m) => [m.id, m]));
    const resolved = data.picks
      .map((p) => {
        const media = byId.get(p.id);
        return media ? { ...media, _why: p.why } : null;
      })
      .filter(Boolean);

    if (resolved.length) {
      intro = data.intro;
      picks = resolved;
    } else {
      degraded = 'The model returned nothing usable. Showing the closest catalog matches instead.';
    }
  } catch (err) {
    degraded = err.message;
  }

  return { intro, picks, degraded };
}
