const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { protect, forbidAdmin } = require('../middleware/auth.middleware');

router.use(protect, forbidAdmin);

router.get('/', cartController.getCart);
router.post('/add/:listingId', cartController.addToCart);
router.post('/remove/:listingId', cartController.removeFromCart);
router.post('/apply-points', cartController.applyLoyaltyPoints);
router.get('/checkout', cartController.renderCartCheckout);
router.post('/checkout', cartController.processCartCheckout);

module.exports = router;
