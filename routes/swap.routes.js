const express = require('express');
const router = express.Router();
const swapController = require('../controllers/swap.controller');
const { protect, forbidAdmin } = require('../middleware/auth.middleware');

router.use(protect, forbidAdmin);

router.post('/', swapController.proposeSwap);
router.post('/propose', swapController.proposeSwap);
router.post('/:id/respond', swapController.respondToSwap);
router.put('/:id/respond', swapController.respondToSwap);
router.post('/:id/accept', (req, res, next) => { req.body.action = 'accept'; return swapController.respondToSwap(req, res, next); });
router.put('/:id/accept', (req, res, next) => { req.body.action = 'accept'; return swapController.respondToSwap(req, res, next); });
router.post('/:id/reject', (req, res, next) => { req.body.action = 'reject'; return swapController.respondToSwap(req, res, next); });
router.put('/:id/reject', (req, res, next) => { req.body.action = 'reject'; return swapController.respondToSwap(req, res, next); });
router.post('/:id/decline', (req, res, next) => { req.body.action = 'reject'; return swapController.respondToSwap(req, res, next); });
router.put('/:id/decline', (req, res, next) => { req.body.action = 'reject'; return swapController.respondToSwap(req, res, next); });
router.post('/:id/cancel', (req, res, next) => { req.body.action = 'cancel'; return swapController.respondToSwap(req, res, next); });
router.put('/:id/cancel', (req, res, next) => { req.body.action = 'cancel'; return swapController.respondToSwap(req, res, next); });
router.all('/:id/:action', swapController.respondToSwap);
router.post('/:id/counter-respond', swapController.respondToCounter);
router.get('/my-swaps', swapController.getUserSwaps);

module.exports = router;
