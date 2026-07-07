const Notification = require('../models/Notification');
const User = require('../models/User');

const createNotification = async ({ userId, type, title, message, meta = {} }) => {
  if (!userId) return null;
  return Notification.create({ userId, type, title, message, meta });
};

const createNotificationsForRole = async ({ role, type, title, message, meta = {} }) => {
  const users = await User.find({ role, isActive: true }).select('_id');
  if (!users.length) return [];
  return Notification.insertMany(users.map((user) => ({ userId: user._id, type, title, message, meta })));
};

module.exports = { createNotification, createNotificationsForRole };