const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isLocalAuthEnabled, findLocalUserById, sanitizeUser } = require('../utils/localAuth');

// Verify JWT token
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (isLocalAuthEnabled()) {
      const localUser = findLocalUserById(decoded.id);
      if (!localUser) return res.status(401).json({ message: 'User not found' });
      if (!localUser.isActive) return res.status(403).json({ message: 'Account is inactive' });
      req.user = sanitizeUser(localUser);
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Super Admin only
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Super Admin access required' });
  }
  next();
};

const boardOnly = (req, res, next) => {
  if (req.user.role !== 'board') {
    return res.status(403).json({ message: 'USM Board access required' });
  }
  next();
};

const councilOnly = (req, res, next) => {
  if (req.user.role !== 'council') {
    return res.status(403).json({ message: 'Administrative Council access required' });
  }
  next();
};

const boardOrSuperAdmin = (req, res, next) => {
  if (!['superadmin', 'board'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Board or Super Admin access required' });
  }
  next();
};

module.exports = {
  authenticate,
  superAdminOnly,
  boardOnly,
  councilOnly,
  boardOrSuperAdmin,
};
