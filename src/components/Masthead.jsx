import { useEffect, useRef, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { quickSearch, fetchById } from '../lib/anilist.js';
import { starParts, displayTitle } from '../lib/format.js';
import { formatAiring } from '../lib/airing.js';
import Stars from './Stars.jsx';
import { pathFor, navClick } from '../lib/routes.js';

const DEBOUNCE_MS = 260;
const MIN_CHARS = 2;
const SEEN_KEY = 'tsugi:seenAiring';
const alertKey = (a) => `${a.media.id}:${a.episode}`;

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

const NAV = [
  { view: 'home', label: 'Home' },
  { view: 'browse', label: 'Browse' },
  { view: 'saved', label: 'Saved' },
  { view: 'profile', label: 'Profile' },
];

export default function Masthead({
  view, onNavigate, search, onSearch, onOpenMedia, savedCount, airingAlerts,
}) {
  const [term, setTerm] = useState('');

  // Picking a genre clears the active search (see App.jsx) — mirror that
  // here so the box itself empties too, instead of leaving stale text
  // that no longer matches what's on screen.
  useEffect(() => {
    if (!search) setTerm('');
  }, [search]);

  const [suggestions, setSuggestions] = useState([]);
  const [sugState, setSugState] = useState('idle'); // idle | loading | ready | error
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [opening, setOpening] = useState(null); // id currently being fetched for detail

  const wrapRef = useRef(null);
  const searchInputRef = useRef(null);
  const requestId = useRef(0);
  const debounceRef = useRef(null);
  const bellRef = useRef(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [seen, setSeen] = useState(loadSeen);

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
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    if (!bellOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setBellOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [bellOpen]);

  const unseenAlerts = (airingAlerts || []).filter((a) => !seen.has(alertKey(a)));

  const toggleBell = () => {
    setBellOpen((v) => {
      const next = !v;
      if (next && unseenAlerts.length) {
        const nextSeen = new Set(seen);
        (airingAlerts || []).forEach((a) => nextSeen.add(alertKey(a)));
        setSeen(nextSeen);
        try {
          localStorage.setItem(SEEN_KEY, JSON.stringify([...nextSeen]));
        } catch {
          // quota or private mode — the badge just won't stay cleared next visit
        }
      }
      return next;
    });
  };

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
    setTerm('');
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
    setTerm('');
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
    <header className="masthead">
      <div className="wrap mast">
        <a className="logo" href="/" onClick={(e) => navClick(e, onNavigate, 'home')} aria-label="Tsugi home">
          <span className="logo-tile" aria-hidden="true">次</span>
          <b>Tsugi</b>
        </a>

        <nav className="mainnav" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.view}
              href={pathFor(item.view)}
              className={`mainnav-link${view === item.view ? ' active' : ''}`}
              aria-current={view === item.view ? 'page' : undefined}
              onClick={(e) => navClick(e, onNavigate, item.view)}
            >
              {item.label}
              {item.view === 'saved' && savedCount > 0 && <span className="mainnav-count">{savedCount}</span>}
            </a>
          ))}
        </nav>

        <div className="search-wrap" ref={wrapRef}>
          <div className="searchbar">
            <Search className="searchbar-icon" size={17} strokeWidth={2.25} aria-hidden="true" />
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
            {/* The "/" hint and the submit button share one slot: the hint
                says how to get here, the button only matters once there's
                something typed to submit. */}
            {term.trim()
              ? <button className="searchbar-go" onClick={submit}>Search</button>
              : <kbd className="searchbar-kbd" aria-hidden="true">/</kbd>}
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
                        {stars && <Stars score={m.averageScore} />}
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

        {/* Account, theme and list tools live on the Profile screen; only the
            time-sensitive airing alerts stay one click away up here. */}
        <div className="header-actions">
          <div className="bell" ref={bellRef}>
            <button
              className="icon-btn"
              onClick={toggleBell}
              aria-haspopup="true"
              aria-expanded={bellOpen}
              aria-label={unseenAlerts.length > 0 ? `${unseenAlerts.length} new airing alerts` : 'Airing alerts'}
              title="Airing alerts"
            >
              <Bell size={17} strokeWidth={2} />
              {unseenAlerts.length > 0 && <span className="bell-badge">{unseenAlerts.length}</span>}
            </button>
            {bellOpen && (
              <div className="bell-menu" role="menu">
                <p className="bell-menu-title">Airing soon</p>
                {airingAlerts?.length > 0 ? (
                  <div className="bell-menu-list">
                    {airingAlerts.map((a) => (
                      <button
                        key={alertKey(a)}
                        className="bell-menu-item"
                        role="menuitem"
                        onClick={() => { setBellOpen(false); onOpenMedia(a.media); }}
                      >
                        <img src={a.media.coverImage.large} alt="" loading="lazy" />
                        <span className="bell-menu-info">
                          <span className="bell-menu-name">{displayTitle(a.media)}</span>
                          <span className="bell-menu-when">Episode {a.episode} · {formatAiring(a.airingAt)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="bell-menu-empty">Nothing on your Watching list airs soon.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
