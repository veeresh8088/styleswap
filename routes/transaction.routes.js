const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { protect, forbidAdmin } = require('../middleware/auth.middleware');

// Protect all transaction routes (users only)
router.use(protect, forbidAdmin);

// Buy Route
router.post('/buy', transactionController.buyListing);

// Exchange Routes
router.post('/exchange', transactionController.proposeExchange);
router.post('/:id/respond', transactionController.respondToExchange);
router.put('/:id/respond', transactionController.respondToExchange);
router.post('/:id/accept', (req, res, next) => { req.body.action = 'accept'; return transactionController.respondToExchange(req, res, next); });
router.put('/:id/accept', (req, res, next) => { req.body.action = 'accept'; return transactionController.respondToExchange(req, res, next); });
router.post('/:id/reject', (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.put('/:id/reject', (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.post('/:id/decline', (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.put('/:id/decline', (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.post('/:id/cancel', (req, res, next) => { req.body.action = 'cancel'; return transactionController.respondToExchange(req, res, next); });
router.put('/:id/cancel', (req, res, next) => { req.body.action = 'cancel'; return transactionController.respondToExchange(req, res, next); });
router.all('/:id/:action', transactionController.respondToExchange);

module.exports = router;
