import { Sparkles } from 'lucide-react';
import { useTypedPlaceholder } from '../hooks/useTypedPlaceholder.js';

const EXAMPLES = [
  { label: 'similar to Black Clover', text: "Something similar to Black Clover, but with better fights" },
  { label: 'short, one weekend', text: 'A short series I can finish in one weekend, under 15 episodes' },
  { label: 'clever thrillers', text: 'Psychological thrillers where the main character is genuinely clever' },
  { label: 'calm before bed', text: 'Something calm and beautiful to watch before bed, low stakes' },
];

const PLACEHOLDER_PHRASES = EXAMPLES.map((ex) => ex.text);

export default function AskPanel({ value, onChange, onAsk, busy }) {
  const typedPlaceholder = useTypedPlaceholder(PLACEHOLDER_PHRASES, value.length === 0);

  const canAsk = !busy && value.trim().length > 0;

  return (
    <section className="ask">
      <div className="ask-head">
        <span className="n" aria-hidden="true">問</span>
        <div>
          <h2>Ask for a recommendation</h2>
          <p className="ask-sub">Describe a mood, a length, or a show you loved — picks come straight from the AniList catalog.</p>
        </div>
      </div>

      <div className="ask-body">
        {/* One bordered composer holding both the text and its submit
            button, chat-style, so the action sits right where the typing
            ends instead of floating below the suggestion chips. */}
        <div className="ask-composer">
          <textarea
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onAsk();
            }}
            placeholder={typedPlaceholder || 'Ask for something to watch…'}
            aria-label="Describe what you want to watch"
          />
          <div className="ask-composer-foot">
            <span className="ask-kbd" aria-hidden="true">⌘ / Ctrl + Enter</span>
            <button className="btn ask-submit" onClick={onAsk} disabled={!canAsk}>
              <Sparkles size={15} strokeWidth={2.25} />
              {busy ? 'Reading…' : 'Recommend'}
            </button>
          </div>
        </div>

        <div className="chips">
          <span className="chips-label">Try</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.label} onClick={() => onChange(ex.text)}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
