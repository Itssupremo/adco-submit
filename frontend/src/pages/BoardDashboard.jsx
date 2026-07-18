import { useEffect, useState } from 'react';
import { getSubmissions } from '../services/api';

function BoardDashboard() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    getSubmissions()
      .then((submissionsRes) => {
        setSubmissions(submissionsRes.data);
      })
      .catch(() => {});
  }, []);

  const pending = submissions.filter((item) => item.status === 'Pending' || item.status === 'Under Review').length;
  const approved = submissions.filter((item) => item.status === 'Approved').length;
  const returned = submissions.filter((item) => item.status === 'Returned').length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-end mb-4 border-bottom pb-3">
        <div>
          <h2 className="page-section-title mb-1">USM Board Dashboard</h2>
          <p className="page-section-sub mb-0 text-muted">Review council submissions, monitor pending documents, and act on board decisions.</p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {[
          { label: 'Pending Review', value: pending, color: 'warning', icon: 'bi-hourglass-split' },
          { label: 'Approved', value: approved, color: 'success', icon: 'bi-patch-check' },
          { label: 'Returned', value: returned, color: 'danger', icon: 'bi-arrow-counterclockwise' },
          { label: 'Recent Uploads', value: submissions.length, color: 'primary', icon: 'bi-cloud-arrow-up' },
        ].map((card) => (
          <div className="col-6 col-lg-3" key={card.label}>
            <div className={`card border-0 shadow-sm border-bottom border-4 border-${card.color} h-100`}>
              <div className="card-body d-flex justify-content-between align-items-center p-4">
                <div>
                  <h6 className="text-muted text-uppercase fw-semibold mb-2" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>{card.label}</h6>
                  <h3 className="mb-0 fw-bold">{card.value}</h3>
                </div>
                <div className={`text-${card.color} bg-${card.color} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                  <i className={`bi ${card.icon} fs-4`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-4 py-3 text-secondary" style={{ fontSize: '0.85rem' }}>COUNCIL</th>
                      <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>TITLE</th>
                      <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>SUBMITTED</th>
                      <th className="px-4 py-3 text-secondary text-center" style={{ fontSize: '0.85rem' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.slice(0, 8).map((item) => (
                      <tr key={item._id}>
                        <td className="px-4 fw-medium text-dark">{item.councilName}</td>
                        <td>{item.documentTitle}</td>
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
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-5 text-muted">
                          <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                          No recent submissions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoardDashboard;