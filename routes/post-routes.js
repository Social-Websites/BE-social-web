const express = require("express");
const PostController = require("../controllers/posts-controller");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAccessToken);

router.get("/", PostController.getHomePosts);

router.post(
  "/",
  [
    check("urlStrings").custom((value, { req }) => {
      const title = req.body.title;
      const urls = req.body.urlStrings;

      if (
        !title &&
        (!urls || urls.length === 0 || urls.every((url) => url.trim() === ""))
      ) {
        throw new Error("Title hoặc urlStrings phải tồn tại dữ liệu.");
      }

      return true;
    }),
  ],
  PostController.createPost
);

router.delete("/:id", PostController.deletePost);

module.exports = router;
