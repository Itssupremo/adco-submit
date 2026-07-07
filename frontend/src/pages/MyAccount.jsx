import { useState, useEffect } from 'react';
import { updateSelf } from '../services/api';

const ROLE_LABEL = { superadmin: 'Super Admin', board: 'USM Board', council: 'Administrative Council' };
const ROLE_BADGE  = { superadmin: 'bg-danger', board: 'bg-primary', council: 'bg-success' };

function MyAccount({ user, onUserUpdate }) {
  const [editing, setEditing]           = useState(false);
  const [alert,   setAlert]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [form,    setForm]              = useState({
    fullname: '', email: '', username: '', password: '', confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setForm({ fullname: user.fullname || '', email: user.email || '', username: user.username || '', password: '', confirmPassword: '' });
    }
  }, [user]);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      showAlert('danger', 'Passwords do not match');
      return;
    }
    if (form.password && form.password.length < 4) {
      showAlert('danger', 'Password must be at least 4 characters');
      return;
    }
    setLoading(true);
    try {
      const data = { email: form.email, username: form.username };
      if (form.password) data.password = form.password;
      await updateSelf(data);
      showAlert('success', 'Account updated successfully!');
      setEditing(false);
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      showAlert('danger', err.response?.data?.message || 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm({ fullname: user.fullname || '', email: user.email || '', username: user.username || '', password: '', confirmPassword: '' });
    setAlert(null);
  };

  const roleBadge  = ROLE_BADGE[user?.role]  || 'bg-secondary';
  const roleLabel  = ROLE_LABEL[user?.role] || user?.role;

  return (
    <div className="row justify-content-center">
      <div className="col-lg-7 col-md-9">

        {alert && (
          <div className={`alert alert-${alert.type} alert-dismissible fade show d-flex align-items-center`}>
            <i className={`bi ${alert.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`}></i>
            {alert.msg}
            <button type="button" className="btn-close ms-auto" onClick={() => setAlert(null)}></button>
          </div>
        )}

        <div className="card shadow-sm">
          {/* Card Header */}
          <div
            className="card-header d-flex justify-content-between align-items-center py-3 px-4"
            style={{ background: '#1e1e2f', color: '#fff', borderTopLeftRadius: 'var(--r-md)', borderTopRightRadius: 'var(--r-md)', borderBottom: 'none' }}
          >
            <span className="fw-semibold fs-5 d-flex align-items-center">
              <i className="bi bi-person-circle me-2 fs-4"></i>My Account
            </span>
            {!editing && (
              <button className="btn btn-sm fw-semibold px-3 py-2 d-flex align-items-center" style={{ borderRadius: 6, background: '#fbbf24', border: 'none', color: '#1e1e2f' }} onClick={() => setEditing(true)}>
                <i className="bi bi-pencil-square me-2"></i>Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            /* ── VIEW MODE ─────────────────────────────────────────────── */
            <div className="card-body p-4 p-md-5">
              <div className="d-flex align-items-center mb-5 gap-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 80, height: 80, flexShrink: 0,
                    background: '#d4af37',
                    fontSize: '2.5rem', color: '#fff',
                  }}
                >
                  <i className="bi bi-person-fill"></i>
                </div>
                <div>
                  <h4 className="mb-1 fw-bold text-dark">{user?.fullname}</h4>
                  <div className="d-flex align-items-center mt-2">
                    <span className={`badge ${roleBadge} px-3 py-2 rounded-pill fs-6`}>{roleLabel}</span>
                  </div>
                </div>
              </div>

              <div className="row g-4 ms-1">
                <div className="col-sm-3 text-muted fw-semibold d-flex align-items-center">
                  <i className="bi bi-person me-3 fs-5"></i>Username
                </div>
                <div className="col-sm-9 d-flex align-items-center">
                  <span style={{ color: '#ec4899', fontFamily: 'monospace', fontSize: '0.95rem' }}>{user?.username}</span>
                </div>

                <div className="col-sm-3 text-muted fw-semibold d-flex align-items-center">
                  <i className="bi bi-envelope me-3 fs-5"></i>Email
                </div>
                <div className="col-sm-9 d-flex align-items-center text-dark">
                  {user?.email ? user.email : <span className="text-muted fst-italic">Not set</span>}
                </div>

                <div className="col-sm-3 text-muted fw-semibold d-flex align-items-center">
                  <i className="bi bi-shield-check me-3 fs-5"></i>Role
                </div>
                <div className="col-sm-9 d-flex align-items-center text-dark">
                  {roleLabel}
                </div>

                <div className="col-sm-3 text-muted fw-semibold d-flex align-items-center">
                  <i className="bi bi-building me-3 fs-5"></i>College/Unit
                </div>
                <div className="col-sm-9 d-flex align-items-center text-dark">
                  {user?.role === 'council'
                    ? (user?.councilName || <span className="text-muted fst-italic">Not assigned</span>)
                    : <span className="text-muted fst-italic">Not applicable</span>}
                </div>

                <div className="col-sm-3 text-muted fw-semibold d-flex align-items-center">
                  <i className="bi bi-diagram-3 me-3 fs-5"></i>Scope
                </div>
                <div className="col-sm-9 d-flex align-items-center text-dark">
                  {user?.role === 'superadmin' ? 'System-wide' : user?.role === 'board' ? 'All submissions' : 'Assigned council account'}
                </div>
              </div>
            </div>
          ) : (
            /* ── EDIT MODE ─────────────────────────────────────────────── */
            <form onSubmit={handleSave}>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Full Name</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value={form.fullname}
                    readOnly
                    disabled
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                  />
                </div>

                <hr />
                <p className="text-muted small mb-2">
                  <i className="bi bi-lock me-1"></i>
                  Change Password{' '}
                  <span className="fst-italic">(leave blank to keep current password)</span>
                </p>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="New password"
                      minLength={4}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              <div className="card-footer d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading
                    ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
                    : <><i className="bi bi-check-lg me-1"></i>Save Changes</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyAccount;
