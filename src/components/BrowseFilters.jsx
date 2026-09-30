import { SlidersHorizontal, CalendarRange, X } from 'lucide-react';
import { SORTS } from '../lib/anilist.js';

/**
 * The toolbar that sits directly above the browse grid — genre, season
 * and sort all live here, next to the results they actually change,
 * rather than genre/season up in the sticky header and sort down by the
 * grid. While a text search is driving the grid, the filters give way to
 * a single dismissible chip for that search (the two are mutually
 * exclusive; see App.jsx).
 */
export default function BrowseFilters({
  genres, seasonLabel, sort, search,
  onOpenGenrePicker, onOpenSeasonPicker, onSort, onClearFilters, onClearSearch,
}) {
  if (search) {
    return (
      <div className="filters">
        <button className="filter-chip" onClick={onClearSearch} aria-label={`Clear search for ${search}`}>
          “{search}” <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  const hasFilters = genres.length > 0 || Boolean(seasonLabel);

  return (
    <div className="filters">
      <div className="filters-scroll">
        <button
          className={`filter-btn${genres.length ? ' on' : ''}`}
          onClick={onOpenGenrePicker}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={14} strokeWidth={2.25} />
          <span className="filter-btn-text">{genres.length ? genres.join(', ') : 'Genres'}</span>
          {genres.length > 1 && <span className="filter-btn-count">{genres.length}</span>}
        </button>
        <button
          className={`filter-btn${seasonLabel ? ' on' : ''}`}
          onClick={onOpenSeasonPicker}
          aria-haspopup="dialog"
        >
          <CalendarRange size={14} strokeWidth={2.25} />
          <span className="filter-btn-text">{seasonLabel || 'Season'}</span>
        </button>
        {hasFilters && (
          <button className="filter-clear" onClick={onClearFilters}>Clear</button>
        )}
      </div>

      <label className="sortctl">
        <span className="sortctl-label">Sort</span>
        <select value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Sort browse results">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
