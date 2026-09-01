const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/documentController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id/download', ctrl.download);

// Upload/delete - admin/HR or document owner
router.post('/upload', ctrl.upload);
router.delete('/:id', roleCheck('admin', 'hr'), ctrl.remove);

module.exports = router;
