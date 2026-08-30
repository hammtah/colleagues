import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { getAvatarBackgroundColor } from '../utils/avatar';

export default function Layout() {
  const { profile, isModerator, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <img src="/colleagues_icon.png" alt="Colleagues" className="brand-icon" />
          </span>
        </div>
        <nav className="nav desktop-nav">
          <NavLink to="/" end>
            Concepts
          </NavLink>
          <NavLink to="/feed">Feed</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/events">Events</NavLink>
        </nav>
        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <div className="user-menu">
            {(() => {
              const name = profile?.displayName || 'Member';
              const userKey = profile?.email || name;
              const bgColor = getAvatarBackgroundColor(userKey);
              const avatarUrl = profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(
                name
              )}&background=${bgColor}&color=fff&bold=true&size=128`;
              return (
                <>
                  <img src={avatarUrl} alt={name} className="user-avatar" />
                  <div className="user-popup" role="menu">
                    <div className="popup-name">{name}</div>
                    <div className="popup-role muted">{isModerator ? 'moderator' : 'member'}</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <button type="button" className="btn ghost" onClick={logout}>
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </header>
      <main className="page page-transition-wrap" key={location.pathname}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined bottom-nav-icon">grid_view</span>
          <span className="bottom-nav-label">Concepts</span>
        </NavLink>
        <NavLink to="/feed" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined bottom-nav-icon">dynamic_feed</span>
          <span className="bottom-nav-label">Feed</span>
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined bottom-nav-icon">leaderboard</span>
          <span className="bottom-nav-label">Leaderboard</span>
        </NavLink>
        <NavLink to="/events" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined bottom-nav-icon">event</span>
          <span className="bottom-nav-label">Events</span>
        </NavLink>
      </nav>
    </div>
  );
}

