const express = require("express");
const AuthController = require("../controllers/auth-controller");
const { check } = require("express-validator");

const router = express.Router();

//Cấp lại access token
router.get("/refresh", AuthController.refresh);
router.post("/mrefresh", AuthController.mRefresh);

router.post("/login", AuthController.login);
router.post("/mlogin", AuthController.mlogin);
router.post("/alogin", AuthController.aLogin);
router.get("/logout", AuthController.logout);

//Quên mật khẩu
router.post("/forgot-password", AuthController.sendResetVerification);
router.get("/reset-password/:token", AuthController.verifyResetLink);
router.patch("/reset-password", AuthController.resetPassword);
router.post("/mforgot-password", AuthController.mSendResetVerification);
router.post("/mverifyResetOtp", AuthController.mVerifyResetOtp);

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

module.exports = router;
