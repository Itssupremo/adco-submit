const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityLogController');
const { authenticate, boardOrSuperAdmin } = require('../middleware/auth');

router.get('/', authenticate, boardOrSuperAdmin, getActivityLogs);

module.exports = router;
