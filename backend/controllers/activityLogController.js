const ActivityLog = require('../models/ActivityLog');

exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(1000);

    res.json(logs);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
