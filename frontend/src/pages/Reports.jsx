import { useEffect, useState } from 'react';
import { exportSubmissionReport, getSubmissionReports } from '../services/api';

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function Reports() {
  const [status, setStatus] = useState('');
  const [data, setData] = useState({ summary: {}, records: [] });

  const load = () => getSubmissionReports(status ? { status } : {}).then((res) => setData(res.data)).catch(() => {});
  useEffect(() => { load(); }, [status]);

  const exportFile = async (format) => {
    const response = await exportSubmissionReport(status ? { status } : {}, format);
    if (format === 'print') {
      const html = await response.data.text();
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
      return;
    }
    downloadBlob(response.data, 'submission-report.xlsx');
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-end mb-4 border-bottom pb-3">
        <div>
          <h2 className="page-section-title mb-1">Reports Overview</h2>
          <p className="page-section-sub mb-0 text-muted">Monitor and export submission operational metrics.</p>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center bg-white border rounded px-3 py-1 shadow-sm">
            <span className="text-muted small fw-semibold me-2">Filter Status:</span>
            <select 
              className="form-select form-select-sm border-0 shadow-none bg-transparent fw-semibold" 
              style={{ width: '120px', cursor: 'pointer' }}
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Returned">Returned</option>
              <option value="Approved">Approved</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div className="vr d-none d-md-block mx-1"></div>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => exportFile('xlsx')}>
            <i className="bi bi-file-earmark-excel"></i> Export Excel
          </button>
          <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={() => exportFile('print')}>
            <i className="bi bi-printer"></i> Print
          </button>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {[
          { label: 'Total', value: data.summary.total || 0, color: 'primary', icon: 'bi-file-text' },
          { label: 'Pending', value: data.summary.pending || 0, color: 'warning', icon: 'bi-hourglass-split' },
          { label: 'Returned', value: data.summary.returned || 0, color: 'danger', icon: 'bi-arrow-return-left' },
          { label: 'Approved', value: data.summary.approved || 0, color: 'success', icon: 'bi-check-circle' },
          { label: 'Archived', value: data.summary.archived || 0, color: 'secondary', icon: 'bi-archive' },
        ].map((stat) => (
          <div className="col-6 col-lg" key={stat.label}>
            <div className={`card border-0 shadow-sm border-bottom border-4 border-${stat.color} h-100`}>
              <div className="card-body d-flex justify-content-between align-items-center p-4">
                <div>
                  <h6 className="text-muted text-uppercase fw-semibold mb-2" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>{stat.label}</h6>
                  <h3 className="mb-0 fw-bold">{stat.value}</h3>
                </div>
                <div className={`text-${stat.color} bg-${stat.color} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                  <i className={`bi ${stat.icon} fs-4`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3 text-secondary" style={{ fontSize: '0.85rem' }}>COUNCIL</th>
                  <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>TITLE</th>
                  <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>MEETING DATE</th>
                  <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>SUBMITTED</th>
                  <th className="px-4 py-3 text-secondary text-center" style={{ fontSize: '0.85rem' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data.records?.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 fw-medium text-dark">{item.councilName}</td>
                    <td>{item.documentTitle}</td>
                    <td>{item.meetingDate}</td>
                    <td>{item.submissionDate}</td>
                    <td className="px-4 text-center">
                      <span className={`badge rounded-pill fw-normal px-3 py-2 ${
                        item.status === 'Approved' ? 'bg-success bg-opacity-10 text-success' :
                        item.status === 'Returned' ? 'bg-danger bg-opacity-10 text-danger' :
                        item.status === 'Archived' ? 'bg-secondary bg-opacity-10 text-secondary' :
                        item.status === 'Under Review' ? 'bg-primary bg-opacity-10 text-primary' :
                        'bg-warning bg-opacity-10 text-warning-emphasis'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!data.records || data.records.length === 0) && (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                      No submission records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;