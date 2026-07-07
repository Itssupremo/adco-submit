import { useEffect, useRef, useState } from 'react';
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

const PROPOSAL_TYPES = [
  'Academic',
  'Research & Extension',
  'Administrative',
  'Finance',
  'Projects',
  'Production',
  'Usufruct',
  'Deed of Donation',
  'MOA/MOU (Academic)',
  'MOA/MOU (Research, Development, and Extension)',
  'MOA/MOU (Finance)',
  'MOA/MOU (Administrative)',
];

const IAS_ENDORSEMENT_OPTIONS = [
  'for Capital Outlay Php 15 Million and below',
  'for MOOE Php 5 Million and below',
];

const SINGLE_FIELDS = [
  'executiveBriefPdf',
  'executiveBriefWord',
  'proposalPdf',
  'proposalWord',
  'summaryMatrixPdf',
  'copyOfMoaMouPdf',
  'copyOfUsufructPdf',
  'copyOfDeedOfDonationPdf',
  'legalEndorsementPdf',
];

const MULTI_FIELDS = [
  'supportingDocuments',
  'vpafFanCertificationPdfs',
  'vpaaAdministrativeCouncilPdfs',
  'vprgesProductionCouncilPdfs',
  'vprdeUrdecPdfs',
  'officeOfPresidentPdfs',
  'iasEndorsementPdfs',
];

const LEGACY_ARRAY_COMPATIBILITY = {
  vpafFanCertificationPdfs: 'vpafFanCertificationPdf',
  vpaaAdministrativeCouncilPdfs: 'vpaaAcademicCouncilPdf',
  vprgesProductionCouncilPdfs: 'vprgesProductionCouncilPdf',
  vprdeUrdecPdfs: 'vprdeUrdecPdf',
};

const FILE_LABELS = {
  executiveBriefPdf: 'Executive Brief PDF',
  executiveBriefWord: 'Executive Brief Word',
  proposalPdf: 'Proposal PDF',
  proposalWord: 'Proposal Word',
  summaryMatrixPdf: 'Summary Matrix',
  copyOfMoaMouPdf: 'Copy of MOA/MOU',
  copyOfUsufructPdf: 'Copy of Usufruct',
  copyOfDeedOfDonationPdf: 'Copy of Deed of Donation',
  legalEndorsementPdf: 'Legal Endorsement',
  supportingDocuments: 'Supporting Document',
  vpafFanCertificationPdfs: 'VPAF / FMS Certification',
  vpaaAdministrativeCouncilPdfs: 'VPAA / Administrative Council',
  vprgesProductionCouncilPdfs: 'VPRGES / Production Council',
  vprdeUrdecPdfs: 'VPRDE / URDEC',
  officeOfPresidentPdfs: 'Office of the President',
  iasEndorsementPdfs: 'IAS Endorsement',
};

const PROPOSAL_RULES = {
  Academic: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vpaaAdministrativeCouncilPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vpaaAdministrativeCouncilPdfs'],
  },
  'Research & Extension': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vprdeUrdecPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vprdeUrdecPdfs'],
  },
  Administrative: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vpafFanCertificationPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vpafFanCertificationPdfs'],
  },
  Finance: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vpafFanCertificationPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vpafFanCertificationPdfs'],
  },
  Projects: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord'],
    visibleMulti: ['supportingDocuments', 'vpafFanCertificationPdfs', 'iasEndorsementPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord'],
    requiredMulti: ['supportingDocuments', 'vpafFanCertificationPdfs', 'iasEndorsementPdfs'],
    requireIasCategory: true,
  },
  Production: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vprgesProductionCouncilPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vprgesProductionCouncilPdfs'],
  },
  Usufruct: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfUsufructPdf', 'legalEndorsementPdf'],
    visibleMulti: [],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfUsufructPdf', 'legalEndorsementPdf'],
    requiredMulti: [],
  },
  'Deed of Donation': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfDeedOfDonationPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfDeedOfDonationPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs'],
  },
  'MOA/MOU (Academic)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs', 'vpaaAdministrativeCouncilPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs', 'vpaaAdministrativeCouncilPdfs'],
  },
  'MOA/MOU (Research, Development, and Extension)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs', 'vprdeUrdecPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs', 'vprdeUrdecPdfs'],
  },
  'MOA/MOU (Finance)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs'],
  },
  'MOA/MOU (Administrative)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs'],
  },
};

const createInitialForm = (collegeUnit = '') => ({
  collegeUnit,
  documentTitle: '',
  proposalType: 'Academic',
  iasEndorsementCategory: '',
  executiveBriefPdf: null,
  executiveBriefWord: null,
  proposalPdf: null,
  proposalWord: null,
  summaryMatrixPdf: null,
  copyOfMoaMouPdf: null,
  copyOfUsufructPdf: null,
  copyOfDeedOfDonationPdf: null,
  legalEndorsementPdf: null,
  supportingDocuments: [],
  vpafFanCertificationPdfs: [],
  vpaaAdministrativeCouncilPdfs: [],
  vprgesProductionCouncilPdfs: [],
  vprdeUrdecPdfs: [],
  officeOfPresidentPdfs: [],
  iasEndorsementPdfs: [],
});

const createFormFromSubmission = (submission) => ({
  ...createInitialForm(submission?.collegeUnit || submission?.councilName || ''),
  documentTitle: submission?.documentTitle || '',
  proposalType: submission?.proposalType || 'Academic',
  iasEndorsementCategory: submission?.iasEndorsementCategory || '',
});

const fileExists = (file) => Boolean(file && (file.filename || file.s3Key));
const getProposalTypeLabel = (submission) => submission.proposalType;
const getProposalRule = (proposalType = '') => PROPOSAL_RULES[proposalType] || PROPOSAL_RULES.Academic;

const isPdfFile = (file) => {
  if (!file) return false;
  const name = String(file.filename || '').toLowerCase();
  if (name.endsWith('.pdf')) return true;
  if (name.endsWith('.doc') || name.endsWith('.docx')) return false;
  return file.contentType === 'application/pdf';
};

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

const getArrayFiles = (files = {}, key) => {
  if (Array.isArray(files[key]) && files[key].length > 0) return files[key].filter(fileExists);
  const legacyKey = LEGACY_ARRAY_COMPATIBILITY[key];
  return legacyKey && fileExists(files[legacyKey]) ? [files[legacyKey]] : [];
};

const getSubmissionDocuments = (submission) => {
  const files = submission?.files || {};
  const items = [];

  SINGLE_FIELDS.forEach((field) => {
    if (fileExists(files[field])) {
      items.push({ label: FILE_LABELS[field], key: field, file: files[field] });
    }
  });

  MULTI_FIELDS.forEach((field) => {
    getArrayFiles(files, field).forEach((file, index) => {
      items.push({
        label: `${FILE_LABELS[field]} ${index + 1}`,
        key: field,
        index,
        file,
      });
    });
  });

  return items;
};

const getReviewEntryValue = (checklist, key, index = null) => {
  if (MULTI_FIELDS.includes(key)) {
    return checklist?.[key]?.[index] || createReviewEntry();
  }
  return checklist?.[key] || createReviewEntry();
};

const createEmptyReviewChecklist = () => {
  const checklist = {};
  SINGLE_FIELDS.forEach((field) => {
    checklist[field] = createReviewEntry();
  });
  MULTI_FIELDS.forEach((field) => {
    checklist[field] = [];
  });
  return checklist;
};

const getSubmissionReviewItems = (submission) => {
  const checklist = submission?.reviewChecklist || {};
  return getSubmissionDocuments(submission).map((doc) => {
    const review = getReviewEntryValue(checklist, doc.key, doc.index);
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
  return getSubmissionDocuments({ files }).every((doc) => Boolean(getReviewEntryValue(reviewChecklist, doc.key, doc.index)?.checked));
};

const createReviewDraft = (submission) => {
  const reviewChecklist = createEmptyReviewChecklist();
  SINGLE_FIELDS.forEach((field) => {
    reviewChecklist[field] = createReviewEntry(submission?.reviewChecklist?.[field]);
  });
  MULTI_FIELDS.forEach((field) => {
    const fileCount = getArrayFiles(submission?.files || {}, field).length;
    reviewChecklist[field] = Array.from({ length: fileCount }, (_, index) => createReviewEntry(submission?.reviewChecklist?.[field]?.[index]));
  });
  return {
    remarks: String(submission?.remarks || ''),
    reviewChecklist,
  };
};

function FileInput({
  label,
  accept,
  required = false,
  multiple = false,
  helper = '',
  currentFileName = '',
  currentFileNames = [],
  selectedFileNames = [],
  preserveOnEmpty = false,
  onChange,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const displayNames = selectedFileNames.length > 0
    ? selectedFileNames
    : (multiple ? currentFileNames : (currentFileName ? [currentFileName] : []));

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    onChange(files, multiple ? files : files[0]);
  };

  return (
    <div className="submission-file-input">
      <label className="form-label mb-1">{label}{required ? ' *' : ''}</label>
      <div
        className={`agenda-dropzone${dragging ? ' dragging' : ''}${displayNames.length > 0 ? ' has-file' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {displayNames.length > 0 ? (
          <span className="agenda-dropzone-file">
            <i className="bi bi-file-earmark-arrow-up me-1" />
            {multiple ? displayNames.join(', ') : displayNames[0]}
          </span>
        ) : (
          <span className="agenda-dropzone-hint">
            <i className="bi bi-upload me-1" />
            Drag & drop {accept.includes('pdf') && !accept.includes('doc') ? 'PDF' : 'file'} here or click to browse
          </span>
        )}
        <input
          ref={inputRef}
          className="d-none"
          type="file"
          accept={accept}
          multiple={multiple}
          required={required && displayNames.length === 0}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {helper ? <div className="small text-muted mt-1">{helper}</div> : null}
      {!multiple && currentFileName ? <div className="small text-muted mt-1">Current file: {currentFileName}</div> : null}
      {multiple && currentFileNames.length > 0 ? <div className="small text-muted mt-1">Current files: {currentFileNames.join(', ')}</div> : null}
      {preserveOnEmpty ? <div className="small text-muted mt-1">Leave this empty to keep the current uploaded file(s).</div> : null}
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
  const [reviewModal, setReviewModal] = useState({ open: false, mode: 'view', submission: null, remarks: '', reviewChecklist: createEmptyReviewChecklist() });
  const [submitState, setSubmitState] = useState({ loading: false, successOpen: false, successMessage: '' });

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

  const proposalRule = getProposalRule(form.proposalType);

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

  const resetCouncilForm = () => {
    setMessage('');
    setForm(editingSubmission ? createFormFromSubmission(editingSubmission) : createInitialForm(user?.councilName || ''));
  };

  const getSelectedFileNames = (field) => {
    const value = form[field];
    if (Array.isArray(value)) return value.map((file) => file?.name).filter(Boolean);
    return value?.name ? [value.name] : [];
  };

  const submitCouncilForm = async (e) => {
    e.preventDefault();
    setSubmitState((prev) => ({ ...prev, loading: true, successOpen: false, successMessage: '' }));
    const payload = new FormData();
    payload.append('collegeUnit', form.collegeUnit);
    payload.append('documentTitle', form.documentTitle);
    payload.append('proposalType', form.proposalType);
    payload.append('iasEndorsementCategory', form.iasEndorsementCategory || '');

    SINGLE_FIELDS.forEach((field) => {
      if (form[field]) payload.append(field, form[field]);
    });

    MULTI_FIELDS.forEach((field) => {
      Array.from(form[field] || []).forEach((file) => {
        payload.append(field, file);
      });
    });

    try {
      if (editingSubmission) {
        await replaceSubmission(editingSubmission._id, payload);
        setMessage(`Returned submission updated successfully as v${(editingSubmission.packetVersion || 1) + 1}.`);
        setSubmitState({ loading: false, successOpen: true, successMessage: `Returned submission updated successfully as v${(editingSubmission.packetVersion || 1) + 1}.` });
      } else {
        await createSubmission(payload);
        setMessage('Submission saved successfully as v1.');
        setSubmitState({ loading: false, successOpen: true, successMessage: 'Proposal submitted successfully.' });
      }
      setEditingSubmission(null);
      setForm(createInitialForm(user?.councilName || ''));
      load();
    } catch (err) {
      setSubmitState((prev) => ({ ...prev, loading: false }));
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

  const closeReviewModal = () => setReviewModal({ open: false, mode: 'view', submission: null, remarks: '', reviewChecklist: createEmptyReviewChecklist() });

  const updateReviewEntry = (key, field, value, index = null) => {
    setReviewModal((prev) => {
      const nextChecklist = { ...prev.reviewChecklist };
      if (MULTI_FIELDS.includes(key)) {
        const nextItems = [...(prev.reviewChecklist[key] || [])];
        nextItems[index] = {
          ...(nextItems[index] || createReviewEntry()),
          [field]: value,
        };
        nextChecklist[key] = nextItems;
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

                  <>
                    {proposalRule.requireIasCategory ? (
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">IAS Endorsement Category</h6>
                        <select className="form-select" value={form.iasEndorsementCategory} onChange={(e) => setField('iasEndorsementCategory', e.target.value)} required>
                          <option value="">Select endorsement category</option>
                          {IAS_ENDORSEMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    ) : null}

                    {proposalRule.visibleSingle.includes('executiveBriefPdf') || proposalRule.visibleSingle.includes('executiveBriefWord') ? (
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Executive Brief</h6>
                        <div className="row g-3 submission-upload-row">
                          <div className="col-md-6">
                            <FileInput label="Executive Brief PDF" accept="application/pdf" required={!editingSubmission && proposalRule.requiredSingle.includes('executiveBriefPdf')} helper="Upload the signed PDF copy." currentFileName={editingSubmission?.files?.executiveBriefPdf?.filename || ''} selectedFileNames={getSelectedFileNames('executiveBriefPdf')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('executiveBriefPdf', file || null)} />
                          </div>
                          <div className="col-md-6">
                            <FileInput label="Executive Brief Word" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!editingSubmission && proposalRule.requiredSingle.includes('executiveBriefWord')} helper="Upload the editable Word copy." currentFileName={editingSubmission?.files?.executiveBriefWord?.filename || ''} selectedFileNames={getSelectedFileNames('executiveBriefWord')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('executiveBriefWord', file || null)} />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {proposalRule.visibleSingle.includes('proposalPdf') || proposalRule.visibleSingle.includes('proposalWord') ? (
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Proposal</h6>
                        <div className="row g-3 submission-upload-row">
                          <div className="col-md-6">
                            <FileInput label="Proposal PDF" accept="application/pdf" required={!editingSubmission && proposalRule.requiredSingle.includes('proposalPdf')} helper="Upload the final PDF proposal." currentFileName={editingSubmission?.files?.proposalPdf?.filename || ''} selectedFileNames={getSelectedFileNames('proposalPdf')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('proposalPdf', file || null)} />
                          </div>
                          <div className="col-md-6">
                            <FileInput label="Proposal Word" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!editingSubmission && proposalRule.requiredSingle.includes('proposalWord')} helper="Upload the editable Word proposal." currentFileName={editingSubmission?.files?.proposalWord?.filename || ''} selectedFileNames={getSelectedFileNames('proposalWord')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('proposalWord', file || null)} />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {proposalRule.visibleSingle.includes('summaryMatrixPdf') || proposalRule.visibleSingle.includes('copyOfMoaMouPdf') ? (
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">MOA/MOU Attachments</h6>
                        <div className="row g-3 submission-upload-row">
                          {proposalRule.visibleSingle.includes('summaryMatrixPdf') ? (
                            <div className="col-md-6">
                              <FileInput label="Summary Matrix" accept="application/pdf" required={!editingSubmission && proposalRule.requiredSingle.includes('summaryMatrixPdf')} currentFileName={editingSubmission?.files?.summaryMatrixPdf?.filename || ''} selectedFileNames={getSelectedFileNames('summaryMatrixPdf')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('summaryMatrixPdf', file || null)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleSingle.includes('copyOfMoaMouPdf') ? (
                            <div className="col-md-6">
                              <FileInput label="Copy of MOA/MOU" accept="application/pdf" required={!editingSubmission && proposalRule.requiredSingle.includes('copyOfMoaMouPdf')} currentFileName={editingSubmission?.files?.copyOfMoaMouPdf?.filename || ''} selectedFileNames={getSelectedFileNames('copyOfMoaMouPdf')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('copyOfMoaMouPdf', file || null)} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {proposalRule.visibleSingle.includes('copyOfUsufructPdf') || proposalRule.visibleSingle.includes('copyOfDeedOfDonationPdf') ? (
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Special Attachments</h6>
                        <div className="row g-3 submission-upload-row">
                          {proposalRule.visibleSingle.includes('copyOfUsufructPdf') ? (
                            <div className="col-md-6">
                              <FileInput label="Copy of Usufruct" accept="application/pdf" required={!editingSubmission && proposalRule.requiredSingle.includes('copyOfUsufructPdf')} currentFileName={editingSubmission?.files?.copyOfUsufructPdf?.filename || ''} selectedFileNames={getSelectedFileNames('copyOfUsufructPdf')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('copyOfUsufructPdf', file || null)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleSingle.includes('copyOfDeedOfDonationPdf') ? (
                            <div className="col-md-6">
                              <FileInput label="Copy of Deed of Donation" accept="application/pdf" required={!editingSubmission && proposalRule.requiredSingle.includes('copyOfDeedOfDonationPdf')} currentFileName={editingSubmission?.files?.copyOfDeedOfDonationPdf?.filename || ''} selectedFileNames={getSelectedFileNames('copyOfDeedOfDonationPdf')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('copyOfDeedOfDonationPdf', file || null)} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {proposalRule.visibleMulti.includes('supportingDocuments') ? (
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Supporting Documents</h6>
                        <div className="row g-3 submission-upload-row">
                          <div className="col-md-6">
                            <FileInput label="Supporting Documents" accept="application/pdf" required={!editingSubmission && proposalRule.requiredMulti.includes('supportingDocuments')} multiple helper="Upload related PDF attachments. You can select multiple files." currentFileNames={getArrayFiles(editingSubmission?.files || {}, 'supportingDocuments').map((file) => file.filename)} selectedFileNames={getSelectedFileNames('supportingDocuments')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(files) => setField('supportingDocuments', files)} />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {proposalRule.visibleSingle.includes('legalEndorsementPdf') || proposalRule.visibleMulti.some((field) => field !== 'supportingDocuments') ? (
                      <div className="border rounded-3 p-3">
                        <h6 className="mb-3">Endorsements</h6>
                        <div className="row g-3 submission-upload-row">
                          {proposalRule.visibleSingle.includes('legalEndorsementPdf') ? (
                            <div className="col-md-6">
                              <FileInput label="Legal Endorsement" accept="application/pdf" required={!editingSubmission && proposalRule.requiredSingle.includes('legalEndorsementPdf')} currentFileName={editingSubmission?.files?.legalEndorsementPdf?.filename || ''} selectedFileNames={getSelectedFileNames('legalEndorsementPdf')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(_, file) => setField('legalEndorsementPdf', file || null)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleMulti.includes('vpafFanCertificationPdfs') ? (
                            <div className="col-md-6">
                              <FileInput label="VPAF / FMS Certification" accept="application/pdf" required={!editingSubmission && proposalRule.requiredMulti.includes('vpafFanCertificationPdfs')} multiple currentFileNames={getArrayFiles(editingSubmission?.files || {}, 'vpafFanCertificationPdfs').map((file) => file.filename)} selectedFileNames={getSelectedFileNames('vpafFanCertificationPdfs')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(files) => setField('vpafFanCertificationPdfs', files)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleMulti.includes('vpaaAdministrativeCouncilPdfs') ? (
                            <div className="col-md-6">
                              <FileInput label="VPAA / Administrative Council" accept="application/pdf" required={!editingSubmission && proposalRule.requiredMulti.includes('vpaaAdministrativeCouncilPdfs')} multiple currentFileNames={getArrayFiles(editingSubmission?.files || {}, 'vpaaAdministrativeCouncilPdfs').map((file) => file.filename)} selectedFileNames={getSelectedFileNames('vpaaAdministrativeCouncilPdfs')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(files) => setField('vpaaAdministrativeCouncilPdfs', files)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleMulti.includes('vprgesProductionCouncilPdfs') ? (
                            <div className="col-md-6">
                              <FileInput label="VPRGES / Production Council" accept="application/pdf" required={!editingSubmission && proposalRule.requiredMulti.includes('vprgesProductionCouncilPdfs')} multiple currentFileNames={getArrayFiles(editingSubmission?.files || {}, 'vprgesProductionCouncilPdfs').map((file) => file.filename)} selectedFileNames={getSelectedFileNames('vprgesProductionCouncilPdfs')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(files) => setField('vprgesProductionCouncilPdfs', files)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleMulti.includes('vprdeUrdecPdfs') ? (
                            <div className="col-md-6">
                              <FileInput label="VPRDE / URDEC" accept="application/pdf" required={!editingSubmission && proposalRule.requiredMulti.includes('vprdeUrdecPdfs')} multiple currentFileNames={getArrayFiles(editingSubmission?.files || {}, 'vprdeUrdecPdfs').map((file) => file.filename)} selectedFileNames={getSelectedFileNames('vprdeUrdecPdfs')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(files) => setField('vprdeUrdecPdfs', files)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleMulti.includes('officeOfPresidentPdfs') ? (
                            <div className="col-md-6">
                              <FileInput label="Office of the President" accept="application/pdf" required={!editingSubmission && proposalRule.requiredMulti.includes('officeOfPresidentPdfs')} multiple currentFileNames={getArrayFiles(editingSubmission?.files || {}, 'officeOfPresidentPdfs').map((file) => file.filename)} selectedFileNames={getSelectedFileNames('officeOfPresidentPdfs')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(files) => setField('officeOfPresidentPdfs', files)} />
                            </div>
                          ) : null}
                          {proposalRule.visibleMulti.includes('iasEndorsementPdfs') ? (
                            <div className="col-md-6">
                              <FileInput label="IAS Endorsement" accept="application/pdf" required={!editingSubmission && proposalRule.requiredMulti.includes('iasEndorsementPdfs')} multiple helper="Upload the IAS endorsement PDF files for the selected category." currentFileNames={getArrayFiles(editingSubmission?.files || {}, 'iasEndorsementPdfs').map((file) => file.filename)} selectedFileNames={getSelectedFileNames('iasEndorsementPdfs')} preserveOnEmpty={Boolean(editingSubmission)} onChange={(files) => setField('iasEndorsementPdfs', files)} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                  </>

                  <div className="submission-form-actions">
                    <button className="btn agenda-btn-update" type="submit" disabled={submitState.loading}>
                      {submitState.loading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                      {editingSubmission ? `Submit Revision v${(editingSubmission.packetVersion || 1) + 1}` : 'Submit Proposal'}
                    </button>
                    <button className="btn agenda-btn-reset" type="button" onClick={resetCouncilForm} disabled={submitState.loading}>
                      Reset
                    </button>
                  </div>
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
                        const reviewItem = getReviewEntryValue(reviewModal.reviewChecklist, doc.key, doc.index);
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
      {submitState.loading ? (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <div className="spinner-border text-primary mb-3" role="status" />
                <h5 className="mb-2">Submitting Proposal</h5>
                <div className="text-muted">Please wait while the files are uploaded and the proposal is saved.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {submitState.successOpen ? (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Submission Successful</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSubmitState((prev) => ({ ...prev, successOpen: false }))} />
              </div>
              <div className="modal-body">
                <p className="mb-0">{submitState.successMessage}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setSubmitState((prev) => ({ ...prev, successOpen: false }))}>OK</button>
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