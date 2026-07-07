import { useState, useRef } from 'react';

const formatDate = (val) => {
  if (!val) return '—';
  const parts = val.split('-');
  if (parts.length === 3) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const m = parseInt(parts[1], 10) - 1;
    if (m >= 0 && m < 12) {
      return `${months[m]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
    }
  }
  return val;
};

const ALL_COLUMNS = [
  { key: 'region', label: 'Region' },
  { key: 'sucName', label: 'SUC Name' },
  { key: 'president', label: 'President' },
  { key: 'boardSecretaryName', label: 'Board Secretary' },
  { key: 'boardSecretaryEmail', label: 'Board Sec Email' },
  { key: 'dateOfBoardMeeting', label: 'Date of Board Meeting' },
];

function SucTable({ sucs, onEdit, onDelete, onTransfer, showActions = false, isAdmin = false, search, onSearchChange, officialFilter, onOfficialFilterChange, officials }) {
  const printRef = useRef();
  const [showPrintOpts, setShowPrintOpts] = useState(false);
  const [printCols, setPrintCols] = useState(() => ALL_COLUMNS.map((c) => c.key));

  const togglePrintCol = (key) => {
    setPrintCols((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const handlePrint = () => {
    const table = printRef.current;
    if (!table) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>USM BoardHub</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>body{font-family:'Montserrat',sans-serif;padding:20px}
      .print-header{text-align:center;margin-bottom:20px}
      .print-header img{height:60px}
      .print-header h4{margin:8px 0 2px;font-weight:700}
      .print-header p{color:#666;font-size:0.85rem;margin:0}
      table{width:100%;font-size:0.78rem}
      th{background:#1a1f3d;color:#fff;padding:6px 8px;white-space:nowrap}
      td{padding:5px 8px;vertical-align:top}
      .text-muted{color:#888}small{font-size:0.75rem}
      @media print{.no-print{display:none}}
      </style></head><body>
      <div class="print-header">
        <img src="/ched-bp-logo.png" alt="CHED"/>
        <h4>Commission on Higher Education</h4>
        <p>USM BoardHub</p>
      </div>
      <table class="table table-bordered table-sm">
        <thead><tr><th>#</th>${printCols.map((k) => `<th>${ALL_COLUMNS.find((c) => c.key === k)?.label || k}</th>`).join('')}</tr></thead>
        <tbody>${sucs.map((suc, idx) => `<tr><td>${idx + 1}</td>${printCols.map((k) => {
          if (k === 'sucName') return `<td><strong>${suc.sucName}</strong>${suc.abbreviation ? ` <span class="text-muted">(${suc.abbreviation})</span>` : ''}${suc.address ? `<br/><small class="text-muted">${suc.address}</small>` : ''}</td>`;
          return `<td>${suc[k] || ''}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
    setShowPrintOpts(false);
  };

  // Visible columns for screen (no OCC, no Section)
  const screenCols = ALL_COLUMNS;

  return (
    <div>
      {/* Toolbar: search, filter, print */}
      {showActions && (
        <div className="d-flex flex-wrap gap-2 align-items-center p-3 pb-2">
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 260 }}
            placeholder="Search SUC, president, region..."
            value={search || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: 260 }}
            value={officialFilter || ''}
            onChange={(e) => onOfficialFilterChange && onOfficialFilterChange(e.target.value)}
          >
            <option value="">All CHED Officials</option>
            {(officials || []).map((o) => (
              <option key={o.code} value={o.code}>{o.name}</option>
            ))}
          </select>
          <div className="ms-auto position-relative">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowPrintOpts(!showPrintOpts)}>
              <i className="bi bi-printer me-1"></i>Print
            </button>
            {showPrintOpts && (
              <div className="position-absolute end-0 mt-1 p-3 bg-white border rounded shadow-sm" style={{ zIndex: 1050, minWidth: 220 }}>
                <h6 className="mb-2" style={{ fontSize: '0.82rem' }}>Select columns to print:</h6>
                {ALL_COLUMNS.map((col) => (
                  <div key={col.key} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`print-${col.key}`}
                      checked={printCols.includes(col.key)}
                      onChange={() => togglePrintCol(col.key)}
                    />
                    <label className="form-check-label small" htmlFor={`print-${col.key}`}>{col.label}</label>
                  </div>
                ))}
                <div className="d-flex gap-2 mt-2">
                  <button className="btn btn-sm btn-primary flex-grow-1" onClick={handlePrint}>
                    <i className="bi bi-printer me-1"></i>Print
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowPrintOpts(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="table-responsive" ref={printRef}>
        <table className="table table-bordered table-striped table-hover align-middle">
          <thead className="table-primary">
            <tr>
              <th>#</th>
              <th>Region</th>
              <th>SUC Name</th>
              <th>President</th>
              {showActions && (
                <>
                  <th>Board Sec Name</th>
                  <th>Board Sec Email</th>
                  <th>Date of Board Meeting</th>
                  <th>Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sucs.length === 0 ? (
              <tr>
                  <td colSpan={showActions ? 8 : 4} className="text-center text-muted">
                  No records found
                </td>
              </tr>
            ) : (
              sucs.map((suc, idx) => (
                <tr key={suc._id}>
                  <td>{idx + 1}</td>
                  <td>{suc.region}</td>
                  <td>
                    <strong>{suc.sucName}</strong>
                    {suc.abbreviation && <span className="text-muted ms-1">({suc.abbreviation})</span>}
                    {suc.address && <div className="text-muted small">{suc.address}</div>}
                  </td>
                  <td>{suc.president}</td>
                  {showActions && (
                    <>
                      <td className="small">{suc.boardSecretaryName}</td>
                      <td className="small">{suc.boardSecretaryEmail}</td>
                      <td className="small">{formatDate(suc.dateOfBoardMeeting)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          {onEdit && (
                            <button className="btn btn-sm btn-warning" title="Edit" onClick={() => onEdit(suc)}>
                              <i className="bi bi-pencil-square"></i>
                            </button>
                          )}
                          {isAdmin && onDelete && (
                            <button className="btn btn-sm btn-danger" title="Delete" onClick={() => onDelete(suc._id)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                          {isAdmin && onTransfer && (
                            <button className="btn btn-sm btn-info" title="Transfer" onClick={() => onTransfer(suc)}>
                              <i className="bi bi-arrow-left-right"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SucTable;
