import { Compass } from 'lucide-react';
import { WATCH_STATUSES } from '../lib/watchStatus.js';
import { Grid, Loading, Note, SectionHead } from '../components/Grid.jsx';
import AiringRail from '../components/AiringRail.jsx';
import StatsPanel from '../components/StatsPanel.jsx';
import RevealHeading from '../components/RevealHeading.jsx';

/** Everything about your own list: stats, what's airing next, and the list itself. */
export default function SavedScreen({
  saved, visibleSaved, statusFilter, onStatusFilter,
  completedAllTime, completedThisYear, currentYear, onOpenHistory,
  airingSoon, airingSoonState, onOpen, onSave, isSaved, onBrowse,
}) {
  const hasWatching = saved.some((m) => m.watchStatus === 'watching');

  return (
    <>
      <header className="screen-head">
        <RevealHeading as="h1" className="screen-title">Saved</RevealHeading>
        <p className="screen-sub">Your want-to-watch list, what airs next, and what you’ve finished.</p>
      </header>

      <StatsPanel
        saved={saved}
        completedAllTime={completedAllTime}
        completedThisYear={completedThisYear}
        currentYear={currentYear}
        onOpenHistory={onOpenHistory}
      />

      {saved.length > 0 && (
        <section className="panel">
          <SectionHead title="Airing soon for you" count={airingSoonState === 'ready' && airingSoon.length ? `${airingSoon.length}` : null} />
          {airingSoonState === 'loading' && <Loading>Checking your schedule</Loading>}
          {airingSoonState === 'error' && <Note error>Couldn’t load your airing schedule. Try again in a moment.</Note>}
          {airingSoonState === 'ready' && airingSoon.length > 0 && <AiringRail items={airingSoon} onOpen={onOpen} />}
          {(airingSoonState === 'idle' || (airingSoonState === 'ready' && airingSoon.length === 0)) && (
            <p className="num">
              {hasWatching
                ? 'Nothing you’re watching airs in the next few days.'
                : 'Mark a show as Watching to see when its next episode airs.'}
            </p>
          )}
        </section>
      )}

      {saved.length > 0 ? (
        <section id="saved" className="grid-scroll-anchor">
          <SectionHead title="Your want-to-watch" count={`${visibleSaved.length} of ${saved.length}`}>
            <div className="status-filter">
              <button className={`pill${statusFilter === 'all' ? ' on' : ''}`} aria-pressed={statusFilter === 'all'} onClick={() => onStatusFilter('all')}>
                All
              </button>
              {WATCH_STATUSES.map((st) => (
                <button
                  key={st.value}
                  className={`pill${statusFilter === st.value ? ' on' : ''}`}
                  aria-pressed={statusFilter === st.value}
                  onClick={() => onStatusFilter(st.value)}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </SectionHead>
          {visibleSaved.length > 0 ? (
            <Grid items={visibleSaved} onOpen={onOpen} onSave={onSave} isSaved={isSaved} />
          ) : (
            <Note>
              Nothing is marked {WATCH_STATUSES.find((st) => st.value === statusFilter)?.label.toLowerCase()} yet.
              Open a title and change its status.
            </Note>
          )}
        </section>
      ) : (
        <div className="empty-screen">
          <Note>Nothing saved yet. Tap the bookmark on any title to keep it here.</Note>
          <button className="btn" onClick={onBrowse}><Compass size={18} strokeWidth={2.5} /> Browse anime</button>
        </div>
      )}
    </>
  );
}
