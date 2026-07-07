import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PdfViewer from '../components/PdfViewer';
import {
  approveSubmission,
  archiveSubmission,
  createSubmission,
  deleteSubmission,
  getSubmissionFileUrl,
  getSubmissions,
  replaceSubmission,
  returnSubmission,
  updateSubmissionReview,
} from '../services/api';

const PROPOSAL_TYPES = ['Academic', 'Research & Extension', 'Administrative', 'Finance', 'Projects', 'MOH/ MOU/ Deed of Donation/ Usufruct', 'For Information'];
const REVIEW_FIELDS = [
  'executiveBriefPdf',
  'executiveBriefWord',
  'proposalPdf',
  'proposalWord',
  'presentationPdf',
  'forInformationProposalPdf',
  'legalEndorsementPdf',
  'vpafFanCertificationPdf',
  'vpaaAcademicCouncilPdf',
  'vprgesProductionCouncilPdf',
  'vprdeUrdecPdf',
];

const createInitialForm = (collegeUnit = '') => ({
  collegeUnit,
  documentTitle: '',
  proposalType: 'Academic',
  executiveBriefPdf: null,
  executiveBriefWord: null,
  proposalPdf: null,
  proposalWord: null,
  presentationPdf: null,
  forInformationProposalPdf: null,
  supportingDocuments: [],
  legalEndorsementPdf: null,
  vpafFanCertificationPdf: null,
  vpaaAcademicCouncilPdf: null,
  vprgesProductionCouncilPdf: null,
  vprdeUrdecPdf: null,
});

const createFormFromSubmission = (submission) => ({
  collegeUnit: submission?.collegeUnit || submission?.councilName || '',
  documentTitle: submission?.documentTitle || '',
  proposalType: submission?.proposalType || 'Academic',
  executiveBriefPdf: null,
  executiveBriefWord: null,
  proposalPdf: null,
  proposalWord: null,
  presentationPdf: null,
  forInformationProposalPdf: null,
  supportingDocuments: [],
  legalEndorsementPdf: null,
  vpafFanCertificationPdf: null,
  vpaaAcademicCouncilPdf: null,
  vprgesProductionCouncilPdf: null,
  vprdeUrdecPdf: null,
});

const fileExists = (file) => Boolean(file && (file.filename || file.s3Key));
const isPdfFile = (file) => {
  if (!file) return false;
  const name = String(file.filename || '').toLowerCase();
  if (name.endsWith('.pdf')) return true;
  if (name.endsWith('.doc') || name.endsWith('.docx')) return false;
  return file.contentType === 'application/pdf';
};

const getProposalTypeLabel = (submission) => submission.proposalType;

const getSubmissionVersions = (submission) => {
  const previous = Array.isArray(submission?.packetHistory) ? submission.packetHistory.map((item) => item.version) : [];
  const currentVersion = submission?.packetVersion || 1;
  return [...new Set([...previous, currentVersion])].sort((left, right) => left - right);
};

const pickCurrentSubmission = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.find((item) => item.status === 'Returned')
    || items.find((item) => item.status === 'Pending')
    || items.find((item) => item.status !== 'Archived')
    || null;
};

const createReviewEntry = (value = {}) => ({
  checked: Boolean(value.checked),
  remarks: String(value.remarks || ''),
});

const getSubmissionDocuments = (submission) => {
  const files = submission.files || {};
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
      ? checklist.supportingDocuments?.[doc.index] || createReviewEntry()
      : checklist[doc.key] || createReviewEntry();

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

const isReviewChecklistComplete = (reviewChecklist = {}, files = {}) => {
  return getSubmissionDocuments({ files }).every((doc) => {
    const review = doc.key === 'supportingDocuments'
      ? reviewChecklist.supportingDocuments?.[doc.index]
      : reviewChecklist[doc.key];
    return Boolean(review?.checked);
  });
};

const createReviewDraft = (submission) => {
  const checklist = { supportingDocuments: [] };
  REVIEW_FIELDS.forEach((field) => {
    checklist[field] = createReviewEntry(submission?.reviewChecklist?.[field]);
  });
  const supportingCount = (submission?.files?.supportingDocuments || []).filter(fileExists).length;
  checklist.supportingDocuments = Array.from({ length: supportingCount }, (_, index) => createReviewEntry(submission?.reviewChecklist?.supportingDocuments?.[index]));
  return {
    remarks: String(submission?.remarks || ''),
    reviewChecklist: checklist,
  };
};

function FileInput({ label, accept, required = false, multiple = false, helper = '', currentFileName = '', preserveOnEmpty = false, onChange }) {
  return (
    <div>
      <label className="form-label mb-1">{label}{required ? ' *' : ''}</label>
      <input className="form-control" type="file" accept={accept} multiple={multiple} onChange={onChange} required={required} />
      {helper ? <div className="small text-muted mt-1">{helper}</div> : null}
      {currentFileName ? <div className="small text-muted mt-1">Current file: {currentFileName}</div> : null}
      {preserveOnEmpty ? <div className="small text-muted mt-1">Leave this empty to keep the current uploaded file.</div> : null}
    </div>
  );
}

function SubmissionManagement({ user, councilView = 'history' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [submissions, setSubmissions] = useState([]);
  const [filters, setFilters] = useState({ status: '' });
  const [form, setForm] = useState(createInitialForm(user?.councilName || ''));
  const [message, setMessage] = useState('');
  const [current, setCurrent] = useState(null);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [pdfModal, setPdfModal] = useState({ open: false, url: '', title: '' });
  const [reviewModal, setReviewModal] = useState({ open: false, mode: 'view', submission: null, remarks: '', reviewChecklist: { supportingDocuments: [] } });

  const load = () => {
    getSubmissions(filters)
      .then((res) => {
        setSubmissions(res.data);
        if (user.role === 'council') {
          setCurrent(pickCurrentSubmission(res.data));
        }
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [filters.status]);

  useEffect(() => {
    if (user.role !== 'council' || councilView !== 'submit') return;
    setForm(editingSubmission ? createFormFromSubmission(editingSubmission) : createInitialForm(user?.councilName || ''));
  }, [user, councilView, editingSubmission]);

  useEffect(() => {
    if (user.role !== 'council' || councilView !== 'submit') return;
    const editSubmissionId = location.state?.editSubmissionId;
    if (!editSubmissionId) return;

    const target = submissions.find((item) => item._id === editSubmissionId && item.status === 'Returned');
    if (target) {
      setEditingSubmission(target);
      setMessage('Editing returned submission. Upload only the files you want to replace.');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [user.role, councilView, location.state, location.pathname, navigate, submissions]);

  const isForInformation = form.proposalType === 'For Information';

  const setField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const beginEditReturnedSubmission = (submission) => {
    setEditingSubmission(submission);
    setMessage('Editing returned submission. Upload only the files you want to replace.');
  };

  const openReturnedSubmissionEditor = (submission) => {
    if (!submission || submission.status !== 'Returned') return;
    if (councilView === 'submit') {
      beginEditReturnedSubmission(submission);
      return;
    }
    navigate('/council/submit-proposal', { state: { editSubmissionId: submission._id } });
  };

  const cancelEditReturnedSubmission = () => {
    setEditingSubmission(null);
    setMessage('');
  };

  const submitCouncilForm = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append('collegeUnit', form.collegeUnit);
    payload.append('documentTitle', form.documentTitle);
    payload.append('proposalType', form.proposalType);

    [
      'executiveBriefPdf',
      'executiveBriefWord',
      'proposalPdf',
      'proposalWord',
      'presentationPdf',
      'forInformationProposalPdf',
      'legalEndorsementPdf',
      'vpafFanCertificationPdf',
      'vpaaAcademicCouncilPdf',
      'vprgesProductionCouncilPdf',
      'vprdeUrdecPdf',
    ].forEach((field) => {
      if (form[field]) payload.append(field, form[field]);
    });

    Array.from(form.supportingDocuments || []).forEach((file) => {
      payload.append('supportingDocuments', file);
    });

    try {
      if (editingSubmission) {
        await replaceSubmission(editingSubmission._id, payload);
        setMessage(`Returned submission updated successfully as v${(editingSubmission.packetVersion || 1) + 1}.`);
      } else {
        await createSubmission(payload);
        setMessage('Submission saved successfully as v1.');
      }
      setEditingSubmission(null);
      setForm(createInitialForm(user?.councilName || ''));
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save submission.');
    }
  };

  const boardActions = async (action, submission, options = {}) => {
    try {
      if (action === 'approve') {
        await approveSubmission(submission._id, {
          remarks: options.remarks,
          reviewChecklist: options.reviewChecklist,
        });
      }
      if (action === 'return') {
        const remarks = window.prompt('Enter remarks for the council:', submission.remarks || '');
        if (!remarks) return;
        await returnSubmission(submission._id, remarks);
      }
      if (action === 'archive') await archiveSubmission(submission._id);
      if (action === 'delete') {
        const confirmed = window.confirm(`Delete submission "${submission.documentTitle}"? This cannot be undone.`);
        if (!confirmed) return;
        await deleteSubmission(submission._id);
      }
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleReviewAction = async (action) => {
    if (!reviewModal.submission) return;
    const options = action === 'approve'
      ? {
          remarks: reviewModal.remarks,
          reviewChecklist: reviewModal.reviewChecklist,
        }
      : {};
    await boardActions(action, reviewModal.submission, options);
    closeReviewModal();
  };

  const renderVersionBadges = (submission) => (
    <div className="d-flex gap-2 flex-wrap mt-2">
      {getSubmissionVersions(submission).map((version) => (
        <span key={`${submission._id}-v${version}`} className={`badge ${version === (submission.packetVersion || 1) ? 'text-bg-primary' : 'text-bg-light'}`}>
          v{version}
        </span>
      ))}
    </div>
  );

  const openSubmissionFile = (submission, button) => {
    const url = getSubmissionFileUrl(submission._id, button.key, { index: button.index });
    if (isPdfFile(button.file)) {
      setPdfModal({ open: true, url, title: `${submission.documentTitle} - ${button.label}` });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const closePdfModal = () => setPdfModal({ open: false, url: '', title: '' });

  const openReviewModal = (submission, mode = 'view') => {
    const draft = createReviewDraft(submission);
    setReviewModal({
      open: true,
      mode,
      submission,
      remarks: draft.remarks,
      reviewChecklist: draft.reviewChecklist,
    });
  };

  const closeReviewModal = () => setReviewModal({ open: false, mode: 'view', submission: null, remarks: '', reviewChecklist: { supportingDocuments: [] } });

  const updateReviewEntry = (key, field, value, index = null) => {
    setReviewModal((prev) => {
      const nextChecklist = { ...prev.reviewChecklist };
      if (key === 'supportingDocuments') {
        const nextSupporting = [...(prev.reviewChecklist.supportingDocuments || [])];
        nextSupporting[index] = {
          ...(nextSupporting[index] || createReviewEntry()),
          [field]: value,
        };
        nextChecklist.supportingDocuments = nextSupporting;
      } else {
        nextChecklist[key] = {
          ...(prev.reviewChecklist[key] || createReviewEntry()),
          [field]: value,
        };
      }
      return { ...prev, reviewChecklist: nextChecklist };
    });
  };

  const saveReview = async () => {
    if (!reviewModal.submission) return;
    try {
      await updateSubmissionReview(reviewModal.submission._id, {
        remarks: reviewModal.remarks,
        reviewChecklist: reviewModal.reviewChecklist,
      });
      setMessage('Submission review saved successfully.');
      closeReviewModal();
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save submission review.');
    }
  };

  const renderDocumentButtons = (submission) => {
    const buttons = getSubmissionDocuments(submission).map((item) => ({
      label: item.label
        .replace('Executive Brief ', 'Brief ')
        .replace('Supporting Document', 'Support')
        .replace('For Information Proposal PDF', 'Proposal PDF')
        .replace('Legal Endorsement', 'Legal')
        .replace('VPAF / FMS Certification', 'VPAF/FMS')
        .replace(' / Administrative Council', '')
        .replace(' / Production Council', '')
        .replace(' / URDEC', ''),
      key: item.key,
      index: item.index,
      file: item.file,
    }));

    if (buttons.length === 0) return <span className="text-muted">No files</span>;

    return (
      <div className="d-flex gap-2 flex-wrap justify-content-end">
        {buttons.map((button) => (
          <button
            type="button"
            key={`${button.key}-${button.index ?? 'single'}`}
            className="btn btn-sm btn-outline-primary"
            onClick={() => openSubmissionFile(submission, button)}
          >
            <i className={`bi ${isPdfFile(button.file) ? 'bi-eye' : 'bi-box-arrow-up-right'}`} />
            {button.label}
          </button>
        ))}
      </div>
    );
  };

  const canApproveReview = reviewModal.submission
    ? isReviewChecklistComplete(reviewModal.reviewChecklist, reviewModal.submission.files || {})
    : false;

  return (
    <>
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="page-section-title mb-0">{user.role === 'council' ? (councilView === 'submit' ? 'Submit Proposal' : 'My Submission') : 'Submission Management'}</h2>
            <p className="page-section-sub mb-0">
              {user.role === 'council'
                ? 'Submit board proposal documents and track the current submission status.'
                : 'Review, return, approve, and archive council proposal packets.'}
            </p>
          </div>
        </div>

        {message ? <div className="alert alert-info">{message}</div> : null}

        {user.role === 'council' ? (
          <>
            {councilView === 'submit' ? (
              <div className="card">
                <div className="card-header bg-primary"><h5 className="mb-0">Submit Proposal Packet</h5></div>
                <div className="card-body">
                  {current?.status === 'Returned' && !editingSubmission ? (
                    <div className="alert alert-warning d-flex justify-content-between align-items-center gap-3 flex-wrap">
                      <div>
                        <div className="fw-semibold">A returned submission can be revised and re-uploaded.</div>
                        <div className="small">Current returned packet: {current.documentTitle} • v{current.packetVersion || 1}</div>
                      </div>
                      <button type="button" className="btn btn-warning" onClick={() => beginEditReturnedSubmission(current)}>Edit Returned Submission</button>
                    </div>
                  ) : null}

                  {editingSubmission ? (
                    <div className="alert alert-info d-flex justify-content-between align-items-center gap-3 flex-wrap">
                      <div>
                        <div className="fw-semibold">Revising returned submission</div>
                        <div className="small">This will update {editingSubmission.documentTitle} from v{editingSubmission.packetVersion || 1} to v{(editingSubmission.packetVersion || 1) + 1}.</div>
                      </div>
                      <button type="button" className="btn btn-outline-secondary" onClick={cancelEditReturnedSubmission}>Cancel Edit</button>
                    </div>
                  ) : null}

                  <form onSubmit={submitCouncilForm} className="d-grid gap-3">
                  <div>
                    <label className="form-label mb-1">College/Unit</label>
                    <input className="form-control" value={form.collegeUnit} readOnly />
                  </div>

                  <div>
                    <label className="form-label mb-1">Proposal Title / Subject *</label>
                    <input className="form-control" value={form.documentTitle} onChange={(e) => setField('documentTitle', e.target.value)} required />
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label mb-1">Proposal Type *</label>
                      <select className="form-select proposal-select" value={form.proposalType} onChange={(e) => setField('proposalType', e.target.value)} required>
                        {PROPOSAL_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>

                  {!isForInformation ? (
                    <>
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Executive Brief</h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <FileInput label="Executive Brief PDF" accept="application/pdf" required={!editingSubmission} helper="Upload the signed PDF copy." currentFileName={editingSubmission?.files?.executiveBriefPdf?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('executiveBriefPdf', e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-md-6">
                            <FileInput label="Executive Brief Word" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!editingSubmission} helper="Upload the editable Word copy." currentFileName={editingSubmission?.files?.executiveBriefWord?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('executiveBriefWord', e.target.files?.[0] || null)} />
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Proposal</h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <FileInput label="Proposal PDF" accept="application/pdf" required={!editingSubmission} helper="Upload the final PDF proposal." currentFileName={editingSubmission?.files?.proposalPdf?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('proposalPdf', e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-md-6">
                            <FileInput label="Proposal Word" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!editingSubmission} helper="Upload the editable Word proposal." currentFileName={editingSubmission?.files?.proposalWord?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('proposalWord', e.target.files?.[0] || null)} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-3 p-3">
                      <h6 className="mb-2">For Information Document <span className="text-danger">*</span></h6>
                      <div className="small text-muted mb-3">Upload at least one PDF: Presentation or Proposal.</div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <FileInput
                            label="Presentation PDF"
                            accept="application/pdf"
                            helper="Upload the presentation PDF if available."
                            currentFileName={editingSubmission?.files?.presentationPdf?.filename || ''}
                            preserveOnEmpty={Boolean(editingSubmission)}
                            onChange={(e) => setField('presentationPdf', e.target.files?.[0] || null)}
                          />
                        </div>
                        <div className="col-md-6">
                          <FileInput
                            label="Proposal PDF"
                            accept="application/pdf"
                            helper="Upload the proposal PDF if available. At least one of the two PDFs is required."
                            currentFileName={editingSubmission?.files?.forInformationProposalPdf?.filename || ''}
                            preserveOnEmpty={Boolean(editingSubmission)}
                            onChange={(e) => setField('forInformationProposalPdf', e.target.files?.[0] || null)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isForInformation ? (
                    <>
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Supporting Documents</h6>
                        <FileInput label="Supporting Documents" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple helper="Upload related attachments. You can select multiple files." preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('supportingDocuments', Array.from(e.target.files || []))} />
                      </div>

                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Endorsements</h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <FileInput label="Legal Endorsement" accept="application/pdf" required={!editingSubmission} currentFileName={editingSubmission?.files?.legalEndorsementPdf?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('legalEndorsementPdf', e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-md-6">
                            <FileInput label="VPAF / FMS Certification" accept="application/pdf" required={!editingSubmission} currentFileName={editingSubmission?.files?.vpafFanCertificationPdf?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('vpafFanCertificationPdf', e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-md-4">
                            <FileInput label="VPAA / Administrative Council" accept="application/pdf" currentFileName={editingSubmission?.files?.vpaaAcademicCouncilPdf?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('vpaaAcademicCouncilPdf', e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-md-4">
                            <FileInput label="VPRGES / Production Council" accept="application/pdf" currentFileName={editingSubmission?.files?.vprgesProductionCouncilPdf?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('vprgesProductionCouncilPdf', e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-md-4">
                            <FileInput label="VPRDE / URDEC" accept="application/pdf" currentFileName={editingSubmission?.files?.vprdeUrdecPdf?.filename || ''} preserveOnEmpty={Boolean(editingSubmission)} onChange={(e) => setField('vprdeUrdecPdf', e.target.files?.[0] || null)} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}

                  <button className="btn btn-primary" type="submit">{editingSubmission ? `Submit Revision v${(editingSubmission.packetVersion || 1) + 1}` : 'Submit Proposal Packet'}</button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="d-grid gap-4">
                <div className="card mb-4">
                  <div className="card-header bg-primary"><h5 className="mb-0">Current Submission Overview</h5></div>
                  <div className="card-body">
                    {!current ? (
                      <div className="text-muted">No active submission yet.</div>
                    ) : (
                      <div className="row g-3">
                        <div className="col-md-6"><strong>College/Unit:</strong><div>{current.collegeUnit}</div></div>
                        <div className="col-md-6"><strong>Proposal Type:</strong><div>{getProposalTypeLabel(current)}</div></div>
                        <div className="col-md-8"><strong>Title:</strong><div>{current.documentTitle}</div></div>
                        <div className="col-md-4"><strong>Status:</strong><div>{current.status}</div></div>
                        <div className="col-12"><strong>Upload Versions:</strong>{renderVersionBadges(current)}</div>
                        <div className="col-12"><strong>Remarks:</strong><div>{current.remarks || 'No remarks'}</div></div>
                        <div className="col-12"><strong>Files:</strong><div className="mt-2">{renderDocumentButtons(current)}</div></div>
                        {current.status === 'Returned' ? (
                          <div className="col-12">
                            <button type="button" className="btn btn-warning" onClick={() => openReturnedSubmissionEditor(current)}>Edit Returned Submission</button>
                          </div>
                        ) : null}
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
                              <div>
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openReviewModal(current, 'view')}>View Review Details</button>
                              </div>
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
                      <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Review</th><th>Files</th></tr></thead>
                      <tbody>
                        {submissions.length === 0 ? <tr><td colSpan={5} className="text-center text-muted">No submissions yet</td></tr> : submissions.map((submission) => (
                          <tr key={submission._id}>
                            <td>
                              <div>{submission.documentTitle}</div>
                              {renderVersionBadges(submission)}
                            </td>
                            <td>{getProposalTypeLabel(submission)}</td>
                            <td>{submission.status}</td>
                            <td>
                              {hasReviewFeedback(submission) ? (
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <span className="badge text-bg-success">Reviewed</span>
                                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openReviewModal(submission, 'view')}>View</button>
                                </div>
                              ) : (
                                <span className="text-muted">No feedback yet</span>
                              )}
                              {submission.status === 'Returned' ? (
                                <div className="mt-2">
                                  <button type="button" className="btn btn-sm btn-warning" onClick={() => openReturnedSubmissionEditor(submission)}>Edit</button>
                                </div>
                              ) : null}
                            </td>
                            <td className="text-end">{renderDocumentButtons(submission)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <div className="card-header bg-primary d-flex justify-content-between align-items-center">
              <h5 className="mb-0">All Submissions</h5>
              <select className="form-select form-select-sm" style={{ maxWidth: 180 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Returned">Returned</option>
                <option value="Approved">Approved</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle mb-0">
                <thead><tr><th>College/Unit</th><th>Title</th><th>Type</th><th>Status</th><th>Remarks</th><th>Files</th><th></th></tr></thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission._id}>
                      <td>{submission.collegeUnit || submission.councilName}</td>
                      <td>{submission.documentTitle}</td>
                      <td>{getProposalTypeLabel(submission)}</td>
                      <td>{submission.status}</td>
                      <td>{submission.remarks || '—'}</td>
                      <td>{getSubmissionDocuments(submission).length} document(s)</td>
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end flex-wrap">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openReviewModal(submission, 'edit')}>Edit Review</button>
                          {['board', 'superadmin'].includes(user.role) ? <button className="btn btn-sm btn-outline-danger" onClick={() => boardActions('delete', submission)}>Delete</button> : null}
                          {user.role === 'superadmin' && submission.status === 'Approved' ? <button className="btn btn-sm btn-dark" onClick={() => boardActions('archive', submission)}>Archive</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {reviewModal.open && reviewModal.submission ? (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(3px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <div>
                  <h5 className="modal-title mb-1">{reviewModal.mode === 'edit' ? 'Edit Submission Review' : 'View Submission'}</h5>
                  <div className="small opacity-75">{reviewModal.submission.documentTitle}</div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={closeReviewModal} />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-4"><strong>College/Unit:</strong><div>{reviewModal.submission.collegeUnit || reviewModal.submission.councilName}</div></div>
                  <div className="col-md-4"><strong>Proposal Type:</strong><div>{getProposalTypeLabel(reviewModal.submission)}</div></div>
                  <div className="col-md-4"><strong>Status:</strong><div>{reviewModal.submission.status}</div></div>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th style={{ width: 160 }}>File</th>
                        <th style={{ width: 120 }}>Checked</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSubmissionDocuments(reviewModal.submission).map((doc) => {
                        const reviewItem = doc.key === 'supportingDocuments'
                          ? reviewModal.reviewChecklist.supportingDocuments?.[doc.index] || createReviewEntry()
                          : reviewModal.reviewChecklist[doc.key] || createReviewEntry();
                        const readOnly = reviewModal.mode !== 'edit';

                        return (
                          <tr key={`${doc.key}-${doc.index ?? 'single'}`}>
                            <td>{doc.label}</td>
                            <td>
                              <div className="d-flex gap-2 flex-wrap">
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openSubmissionFile(reviewModal.submission, doc)}>
                                  <i className={`bi ${isPdfFile(doc.file) ? 'bi-eye' : 'bi-box-arrow-up-right'}`} />
                                  {isPdfFile(doc.file) ? 'View' : 'Open'}
                                </button>
                              </div>
                            </td>
                            <td>
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={Boolean(reviewItem.checked)}
                                  disabled={readOnly}
                                  onChange={(e) => updateReviewEntry(doc.key, 'checked', e.target.checked, doc.index)}
                                />
                              </div>
                            </td>
                            <td>
                              <textarea
                                className="form-control"
                                rows="2"
                                value={reviewItem.remarks || ''}
                                disabled={readOnly}
                                placeholder="Add remarks for this document"
                                onChange={(e) => updateReviewEntry(doc.key, 'remarks', e.target.value, doc.index)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <label className="form-label">General Remarks</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={reviewModal.remarks}
                    disabled={reviewModal.mode !== 'edit'}
                    placeholder="Add overall remarks for this submission"
                    onChange={(e) => setReviewModal((prev) => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeReviewModal}>Close</button>
                {reviewModal.mode === 'edit' ? <button type="button" className="btn btn-primary" onClick={saveReview}>Save Review</button> : null}
                {reviewModal.mode === 'edit' && ['board', 'superadmin'].includes(user.role) && reviewModal.submission?.status !== 'Approved' && reviewModal.submission?.status !== 'Archived' ? (
                  <button type="button" className="btn btn-success" onClick={() => handleReviewAction('approve')} disabled={!canApproveReview} title={canApproveReview ? 'Approve this submission' : 'Check every uploaded document before approving'}>Approve</button>
                ) : null}
                {reviewModal.mode === 'edit' && ['board', 'superadmin'].includes(user.role) && reviewModal.submission?.status !== 'Archived' ? (
                  <button type="button" className="btn btn-warning" onClick={() => handleReviewAction('return')}>Return</button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {pdfModal.open ? <PdfViewer url={pdfModal.url} title={pdfModal.title} onClose={closePdfModal} /> : null}
    </>
  );
}

export default SubmissionManagement;