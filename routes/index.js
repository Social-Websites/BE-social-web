const express = require('express')
const router = express.Router()

const messagesRoutes = require('./messages-routes')
const usersRoutes = require('./users-routes')
const conversationRoutes = require('./conversation-routes')


router.use('/messages', messagesRoutes)
router.use('/conversation', conversationRoutes)
router.use('/users', usersRoutes)

//ADMIN


module.exports = router