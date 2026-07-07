const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: { type: String, default: '' },
  data: { type: Buffer },
  s3Key: { type: String },
  contentType: { type: String, default: 'application/pdf' },
  uploadedAt: { type: Date },
}, { _id: false });

const packetFilesSchema = new mongoose.Schema({
  executiveBriefPdf: { type: fileSchema, default: () => ({}) },
  executiveBriefWord: { type: fileSchema, default: () => ({}) },
  proposalPdf: { type: fileSchema, default: () => ({}) },
  proposalWord: { type: fileSchema, default: () => ({}) },
  presentationPdf: { type: fileSchema, default: () => ({}) },
  forInformationProposalPdf: { type: fileSchema, default: () => ({}) },
  supportingDocuments: { type: [fileSchema], default: [] },
  legalEndorsementPdf: { type: fileSchema, default: () => ({}) },
  vpafFanCertificationPdf: { type: fileSchema, default: () => ({}) },
  vpaaAcademicCouncilPdf: { type: fileSchema, default: () => ({}) },
  vprgesProductionCouncilPdf: { type: fileSchema, default: () => ({}) },
  vprdeUrdecPdf: { type: fileSchema, default: () => ({}) },
}, { _id: false });

const packetSnapshotSchema = new mongoose.Schema({
  version: { type: Number, default: 1 },
  uploadedAt: { type: Date, default: Date.now },
  files: { type: packetFilesSchema, default: () => ({}) },
}, { _id: false });

const actorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  username: { type: String, trim: true, default: '' },
  fullname: { type: String, trim: true, default: '' },
}, { _id: false });

const reviewItemSchema = new mongoose.Schema({
  checked: { type: Boolean, default: false },
  remarks: { type: String, trim: true, default: '' },
}, { _id: false });

const reviewChecklistSchema = new mongoose.Schema({
  executiveBriefPdf: { type: reviewItemSchema, default: () => ({}) },
  executiveBriefWord: { type: reviewItemSchema, default: () => ({}) },
  proposalPdf: { type: reviewItemSchema, default: () => ({}) },
  proposalWord: { type: reviewItemSchema, default: () => ({}) },
  presentationPdf: { type: reviewItemSchema, default: () => ({}) },
  forInformationProposalPdf: { type: reviewItemSchema, default: () => ({}) },
  supportingDocuments: { type: [reviewItemSchema], default: [] },
  legalEndorsementPdf: { type: reviewItemSchema, default: () => ({}) },
  vpafFanCertificationPdf: { type: reviewItemSchema, default: () => ({}) },
  vpaaAcademicCouncilPdf: { type: reviewItemSchema, default: () => ({}) },
  vprgesProductionCouncilPdf: { type: reviewItemSchema, default: () => ({}) },
  vprdeUrdecPdf: { type: reviewItemSchema, default: () => ({}) },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  councilId: { type: mongoose.Schema.Types.ObjectId, ref: 'Council', required: true },
  councilName: { type: String, required: true, trim: true },
  collegeUnit: { type: String, required: true, trim: true },
  documentTitle: { type: String, required: true, trim: true },
  proposalType: {
    type: String,
    enum: ['Academic', 'Research & Extension', 'Administrative', 'Finance', 'Projects', 'MOH/ MOU/ Deed of Donation/ Usufruct', 'For Information'],
    required: true,
  },
  forInformationType: { type: String, trim: true, default: '' },
  meetingDate: { type: String, trim: true, default: '' },
  submissionDate: { type: String, trim: true, default: '' },
  remarks: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Pending', 'Returned', 'Approved', 'Archived'], default: 'Pending' },
  files: { type: packetFilesSchema, default: () => ({}) },
  reviewChecklist: { type: reviewChecklistSchema, default: () => ({}) },
  packetVersion: { type: Number, default: 1 },
  packetHistory: { type: [packetSnapshotSchema], default: [] },
  submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: actorSchema, default: () => ({}) },
  returnedBy: { type: actorSchema, default: () => ({}) },
  archivedBy: { type: actorSchema, default: () => ({}) },
}, { timestamps: true });

submissionSchema.index({ councilId: 1, status: 1 });
submissionSchema.index({ status: 1, submissionDate: -1 });
submissionSchema.index({ proposalType: 1, submissionDate: -1 });

module.exports = mongoose.model('Submission', submissionSchema);