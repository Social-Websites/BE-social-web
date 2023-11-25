const express = require("express");
const PostController = require("../controllers/posts-controller");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAccessToken);

router.get("/", PostController.getHomePosts);
router.get("/:postId/comments", PostController.getPostComments);

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

router.post(
  "/comments",
  [
    check("postId").notEmpty().withMessage("Không có postId"),
    check("urlStrings").custom((value, { req }) => {
      const comment = req.body.comment;
      const urls = req.body.urlStrings;

      if (
        (!comment || comment === "") &&
        (!urls || urls.length === 0 || urls.every((url) => url.trim() === ""))
      ) {
        throw new Error("Comment hoặc urlStrings phải tồn tại dữ liệu!");
      }

      return true;
    }),
  ],
  PostController.comment
);

router.patch(
  "/react/:postId",
  [check("emoji").not().isEmpty()],
  PostController.reactPost
);

router.delete("/:postId", PostController.deletePost);
router.delete("/comments/:commentId", PostController.deleteComment);

module.exports = router;