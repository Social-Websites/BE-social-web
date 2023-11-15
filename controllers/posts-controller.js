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
  console.log(userId);
  const { title, urlStrings } = req.body;
  const newPost = new Post({
    user_id: userId,
    content: title ? title : "",
    media: urlStrings,
  });
  try {
    await newPost.save();
  } catch (err) {
    console.log("Bài viết 1===============: ", err);
    const error = new HttpError(
      "Có lỗi khi tạo bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
  res.status(201).json({ message: "Tạo bài viết mới thành công!" });
};

const getHomePosts = async (req, res, next) => {
  const userId = req.userData.id;
  const page = parseInt(req.query.page) || 1; // Trang hiện tại (mặc định là 1)
  const limit = parseInt(req.query.limit) || 10; // Số lượng bài viết mỗi trang (mặc định là 10)

  try {
    const user = await User.findById(userId)
      .select("friends block_list")
      .populate("friends", "_id")
      .populate("block_list", "_id");

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
      .populate("creator", "username profile_url") // Populate thông tin của người tạo bài viết chỉ với trường username
      .populate(
        "creator.block_list",
        "_id" // Chỉ lấy trường _id trong block_list của người tạo bài viết
      )
      .sort({ updated_at: -1 }) // Sắp xếp theo thời gian giảm dần
      .skip((page - 1) * limit)
      .limit(limit);

    const filteredPosts = posts
      .filter((post) => !post.creator.block_list.includes(userId))
      .map((post) => {
        // Loại bỏ trường không mong muốn từ creator
        const { _id, username, profile_url } = post.creator;
        // Thay thế trường creator trong post bằng thông tin đã lọc
        post.creator = { _id, username, profile_url };
        return post;
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
