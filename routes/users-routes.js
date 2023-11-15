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


module.exports = router;
