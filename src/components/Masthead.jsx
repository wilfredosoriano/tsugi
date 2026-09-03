import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Sun, Moon, ArrowLeftRight } from 'lucide-react';
import { GENRES, DEMOGRAPHICS, quickSearch, fetchById } from '../lib/anilist.js';
import { starParts, displayTitle } from '../lib/format.js';

const DEBOUNCE_MS = 260;
const MIN_CHARS = 2;

export default function Masthead({ activeGenre, onGenre, onSearch, onOpenMedia, theme, onToggleTheme, savedCount, onOpenTransfer }) {
  const [term, setTerm] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [sugState, setSugState] = useState('idle'); // idle | loading | ready | error
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [opening, setOpening] = useState(null); // id currently being fetched for detail

  const wrapRef = useRef(null);
  const railRef = useRef(null);
  const searchInputRef = useRef(null);
  const requestId = useRef(0);
  const debounceRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [dragging, setDragging] = useState(false);
  const pillRefs = useRef({});
  const [indicator, setIndicator] = useState(null); // { left, top, width, height }

  // Slides/resizes a shared pill behind the active button instead of each
  // button instantly swapping its own background — measured off the real
  // DOM node so it's exact regardless of label length or font metrics.
  // useLayoutEffect (not useEffect) so the very first paint already has the
  // right position — nothing to visibly animate in from on mount.
  useLayoutEffect(() => {
    const btn = pillRefs.current[activeGenre ?? '__all__'];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight });
  }, [activeGenre]);

  // A plain mouse wheel doesn't scroll a horizontal row by default (only
  // touch swipe / trackpad horizontal gestures do) — and the scrollbar is
  // hidden for a cleaner look, so there'd be no way to reach it otherwise.
  // scrollBy (rather than a direct scrollLeft assignment) respects the
  // row's CSS scroll-behavior: smooth, so each wheel tick eases in.
  const onRailWheel = (e) => {
    const el = railRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollBy({ left: e.deltaY, behavior: 'smooth' });
      e.preventDefault();
    }
  };

  // Click-and-drag with the mouse — the other thing people instinctively try.
  const onRailMouseDown = (e) => {
    const el = railRef.current;
    if (!el) return;
    dragRef.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  };

  useEffect(() => {
    const onMove = (e) => {
      const st = dragRef.current;
      const el = railRef.current;
      if (!st.active || !el) return;
      const dx = e.clientX - st.startX;
      if (!st.moved && Math.abs(dx) > 4) { st.moved = true; setDragging(true); }
      if (st.moved) el.scrollLeft = st.startScroll - dx;
    };
    const onUp = () => {
      dragRef.current.active = false;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // A drag that actually moved the row shouldn't also fire the pill's click.
  const onRailClickCapture = (e) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // "/" jumps to search, like GitHub/Slack — skipped while already typing
  // anywhere else, so it never hijacks a literal "/" character.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = term.trim();

    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setSugState('idle');
      return;
    }

    const id = ++requestId.current;
    setSugState('loading');
    debounceRef.current = setTimeout(() => {
      quickSearch(q)
        .then((results) => {
          if (id !== requestId.current) return;
          setSuggestions(results);
          setSugState('ready');
          setHighlight(-1);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setSuggestions([]);
          setSugState('error');
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [term]);

  const submit = () => {
    setOpen(false);
    onSearch(term.trim());
  };

  const pick = (media) => {
    setOpening(media.id);
    fetchById(media.id)
      .then((full) => onOpenMedia(full || media))
      .catch(() => onOpenMedia(media))
      .finally(() => {
        setOpening(null);
        setOpen(false);
      });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || sugState !== 'ready' || !suggestions.length) {
      if (e.key === 'Enter') submit();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      if (highlight >= 0) {
        e.preventDefault();
        pick(suggestions[highlight]);
      } else {
        submit();
      }
    }
  };

  const showDropdown = open && term.trim().length >= MIN_CHARS;

  return (
    <header className={`masthead${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap">
        <div className="mast">
          <div className="logo">
            <b>Tsugi</b>
            <span className="kanji">次</span>
          </div>
          <p className="tagline">A reading room for deciding what you watch next.</p>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={onOpenTransfer}
              aria-label={savedCount > 0 ? 'Move your saved list to another device' : 'Import a saved list from another device'}
              title="Move list between devices"
            >
              <ArrowLeftRight size={16} strokeWidth={2} />
            </button>
            <button
              className="icon-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to day edition' : 'Switch to night edition'}
              title={theme === 'dark' ? 'Day edition' : 'Night edition'}
            >
              {theme === 'dark' ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
            </button>
          </div>
        </div>

        <div className="search-wrap" ref={wrapRef}>
          <div className="searchbar">
            <input
              ref={searchInputRef}
              type="search"
              value={term}
              onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search a title — Frieren, Vinland Saga, Monster…"
              aria-label="Search anime by title"
              role="combobox"
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              aria-controls="live-search-list"
            />
            <button onClick={submit}>Search</button>
          </div>

          {showDropdown && (
            <div className="live-search" id="live-search-list" role="listbox">
              {sugState === 'loading' && (
                <div className="live-search-status">Searching…</div>
              )}
              {sugState === 'error' && (
                <div className="live-search-status">Couldn’t reach the server. Try again.</div>
              )}
              {sugState === 'ready' && suggestions.length === 0 && (
                <div className="live-search-status">No matches for “{term.trim()}”.</div>
              )}
              {sugState === 'ready' && suggestions.map((m, i) => {
                const title = displayTitle(m);
                const stars = starParts(m.averageScore);
                return (
                  <button
                    key={m.id}
                    role="option"
                    aria-selected={highlight === i}
                    className={`live-search-item${highlight === i ? ' hi' : ''}`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(m)}
                  >
                    <img src={m.coverImage.medium} alt="" loading="lazy" />
                    <span className="live-search-info">
                      <span className="live-search-title">{title}</span>
                      <span className="meta">
                        {stars && <span className="stars">{stars.glyphs}</span>}
                        {m.seasonYear && <span className="num">{m.seasonYear}</span>}
                        {m.format && <span className="num">{m.format.replace('_', ' ')}</span>}
                      </span>
                    </span>
                    {opening === m.id && <span className="live-search-spin" aria-hidden="true" />}
                  </button>
                );
              })}
              {sugState === 'ready' && suggestions.length > 0 && (
                <button className="live-search-all" onClick={submit}>
                  See all results for “{term.trim()}”
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rail-wrap">
        <nav
          className={`rail wrap${dragging ? ' dragging' : ''}`}
          aria-label="Browse by genre"
          ref={railRef}
          onWheel={onRailWheel}
          onMouseDown={onRailMouseDown}
          onClickCapture={onRailClickCapture}
        >
          <span
            className="rail-indicator"
            aria-hidden="true"
            style={indicator ? {
              transform: `translate(${indicator.left}px, ${indicator.top}px)`,
              width: indicator.width,
              height: indicator.height,
            } : { opacity: 0 }}
          />
          <button
            ref={(el) => (pillRefs.current.__all__ = el)}
            aria-pressed={activeGenre === null}
            onClick={() => onGenre(null)}
          >
            Trending
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              ref={(el) => (pillRefs.current[g] = el)}
              aria-pressed={activeGenre === g}
              onClick={() => onGenre(g)}
            >
              {g}
            </button>
          ))}
          {DEMOGRAPHICS.map((g) => (
            <button
              key={g}
              ref={(el) => (pillRefs.current[g] = el)}
              aria-pressed={activeGenre === g}
              onClick={() => onGenre(g)}
            >
              {g}
            </button>
          ))}
          {savedCount > 0 && (
            <a className="rail-saved" href="#saved">
              Want-to-watch <span className="num">{savedCount}</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
