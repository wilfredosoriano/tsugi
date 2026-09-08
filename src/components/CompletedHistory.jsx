import { useState } from 'react';
import { X, Share2 } from 'lucide-react';
import { displayTitle } from '../lib/format.js';
import WrappedCard from './WrappedCard.jsx';

/**
 * Browsable "anime completed" history behind the completion-stat badge —
 * grouped by the year each title was marked Completed, newest year first.
 * Each entry is a snapshot taken at completion time (see useSaved.js), so
 * it still shows here even after the title is later removed from the
 * want-to-watch list.
 */
export default function CompletedHistory({ completions, onOpenMedia, onClose }) {
  const [shareYear, setShareYear] = useState(null);

  const years = Object.keys(completions)
    .filter((y) => Array.isArray(completions[y]) && completions[y].length > 0)
    .sort((a, b) => b - a);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet history-sheet" role="dialog" aria-modal="true" aria-label="Anime you've completed">
        <div className="sheet-head">
          <h3 className="display">Completed anime</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="history-body">
          {years.map((year) => (
            <div key={year} className="history-year">
              <div className="history-year-head">
                <p className="mono">{year} · {completions[year].length} title{completions[year].length === 1 ? '' : 's'}</p>
                <button className="btn ghost history-share-btn" onClick={() => setShareYear(year)}>
                  <Share2 size={14} /> Wrapped
                </button>
              </div>
              <div className="history-grid">
                {completions[year].map((item) => (
                  <button
                    key={`${item.id}-${item.completedAt}`}
                    className="history-item"
                    onClick={() => { onOpenMedia(item); onClose(); }}
                    aria-label={`Open details for ${displayTitle(item)}`}
                  >
                    <img src={item.coverImage.large} alt="" loading="lazy" />
                    <span>{displayTitle(item)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {shareYear && (
        <WrappedCard year={shareYear} items={completions[shareYear]} onClose={() => setShareYear(null)} />
      )}
    </div>
  );
}
