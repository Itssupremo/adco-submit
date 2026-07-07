const express = require('express');
const router = express.Router();
const { getSubmissionReports } = require('../controllers/reportController');
const { authenticate, boardOrSuperAdmin } = require('../middleware/auth');

router.get('/submissions', authenticate, boardOrSuperAdmin, getSubmissionReports);

module.exports = router;