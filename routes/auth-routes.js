const express = require("express");
const AuthController = require("../controllers/auth-controller");
const { check } = require("express-validator");

const router = express.Router();

router.get("/refresh", AuthController.refresh);

router.post(
  "/signup",
  [
    check("email").normalizeEmail().isEmail(),
    check("username").isLength({ min: 5 }),
    check("fullname").not().isEmpty(),
    check("password").isLength({ min: 5 }),
  ],
  AuthController.signup
);
router.post("/login", AuthController.login);

router.post("/logout", AuthController.logout);

module.exports = router;
