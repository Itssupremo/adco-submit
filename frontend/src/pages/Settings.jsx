import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../services/api';

function Settings() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  const load = () => getSettings().then((res) => setItems(res.data)).catch(() => {});
  useEffect(() => { load(); }, []);

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
    <div className="card">
      <div className="card-header bg-primary"><h5 className="mb-0">System Settings</h5></div>
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
  );
}

export default Settings;