import { LogOut, Repeat, Trophy, Sun, Moon } from 'lucide-react';
import { Loading } from '../components/Grid.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import RevealHeading from '../components/RevealHeading.jsx';

/** Account, your list's portability, and appearance — what used to live in header icons. */
export default function ProfileScreen({
  user, authReady, syncEnabled, onGoogleCredential, onSignOut,
  theme, onToggleTheme, savedCount, completedAllTime, onOpenTransfer, onOpenHistory,
}) {
  const name = user?.displayName || user?.email;

  return (
    <>
      <header className="screen-head">
        <RevealHeading as="h1" className="screen-title">Profile</RevealHeading>
      </header>

      <div className="profile-grid">
        <section className="panel profile-panel">
          <h2 className="panel-title">Account</h2>
          {!syncEnabled ? (
            <p className="profile-text">Sync isn’t set up on this site, so your list lives on this device. Use “Move, share or import” below to copy it to another one.</p>
          ) : !authReady ? (
            <Loading>Checking your account</Loading>
          ) : user ? (
            <>
              <div className="profile-user">
                {user.photoURL
                  ? <img className="profile-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                  : <span className="profile-avatar">{(name || '?')[0].toUpperCase()}</span>}
                <div className="profile-user-text">
                  <strong>{user.displayName || 'Signed in'}</strong>
                  {user.email && <span>{user.email}</span>}
                </div>
              </div>
              <p className="profile-text">Your list syncs across every device you sign in on.</p>
              <button className="btn secondary" onClick={onSignOut}><LogOut size={18} strokeWidth={2.5} /> Log out</button>
            </>
          ) : (
            <>
              <p className="profile-text">Sign in to keep your list in sync across devices.</p>
              <GoogleSignInButton onCredential={onGoogleCredential} />
            </>
          )}
        </section>

        <section className="panel profile-panel">
          <h2 className="panel-title">Your list</h2>
          <p className="profile-text">{savedCount} saved · {completedAllTime} completed</p>
          <div className="profile-actions">
            <button className="btn secondary" onClick={onOpenTransfer}><Repeat size={18} strokeWidth={2.5} /> Move, share or import</button>
            {completedAllTime > 0 && (
              <button className="btn secondary" onClick={onOpenHistory}><Trophy size={18} strokeWidth={2.5} /> Completed history</button>
            )}
          </div>
        </section>

        <section className="panel profile-panel">
          <h2 className="panel-title">Appearance</h2>
          <div className="season-row" role="group" aria-label="Theme">
            <button className={`season-pill${theme === 'light' ? ' active' : ''}`} aria-pressed={theme === 'light'} onClick={() => theme !== 'light' && onToggleTheme()}>
              <Sun size={16} strokeWidth={2.5} /> Day
            </button>
            <button className={`season-pill${theme === 'dark' ? ' active' : ''}`} aria-pressed={theme === 'dark'} onClick={() => theme !== 'dark' && onToggleTheme()}>
              <Moon size={16} strokeWidth={2.5} /> Night
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
