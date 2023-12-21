const express = require('express')
const router = express.Router()
const groupsController = require('../controllers/group-controller');
const tokenHandler = require("../middlewares/token-handler");
router.use(tokenHandler.verifyAccessToken);

router.get('/admin', groupsController.getAdminGroups)
router.get('/member', groupsController.getMemberGroups)
router.get('/invited', groupsController.getInvitedGroups)
router.get('/search', groupsController.searchGroups)
router.post('/create', groupsController.createGroup)
router.put('/accept', groupsController.acceptGroup)
router.put('/kick', groupsController.kickGroup)
router.post('/request', groupsController.requestToGroup)
module.exports = router