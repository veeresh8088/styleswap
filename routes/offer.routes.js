const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offer.controller');
const { protect, forbidAdmin } = require('../middleware/auth.middleware');

router.use(protect, forbidAdmin);

router.post('/', offerController.createOffer);
router.post('/:id/respond', offerController.respondToOffer);
router.put('/:id/respond', offerController.respondToOffer);
router.post('/:id/accept', (req, res, next) => { req.body.action = 'accept'; return offerController.respondToOffer(req, res, next); });
router.put('/:id/accept', (req, res, next) => { req.body.action = 'accept'; return offerController.respondToOffer(req, res, next); });
router.post('/:id/reject', (req, res, next) => { req.body.action = 'reject'; return offerController.respondToOffer(req, res, next); });
router.put('/:id/reject', (req, res, next) => { req.body.action = 'reject'; return offerController.respondToOffer(req, res, next); });
router.post('/:id/decline', (req, res, next) => { req.body.action = 'reject'; return offerController.respondToOffer(req, res, next); });
router.put('/:id/decline', (req, res, next) => { req.body.action = 'reject'; return offerController.respondToOffer(req, res, next); });
router.post('/:id/cancel', (req, res, next) => { req.body.action = 'cancel'; return offerController.respondToOffer(req, res, next); });
router.put('/:id/cancel', (req, res, next) => { req.body.action = 'cancel'; return offerController.respondToOffer(req, res, next); });
router.all('/:id/:action', offerController.respondToOffer);
router.get('/:listingId/status', offerController.getListingOfferStatus);

module.exports = router;
