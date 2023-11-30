const express = require("express");
const UsersController = require("../controllers/users-controller");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

router.get("/search", UsersController.searchUsers);

// routes need access token
router.use(tokenHandler.verifyAccessToken);

router.get("/auth-user", UsersController.getUser);
router.get("/:username", UsersController.getUserByUsername);
router.get("/:username/friends", UsersController.getUserFriendsListByUsername);
router.get("/auth-user/friend-requests", UsersController.getFriendRequestsList);
router.patch("/auth-user/unfriend/:friendId", UsersController.unFriend);
router.patch(
  "/friend-requests/send/:userId",
  UsersController.sendAddFriendRequest
);
router.patch(
  "/friend-requests/accept/:userId",
  UsersController.acceptAddFriendRequest
);
router.patch(
  "/friend-requests/remove/:userId",
  UsersController.removeAddFriendRequest
);
router.patch(
  "/friend-requests/reject/:userId",
  UsersController.rejectAddFriendRequest
);

module.exports = router;
