import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Login from './pages/Login';
import MyAccount from './pages/MyAccount';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import BoardDashboard from './pages/BoardDashboard';
import CouncilDashboard from './pages/CouncilDashboard';
import UserManagement from './pages/UserManagement';
import CouncilManagement from './pages/CouncilManagement';
import SubmissionManagement from './pages/SubmissionManagement';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import ActivityLogs from './pages/ActivityLogs';
import Settings from './pages/Settings';
import { getMe } from './services/api';

const PAGE_TITLES = {
  '/admin': 'Super Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/councils': 'Council Management',
  '/admin/submissions': 'All Submissions',
  '/admin/reports': 'Reports',
  '/admin/logs': 'Activity Logs',
  '/admin/settings': 'Settings',
  '/board': 'USM Board Dashboard',
  '/board/submissions': 'Submission Review',
  '/board/reports': 'Reports',
  '/board/users': 'User Management',
  '/board/councils': 'Councils',
  '/board/logs': 'Activity Logs',
  '/council': 'Council Dashboard',
  '/council/submit-proposal': 'Submit Proposal',
  '/council/submission': 'My Submission',
  '/notifications': 'Notifications',
  '/my-account': 'My Account',
};

function AuthenticatedLayout({ user, onLogout, sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode, children }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'USM BoardHub';
  const toggle = () => setSidebarOpen((open) => !open);

  return (
    <div className="app-authenticated">
      <Sidebar user={user} onLogout={onLogout} open={sidebarOpen} onToggle={toggle} />
      <div className={`app-main-area${sidebarOpen ? ' sidebar-open' : ''}`}>
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
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
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}>
        <img src="/usm-logo.png" alt="University of Southern Mindanao" style={{ height: 56, opacity: 0.95 }} />
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#f5b731',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.5px' }}>
          Loading USM BoardHub...
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
            <Route path="/my-account" element={<MyAccount user={user} onUserUpdate={refreshUser} />} />
            <Route path="/notifications" element={<Notifications />} />

            <Route path="/admin" element={user.role === 'superadmin' ? <SuperAdminDashboard /> : <Navigate to={user.role === 'board' ? '/board' : '/council'} />} />
            <Route path="/admin/users" element={user.role === 'superadmin' ? <UserManagement /> : <Navigate to={user.role === 'board' ? '/board' : '/council'} />} />
            <Route path="/admin/councils" element={user.role === 'superadmin' ? <CouncilManagement /> : <Navigate to={user.role === 'board' ? '/board' : '/council'} />} />
            <Route path="/admin/submissions" element={user.role === 'superadmin' ? <SubmissionManagement user={user} /> : <Navigate to={user.role === 'board' ? '/board' : '/council'} />} />
            <Route path="/admin/reports" element={user.role === 'superadmin' ? <Reports /> : <Navigate to={user.role === 'board' ? '/board' : '/council'} />} />
            <Route path="/admin/logs" element={user.role === 'superadmin' ? <ActivityLogs /> : <Navigate to={user.role === 'board' ? '/board' : '/council'} />} />
            <Route path="/admin/settings" element={user.role === 'superadmin' ? <Settings /> : <Navigate to={user.role === 'board' ? '/board' : '/council'} />} />

            <Route path="/board" element={user.role === 'board' ? <BoardDashboard /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/council'} />} />
            <Route path="/board/submissions" element={user.role === 'board' ? <SubmissionManagement user={user} /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/council'} />} />
            <Route path="/board/reports" element={user.role === 'board' ? <Reports /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/council'} />} />
            <Route path="/board/users" element={user.role === 'board' ? <UserManagement user={user} /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/council'} />} />
            <Route path="/board/councils" element={user.role === 'board' ? <CouncilManagement user={user} /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/council'} />} />
            <Route path="/board/logs" element={user.role === 'board' ? <ActivityLogs /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/council'} />} />

            <Route path="/council" element={user.role === 'council' ? <CouncilDashboard /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/board'} />} />
            <Route path="/council/submit-proposal" element={user.role === 'council' ? <SubmissionManagement user={user} councilView="submit" /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/board'} />} />
            <Route path="/council/submission" element={user.role === 'council' ? <SubmissionManagement user={user} councilView="history" /> : <Navigate to={user.role === 'superadmin' ? '/admin' : '/board'} />} />

            <Route path="*" element={<Navigate to={user.role === 'superadmin' ? '/admin' : user.role === 'board' ? '/board' : '/council'} />} />
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