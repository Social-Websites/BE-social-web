const User = require("../models/user");
const Post = require("../models/post");
const { validationResult } = require("express-validator");
const removeVietnameseTones = require("../util/removeVietnameseTones");

const getWeeklyOverviewCombined = async (res) => {
  try {
    const today = new Date();
    const currentDayOfWeek = today.getDay();

    const daysToMonday = (currentDayOfWeek + 6) % 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const chartArray = [0, 0, 0, 0, 0, 0, 0];
    const postArray = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i <= daysToMonday; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);

      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      nextDate.setSeconds(nextDate.getSeconds() - 1);

      const dailyCountUsers = await getDailyUserCount(currentDate, nextDate);
      chartArray[i] = dailyCountUsers;

      const dailyPosts = await getPosts(currentDate, nextDate);
      postArray[i] = dailyPosts;
    }

    const newUsersCountToday = chartArray[daysToMonday];
    const newUsersCountYesterday = chartArray[daysToMonday - 1];

    const isGrowthUsers = newUsersCountToday >= newUsersCountYesterday;
    const percentUsers = calculatePercent(
      newUsersCountToday,
      newUsersCountYesterday
    );

    const postsCountToday = postArray[daysToMonday];
    const postsCountYesterday = postArray[daysToMonday - 1];

    const isGrowthPosts = postsCountToday >= postsCountYesterday;
    const percentPosts = calculatePercent(postsCountToday, postsCountYesterday);

    res.json([
      {
        label: "New Users",
        value: newUsersCountToday,
        iconLabel: percentUsers,
        graphCardInfo: {
          id: "new-users",
          data: chartArray,
          brColor: "rgba(33, 150, 243, 0.8)",
          bgColor: "rgba(33, 150, 243, 0.2)",
        },
      },
      {
        label: "New Posts",
        value: postsCountToday,
        iconLabel: percentPosts,
        graphCardInfo: {
          id: "new-posts",
          data: postArray,
          brColor: "rgba(255, 193, 7, 1)",
          bgColor: "rgba(255, 193, 7, 0.2)",
        },
      },
    ]);
  } catch (error) {
    console.error("Error getting combined weekly overview:", error);
    res.status(500).json({ error: "Error getting combined weekly overview" });
  }
};

//THỐNG KÊ

////////////////////////////////
const calculatePercent = (newUsersCountToday, newUsersCountYesterday) => {
  newUsersCountToday = parseFloat(newUsersCountToday);
  newUsersCountYesterday = parseFloat(newUsersCountYesterday);
  if (
    isNaN(newUsersCountToday) ||
    isNaN(newUsersCountYesterday) ||
    newUsersCountYesterday < 0 ||
    newUsersCountToday < 0
  ) {
    return 0;
  }
  if (newUsersCountYesterday !== 0) {
    return (
      ((newUsersCountToday - newUsersCountYesterday) / newUsersCountYesterday) *
      100
    );
  }
  if (newUsersCountToday !== 0) {
    return 100;
  }
  return 0;
};

const getDailyUserCount = async (startDate, endDate) => {
  try {
    const dailyCount = await User.countDocuments({
      created_at: { $gte: startDate, $lt: endDate },
    });
    return dailyCount;
  } catch (error) {
    throw error;
  }
};

const getPosts = async (startDate, endDate) => {
  try {
    const dailyCount = await Post.countDocuments({
      created_at: { $gte: startDate, $lt: endDate },
    });
    return dailyCount;
  } catch (error) {
    throw error;
  }
};

///////////////////////////////////////////////////////////////////////

//USER
const getUserPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchQuery = req.query.search || null;

    if (page < 1 || limit < 1) {
      return res.status(400).json({ message: "Invalid page or limit value" });
    }

    let query = {};

    if (searchQuery) {
      query = { username: { $regex: searchQuery, $options: "i" } };
    }

    const skip = (page - 1) * limit;

    const users = await User.aggregate([
      {
        $match: query,
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "creator",
          as: "posts",
        },
      },
      {
        $addFields: {
          friends_count: { $size: "$friends" },
          posts_count: { $size: "$posts" },
        },
      },
      {
        $project: {
          __v: 0,
          block_list: 0,
          friend_requests: 0,
          friend_requests_sent: 0,
          conversations: 0,
          friends: 0,
          posts: 0,
        },
      },
    ]);

    const totalUsers = await User.countDocuments(query);

    res.json({
      users: users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers: totalUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Encountered an error while retrieving paginated users",
    });
  }
};

const banUser = async (req, res) => {
  const userIdToBan = req.params.userId;

  try {
    // Tìm người dùng cần cấm
    const userToBan = await User.findById(userIdToBan);

    if (!userToBan) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng để cấm." });
    }

    // Cập nhật trạng thái cấm và lưu lại
    userToBan.banned = true;
    await userToBan.save();

    res.status(200).json({ message: "Người dùng đã được cấm thành công." });
  } catch (error) {
    console.error("Lỗi khi cấm người dùng:", error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình cấm người dùng." });
  }
};

const unbanUser = async (req, res) => {
  const userIdToUnban = req.params.userId;

  try {
    // Tìm người dùng cần bỏ cấm
    const userToUnban = await User.findById(userIdToUnban);

    if (!userToUnban) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng để bỏ cấm." });
    }

    // Cập nhật trạng thái cấm và lưu lại
    userToUnban.banned = false;
    await userToUnban.save();

    res.status(200).json({ message: "Người dùng đã được bỏ cấm thành công." });
  } catch (error) {
    console.error("Lỗi khi bỏ cấm người dùng:", error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình bỏ cấm người dùng." });
  }
};
//-------------------------------POST-----------------------------------------------------
const getPaginatedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchQuery = req.query.search || null;

    if (page < 1 || limit < 1) {
      return res.status(400).json({ message: "Invalid page or limit value" });
    }
    let query = {};

    if (searchQuery) {
      query = { content: { $regex: searchQuery, $options: "i" } };
    }

    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "creator",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $addFields: {
          creator: { $arrayElemAt: ["$creator", 0] },
          reacts_count: { $size: "$reacts" },
          comments_count: { $size: "$comments" },
        },
      },
      {
        $project: {
          reacts: 0,
          comments: 0,
          __v: 0,
          has_read: 0,
          "creator.password": 0,
          "creator.full_name": 0,
          "creator.user_info": 0,
          "creator.posts": 0,
          "creator.friend_requests": 0,
          "creator.friend_requests_sent": 0,
          "creator.conversations": 0,
          "creator.online": 0,
          "creator.__v": 0,
          "creator.last_online": 0,
          "creator.banned": 0,
          "creator.created_at": 0,
          "creator.updated_at": 0,
          "creator.admin": 0,
          "creator.friends": 0,
          "creator.self_lock": 0,
          "creator.search_keyword": 0,
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const totalPosts = await Post.countDocuments(query);

    res.json({
      posts: posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts: totalPosts,
    });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

//Xóa bài viết
const deletePostByAdmin = async (req, res) => {
  const postId = req.params.postId;
  const newDeletedByValue = "ADMIN";

  try {
    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId },
      { $set: { deleted_by: newDeletedByValue } },
      { new: true }
    );

    if (!updatedPost) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bài viết để xóa." });
    }
    return res
      .status(200)
      .json({ message: "Bài viết đã được xóa thành công." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình xóa bài viết." });
  }
};

const unDeletePostByAdmin = async (req, res) => {
  const postId = req.params.postId;
  try {
    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId },
      { $unset: { deleted_by: 1 } }, // Sử dụng $unset để xóa trường deleted_by
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }
    return res
      .status(200)
      .json({ message: "Bài viết đã được mở xóa thành công." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình xóa bài viết." });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////

const addUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const { email, fullname, username, password, admin } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({
      $or: [{ "user_info.email": email }, { username: username }],
    });
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("Tên người dùng hoặc email đã tồn tại!", 422);
    return next(error);
  }

  const newUser = new User({
    username: username,
    password: password,
    full_name: fullname,
    admin: admin,
    user_info: {
      email: email,
    },
    search_keyword: `${removeVietnameseTones(fullname)}`,
  });

  try {
    await newUser.save();
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.status(201).json({ message: "Tạo user thành công!" });
};
///////////////////////////////////////////////////////////////////////
const getUsersWithMostPosts = async (res) => {
  try {
    const usersWithMostPosts = await User.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "posts",
          foreignField: "_id",
          as: "posts",
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          full_name: 1,
          profile_picture: 1,
          created_at: 1,
          posts_count: { $size: { $ifNull: ["$posts", []] } }, // Use $ifNull to provide a default empty array
          latest_post: {
            $ifNull: [{ $arrayElemAt: ["$posts", 0] }, null],
          },
        },
      },
      {
        $sort: { posts_count: -1 }, // Sort users by posts_count in descending order
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "creator",
          as: "user_posts",
        },
      },
      {
        $unwind: "$user_posts",
      },
      {
        $sort: { "user_posts.created_at": -1 },
      },
      {
        $group: {
          _id: "$_id",
          username: { $first: "$username" },
          full_name: { $first: "$full_name" },
          profile_picture: { $first: "$profile_picture" },
          created_at: { $first: "$created_at" },
          posts_count: { $first: "$posts_count" },
          latest_post: { $first: "$user_posts" },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          full_name: 1,
          profile_picture: 1,
          created_at: 1,
          posts_count: 1,
          latest_post: {
            content: "$latest_post.content",
            reacts_count: { $size: { $ifNull: ["$latest_post.reacts", []] } },
            comments_count: {
              $size: { $ifNull: ["$latest_post.comments", []] },
            },
            created_at: "$latest_post.created_at",
          },
        },
      },
      {
        $sort: { posts_count: -1 }, // Sort users again by posts_count after the final projection
      },
    ]);

    res.json({
      users: usersWithMostPosts,
    });
  } catch (error) {
    console.error("Error:", error);
  }
};

//Thống kê
exports.getWeeklyOverviewCombined = getWeeklyOverviewCombined;
//QUản lý post
exports.getPaginatedPosts = getPaginatedPosts;
exports.deletePostByAdmin = deletePostByAdmin;
exports.unDeletePostByAdmin = unDeletePostByAdmin;
//Quản lý user
exports.getUserPaginated = getUserPaginated;
exports.banUser = banUser;
exports.unbanUser = unbanUser;
exports.getUsersWithMostPosts = getUsersWithMostPosts;
exports.addUser = addUser;
