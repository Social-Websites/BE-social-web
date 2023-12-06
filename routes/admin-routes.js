const express = require("express");
const adminController = require("../controllers/admin-controller");
const { check } = require("express-validator");

const router = express.Router();

//Thống kê
router.get("/statistic", async (req, res) => {
  await adminController.getWeeklyOverviewCombined(res);
});

//POST
router.get("/post", async (req, res) => {
  await adminController.getPaginatedPosts(req, res);
});

router.put("/post/lock/:postId", async (req, res) => {
  await adminController.deletePostByAdmin(req, res);
});
router.put("/post/unlock/:postId", async (req, res) => {
  await adminController.unDeletePostByAdmin(req, res);
});
//USER
router.post(
  "/users",
  [
    check("email").normalizeEmail().isEmail(),
    check("username").isLength({ min: 5 }),
    check("fullname").not().isEmpty(),
    check("password").isLength({ min: 5 }),
    check("admin")
      .isBoolean()
      .withMessage("Giá trị trường admin không phải boolean!"),
  ],
  adminController.addUser
);

router.get("/user", async (req, res) => {
  await adminController.getUserPaginated(req, res);
});

router.get("/user/mostpost", async (req, res) => {
  await adminController.getUsersWithMostPosts(res);
});

router.put("/user/ban/:userId", async (req, res) => {
  await adminController.banUser(req, res);
});

router.put("/user/unban/:userId", async (req, res) => {
  await adminController.unbanUser(req, res);
});

module.exports = router;
