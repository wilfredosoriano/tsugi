import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCandidatesFromPlan, resolveTitle } from '../lib/anilist.js';
import { rankPool } from '../lib/rankClient.js';
import { displayTitle } from '../lib/format.js';

let nextId = 1;
const newId = () => `m${nextId++}`;

/* Fair-use cap, per device. The AI runs on a shared free-tier budget, so this
   keeps one person from using it all up; it isn't a security boundary (the
   free tier can't run up a bill, so a server-side store isn't worth it). */
export const ASK_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const LOG_KEY = 'tsugi:askLog';

function readLog(now = Date.now()) {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((t) => typeof t === 'number' && now - t < WINDOW_MS).sort((a, b) => a - b) : [];
  } catch {
    return [];
  }
}

function writeLog(log) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // private mode / quota — the cap just won't persist across reloads
  }
}

async function postChat(messages, taste) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, taste }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
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
  const [log, setLog] = useState(readLog);

  // Re-read now and then so the count frees up as the hour rolls on.
  useEffect(() => {
    if (!log.length) return undefined;
    const id = setInterval(() => setLog(readLog()), 30000);
    return () => clearInterval(id);
  }, [log.length]);

  const push = (msg) => {
    threadRef.current = [...threadRef.current, msg];
    setMessages(threadRef.current);
  };

  const send = useCallback(async (raw) => {
    const text = String(raw || '').trim();
    if (!text || busyRef.current) return;
    const used = readLog();
    if (used.length >= ASK_LIMIT) {
      setLog(used);
      return;
    }
    const nextLog = [...used, Date.now()];
    writeLog(nextLog);
    setLog(nextLog);
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
      const busyNow = err.status === 429;
      push({
        id: newId(),
        role: 'assistant',
        text: busyNow
          ? 'Lots of people are asking right now. Give it a few seconds, then try again.'
          : err.message || 'Something went wrong. Try again in a moment.',
        error: true,
        retry: text,
      });
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

  const remaining = Math.max(0, ASK_LIMIT - log.length);
  const resetInMin = log.length ? Math.max(1, Math.ceil((log[0] + WINDOW_MS - Date.now()) / 60000)) : 0;

  return { messages, busy, stage, send, reset, remaining, resetInMin };
}
