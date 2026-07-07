import { useEffect, useState } from 'react';
import { getActivityLogs, getCouncils, getSubmissions, getUsers } from '../services/api';

function SuperAdminDashboard() {
  const [stats, setStats] = useState({ users: 0, councils: 0, pending: 0, approved: 0, returned: 0, archived: 0 });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    Promise.all([getUsers(), getCouncils(), getSubmissions(), getActivityLogs()])
      .then(([usersRes, councilsRes, submissionsRes, logsRes]) => {
        const submissions = submissionsRes.data;
        setStats({
          users: usersRes.data.length,
          councils: councilsRes.data.length,
          pending: submissions.filter((item) => item.status === 'Pending').length,
          approved: submissions.filter((item) => item.status === 'Approved').length,
          returned: submissions.filter((item) => item.status === 'Returned').length,
          archived: submissions.filter((item) => item.status === 'Archived').length,
        });
        setRecentSubmissions(submissions.slice(0, 5));
        setRecentLogs(logsRes.data.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.users, className: 'stat-card-navy', icon: 'bi-people-fill' },
    { label: 'Total Councils', value: stats.councils, className: 'stat-card-blue', icon: 'bi-buildings-fill' },
    { label: 'Pending', value: stats.pending, className: 'stat-card-gold', icon: 'bi-hourglass-split' },
    { label: 'Approved', value: stats.approved, className: 'stat-card-green', icon: 'bi-patch-check-fill' },
    { label: 'Returned', value: stats.returned, className: 'stat-card-purple', icon: 'bi-arrow-counterclockwise' },
    { label: 'Archived', value: stats.archived, className: 'stat-card-navy', icon: 'bi-archive-fill' },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="page-section-title mb-0">Super Admin Dashboard</h2>
        <p className="page-section-sub mb-0">System-wide overview for the USM BoardHub proposal workflow.</p>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-6 col-lg-4" key={card.label}>
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
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">Recent Uploads</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped align-middle mb-0">
                  <thead><tr><th>Council</th><th>Title</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentSubmissions.length === 0 ? <tr><td colSpan={3} className="text-center text-muted">No submissions yet</td></tr> : recentSubmissions.map((item) => (
                      <tr key={item._id}><td>{item.councilName}</td><td>{item.documentTitle}</td><td>{item.status}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">Recent Activities</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped align-middle mb-0">
                  <thead><tr><th>User</th><th>Action</th><th>When</th></tr></thead>
                  <tbody>
                    {recentLogs.length === 0 ? <tr><td colSpan={3} className="text-center text-muted">No activity yet</td></tr> : recentLogs.map((item) => (
                      <tr key={item._id}><td>{item.fullname}</td><td>{item.action}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;