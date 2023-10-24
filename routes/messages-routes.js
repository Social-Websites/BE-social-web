const express = require('express')
const router = express.Router()
const messagesController = require('../controllers/message-controller');

router.get('/', messagesController.getMessages)

module.exports = router