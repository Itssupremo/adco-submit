import { Link, useLocation } from 'react-router-dom';

const superAdminNav = [
  {
    section: 'OVERVIEW',
    items: [{ label: 'Dashboard', icon: 'bi-house-door', path: '/admin' }],
  },
  {
    section: 'SUBMISSIONS',
    items: [
      { label: 'Submissions', icon: 'bi-file-earmark-pdf', path: '/admin/submissions' },
      { label: 'Reports', icon: 'bi-bar-chart-line', path: '/admin/reports' },
      { label: 'Notifications', icon: 'bi-bell', path: '/notifications' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { label: 'User Management', icon: 'bi-people', path: '/admin/users' },
      { label: 'Councils', icon: 'bi-buildings', path: '/admin/councils' },
      { label: 'Activity Logs', icon: 'bi-journal-text', path: '/admin/logs' },
      { label: 'Settings', icon: 'bi-gear', path: '/admin/settings' },
    ],
  },
];

const boardNav = [
  {
    section: 'OVERVIEW',
    items: [{ label: 'Dashboard', icon: 'bi-house-door', path: '/board' }],
  },
  {
    section: 'SUBMISSIONS',
    items: [
      { label: 'Submissions', icon: 'bi-file-earmark-pdf', path: '/board/submissions' },
      { label: 'Reports', icon: 'bi-bar-chart-line', path: '/board/reports' },
      { label: 'Notifications', icon: 'bi-bell', path: '/notifications' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { label: 'User Management', icon: 'bi-people', path: '/board/users' },
      { label: 'Councils', icon: 'bi-buildings', path: '/board/councils' },
      { label: 'Activity Logs', icon: 'bi-journal-text', path: '/board/logs' },
    ],
  },
];

const councilNav = [
  {
    section: 'OVERVIEW',
    items: [{ label: 'Dashboard', icon: 'bi-house-door', path: '/council' }],
  },
  {
    section: 'SUBMISSION',
    items: [
      { label: 'Submit Proposal', icon: 'bi-upload', path: '/council/submit-proposal' },
      { label: 'My Submission', icon: 'bi-file-earmark-text', path: '/council/submission' },
      { label: 'Notifications', icon: 'bi-bell', path: '/notifications' },
    ],
  },
];

const NAV_BY_ROLE = { superadmin: superAdminNav, board: boardNav, council: councilNav };

const ROLE_BADGE = {
  superadmin: { label: 'Super Admin', color: '#e74c3c' },
  board: { label: 'USM Board', color: '#2980b9' },
  council: { label: 'Administrative Council', color: '#27ae60' },
};

function Sidebar({ user, onLogout, open, onToggle }) {
  const location = useLocation();
  const navSections = NAV_BY_ROLE[user?.role] || councilNav;
  const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.council;

  return (
    <>
      {open && <div className="sidebar-overlay d-lg-none" onClick={onToggle} />}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-toggle" onClick={onToggle} type="button" title="Toggle menu">
            <i className="bi bi-list" />
          </button>
          <div className="sidebar-brand">
            <img src="/usm-logo.png" alt="University of Southern Mindanao" className="sidebar-logo" />
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">USM BoardHub</span>
              <span className="sidebar-brand-sub">Board Proposal System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.section} className="sidebar-section">
              <span className="sidebar-section-label">{section.section}</span>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}
                  title={item.label}
                >
                  <i className={`bi ${item.icon} sidebar-nav-icon`} />
                  <span className="sidebar-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link
            to="/my-account"
            className={`sidebar-user-row sidebar-user-row-link${location.pathname === '/my-account' ? ' active' : ''}`}
            title="My Account"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            <i className="bi bi-person-circle sidebar-nav-icon" />
            <div className="sidebar-nav-label" style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.fullname}
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.6px',
                  background: badge.color,
                  color: '#fff',
                  padding: '1px 7px',
                  borderRadius: 10,
                  display: 'inline-block',
                  marginTop: 2,
                }}
              >
                {badge.label}
              </span>
            </div>
            <i className="bi bi-chevron-right sidebar-nav-icon" style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft: 'auto', flexShrink: 0 }} />
          </Link>
          <button className="sidebar-logout-btn" onClick={onLogout} type="button">
            <i className="bi bi-box-arrow-right sidebar-nav-icon" />
            <span className="sidebar-nav-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
