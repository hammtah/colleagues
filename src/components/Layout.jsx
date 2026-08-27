import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { profile, isModerator, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <img src="/colleagues_icon.png" alt="Colleagues" className="brand-icon" />
          </span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Concepts
          </NavLink>
          <NavLink to="/feed">Feed</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/events">Events</NavLink>
        </nav>
        <div className="user-chip">
          <span>
            {profile?.displayName || 'Member'}
            {isModerator ? ' · moderator' : ''}
          </span>
          <button type="button" className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
