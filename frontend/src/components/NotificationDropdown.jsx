import { useState, useEffect, useRef } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

function NotificationDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const load = () => {
    getNotifications().then((res) => {
      setNotifications(res.data.slice(0, 5));
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button 
        className="btn btn-link p-0 me-3 position-relative d-flex align-items-center justify-content-center" 
        onClick={() => setOpen(!open)}
        title="Notifications"
        style={{ fontSize: '1.2rem', textDecoration: 'none', color: 'var(--navy)', width: '36px', height: '36px', borderRadius: 'var(--r-md)', background: 'rgba(20,83,45,0.08)' }}
      >
        <i className="bi bi-bell-fill"></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem' }}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div 
          className="dropdown-menu show shadow" 
          style={{ 
            position: 'absolute', 
            right: 0, 
            top: '100%', 
            minWidth: '320px', 
            zIndex: 1050, 
            padding: 0,
            marginTop: '0.5rem',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            overflow: 'hidden'
          }}
        >
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ borderColor: 'var(--border-soft)' }}>
            <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h6>
            {unreadCount > 0 && (
              <button 
                className="btn btn-sm btn-link text-decoration-none p-0" 
                onClick={(e) => { e.stopPropagation(); markAllNotificationsRead().then(load); }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="p-3 text-center text-muted small">No notifications.</div>
            ) : (
              notifications.map((item) => (
                <div 
                  key={item._id} 
                  className="p-3 border-bottom"
                  style={{ 
                    cursor: item.isRead ? 'default' : 'pointer',
                    backgroundColor: item.isRead ? 'transparent' : 'var(--green-soft)',
                    borderColor: 'var(--border-soft)',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => {
                    const handleNavigation = () => {
                      setOpen(false);
                      if (user?.role === 'board') {
                        navigate('/board/submissions');
                      } else if (user?.role === 'superadmin') {
                        navigate('/admin/submissions');
                      } else if (user?.role === 'council') {
                        if (item.type === 'SUBMISSION_RETURNED') {
                          navigate('/council/submit-proposal', { state: { editSubmissionId: item.meta?.submissionId } });
                        } else {
                          navigate('/council/submission');
                        }
                      }
                    };
                    if (!item.isRead) {
                        markNotificationRead(item._id).then(() => {
                          load();
                          handleNavigation();
                        });
                    } else {
                        handleNavigation();
                    }
                  }}
                >
                  <div className="fw-semibold" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.title}</div>
                  <div className="small mt-1" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.message}</div>
                  <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 text-center bg-light">
            <Link to="/notifications" className="text-decoration-none small fw-semibold" onClick={() => setOpen(false)}>
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
