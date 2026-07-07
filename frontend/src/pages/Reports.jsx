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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-section-title mb-0">Reports</h2>
          <p className="page-section-sub mb-0">Filter submissions and export operational reports.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => exportFile('xlsx')}>Export Excel</button>
          <button className="btn btn-outline-secondary" onClick={() => exportFile('print')}>Print View</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body d-flex gap-3 align-items-end flex-wrap">
          <div>
            <label className="form-label mb-1">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Returned">Returned</option>
              <option value="Approved">Approved</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {Object.entries({
          Total: data.summary.total || 0,
          Pending: data.summary.pending || 0,
          Returned: data.summary.returned || 0,
          Approved: data.summary.approved || 0,
          Archived: data.summary.archived || 0,
        }).map(([label, value]) => (
          <div className="col-6 col-lg-2" key={label}><div className="card"><div className="card-body"><div className="small text-uppercase text-muted">{label}</div><div className="fs-4 fw-bold">{value}</div></div></div></div>
        ))}
      </div>

      <div className="card">
        <div className="card-header bg-primary"><h5 className="mb-0">Submission Records</h5></div>
        <div className="card-body table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead><tr><th>Council</th><th>Title</th><th>Meeting Date</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              {data.records?.map((item) => (
                <tr key={item._id}><td>{item.councilName}</td><td>{item.documentTitle}</td><td>{item.meetingDate}</td><td>{item.submissionDate}</td><td>{item.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reports;