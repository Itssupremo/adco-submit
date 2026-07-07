const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, updateSelf, createUser, deleteUser, resetPassword } = require('../controllers/userController');
const { authenticate, superAdminOnly, boardOrSuperAdmin } = require('../middleware/auth');

// Any authenticated user can update their own profile (email, username, password)
router.put('/me', authenticate, updateSelf);

router.get('/', authenticate, boardOrSuperAdmin, getAllUsers);
router.post('/', authenticate, superAdminOnly, createUser);
router.put('/:id', authenticate, superAdminOnly, updateUser);
router.delete('/:id', authenticate, superAdminOnly, deleteUser);
router.post('/:id/reset-password', authenticate, superAdminOnly, resetPassword);

module.exports = router;
