const express = require("express");
const router = express.Router();
const GroupsController = require("../controllers/group-controller");
const tokenHandler = require("../middlewares/token-handler");
router.use(tokenHandler.verifyAccessToken);

router.get("/admin", GroupsController.getAdminGroups);
router.get("/member", GroupsController.getMemberGroups);
router.get("/invited", GroupsController.getInvitedGroups);
router.get("/search", GroupsController.searchGroups);
router.get("/:groupId", GroupsController.getGroupDetail);
router.get("/:groupId/join-requests", GroupsController.getJoinGroupRequests);
router.get("/:groupId/members", GroupsController.getGroupMembers);

router.post("/create", GroupsController.createGroup);
router.put("/accept", GroupsController.acceptGroup);
router.put("/kick", GroupsController.kickGroup);
router.post("/request", GroupsController.requestToGroup);
router.put("/:groupId/:requesterId/accept", GroupsController.acceptRequest);
router.put("/:groupId/:requesterId/reject", GroupsController.rejectRequest);

module.exports = router;
