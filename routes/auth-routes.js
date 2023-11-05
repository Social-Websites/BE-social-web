const express = require("express");
const AuthController = require("../controllers/auth-controller");
const { check } = require("express-validator");

const router = express.Router();

//Cấp lại access token
router.get("/refresh", AuthController.refresh);

//Quên mật khẩu
router.post("/forgot-password", AuthController.sendResetVerification);
router.get("/reset-password/:token", AuthController.verifyResetLink);
router.patch("/reset-password", AuthController.resetPassword);

//Đăng nhập, đăng ký, đăng xuất
router.get("/signup/:username/:email", AuthController.getOtpSignUp);
router.post(
  "/signup",
  [
    check("otp").not().isEmpty(),
    check("otpToken").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("username").isLength({ min: 5 }),
    check("fullname").not().isEmpty(),
    check("password").isLength({ min: 5 }),
  ],
  AuthController.signUp
);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);

module.exports = router;
