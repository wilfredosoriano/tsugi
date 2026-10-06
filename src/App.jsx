import { useCallback, useEffect, useRef, useState } from 'react';
import Masthead from './components/Masthead.jsx';
import Hero from './components/Hero.jsx';
import AskPanel from './components/AskPanel.jsx';
import DetailSheet from './components/DetailSheet.jsx';
import ListTransfer from './components/ListTransfer.jsx';
import GenrePicker from './components/GenrePicker.jsx';
import SeasonPicker from './components/SeasonPicker.jsx';
import CompletedHistory from './components/CompletedHistory.jsx';
import ToastStack from './components/Toast.jsx';
import AiringCalendar from './components/AiringCalendar.jsx';
import { Grid, Skeletons, Loading, Note, SectionHead } from './components/Grid.jsx';
import BrowseFilters from './components/BrowseFilters.jsx';
import PicksShowcase from './components/PicksShowcase.jsx';
import TabBar from './components/TabBar.jsx';
import SavedScreen from './screens/SavedScreen.jsx';
import AskScreen from './screens/AskScreen.jsx';
import { useCompanion, ASK_LIMIT } from './hooks/useCompanion.js';
import { rankPool } from './lib/rankClient.js';
import ProfileScreen from './screens/ProfileScreen.jsx';
import { initialView, pathFor, viewFromPath, VIEW_TITLES } from './lib/routes.js';
import { fetchGrid, fetchCandidatesForMedia, fetchById, fetchFeaturedPool, fetchAiringForIds, fetchWeeklyAiring, SORTS, SEASONS } from './lib/anilist.js';
import { pickDaily } from './lib/dailyPick.js';
import { getCachedRecommendation, setCachedRecommendation, pruneBecauseSavedCache } from './lib/becauseSavedCache.js';
import { useSaved } from './hooks/useSaved.js';
import { useAuth } from './hooks/useAuth.js';
import { useTheme } from './hooks/useTheme.js';
import { useToast } from './hooks/useToast.js';
import { useInfiniteScroll } from './hooks/useInfiniteScroll.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { displayTitle } from './lib/format.js';

const SORT_VALUES = new Set(SORTS.map((s) => s.value));
const SEASON_VALUES = new Set(SEASONS.map((s) => s.value));

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const sort = params.get('sort');
  const genreParam = params.get('genre');
  const seasonParam = params.get('season');
  const yearParam = params.get('year');
  return {
    search: params.get('search') || '',
    genres: genreParam ? genreParam.split(',').filter(Boolean) : [],
    season: seasonParam && SEASON_VALUES.has(seasonParam) ? seasonParam : null,
    seasonYear: yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null,
    sort: sort && SORT_VALUES.has(sort) ? sort : 'TRENDING_DESC',
    id: params.get('id'),
  };
}

export default function App() {
  const initialUrl = useRef(readUrlState()).current;
  const deepLinkId = useRef(initialUrl.id);
  const historyOpenId = useRef(initialUrl.id ? Number(initialUrl.id) : null);
  const gridSectionRef = useRef(null);
  const prevFilter = useRef({
    genres: initialUrl.genres, season: initialUrl.season, seasonYear: initialUrl.seasonYear, search: initialUrl.search,
  });

  const [view, setView] = useState(initialView);
  const historyView = useRef(view);
  const [genres, setGenres] = useState(initialUrl.genres);
  const [season, setSeason] = useState(initialUrl.season);
  const [seasonYear, setSeasonYear] = useState(initialUrl.seasonYear);
  const [search, setSearch] = useState(initialUrl.search);
  const [sort, setSort] = useState(initialUrl.sort);
  const [gridItems, setGridItems] = useState([]);
  const [gridState, setGridState] = useState('loading'); // loading | ready | error
  const [gridError, setGridError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [question, setQuestion] = useState('');

  const [featured, setFeatured] = useState([]);
  const [featuredState, setFeaturedState] = useState('loading'); // loading | ready | error

  const [myAiringSoon, setMyAiringSoon] = useState([]);
  const [myAiringSoonState, setMyAiringSoonState] = useState('idle'); // idle | loading | ready | error

  const [weeklyAiring, setWeeklyAiring] = useState(null);
  const [weeklyAiringState, setWeeklyAiringState] = useState('loading'); // loading | ready | error

  const [becauseSavedSeedId, setBecauseSavedSeedId] = useState(null);
  const [becauseSaved, setBecauseSaved] = useState(null); // { intro, picks, reference, degraded, ranked }
  const [becauseSavedState, setBecauseSavedState] = useState('idle'); // idle | loading | ready | error
  const [open, setOpen] = useState(null);
  const [openSourceRect, setOpenSourceRect] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);
  const isPhone = useMediaQuery('(max-width: 767px)');
  // Phones page the grid with a "Show more" button instead of infinite scroll.
  const [shownCount, setShownCount] = useState(18);

  // Grid cards pass the clicked cover's own rect so the detail sheet can
  // visually grow out of it (see DetailSheet's FLIP transition); every
  // other entry point (hero, search picks, related/season links, deep
  // links) has no such rect and falls back to the plain pop-in.
  const openMedia = useCallback((media, rect) => {
    setOpenSourceRect(rect ?? null);
    setOpen(media);
  }, []);

  const closeMedia = useCallback(() => {
    setOpen(null);
    setOpenSourceRect(null);
  }, []);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToast();
  const { user, authReady, handleGoogleCredential, signOut, enabled: syncEnabled } = useAuth(pushToast);
  const { saved, isSaved, toggle, setWatchStatus, setProgress, merge, ready: savedReady, completions } = useSaved(user);
  const [statusFilter, setStatusFilter] = useState('all');
  const { theme, toggle: toggleTheme } = useTheme();
  const companion = useCompanion({ saved, completions });

  const onImportList = useCallback((items) => {
    const result = merge(items);
    if (result.added > 0) {
      pushToast(`Imported ${result.added} title${result.added === 1 ? '' : 's'}`);
    }
    return result;
  }, [merge, pushToast]);

  const onSave = useCallback((media) => {
    const wasSaved = isSaved(media.id);
    toggle(media);
    pushToast(wasSaved ? `Removed “${displayTitle(media)}”` : `Saved “${displayTitle(media)}” to watch`);
  }, [isSaved, toggle, pushToast]);

  // Search is kept mutually exclusive with browsing rather than
  // combinable — searching clears any active genres/season, and either
  // of those clears an active search, so the grid is always driven by
  // search alone or by the browse filters alone, never a mix. Genres
  // and season/year, on the other hand, DO combine with each other
  // (e.g. "Action, Fall 2024") — AniList's own query takes them
  // together natively, so there's no reason to force a choice there.
  const onApplyGenres = useCallback((list) => {
    setGenres(list);
    setSearch('');
  }, []);

  const onApplySeason = useCallback((nextSeason, nextYear) => {
    setSeason(nextSeason);
    setSeasonYear(nextYear);
    setSearch('');
  }, []);

  const onSearch = useCallback((q) => {
    setSearch(q);
    setGenres([]);
    setSeason(null);
    setSeasonYear(null);
    if (q) setView('browse');
  }, []);

  const navigate = useCallback((next) => {
    setView((current) => {
      if (current === next) window.scrollTo({ top: 0, behavior: 'smooth' });
      return next;
    });
  }, []);

  /* ── homepage hero: a handful of picks that hold steady all day
     and rotate to a different set tomorrow ──────────────────── */
  useEffect(() => {
    fetchFeaturedPool()
      .then((pool) => {
        if (pool.length) setFeatured(pickDaily(pool, 5));
        setFeaturedState('ready');
      })
      .catch(() => setFeaturedState('error'));
  }, []);

  /* ── weekly airing calendar: the whole Mon-Sun schedule, bucketed by
     day — a discovery surface for finding new simulcasts, distinct from
     the rolling-window "Airing soon" rail above ───────────────────── */
  useEffect(() => {
    fetchWeeklyAiring()
      .then((days) => {
        setWeeklyAiring(days);
        setWeeklyAiringState('ready');
      })
      .catch(() => setWeeklyAiringState('error'));
  }, []);

  /* ── "Your shows airing soon": same idea as the rail above, but scoped
     to your own Watching-status list instead of the catalog's popular
     titles — a personally-tracked show may not be popular enough to show
     up there. Keyed off a sorted id string (not `saved` itself) so
     toggling something unrelated (a different item's status, importing a
     list) doesn't refetch unless the actual Watching set changed. ────── */
  const watchingKey = saved
    .filter((m) => m.watchStatus === 'watching')
    .map((m) => m.id)
    .sort((a, b) => a - b)
    .join(',');

  useEffect(() => {
    if (!savedReady) return;
    if (!watchingKey) {
      setMyAiringSoon([]);
      setMyAiringSoonState('idle');
      return;
    }
    let cancelled = false;
    setMyAiringSoonState('loading');
    fetchAiringForIds(watchingKey.split(',').map(Number))
      .then((items) => {
        if (cancelled) return;
        setMyAiringSoon(items);
        setMyAiringSoonState('ready');
      })
      .catch(() => { if (!cancelled) setMyAiringSoonState('error'); });
    return () => { cancelled = true; };
  }, [watchingKey, savedReady]);

  /* ── "Because you saved X": a personalized row seeded by a title from
     want-to-watch, run through the same candidate-pool + AI-ranking
     pipeline as Ask, just without a typed question.

     The seed is picked once (randomly, so a long list gets represented
     over time instead of always being whatever was saved most recently)
     and only re-picked if that title drops out of the list — adding
     something new doesn't reshuffle it mid-session. Results are cached
     per title in localStorage so re-landing on a seed we've already
     ranked (a later session, or the same seed surviving a re-pick check)
     doesn't re-hit AniList + the AI, and the cache entry is dropped the
     moment its title is unsaved.

     Gated on `savedReady`: `saved` starts as [] for one render while
     useSaved is still reading localStorage, and without this guard that
     transient empty state reads as "nothing saved" — pruning would wipe
     every cache entry on every single page load, before hydration even
     finishes. ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!savedReady) return;
    pruneBecauseSavedCache(saved.map((m) => m.id));
    if (saved.length === 0) {
      setBecauseSavedSeedId(null);
      return;
    }
    setBecauseSavedSeedId((current) =>
      saved.some((m) => m.id === current) ? current : saved[Math.floor(Math.random() * saved.length)].id
    );
  }, [saved, savedReady]);

  useEffect(() => {
    if (becauseSavedSeedId == null) {
      setBecauseSaved(null);
      setBecauseSavedState('idle');
      return undefined;
    }

    const reference = saved.find((m) => m.id === becauseSavedSeedId);
    if (!reference) return undefined; // the picking effect above will settle this next tick

    const cached = getCachedRecommendation(reference.id);
    if (cached) {
      setBecauseSaved({ ...cached, reference });
      setBecauseSavedState('ready');
      return undefined;
    }

    let cancelled = false;
    setBecauseSavedState('loading');

    (async () => {
      try {
        const { pool } = await fetchCandidatesForMedia(reference);
        if (cancelled) return;
        if (!pool.length) {
          setBecauseSavedState('error');
          return;
        }
        const { intro, picks, degraded } = await rankPool(`More anime like ${displayTitle(reference)}`, pool);
        if (cancelled) return;
        const result = { intro, picks, degraded, ranked: !degraded };
        setCachedRecommendation(reference.id, result);
        setBecauseSaved({ ...result, reference });
        setBecauseSavedState('ready');
      } catch {
        if (!cancelled) setBecauseSavedState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [becauseSavedSeedId]);

  /* ── deep link: open a title straight from a shared URL ────── */
  useEffect(() => {
    const id = deepLinkId.current;
    if (!id) return;
    fetchById(Number(id))
      .then((media) => { if (media) openMedia(media); })
      .catch(() => {})
      .finally(() => { deepLinkId.current = null; });
  }, []);

  /* ── keep the URL shareable/bookmarkable ────────────────────── */
  /* The screen is the path (/, /browse, /saved, /profile). Browse filters
     only go in the query string on /browse, and ?id= (an open title) works
     on every screen. */
  useEffect(() => {
    const params = new URLSearchParams();
    if (view === 'browse') {
      if (search) params.set('search', search);
      if (genres.length) params.set('genre', genres.join(','));
      if (season) params.set('season', season);
      if (seasonYear) params.set('year', seasonYear);
      if (sort !== 'TRENDING_DESC') params.set('sort', sort);
    }
    if (open) params.set('id', open.id);
    else if (deepLinkId.current) params.set('id', deepLinkId.current);
    const qs = params.toString();
    const url = `${pathFor(view)}${qs ? `?${qs}` : ''}`;

    // Opening a title or switching screens pushes a real history entry, so
    // Back (button or phone gesture) undoes it instead of leaving the site.
    // Closing a title or changing filters just corrects the current entry.
    const openId = open ? open.id : null;
    const viewChanged = view !== historyView.current;
    if (viewChanged || (openId != null && openId !== historyOpenId.current)) {
      window.history.pushState(null, '', url);
    } else {
      window.history.replaceState(null, '', url);
    }
    historyOpenId.current = openId;
    historyView.current = view;
  }, [view, search, genres, season, seasonYear, sort, open]);

  /* Back/forward restores the screen and the open title. Filters are only
     read back on /browse, so stepping back to another screen doesn't wipe
     the browse filters you left behind. */
  useEffect(() => {
    const onPopState = () => {
      const s = readUrlState();
      const nextView = viewFromPath(window.location.pathname);
      historyView.current = nextView;
      setView(nextView);
      if (nextView === 'browse') {
        setSearch(s.search);
        setGenres(s.genres);
        setSeason(s.season);
        setSeasonYear(s.seasonYear);
        setSort(s.sort);
      }
      historyOpenId.current = s.id ? Number(s.id) : null;
      if (s.id) {
        fetchById(Number(s.id)).then((media) => { if (media) openMedia(media); }).catch(() => {});
      } else {
        closeMedia();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /* A new screen starts at the top, with its own tab title. */
  const firstView = useRef(true);
  useEffect(() => {
    document.title = VIEW_TITLES[view];
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [view]);

  /* ── browse ─────────────────────────────────────────────── */
  const load = useCallback(async ({ genres = [], season = null, seasonYear = null, search = '', sort = 'TRENDING_DESC' }) => {
    setGridState('loading');
    setGridError('');
    setPage(1);
    try {
      const { items, hasNextPage } = await fetchGrid({ genres, season, seasonYear, search: search || null, sort, page: 1 });
      setGridItems(items);
      setHasMore(hasNextPage);
      setGridState('ready');
    } catch (err) {
      setGridError(err.message);
      setGridState('error');
    }
  }, []);

  useEffect(() => {
    load({ genres, season, seasonYear, search, sort });
  }, [genres, season, seasonYear, search, sort, load]);

  /* Changing genres/season/search moves the results into a section that's
     often well below the fold now (want-to-watch, airing soon, etc. all
     sit above it) — scroll it into view so picking a new filter is
     visibly acted on, instead of looking like nothing happened. Compares
     against the previous value (rather than a "skip the first run" flag)
     so it doesn't misfire on mount under StrictMode's double-invoked
     effects, and doesn't yank the page on a deep-linked
     ?genre=/?season=/?search= URL. */
  useEffect(() => {
    const prev = prevFilter.current;
    const changed = prev.genres !== genres || prev.season !== season || prev.seasonYear !== seasonYear || prev.search !== search;
    prevFilter.current = { genres, season, seasonYear, search };
    if (changed) {
      gridSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [genres, season, seasonYear, search]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { items, hasNextPage } = await fetchGrid({ genres, season, seasonYear, search: search || null, sort, page: next });
      setGridItems((prev) => [...prev, ...items]);
      setHasMore(hasNextPage);
      setPage(next);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [genres, season, seasonYear, search, sort, page]);

  const canLoadMore = hasMore && gridState === 'ready' && !loadingMore && !isPhone;
  const sentinelRef = useInfiniteScroll(loadMore, canLoadMore);

  useEffect(() => {
    setShownCount(18);
  }, [genres, season, seasonYear, search, sort]);

  const visibleGridItems = isPhone ? gridItems.slice(0, shownCount) : gridItems;
  const canShowMore = isPhone && (shownCount < gridItems.length || hasMore);
  const onShowMore = async () => {
    const next = shownCount + 18;
    if (next > gridItems.length && hasMore && !loadingMore) await loadMore();
    setShownCount(next);
  };

  const seasonLabel = [season ? SEASONS.find((s) => s.value === season)?.label : '', seasonYear]
    .filter(Boolean)
    .join(' ');
  const filterLabels = [...genres, seasonLabel].filter(Boolean);
  const gridTitle = search
    ? `Results for “${search}”`
    : filterLabels.length
      ? `Top ${filterLabels.join(' + ')}`
      : 'Trending now';

  const becauseSavedReference = becauseSaved?.reference ?? saved.find((m) => m.id === becauseSavedSeedId) ?? null;

  const visibleSaved = statusFilter === 'all' ? saved : saved.filter((m) => m.watchStatus === statusFilter);

  const currentYear = String(new Date().getFullYear());
  const completedThisYear = (completions[currentYear] || []).length;
  const completedAllTime = Object.values(completions).reduce((sum, list) => sum + (list?.length || 0), 0);

  /* Home's Ask box is the way in: the conversation itself lives on /ask. */
  const startAsk = () => {
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    navigate('ask');
    companion.send(q);
  };

  const showHero = featuredState !== 'error' && (featured.length > 0 || featuredState === 'loading');
  const showAiringWeek = weeklyAiringState === 'ready' && weeklyAiring.some((d) => d.length > 0);

  return (
    <>
      <Masthead
        view={view}
        onNavigate={navigate}
        search={search}
        onSearch={onSearch}
        onOpenMedia={openMedia}
        savedCount={saved.length}
        airingAlerts={myAiringSoonState === 'ready' ? myAiringSoon : []}
      />

      {view === 'home' && (
        <>
          {showHero && (
            <div className="wrap hero-wrap">
              {featured.length > 0
                ? <Hero items={featured} onOpen={openMedia} onSave={onSave} isSaved={isSaved} />
                : <div className="hero-frame"><div className="hero skel-hero" aria-hidden="true" /></div>}
            </div>
          )}

          {/* Phones reach the chat from the tab bar's raised Ask button, so the
              panel would only repeat it there. */}
          {!isPhone && (
            <div className={`wrap ask-wrap${showHero ? '' : ' no-hero'}`}>
              <AskPanel value={question} onChange={setQuestion} onAsk={startAsk} busy={companion.busy} />
            </div>
          )}

          <main className="wrap home">
            <h1 className="sr-only">Tsugi</h1>
            {showAiringWeek && (
              <section className="panel">
                <SectionHead title="Airing this week" />
                <AiringCalendar days={weeklyAiring} onOpen={openMedia} />
              </section>
            )}

            {becauseSavedReference && becauseSavedState !== 'idle' && (
              <section>
                <SectionHead
                  title={`Because you saved “${displayTitle(becauseSavedReference)}”`}
                  count={becauseSaved ? `${becauseSaved.picks.length} picks` : null}
                />
                {becauseSavedState === 'loading' && <Loading>Finding more like it</Loading>}
                {becauseSavedState === 'error' && (
                  <Note error>Couldn’t build recommendations from your list right now. Try again in a moment.</Note>
                )}
                {becauseSaved && (
                  <>
                    {becauseSaved.intro && <p className="narration">{becauseSaved.intro}</p>}
                    {becauseSaved.degraded && (
                      <Note error>
                        <strong>Ranked without AI.</strong> {becauseSaved.degraded}
                      </Note>
                    )}
                    <PicksShowcase
                      items={becauseSaved.picks}
                      ranked={becauseSaved.ranked}
                      onOpen={openMedia}
                      onSave={onSave}
                      isSaved={isSaved}
                    />
                  </>
                )}
              </section>
            )}

            <section className="panel browse-cta">
              <div>
                <h2 className="panel-title">Looking for something specific?</h2>
                <p className="profile-text">Browse the whole catalog by genre, season and year.</p>
              </div>
              <button className="btn" onClick={() => navigate('browse')}>Browse anime</button>
            </section>
          </main>
        </>
      )}

      {view === 'browse' && (
        <main className="wrap home screen">
          <h1 className="sr-only">Browse</h1>
          <section ref={gridSectionRef} className="grid-scroll-anchor">
            <div className="panel trending-head">
              <SectionHead
                title={gridTitle}
                count={gridItems.length > 0 ? `${gridItems.length} titles` : null}
              />
              <BrowseFilters
                genres={genres}
                seasonLabel={seasonLabel}
                sort={sort}
                search={search}
                onSort={setSort}
                onOpenGenrePicker={() => setGenrePickerOpen(true)}
                onOpenSeasonPicker={() => setSeasonPickerOpen(true)}
                onClearFilters={() => { onApplyGenres([]); onApplySeason(null, null); }}
                onClearSearch={() => onSearch('')}
              />
            </div>

            {gridState === 'loading' && gridItems.length === 0 && <Skeletons />}
            {gridState === 'error' && (
              <Note error>
                Couldn’t reach the server — {gridError}{' '}
                <button className="retry-link" onClick={() => load({ genres, season, seasonYear, search, sort })}>Try again</button>
              </Note>
            )}
            {gridItems.length > 0 && (gridState === 'ready' || gridState === 'loading') && (
              <>
                <div className={`grid-fade${gridState === 'loading' ? ' dim' : ''}`}>
                  <Grid items={visibleGridItems} onOpen={openMedia} onSave={onSave} isSaved={isSaved} />
                </div>
                {!isPhone && hasMore && (
                  <div className="more" ref={sentinelRef}>
                    {loadingMore && <Loading>Loading more</Loading>}
                  </div>
                )}
                {canShowMore && (
                  <div className="more">
                    <button className="btn" onClick={onShowMore} disabled={loadingMore}>
                      {loadingMore ? 'Loading…' : 'Show more'}
                    </button>
                  </div>
                )}
              </>
            )}
            {gridState === 'ready' && gridItems.length === 0 && (
              <Note>Nothing matched that. Try a different spelling or browse a genre.</Note>
            )}
          </section>
        </main>
      )}

      {view === 'ask' && (
        <main className="wrap home screen ask-main">
          <AskScreen
            messages={companion.messages}
            busy={companion.busy}
            stage={companion.stage}
            onSend={companion.send}
            onReset={companion.reset}
            remaining={companion.remaining}
            resetInMin={companion.resetInMin}
            limit={ASK_LIMIT}
            onOpen={openMedia}
            onSave={onSave}
            isSaved={isSaved}
          />
        </main>
      )}

      {view === 'saved' && (
        <main className="wrap home screen">
          <SavedScreen
            saved={saved}
            visibleSaved={visibleSaved}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            completedAllTime={completedAllTime}
            completedThisYear={completedThisYear}
            currentYear={currentYear}
            onOpenHistory={() => setHistoryOpen(true)}
            airingSoon={myAiringSoon}
            airingSoonState={myAiringSoonState}
            onOpen={openMedia}
            onSave={onSave}
            isSaved={isSaved}
            onBrowse={() => navigate('browse')}
          />
        </main>
      )}

      {view === 'profile' && (
        <main className="wrap home screen">
          <ProfileScreen
            user={user}
            authReady={authReady}
            syncEnabled={syncEnabled}
            onGoogleCredential={handleGoogleCredential}
            onSignOut={signOut}
            theme={theme}
            onToggleTheme={toggleTheme}
            savedCount={saved.length}
            completedAllTime={completedAllTime}
            onOpenTransfer={() => setTransferOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        </main>
      )}

      <TabBar view={view} onNavigate={navigate} />

      {open && (
        <DetailSheet
          media={open}
          onClose={closeMedia}
          onOpenRelated={openMedia}
          onSave={onSave}
          isSaved={isSaved}
          watchStatus={saved.find((m) => m.id === open.id)?.watchStatus}
          onSetStatus={setWatchStatus}
          progress={saved.find((m) => m.id === open.id)?.progress}
          onSetProgress={setProgress}
          sourceRect={openSourceRect}
        />
      )}

      {transferOpen && (
        <ListTransfer saved={saved} onImport={onImportList} onClose={() => setTransferOpen(false)} />
      )}

      {historyOpen && (
        <CompletedHistory completions={completions} onOpenMedia={openMedia} onClose={() => setHistoryOpen(false)} />
      )}

      {genrePickerOpen && (
        <GenrePicker
          active={genres}
          onApply={(list) => { onApplyGenres(list); setGenrePickerOpen(false); }}
          onClose={() => setGenrePickerOpen(false)}
        />
      )}

      {seasonPickerOpen && (
        <SeasonPicker
          activeSeason={season}
          activeYear={seasonYear}
          onApply={(nextSeason, nextYear) => { onApplySeason(nextSeason, nextYear); setSeasonPickerOpen(false); }}
          onClose={() => setSeasonPickerOpen(false)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
