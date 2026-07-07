const express = require('express');
const router = express.Router();
const { getCouncils, createCouncil, updateCouncil, deleteCouncil } = require('../controllers/councilController');
const { authenticate, superAdminOnly, boardOrSuperAdmin } = require('../middleware/auth');

router.get('/', authenticate, boardOrSuperAdmin, getCouncils);
router.post('/', authenticate, superAdminOnly, createCouncil);
router.put('/:id', authenticate, superAdminOnly, updateCouncil);
router.delete('/:id', authenticate, superAdminOnly, deleteCouncil);

module.exports = router;