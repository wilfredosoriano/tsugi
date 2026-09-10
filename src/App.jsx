import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import Masthead from './components/Masthead.jsx';
import Hero from './components/Hero.jsx';
import AskPanel from './components/AskPanel.jsx';
import DetailSheet from './components/DetailSheet.jsx';
import ListTransfer from './components/ListTransfer.jsx';
import CompletedHistory from './components/CompletedHistory.jsx';
import ToastStack from './components/Toast.jsx';
import AiringRail from './components/AiringRail.jsx';
import { Grid, Skeletons, Loading, Note, SectionHead, SortControl } from './components/Grid.jsx';
import { fetchGrid, fetchCandidates, fetchCandidatesForMedia, fetchById, fetchFeaturedPool, fetchAiringSoon, fetchAiringForIds, toPromptRows, SORTS } from './lib/anilist.js';
import { pickDaily } from './lib/dailyPick.js';
import { getCachedRecommendation, setCachedRecommendation, pruneBecauseSavedCache } from './lib/becauseSavedCache.js';
import { useSaved } from './hooks/useSaved.js';
import { useAuth } from './hooks/useAuth.js';
import { useTheme } from './hooks/useTheme.js';
import { useToast } from './hooks/useToast.js';
import { useInfiniteScroll } from './hooks/useInfiniteScroll.js';
import { displayTitle } from './lib/format.js';
import { WATCH_STATUSES } from './lib/watchStatus.js';

const SORT_VALUES = new Set(SORTS.map((s) => s.value));

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const sort = params.get('sort');
  return {
    search: params.get('search') || '',
    genre: params.get('genre') || null,
    sort: sort && SORT_VALUES.has(sort) ? sort : 'TRENDING_DESC',
    id: params.get('id'),
  };
}

export default function App() {
  const initialUrl = useRef(readUrlState()).current;
  const deepLinkId = useRef(initialUrl.id);
  const historyOpenId = useRef(initialUrl.id ? Number(initialUrl.id) : null);
  const gridSectionRef = useRef(null);
  const answerSectionRef = useRef(null);
  const prevFilter = useRef({ genre: initialUrl.genre, search: initialUrl.search });

  const [genre, setGenre] = useState(initialUrl.genre);
  const [search, setSearch] = useState(initialUrl.search);
  const [sort, setSort] = useState(initialUrl.sort);
  const [gridItems, setGridItems] = useState([]);
  const [gridState, setGridState] = useState('loading'); // loading | ready | error
  const [gridError, setGridError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [question, setQuestion] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [askPool, setAskPool] = useState(null); // the candidate pool behind the current answer
  const [answer, setAnswer] = useState(null); // { intro, picks, reference, degraded, ranked }
  const [asking, setAsking] = useState(false);
  const [askStage, setAskStage] = useState('');
  const [askError, setAskError] = useState('');

  const [featured, setFeatured] = useState([]);
  const [featuredState, setFeaturedState] = useState('loading'); // loading | ready | error

  const [airingSoon, setAiringSoon] = useState([]);
  const [airingSoonState, setAiringSoonState] = useState('loading'); // loading | ready | error

  const [myAiringSoon, setMyAiringSoon] = useState([]);
  const [myAiringSoonState, setMyAiringSoonState] = useState('idle'); // idle | loading | ready | error

  const [becauseSavedSeedId, setBecauseSavedSeedId] = useState(null);
  const [becauseSaved, setBecauseSaved] = useState(null); // { intro, picks, reference, degraded, ranked }
  const [becauseSavedState, setBecauseSavedState] = useState('idle'); // idle | loading | ready | error
  const [open, setOpen] = useState(null);
  const [openSourceRect, setOpenSourceRect] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const { user, handleGoogleCredential, signOut, enabled: syncEnabled } = useAuth(pushToast);
  const { saved, isSaved, toggle, setWatchStatus, setProgress, merge, ready: savedReady, completions } = useSaved(user);
  const [statusFilter, setStatusFilter] = useState('all');
  const { theme, toggle: toggleTheme } = useTheme();

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

  // Search and genre browsing are kept mutually exclusive rather than
  // combinable — picking a genre clears any active search, and searching
  // clears any active genre, so the grid is always driven by exactly one
  // of the two instead of a "X in Genre" combination.
  const onGenre = useCallback((g) => {
    setGenre(g);
    setSearch('');
  }, []);

  const onSearch = useCallback((q) => {
    setSearch(q);
    setGenre(null);
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

  /* ── homepage "Airing soon": upcoming episodes across ongoing (or
     about-to-premiere) anime, so users don't have to check each one
     individually ─────────────────────────────────────────────── */
  useEffect(() => {
    fetchAiringSoon(15)
      .then((items) => {
        setAiringSoon(items);
        setAiringSoonState('ready');
      })
      .catch(() => setAiringSoonState('error'));
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
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (genre) params.set('genre', genre);
    if (sort !== 'TRENDING_DESC') params.set('sort', sort);
    if (open) params.set('id', open.id);
    else if (deepLinkId.current) params.set('id', deepLinkId.current);
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;

    // Opening a title pushes a real history entry, so the browser/device
    // Back button closes it on the first press instead of navigating away
    // (replaceState alone leaves nothing for Back to undo). Closing it or
    // changing genre/search/sort just corrects the current entry in place.
    const openId = open ? open.id : null;
    if (openId != null && openId !== historyOpenId.current) {
      window.history.pushState(null, '', url);
    } else {
      window.history.replaceState(null, '', url);
    }
    historyOpenId.current = openId;
  }, [search, genre, sort, open]);

  /* Back/forward should close (or restore) the detail sheet, not just
     leave it hanging while the URL underneath it changes. */
  useEffect(() => {
    const onPopState = () => {
      const s = readUrlState();
      setSearch(s.search);
      setGenre(s.genre);
      setSort(s.sort);
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

  /* ── browse ─────────────────────────────────────────────── */
  const load = useCallback(async ({ genre = null, search = '', sort = 'TRENDING_DESC' }) => {
    setGridState('loading');
    setGridError('');
    setPage(1);
    try {
      const { items, hasNextPage } = await fetchGrid({ genre, search: search || null, sort, page: 1 });
      setGridItems(items);
      setHasMore(hasNextPage);
      setGridState('ready');
    } catch (err) {
      setGridError(err.message);
      setGridState('error');
    }
  }, []);

  useEffect(() => {
    load({ genre, search, sort });
  }, [genre, search, sort, load]);

  /* Changing genre/search moves the results into a section that's often
     well below the fold now (want-to-watch, airing soon, etc. all sit
     above it) — scroll it into view so picking a new filter is visibly
     acted on, instead of looking like nothing happened. Compares against
     the previous value (rather than a "skip the first run" flag) so it
     doesn't misfire on mount under StrictMode's double-invoked effects,
     and doesn't yank the page on a deep-linked ?genre=/?search= URL. */
  useEffect(() => {
    const prev = prevFilter.current;
    const changed = prev.genre !== genre || prev.search !== search;
    prevFilter.current = { genre, search };
    if (changed) {
      gridSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [genre, search]);

  /* Same idea for AI recommendation results: they land in a section below
     the ask panel, easy to miss once the page has several rails/sections
     above it. */
  useEffect(() => {
    if (answer) answerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [answer]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { items, hasNextPage } = await fetchGrid({ genre, search: search || null, sort, page: next });
      setGridItems((prev) => [...prev, ...items]);
      setHasMore(hasNextPage);
      setPage(next);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [genre, search, sort, page]);

  const canLoadMore = hasMore && gridState === 'ready' && !loadingMore;
  const sentinelRef = useInfiniteScroll(loadMore, canLoadMore);

  const gridTitle = search
    ? `Results for “${search}”`
    : genre
      ? `Top ${genre}`
      : 'Trending now';

  const becauseSavedReference = becauseSaved?.reference ?? saved.find((m) => m.id === becauseSavedSeedId) ?? null;

  const visibleSaved = statusFilter === 'all' ? saved : saved.filter((m) => m.watchStatus === statusFilter);

  const currentYear = String(new Date().getFullYear());
  const completedThisYear = (completions[currentYear] || []).length;
  const completedAllTime = Object.values(completions).reduce((sum, list) => sum + (list?.length || 0), 0);

  /* ── ask ────────────────────────────────────────────────── */
  async function rankPool(requestText, pool) {
    let intro = '';
    let picks = pool.slice(0, 10);
    let degraded = '';

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: requestText, pool: toPromptRows(pool) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      const byId = new Map(pool.map((m) => [m.id, m]));
      const resolved = data.picks
        .map((p) => {
          const media = byId.get(p.id);
          return media ? { ...media, _why: p.why } : null;
        })
        .filter(Boolean);

      if (resolved.length) {
        intro = data.intro;
        picks = resolved;
      } else {
        degraded = 'The model returned nothing usable. Showing the closest catalog matches instead.';
      }
    } catch (err) {
      degraded = err.message;
    }

    return { intro, picks, degraded };
  }

  async function rank(requestText, pool, reference) {
    const result = await rankPool(requestText, pool);
    setAnswer({ ...result, reference, ranked: !result.degraded });
  }

  async function ask() {
    const q = question.trim();
    if (!q) return;

    setAsking(true);
    setAskError('');
    setAnswer(null);
    setAskPool(null);
    setAskStage('Pulling candidates from the catalog');

    try {
      const { reference, pool } = await fetchCandidates(q);

      if (!pool.length) {
        setAskError('No catalog matches for that. Try naming a title you already liked.');
        return;
      }

      setAskStage(`Ranking ${pool.length} candidates`);
      setAskedQuestion(q);
      setAskPool(pool);
      await rank(q, pool, reference);
    } catch (err) {
      setAskError(err.message);
    } finally {
      setAsking(false);
      setAskStage('');
    }
  }

  /* Grows the current answer with more picks from the SAME candidate pool
     and the SAME original request — no re-typing needed. Excludes whatever
     is already on screen so the model can't just repeat itself, and sticks
     to _core candidates (genuinely tied to the reference's own recommendation
     graph/tags) rather than reaching into broadPool() filler once the good
     matches run out — otherwise a "sports-drama" request could end up padded
     with something totally unrelated a few clicks in. */
  async function moreLikeThis() {
    if (!askPool || !answer) return;
    const shown = new Set(answer.picks.map((m) => m.id));
    const remaining = askPool.filter((m) => !shown.has(m.id) && m._core !== false);
    if (!remaining.length) return;

    setAsking(true);
    setAskStage('Finding more picks');
    try {
      const result = await rankPool(askedQuestion, remaining);
      if (result.picks.length) {
        setAnswer((prev) => ({
          ...prev,
          picks: [...prev.picks, ...result.picks],
          ranked: prev.ranked && !result.degraded,
        }));
      }
    } finally {
      setAsking(false);
      setAskStage('');
    }
  }

  const shownPickIds = answer ? new Set(answer.picks.map((m) => m.id)) : null;
  const hasMorePicks = askPool && shownPickIds
    ? askPool.some((m) => !shownPickIds.has(m.id) && m._core !== false)
    : false;

  return (
    <>
      <Masthead
        activeGenre={genre}
        search={search}
        onGenre={onGenre}
        onSearch={onSearch}
        onOpenMedia={openMedia}
        theme={theme}
        onToggleTheme={toggleTheme}
        savedCount={saved.length}
        onOpenTransfer={() => setTransferOpen(true)}
        user={user}
        onGoogleCredential={handleGoogleCredential}
        onSignOut={signOut}
        syncEnabled={syncEnabled}
        airingAlerts={myAiringSoonState === 'ready' ? myAiringSoon : []}
      />

      {featuredState !== 'error' && (featured.length > 0 || featuredState === 'loading') && (
        <div className="wrap hero-wrap">
          {featured.length > 0
            ? <Hero items={featured} onOpen={openMedia} onSave={onSave} isSaved={isSaved} />
            : <div className="hero skel-hero" aria-hidden="true" />}
        </div>
      )}

      <main className="wrap">
        {(myAiringSoonState === 'ready' && myAiringSoon.length > 0) || (airingSoonState === 'ready' && airingSoon.length > 0) ? (
          <aside className="airing-desktop">
            {myAiringSoonState === 'ready' && myAiringSoon.length > 0 && (
              <div className="airing-block">
                <SectionHead title="Your shows airing soon" count={`${myAiringSoon.length}`} />
                <AiringRail items={myAiringSoon} onOpen={openMedia} vertical />
              </div>
            )}
            {airingSoonState === 'ready' && airingSoon.length > 0 && (
              <div className="airing-block">
                <SectionHead title="Airing soon" count={`${airingSoon.length} episodes`} />
                <AiringRail items={airingSoon} onOpen={openMedia} vertical />
              </div>
            )}
          </aside>
        ) : null}

        <div className="main-col">
        <AskPanel value={question} onChange={setQuestion} onAsk={ask} busy={asking} />

        {completedAllTime > 0 && (
          <button className="completion-stat" onClick={() => setHistoryOpen(true)}>
            <Trophy size={15} strokeWidth={2.25} />
            <strong>{completedAllTime}</strong> anime completed all-time
            {completedThisYear > 0 && <span className="completion-stat-year">· {completedThisYear} in {currentYear}</span>}
          </button>
        )}

        {saved.length > 0 && (
          <div id="saved" className="saved-rail">
            <SectionHead title="Your want-to-watch" count={`${visibleSaved.length} of ${saved.length}`}>
              <div className="status-filter">
                <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>
                  All
                </button>
                {WATCH_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    className={statusFilter === s.value ? 'active' : ''}
                    onClick={() => setStatusFilter(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </SectionHead>
            {visibleSaved.length > 0 ? (
              <Grid items={visibleSaved} onOpen={openMedia} onSave={onSave} isSaved={isSaved} horizontal />
            ) : (
              <Note>Nothing with that status yet.</Note>
            )}
          </div>
        )}

        {myAiringSoonState === 'ready' && myAiringSoon.length > 0 && (
          <section className="airing-mobile">
            <SectionHead title="Your shows airing soon" count={`${myAiringSoon.length}`} />
            <AiringRail items={myAiringSoon} onOpen={openMedia} />
          </section>
        )}

        {airingSoonState === 'ready' && airingSoon.length > 0 && (
          <section className="airing-mobile">
            <SectionHead title="Airing soon" count={`${airingSoon.length} episodes`} />
            <AiringRail items={airingSoon} onOpen={openMedia} />
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
              <Note error>Couldn’t build recommendations from your list right now.</Note>
            )}
            {becauseSaved && (
              <>
                {becauseSaved.intro && <p className="narration">{becauseSaved.intro}</p>}
                {becauseSaved.degraded && (
                  <Note error>
                    <strong>Ranked without AI.</strong> {becauseSaved.degraded}
                  </Note>
                )}
                <Grid
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

        {asking && <Loading>{askStage}</Loading>}
        {askError && <Note error>{askError}</Note>}

        {answer && (
          <section ref={answerSectionRef} className="grid-scroll-anchor">
            <SectionHead
              title={answer.ranked ? 'Recommended for you' : 'Closest in the catalog'}
              count={
                `${answer.picks.length} picks` +
                (answer.reference ? ` · from ${displayTitle(answer.reference)}` : '')
              }
            />
            {answer.intro && <p className="narration">{answer.intro}</p>}
            {answer.degraded && (
              <Note error>
                <strong>Ranked without AI.</strong> {answer.degraded}
              </Note>
            )}
            <Grid
              items={answer.picks}
              ranked={answer.ranked}
              onOpen={openMedia}
              onSave={onSave}
              isSaved={isSaved}
            />

            {hasMorePicks && (
              <div className="refine">
                <button className="btn ghost" onClick={moreLikeThis} disabled={asking}>
                  More like this
                </button>
              </div>
            )}
          </section>
        )}

        <div ref={gridSectionRef} className="grid-scroll-anchor" />
        <SectionHead
          title={gridTitle}
          count={gridItems.length > 0 ? `${gridItems.length} titles` : null}
        >
          {!search && (
            <SortControl value={sort} onChange={setSort} />
          )}
        </SectionHead>

        {gridState === 'loading' && gridItems.length === 0 && <Skeletons />}
        {gridState === 'error' && (
          <Note error>
            Couldn’t reach the server — {gridError}{' '}
            <button className="retry-link" onClick={() => load({ genre, search, sort })}>Try again</button>
          </Note>
        )}
        {gridItems.length > 0 && (gridState === 'ready' || gridState === 'loading') && (
          <>
            <div className={`grid-fade${gridState === 'loading' ? ' dim' : ''}`}>
              <Grid items={gridItems} onOpen={openMedia} onSave={onSave} isSaved={isSaved} />
            </div>
            {hasMore && (
              <div className="more" ref={sentinelRef}>
                {loadingMore && <Loading>Loading more</Loading>}
              </div>
            )}
          </>
        )}
        {gridState === 'ready' && gridItems.length === 0 && (
          <Note>Nothing matched that. Try a different spelling or browse a genre.</Note>
        )}
        </div>
      </main>

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

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
