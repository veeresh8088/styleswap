const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { protect, forbidAdmin } = require('../middleware/auth.middleware');

router.use(protect, forbidAdmin);

router.get('/', chatController.getUserConversations);
router.get('/conversation/active', chatController.getActiveConversation);
router.get('/conversation/:listingId', chatController.getOrCreateConversation);
router.get('/:listingId', chatController.openConversationForListing);
router.post('/send', chatController.sendMessage);

module.exports = router;
