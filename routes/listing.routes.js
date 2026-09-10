const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listing.controller');
const upload = require('../middleware/upload.middleware');
const { protect, forbidAdmin } = require('../middleware/auth.middleware');
const { listingValidation } = require('../middleware/validation.middleware');

// Apply forbidAdmin to all marketplace listing routes
router.use(forbidAdmin);
router.get('/', listingController.getListings);
router.get('/create', protect, listingController.renderCreateListing);
router.post('/ai-recommendation', listingController.getAIRecommendation);
router.post('/', protect, upload.array('images', 5), listingValidation, listingController.createListing);

const offerController = require('../controllers/offer.controller');

router.get('/:id', listingController.getListingById);
router.get('/:id/offer', protect, listingController.renderOfferPage);
router.post('/:id/offer', protect, offerController.createOffer);
router.get('/:id/swap', protect, listingController.renderSwapPage);
router.get('/:id/edit', protect, listingController.renderEditListing);
router.post('/:id/edit', protect, upload.array('images', 5), listingValidation, listingController.updateListing);
router.post('/:id/delete', protect, listingController.deleteListing);
router.delete('/:id', protect, listingController.deleteListing);

module.exports = router;
