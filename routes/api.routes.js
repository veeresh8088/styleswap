const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const listingController = require('../controllers/listing.controller');
const transactionController = require('../controllers/transaction.controller');
const adminController = require('../controllers/admin.controller');

const { protect, forbidAdmin } = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/isAdmin.middleware');
const upload = require('../middleware/upload.middleware');
const {
  registerValidation,
  loginValidation,
  listingValidation
} = require('../middleware/validation.middleware');

// --- Auth Endpoints ---
router.post('/auth/register', upload.single('profileImage'), registerValidation, authController.register);
router.post('/auth/login', loginValidation, authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', protect, authController.apiMe);

// --- Listings Endpoints ---
router.get('/listings', listingController.getListings);
router.post('/listings/ai-recommendation', listingController.getAIRecommendation);
router.get('/listings/:id', listingController.getListingById);
router.post('/listings', protect, forbidAdmin, upload.array('images', 5), listingValidation, listingController.createListing);
router.put('/listings/:id', protect, forbidAdmin, upload.array('images', 5), listingController.updateListing);
router.delete('/listings/:id', protect, forbidAdmin, listingController.deleteListing);

// --- Transactions Endpoints ---
router.post('/transactions/buy', protect, forbidAdmin, transactionController.buyListing);
router.post('/transactions/exchange', protect, forbidAdmin, transactionController.proposeExchange);
router.put('/transactions/:id/respond', protect, forbidAdmin, transactionController.respondToExchange);
router.post('/transactions/:id/respond', protect, forbidAdmin, transactionController.respondToExchange);
router.post('/transactions/:id/accept', protect, forbidAdmin, (req, res, next) => { req.body.action = 'accept'; return transactionController.respondToExchange(req, res, next); });
router.put('/transactions/:id/accept', protect, forbidAdmin, (req, res, next) => { req.body.action = 'accept'; return transactionController.respondToExchange(req, res, next); });
router.post('/transactions/:id/reject', protect, forbidAdmin, (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.put('/transactions/:id/reject', protect, forbidAdmin, (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.post('/transactions/:id/decline', protect, forbidAdmin, (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.put('/transactions/:id/decline', protect, forbidAdmin, (req, res, next) => { req.body.action = 'reject'; return transactionController.respondToExchange(req, res, next); });
router.post('/transactions/:id/cancel', protect, forbidAdmin, (req, res, next) => { req.body.action = 'cancel'; return transactionController.respondToExchange(req, res, next); });
router.put('/transactions/:id/cancel', protect, forbidAdmin, (req, res, next) => { req.body.action = 'cancel'; return transactionController.respondToExchange(req, res, next); });
router.all('/transactions/:id/:action', protect, forbidAdmin, transactionController.respondToExchange);

// --- Admin Endpoints ---
router.get('/admin/stats', protect, isAdmin, adminController.getDashboard);
router.get('/admin/users', protect, isAdmin, adminController.getUsers);
router.put('/admin/users/:id/ban', protect, isAdmin, adminController.toggleUserBan);
router.get('/admin/listings', protect, isAdmin, adminController.getListings);
router.put('/admin/listings/:id/approve', protect, isAdmin, adminController.approveListing);
router.delete('/admin/listings/:id', protect, isAdmin, adminController.deleteListingAdmin);
router.get('/admin/transactions', protect, isAdmin, adminController.getTransactions);
router.put('/admin/transactions/:id/status', protect, isAdmin, adminController.updateOrderStatus);
router.post('/admin/transactions/:id/status', protect, isAdmin, adminController.updateOrderStatus);

module.exports = router;

