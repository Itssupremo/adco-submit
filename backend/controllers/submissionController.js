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
const PROPOSAL_TYPES = ['Academic', 'Research & Extension', 'Administrative', 'Finance', 'Projects', 'MOH/ MOU/ Deed of Donation/ Usufruct', 'For Information'];

const SINGLE_FILE_FIELDS = [
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

const FIELD_CONFIG = [
  { name: 'executiveBriefPdf', maxCount: 1 },
  { name: 'executiveBriefWord', maxCount: 1 },
  { name: 'proposalPdf', maxCount: 1 },
  { name: 'proposalWord', maxCount: 1 },
  { name: 'presentationPdf', maxCount: 1 },
  { name: 'forInformationProposalPdf', maxCount: 1 },
  { name: 'supportingDocuments', maxCount: 10 },
  { name: 'legalEndorsementPdf', maxCount: 1 },
  { name: 'vpafFanCertificationPdf', maxCount: 1 },
  { name: 'vpaaAcademicCouncilPdf', maxCount: 1 },
  { name: 'vprgesProductionCouncilPdf', maxCount: 1 },
  { name: 'vprdeUrdecPdf', maxCount: 1 },
];

const REVIEWABLE_SINGLE_FIELDS = [
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
  userId: user?._id || null,
  username: user?.username || '',
  fullname: user?.fullname || '',
});

const fileExists = (file) => Boolean(file && (file.filename || file.s3Key || file.data));

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

const clonePacketFiles = (files = {}) => ({
  executiveBriefPdf: cloneFile(files.executiveBriefPdf),
  executiveBriefWord: cloneFile(files.executiveBriefWord),
  proposalPdf: cloneFile(files.proposalPdf),
  proposalWord: cloneFile(files.proposalWord),
  presentationPdf: cloneFile(files.presentationPdf),
  forInformationProposalPdf: cloneFile(files.forInformationProposalPdf),
  supportingDocuments: Array.isArray(files.supportingDocuments) ? files.supportingDocuments.filter(fileExists).map(cloneFile) : [],
  legalEndorsementPdf: cloneFile(files.legalEndorsementPdf),
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

  if (Array.isArray(packetFiles.supportingDocuments)) {
    total += packetFiles.supportingDocuments.reduce((sum, file) => sum + (file?.data?.length || 0), 0);
  }

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

  if (Array.isArray(packetFiles.supportingDocuments)) {
    packetFiles.supportingDocuments.forEach((file) => {
      if (file?.s3Key) keys.push(file.s3Key);
    });
  }

  return keys;
};

const stripPacketFiles = (files = {}) => {
  const clone = clonePacketFiles(files);
  SINGLE_FILE_FIELDS.forEach((field) => {
    if (clone[field]) delete clone[field].data;
  });
  if (Array.isArray(clone.supportingDocuments)) {
    clone.supportingDocuments = clone.supportingDocuments.map((item) => {
      const next = { ...item };
      delete next.data;
      return next;
    });
  }
  return clone;
};

const createEmptyReviewItem = () => ({ checked: false, remarks: '' });

const buildReviewChecklist = (files = {}) => {
  const checklist = { supportingDocuments: [] };
  REVIEWABLE_SINGLE_FIELDS.forEach((field) => {
    checklist[field] = createEmptyReviewItem();
  });
  checklist.supportingDocuments = Array.isArray(files.supportingDocuments)
    ? files.supportingDocuments.filter(fileExists).map(() => createEmptyReviewItem())
    : [];
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

  const totalSupporting = Array.isArray(files.supportingDocuments)
    ? files.supportingDocuments.filter(fileExists).length
    : 0;
  checklist.supportingDocuments = Array.from({ length: totalSupporting }, (_, index) => {
    const source = payload?.supportingDocuments?.[index] || existingChecklist?.supportingDocuments?.[index] || {};
    return {
      checked: Boolean(source.checked),
      remarks: String(source.remarks || '').trim(),
    };
  });

  return checklist;
};

const isReviewChecklistComplete = (files = {}, reviewChecklist = {}) => {
  for (const field of REVIEWABLE_SINGLE_FIELDS) {
    if (fileExists(files[field]) && !reviewChecklist?.[field]?.checked) {
      return false;
    }
  }

  const supportingDocuments = Array.isArray(files.supportingDocuments)
    ? files.supportingDocuments.filter(fileExists)
    : [];

  return supportingDocuments.every((_, index) => reviewChecklist?.supportingDocuments?.[index]?.checked);
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
  map.supportingDocuments = req.files?.supportingDocuments || [];
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
  if (uploadedFiles.presentationPdf && !isPdf(uploadedFiles.presentationPdf)) return 'Presentation PDF must be a PDF file';
  if (uploadedFiles.forInformationProposalPdf && !isPdf(uploadedFiles.forInformationProposalPdf)) return 'Proposal PDF must be a PDF file';
  if (uploadedFiles.legalEndorsementPdf && !isPdf(uploadedFiles.legalEndorsementPdf)) return 'Legal Endorsement must be a PDF file';
  if (uploadedFiles.vpafFanCertificationPdf && !isPdf(uploadedFiles.vpafFanCertificationPdf)) return 'VPAF/FMS Certification must be a PDF file';
  if (uploadedFiles.vpaaAcademicCouncilPdf && !isPdf(uploadedFiles.vpaaAcademicCouncilPdf)) return 'VPAA/Administrative Council must be a PDF file';
  if (uploadedFiles.vprgesProductionCouncilPdf && !isPdf(uploadedFiles.vprgesProductionCouncilPdf)) return 'VPRGES/Production Council must be a PDF file';
  if (uploadedFiles.vprdeUrdecPdf && !isPdf(uploadedFiles.vprdeUrdecPdf)) return 'VPRDE/URDEC must be a PDF file';
  if (uploadedFiles.supportingDocuments.some((item) => !ALLOWED_MIMES.includes(item.mimetype))) return 'Supporting documents must be PDF or Word files';

  const pdfFields = [
    ['Executive Brief PDF', uploadedFiles.executiveBriefPdf],
    ['Proposal PDF', uploadedFiles.proposalPdf],
    ['Presentation PDF', uploadedFiles.presentationPdf],
    ['For Information Proposal PDF', uploadedFiles.forInformationProposalPdf],
    ['Legal Endorsement', uploadedFiles.legalEndorsementPdf],
    ['VPAF/FMS Certification', uploadedFiles.vpafFanCertificationPdf],
    ['VPAA/Administrative Council', uploadedFiles.vpaaAcademicCouncilPdf],
    ['VPRGES/Production Council', uploadedFiles.vprgesProductionCouncilPdf],
    ['VPRDE/URDEC', uploadedFiles.vprdeUrdecPdf],
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

  for (const file of uploadedFiles.supportingDocuments) {
    if (isPdf(file) && !isPdfBuffer(file)) return 'One of the supporting documents is not a valid PDF file';
    if (isWord(file) && !isWordBuffer(file)) return 'One of the supporting documents is not a valid Word file';
  }

  return null;
};

const mergeFiles = async (existingFiles = {}, uploadedFiles = {}, proposalType = '') => {
  const merged = clonePacketFiles(existingFiles);

  if (proposalType === 'For Information') {
    merged.executiveBriefPdf = {};
    merged.executiveBriefWord = {};
    merged.proposalPdf = {};
    merged.proposalWord = {};
    merged.supportingDocuments = [];
    merged.legalEndorsementPdf = {};
    merged.vpafFanCertificationPdf = {};
    merged.vpaaAcademicCouncilPdf = {};
    merged.vprgesProductionCouncilPdf = {};
    merged.vprdeUrdecPdf = {};
  } else {
    merged.presentationPdf = {};
    merged.forInformationProposalPdf = {};
  }

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

  if (uploadedFiles.supportingDocuments?.length) {
    const supportingDocuments = [];
    for (const file of uploadedFiles.supportingDocuments) {
      const s3Key = await uploadToS3(file.originalname, file.buffer, file.mimetype);
      supportingDocuments.push({
        filename: file.originalname,
        data: s3Key ? undefined : file.buffer,
        s3Key: s3Key || undefined,
        contentType: file.mimetype,
        uploadedAt: new Date(),
      });
    }
    merged.supportingDocuments = supportingDocuments;
  }

  return merged;
};

const validateSubmissionPayload = ({ body, mergedFiles, requireAnyUpload }) => {
  const documentTitle = String(body.documentTitle || '').trim();
  const proposalType = String(body.proposalType || '').trim();

  if (!documentTitle || !proposalType) {
    return 'Proposal title and proposal type are required';
  }
  if (!PROPOSAL_TYPES.includes(proposalType)) {
    return 'Invalid proposal type';
  }
  if (proposalType === 'For Information') {
    if (!fileExists(mergedFiles.presentationPdf) && !fileExists(mergedFiles.forInformationProposalPdf)) {
      return 'At least one of Presentation PDF or Proposal PDF is required';
    }
  }

  if (requireAnyUpload) {
    const hasAny = SINGLE_FILE_FIELDS.some((field) => fileExists(mergedFiles[field])) || mergedFiles.supportingDocuments?.length;
    if (!hasAny) return 'At least one file must be uploaded';
  }

  if (proposalType !== 'For Information') {
    if (!fileExists(mergedFiles.executiveBriefPdf)) return 'Executive Brief PDF is required';
    if (!fileExists(mergedFiles.executiveBriefWord)) return 'Executive Brief Word file is required';
    if (!fileExists(mergedFiles.proposalPdf)) return 'Proposal PDF is required';
    if (!fileExists(mergedFiles.proposalWord)) return 'Proposal Word file is required';
  }
  if (proposalType !== 'For Information') {
    if (!fileExists(mergedFiles.legalEndorsementPdf)) return 'Legal Endorsement PDF is required';
    if (!fileExists(mergedFiles.vpafFanCertificationPdf)) return 'VPAF/FMS Certification PDF is required';
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
    'legalEndorsementPdf',
    'vpafFanCertificationPdf',
    'proposalWord',
    'executiveBriefWord',
  ];
  return priority.find((field) => fileExists(submission.files?.[field])) || null;
};

const getFileFromPacket = (packetFiles, key, index) => {
  if (!packetFiles) return null;
  if (key === 'supportingDocuments') {
    return Array.isArray(packetFiles.supportingDocuments) ? packetFiles.supportingDocuments[index] || null : null;
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

    if (SINGLE_FILE_FIELDS.some((field) => fileExists(submission.files?.[field])) || submission.files?.supportingDocuments?.length) {
      submission.packetHistory.push({
        version: submission.packetVersion || 1,
        uploadedAt: new Date(),
        files: stripPacketFiles(submission.files),
      });
    }

    submission.documentTitle = String(body.documentTitle || '').trim();
    submission.proposalType = proposalType;
    submission.forInformationType = '';
    submission.files = mergedFiles;
    submission.reviewChecklist = buildReviewChecklist(mergedFiles);
    submission.packetVersion = (submission.packetVersion || 1) + 1;
    submission.status = 'Pending';
    submission.remarks = '';
    submission.returnedBy = actorFromUser(null);

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
    const { remarks } = req.body;
    if (!remarks) return res.status(400).json({ message: 'Remarks are required when returning a submission' });

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    submission.status = 'Returned';
    submission.remarks = remarks;
    submission.returnedBy = actorFromUser(req.user);
    await submission.save();

    const councilUsers = await User.find({ role: 'council', councilId: submission.councilId, isActive: true }).select('_id');
    await Promise.all(councilUsers.map((user) => createNotification({
      userId: user._id,
      type: 'SUBMISSION_RETURNED',
      title: 'Submission returned',
      message: `${submission.documentTitle} was returned for revision.`,
      meta: { submissionId: submission._id, remarks },
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

    submission.reviewChecklist = reviewChecklist;
    if (typeof req.body.remarks === 'string') {
      submission.remarks = req.body.remarks.trim();
    }

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