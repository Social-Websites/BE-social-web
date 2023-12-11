const express = require('express')
const router = express.Router()
const messagesController = require('../controllers/message-controller');

router.get('/:conversationId', messagesController.getMessages)
router.post('/send', messagesController.sendMessage)
router.put('/addReader', messagesController.addReader)
router.put('/delete', messagesController.deleteMessage)
module.exports = router