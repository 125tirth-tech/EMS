const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(authenticate);

// Employee routes
router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);
router.get('/today', ctrl.getToday);
router.get('/my-history', ctrl.getMyHistory);
router.get('/summary', ctrl.getSummary);

// Admin/HR routes
router.get('/all', roleCheck('admin', 'hr'), ctrl.getAll);
router.post('/mark', roleCheck('admin', 'hr'), ctrl.markAttendance);

module.exports = router;
