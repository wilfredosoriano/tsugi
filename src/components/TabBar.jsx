import { Home, Compass, Sparkles, Bookmark, User } from 'lucide-react';

/**
 * Phone-only bottom navigation. The app is a single page, so these scroll to
 * its sections (or open the Ask sheet) rather than navigating anywhere.
 */
export default function TabBar({ onHome, onBrowse, onAsk, onSaved, onProfile }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <button className="tabbar-item" onClick={onHome}>
        <Home size={22} strokeWidth={2.5} aria-hidden="true" /> Home
      </button>
      <button className="tabbar-item" onClick={onBrowse}>
        <Compass size={22} strokeWidth={2.5} aria-hidden="true" /> Browse
      </button>
      <button className="tabbar-item tabbar-primary" onClick={onAsk} aria-haspopup="dialog">
        <span className="tabbar-ask-circle"><Sparkles size={26} strokeWidth={2.5} aria-hidden="true" /></span> Ask
      </button>
      <button className="tabbar-item" onClick={onSaved}>
        <Bookmark size={22} strokeWidth={2.5} aria-hidden="true" /> Saved
      </button>
      <button className="tabbar-item" onClick={onProfile}>
        <User size={22} strokeWidth={2.5} aria-hidden="true" /> Profile
      </button>
    </nav>
  );
}
