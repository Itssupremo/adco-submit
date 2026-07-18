const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotificationEmail } = require('./emailHelper');

const createNotification = async ({ userId, type, title, message, meta = {} }) => {
  if (!userId) return null;
  const user = await User.findById(userId).select('email fullname');
  if (user && user.email) {
    // Send email asynchronously in the background
    sendNotificationEmail(
      user.email,
      `New Notification: ${title}`,
      message,
      user.fullname || 'User'
    );
  }
  return Notification.create({ userId, type, title, message, meta });
};

const createNotificationsForRole = async ({ role, type, title, message, meta = {} }) => {
  const users = await User.find({ role, isActive: true }).select('_id email fullname');
  if (!users.length) return [];
  
  users.forEach((user) => {
    if (user.email) {
      sendNotificationEmail(
        user.email,
        `New Notification: ${title}`,
        message,
        user.fullname || 'User'
      );
    }
  });

  return Notification.insertMany(users.map((user) => ({ userId: user._id, type, title, message, meta })));
};

module.exports = { createNotification, createNotificationsForRole };