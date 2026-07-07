const User = require('../models/User');
const Council = require('../models/Council');
const { logActivity } = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationHelper');

const sanitizeUser = (user) => {
  const plain = user.toObject ? user.toObject() : { ...user };
  delete plain.password;
  return plain;
};

const ensureCouncilIfNeeded = async (role, councilId) => {
  if (role === 'council') {
    if (!councilId) return 'Council user must be assigned to a council';
    const council = await Council.findById(councilId);
    if (!council) return 'Assigned council not found';
  }
  return null;
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('councilId', 'councilName abbreviation')
      .sort({ role: 1, fullname: 1 });
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSelf = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
      user.username = username;
    }
    if (email !== undefined) user.email = String(email || '').trim().toLowerCase();
    if (password) user.password = password;

    await user.save();
    if (password) {
      await createNotification({
        userId: user._id,
        type: 'PASSWORD_CHANGED',
        title: 'Password changed',
        message: 'Your account password was changed successfully.',
      });
    }

    logActivity(req, 'UPDATE_USER_SELF', 'User updated their own profile settings');
    res.json(sanitizeUser(user));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { fullname, username, password, email, role, councilId, isActive } = req.body;
    if (!fullname || !username || !password || !role) {
      return res.status(400).json({ message: 'Fullname, username, password, and role are required' });
    }
    if (!['board', 'council', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already taken' });

    const councilError = await ensureCouncilIfNeeded(role, councilId);
    if (councilError) return res.status(400).json({ message: councilError });

    const user = await User.create({
      fullname,
      username,
      password,
      email: String(email || '').trim().toLowerCase(),
      role,
      councilId: role === 'council' ? councilId : null,
      isActive: isActive !== false,
    });

    await createNotification({
      userId: user._id,
      type: 'ACCOUNT_CREATED',
      title: 'Account created',
      message: 'Your account has been created. You can now sign in.',
    });

    logActivity(req, 'CREATE_USER', `Created user account: ${user.username} (${user.role})`);
    res.status(201).json(sanitizeUser(user));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { fullname, username, email, role, councilId, isActive, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
      user.username = username;
    }

    const nextRole = role || user.role;
    const nextCouncilId = nextRole === 'council' ? (councilId ?? user.councilId) : null;
    const councilError = await ensureCouncilIfNeeded(nextRole, nextCouncilId);
    if (councilError) return res.status(400).json({ message: councilError });

    if (fullname !== undefined) user.fullname = fullname;
    if (email !== undefined) user.email = String(email || '').trim().toLowerCase();
    if (role) user.role = role;
    user.councilId = nextRole === 'council' ? nextCouncilId : null;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) user.password = password;

    await user.save();
    logActivity(req, 'UPDATE_USER', `Updated user account: ${user.username} (${user.role})`);
    res.json(sanitizeUser(user));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    logActivity(req, 'DELETE_USER', `Deleted user account: ${user.username} (${user.role})`);
    res.json({ message: 'User deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    await user.save();

    await createNotification({
      userId: user._id,
      type: 'PASSWORD_RESET',
      title: 'Password reset',
      message: 'Your password was reset by the Super Admin. Please sign in using the new password.',
    });

    logActivity(req, 'RESET_PASSWORD', `Reset password for ${user.username}`);
    res.json({ message: 'Password reset successful' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};