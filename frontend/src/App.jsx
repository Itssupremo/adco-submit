import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import UserManagement from './pages/UserManagement';
import RegularBoardMeeting from './pages/RegularBoardMeeting';
import MinutesOfMeeting from './pages/MinutesOfMeeting';
import SpecialBoardMeeting from './pages/SpecialBoardMeeting';
import MyAccount from './pages/MyAccount';
import Analytics from './pages/Analytics';
import SucAnalytics from './pages/SucAnalytics';
import SucUserManagement from './pages/SucUserManagement';
import UsersLog from './pages/UsersLog';
import { getMe } from './services/api';

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/logs': 'Users Log',
  '/admin/analytics': 'Analytics',
  '/admin/regular-board': 'Regular Board Meeting',
  '/admin/minutes': 'Minutes of the Meeting',
  '/admin/special-board': 'Special Board Meeting',
  '/dashboard': 'Dashboard',
  '/dashboard/analytics': 'My Analytics',
  '/dashboard/users': 'Board Members',
  '/my-account': 'My Account',
};

function AuthenticatedLayout({ user, onLogout, sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode, children }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'e-Agenda System';
  const toggle = () => setSidebarOpen((o) => !o);

  return (
    <div className="app-authenticated">
      <Sidebar user={user} onLogout={onLogout} open={sidebarOpen} onToggle={toggle} />
      <div className={`app-main-area${sidebarOpen ? ' sidebar-open' : ''}`}>
        {/* Top bar */}
        <div className="app-topbar">
          <button className="sidebar-toggle d-lg-none me-2" onClick={toggle} type="button" title="Toggle menu">
            <i className="bi bi-list" />
          </button>
          <span className="app-topbar-title">{title}</span>
          <button
            className="darkmode-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            id="darkmode-btn"
          >
            <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
          </button>
          <div className="app-topbar-user d-none d-md-flex">
            <i className="bi bi-person-circle" />
            <span>{user.fullname}</span>
          </div>
        </div>
        <main className="app-content flex-grow-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 992);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = () => {
    getMe().then((res) => setUser(res.data.user)).catch(() => {});
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(135deg, #0d1b3e 0%, #1e3163 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
      }}>
        <img src="/ched-logo.png" alt="CHED" style={{ height: 52, filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#f5b731',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.5px' }}>
          Loading e-Agenda…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Router>
      {user ? (
        <AuthenticatedLayout
          user={user}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        >
          <Routes>
            {/* My Account — all roles */}
            <Route path="/my-account" element={<MyAccount user={user} onUserUpdate={refreshUser} />} />
            {/* SuperAdmin + Admin */}
            <Route
              path="/admin"
              element={['superadmin', 'admin'].includes(user.role) ? <AdminDashboard user={user} /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/admin/users"
              element={['superadmin', 'admin'].includes(user.role) ? <UserManagement user={user} /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/admin/logs"
              element={['superadmin', 'admin'].includes(user.role) ? <UsersLog user={user} /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/admin/analytics"
              element={['superadmin', 'admin'].includes(user.role) ? <Analytics user={user} /> : <Navigate to="/dashboard" />}
            />
            {/* SuperAdmin + Admin + User (SUC) */}
            <Route
              path="/admin/regular-board"
              element={<RegularBoardMeeting user={user} />}
            />
            <Route
              path="/admin/minutes"
              element={<MinutesOfMeeting user={user} />}
            />
            <Route
              path="/admin/special-board"
              element={<SpecialBoardMeeting user={user} />}
            />
            {/* SUC user */}
            <Route path="/dashboard" element={<UserDashboard user={user} />} />
            <Route path="/dashboard/analytics" element={<SucAnalytics user={user} />} />
            <Route path="/dashboard/users" element={<SucUserManagement user={user} />} />
            <Route path="*" element={
              <Navigate to={
                user.role === 'superadmin' ? '/admin' :
                user.role === 'admin'      ? '/admin' :
                                             '/dashboard'
              } />
            } />
          </Routes>
        </AuthenticatedLayout>
      ) : (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
