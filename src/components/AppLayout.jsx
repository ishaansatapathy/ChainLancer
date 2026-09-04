import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { initials } from '../lib/format.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { id: 'contracts', label: 'Contracts', to: '/dashboard#contracts' },
  { id: 'payments', label: 'Payments', to: '/payments' },
  { id: 'profile', label: 'Profile', to: '/profile' },
  { id: 'wallet', label: 'Wallet', to: '/wallet' },
  { id: 'compliance', label: 'Compliance', to: '/compliance' }
];

export default function AppLayout({ activeId }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.href = '/auth';
  }

  return (
    <div className="app-body">
      <header className="app-nav">
        <div className="app-nav__inner">
          <NavLink to="/dashboard" className="app-nav__logo">
            <img src="/logo.png" alt="" />
            <span>ChainLancer</span>
          </NavLink>
          <nav className="app-nav__links">
            {NAV.map((n) => (
              <NavLink
                key={n.id}
                to={n.to}
                className={({ isActive }) =>
                  `app-nav__link${isActive || activeId === n.id ? ' is-active' : ''}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="app-nav__user">
            {user ? (
              <NavLink to="/profile" className="app-nav__user-chip" title="View Profile">
                <div className="app-nav__avatar">
                  {initials(user.fullName || user.email)}
                </div>
                <span className="app-nav__user-name">
                  {user.fullName ? user.fullName.split(' ')[0] : 'User'}
                </span>
              </NavLink>
            ) : null}
            <button
              type="button"
              className="app-nav__logout-btn"
              onClick={handleLogout}
              title="Sign out of ChainLancer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
