import { DEFAULT_WATCH_STATUS } from '../lib/watchStatus.js';

/** The "your stats" panel: completed count (opens the history) plus list counts. */
export default function StatsPanel({ saved, completedAllTime, completedThisYear, currentYear, onOpenHistory }) {
  if (saved.length === 0 && completedAllTime === 0) return null;

  const watching = saved.filter((m) => m.watchStatus === 'watching').length;
  const planning = saved.filter((m) => (m.watchStatus || DEFAULT_WATCH_STATUS) === 'planning').length;

  const main = (
    <>
      <span className="stats-number">{completedAllTime}</span>
      <span className="stats-caption">anime completed all-time</span>
      {completedThisYear > 0 && <span className="stats-year">{completedThisYear} in {currentYear}</span>}
    </>
  );

  return (
    <section className="panel stats" aria-label="Your stats">
      {completedAllTime > 0 ? (
        <button className="stats-main" onClick={onOpenHistory} aria-label={`${completedAllTime} anime completed all-time. Open history.`}>
          {main}
        </button>
      ) : (
        <div className="stats-main">{main}</div>
      )}
      <div className="stats-side">
        <div className="stat-tile total"><strong>{saved.length}</strong><span>want to watch</span></div>
        <div className="stat-tile"><strong>{watching}</strong><span>watching</span></div>
        <div className="stat-tile"><strong>{planning}</strong><span>planning</span></div>
      </div>
    </section>
  );
}
