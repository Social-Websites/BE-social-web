const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Post = require("../models/post");
const User = require("../models/user");
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

    console.log(post);

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
  const postId = req.params.id;

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
  const page = parseInt(req.query.page) || 1; // Trang hiện tại (mặc định là 1)
  const limit = parseInt(req.query.limit) || 10; // Số lượng bài viết mỗi trang (mặc định là 10)

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
    const posts = await Post.find({
      $and: [
        { creator: { $in: [...friendIds, userId] } }, // User là bạn bè
        { creator: { $nin: blockListIds } }, // User không nằm trong block_list của mình
      ],
    })
      .populate("creator", "username profile_picture block_list") // Populate thông tin của người tạo bài viết chỉ với trường username
      // .populate(
      //   "creator.block_list",
      //   "_id" // Chỉ lấy trường _id trong block_list của người tạo bài viết
      // )
      .sort({ updated_at: -1 }) // Sắp xếp theo thời gian giảm dần
      .skip((page - 1) * limit)
      .limit(limit);

    const filteredPosts = posts
      .filter((post) => !post.creator.block_list.includes(userId))
      .map((post) => {
        const { creator } = post;
        // Loại bỏ trường không mong muốn từ creator trong bản sao
        const { _id, username, profile_picture } = creator;

        // Tạo một bản sao của post và cập nhật trường creator
        const postCopy = {
          ...post._doc,
          creator: { _id, username, profile_picture },
        };
        return postCopy;
      });

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

exports.createPost = createPost;
exports.getHomePosts = getHomePosts;
exports.deletePost = deletePost;
exports.reactPost = reactPost;
