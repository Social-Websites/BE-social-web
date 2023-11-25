const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Post = require("../models/post");
const User = require("../models/user");
const Comment = require("../models/comment");
const { validationResult } = require("express-validator");

const createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const userId = req.userData.id;

  let user;
  try {
    user = await User.findById(userId);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
  } catch (err) {
    console.log("Bài viết 0===============: ", err);
    const error = new HttpError(
      "Có lỗi khi tạo bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  const { title, urlStrings } = req.body;
  const newPost = new Post({
    creator: userId,
    content: title,
    media: urlStrings,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newPost.save({ session: sess });
    user.posts.push(newPost);
    await user.save({ session: sess });
    await newPost.populate("creator", "username profile_picture");
    await sess.commitTransaction();
  } catch (err) {
    console.log("Bài viết 1===============: ", err);
    const error = new HttpError(
      "Có lỗi khi tạo bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  res.status(201).json({ post: newPost });
};

const reactPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const userId = req.userData.id;
  const postId = req.params.postId;
  const emoji = req.body.emoji;

  let message;

  try {
    const user = await User.findById(userId);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }

    const post = await Post.findById(postId, { reacts: 1 });
    if (!post) {
      const error = new HttpError(
        "Không tìm thấy post với id được cung cấp!",
        404
      );
      return next(error);
    }

    const existingReactIndex = post.reacts.findIndex(
      (react) => react.user.toString() === user._id.toString()
    );

    if (existingReactIndex === -1) {
      // Nếu chưa tương tác, thêm một react mới
      post.reacts.push({ user: userId, emoji: emoji });
      message = "Like bài viết thành công!";
    } else {
      // Nếu đã tương tác, kiểm tra emoji
      if (post.reacts[existingReactIndex].emoji === emoji) {
        // Nếu emoji giống nhau, hủy tương tác
        post.reacts.splice(existingReactIndex, 1);
        message = "Hủy emoji thành công!";
      } else {
        // Nếu emoji khác nhau, cập nhật emoji
        post.reacts[existingReactIndex].emoji = emoji;
        message = "Đổi emoji thành công!";
      }
    }

    await post.save({ timestamps: false });
  } catch (err) {
    console.log("React 1===============: ", err);
    const error = new HttpError("Có lỗi khi tương tác, vui lòng thử lại!", 500);
    return next(error);
  }

  res.status(200).json({ message: message });
};

const deletePost = async (req, res, next) => {
  const userId = req.userData.id;
  const postId = req.params.postId;

  let post;
  try {
    post = await Post.findById(postId, { creator: 1 }).populate(
      "creator",
      "posts"
    );
  } catch (err) {
    console.log("Bài viết xóa 1===============: ", err);
    const error = new HttpError(
      "Có lỗi khi xóa bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  if (!post) {
    const error = new HttpError("Không tìm thấy bài viết từ id cung cấp!", 404);
    return next(error);
  }

  if (post.creator._id.toString() !== userId) {
    const error = new HttpError("Người dùng không có quyền xóa!", 403);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await post.deleteOne({ session: sess });
    post.creator.posts.pull(post);
    await post.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log("Bài viết xóa 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi xóa bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
  res.status(200).json({ message: "Xóa bài viết thành công!" });
};

const getHomePosts = async (req, res, next) => {
  const userId = req.userData.id;
  const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
  const limit = Math.max(10, parseInt(req.query.limit)) || 10; // Số lượng bài viết mỗi trang (mặc định là 10)

  try {
    const user = await User.findById(userId).select("friends block_list");

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    // Lấy danh sách ID của bạn bè và block_list
    const friendIds = user.friends.map((friend) => friend._id);
    const blockListIds = user.block_list.map((blockedUser) => blockedUser._id);

    // Lấy danh sách bài viết theo các điều kiện
    const posts = await Post.aggregate()
      .match({
        creator: {
          $in: [
            ...friendIds.map((id) => new mongoose.Types.ObjectId(id)),
            new mongoose.Types.ObjectId(userId),
          ],
          $nin: blockListIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      })
      .lookup({
        from: "users",
        localField: "creator",
        foreignField: "_id",
        as: "creator",
      })
      .unwind("creator")
      .addFields({
        is_user_liked: {
          $in: [new mongoose.Types.ObjectId(userId), "$reacts.user"],
        },
        reacts_count: { $size: "$reacts" },
        comments_count: { $size: "$comments" },
      })
      .project({
        creator: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        is_user_liked: 1,
        reacts_count: 1,
        commentsCount: 1,
        updated_at: 1,
        created_at: 1,
        media: 1,
        content: 1,
        has_read: 1,
        edit_at: 1,
        shared_by: 1,
        original_post: 1,
      })
      .sort({ updated_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // {
    //   $lookup: {
    //     from: "users", // Tên collection nguồn
    //     localField: "creator",
    //     foreignField: "_id",
    //     as: "creator",
    //   },
    // },
    // {
    //   $unwind: "$creator",
    // },
    // {
    //   $addFields: {
    //     is_user_like: {
    //       $in: [new mongoose.Types.ObjectId(userId), "$reacts.user"],
    //     },
    //     reactsCount: { $size: "$reacts" },
    //   },
    // },
    // {
    //   $project: {
    //     creator: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
    //     is_user_like: 1,
    //     reactsCount: 1,
    //     updated_at: 1,
    //   },
    // },
    // {
    //   $sort: { updated_at: -1 },
    // },
    // {
    //   $skip: (page - 1) * limit,
    // },
    // {
    //   $limit: limit,
    // },

    const filteredPosts = posts.filter(
      (post) => !post.creator.block_list.includes(userId)
    );

    res.status(200).json({ posts: filteredPosts });
  } catch (err) {
    console.log("Bài viết 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const getPostComments = async (req, res, next) => {
  const userId = req.userData.id;
  const postId = req.params.postId;
  const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
  const limit = Math.max(30, parseInt(req.query.limit)) || 30; // Số lượng comments mỗi lần (mặc định là 30)

  try {
    const user = await User.findById(userId).select("block_list");

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    // Lấy danh sách ID của block_list
    const blockListIds = user.block_list.map((blockedUser) => blockedUser._id);

    // Lấy danh sách bài viết theo các điều kiện
    const comments = await Comment.aggregate()
      .match({
        post: new mongoose.Types.ObjectId(postId),
        user: {
          $nin: blockListIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        cmt_level: 1,
      })
      .lookup({
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      })
      .unwind("user")
      .addFields({ relate_cmts_count: { $size: "$relate_cmts" } })
      .project({
        user: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        relate_cmts_count: 1,
        mother_cmt: 1,
        reply_to: 1,
        cmt_level: 1,
        media: 1,
        comment: 1,
        created_at: 1,
      })
      .skip((page - 1) * limit)
      .limit(limit);

    const filteredComments = comments.filter(
      (comment) => !comment.user.block_list.includes(userId)
    );

    res.status(200).json({ comments: filteredComments });
  } catch (err) {
    console.log("Comment 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy comments, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const comment = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const userId = req.userData.id;
  const { postId, comment, urlStrings, reply_to } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }

    const post = await Post.findById(postId, { comments: 1 });
    if (!post) {
      const error = new HttpError("Không tìm thấy post!", 404);
      return next(error);
    }

    const newCommentData = {
      user: userId,
      post: postId,
    };

    // Kiểm tra và thêm các trường optional nếu chúng tồn tại
    if (comment) newCommentData.comment = comment;
    if (urlStrings) newCommentData.media = urlStrings;
    if (reply_to) newCommentData.reply_to = reply_to;

    const newComment = new Comment(newCommentData);

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newComment.save({ session: sess });
    post.comments.push(newComment);
    await post.save({ session: sess });
    await newComment.populate("user", "username profile_picture");
    await sess.commitTransaction();

    res.status(201).json({ comment: newComment });
  } catch (err) {
    console.log("Bài viết 1===============: ", err);
    const error = new HttpError(
      "Có lỗi khi gửi comment, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const deleteComment = async (req, res, next) => {
  const userId = req.userData.id;
  const commentId = req.params.commentId;

  try {
    const comment = await Comment.findById(commentId, {
      user: 1,
      post: 1,
      cmt_level: 1,
      mother_cmt: 1,
    });

    console.log(comment);
    if (!comment) {
      const error = new HttpError(
        "Không tìm thấy comment từ id cung cấp!",
        404
      );
      return next(error);
    }

    if (comment.user.toString() !== userId) {
      const error = new HttpError("Người dùng không có quyền xóa!", 403);
      return next(error);
    }
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await comment.deleteOne({ session: sess });
    await Post.updateOne(
      { _id: comment.post },
      { $pull: { comments: comment._id } },
      { session: sess }
    );

    if (comment.cmt_level > 1) {
      await Comment.updateOne(
        { _id: comment.mother_cmt },
        { $pull: { relate_cmts: comment._id } },
        { session: sess }
      );
    }

    await sess.commitTransaction();
  } catch (err) {
    console.log("Comment xóa 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi xóa bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
  res.status(200).json({ message: "Xóa comment thành công!" });
};

exports.createPost = createPost;
exports.getHomePosts = getHomePosts;
exports.getPostComments = getPostComments;
exports.deletePost = deletePost;
exports.deleteComment = deleteComment;
exports.reactPost = reactPost;
exports.comment = comment;
