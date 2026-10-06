import { useEffect, useRef } from 'react';
import { RotateCcw, RefreshCw } from 'lucide-react';
import PicksShowcase from '../components/PicksShowcase.jsx';
import { Loading, Note } from '../components/Grid.jsx';
import RevealHeading from '../components/RevealHeading.jsx';
import ChatComposer from '../components/ChatComposer.jsx';
import { EXAMPLES } from '../components/AskPanel.jsx';
import { displayTitle } from '../lib/format.js';

const GREETING = 'Hey, I’m Tsugi. Tell me a mood, a show you loved, or how much time you have, and I’ll find something from the AniList catalog. You can also ask me anything about anime.';

function BotMessage({ text, error, children }) {
  return (
    <div className="msg bot">
      <span className="msg-avatar" aria-hidden="true">次</span>
      <div className="msg-body">
        <p className={`bubble${error ? ' error' : ''}`}>{text}</p>
        {children}
      </div>
    </div>
  );
}

function Suggestions({ items, onSend, label }) {
  return (
    <div className="chips chat-suggestions" role="group" aria-label={label}>
      {items.map((s) => (
        <button key={s} onClick={() => onSend(s)}>{s}</button>
      ))}
    </div>
  );
}

/** The companion chat: a scrolling thread with the composer pinned underneath. */
export default function AskScreen({ messages, busy, stage, onSend, onReset, onOpen, onSave, isSaved, remaining, resetInMin, limit }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);

  const locked = remaining <= 0;
  const note = locked
    ? `You’ve used all ${limit} asks for this hour. You can ask again in ${resetInMin} min.`
    : remaining <= 3
      ? `${remaining} ask${remaining === 1 ? '' : 's'} left this hour.`
      : null;

  const last = messages[messages.length - 1];
  const suggestions = !busy && last?.role === 'assistant' && last.suggestions?.length ? last.suggestions : null;

  return (
    <div className="ask-screen">
      <header className="ask-screen-head">
        <div className="screen-head">
          <RevealHeading as="h1" className="screen-title">Ask</RevealHeading>
          <p className="screen-sub">Your anime companion. Keep talking to narrow it down.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn ghost sm" onClick={onReset} disabled={busy}>
            <RotateCcw size={16} strokeWidth={2.5} /> New chat
          </button>
        )}
      </header>

      <div className="chat-thread" role="log" aria-live="polite" aria-label="Conversation">
        <BotMessage text={GREETING} />
        {messages.length === 0 && (
          <Suggestions items={EXAMPLES.map((ex) => ex.text)} onSend={onSend} label="Example requests" />
        )}

        {messages.map((m) => (m.role === 'user' ? (
          <div className="msg user" key={m.id}>
            <p className="bubble">{m.text}</p>
          </div>
        ) : (
          <BotMessage key={m.id} text={m.text} error={m.error}>
            {m.retry && m.id === last?.id && !busy && !locked && (
              <div className="chips chat-suggestions">
                <button onClick={() => onSend(m.retry)}><RefreshCw size={14} strokeWidth={2.5} /> Try again</button>
              </div>
            )}
            {m.degraded && (
              <Note error><strong>Ranked without AI.</strong> {m.degraded}</Note>
            )}
            {m.cards?.length > 0 && (
              <div className="msg-cards">
                {m.cards.map((c) => (
                  <button
                    key={c.id}
                    className="msg-card"
                    onClick={(e) => onOpen(c, e.currentTarget.getBoundingClientRect())}
                  >
                    <img src={c.coverImage.large} alt="" loading="lazy" />
                    <span className="msg-card-text">
                      <span className="msg-card-title">{displayTitle(c)}</span>
                      <span className="num">{[c.seasonYear, c.format?.replace('_', ' ')].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {m.picks?.length > 0 && (
              <div className="msg-picks">
                <PicksShowcase items={m.picks} ranked={m.ranked} onOpen={onOpen} onSave={onSave} isSaved={isSaved} />
              </div>
            )}
          </BotMessage>
        )))}

        {busy && (
          <div className="msg bot">
            <span className="msg-avatar" aria-hidden="true">次</span>
            <div className="msg-body"><Loading>{stage}</Loading></div>
          </div>
        )}

        {suggestions && <Suggestions items={suggestions} onSend={onSend} label="Suggested replies" />}
        <div ref={endRef} className="chat-end" />
      </div>

      <ChatComposer onSend={onSend} busy={busy} locked={locked} note={note} />
    </div>
  );
}
