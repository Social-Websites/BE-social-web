const express = require("express");
const adminController = require("../controllers/admin-controller");


const router = express.Router();

router.get('/statistic', async (req, res) => {
  await adminController.getWeeklyOverview(res);
});

//POST
// Route để lấy danh sách bài post phân trang
router.get('/post', async (req, res) => {
  await adminController.getPaginatedPosts(req, res);
});


module.exports = router;