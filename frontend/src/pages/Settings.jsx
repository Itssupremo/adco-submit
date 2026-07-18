import { useEffect, useState } from 'react';
import { getSettings, updateSettings, clearActivityLogs, clearAllNotifications } from '../services/api';

function Settings() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  const load = () => getSettings().then((res) => setItems(res.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleClearActivityLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all activity logs? This action cannot be undone.')) return;
    try {
      await clearActivityLogs();
      setMessage('All activity logs have been cleared successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to clear activity logs.');
    }
  };

  const handleClearNotifications = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all notifications across all accounts? This action cannot be undone.')) return;
    try {
      await clearAllNotifications();
      setMessage('All notifications have been cleared successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to clear notifications.');
    }
  };

  const save = async () => {
    try {
      await updateSettings(items.map((item) => ({ key: item.key, value: item.value, description: item.description })));
      setMessage('Settings saved successfully.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save settings.');
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="card">
        <div className="card-header bg-primary"><h5 className="mb-0 text-white">System Settings</h5></div>
        <div className="card-body">
          {message ? <div className="alert alert-info">{message}</div> : null}
          <div className="d-grid gap-3">
            {items.map((item, index) => (
              <div key={item._id || item.key}>
                <label className="form-label fw-semibold">{item.key}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, value: e.target.value };
                    setItems(next);
                  }}
                />
                <div className="small text-muted mt-1">{item.description}</div>
              </div>
            ))}
            <div><button className="btn btn-primary" onClick={save}>Save Settings</button></div>
          </div>
        </div>
      </div>

      <div className="card border-danger">
        <div className="card-header bg-danger text-white"><h5 className="mb-0">System Data Management</h5></div>
        <div className="card-body">
          <p className="text-muted mb-4">
            Warning: The following actions will permanently delete data from the system. This cannot be undone.
          </p>
          <div className="d-flex flex-wrap gap-3">
            <button className="btn btn-outline-danger" onClick={handleClearActivityLogs}>
              <i className="bi bi-trash3 me-2"></i> Clear All Activity Logs
            </button>
            <button className="btn btn-outline-danger" onClick={handleClearNotifications}>
              <i className="bi bi-bell-slash me-2"></i> Clear All Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;