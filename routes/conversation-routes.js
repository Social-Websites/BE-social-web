const express = require('express')
const router = express.Router()
const conversationController = require('../controllers/conversation-controller');

router.get("/search", conversationController.searchConversation);
router.get('/check', conversationController.checkUserConversation);
router.get('/:userId', conversationController.getUserConversations);
router.post('/create', conversationController.createConversation);

module.exports = router