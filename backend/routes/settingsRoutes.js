const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticate, superAdminOnly } = require('../middleware/auth');

router.get('/', authenticate, superAdminOnly, getSettings);
router.put('/', authenticate, superAdminOnly, updateSettings);

module.exports = router;