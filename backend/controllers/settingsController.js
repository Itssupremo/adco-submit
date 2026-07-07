const SystemSetting = require('../models/SystemSetting');
const { logActivity } = require('../utils/activityLogger');

exports.getSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find({}).sort({ key: 1 });
    res.json(settings);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'items array is required' });
    }

    const updated = [];
    for (const item of items) {
      if (!item.key) continue;
      const setting = await SystemSetting.findOneAndUpdate(
        { key: item.key },
        { value: item.value, description: item.description || '' },
        { new: true, upsert: true }
      );
      updated.push(setting);
    }

    logActivity(req, 'UPDATE_SETTINGS', `Updated ${updated.length} system setting(s)`);
    res.json(updated);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};