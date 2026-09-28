import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'History', end: true },
  { to: '/workouts/new', label: 'Log' },
  { to: '/progress', label: 'Progress' },
  { to: '/profile', label: 'Profile' },
];

// On phones the nav sits at the bottom of the screen, within thumb reach;
// on wider screens it moves to the top bar.
export default function Layout() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="wordmark" aria-label="RepLog home">
          <span className="bar-icon" aria-hidden="true" />
          RepLog
        </NavLink>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
