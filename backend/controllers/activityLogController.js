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

exports.clearAllLogs = async (req, res) => {
  try {
    await ActivityLog.deleteMany({});
    res.json({ message: 'All activity logs have been cleared successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
