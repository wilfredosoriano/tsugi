import { useMemo, useState } from 'react';
import { X, Check, LayoutGrid } from 'lucide-react';
import { GENRES, DEMOGRAPHICS, TAG_GENRES } from '../lib/anilist.js';
import { genreStyle } from '../lib/genreStyles.js';

const ALL_OPTIONS = [...GENRES, ...DEMOGRAPHICS, ...TAG_GENRES];

/**
 * Genre/tag multi-select, opened from the masthead's "Genres" button.
 * Keeps its own pending selection (seeded from whatever's already
 * applied) so browsing the grid doesn't happen live per tap — only
 * "Apply filters" commits it, matching a normal filter-sheet pattern.
 * Closing any other way (X, backdrop, Escape) discards the pending
 * change and leaves the real filter untouched.
 */
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
            <X size={18} strokeWidth={2.25} />
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
            {!query.trim() && (
              <button
                className={`genre-tile${pending.length === 0 ? ' active' : ''}`}
                onClick={() => setPending([])}
              >
                <span className="genre-tile-icon" style={{ background: 'var(--accent-gradient)' }}>
                  <LayoutGrid size={18} strokeWidth={2} />
                </span>
                <span className="genre-tile-label">All</span>
                {pending.length === 0 && <Check className="genre-tile-check" size={14} strokeWidth={3} />}
              </button>
            )}
            {options.map((g) => {
              const { icon: Icon, color } = genreStyle(g);
              const isActive = pending.includes(g);
              return (
                <button
                  key={g}
                  className={`genre-tile${isActive ? ' active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => toggle(g)}
                >
                  <span className="genre-tile-icon" style={{ background: color }}>
                    <Icon size={18} strokeWidth={2} color="#fff" />
                  </span>
                  <span className="genre-tile-label">{g}</span>
                  {isActive && <Check className="genre-tile-check" size={14} strokeWidth={3} />}
                </button>
              );
            })}
            {query.trim() && options.length === 0 && (
              <p className="num genre-picker-empty">No genres match “{query.trim()}”.</p>
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
