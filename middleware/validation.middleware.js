const { body, validationResult } = require('express-validator');
const { CONDITIONS, LISTING_TYPES } = require('../config/constants');

// Generic helper to format errors or pass to next
const handleValidationErrors = (redirectUrl = null) => {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((err) => err.msg);

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(422).json({
          success: false,
          errors: errorMessages
        });
      }

      req.flash('error', errorMessages.join(' '));
      const target = redirectUrl || req.header('Referer') || '/';
      return res.redirect(target);
    }
    next();
  };
};

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 60 })
    .withMessage('Name cannot exceed 60 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim(),
  handleValidationErrors('/auth/register')
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors('/auth/login')
];

const listingValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Listing title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters long'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Please select a category'),
  body('price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('condition')
    .isIn(CONDITIONS)
    .withMessage('Please select a valid item condition'),
  body('type')
    .isIn(Object.values(LISTING_TYPES))
    .withMessage('Please select a valid listing type (Sell, Exchange, or Both)'),
  handleValidationErrors()
];

const profileValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 60 })
    .withMessage('Name cannot exceed 60 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim(),
  body('bio')
    .optional({ checkFalsy: true })
    .isLength({ max: 300 })
    .withMessage('Bio cannot exceed 300 characters'),
  handleValidationErrors('/user/profile')
];

const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match');
      }
      return true;
    }),
  handleValidationErrors('/user/profile#security')
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  listingValidation,
  profileValidation,
  passwordChangeValidation
};
