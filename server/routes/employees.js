const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require authentication
router.use(authenticate);

// Stats must come before :id route
router.get('/stats', employeeController.getStats);

// Department list
router.get('/departments', employeeController.getDepartments);

// CRUD
router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getById);
router.post('/', roleCheck('admin', 'hr'), employeeController.create);
router.put('/:id', roleCheck('admin', 'hr'), employeeController.update);
router.delete('/:id', roleCheck('admin'), employeeController.remove);

module.exports = router;
