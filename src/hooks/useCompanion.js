import { useCallback, useRef, useState } from 'react';
import { fetchCandidatesFromPlan, resolveTitle } from '../lib/anilist.js';
import { rankPool } from '../lib/rankClient.js';
import { displayTitle } from '../lib/format.js';

let nextId = 1;
const newId = () => `m${nextId++}`;

async function postChat(messages, taste) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, taste }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** What the model sees of the thread: text, plus which titles were already shown (so "different ones" works). */
function toApiMessages(thread) {
  return thread.map((m) => ({
    role: m.role,
    content: m.picks?.length
      ? `${m.text}\n[Shown: ${m.picks.map(displayTitle).join(', ')}]`
      : m.text,
  }));
}

/**
 * The Ask companion's conversation. Each user turn goes:
 *   /api/chat (understand: recommend, clarify, answer or off-topic)
 *   → for recommendations, an AniList search built from the structured plan
 *   → /api/recommend to rank those real titles.
 * Lives only in memory, so a reload starts a fresh chat.
 */
export function useCompanion({ saved, completions }) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const threadRef = useRef([]);
  const busyRef = useRef(false);

  const push = (msg) => {
    threadRef.current = [...threadRef.current, msg];
    setMessages(threadRef.current);
  };

  const send = useCallback(async (raw) => {
    const text = String(raw || '').trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    push({ id: newId(), role: 'user', text });

    try {
      setStage('Thinking it over');
      const taste = saved.slice(0, 12).map(displayTitle);
      const turn = await postChat(toApiMessages(threadRef.current), taste);

      if (turn.intent !== 'recommend' || !turn.search) {
        // Ground the titles an answer talks about in real catalog entries.
        const found = await Promise.all((turn.titles || []).map((t) => resolveTitle(t).catch(() => null)));
        const cards = [...new Map(found.filter(Boolean).map((m) => [m.id, m])).values()];
        push({ id: newId(), role: 'assistant', text: turn.reply, suggestions: turn.suggestions, intent: turn.intent, cards });
        return;
      }

      setStage('Searching the AniList catalog');
      const completedIds = Object.values(completions || {}).flat().map((m) => m?.id).filter(Boolean);
      const shownIds = threadRef.current.flatMap((m) => (m.picks || []).map((p) => p.id));
      const exclude = [...saved.map((m) => m.id), ...completedIds, ...shownIds];
      const { pool } = await fetchCandidatesFromPlan(turn.search, exclude);

      if (!pool.length) {
        push({
          id: newId(),
          role: 'assistant',
          text: "I couldn't find anything in the catalog that fits all of that. Want to loosen one of the conditions?",
          suggestions: turn.suggestions,
        });
        return;
      }

      setStage(`Ranking ${pool.length} candidates`);
      const result = await rankPool(turn.search.summary, pool);
      push({
        id: newId(),
        role: 'assistant',
        text: turn.reply,
        picks: result.picks,
        ranked: !result.degraded,
        degraded: result.degraded,
        suggestions: turn.suggestions,
        intent: 'recommend',
      });
    } catch (err) {
      push({ id: newId(), role: 'assistant', text: err.message || 'Something went wrong. Try again in a moment.', error: true });
    } finally {
      busyRef.current = false;
      setBusy(false);
      setStage('');
    }
  }, [saved, completions]);

  const reset = useCallback(() => {
    if (busyRef.current) return;
    threadRef.current = [];
    setMessages([]);
  }, []);

  return { messages, busy, stage, send, reset };
}
