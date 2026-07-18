import { useEffect, useState } from 'react';
import { createCouncil, deleteCouncil, getCouncils, updateCouncil } from '../services/api';

const emptyForm = { councilName: '', abbreviation: '', contactEmail: '', contactNumber: '', status: 'Active' };

function CouncilManagement({ user }) {
  const readOnly = user?.role === 'board';
  const [councils, setCouncils] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');

  const [modalOpen, setModalOpen] = useState(false);

  const load = () => getCouncils().then((res) => setCouncils(res.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await updateCouncil(editingId, form);
      else await createCouncil(form);
      setMessage('Council saved successfully.');
      load();
      closeModal();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save council.');
    }
  };

  const openAddModal = () => {
    setEditingId('');
    setForm(emptyForm);
    setMessage('');
    setModalOpen(true);
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
    setMessage('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId('');
    setForm(emptyForm);
    setMessage('');
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
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-section-title mb-0">Council Management</h2>
          <p className="page-section-sub mb-0">Manage university councils and units.</p>
        </div>
        {!readOnly ? (
          <button className="btn btn-primary" onClick={openAddModal}>Add Council</button>
        ) : null}
      </div>

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
                  <td className="text-end">
                    {!readOnly ? (
                      <div className="d-flex gap-2 justify-content-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => editCouncil(council)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeCouncil(council._id)}>Delete</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title mb-0">{editingId ? 'Edit Council' : 'Add Council'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal} />
              </div>
              <div className="modal-body">
                {message ? <div className="alert alert-info py-2">{message}</div> : null}
                <form onSubmit={save} className="d-grid gap-3">
                  <div>
                    <label className="form-label mb-1">Council Name *</label>
                    <input className="form-control" placeholder="Council Name" value={form.councilName} onChange={(e) => setForm({ ...form, councilName: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label mb-1">Abbreviation *</label>
                    <input className="form-control" placeholder="Abbreviation" value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label mb-1">Contact Email</label>
                    <input className="form-control" placeholder="Contact Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label mb-1">Contact Number</label>
                    <input className="form-control" placeholder="Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label mb-1">Status *</label>
                    <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-2">
                    <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancel</button>
                    <button className="btn btn-primary" type="submit">{editingId ? 'Update Council' : 'Create Council'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CouncilManagement;