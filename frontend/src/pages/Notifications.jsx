import { useEffect, useState } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api';
import { useNavigate } from 'react-router-dom';

function Notifications({ user }) {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const load = () => getNotifications().then((res) => setItems(res.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleNavigation = (item) => {
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-section-title mb-0">Notifications</h2>
          <p className="page-section-sub mb-0">System alerts related to submissions, approvals, and account updates.</p>
        </div>
        <button className="btn btn-outline-primary" onClick={() => markAllNotificationsRead().then(load)}>Mark all read</button>
      </div>

      <div className="card">
        <div className="card-body">
          {items.length === 0 ? <div className="text-muted">No notifications.</div> : items.map((item) => (
            <div 
              key={item._id} 
              className={`border rounded p-3 mb-3 ${item.isRead ? 'bg-light' : ''}`}
              style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              onClick={() => {
                if (!item.isRead) {
                  markNotificationRead(item._id).then(() => {
                    handleNavigation(item);
                  });
                } else {
                  handleNavigation(item);
                }
              }}
              onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="fw-semibold text-primary">{item.title}</div>
                  <div className="small text-muted mb-2">{new Date(item.createdAt).toLocaleString()}</div>
                  <div>{item.message}</div>
                </div>
                {!item.isRead ? <button className="btn btn-sm btn-outline-primary" onClick={(e) => {
                  e.stopPropagation();
                  markNotificationRead(item._id).then(load);
                }}>Mark read</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Notifications;