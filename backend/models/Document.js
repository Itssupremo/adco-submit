const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename:    { type: String, default: '' },
  data:        { type: Buffer },
  s3Key:       { type: String },
  contentType: { type: String, default: 'application/pdf' },
  uploadedAt:  { type: Date },
  version:     { type: Number, default: 0 },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  sucId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Suc', required: true },
  sucName:  { type: String, required: true },
  year:     { type: Number, required: true },
  pageType: { type: String, enum: ['minutes', 'special'], required: true },
  slot:     { type: String, required: true },
  file:        { type: fileSchema, default: () => ({}) },
  fileHistory: { type: [fileSchema], default: [] },
}, { timestamps: true });

documentSchema.index({ sucId: 1, year: 1, pageType: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('Document', documentSchema);
