const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename:    { type: String, default: '' },
  data:        { type: Buffer },
  s3Key:       { type: String },
  contentType: { type: String, default: 'application/pdf' },
  uploadedAt:  { type: Date },
  version:     { type: Number, default: 0 },
}, { _id: false });

const agendaSchema = new mongoose.Schema({
  sucId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Suc', required: true },
  sucName:  { type: String, required: true },
  year:     { type: Number, required: true },
  quarter:  { type: String, enum: ['1st', '2nd', '3rd', '4th'], required: true },
  oldAgenda:        { type: fileSchema, default: () => ({}) },
  oldAgendaHistory: { type: [fileSchema], default: [] },
  newAgenda:        { type: fileSchema, default: () => ({}) },
  newAgendaHistory: { type: [fileSchema], default: [] },
}, { timestamps: true });

// Each SUC can have only one document per year+quarter
agendaSchema.index({ sucId: 1, year: 1, quarter: 1 }, { unique: true });

module.exports = mongoose.model('Agenda', agendaSchema);
