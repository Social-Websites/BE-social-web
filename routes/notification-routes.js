const express = require('express')
const router = express.Router()
const notificationsController = require('../controllers/notifications-controller');

router.get('/:userId', notificationsController.getNotifications)
router.post('/send', notificationsController.sendNotification)
router.put('/addReader', notificationsController.addReader)

module.exports = router