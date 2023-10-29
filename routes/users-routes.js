const express = require("express");
const UsersController = require("../controllers/users-controller");
const { check } = require("express-validator");
const { verifyAccessToken } = require("../middlewares/token-handler");

const router = express.Router();

// routes need access token
router.use(verifyAccessToken);

router.get("/getuser", UsersController.getUser);

module.exports = router;
