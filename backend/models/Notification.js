const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, required: true, trim: true },
  title:    { type: String, required: true, trim: true },
  message:  { type: String, required: true, trim: true },
  isRead:   { type: Boolean, default: false },
  meta:     { type: Object, default: {} },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);