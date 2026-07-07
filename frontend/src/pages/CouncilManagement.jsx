import { useEffect, useState } from 'react';
import { createCouncil, deleteCouncil, getCouncils, updateCouncil } from '../services/api';

const emptyForm = { councilName: '', abbreviation: '', contactEmail: '', contactNumber: '', status: 'Active' };

function CouncilManagement({ user }) {
  const readOnly = user?.role === 'board';
  const [councils, setCouncils] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');

  const load = () => getCouncils().then((res) => setCouncils(res.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await updateCouncil(editingId, form);
      else await createCouncil(form);
      setForm(emptyForm);
      setEditingId('');
      setMessage('Council saved successfully.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save council.');
    }
  };

  const editCouncil = (council) => {
    setEditingId(council._id);
    setForm({
      councilName: council.councilName,
      abbreviation: council.abbreviation,
      contactEmail: council.contactEmail || '',
      contactNumber: council.contactNumber || '',
      status: council.status || 'Active',
    });
  };

  const removeCouncil = async (id) => {
    if (!window.confirm('Delete this council?')) return;
    try {
      await deleteCouncil(id);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete council.');
    }
  };

  return (
    <div className="row g-4">
      {!readOnly ? (
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">{editingId ? 'Edit Council' : 'Add Council'}</h5></div>
            <div className="card-body">
              {message ? <div className="alert alert-info py-2">{message}</div> : null}
              <form onSubmit={save} className="d-grid gap-3">
                <input className="form-control" placeholder="Council Name" value={form.councilName} onChange={(e) => setForm({ ...form, councilName: e.target.value })} required />
                <input className="form-control" placeholder="Abbreviation" value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} required />
                <input className="form-control" placeholder="Contact Email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                <input className="form-control" placeholder="Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit">{editingId ? 'Update' : 'Create'}</button>
                  {editingId ? <button className="btn btn-outline-secondary" type="button" onClick={() => { setEditingId(''); setForm(emptyForm); }}>Cancel</button> : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      <div className={readOnly ? 'col-12' : 'col-lg-8'}>
        <div className="card">
          <div className="card-header bg-primary"><h5 className="mb-0">Councils</h5></div>
          <div className="card-body table-responsive">
            {readOnly ? <div className="alert alert-info py-2">Board access is view-only on council management.</div> : null}
            <table className="table table-striped align-middle mb-0">
              <thead><tr><th>Name</th><th>Abbreviation</th><th>Contact</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {councils.map((council) => (
                  <tr key={council._id}>
                    <td>{council.councilName}</td><td>{council.abbreviation}</td><td>{council.contactEmail || council.contactNumber || '—'}</td><td>{council.status}</td>
                    <td className="text-end d-flex gap-2 justify-content-end">
                      {!readOnly ? <button className="btn btn-sm btn-outline-primary" onClick={() => editCouncil(council)}>Edit</button> : null}
                      {!readOnly ? <button className="btn btn-sm btn-outline-danger" onClick={() => removeCouncil(council._id)}>Delete</button> : null}
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

export default CouncilManagement;