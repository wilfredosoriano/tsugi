import { useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import { GENRES, DEMOGRAPHICS, TAG_GENRES } from '../lib/anilist.js';
import { genreChip } from '../lib/genreStyles.js';

const ALL_OPTIONS = [...GENRES, ...DEMOGRAPHICS, ...TAG_GENRES];

export default function GenrePicker({ active, onApply, onClose }) {
  const [pending, setPending] = useState(active);
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ALL_OPTIONS.filter((g) => g.toLowerCase().includes(q)) : ALL_OPTIONS;
  }, [query]);

  const toggle = (g) => {
    setPending((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet genre-picker" role="dialog" aria-modal="true" aria-label="Select genres">
        <div className="sheet-head">
          <h3 className="display">Select genres</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.75} />
          </button>
        </div>
        <div className="genre-picker-body">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search genres…"
            aria-label="Search genres"
            className="genre-picker-search"
          />
          <div className="genre-grid">
            {options.map((g) => {
              const { color, jp } = genreChip(g);
              const isActive = pending.includes(g);
              return (
                <button
                  key={g}
                  className={`genre-chip${isActive ? ' active' : ''}`}
                  style={{ background: color }}
                  aria-pressed={isActive}
                  onClick={() => toggle(g)}
                >
                  {g}
                  {jp && <small lang="ja">{jp}</small>}
                  {isActive && <Check className="genre-chip-check" size={16} strokeWidth={3.5} aria-hidden="true" />}
                </button>
              );
            })}
            {query.trim() && options.length === 0 && (
              <p className="num genre-picker-empty">No genres match “{query.trim()}”. Try a shorter word.</p>
            )}
          </div>
        </div>
        <div className="genre-picker-footer">
          <button className="genre-picker-clear" onClick={() => setPending([])} disabled={!pending.length}>
            Clear all
          </button>
          <button className="btn" onClick={() => onApply(pending)}>
            Apply filters{pending.length > 0 ? ` (${pending.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
