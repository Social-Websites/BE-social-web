const express = require('express')
const router = express.Router()
const conversationController = require('../controllers/conversation-controller');

router.get('/', conversationController.getConversation)

module.exports = router