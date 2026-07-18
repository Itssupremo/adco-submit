const multer = require('multer');
const jwt = require('jsonwebtoken');
const Submission = require('../models/Submission');
const Council = require('../models/Council');
const User = require('../models/User');
const { isS3Configured, uploadToS3, getFromS3, deleteFromS3 } = require('../utils/s3Storage');
const { logActivity } = require('../utils/activityLogger');
const { createNotification, createNotificationsForRole } = require('../utils/notificationHelper');
const { isLocalAuthEnabled, findLocalUserById, sanitizeUser } = require('../utils/localAuth');

const PDF_MIME = 'application/pdf';
const WORD_MIMES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_MIMES = [PDF_MIME, ...WORD_MIMES];
const DOCX_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const DOC_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const MAX_LOCAL_PACKET_BYTES = 12 * 1024 * 1024;
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
  'For Information',
];

const SINGLE_FILE_FIELDS = [
  'executiveBriefPdf',
  'executiveBriefWord',
  'proposalPdf',
  'proposalWord',
  'summaryMatrixPdf',
  'copyOfMoaMouPdf',
  'presentationPdf',
  'forInformationProposalPdf',
  'copyOfUsufructPdf',
  'copyOfDeedOfDonationPdf',
  'legalEndorsementPdf',
];

const MULTI_FILE_FIELDS = [
  'supportingDocuments',
  'vpafFanCertificationPdfs',
  'vpaaAdministrativeCouncilPdfs',
  'vprgesProductionCouncilPdfs',
  'vprdeUrdecPdfs',
  'officeOfPresidentPdfs',
  'iasEndorsementPdfs',
];

const LEGACY_SINGLE_FIELDS = [
  'vpafFanCertificationPdf',
  'vpaaAcademicCouncilPdf',
  'vprgesProductionCouncilPdf',
  'vprdeUrdecPdf',
];

const LEGACY_ARRAY_COMPATIBILITY = {
  vpafFanCertificationPdfs: 'vpafFanCertificationPdf',
  vpaaAdministrativeCouncilPdfs: 'vpaaAcademicCouncilPdf',
  vprgesProductionCouncilPdfs: 'vprgesProductionCouncilPdf',
  vprdeUrdecPdfs: 'vprdeUrdecPdf',
};

const PROPOSAL_RULES = {
  Academic: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vpaaAdministrativeCouncilPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vpaaAdministrativeCouncilPdfs'],
  },
  'Research & Extension': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vprdeUrdecPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vprdeUrdecPdfs'],
  },
  Administrative: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vpafFanCertificationPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vpafFanCertificationPdfs'],
  },
  Finance: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vpafFanCertificationPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vpafFanCertificationPdfs'],
  },
  Projects: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord'],
    visibleMulti: ['supportingDocuments', 'vpafFanCertificationPdfs', 'iasEndorsementPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord'],
    requiredMulti: ['supportingDocuments', 'vpafFanCertificationPdfs', 'iasEndorsementPdfs'],
    requireIasCategory: true,
  },
  Production: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    visibleMulti: ['supportingDocuments', 'vprgesProductionCouncilPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'proposalPdf', 'proposalWord'],
    requiredMulti: ['supportingDocuments', 'vprgesProductionCouncilPdfs'],
  },
  Usufruct: {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfUsufructPdf', 'legalEndorsementPdf'],
    visibleMulti: ['officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfUsufructPdf', 'legalEndorsementPdf'],
    requiredMulti: [],
  },
  'Deed of Donation': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfDeedOfDonationPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'copyOfDeedOfDonationPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs'],
  },
  'MOA/MOU (Academic)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs', 'vpaaAdministrativeCouncilPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs', 'vpaaAdministrativeCouncilPdfs'],
  },
  'MOA/MOU (Research, Development, and Extension)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs', 'vprdeUrdecPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs', 'vprdeUrdecPdfs'],
  },
  'MOA/MOU (Finance)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs'],
  },
  'MOA/MOU (Administrative)': {
    visibleSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    visibleMulti: ['vpafFanCertificationPdfs', 'officeOfPresidentPdfs'],
    requiredSingle: ['executiveBriefPdf', 'executiveBriefWord', 'summaryMatrixPdf', 'copyOfMoaMouPdf', 'legalEndorsementPdf'],
    requiredMulti: ['vpafFanCertificationPdfs'],
  },
  'For Information': {
    visibleSingle: ['presentationPdf', 'forInformationProposalPdf'],
    visibleMulti: ['officeOfPresidentPdfs'],
    requiredSingle: [],
    requiredMulti: [],
    requiresAnyOf: ['presentationPdf', 'forInformationProposalPdf'],
  },
};

const FIELD_CONFIG = [
  { name: 'executiveBriefPdf', maxCount: 1 },
  { name: 'executiveBriefWord', maxCount: 1 },
  { name: 'proposalPdf', maxCount: 1 },
  { name: 'proposalWord', maxCount: 1 },
  { name: 'summaryMatrixPdf', maxCount: 1 },
  { name: 'copyOfMoaMouPdf', maxCount: 1 },
  { name: 'presentationPdf', maxCount: 1 },
  { name: 'forInformationProposalPdf', maxCount: 1 },
  { name: 'copyOfUsufructPdf', maxCount: 1 },
  { name: 'copyOfDeedOfDonationPdf', maxCount: 1 },
  { name: 'legalEndorsementPdf', maxCount: 1 },
  { name: 'supportingDocuments', maxCount: 10 },
  { name: 'vpafFanCertificationPdfs', maxCount: 10 },
  { name: 'vpaaAdministrativeCouncilPdfs', maxCount: 10 },
  { name: 'vprgesProductionCouncilPdfs', maxCount: 10 },
  { name: 'vprdeUrdecPdfs', maxCount: 10 },
  { name: 'officeOfPresidentPdfs', maxCount: 10 },
  { name: 'iasEndorsementPdfs', maxCount: 10 },
];

const REVIEWABLE_SINGLE_FIELDS = [...SINGLE_FILE_FIELDS, ...LEGACY_SINGLE_FIELDS];
const REVIEWABLE_ARRAY_FIELDS = MULTI_FILE_FIELDS;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF and Word files are allowed'));
  },
});

exports.uploadMiddleware = upload.fields(FIELD_CONFIG);

const actorFromUser = (user) => ({
  userId: user ? user._id : null,
  username: user ? user.username : '',
  fullname: user ? user.fullname : '',
  date: new Date(),
});

const fileExists = (file) => Boolean(file && (file.filename || file.s3Key || file.data));
const arrayHasFiles = (files = []) => Array.isArray(files) && files.some(fileExists);
const getProposalRule = (proposalType = '') => PROPOSAL_RULES[proposalType] || PROPOSAL_RULES.Academic;

const inferContentType = (filename = '') => {
  const lower = String(filename).toLowerCase();
  if (lower.endsWith('.pdf')) return PDF_MIME;
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  return 'application/octet-stream';
};

const cloneFile = (file) => {
  if (!fileExists(file)) return {};
  return {
    filename: file.filename || '',
    data: file.data,
    s3Key: file.s3Key,
    contentType: file.contentType || inferContentType(file.filename),
    uploadedAt: file.uploadedAt,
  };
};

const cloneFileArray = (files = []) => Array.isArray(files) ? files.filter(fileExists).map(cloneFile) : [];

const cloneCompatArray = (files = {}, arrayField) => {
  const direct = cloneFileArray(files[arrayField]);
  if (direct.length > 0) return direct;
  const legacyField = LEGACY_ARRAY_COMPATIBILITY[arrayField];
  return legacyField && fileExists(files[legacyField]) ? [cloneFile(files[legacyField])] : [];
};

const clonePacketFiles = (files = {}) => ({
  executiveBriefPdf: cloneFile(files.executiveBriefPdf),
  executiveBriefWord: cloneFile(files.executiveBriefWord),
  proposalPdf: cloneFile(files.proposalPdf),
  proposalWord: cloneFile(files.proposalWord),
  summaryMatrixPdf: cloneFile(files.summaryMatrixPdf),
  copyOfMoaMouPdf: cloneFile(files.copyOfMoaMouPdf),
  presentationPdf: cloneFile(files.presentationPdf),
  forInformationProposalPdf: cloneFile(files.forInformationProposalPdf),
  supportingDocuments: cloneFileArray(files.supportingDocuments),
  copyOfUsufructPdf: cloneFile(files.copyOfUsufructPdf),
  copyOfDeedOfDonationPdf: cloneFile(files.copyOfDeedOfDonationPdf),
  legalEndorsementPdf: cloneFile(files.legalEndorsementPdf),
  vpafFanCertificationPdfs: cloneCompatArray(files, 'vpafFanCertificationPdfs'),
  vpaaAdministrativeCouncilPdfs: cloneCompatArray(files, 'vpaaAdministrativeCouncilPdfs'),
  vprgesProductionCouncilPdfs: cloneCompatArray(files, 'vprgesProductionCouncilPdfs'),
  vprdeUrdecPdfs: cloneCompatArray(files, 'vprdeUrdecPdfs'),
  officeOfPresidentPdfs: cloneFileArray(files.officeOfPresidentPdfs),
  iasEndorsementPdfs: cloneFileArray(files.iasEndorsementPdfs),
  vpafFanCertificationPdf: cloneFile(files.vpafFanCertificationPdf),
  vpaaAcademicCouncilPdf: cloneFile(files.vpaaAcademicCouncilPdf),
  vprgesProductionCouncilPdf: cloneFile(files.vprgesProductionCouncilPdf),
  vprdeUrdecPdf: cloneFile(files.vprdeUrdecPdf),
});

const estimatePacketBytes = (files = {}) => {
  const packetFiles = clonePacketFiles(files);
  let total = 0;

  SINGLE_FILE_FIELDS.forEach((field) => {
    const size = packetFiles[field]?.data?.length || 0;
    total += size;
  });

  MULTI_FILE_FIELDS.forEach((field) => {
    total += (packetFiles[field] || []).reduce((sum, file) => sum + (file?.data?.length || 0), 0);
  });

  return total;
};

const validatePacketStorageSize = (files = {}) => {
  if (isS3Configured) return null;
  const totalBytes = estimatePacketBytes(files);
  if (totalBytes > MAX_LOCAL_PACKET_BYTES) {
    return 'Uploaded files are too large for local storage. Reduce the total upload size or configure S3 storage.';
  }
  return null;
};

const collectS3KeysFromPacket = (files = {}) => {
  const packetFiles = clonePacketFiles(files);
  const keys = [];

  SINGLE_FILE_FIELDS.forEach((field) => {
    if (packetFiles[field]?.s3Key) keys.push(packetFiles[field].s3Key);
  });

  MULTI_FILE_FIELDS.forEach((field) => {
    (packetFiles[field] || []).forEach((file) => {
      if (file?.s3Key) keys.push(file.s3Key);
    });
  });

  return keys;
};

const stripPacketFiles = (files = {}) => {
  const clone = clonePacketFiles(files);
  [...SINGLE_FILE_FIELDS, ...LEGACY_SINGLE_FIELDS].forEach((field) => {
    if (clone[field]) delete clone[field].data;
  });
  MULTI_FILE_FIELDS.forEach((field) => {
    clone[field] = (clone[field] || []).map((item) => {
      const next = { ...item };
      delete next.data;
      return next;
    });
  });
  return clone;
};

const createEmptyReviewItem = () => ({ checked: false, remarks: '' });

const buildReviewChecklist = (files = {}) => {
  const checklist = {};
  REVIEWABLE_SINGLE_FIELDS.forEach((field) => {
    checklist[field] = createEmptyReviewItem();
  });
  REVIEWABLE_ARRAY_FIELDS.forEach((field) => {
    checklist[field] = Array.isArray(files[field])
      ? files[field].filter(fileExists).map(() => createEmptyReviewItem())
      : [];
  });
  return checklist;
};

const normalizeReviewChecklist = (payload = {}, files = {}, existingChecklist = {}) => {
  const checklist = buildReviewChecklist(files);

  REVIEWABLE_SINGLE_FIELDS.forEach((field) => {
    const source = payload?.[field] || existingChecklist?.[field] || {};
    checklist[field] = {
      checked: Boolean(source.checked),
      remarks: String(source.remarks || '').trim(),
    };
  });

  REVIEWABLE_ARRAY_FIELDS.forEach((field) => {
    const totalItems = Array.isArray(files[field]) ? files[field].filter(fileExists).length : 0;
    checklist[field] = Array.from({ length: totalItems }, (_, index) => {
      const source = payload?.[field]?.[index] || existingChecklist?.[field]?.[index] || {};
      return {
        checked: Boolean(source.checked),
        remarks: String(source.remarks || '').trim(),
      };
    });
  });

  return checklist;
};

const isReviewChecklistComplete = (files = {}, reviewChecklist = {}) => {
  for (const field of REVIEWABLE_SINGLE_FIELDS) {
    if (fileExists(files[field]) && !reviewChecklist?.[field]?.checked) {
      return false;
    }
  }

  return REVIEWABLE_ARRAY_FIELDS.every((field) => {
    const items = Array.isArray(files[field]) ? files[field].filter(fileExists) : [];
    return items.every((_, index) => reviewChecklist?.[field]?.[index]?.checked);
  });
};

const safe = (doc) => {
  const obj = doc.toObject();
  obj.files = stripPacketFiles(obj.files);
  obj.packetHistory = Array.isArray(obj.packetHistory)
    ? obj.packetHistory.map((item) => ({
        ...item,
        files: stripPacketFiles(item.files),
      }))
    : [];
  return obj;
};

const getUploadedFiles = (req) => {
  const map = {};
  SINGLE_FILE_FIELDS.forEach((field) => {
    map[field] = req.files?.[field]?.[0] || null;
  });
  MULTI_FILE_FIELDS.forEach((field) => {
    map[field] = req.files?.[field] || [];
  });
  return map;
};

const isPdf = (file) => file?.mimetype === PDF_MIME;
const isWord = (file) => WORD_MIMES.includes(file?.mimetype);
const isPdfBuffer = (file) => Buffer.isBuffer(file?.buffer) && file.buffer.subarray(0, 5).toString('utf8') === '%PDF-';
const hasBufferSignature = (file, signature) => Buffer.isBuffer(file?.buffer)
  && file.buffer.length >= signature.length
  && signature.every((value, index) => file.buffer[index] === value);
const isWordBuffer = (file) => {
  const name = String(file?.originalname || file?.filename || '').toLowerCase();
  if (name.endsWith('.docx') || file?.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return hasBufferSignature(file, DOCX_MAGIC);
  }
  if (name.endsWith('.doc') || file?.mimetype === 'application/msword') {
    return hasBufferSignature(file, DOC_MAGIC);
  }
  return hasBufferSignature(file, DOCX_MAGIC) || hasBufferSignature(file, DOC_MAGIC);
};
const normalizeUploadError = (error) => {
  const message = String(error?.message || '').trim();
  if (message.toLowerCase().includes('offset is out of bounds')) {
    return 'Uploaded file is invalid or corrupted. Re-save the Word or PDF file and upload it again.';
  }
  return message || 'Server error';
};

const validateUploadedTypes = (uploadedFiles) => {
  if (uploadedFiles.executiveBriefPdf && !isPdf(uploadedFiles.executiveBriefPdf)) return 'Executive Brief PDF must be a PDF file';
  if (uploadedFiles.executiveBriefWord && !isWord(uploadedFiles.executiveBriefWord)) return 'Executive Brief Word must be a Word file';
  if (uploadedFiles.proposalPdf && !isPdf(uploadedFiles.proposalPdf)) return 'Proposal PDF must be a PDF file';
  if (uploadedFiles.proposalWord && !isWord(uploadedFiles.proposalWord)) return 'Proposal Word must be a Word file';
  if (uploadedFiles.summaryMatrixPdf && !isPdf(uploadedFiles.summaryMatrixPdf)) return 'Summary Matrix must be a PDF file';
  if (uploadedFiles.copyOfMoaMouPdf && !isPdf(uploadedFiles.copyOfMoaMouPdf)) return 'Copy of MOA/MOU must be a PDF file';
  if (uploadedFiles.presentationPdf && !isPdf(uploadedFiles.presentationPdf)) return 'Presentation PDF must be a PDF file';
  if (uploadedFiles.forInformationProposalPdf && !isPdf(uploadedFiles.forInformationProposalPdf)) return 'Proposal PDF must be a PDF file';
  if (uploadedFiles.copyOfUsufructPdf && !isPdf(uploadedFiles.copyOfUsufructPdf)) return 'Copy of Usufruct must be a PDF file';
  if (uploadedFiles.copyOfDeedOfDonationPdf && !isPdf(uploadedFiles.copyOfDeedOfDonationPdf)) return 'Copy of Deed of Donation must be a PDF file';
  if (uploadedFiles.legalEndorsementPdf && !isPdf(uploadedFiles.legalEndorsementPdf)) return 'Legal Endorsement must be a PDF file';
  if (MULTI_FILE_FIELDS.some((field) => uploadedFiles[field].some((item) => !isPdf(item)))) return 'Supporting and endorsement documents must be PDF files';

  const pdfFields = [
    ['Executive Brief PDF', uploadedFiles.executiveBriefPdf],
    ['Proposal PDF', uploadedFiles.proposalPdf],
    ['Summary Matrix', uploadedFiles.summaryMatrixPdf],
    ['Copy of MOA/MOU', uploadedFiles.copyOfMoaMouPdf],
    ['Presentation PDF', uploadedFiles.presentationPdf],
    ['For Information Proposal PDF', uploadedFiles.forInformationProposalPdf],
    ['Copy of Usufruct', uploadedFiles.copyOfUsufructPdf],
    ['Copy of Deed of Donation', uploadedFiles.copyOfDeedOfDonationPdf],
    ['Legal Endorsement', uploadedFiles.legalEndorsementPdf],
  ];

  for (const [label, file] of pdfFields) {
    if (file && !isPdfBuffer(file)) return `${label} is not a valid PDF file`;
  }

  const wordFields = [
    ['Executive Brief Word', uploadedFiles.executiveBriefWord],
    ['Proposal Word', uploadedFiles.proposalWord],
  ];

  for (const [label, file] of wordFields) {
    if (file && !isWordBuffer(file)) return `${label} is not a valid Word file`;
  }

  for (const field of MULTI_FILE_FIELDS) {
    for (const file of uploadedFiles[field]) {
      if (!isPdfBuffer(file)) return 'One of the supporting or endorsement documents is not a valid PDF file';
    }
  }

  return null;
};

const mergeFiles = async (existingFiles = {}, uploadedFiles = {}, proposalType = '') => {
  const merged = clonePacketFiles(existingFiles);
  const rule = getProposalRule(proposalType);
  const visibleSingle = new Set(rule.visibleSingle || []);
  const visibleMulti = new Set(rule.visibleMulti || []);

  SINGLE_FILE_FIELDS.forEach((field) => {
    if (!visibleSingle.has(field)) {
      merged[field] = {};
    }
  });

  MULTI_FILE_FIELDS.forEach((field) => {
    if (!visibleMulti.has(field)) {
      merged[field] = [];
    }
  });

  LEGACY_SINGLE_FIELDS.forEach((field) => {
    merged[field] = {};
  });

  for (const field of SINGLE_FILE_FIELDS) {
    const file = uploadedFiles[field];
    if (!file) continue;
    const s3Key = await uploadToS3(file.originalname, file.buffer, file.mimetype);
    merged[field] = {
      filename: file.originalname,
      data: s3Key ? undefined : file.buffer,
      s3Key: s3Key || undefined,
      contentType: file.mimetype,
      uploadedAt: new Date(),
    };
  }

  for (const field of MULTI_FILE_FIELDS) {
    if (!uploadedFiles[field]?.length) continue;
    const files = [];
    for (const file of uploadedFiles[field]) {
      const s3Key = await uploadToS3(file.originalname, file.buffer, file.mimetype);
      files.push({
        filename: file.originalname,
        data: s3Key ? undefined : file.buffer,
        s3Key: s3Key || undefined,
        contentType: file.mimetype,
        uploadedAt: new Date(),
      });
    }
    merged[field] = files;
  }

  return merged;
};

const validateSubmissionPayload = ({ body, mergedFiles, requireAnyUpload }) => {
  const documentTitle = String(body.documentTitle || '').trim();
  const proposalType = String(body.proposalType || '').trim();
  const rule = getProposalRule(proposalType);

  if (!documentTitle || !proposalType) {
    return 'Proposal title and proposal type are required';
  }
  if (!PROPOSAL_TYPES.includes(proposalType)) {
    return 'Invalid proposal type';
  }

  if (requireAnyUpload) {
    const hasAny = [...SINGLE_FILE_FIELDS, ...MULTI_FILE_FIELDS].some((field) => {
      if (MULTI_FILE_FIELDS.includes(field)) return arrayHasFiles(mergedFiles[field]);
      return fileExists(mergedFiles[field]);
    });
    if (!hasAny) return 'At least one file must be uploaded';
  }

  if (rule.requiresAnyOf?.length) {
    const hasAnyRequiredOption = rule.requiresAnyOf.some((field) => fileExists(mergedFiles[field]));
    if (!hasAnyRequiredOption) {
      return 'At least one of Presentation PDF or Proposal PDF is required';
    }
  }

  for (const field of rule.requiredSingle || []) {
    if (!fileExists(mergedFiles[field])) {
      return `${field
        .replace(/Pdf$/, ' PDF')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase())} is required`;
    }
  }

  for (const field of rule.requiredMulti || []) {
    if (!arrayHasFiles(mergedFiles[field])) {
      const label = field
        .replace(/Pdfs$/, '')
        .replace(/Documents$/, ' Documents')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase());
      return `At least one ${label} file is required`;
    }
  }

  if (rule.requireIasCategory && !String(body.iasEndorsementCategory || '').trim()) {
    return 'IAS Endorsement selection is required';
  }

  return null;
};

const buildFilter = (req) => {
  const { status, councilId, submittedFrom, submittedTo, meetingDateFrom, meetingDateTo, proposalType } = req.query;
  const filter = {};

  if (req.user.role === 'council') {
    filter.councilId = req.user.councilId;
  } else if (councilId) {
    filter.councilId = councilId;
  }

  if (status) filter.status = status;
  if (proposalType) filter.proposalType = proposalType;
  if (submittedFrom || submittedTo) {
    filter.submissionDate = {};
    if (submittedFrom) filter.submissionDate.$gte = submittedFrom;
    if (submittedTo) filter.submissionDate.$lte = submittedTo;
  }
  if (meetingDateFrom || meetingDateTo) {
    filter.meetingDate = {};
    if (meetingDateFrom) filter.meetingDate.$gte = meetingDateFrom;
    if (meetingDateTo) filter.meetingDate.$lte = meetingDateTo;
  }
  return filter;
};

const defaultFileKey = (submission) => {
  const priority = [
    'presentationPdf',
    'forInformationProposalPdf',
    'proposalPdf',
    'executiveBriefPdf',
    'copyOfUsufructPdf',
    'copyOfDeedOfDonationPdf',
    'legalEndorsementPdf',
    'vpafFanCertificationPdfs',
    'vpaaAdministrativeCouncilPdfs',
    'vprgesProductionCouncilPdfs',
    'vprdeUrdecPdfs',
    'officeOfPresidentPdfs',
    'iasEndorsementPdfs',
    'supportingDocuments',
    'proposalWord',
    'executiveBriefWord',
  ];
  return priority.find((field) => {
    if (MULTI_FILE_FIELDS.includes(field)) return arrayHasFiles(submission.files?.[field]);
    return fileExists(submission.files?.[field]);
  }) || null;
};

const getFileFromPacket = (packetFiles, key, index) => {
  if (!packetFiles) return null;
  if (MULTI_FILE_FIELDS.includes(key)) {
    const files = Array.isArray(packetFiles[key]) && packetFiles[key].length > 0
      ? packetFiles[key]
      : (LEGACY_ARRAY_COMPATIBILITY[key] && fileExists(packetFiles[LEGACY_ARRAY_COMPATIBILITY[key]]) ? [packetFiles[LEGACY_ARRAY_COMPATIBILITY[key]]] : []);
    return files[index] || null;
  }
  return packetFiles[key] || null;
};

exports.getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find(buildFilter(req)).sort({ updatedAt: -1 });
    res.json(submissions.map(safe));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyCurrentSubmission = async (req, res) => {
  try {
    const submission = await Submission.findOne({ councilId: req.user.councilId, status: { $ne: 'Archived' } }).sort({ updatedAt: -1 });
    res.json(submission ? safe(submission) : null);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (req.user.role === 'council' && String(submission.councilId) !== String(req.user.councilId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(safe(submission));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createSubmission = async (req, res) => {
  try {
    const uploadedFiles = getUploadedFiles(req);
    const typeError = validateUploadedTypes(uploadedFiles);
    if (typeError) return res.status(400).json({ message: typeError });

    const council = await Council.findById(req.user.councilId);
    if (!council) return res.status(400).json({ message: 'Assigned council not found' });

    const proposalType = String(req.body.proposalType || '').trim();
    const mergedFiles = await mergeFiles({}, uploadedFiles, proposalType);
    const storageError = validatePacketStorageSize(mergedFiles);
    if (storageError) return res.status(400).json({ message: storageError });
    const validationError = validateSubmissionPayload({ body: req.body, mergedFiles, requireAnyUpload: true });
    if (validationError) return res.status(400).json({ message: validationError });

    const submission = await Submission.create({
      councilId: council._id,
      councilName: council.councilName,
      collegeUnit: council.councilName,
      documentTitle: String(req.body.documentTitle || '').trim(),
      proposalType,
      iasEndorsementCategory: String(req.body.iasEndorsementCategory || '').trim(),
      forInformationType: '',
      meetingDate: '',
      submissionDate: '',
      remarks: '',
      status: 'Pending',
      submittedByUserId: req.user._id,
      packetVersion: 1,
      files: mergedFiles,
      reviewChecklist: buildReviewChecklist(mergedFiles),
    });

    await createNotificationsForRole({
      role: 'board',
      type: 'SUBMISSION_RECEIVED',
      title: 'Submission received',
      message: `${council.councilName} submitted ${submission.documentTitle} for review.`,
      meta: { submissionId: submission._id },
    });

    logActivity(req, 'CREATE_SUBMISSION', `Created ${proposalType} submission for ${council.councilName}`);
    res.status(201).json(safe(submission));
  } catch (err) {
    const message = normalizeUploadError(err);
    const status = message === 'Server error' ? 500 : 400;
    res.status(status).json({ message });
  }
};

exports.replaceSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (String(submission.councilId) !== String(req.user.councilId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!['Pending', 'Returned'].includes(submission.status)) {
      return res.status(400).json({ message: 'Only pending or returned submissions can be replaced' });
    }
    if (submission.status === 'Returned' && submission.resubmissionDeadline && new Date(submission.resubmissionDeadline) < new Date()) {
      return res.status(400).json({ message: 'The resubmission deadline has passed. This submission is now locked.' });
    }

    const uploadedFiles = getUploadedFiles(req);
    const typeError = validateUploadedTypes(uploadedFiles);
    if (typeError) return res.status(400).json({ message: typeError });

    const proposalType = String(req.body.proposalType || submission.proposalType || '').trim();
    const mergedFiles = await mergeFiles(submission.files || {}, uploadedFiles, proposalType);
    const storageError = validatePacketStorageSize(mergedFiles);
    if (storageError) return res.status(400).json({ message: storageError });
    const body = {
      documentTitle: req.body.documentTitle || submission.documentTitle,
      proposalType,
      forInformationType: '',
      meetingDate: submission.meetingDate || '',
      submissionDate: submission.submissionDate || '',
    };
    const validationError = validateSubmissionPayload({ body, mergedFiles, requireAnyUpload: false });
    if (validationError) return res.status(400).json({ message: validationError });

    if ([...SINGLE_FILE_FIELDS, ...MULTI_FILE_FIELDS].some((field) => {
      if (MULTI_FILE_FIELDS.includes(field)) return arrayHasFiles(submission.files?.[field]);
      return fileExists(submission.files?.[field]);
    })) {
      submission.packetHistory.push({
        version: submission.packetVersion || 1,
        uploadedAt: new Date(),
        files: stripPacketFiles(submission.files),
      });
    }

    submission.documentTitle = String(body.documentTitle || '').trim();
    submission.proposalType = proposalType;
    submission.iasEndorsementCategory = String(req.body.iasEndorsementCategory || '').trim();
    submission.forInformationType = '';
    submission.files = mergedFiles;
    submission.reviewChecklist = normalizeReviewChecklist({}, mergedFiles, submission.reviewChecklist);
    submission.packetVersion = (submission.packetVersion || 1) + 1;
    submission.status = 'Pending';
    submission.remarks = '';
    submission.returnedBy = actorFromUser(null);
    submission.resubmissionDeadline = null;

    await submission.save();

    await createNotificationsForRole({
      role: 'board',
      type: 'SUBMISSION_RECEIVED',
      title: 'Revised submission received',
      message: `${submission.councilName} uploaded revised submission files for ${submission.documentTitle}.`,
      meta: { submissionId: submission._id },
    });

    logActivity(req, 'REPLACE_SUBMISSION', `Replaced ${submission.proposalType} submission for ${submission.councilName}`);
    res.json(safe(submission));
  } catch (err) {
    const message = normalizeUploadError(err);
    const status = message === 'Server error' ? 500 : 400;
    res.status(status).json({ message });
  }
};

exports.approveSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status === 'Archived') return res.status(400).json({ message: 'Archived submissions cannot be approved' });

    const reviewChecklist = normalizeReviewChecklist(req.body.reviewChecklist || {}, submission.files || {}, submission.reviewChecklist || {});
    if (!isReviewChecklistComplete(submission.files || {}, reviewChecklist)) {
      return res.status(400).json({ message: 'All uploaded documents must be checked before approval.' });
    }

    submission.reviewChecklist = reviewChecklist;
    submission.status = 'Approved';
    submission.remarks = req.body.remarks || submission.remarks || 'Approved by USM Board';
    submission.approvedBy = actorFromUser(req.user);
    
    submission.auditTrail.push({
      actor: submission.approvedBy,
      action: 'Approved the submission',
    });

    await submission.save();

    const councilUsers = await User.find({ role: 'council', councilId: submission.councilId, isActive: true }).select('_id');
    await Promise.all(councilUsers.map((user) => createNotification({
      userId: user._id,
      type: 'SUBMISSION_APPROVED',
      title: 'Submission approved',
      message: `${submission.documentTitle} was approved by the USM Board.`,
      meta: { submissionId: submission._id },
    })));

    logActivity(req, 'APPROVE_SUBMISSION', `Approved submission for ${submission.councilName}`);
    res.json(safe(submission));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.returnSubmission = async (req, res) => {
  try {
    const { remarks, resubmissionDeadline, reviewChecklist: incomingReviewChecklist } = req.body;
    if (!remarks) return res.status(400).json({ message: 'Remarks are required when returning a submission' });

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    if (incomingReviewChecklist) {
      const reviewChecklist = normalizeReviewChecklist(incomingReviewChecklist || {}, submission.files || {}, submission.reviewChecklist || {});

      const formatDocName = (key) => {
        let name = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        return name.replace(/Pdfs?$/i, 'PDF').replace(/Word$/i, 'Word');
      };

      const actor = actorFromUser(req.user);
      const oldChecklist = submission.reviewChecklist || {};

      Object.keys(reviewChecklist).forEach((key) => {
        const isArray = Array.isArray(reviewChecklist[key]);
        if (isArray) {
          reviewChecklist[key].forEach((item, index) => {
            const oldItem = (oldChecklist[key] && oldChecklist[key][index]) || {};
            if (item.checked && !oldItem.checked) {
              submission.auditTrail.push({ actor, action: `Approved ${formatDocName(key)} #${index + 1}` });
            } else if (!item.checked && oldItem.checked) {
              submission.auditTrail.push({ actor, action: `Unapproved ${formatDocName(key)} #${index + 1}` });
            }
          });
        } else {
          const item = reviewChecklist[key];
          const oldItem = oldChecklist[key] || {};
          if (item.checked && !oldItem.checked) {
            submission.auditTrail.push({ actor, action: `Approved ${formatDocName(key)}` });
          } else if (!item.checked && oldItem.checked) {
            submission.auditTrail.push({ actor, action: `Unapproved ${formatDocName(key)}` });
          }
        }
      });
      submission.reviewChecklist = reviewChecklist;
    }

    submission.status = 'Returned';
    submission.remarks = remarks;
    submission.resubmissionDeadline = resubmissionDeadline || null;
    submission.returnedBy = actorFromUser(req.user);

    submission.auditTrail.push({
      actor: submission.returnedBy,
      action: 'Returned the submission',
    });

    await submission.save();

    const formattedDeadline = resubmissionDeadline
      ? new Date(resubmissionDeadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : null;

    const notificationMessage = formattedDeadline
      ? `${submission.documentTitle} was returned for revision. Deadline: ${formattedDeadline}.`
      : `${submission.documentTitle} was returned for revision.`;

    const councilUsers = await User.find({ role: 'council', councilId: submission.councilId, isActive: true }).select('_id');
    await Promise.all(councilUsers.map((user) => createNotification({
      userId: user._id,
      type: 'SUBMISSION_RETURNED',
      title: 'Submission returned',
      message: notificationMessage,
      meta: { submissionId: submission._id, remarks, resubmissionDeadline },
    })));

    logActivity(req, 'RETURN_SUBMISSION', `Returned submission for ${submission.councilName}`);
    res.json(safe(submission));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.archiveSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved submissions can be archived' });
    }

    submission.status = 'Archived';
    submission.archivedBy = actorFromUser(req.user);
    await submission.save();

    logActivity(req, 'ARCHIVE_SUBMISSION', `Archived submission for ${submission.councilName}`);
    res.json(safe(submission));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const s3Keys = new Set([
      ...collectS3KeysFromPacket(submission.files || {}),
      ...((submission.packetHistory || []).flatMap((item) => collectS3KeysFromPacket(item.files || {}))),
    ]);

    await Promise.all(Array.from(s3Keys).map((key) => deleteFromS3(key)));
    await Submission.deleteOne({ _id: submission._id });

    logActivity(req, 'DELETE_SUBMISSION', `Deleted submission for ${submission.councilName}`);
    res.json({ message: 'Submission deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSubmissionReview = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const reviewChecklist = normalizeReviewChecklist(req.body.reviewChecklist || {}, submission.files || {}, submission.reviewChecklist || {});

    const formatDocName = (key) => {
      let name = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      return name.replace(/Pdfs?$/i, 'PDF').replace(/Word$/i, 'Word');
    };

    const actor = actorFromUser(req.user);
    const oldChecklist = submission.reviewChecklist || {};

    Object.keys(reviewChecklist).forEach((key) => {
      const isArray = Array.isArray(reviewChecklist[key]);
      if (isArray) {
        reviewChecklist[key].forEach((item, index) => {
          const oldItem = (oldChecklist[key] && oldChecklist[key][index]) || {};
          if (item.checked && !oldItem.checked) {
            submission.auditTrail.push({ actor, action: `Approved ${formatDocName(key)} #${index + 1}` });
          } else if (!item.checked && oldItem.checked) {
            submission.auditTrail.push({ actor, action: `Unapproved ${formatDocName(key)} #${index + 1}` });
          }
        });
      } else {
        const item = reviewChecklist[key];
        const oldItem = oldChecklist[key] || {};
        if (item.checked && !oldItem.checked) {
          submission.auditTrail.push({ actor, action: `Approved ${formatDocName(key)}` });
        } else if (!item.checked && oldItem.checked) {
          submission.auditTrail.push({ actor, action: `Unapproved ${formatDocName(key)}` });
        }
      }
    });

    submission.reviewChecklist = reviewChecklist;
    if (typeof req.body.remarks === 'string') {
      submission.remarks = req.body.remarks.trim();
    }

    if (submission.status === 'Pending') {
      submission.status = 'Under Review';
    }

    submission.reviewedBy = actorFromUser(req.user);

    await submission.save();

    logActivity(req, 'REVIEW_SUBMISSION', `Updated review checklist for ${submission.documentTitle}`);
    res.json(safe(submission));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

exports.serveFile = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (req.user.role === 'council' && String(submission.councilId) !== String(req.user.councilId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const key = req.query.key || defaultFileKey(submission);
    const index = req.query.index ? parseInt(req.query.index, 10) : 0;
    const version = req.query.v ? parseInt(req.query.v, 10) : null;

    if (!key) return res.status(404).json({ message: 'No file found for this submission' });

    const targetPacket = version && version !== submission.packetVersion
      ? submission.packetHistory.find((item) => item.version === version)?.files
      : submission.files;
    const file = getFileFromPacket(targetPacket, key, index);

    if (!fileExists(file)) {
      return res.status(404).json({ message: 'No file found for this selection' });
    }

    res.set('Content-Type', file.contentType || inferContentType(file.filename));
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);

    if (file.s3Key) {
      const buffer = await getFromS3(file.s3Key);
      if (!buffer) return res.status(404).json({ message: 'File not found in storage bucket' });
      return res.send(buffer);
    }

    return res.send(file.data);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.authenticateOrQuery = async (req, res, next) => {
  const header = req.headers.authorization;
  const qToken = req.query.token;
  const raw = header?.startsWith('Bearer ') ? header.split(' ')[1] : qToken;
  if (!raw) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(raw, process.env.JWT_SECRET);

    if (isLocalAuthEnabled()) {
      const localUser = findLocalUserById(decoded.id);
      if (!localUser) return res.status(401).json({ message: 'User not found' });
      if (!localUser.isActive) return res.status(403).json({ message: 'Account is inactive' });
      req.user = sanitizeUser(localUser);
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};