const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(authenticate);

// Employee routes
router.post('/apply', ctrl.apply);
router.get('/my-leaves', ctrl.getMyLeaves);
router.delete('/:id', ctrl.cancel);

// Admin/HR routes
router.get('/all', roleCheck('admin', 'hr'), ctrl.getAll);
router.put('/:id/approve', roleCheck('admin', 'hr'), ctrl.approve);
router.put('/:id/reject', roleCheck('admin', 'hr'), ctrl.reject);

module.exports = router;
