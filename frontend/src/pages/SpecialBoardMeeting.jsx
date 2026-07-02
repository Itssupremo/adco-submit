import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSucs, getDocs, uploadDoc, resetDoc } from '../services/api';
import PdfViewer from '../components/PdfViewer';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const SLOTS = [
  { slot: '1st',         title: '1st Special Board Meeting',          currentLabel: 'Current 1st Special Board Meeting:',          fileLabel: '1st Special Board Meeting (PDF)' },
  { slot: '1st-minutes', title: 'Minutes of 1st Special Board Meeting', currentLabel: 'Current Minutes of 1st Special Board Meeting:', fileLabel: 'Minutes of 1st Special Board Meeting (PDF)' },
  { slot: '2nd',         title: '2nd Special Board Meeting',          currentLabel: 'Current 2nd Special Board Meeting:',          fileLabel: '2nd Special Board Meeting (PDF)' },
  { slot: '2nd-minutes', title: 'Minutes of 2nd Special Board Meeting', currentLabel: 'Current Minutes of 2nd Special Board Meeting:', fileLabel: 'Minutes of 2nd Special Board Meeting (PDF)' },
];

const getLeaderLine = (user) => {
  if (!user) return 'the Commission on Higher Education';
  if (user.role === 'admin')
    return `${user.occCode === 'OCSCA' ? 'Chairperson' : 'Commissioner'} ${user.fullname}`;
  if (user.role === 'superadmin') return `Administrator ${user.fullname}`;
  return user.fullname;
};

// ── Version history dropdown ──────────────────────────────────────────────────
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
            background: '#fff', border: '1px solid #dee2e6', borderRadius: '4px',
            minWidth: '220px', padding: '4px 0', margin: 0, listStyle: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
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

// ── Single meeting card ───────────────────────────────────────────────────────
function MeetingCard({ slotInfo, doc, sucId, sucName, year, onRefresh, onViewFile, user, highlighted }) {
  const [file,      setFile]      = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg,       setMsg]       = useState(null);

  const canUpload = ['superadmin', 'admin', 'user'].includes(user?.role);
  const canReset = ['superadmin', 'admin'].includes(user?.role);

  useEffect(() => { setFile(null); setMsg(null); }, [sucId, year]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleUpdate = async () => {
    if (!sucId) return flash('warning', 'Please select a SUC first.');
    if (!file) return flash('warning', 'Please select a PDF file.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('year', year);
      fd.append('sucName', sucName);
      fd.append('file', file);
      await uploadDoc(sucId, 'special', slotInfo.slot, fd);
      setFile(null);
      flash('success', 'File updated successfully.');
      onRefresh();
    } catch (err) {
      flash('danger', err.response?.data?.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!sucId) return flash('warning', 'Please select a SUC first.');
    if (!window.confirm(`Reset "${slotInfo.title}" file for this SUC?`)) return;
    setResetting(true);
    try {
      await resetDoc(sucId, 'special', slotInfo.slot, year);
      setFile(null);
      flash('success', 'File reset.');
      onRefresh();
    } catch (err) {
      flash('danger', err.response?.data?.message || 'Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  const currentFilename = doc?.file?.filename || null;
  const currentVersion  = doc?.file?.version  || null;
  const fileHistory     = doc?.fileHistory     || [];

  const openFile = (v = null) => {
    if (!doc?._id) return;
    const token = localStorage.getItem('token');
    const vParam = v !== null ? `&v=${v}` : '';
    const url = `/api/documents/file/${doc._id}?token=${token}${vParam}`;
    onViewFile(url, v !== null ? `${slotInfo.title} (v${v})` : slotInfo.title);
  };

  return (
    <div className={`agenda-quarter-card${highlighted ? ' highlighted' : ''}`}>
      <div className="agenda-quarter-header agenda-quarter-header--blue">
        <span className="agenda-quarter-title" style={{ color: '#fff' }}>{slotInfo.title}</span>
        <span className="agenda-badge">
          File: {currentFilename ? currentFilename.replace(/\.[^.]+$/, '').slice(0, 18) : 'none'}
        </span>
      </div>

      <div className="agenda-quarter-body">
        <div className="agenda-current-row">
          <div>
            <span className="agenda-current-label">{slotInfo.currentLabel}</span>
            {currentFilename ? (
              <>
                <button className="agenda-file-link btn btn-link p-0 ms-1" onClick={() => openFile()}>
                  {currentFilename}
                </button>
                {currentVersion && (
                  <span className="badge bg-secondary ms-1" style={{ fontSize: '0.7rem' }}>v{currentVersion}</span>
                )}
                {fileHistory.length > 0 && (
                  <VersionDropdown
                    history={fileHistory}
                    onSelect={(v) => openFile(v)}
                  />
                )}
              </>
            ) : (
              <span className="agenda-current-empty ms-1">—</span>
            )}
          </div>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type} py-1 px-2 mb-2`} style={{ fontSize: '0.82rem' }}>
            {msg.text}
          </div>
        )}

        {canUpload && (
          <>
            <DropZone
              label={slotInfo.fileLabel}
              file={file}
              onFile={setFile}
              disabled={!sucId || saving || resetting}
            />

            <div className="d-flex gap-2 mt-2">
              <button className="btn agenda-btn-update flex-fill" onClick={handleUpdate} disabled={saving || resetting || !sucId}>
                {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                Update File
              </button>
              {canReset && (
                <button className="btn agenda-btn-reset flex-fill" onClick={handleReset} disabled={saving || resetting || !sucId}>
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

// ── Main page ─────────────────────────────────────────────────────────────────
const OCC_OFFICIALS = [
  { code: 'OCSCA', label: 'Chairperson Shirley C. Agrupis' },
  { code: 'OCDRA', label: 'Commissioner Desiderio R. Apag III' },
  { code: 'OCRPA', label: 'Commissioner Ricmar P. Aquino' },
  { code: 'OCMQM', label: 'Commissioner Myrna Q. Mallari' },
  { code: 'OCMAO', label: 'Commissioner Michelle Aguilar-Ong' },
];

function SpecialBoardMeeting({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const [year,        setYear]        = useState(CURRENT_YEAR);
  const [sucs,        setSucs]        = useState([]);
  const [selectedSuc, setSelectedSuc] = useState('');
  const [occFilter,   setOccFilter]   = useState('');
  const [docs,        setDocs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [pdfModal,    setPdfModal]    = useState({ open: false, url: '', title: '' });
  const [highlightSlot, setHighlightSlot] = useState(null);
  const isUser = ['user', 'board_member'].includes(user?.role);

  const filteredSucs = occFilter ? sucs.filter((s) => s.occCode === occFilter) : sucs;

  const openPdf  = (url, title) => setPdfModal({ open: true, url, title });
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
        if (state.sucAbbreviation || state.year || state.slot) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      })
      .catch(() => {});
  }, [state.sucAbbreviation]);

  useEffect(() => {
    if (state.year) {
      setYear(Number(state.year));
    }
    if (state.slot) {
      setHighlightSlot(state.slot);
      const timer = setTimeout(() => {
        setHighlightSlot(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state.year, state.slot]);

  const fetchDocs = async () => {
    if (!selectedSuc) return setDocs([]);
    setLoading(true);
    try {
      const res = await getDocs(selectedSuc, year, 'special');
      setDocs(res.data);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [selectedSuc, year]);

  const getDoc = (slot) => docs.find((d) => d.slot === slot) || null;
  const selectedSucName = sucs.find((s) => s._id === selectedSuc)?.sucName || '';

  return (
    <div>
      <div className="agenda-hero mb-4">
        <h4 className="agenda-hero-title">E-Agenda System</h4>
        <p className="agenda-hero-desc">
          Efficiently manage and upload the SUC Order of Business e-Management through this platform.
          It provides authorized users with a secure, centralized system for organizing, tracking, and
          accessing official SUC meeting agenda items, ensuring accuracy, transparency, and
          accountability under the leadership of {getLeaderLine(user)}.
        </p>
      </div>

      <div className="agenda-filters card mb-4">
        <div className="card-body d-flex flex-wrap gap-3 align-items-end">
          <div className="agenda-filter-group">
            <label className="form-label mb-1">Year</label>
            <select
              className="form-select agenda-select"
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setHighlightSlot(null);
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
                  setHighlightSlot(null);
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
                  setHighlightSlot(null);
                }}
              >
                <option value="">-- Select SUC --</option>
                {filteredSucs.map((s) => <option key={s._id} value={s._id}>{s.sucName}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <h2 className="agenda-page-title text-center mb-4">Special Board Meeting</h2>

      {!selectedSuc && (
        <div className="alert alert-warning py-2 px-3 mb-3" role="alert">
          Select a SUC to enable upload, update, and reset actions.
        </div>
      )}
      {loading && selectedSuc && (
        <div className="text-center text-muted mb-3">
          <span className="spinner-border spinner-border-sm text-primary me-2" />
          Loading special board meeting files...
        </div>
      )}
      <div className="agenda-quarters-grid">
        {SLOTS.map((slotInfo) => (
          <MeetingCard
            key={slotInfo.slot}
            slotInfo={slotInfo}
            doc={getDoc(slotInfo.slot)}
            sucId={selectedSuc}
            sucName={selectedSucName}
            year={year}
            onRefresh={fetchDocs}
            onViewFile={openPdf}
            user={user}
            highlighted={highlightSlot === slotInfo.slot}
          />
        ))}
      </div>

      {pdfModal.open && (
        <PdfViewer url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
      )}
    </div>
  );
}

export default SpecialBoardMeeting;
