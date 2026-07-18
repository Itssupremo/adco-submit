const express = require('express');
const router = express.Router();
const { getActivityLogs, clearAllLogs } = require('../controllers/activityLogController');
const { authenticate, boardOrSuperAdmin, superAdminOnly } = require('../middleware/auth');

router.get('/', authenticate, boardOrSuperAdmin, getActivityLogs);
router.delete('/clear', authenticate, superAdminOnly, clearAllLogs);

module.exports = router;
