export const VIEWS = ['home', 'browse', 'ask', 'saved', 'profile'];

export const VIEW_TITLES = {
  home: 'Tsugi — what to watch next',
  browse: 'Browse — Tsugi',
  ask: 'Ask — Tsugi',
  saved: 'Saved — Tsugi',
  profile: 'Profile — Tsugi',
};

/** Query params that belong to the browse grid (not the detail `id`). */
export const BROWSE_PARAMS = ['search', 'genre', 'season', 'year', 'sort'];

export function viewFromPath(pathname) {
  const seg = pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  return VIEWS.includes(seg) ? seg : 'home';
}

export function pathFor(view) {
  return view === 'home' ? '/' : `/${view}`;
}

/** Initial screen. Older shared links put browse filters on "/" — send those to Browse. */
export function initialView() {
  const view = viewFromPath(window.location.pathname);
  if (view !== 'home') return view;
  const params = new URLSearchParams(window.location.search);
  return BROWSE_PARAMS.some((p) => params.has(p)) ? 'browse' : 'home';
}

/** Plain left-clicks navigate in-app; modified clicks (new tab, etc.) keep the real link. */
export function navClick(e, onNavigate, view) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  onNavigate(view);
}
