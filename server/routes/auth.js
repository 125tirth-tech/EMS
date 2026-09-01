const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/set-password', authController.setPassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/register', authenticate, roleCheck('admin', 'hr'), authController.register);

module.exports = router;
