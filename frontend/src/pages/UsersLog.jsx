import { useState, useEffect } from 'react';
import { getActivityLogs, getSucs } from '../services/api';

const ACTION_META = {
  'LOGIN':           { color: '#0284c7', bg: 'rgba(2,132,199,0.09)',  icon: 'bi-box-arrow-in-right', label: 'Login' },
  'CREATE_USER':     { color: '#059669', bg: 'rgba(5,150,105,0.09)',  icon: 'bi-person-plus',        label: 'Create User' },
  'UPDATE_USER':     { color: '#d97706', bg: 'rgba(217,119,6,0.09)',  icon: 'bi-person-gear',        label: 'Update User' },
  'DELETE_USER':     { color: '#dc2626', bg: 'rgba(220,38,38,0.09)',  icon: 'bi-person-x',           label: 'Delete User' },
  'UPDATE_USER_SELF':{ color: '#7c3aed', bg: 'rgba(124,58,237,0.09)', icon: 'bi-person-fill-gear',   label: 'Self Update' },
  'CREATE_SUC':      { color: '#059669', bg: 'rgba(5,150,105,0.09)',  icon: 'bi-building-add',       label: 'Create SUC' },
  'UPDATE_SUC':      { color: '#d97706', bg: 'rgba(217,119,6,0.09)',  icon: 'bi-building-gear',      label: 'Update SUC' },
  'DELETE_SUC':      { color: '#dc2626', bg: 'rgba(220,38,38,0.09)',  icon: 'bi-building-dash',      label: 'Delete SUC' },
  'TRANSFER_SUC':    { color: '#0d1b3e', bg: 'rgba(13,27,62,0.09)',   icon: 'bi-arrow-left-right',   label: 'Transfer SUC' },
  'UPLOAD_AGENDA':   { color: '#059669', bg: 'rgba(5,150,105,0.09)',  icon: 'bi-file-earmark-arrow-up', label: 'Upload Agenda' },
  'RESET_AGENDA':    { color: '#dc2626', bg: 'rgba(220,38,38,0.09)',  icon: 'bi-file-earmark-x',     label: 'Reset Agenda' },
  'UPLOAD_DOCUMENT': { color: '#059669', bg: 'rgba(5,150,105,0.09)',  icon: 'bi-file-earmark-arrow-up', label: 'Upload Doc' },
  'RESET_DOCUMENT':  { color: '#dc2626', bg: 'rgba(220,38,38,0.09)',  icon: 'bi-file-earmark-x',     label: 'Reset Doc' },
  'CREATE_MEETING':  { color: '#059669', bg: 'rgba(5,150,105,0.09)',  icon: 'bi-calendar-plus',      label: 'Create Meeting' },
  'UPDATE_MEETING':  { color: '#d97706', bg: 'rgba(217,119,6,0.09)',  icon: 'bi-calendar-event',     label: 'Update Meeting' },
  'DELETE_MEETING':  { color: '#dc2626', bg: 'rgba(220,38,38,0.09)',  icon: 'bi-calendar-x',         label: 'Delete Meeting' },
};

const ROLE_META = {
  superadmin: { color: '#dc2626', bg: 'rgba(220,38,38,0.09)', label: 'Super Admin' },
  admin:      { color: '#0d1b3e', bg: 'rgba(13,27,62,0.08)',  label: 'Commissioner' },
  user:       { color: '#059669', bg: 'rgba(5,150,105,0.09)', label: 'SUC User' },
};

function getRoleLabel(role, occCode) {
  if (role === 'admin' && occCode === 'OCSCA') return 'Chairperson';
  if (role === 'admin') return 'Commissioner';
  if (role === 'user') return 'SUC User';
  return role;
}

function UsersLog({ user: currentUser }) {
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const [logs, setLogs] = useState([]);
  const [sucs, setSucs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [sucFilter, setSucFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, sucsRes] = await Promise.all([
        getActivityLogs(),
        isSuperAdmin ? getSucs() : Promise.resolve({ data: [] }),
      ]);
      setLogs(logsRes.data);
      setSucs(sucsRes.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch activity logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      log.username.toLowerCase().includes(q) ||
      log.fullname.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.ipAddress || '').includes(q);
    const matchesAction = !actionFilter || log.action === actionFilter;
    const matchesSuc = !sucFilter || log.sucAbbreviation === sucFilter;
    return matchesSearch && matchesAction && matchesSuc;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, actionFilter, sucFilter]);

  const totalCount = filteredLogs.length;
  const loginCount = filteredLogs.filter(l => l.action === 'LOGIN').length;
  const uploadCount = filteredLogs.filter(l => l.action.includes('UPLOAD')).length;
  const writeCount = filteredLogs.filter(l =>
    l.action.includes('CREATE') || l.action.includes('UPDATE') ||
    l.action.includes('TRANSFER') || l.action.includes('DELETE')
  ).length;

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-section-title mb-0">
            <i className="bi bi-journal-text me-2" style={{ color: 'var(--gold)' }} />
            System Activity Log
          </h2>
          <p className="page-section-sub mb-0">Track all actions performed by users across the system</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchData} disabled={loading} id="refresh-logs-btn">
          <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-navy">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Total Activities</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{totalCount}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-activity" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-blue">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>User Logins</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{loginCount}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-box-arrow-in-right" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-green">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Doc Uploads</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{uploadCount}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-file-earmark-arrow-up" /></div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card stat-card stat-card-purple">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Write Events</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{writeCount}</div>
              </div>
              <div className="stat-card-icon"><i className="bi bi-pencil-square" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Filters */}
        <div className="card-header" style={{ paddingBottom: '0.75rem !important' }}>
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search user, action, IP…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  id="search-logs"
                />
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <select className="form-select form-select-sm" value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)} id="filter-action">
                <option value="">All Action Types</option>
                {Object.keys(ACTION_META).map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            {isSuperAdmin && (
              <div className="col-12 col-sm-6 col-md-3">
                <select className="form-select form-select-sm" value={sucFilter}
                  onChange={(e) => setSucFilter(e.target.value)} id="filter-suc">
                  <option value="">All SUCs</option>
                  {sucs.map((s) => (
                    <option key={s._id} value={s.abbreviation}>{s.abbreviation} — {s.sucName}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-auto ms-auto">
              <span style={{
                fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                background: 'var(--navy-muted)', padding: '4px 12px', borderRadius: 'var(--r-pill)',
              }}>
                {filteredLogs.length.toLocaleString()} records
              </span>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error}</div>}

          {loading ? (
            <div className="d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: 300, gap: 12 }}>
              <div className="spinner-border" style={{ color: 'var(--text-navy)', width: 40, height: 40 }} role="status">
                <span className="visually-hidden">Loading…</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>Loading activity logs…</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" id="logs-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>SUC / OCC</th>
                    <th>Details</th>
                    <th style={{ paddingRight: 20 }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <i className="bi bi-inbox empty-state-icon" />
                          <span className="empty-state-text">No activity logs found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const am = ACTION_META[log.action] || { color: '#64748b', bg: '#f1f5f9', icon: 'bi-circle', label: log.action };
                      const rm = ROLE_META[log.role] || ROLE_META.user;
                      const roleLabel = getRoleLabel(log.role, log.occCode);

                      return (
                        <tr key={log._id}>
                          <td style={{ paddingLeft: 20, color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '0.75rem' }}>
                              {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{log.fullname}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{log.username}</div>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              background: rm.bg, color: rm.color,
                              padding: '3px 10px', borderRadius: 'var(--r-pill)',
                              fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                            }}>
                              {roleLabel}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: am.bg, color: am.color,
                              padding: '4px 10px', borderRadius: 'var(--r-pill)',
                              fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                            }}>
                              <i className={`bi ${am.icon}`} style={{ fontSize: '0.8rem' }} />
                              {am.label}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {log.role === 'admin'
                              ? (log.occCode || '—')
                              : log.role === 'user'
                                ? (log.sucAbbreviation || '—')
                                : '—'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: 280, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            {log.details}
                          </td>
                          <td style={{ paddingRight: 20 }}>
                            <code style={{ fontSize: '0.75rem' }}>{log.ipAddress || '—'}</code>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="card-footer" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(1)} title="First">
                    <i className="bi bi-chevron-double-left" />
                  </button>
                </li>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(c => Math.max(1, c - 1))}>
                    <i className="bi bi-chevron-left" />
                  </button>
                </li>
                {[...Array(totalPages)].map((_, idx) => {
                  const pNum = idx + 1;
                  if (totalPages > 7 && Math.abs(currentPage - pNum) > 2 && pNum !== 1 && pNum !== totalPages) return null;
                  return (
                    <li key={pNum} className={`page-item ${currentPage === pNum ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(pNum)}>{pNum}</button>
                    </li>
                  );
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}>
                    <i className="bi bi-chevron-right" />
                  </button>
                </li>
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(totalPages)} title="Last">
                    <i className="bi bi-chevron-double-right" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersLog;
