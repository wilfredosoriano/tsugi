import { useState } from 'react';
import { X, Snowflake, Flower2, Sun, Leaf } from 'lucide-react';
import { SEASONS } from '../lib/anilist.js';

const SEASON_ICONS = { WINTER: Snowflake, SPRING: Flower2, SUMMER: Sun, FALL: Leaf };

const CURRENT_YEAR = new Date().getFullYear();
// One year ahead covers titles already announced/airing for a not-yet-
// started season; AniList's own data doesn't go meaningfully earlier
// than the 1960s for anime specifically.
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1960 + 1 }, (_, i) => CURRENT_YEAR + 1 - i);

/**
 * Season + year picker, opened from the masthead's "Season" button.
 * Mirrors GenrePicker's pattern: a local pending selection seeded from
 * whatever's already applied, only committed on "Apply filters" — closing
 * any other way discards it. Unlike genres, season and year are each
 * single-select (a title only ever airs in one season of one year), so
 * these are plain toggle buttons / a select, not a multi-select grid.
 */
export default function SeasonPicker({ activeSeason, activeYear, onApply, onClose }) {
  const [season, setSeason] = useState(activeSeason);
  const [year, setYear] = useState(activeYear);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet season-picker" role="dialog" aria-modal="true" aria-label="Select season">
        <div className="sheet-head">
          <h3 className="display">Select season</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="season-picker-body">
          <span className="label">Season</span>
          <div className="season-row">
            <button className={`season-pill${season === null ? ' active' : ''}`} onClick={() => setSeason(null)}>
              Any
            </button>
            {SEASONS.map(({ value, label }) => {
              const Icon = SEASON_ICONS[value];
              return (
                <button
                  key={value}
                  className={`season-pill${season === value ? ' active' : ''}`}
                  aria-pressed={season === value}
                  onClick={() => setSeason(value)}
                >
                  <Icon size={14} strokeWidth={2.25} /> {label}
                </button>
              );
            })}
          </div>

          <span className="label">Year</span>
          <select
            className="season-year-select"
            value={year ?? ''}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
            aria-label="Year"
          >
            <option value="">Any year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="genre-picker-footer">
          <button
            className="genre-picker-clear"
            onClick={() => { setSeason(null); setYear(null); }}
            disabled={season === null && year === null}
          >
            Clear all
          </button>
          <button className="btn" onClick={() => onApply(season, year)}>
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
