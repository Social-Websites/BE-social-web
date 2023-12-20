const express = require('express')
const router = express.Router()
const groupsController = require('../controllers/group-controller');
const tokenHandler = require("../middlewares/token-handler");
router.use(tokenHandler.verifyAccessToken);

router.get('/admin', groupsController.getAdminGroups)
router.get('/member', groupsController.getMemberGroups)
router.get('/invited', groupsController.getInvitedGroups)
router.post('/create', groupsController.createGroup)
module.exports = router