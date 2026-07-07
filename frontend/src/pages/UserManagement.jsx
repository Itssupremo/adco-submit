import { useEffect, useState } from 'react';
import { createUser, deleteUser, getCouncils, getUsers, resetUserPassword, updateUser } from '../services/api';

const emptyForm = { fullname: '', username: '', email: '', password: '', role: 'council', councilId: '', isActive: true };

const getCouncilLabel = (council) => council?.councilName || '';

function UserManagement({ user }) {
  const readOnly = user?.role === 'board';
  const [users, setUsers] = useState([]);
  const [councils, setCouncils] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [councilInput, setCouncilInput] = useState('');
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    Promise.all([getUsers(), getCouncils()])
      .then(([usersRes, councilsRes]) => {
        setUsers(usersRes.data);
        setCouncils(councilsRes.data);
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const syncCouncilSelection = (value) => {
    setCouncilInput(value);
    const normalized = value.trim().toLowerCase();
    const match = councils.find((council) => getCouncilLabel(council).trim().toLowerCase() === normalized);
    setForm((prev) => ({ ...prev, councilId: match?._id || '' }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.role === 'council' && !form.councilId) {
      setMessage('Please type and select a valid council.');
      return;
    }
    try {
      const payload = {
        fullname: form.fullname,
        username: form.username,
        email: form.email,
        role: form.role,
        councilId: form.role === 'council' ? form.councilId : null,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;
      if (editingId) await updateUser(editingId, payload);
      else await createUser(payload);
      setForm(emptyForm);
      setCouncilInput('');
      setEditingId('');
      setMessage('User saved successfully.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save user.');
    }
  };

  const editUser = (user) => {
    setEditingId(user._id);
    setForm({
      fullname: user.fullname,
      username: user.username,
      email: user.email || '',
      password: '',
      role: user.role,
      councilId: typeof user.councilId === 'object' ? user.councilId?._id || '' : user.councilId || '',
      isActive: user.isActive !== false,
    });
    setCouncilInput(typeof user.councilId === 'object' ? getCouncilLabel(user.councilId) : '');
  };

  const removeUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await deleteUser(id);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const resetPasswordAction = async (id) => {
    const password = window.prompt('Enter the new password:');
    if (!password) return;
    try {
      await resetUserPassword(id, password);
      setMessage('Password reset successful.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="row g-4">
      {!readOnly ? (
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">{editingId ? 'Edit User' : 'Create User'}</h5></div>
            <div className="card-body">
              {message ? <div className="alert alert-info py-2">{message}</div> : null}
              <form onSubmit={save} className="d-grid gap-3">
                <input className="form-control" placeholder="Full Name" value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} required />
                <input className="form-control" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                <input className="form-control" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="form-control" placeholder={editingId ? 'New Password (optional)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} />
                <select className="form-select" value={form.role} onChange={(e) => {
                  const nextRole = e.target.value;
                  setForm({ ...form, role: nextRole, councilId: nextRole === 'council' ? form.councilId : '' });
                  if (nextRole !== 'council') setCouncilInput('');
                }}>
                  <option value="council">Administrative Council</option>
                  <option value="board">USM Board</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                {form.role === 'council' ? (
                  <>
                    <input
                      className="form-control"
                      list="council-options"
                      placeholder="Type Council"
                      value={councilInput}
                      onChange={(e) => syncCouncilSelection(e.target.value)}
                      required
                    />
                    <datalist id="council-options">
                      {councils.map((council) => <option key={council._id} value={getCouncilLabel(council)} />)}
                    </datalist>
                  </>
                ) : null}
                <select className="form-select" value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit">{editingId ? 'Update' : 'Create'}</button>
                  {editingId ? <button className="btn btn-outline-secondary" type="button" onClick={() => { setEditingId(''); setForm(emptyForm); setCouncilInput(''); }}>Cancel</button> : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      <div className={readOnly ? 'col-12' : 'col-lg-8'}>
        <div className="card">
          <div className="card-header bg-primary"><h5 className="mb-0">Users</h5></div>
          <div className="card-body table-responsive">
            {readOnly ? <div className="alert alert-info py-2">Board access is view-only on user management.</div> : null}
            <table className="table table-striped align-middle mb-0">
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Council</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.fullname}</td>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td>{typeof user.councilId === 'object' ? user.councilId?.abbreviation || '—' : '—'}</td>
                    <td>{user.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="text-end">
                      {!readOnly ? (
                        <div className="d-flex gap-2 justify-content-end flex-wrap">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => editUser(user)}>Edit</button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => resetPasswordAction(user._id)}>Reset Password</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeUser(user._id)}>Delete</button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;