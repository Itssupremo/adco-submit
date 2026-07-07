const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Council = require('../models/Council');
const { logActivityDirect } = require('../utils/activityLogger');
const {
  isLocalAuthEnabled,
  sanitizeUser,
  findLocalUserByUsername,
  findLocalUserByEmail,
} = require('../utils/localAuth');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const buildUserPayload = async (user) => {
  let councilName = user?.councilName || '';
  if (!councilName && user?.councilId) {
    const council = await Council.findById(user.councilId).select('councilName');
    councilName = council?.councilName || '';
  }

  return {
    id: user._id,
    _id: user._id,
    username: user.username,
    email: user.email || '',
    fullname: user.fullname,
    role: user.role,
    councilId: user.councilId || null,
    councilName,
    isActive: user.isActive,
  };
};

exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    if (!password || (!normalizedUsername && !normalizedEmail)) {
      return res.status(400).json({ message: 'Credentials are required' });
    }

    if (isLocalAuthEnabled()) {
      const user = normalizedEmail
        ? findLocalUserByEmail(normalizedEmail)
        : findLocalUserByUsername(normalizedUsername);

      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

      const token = generateToken(user);
      logActivityDirect(user, 'LOGIN', 'User logged in successfully via local auth mode', req);
      return res.json({ token, user: await buildUserPayload(sanitizeUser(user)) });
    }

    let user;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ username: new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i') });
    }
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    logActivityDirect(user, 'LOGIN', 'User logged in successfully via standard credentials', req);
    res.json({ token, user: await buildUserPayload(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.loginByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    if (isLocalAuthEnabled()) {
      const user = findLocalUserByEmail(email);
      if (!user || !user.email) return res.status(401).json({ message: 'No account found with that email address.' });
      if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

      const token = generateToken(user);
      logActivityDirect(user, 'LOGIN', 'User logged in successfully via local auth email mode', req);
      return res.json({ token, user: await buildUserPayload(sanitizeUser(user)) });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.email) return res.status(401).json({ message: 'No account found with that email address.' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

    const token = generateToken(user);
    logActivityDirect(user, 'LOGIN', 'User logged in successfully via email credentials', req);
    res.json({ token, user: await buildUserPayload(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: await buildUserPayload(req.user) });
};
