import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { profile, isModerator, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">CL</span>
          <div>
            <strong>Colleagues</strong>
            <p>Concept of the month</p>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Feed
          </NavLink>
          <NavLink to="/progress">Progress</NavLink>
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
