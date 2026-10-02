import { Home, Compass, Sparkles, Bookmark, User } from 'lucide-react';
import { pathFor, navClick } from '../lib/routes.js';

const TABS = [
  { view: 'home', label: 'Home', Icon: Home },
  { view: 'browse', label: 'Browse', Icon: Compass },
  null, // Ask sits in the middle
  { view: 'saved', label: 'Saved', Icon: Bookmark },
  { view: 'profile', label: 'Profile', Icon: User },
];

/** Phone-only bottom navigation between the four screens, with Ask raised in the middle. */
export default function TabBar({ view, onNavigate, onAsk }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) =>
        tab ? (
          <a
            key={tab.view}
            href={pathFor(tab.view)}
            className={`tabbar-item${view === tab.view ? ' active' : ''}`}
            aria-current={view === tab.view ? 'page' : undefined}
            onClick={(e) => navClick(e, onNavigate, tab.view)}
          >
            <tab.Icon size={22} strokeWidth={2.5} aria-hidden="true" /> {tab.label}
          </a>
        ) : (
          <button key="ask" className="tabbar-item tabbar-primary" onClick={onAsk} aria-haspopup="dialog">
            <span className="tabbar-ask-circle"><Sparkles size={26} strokeWidth={2.5} aria-hidden="true" /></span> Ask
          </button>
        )
      )}
    </nav>
  );
}
