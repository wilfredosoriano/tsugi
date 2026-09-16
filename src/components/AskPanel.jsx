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

  return (
    <section className="ask">
      <div className="ask-head">
        <span className="n" aria-hidden="true">問</span>
        <h2>Ask for a recommendation</h2>
      </div>

      <div className="ask-body">
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

        <div className="chips">
          {EXAMPLES.map((ex) => (
            <button key={ex.label} onClick={() => onChange(ex.text)}>
              {ex.label}
            </button>
          ))}
        </div>

        <div className="ask-row">
          <button className="btn" onClick={onAsk} disabled={busy}>
            {busy ? 'Reading…' : 'Recommend'}
          </button>
          <span className="mono">
            ⌘/Ctrl + Enter
          </span>
        </div>
      </div>
    </section>
  );
}
