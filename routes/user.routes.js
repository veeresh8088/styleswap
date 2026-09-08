const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');
const {
  profileValidation,
  passwordChangeValidation
} = require('../middleware/validation.middleware');

// Public profile view
router.get('/:id/profile', userController.getPublicUserProfile);

// Protected User Area
router.get('/dashboard', protect, userController.getDashboard);
router.get('/profile', protect, userController.renderProfile);
router.post('/profile', protect, upload.single('profileImage'), profileValidation, userController.updateProfile);
router.post('/change-password', protect, passwordChangeValidation, userController.changePassword);

module.exports = router;
