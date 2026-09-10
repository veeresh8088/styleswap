const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/isAdmin.middleware');
const upload = require('../middleware/upload.middleware');

// Admin Login & Authentication Routes (Public to unauthenticated admins)
router.get('/login', adminController.renderAdminLogin);
router.post('/login', adminController.adminLogin);

// Protect all admin management routes with authentication and admin role
router.use(protect, isAdmin);

// Dashboard
router.get('/', adminController.getDashboard);
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getUsers);
router.post('/users/:id/ban', adminController.toggleUserBan);
router.put('/users/:id/ban', adminController.toggleUserBan);

// Listing Moderation
router.get('/listings', adminController.getListings);
router.post('/listings/:id/approve', adminController.approveListing);
router.put('/listings/:id/approve', adminController.approveListing);
router.post('/listings/:id/reject', adminController.rejectListing);
router.put('/listings/:id/reject', adminController.rejectListing);
router.post('/listings/:id/delete', adminController.deleteListingAdmin);
router.delete('/listings/:id', adminController.deleteListingAdmin);

// Category Management
router.get('/categories', adminController.getCategories);
router.post('/categories', upload.single('image'), adminController.createCategory);
router.post('/categories/:id/edit', upload.single('image'), adminController.updateCategory);
router.put('/categories/:id', upload.single('image'), adminController.updateCategory);
router.post('/categories/:id/delete', adminController.deleteCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Transactions Monitor & Order Status Management
router.get('/transactions', adminController.getTransactions);
router.post('/transactions/:id/status', adminController.updateOrderStatus);
router.put('/transactions/:id/status', adminController.updateOrderStatus);

// Reports Export
router.get('/export/:resource', adminController.exportCSV);

// Database Tables Hub & Data Inspector
router.get('/tables', adminController.getDatabaseTables);
router.get('/tables/:tableName', adminController.getDatabaseTables);

module.exports = router;
