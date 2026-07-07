import { useEffect, useState } from 'react';
import { getNotifications, getSubmissions } from '../services/api';

function BoardDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    Promise.all([getSubmissions(), getNotifications()])
      .then(([submissionsRes, notificationsRes]) => {
        setSubmissions(submissionsRes.data);
        setNotifications(notificationsRes.data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const pending = submissions.filter((item) => item.status === 'Pending').length;
  const approved = submissions.filter((item) => item.status === 'Approved').length;
  const returned = submissions.filter((item) => item.status === 'Returned').length;

  return (
    <div>
      <div className="mb-4">
        <h2 className="page-section-title mb-0">USM Board Dashboard</h2>
        <p className="page-section-sub mb-0">Review council submissions, monitor pending documents, and act on board decisions.</p>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label: 'Pending Review', value: pending, className: 'stat-card-gold', icon: 'bi-hourglass-split' },
          { label: 'Approved', value: approved, className: 'stat-card-green', icon: 'bi-patch-check-fill' },
          { label: 'Returned', value: returned, className: 'stat-card-purple', icon: 'bi-arrow-counterclockwise' },
          { label: 'Recent Uploads', value: submissions.length, className: 'stat-card-navy', icon: 'bi-cloud-arrow-up-fill' },
        ].map((card) => (
          <div className="col-6 col-lg-3" key={card.label}>
            <div className={`card stat-card ${card.className}`}>
              <div className="card-body">
                <div className="stat-card-icon"><i className={`bi ${card.icon}`} /></div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{card.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">Recent Submissions</h5></div>
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle mb-0">
                <thead><tr><th>Council</th><th>Title</th><th>Status</th><th>Submitted</th></tr></thead>
                <tbody>
                  {submissions.slice(0, 8).map((item) => (
                    <tr key={item._id}><td>{item.councilName}</td><td>{item.documentTitle}</td><td>{item.status}</td><td>{item.submissionDate}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">Notifications</h5></div>
            <div className="card-body">
              {notifications.length === 0 ? <div className="text-muted">No notifications.</div> : notifications.map((item) => (
                <div key={item._id} className="border-bottom pb-2 mb-2">
                  <div className="fw-semibold">{item.title}</div>
                  <div className="small text-muted">{item.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoardDashboard;