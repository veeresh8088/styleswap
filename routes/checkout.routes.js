const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { protect, forbidAdmin } = require('../middleware/auth.middleware');

// All checkout routes require authentication and regular user role
router.use(protect, forbidAdmin);

// Order Success Receipt Page
router.get('/success/:transactionId', transactionController.renderOrderSuccess);

// Swap Courier & Cash Difference Checkout
router.get('/swap/:transactionId', transactionController.renderSwapCheckout);
router.post('/swap/:transactionId', transactionController.processSwapCheckout);

// Direct Product Checkout & Payment
router.get('/:listingId', transactionController.renderCheckout);
router.post('/:listingId', transactionController.processCheckout);

module.exports = router;
