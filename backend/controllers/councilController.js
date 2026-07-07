const Council = require('../models/Council');
const { logActivity } = require('../utils/activityLogger');

exports.getCouncils = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'council' && req.user.councilId) {
      filter = { _id: req.user.councilId };
    }
    const councils = await Council.find(filter).sort({ councilName: 1 });
    res.json(councils);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createCouncil = async (req, res) => {
  try {
    const { councilName, abbreviation, contactEmail, contactNumber, status } = req.body;
    if (!councilName || !abbreviation) {
      return res.status(400).json({ message: 'Council name and abbreviation are required' });
    }
    const council = await Council.create({ councilName, abbreviation, contactEmail, contactNumber, status });
    logActivity(req, 'CREATE_COUNCIL', `Created council: ${council.councilName}`);
    res.status(201).json(council);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Abbreviation already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCouncil = async (req, res) => {
  try {
    const council = await Council.findById(req.params.id);
    if (!council) return res.status(404).json({ message: 'Council not found' });

    const { councilName, abbreviation, contactEmail, contactNumber, status } = req.body;
    if (councilName !== undefined) council.councilName = councilName;
    if (abbreviation !== undefined) council.abbreviation = abbreviation;
    if (contactEmail !== undefined) council.contactEmail = contactEmail;
    if (contactNumber !== undefined) council.contactNumber = contactNumber;
    if (status !== undefined) council.status = status;
    await council.save();

    logActivity(req, 'UPDATE_COUNCIL', `Updated council: ${council.councilName}`);
    res.json(council);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Abbreviation already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCouncil = async (req, res) => {
  try {
    const council = await Council.findByIdAndDelete(req.params.id);
    if (!council) return res.status(404).json({ message: 'Council not found' });
    logActivity(req, 'DELETE_COUNCIL', `Deleted council: ${council.councilName}`);
    res.json({ message: 'Council deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};