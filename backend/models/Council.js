const mongoose = require('mongoose');

const councilSchema = new mongoose.Schema({
  councilName:   { type: String, required: true, trim: true },
  abbreviation:  { type: String, required: true, trim: true, unique: true },
  contactEmail:  { type: String, trim: true, default: '' },
  contactNumber: { type: String, trim: true, default: '' },
  status:        { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('Council', councilSchema);