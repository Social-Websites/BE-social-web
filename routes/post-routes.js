const express = require("express");
const PostController = require("../controllers/posts-controller");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAccessToken);

router.get("/", PostController.getHomePosts);
router.get("/user/:username", PostController.getUserPosts);
router.get("/user/:username/saved-posts", PostController.getSavedPosts);
router.get("/:postId/comments", PostController.getPostComments);
router.get("/:postId", PostController.getSinglePost);

router.post(
  "/",
  [
    check("urlStrings").custom((value, { req }) => {
      const urls = req.body.urlStrings;

      if (
        !urls ||
        urls.length === 0 ||
        urls.every((url) => url.trim() === "")
      ) {
        throw new Error("Không có hình ảnh đăng tải!");
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
        (!comment || comment.trim() === "") &&
        (!urls || urls.length === 0 || urls.every((url) => url.trim() === ""))
      ) {
        throw new Error("Comment hoặc urlStrings phải tồn tại dữ liệu!");
      }

      return true;
    }),
    check("reply_to")
      .optional()
      .custom((value) => {
        // Nếu có giá trị reply_to, kiểm tra không được trống hoặc chỉ chứa khoảng trắng
        if (
          value !== undefined &&
          (typeof value !== "string" || value.trim() === "")
        ) {
          throw new Error(
            "Trường reply_to không được để trống hoặc chỉ chứa khoảng trắng"
          );
        }
        return true;
      }),
  ],
  PostController.comment
);

router.post(
  "/report",
  [
    check("postId").notEmpty().withMessage("Không có postId!"),
    check("reason").notEmpty().withMessage("Không có reason!"),
  ],
  PostController.reportPost
);

router.post(
  "/:postId",
  [check("save").isBoolean().withMessage("Trường save phải là boolean!")],
  PostController.savePost
);

router.patch(
  "/react/:postId",
  [check("emoji").not().isEmpty()],
  PostController.reactPost
);

router.delete("/:postId", PostController.deletePost);
router.delete("/comment/:commentId", PostController.deleteComment);

module.exports = router;
