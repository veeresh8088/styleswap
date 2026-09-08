const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listing.controller');
const upload = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');
const { listingValidation } = require('../middleware/validation.middleware');

// --- Web UI Routes ---
router.get('/', listingController.getListings);
router.get('/create', protect, listingController.renderCreateListing);
router.post('/ai-recommendation', listingController.getAIRecommendation);
router.post('/', protect, upload.array('images', 5), listingValidation, listingController.createListing);

router.get('/:id', listingController.getListingById);
router.get('/:id/edit', protect, listingController.renderEditListing);
router.post('/:id/edit', protect, upload.array('images', 5), listingValidation, listingController.updateListing);
router.post('/:id/delete', protect, listingController.deleteListing);
router.delete('/:id', protect, listingController.deleteListing);

module.exports = router;
