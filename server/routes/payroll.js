const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payrollController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(authenticate);

// All roles can view (employees see only their own via controller logic)
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Admin/HR only
router.post('/generate', roleCheck('admin', 'hr'), ctrl.generate);
router.post('/generate-all', roleCheck('admin', 'hr'), ctrl.generateAll);
router.put('/:id', roleCheck('admin', 'hr'), ctrl.update);
router.delete('/:id', roleCheck('admin'), ctrl.remove);

module.exports = router;
