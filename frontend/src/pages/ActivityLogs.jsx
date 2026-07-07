import { useEffect, useState } from 'react';
import { getActivityLogs } from '../services/api';

function ActivityLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getActivityLogs().then((res) => setLogs(res.data)).catch(() => {});
  }, []);

  return (
    <div className="card">
      <div className="card-header bg-primary"><h5 className="mb-0">Activity Logs</h5></div>
      <div className="card-body table-responsive">
        <table className="table table-striped align-middle mb-0">
          <thead><tr><th>User</th><th>Role</th><th>Action</th><th>Details</th><th>When</th></tr></thead>
          <tbody>
            {logs.map((item) => (
              <tr key={item._id}><td>{item.fullname}</td><td>{item.role}</td><td>{item.action}</td><td>{item.details}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActivityLogs;