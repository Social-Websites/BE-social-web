const express = require("express");
const router = express.Router();
const GroupsController = require("../controllers/group-controller");
const tokenHandler = require("../middlewares/token-handler");
const { check } = require("express-validator");
router.use(tokenHandler.verifyAccessToken);

router.get("/admin", GroupsController.getAdminGroups);
router.get("/member", GroupsController.getMemberGroups);
router.get("/invited", GroupsController.getInvitedGroups);
router.get("/search", GroupsController.searchGroups);
router.get("/:groupId", GroupsController.getGroupDetail);
router.get("/:groupId/join-requests", GroupsController.getJoinGroupRequests);
router.get("/:groupId/members", GroupsController.getGroupMembers);
router.get(
  "/:groupId/friends-to-invite",
  GroupsController.getUserFriendsListToInvite
);
router.get("/:groupId/posts", GroupsController.getGroupPostsWithStatus);
router.post("/edit", GroupsController.editGroup);

router.post("/create", GroupsController.createGroup);
router.put("/accept", GroupsController.acceptGroup);
router.put("/kick", GroupsController.kickGroup);
router.post("/request", GroupsController.requestToGroup);
router.post("/:groupId/:userToInviteId/invite", GroupsController.inviteToGroup);
router.put("/:groupId/:requesterId/accept", GroupsController.acceptRequest);
router.put("/:groupId/:requesterId/reject", GroupsController.rejectRequest);
router.put("/posts/:postId/approve", GroupsController.approveGroupPost);
router.put("/posts/:postId/reject", GroupsController.rejectGroupPost);

router.post(
  "/post",
  [
    check("groupId").notEmpty().withMessage("Không có id group!"),
    check("urlStrings").custom((value, { req }) => {
      const urls = req.body.urlStrings;

      if (
        !urls ||
        urls.length === 0 ||
        urls.every((url) => url.trim() === "")
      ) {
        throw new Error("Không có hình ảnh đăng tải!");
      }

      return true;
    }),
  ],
  GroupsController.createGroupPost
);

module.exports = router;
