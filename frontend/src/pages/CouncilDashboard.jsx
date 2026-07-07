import { useEffect, useState } from 'react';
import { getMyCurrentSubmission, getNotifications, getSubmissionFileUrl, getSubmissions } from '../services/api';

const fileExists = (file) => Boolean(file && (file.filename || file.s3Key));
const isPdfFile = (file) => {
  if (!file) return false;
  const name = String(file.filename || '').toLowerCase();
  if (name.endsWith('.pdf')) return true;
  if (name.endsWith('.doc') || name.endsWith('.docx')) return false;
  return file.contentType === 'application/pdf';
};

const getProposalTypeLabel = (submission) => submission?.proposalType || 'Not specified';

const getSubmissionVersions = (submission) => {
  const previous = Array.isArray(submission?.packetHistory) ? submission.packetHistory.map((item) => item.version) : [];
  const currentVersion = submission?.packetVersion || 1;
  return [...new Set([...previous, currentVersion])].sort((left, right) => left - right);
};

const getSubmissionDocuments = (submission) => {
  const files = submission?.files || {};
  const items = [];

  if (fileExists(files.executiveBriefPdf)) items.push({ label: 'Executive Brief PDF', key: 'executiveBriefPdf', file: files.executiveBriefPdf });
  if (fileExists(files.executiveBriefWord)) items.push({ label: 'Executive Brief Word', key: 'executiveBriefWord', file: files.executiveBriefWord });
  if (fileExists(files.proposalPdf)) items.push({ label: 'Proposal PDF', key: 'proposalPdf', file: files.proposalPdf });
  if (fileExists(files.proposalWord)) items.push({ label: 'Proposal Word', key: 'proposalWord', file: files.proposalWord });
  if (fileExists(files.presentationPdf)) items.push({ label: 'Presentation PDF', key: 'presentationPdf', file: files.presentationPdf });
  if (fileExists(files.forInformationProposalPdf)) items.push({ label: 'For Information Proposal PDF', key: 'forInformationProposalPdf', file: files.forInformationProposalPdf });
  if (fileExists(files.legalEndorsementPdf)) items.push({ label: 'Legal Endorsement', key: 'legalEndorsementPdf', file: files.legalEndorsementPdf });
  if (fileExists(files.vpafFanCertificationPdf)) items.push({ label: 'VPAF / FMS Certification', key: 'vpafFanCertificationPdf', file: files.vpafFanCertificationPdf });
  if (fileExists(files.vpaaAcademicCouncilPdf)) items.push({ label: 'VPAA / Administrative Council', key: 'vpaaAcademicCouncilPdf', file: files.vpaaAcademicCouncilPdf });
  if (fileExists(files.vprgesProductionCouncilPdf)) items.push({ label: 'VPRGES / Production Council', key: 'vprgesProductionCouncilPdf', file: files.vprgesProductionCouncilPdf });
  if (fileExists(files.vprdeUrdecPdf)) items.push({ label: 'VPRDE / URDEC', key: 'vprdeUrdecPdf', file: files.vprdeUrdecPdf });
  (files.supportingDocuments || []).forEach((file, index) => {
    if (fileExists(file)) items.push({ label: `Supporting Document ${index + 1}`, key: 'supportingDocuments', index, file });
  });

  return items;
};

const getSubmissionReviewItems = (submission) => {
  const checklist = submission?.reviewChecklist || {};
  return getSubmissionDocuments(submission).map((doc) => {
    const review = doc.key === 'supportingDocuments'
      ? checklist.supportingDocuments?.[doc.index] || {}
      : checklist[doc.key] || {};

    return {
      ...doc,
      checked: Boolean(review.checked),
      remarks: String(review.remarks || ''),
    };
  });
};

const hasReviewFeedback = (submission) => {
  if (!submission) return false;
  if (String(submission.remarks || '').trim()) return true;
  return getSubmissionReviewItems(submission).some((item) => item.checked || item.remarks);
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

function CouncilDashboard() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    Promise.all([getMyCurrentSubmission(), getSubmissions(), getNotifications()])
      .then(([currentRes, historyRes, notificationsRes]) => {
        setCurrent(currentRes.data || historyRes.data.find((item) => item.status === 'Returned' || item.status === 'Pending') || null);
        setHistory(historyRes.data);
        setNotifications(notificationsRes.data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const openSubmissionFile = (submission, item) => {
    const url = getSubmissionFileUrl(submission._id, item.key, { index: item.index });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderVersionBadges = (submission) => {
    const versions = getSubmissionVersions(submission);
    return (
      <div className="d-flex gap-2 flex-wrap mt-2">
        {versions.map((version) => (
          <span key={version} className={`badge ${version === (submission?.packetVersion || 1) ? 'text-bg-primary' : 'text-bg-light border'}`}>
            v{version}{version === (submission?.packetVersion || 1) ? ' current' : ''}
          </span>
        ))}
      </div>
    );
  };

  const renderDocumentButtons = (submission) => {
    const documents = getSubmissionDocuments(submission);
    if (documents.length === 0) return <span className="text-muted">No files uploaded.</span>;

    return (
      <div className="d-flex gap-2 flex-wrap mt-2">
        {documents.map((item) => (
          <button
            type="button"
            key={`${item.key}-${item.index ?? 'single'}`}
            className="btn btn-sm btn-outline-primary"
            onClick={() => openSubmissionFile(submission, item)}
          >
            <i className={`bi ${isPdfFile(item.file) ? 'bi-eye' : 'bi-box-arrow-up-right'}`} />
            {' '}
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="page-section-title mb-0">Administrative Council Dashboard</h2>
        <p className="page-section-sub mb-0">Track your current submission status and review board remarks.</p>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header bg-primary"><h5 className="mb-0">Current Submission Overview</h5></div>
            <div className="card-body">
              {!current ? (
                <div className="text-muted">No active submission yet. Use the Submit Proposal page to upload your proposal packet.</div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-6"><strong>College/Unit:</strong><div>{current.collegeUnit || current.councilName || '—'}</div></div>
                  <div className="col-md-6"><strong>Proposal Type:</strong><div>{getProposalTypeLabel(current)}</div></div>
                  <div className="col-md-8"><strong>Title:</strong><div>{current.documentTitle || '—'}</div></div>
                  <div className="col-md-4"><strong>Status:</strong><div>{current.status || '—'}</div></div>
                  <div className="col-12"><strong>Upload Versions:</strong>{renderVersionBadges(current)}</div>
                  <div className="col-12"><strong>Remarks:</strong><div>{current.remarks || 'No remarks'}</div></div>
                  <div className="col-12"><strong>Files:</strong>{renderDocumentButtons(current)}</div>
                  <div className="col-12">
                    <strong>Admin Review:</strong>
                    {hasReviewFeedback(current) ? (
                      <div className="mt-2 d-grid gap-2">
                        {getSubmissionReviewItems(current).map((item) => (
                          <div key={`${item.key}-${item.index ?? 'single'}`} className="border rounded-3 px-3 py-2 d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-semibold">{item.label}</div>
                              <div className="small text-muted">{item.remarks || 'No document remarks.'}</div>
                            </div>
                            <span className={`badge ${item.checked ? 'text-bg-success' : 'text-bg-secondary'}`}>{item.checked ? 'Checked' : 'Pending Review'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted mt-2">No admin review feedback yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">Submission History</h5></div>
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle mb-0">
                <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Submitted</th></tr></thead>
                <tbody>
                  {history.length === 0 ? <tr><td colSpan={4} className="text-center text-muted">No submissions yet</td></tr> : history.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div>{item.documentTitle}</div>
                        <div className="small text-muted">{item.collegeUnit || item.councilName || '—'}</div>
                      </td>
                      <td>{getProposalTypeLabel(item)}</td>
                      <td>{item.status}</td>
                      <td>{formatDateTime(item.submissionDate || item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-primary"><h5 className="mb-0">Notifications</h5></div>
            <div className="card-body">
              {notifications.length === 0 ? <div className="text-muted">No notifications.</div> : notifications.map((item) => (
                <div key={item._id} className="border-bottom pb-2 mb-2">
                  <div className="fw-semibold">{item.title}</div>
                  <div className="small text-muted">{item.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CouncilDashboard;