import { useCallback, useEffect, useRef, useState } from 'react';
import Masthead from './components/Masthead.jsx';
import Hero from './components/Hero.jsx';
import AskPanel from './components/AskPanel.jsx';
import DetailSheet from './components/DetailSheet.jsx';
import ListTransfer from './components/ListTransfer.jsx';
import ToastStack from './components/Toast.jsx';
import { Grid, Skeletons, Loading, Note, SectionHead, SortControl } from './components/Grid.jsx';
import { fetchGrid, fetchCandidates, fetchCandidatesForMedia, fetchById, fetchFeaturedPool, toPromptRows, SORTS } from './lib/anilist.js';
import { pickDaily } from './lib/dailyPick.js';
import { getCachedRecommendation, setCachedRecommendation, pruneBecauseSavedCache } from './lib/becauseSavedCache.js';
import { useSaved } from './hooks/useSaved.js';
import { useTheme } from './hooks/useTheme.js';
import { useToast } from './hooks/useToast.js';
import { useInfiniteScroll } from './hooks/useInfiniteScroll.js';
import { displayTitle } from './lib/format.js';

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
  const [followUp, setFollowUp] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [askPool, setAskPool] = useState(null); // the candidate pool behind the current answer
  const [answer, setAnswer] = useState(null); // { intro, picks, reference, degraded, ranked }
  const [asking, setAsking] = useState(false);
  const [askStage, setAskStage] = useState('');
  const [askError, setAskError] = useState('');

  const [featured, setFeatured] = useState([]);
  const [featuredState, setFeaturedState] = useState('loading'); // loading | ready | error

  const [becauseSavedSeedId, setBecauseSavedSeedId] = useState(null);
  const [becauseSaved, setBecauseSaved] = useState(null); // { intro, picks, reference, degraded, ranked }
  const [becauseSavedState, setBecauseSavedState] = useState('idle'); // idle | loading | ready | error
  const [open, setOpen] = useState(null);
  const [openSourceRect, setOpenSourceRect] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);

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
  const { saved, isSaved, toggle, merge, ready: savedReady } = useSaved();
  const { theme, toggle: toggleTheme } = useTheme();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToast();

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
    ? genre ? `“${search}” in ${genre}` : `Results for “${search}”`
    : genre
      ? `Top ${genre}`
      : 'Trending now';

  const becauseSavedReference = becauseSaved?.reference ?? saved.find((m) => m.id === becauseSavedSeedId) ?? null;

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
    setFollowUp('');
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

  /* Refines the SAME candidate pool instead of pulling a fresh one from
     AniList — cheaper, and lets "more like #3, but shorter" actually work
     against what's already on screen. */
  async function refine() {
    const q = followUp.trim();
    if (!q || !askPool) return;

    setAsking(true);
    setAskStage('Refining picks');
    try {
      const combined = `Original request: ${askedQuestion}\nFollow-up: ${q}`;
      await rank(combined, askPool, answer?.reference ?? null);
      setFollowUp('');
    } finally {
      setAsking(false);
      setAskStage('');
    }
  }

  return (
    <>
      <Masthead
        activeGenre={genre}
        onGenre={setGenre}
        onSearch={setSearch}
        onOpenMedia={openMedia}
        theme={theme}
        onToggleTheme={toggleTheme}
        savedCount={saved.length}
        onOpenTransfer={() => setTransferOpen(true)}
      />

      {featuredState !== 'error' && (featured.length > 0 || featuredState === 'loading') && (
        <div className="wrap hero-wrap">
          {featured.length > 0
            ? <Hero items={featured} onOpen={openMedia} onSave={onSave} isSaved={isSaved} />
            : <div className="hero skel-hero" aria-hidden="true" />}
        </div>
      )}

      <main className="wrap">
        <AskPanel value={question} onChange={setQuestion} onAsk={ask} busy={asking} />

        {saved.length > 0 && (
          <div id="saved" className="saved-rail">
            <SectionHead title="Your want-to-watch" count={`${saved.length} saved`} />
            <Grid items={saved} onOpen={openMedia} onSave={onSave} isSaved={isSaved} horizontal />
          </div>
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
          <section>
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

            {askPool && (
              <div className="refine">
                <input
                  type="text"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && refine()}
                  placeholder="Refine these picks — e.g. “more like #3, but shorter”"
                  aria-label="Refine these recommendations"
                  disabled={asking}
                />
                <button className="btn ghost" onClick={refine} disabled={asking || !followUp.trim()}>
                  Refine
                </button>
              </div>
            )}
          </section>
        )}

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
      </main>

      {open && (
        <DetailSheet
          media={open}
          onClose={closeMedia}
          onOpenRelated={openMedia}
          onSave={onSave}
          isSaved={isSaved}
          sourceRect={openSourceRect}
        />
      )}

      {transferOpen && (
        <ListTransfer saved={saved} onImport={onImportList} onClose={() => setTransferOpen(false)} />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
