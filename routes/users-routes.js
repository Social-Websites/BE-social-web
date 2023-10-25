const express = require("express");
const UsersController = require("../controllers/users-controller");

const router = express.Router();

router.get("/:userId", UsersController.getUser);

router.post("/signup", UsersController.signup);
router.post("/login", UsersController.login);

module.exports = router;
