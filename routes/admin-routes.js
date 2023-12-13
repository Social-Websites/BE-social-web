const express = require("express");
const AdminController = require("../controllers/admin-controller");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAdminAccessToken);

//Thống kê
router.get("/statistic", async (req, res) => {
  await AdminController.getWeeklyOverviewCombined(res);
});

//POST
router.get("/post", async (req, res) => {
  await AdminController.getPaginatedPosts(req, res);
});

router.get(
  "/posts/:postId/reports-count",
  AdminController.countReportedPostsByPostAndGroupByReason
);

router.put("/post/lock/:postId", AdminController.banPostByAdmin);
router.put("/post/unlock/:postId", AdminController.unBanPostByAdmin);
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
  AdminController.addUser
);

router.get("/user", async (req, res) => {
  await AdminController.getUserPaginated(req, res);
});

router.get(
  "/users/:userId/reports-count",
  AdminController.countReportedUsersByUserAndGroupByReason
);

router.get("/user/mostpost", async (req, res) => {
  await AdminController.getUsersWithMostPosts(res);
});

router.put("/user/ban/:userId", async (req, res) => {
  await AdminController.banUser(req, res);
});

router.put("/user/unban/:userId", async (req, res) => {
  await AdminController.unbanUser(req, res);
});

module.exports = router;
