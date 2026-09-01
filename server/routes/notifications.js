const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/unread-count', ctrl.getUnreadCount);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

// Admin only - send notifications
router.post('/', roleCheck('admin', 'hr'), ctrl.create);

module.exports = router;
