import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSucs, getAgendas, uploadAgendaFiles, resetAgenda } from '../services/api';
import PdfViewer from '../components/PdfViewer';

const QUARTERS = ['1st', '2nd', '3rd', '4th'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const OCC_OFFICIALS = [
  { code: 'OCSCA', label: 'Chairperson Shirley C. Agrupis' },
  { code: 'OCDRA', label: 'Commissioner Desiderio R. Apag III' },
  { code: 'OCRPA', label: 'Commissioner Ricmar P. Aquino' },
  { code: 'OCMQM', label: 'Commissioner Myrna Q. Mallari' },
  { code: 'OCMAO', label: 'Commissioner Michelle Aguilar-Ong' },
];

const getLeaderLine = (user) => {
  if (!user) return 'the Commission on Higher Education';
  if (user.role === 'admin')
    return `${user.occCode === 'OCSCA' ? 'Chairperson' : 'Commissioner'} ${user.fullname}`;
  if (user.role === 'superadmin') return `Administrator ${user.fullname}`;
  return user.fullname;
};

// ── Drag-and-drop file zone ──────────────────────────────────────────────────
function DropZone({ label, file, onFile, disabled = false }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') onFile(f);
  };

  return (
    <div className="mb-3">
      <p className="agenda-upload-label mb-1">{label}</p>
      <div
        className={`agenda-dropzone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
        onClick={() => { if (!disabled) inputRef.current.click(); }}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {file ? (
          <span className="agenda-dropzone-file">
            <i className="bi bi-file-earmark-pdf-fill text-danger me-1" />
            {file.name}
          </span>
        ) : (
          <span className="agenda-dropzone-hint">
            <i className="bi bi-upload me-1" />
            Drag &amp; drop PDF here or click to browse
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }}
        />
      </div>
    </div>
  );
}

// ── PDF viewer modal ─────────────────────────────────────────────────────────
// ── Version history dropdown ─────────────────────────────────────────────────
function VersionDropdown({ history, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ display: 'inline-block', position: 'relative', marginLeft: '6px' }}>
      <button
        className="btn btn-outline-secondary btn-sm"
        style={{ fontSize: '0.72rem', padding: '1px 7px' }}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        History ▾
      </button>
      {open && (
        <ul
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 1050,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px',
            minWidth: '220px', padding: '4px 0', margin: 0, listStyle: 'none',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {[...history].reverse().map((h) => (
            <li key={h.version}>
              <button
                className="dropdown-item"
                style={{ fontSize: '0.82rem' }}
                onClick={() => { setOpen(false); onSelect(h.version); }}
              >
                v{h.version} &mdash; {h.uploadedAt ? new Date(h.uploadedAt).toLocaleString() : 'unknown date'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
// ── Single quarter card ──────────────────────────────────────────────────────
function QuarterCard({ quarter, agendaDoc, sucId, sucName, year, onRefresh, onViewFile, user, highlighted }) {
  const [proposedFile, setProposedFile] = useState(null);
  const [approvedFile, setApprovedFile] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [resetting,  setResetting]  = useState(false);
  const [msg,        setMsg]        = useState(null);

  const canUpload = ['superadmin', 'admin', 'user'].includes(user?.role);
  const canReset = ['superadmin', 'admin'].includes(user?.role);

  useEffect(() => {
    setProposedFile(null);
    setApprovedFile(null);
    setMsg(null);
  }, [sucId, year]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleUpdate = async () => {
    if (!sucId) {
      return flash('warning', 'Please select a SUC first.');
    }
    if (!proposedFile && !approvedFile) {
      return flash('warning', 'Please select at least one PDF file.');
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('year', year);
      fd.append('sucName', sucName);
      if (proposedFile) fd.append('oldAgenda', proposedFile);
      if (approvedFile) fd.append('newAgenda', approvedFile);
      await uploadAgendaFiles(sucId, quarter, fd);
      setProposedFile(null);
      setApprovedFile(null);
      flash('success', 'Files updated successfully.');
      onRefresh();
    } catch (err) {
      flash('danger', err.response?.data?.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!sucId) {
      return flash('warning', 'Please select a SUC first.');
    }
    if (!window.confirm(`Reset ${quarter} Quarter e-Agenda file for this SUC?`)) return;
    setResetting(true);
    try {
      await resetAgenda(sucId, quarter, year);
      setProposedFile(null);
      setApprovedFile(null);
      flash('success', 'Quarter files reset.');
      onRefresh();
    } catch (err) {
      flash('danger', err.response?.data?.message || 'Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  const currentProposed = agendaDoc?.oldAgenda?.filename || null;
  const currentApproved = agendaDoc?.newAgenda?.filename || null;
  const proposedVersion = agendaDoc?.oldAgenda?.version || null;
  const approvedVersion = agendaDoc?.newAgenda?.version || null;
  const proposedHistory = agendaDoc?.oldAgendaHistory || [];
  const approvedHistory = agendaDoc?.newAgendaHistory || [];
  const proposedUploadedAt = agendaDoc?.oldAgenda?.uploadedAt;
  const approvedUploadedAt = agendaDoc?.newAgenda?.uploadedAt;
  const latestUpdatedAt = approvedUploadedAt || proposedUploadedAt;

  const handleView = (type, title, v = null) => {
    if (!agendaDoc?._id) return;
    const token = localStorage.getItem('token');
    const vParam = v !== null ? `&v=${v}` : '';
    const url = `/api/agendas/file/${agendaDoc._id}/${type}?token=${token}${vParam}`;
    onViewFile(url, v !== null ? `${title} (v${v})` : title);
  };

  return (
    <div className={`agenda-quarter-card${highlighted ? ' highlighted' : ''}`}>
      {/* Yellow header */}
      <div className="agenda-quarter-header">
        <span className="agenda-quarter-title">{quarter} Quarter</span>
        <div className="d-flex gap-2">
          <span className="agenda-badge">Proposed: {currentProposed ? 'available' : 'none'}</span>
          <span className="agenda-badge">Approved: {currentApproved ? 'available' : 'none'}</span>
        </div>
      </div>

      {/* White body */}
      <div className="agenda-quarter-body">
        <div className="agenda-current-row mb-2">
          <div className="row g-3 w-100">
            <div className="col-md-6">
              <span className="agenda-current-label">Proposed Agenda:</span>
              <div>
                {currentProposed ? (
                  <>
                    <button
                      className="agenda-file-link btn btn-link p-0"
                      onClick={() => handleView('old', `${quarter} Quarter — Proposed Agenda`)}
                    >
                      Proposed Agenda
                    </button>
                    {proposedVersion && (
                      <span className="badge bg-secondary ms-1" style={{ fontSize: '0.7rem' }}>v{proposedVersion}</span>
                    )}
                    {proposedHistory.length > 0 && (
                      <VersionDropdown
                        history={proposedHistory}
                        onSelect={(v) => handleView('old', `${quarter} Quarter — Proposed Agenda`, v)}
                      />
                    )}
                  </>
                ) : (
                  <span className="agenda-current-empty">Not uploaded</span>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <span className="agenda-current-label">Approved Agenda:</span>
              <div>
                {currentApproved ? (
                  <>
                    <button
                      className="agenda-file-link btn btn-link p-0"
                      onClick={() => handleView('new', `${quarter} Quarter — Approved Agenda`)}
                    >
                      Approved Agenda
                    </button>
                    {approvedVersion && (
                      <span className="badge bg-secondary ms-1" style={{ fontSize: '0.7rem' }}>v{approvedVersion}</span>
                    )}
                    {approvedHistory.length > 0 && (
                      <VersionDropdown
                        history={approvedHistory}
                        onSelect={(v) => handleView('new', `${quarter} Quarter — Approved Agenda`, v)}
                      />
                    )}
                  </>
                ) : (
                  <span className="agenda-current-empty">Not uploaded</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="agenda-current-row mb-2">
          <span className="agenda-current-label">
            Last updated: {latestUpdatedAt ? new Date(latestUpdatedAt).toLocaleString() : '—'}
          </span>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type} py-1 px-2 mb-2`} style={{ fontSize: '0.82rem' }}>
            {msg.text}
          </div>
        )}

        {canUpload && (
          <>
            <DropZone
              label={<>Proposed Agenda (PDF) <em>(Order of Business Meeting)</em></>}
              file={proposedFile}
              onFile={setProposedFile}
              disabled={!sucId || saving || resetting}
            />
            <DropZone
              label={<>Approved Agenda (PDF) <em>(with Action Taken Plan)</em></>}
              file={approvedFile}
              onFile={setApprovedFile}
              disabled={!sucId || saving || resetting}
            />

            <div className="d-flex gap-2 mt-2">
              <button
                className="btn agenda-btn-update flex-fill"
                onClick={handleUpdate}
                disabled={saving || resetting || !sucId}
              >
                {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                Update Files
              </button>
              {canReset && (
                <button
                  className="btn agenda-btn-reset flex-fill"
                  onClick={handleReset}
                  disabled={saving || resetting || !sucId}
                >
                  {resetting ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  Reset
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function RegularBoardMeeting({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const [year,       setYear]       = useState(CURRENT_YEAR);
  const [sucs,       setSucs]       = useState([]);
  const [selectedSuc, setSelectedSuc] = useState('');
  const [occFilter,  setOccFilter]  = useState('');
  const [agendas,    setAgendas]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [pdfModal,   setPdfModal]   = useState({ open: false, url: '', title: '' });
  const [highlightQuarter, setHighlightQuarter] = useState(null);
  const isUser = ['user', 'board_member'].includes(user?.role);

  const filteredSucs = occFilter ? sucs.filter((s) => s.occCode === occFilter) : sucs;

  const openPdf = (url, title) => setPdfModal({ open: true, url, title });
  const closePdf = () => setPdfModal({ open: false, url: '', title: '' });

  useEffect(() => {
    getSucs()
      .then((res) => {
        const list = res.data;
        setSucs(list);
        
        let targetSucId = '';
        if (state.sucAbbreviation) {
          const match = list.find((s) => s.abbreviation === state.sucAbbreviation);
          if (match) {
            targetSucId = match._id;
          }
        }
        
        if (!targetSucId && ['user', 'board_member'].includes(user?.role) && user?.sucAbbreviation) {
          const match = list.find((s) => s.abbreviation === user.sucAbbreviation);
          if (match) {
            targetSucId = match._id;
          }
        }
        
        if (targetSucId) {
          setSelectedSuc(targetSucId);
        }

        // Clear navigation state
        if (state.sucAbbreviation || state.year || state.quarter) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      })
      .catch(() => {});
  }, [state.sucAbbreviation]);

  useEffect(() => {
    if (state.year) {
      setYear(Number(state.year));
    }
    if (state.quarter) {
      setHighlightQuarter(state.quarter);
      const timer = setTimeout(() => {
        setHighlightQuarter(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state.year, state.quarter]);

  const fetchAgendas = async () => {
    if (!selectedSuc) return setAgendas([]);
    setLoading(true);
    try {
      const res = await getAgendas(selectedSuc, year);
      setAgendas(res.data);
    } catch {
      setAgendas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgendas(); }, [selectedSuc, year]);

  const getDoc = (quarter) => agendas.find((a) => a.quarter === quarter) || null;
  const selectedSucName = sucs.find((s) => s._id === selectedSuc)?.sucName || '';

  return (
    <div>
      {/* Hero banner */}
      <div className="agenda-hero mb-4">
        <h4 className="agenda-hero-title">USM BoardHub</h4>
        <p className="agenda-hero-desc">
          Efficiently manage and upload board proposal files through this platform.
          It provides authorized users with a secure, centralized system for organizing, tracking, and
          accessing official board agenda records, ensuring accuracy, transparency, and
          accountability under the leadership of {getLeaderLine(user)}.
        </p>
      </div>

      {/* Filters */}
      <div className="agenda-filters card mb-4">
        <div className="card-body d-flex flex-wrap gap-3 align-items-end">
          <div className="agenda-filter-group">
            <label className="form-label mb-1">Year</label>
            <select
              className="form-select agenda-select"
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setHighlightQuarter(null);
              }}
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {user?.role === 'superadmin' && (
            <div className="agenda-filter-group">
              <label className="form-label mb-1">CHED Official</label>
              <select
                className="form-select agenda-select"
                value={occFilter}
                onChange={(e) => {
                  setOccFilter(e.target.value);
                  setSelectedSuc('');
                  setHighlightQuarter(null);
                }}
              >
                <option value="">-- All Officials --</option>
                {OCC_OFFICIALS.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
          {isUser ? (
            <div className="agenda-filter-group flex-fill">
              <label className="form-label mb-1">SUC</label>
              <input
                className="form-control agenda-select"
                value={sucs.find((s) => s._id === selectedSuc)?.sucName || 'Loading...'}
                readOnly
              />
            </div>
          ) : (
            <div className="agenda-filter-group flex-fill">
              <label className="form-label mb-1">SUC Name</label>
              <select
                className="form-select agenda-select"
                value={selectedSuc}
                onChange={(e) => {
                  setSelectedSuc(e.target.value);
                  setHighlightQuarter(null);
                }}
              >
                <option value="">-- Select SUC --</option>
                {filteredSucs.map((s) => (
                  <option key={s._id} value={s._id}>{s.sucName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="agenda-page-title text-center mb-4">Regular Board Meeting Agenda</h2>

      {/* Quarter grid */}
      {!selectedSuc && (
        <div className="alert alert-warning py-2 px-3 mb-3" role="alert">
          Select a SUC to enable upload, update, and reset actions.
        </div>
      )}
      {loading && selectedSuc && (
        <div className="text-center text-muted mb-3">
          <span className="spinner-border spinner-border-sm text-primary me-2" />
          Loading agenda files...
        </div>
      )}
      <div className="agenda-quarters-grid">
        {QUARTERS.map((q) => (
          <QuarterCard
            key={q}
            quarter={q}
            agendaDoc={getDoc(q)}
            sucId={selectedSuc}
            sucName={selectedSucName}
            year={year}
            onRefresh={fetchAgendas}
            onViewFile={openPdf}
            user={user}
            highlighted={highlightQuarter === q}
          />
        ))}
      </div>

      {pdfModal.open && (
        <PdfViewer url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
      )}
    </div>
  );
}

export default RegularBoardMeeting;
