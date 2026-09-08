const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { protect } = require('../middleware/auth.middleware');

// Protect all transaction routes
router.use(protect);

// Buy Route
router.post('/buy', transactionController.buyListing);

// Exchange Routes
router.post('/exchange', transactionController.proposeExchange);
router.post('/:id/respond', transactionController.respondToExchange);
router.put('/:id/respond', transactionController.respondToExchange);

module.exports = router;
