const jwt = require('jsonwebtoken');
const User = require('../models/User');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    if (!password || (!normalizedUsername && !normalizedEmail)) {
      return res.status(400).json({ message: 'Credentials are required' });
    }
    let user;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ username: new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i') });
    }
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || '',
        fullname: user.fullname,
        role: user.role,
        occCode: user.occCode || '',
        sucAbbreviation: user.sucAbbreviation || '',
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.loginByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.email) return res.status(401).json({ message: 'No account found with that email address.' });

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || '',
        fullname: user.fullname,
        role: user.role,
        occCode: user.occCode || '',
        sucAbbreviation: user.sucAbbreviation || '',
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
