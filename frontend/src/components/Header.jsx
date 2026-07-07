import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

function Header({ user, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';
  const isActiveDropdown = (paths) => paths.some((p) => location.pathname === p) ? 'nav-link dropdown-toggle active' : 'nav-link dropdown-toggle';
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [mobileAgendaOpen, setMobileAgendaOpen] = useState(false);

  const agendaPaths = ['/admin/regular-board', '/admin/minutes', '/admin/special-board'];

  return (
    <header className="ocdra-header">
      <div className="container-fluid px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <Link to="/" className="header-brand d-flex align-items-center text-decoration-none">
            <img src="/usm-logo.png" alt="University of Southern Mindanao" className="header-logo" />
          </Link>
          <nav className="d-none d-md-flex align-items-center gap-1">
            {!user && <Link className={isActive('/')} to="/">HOME</Link>}
            {user && user.role === 'admin' && (
              <>
                <Link className={isActive('/admin')} to="/admin">DASHBOARD</Link>
                {/* BoardHub dropdown */}
                <div className={`dropdown${agendaOpen ? ' show' : ''}`}>
                  <button
                    className={isActiveDropdown(agendaPaths)}
                    onClick={() => setAgendaOpen((o) => !o)}
                    onBlur={() => setTimeout(() => setAgendaOpen(false), 150)}
                    type="button"
                  >
                    BOARDHUB
                  </button>
                  <ul className={`dropdown-menu${agendaOpen ? ' show' : ''}`}>
                    <li>
                      <Link className="dropdown-item" to="/admin/regular-board" onClick={() => setAgendaOpen(false)}>
                        Regular Board Meeting
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/admin/minutes" onClick={() => setAgendaOpen(false)}>
                        Minutes of the Meeting
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/admin/special-board" onClick={() => setAgendaOpen(false)}>
                        Special Board Meeting
                      </Link>
                    </li>
                  </ul>
                </div>
                <Link className={isActive('/admin/analytics')} to="/admin/analytics">ANALYTICS</Link>
                <Link className={isActive('/admin/users')} to="/admin/users">USER MANAGEMENT</Link>
              </>
            )}
            {user && user.role === 'user' && (
              <Link className={isActive('/dashboard')} to="/dashboard">DASHBOARD</Link>
            )}
          </nav>
        </div>

        <div className="d-flex align-items-center gap-2">
          {user ? (
            <>
              <span className="header-user d-none d-lg-inline">
                <i className="bi bi-person-circle me-1"></i>{user.fullname}
              </span>
              <button className="btn btn-sm btn-header-logout" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link className="btn btn-sm btn-header-login" to="/login">Login</Link>
          )}
          {/* Mobile toggle */}
          <button
            className="btn btn-sm d-md-none btn-header-toggle"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mobileNav"
          >
            <i className="bi bi-list fs-5"></i>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="collapse container" id="mobileNav">
        <div className="mobile-nav pb-2">
          {!user && <Link className="mobile-nav-link" to="/">HOME</Link>}
          {user && user.role === 'admin' && (
            <>
              <Link className="mobile-nav-link" to="/admin">DASHBOARD</Link>
              {/* BoardHub collapsible section */}
              <button
                className="mobile-nav-link mobile-nav-collapse-btn w-100 text-start border-0 bg-transparent d-flex justify-content-between align-items-center"
                onClick={() => setMobileAgendaOpen((o) => !o)}
                type="button"
              >
                <span>BOARDHUB</span>
                <i className={`bi bi-chevron-${mobileAgendaOpen ? 'up' : 'down'} ms-1`}></i>
              </button>
              {mobileAgendaOpen && (
                <div className="mobile-nav-sub">
                  <Link className="mobile-nav-link mobile-nav-sublink" to="/admin/regular-board">
                    Regular Board Meeting
                  </Link>
                  <Link className="mobile-nav-link mobile-nav-sublink" to="/admin/minutes">
                    Minutes of the Meeting
                  </Link>
                  <Link className="mobile-nav-link mobile-nav-sublink" to="/admin/special-board">
                    Special Board Meeting
                  </Link>
                </div>
              )}
              <Link className="mobile-nav-link" to="/admin/analytics">ANALYTICS</Link>
              <Link className="mobile-nav-link" to="/admin/users">USER MANAGEMENT</Link>
            </>
          )}
          {user && user.role === 'user' && (
            <Link className="mobile-nav-link" to="/dashboard">DASHBOARD</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
