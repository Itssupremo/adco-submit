const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  authenticateOrQuery,
  getSubmissions,
  getMyCurrentSubmission,
  getSubmissionById,
  createSubmission,
  replaceSubmission,
  updateSubmissionReview,
  approveSubmission,
  returnSubmission,
  archiveSubmission,
  deleteSubmission,
  serveFile,
} = require('../controllers/submissionController');
const { authenticate, councilOnly, boardOnly, superAdminOnly, boardOrSuperAdmin } = require('../middleware/auth');

router.get('/', authenticate, getSubmissions);
router.get('/my-current', authenticate, councilOnly, getMyCurrentSubmission);
router.get('/file/:id', authenticateOrQuery, serveFile);
router.get('/:id', authenticate, getSubmissionById);
router.post('/', authenticate, councilOnly, uploadMiddleware, createSubmission);
router.put('/:id/replace', authenticate, councilOnly, uploadMiddleware, replaceSubmission);
router.put('/:id/review', authenticate, boardOrSuperAdmin, updateSubmissionReview);
router.put('/:id/approve', authenticate, boardOrSuperAdmin, approveSubmission);
router.put('/:id/return', authenticate, boardOrSuperAdmin, returnSubmission);
router.put('/:id/archive', authenticate, superAdminOnly, archiveSubmission);
router.delete('/:id', authenticate, boardOrSuperAdmin, deleteSubmission);

module.exports = router;