const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const listingController = require('../controllers/listing.controller');
const transactionController = require('../controllers/transaction.controller');
const adminController = require('../controllers/admin.controller');

const { protect } = require('../middleware/auth.middleware');
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
router.post('/listings', protect, upload.array('images', 5), listingValidation, listingController.createListing);
router.put('/listings/:id', protect, upload.array('images', 5), listingController.updateListing);
router.delete('/listings/:id', protect, listingController.deleteListing);

// --- Transactions Endpoints ---
router.post('/transactions/buy', protect, transactionController.buyListing);
router.post('/transactions/exchange', protect, transactionController.proposeExchange);
router.put('/transactions/:id/respond', protect, transactionController.respondToExchange);
router.post('/transactions/:id/respond', protect, transactionController.respondToExchange);

// --- Admin Endpoints ---
router.get('/admin/stats', protect, isAdmin, adminController.getDashboard);
router.get('/admin/users', protect, isAdmin, adminController.getUsers);
router.put('/admin/users/:id/ban', protect, isAdmin, adminController.toggleUserBan);
router.get('/admin/listings', protect, isAdmin, adminController.getListings);
router.put('/admin/listings/:id/approve', protect, isAdmin, adminController.approveListing);
router.delete('/admin/listings/:id', protect, isAdmin, adminController.deleteListingAdmin);
router.get('/admin/transactions', protect, isAdmin, adminController.getTransactions);

module.exports = router;
