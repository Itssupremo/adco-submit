const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead, clearAllNotifications } = require('../controllers/notificationController');
const { authenticate, superAdminOnly } = require('../middleware/auth');

router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllAsRead);
router.put('/:id/read', authenticate, markAsRead);
router.delete('/clear', authenticate, superAdminOnly, clearAllNotifications);

module.exports = router;