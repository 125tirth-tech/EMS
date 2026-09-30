const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aiController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(authenticate);

// Chat & History (All authenticated users)
router.post('/chat', ctrl.chat);
router.get('/history', ctrl.getHistory);
router.delete('/history', ctrl.clearHistory);
router.get('/policies', ctrl.getPolicies);

// HR Innovation Hub (Admin & HR)
router.get('/burnout-risk', roleCheck('admin', 'hr'), ctrl.getBurnoutRisk);
router.post('/generate', roleCheck('admin', 'hr'), ctrl.generateContent);

module.exports = router;

