import { useEffect, useState } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api';

function Notifications() {
  const [items, setItems] = useState([]);

  const load = () => getNotifications().then((res) => setItems(res.data)).catch(() => {});
  useEffect(() => { load(); }, []);

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
            <div key={item._id} className={`border rounded p-3 mb-3 ${item.isRead ? 'bg-light' : ''}`}>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="fw-semibold">{item.title}</div>
                  <div className="small text-muted mb-2">{new Date(item.createdAt).toLocaleString()}</div>
                  <div>{item.message}</div>
                </div>
                {!item.isRead ? <button className="btn btn-sm btn-outline-primary" onClick={() => markNotificationRead(item._id).then(load)}>Mark read</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Notifications;