const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');
const {
  registerValidation,
  loginValidation
} = require('../middleware/validation.middleware');

// --- Web UI Routes ---
router.get('/login', authController.renderLogin);
router.post('/login', loginValidation, authController.login);

router.get('/register', authController.renderRegister);
router.post('/register', upload.single('profileImage'), registerValidation, authController.register);

router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.forgotPassword);

router.get('/reset-password/:token', authController.renderResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
