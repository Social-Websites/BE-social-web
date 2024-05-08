const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Post = require("../models/post");
const React = require("../models/react");
const ReportedPost = require("../models/reported_post");
const User = require("../models/user");
const Comment = require("../models/comment");
const UserToGroup = require("../models/user_to_group");
const { validationResult } = require("express-validator");

const createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const userId = req.userData.id;

  let user;
  try {
    user = await User.findOne({ _id: userId, banned: false });
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

  const { title, urlStrings, visibility } = req.body;

  const visibilityEnum = ["PUBLIC", "GROUP", "FRIENDS", "PRIVATE"];

  const newPost = new Post({
    creator: userId,
    content: title,
    media: urlStrings,
    visibility:
      !visibility || !visibilityEnum.includes(visibility)
        ? "PUBLIC"
        : visibility,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newPost.save({ session: sess });
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

const handleNewReact = async (user, post, emoji) => {
  const newReact = new React({
    reacted_by: user._id,
    post: post._id,
    emoji: emoji,
  });
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await newReact.save({ session: sess });
    post.reacts.push(newReact);
    await post.save({ timestamps: false, session: sess });
    await sess.commitTransaction();
  } catch (err) {
    throw err;
  }
};

const handleExistingReact = async (react, post, emoji) => {
  try {
    if (react.emoji === emoji) {
      // Hủy tương tác
      const sess = await mongoose.startSession();
      sess.startTransaction();
      post.reacts.pull(react);
      await react.deleteOne({ session: sess });
      await post.save({ timestamps: false, session: sess });
      await sess.commitTransaction();
    }
  } catch (err) {
    throw err;
  }
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
    const [user, post, react] = await Promise.all([
      User.findOne({ _id: userId, banned: false }).select("_id"),
      Post.findOne({
        _id: postId,
        deleted_by: { $exists: false },
        $or: [{ banned: false }, { banned: { $exists: false } }],
      }).select("reacts"),
      React.findOne({ reacted_by: userId, post: postId }),
    ]);

    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    if (!post) {
      const error = new HttpError(
        "Không tìm thấy post với id được cung cấp!",
        404
      );
      return next(error);
    }

    if (!react) {
      // Nếu chưa tương tác, thêm một react mới
      await handleNewReact(user, post, emoji);

      message = "Like bài viết thành công!";
    } else {
      // Nếu đã tương tác, kiểm tra emoji
      if (react.emoji === emoji) {
        // Nếu emoji giống nhau, hủy tương tác
        console.log("================= hủy");
        await handleExistingReact(react, post, emoji);

        message = "Hủy emoji thành công!";
      } else {
        // Nếu emoji khác nhau, cập nhật emoji
        console.log("============= đổi");
        react.emoji = emoji;
        await react.save();

        message = "Đổi emoji thành công!";
      }
    }
  } catch (err) {
    console.log("React 1===============: ", err);
    const error = new HttpError("Có lỗi khi tương tác, vui lòng thử lại!", 500);
    return next(error);
  }

  res.status(200).json({ message: message });
};

const savePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const userId = req.userData.id;
  const postId = req.params.postId;
  const save = req.body.save;

  try {
    const user = await User.findOne({ _id: userId, banned: false }).select(
      "saved_posts"
    );

    if (!user) {
      const error = new HttpError("Không tìm thấy user từ id cung cấp!", 404);
      return next(error);
    }

    const post = await Post.findOne(
      { _id: postId, deleted_by: undefined },
      { creator: 1 }
    ).populate("creator", "_id");

    if (!post) {
      const error = new HttpError(
        "Không tìm thấy bài viết từ id cung cấp!",
        404
      );
      return next(error);
    }

    // Kiểm tra và thêm trường saved_posts nếu không tồn tại
    if (!user.saved_posts || !user.saved_posts.length) {
      console.log("?????????????????????????");
      user.saved_posts = [];
    }

    if (save) {
      // Kiểm tra nếu bài viết đã được lưu trước đó
      const existingSavedPost = user.saved_posts.find(
        (savedPost) => savedPost.post.toString() === post._id.toString()
      );
      if (existingSavedPost) {
        const error = new HttpError("Bài viết đã được lưu trước đó!", 400);
        return next(error);
      }

      if (post.creator._id.toString() === userId) {
        const error = new HttpError(
          "Không thể lưu bài viết của bản thân!",
          403
        );
        return next(error);
      }

      user.saved_posts.push({ post: post._id, saved_time: new Date() });
    } else {
      // Kiểm tra nếu bài viết chưa được lưu
      const savedPostIndex = user.saved_posts.findIndex(
        (savedPost) => savedPost.post.toString() === post._id.toString()
      );
      if (savedPostIndex === -1) {
        const error = new HttpError("Bài viết chưa được lưu!", 400);
        return next(error);
      }

      user.saved_posts.splice(savedPostIndex, 1);
    }

    await user.save();
  } catch (err) {
    console.log("Lỗi khi lưu/bỏ lưu bài viết: ", err);
    const error = new HttpError(
      "Có lỗi khi lưu/bỏ lưu bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
  res.json({ message: "Cập nhật bài viết thành công!" });
};

const deletePost = async (req, res) => {
  const userId = req.userData.id;
  const postId = req.params.postId;

  let post;
  try {
    post = await Post.findOne(
      { _id: postId, deleted_by: undefined },
      { creator: 1 }
    ).populate("creator", "posts");

    if (!post) {
      const error = new HttpError(
        "Không tìm thấy bài viết từ id cung cấp!",
        404
      );
      return next(error);
    }

    if (post.creator._id.toString() !== userId) {
      const error = new HttpError("Người dùng không có quyền xóa!", 403);
      return next(error);
    }

    post.deleted_by = { user: userId, user_role: "CREATOR" };
    await post.save();
  } catch (err) {
    console.log("Bài viết xóa 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi xóa bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
  res.json({ message: "Xóa bài viết thành công!" });
};

const getSinglePost = async (req, res, next) => {
  const userId = req.userData.id;
  const postId = req.params.postId;

  // Kiểm tra xem postId có đúng định dạng ObjectId không
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    const error = new HttpError("Post not found!", 404);
    return next(error);
  }

  try {
    const user = await User.findOne({
      _id: userId,
      banned: false,
    }).select("saved_posts block_list");

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    const savedPostIds = user.saved_posts.map((savedPost) => savedPost.post);

    const post = await Post.aggregate()
      .match({
        _id: new mongoose.Types.ObjectId(postId),
        deleted_by: { $exists: false },
        $or: [{ banned: false }, { banned: { $exists: false } }],
        creator: { $nin: user.block_list },
      })
      .lookup({
        from: "users",
        localField: "creator",
        foreignField: "_id",
        as: "creator",
      })
      .unwind("creator")
      .match({
        "creator.deleted_by": { $exists: false },
        $or: [
          { "creator.banned": false },
          { "creator.banned": { $exists: false } },
        ],
      })
      .lookup({
        from: "groups",
        localField: "group",
        foreignField: "_id",
        as: "group",
      })
      .lookup({
        from: "reacts",
        localField: "reacts",
        foreignField: "_id",
        as: "reacts",
      })
      .lookup({
        from: "comments",
        localField: "_id",
        foreignField: "post",
        as: "comments",
      })
      .addFields({
        is_user_liked: {
          $in: [new mongoose.Types.ObjectId(userId), "$reacts.reacted_by"],
        },
        reacts_count: { $size: "$reacts" },
        comments_count: { $size: "$comments" },
        is_saved: {
          $in: ["$_id", savedPostIds],
        },
      })
      .project({
        group: { _id: 1, name: 1, cover: 1 },
        creator: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        is_user_liked: 1,
        is_saved: 1,
        reacts_count: 1,
        comments_count: 1,
        updated_at: 1,
        created_at: 1,
        media: 1,
        content: 1,
        has_read: 1,
        edit_at: 1,
        shared_by: 1,
        original_post: 1,
        status: 1,
      })
      .project({
        group: {
          $ifNull: [
            { $arrayElemAt: ["$group", 0] },
            undefined, // Giá trị mặc định khi $group là mảng rỗng
          ],
        },
        creator: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        is_user_liked: 1,
        is_saved: 1,
        reacts_count: 1,
        comments_count: 1,
        updated_at: 1,
        created_at: 1,
        media: 1,
        content: 1,
        has_read: 1,
        edit_at: 1,
        shared_by: 1,
        original_post: 1,
        status: 1,
      });

    if (
      !post ||
      post.length === 0 ||
      post[0].creator.block_list.includes(userId)
    ) {
      const error = new HttpError("Không tìm thấy bài viết!", 404);
      return next(error);
    }

    if (post[0]?.group) {
      const userToGroups = await UserToGroup.findOne({
        user: userId,
        group: post[0].group,
        status: { $in: ["MEMBER", "ADMIN"] },
      }).select("_id");

      console.log(userToGroups);
      console.log(post[0].status);

      if (!userToGroups || post[0].status !== "APPROVED") {
        const error = new HttpError("Không có quyền truy cập!", 403);
        return next(error);
      }
    }

    res.json({ post: post[0] });
  } catch (err) {
    console.log("Lỗi khi lấy bài viết: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const getHomePosts = async (req, res, next) => {
  const userId = req.userData.id;
  const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
  const limit = Math.max(10, parseInt(req.query.limit)) || 10; // Số lượng bài viết mỗi trang (mặc định là 10)

  try {
    const user = await User.findOne({ _id: userId, banned: false }).select(
      "friends block_list saved_posts"
    );

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    // Lấy danh sách ID của bạn bè và block_list
    const friendIds = user.friends.map((friend) => friend._id);
    const blockListIds = user.block_list.map((blockedUser) => blockedUser._id);

    const savedPostIds = user.saved_posts.map((savedPost) => savedPost.post);

    // Lấy danh sách group mà người dùng là thành viên
    const userGroups = await UserToGroup.find({
      user: userId,
      status: { $in: ["MEMBER", "ADMIN"] },
    }).select("group");
    const groupIds = userGroups.map((userGroup) => userGroup.group);

    // Lấy danh sách post dựa trên danh sách bạn bè và group
    const posts = await Post.aggregate()
      .match({
        $or: [
          {
            // Điều kiện cho các bài viết có trường group tồn tại
            group: { $exists: true },
            group: { $in: groupIds },
            status: "APPROVED",
            deleted_by: { $exists: false },
            $or: [{ banned: false }, { banned: { $exists: false } }],
          },
          {
            // Điều kiện cho các bài viết không có trường group
            group: { $exists: false },
            $or: [
              {
                // Điều kiện cho creator là friendIds
                creator: {
                  $in: friendIds.map((id) => new mongoose.Types.ObjectId(id)),
                  $nin: blockListIds.map((id) => new mongoose.Types.ObjectId(id)),
                },
                visibility: { $in: ["PUBLIC", "FRIENDS"] },
              },
              {
                // Điều kiện cho creator là userId
                creator: new mongoose.Types.ObjectId(userId),
                visibility: { $in: ["PUBLIC", "FRIENDS", "PRIVATE"] },
              },
            ],
            status: { $exists: false },
            deleted_by: { $exists: false },
            $or: [{ banned: false }, { banned: { $exists: false } }],
          },
        ],
      })
      .lookup({
        from: "users",
        localField: "creator",
        foreignField: "_id",
        as: "creator",
      })
      .unwind("creator")
      .match({
        "creator.deleted_by": { $exists: false },
        $or: [
          { "creator.banned": false },
          { "creator.banned": { $exists: false } },
        ],
      })
      .lookup({
        from: "groups",
        localField: "group",
        foreignField: "_id",
        as: "group",
      })
      .lookup({
        from: "reacts",
        localField: "_id",
        foreignField: "post",
        as: "reacts",
      })
      .lookup({
        from: "comments",
        localField: "_id",
        foreignField: "post",
        as: "comments",
      })
      .addFields({
        is_user_liked: {
          $in: [new mongoose.Types.ObjectId(userId), "$reacts.reacted_by"],
        },
        reacts_count: { $size: "$reacts" },
        comments_count: { $size: "$comments" },
        is_saved: {
          $in: ["$_id", savedPostIds],
        },
      })
      .project({
        group: { _id: 1, name: 1, cover: 1 },
        creator: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        is_user_liked: 1,
        is_saved: 1,
        reacts_count: 1,
        comments_count: 1,
        updated_at: 1,
        created_at: 1,
        media: 1,
        content: 1,
        has_read: 1,
        edit_at: 1,
        shared_by: 1,
        original_post: 1,
      })
      .project({
        group: {
          $ifNull: [
            { $arrayElemAt: ["$group", 0] },
            undefined, // Giá trị mặc định khi $group là mảng rỗng
          ],
        },
        creator: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        is_user_liked: 1,
        is_saved: 1,
        reacts_count: 1,
        comments_count: 1,
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

    res.json({ posts: filteredPosts });
  } catch (err) {
    console.log("Bài viết 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const getUserPosts = async (req, res, next) => {
  const userId = req.userData.id;
  const username = req.params.username;
  const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
  const limit = Math.max(15, parseInt(req.query.limit)) || 15; // Số lượng bài viết mỗi trang (mặc định là 15)

  try {
    const [authUser, user] = await Promise.all([
      User.findOne({ _id: userId, banned: false }).select("saved_posts"),
      User.findOne({
        username: username,
        banned: false,
      }).select("friends block_list"),
    ]);

    if (!authUser) {
      const error = new HttpError("Người xem không hợp lệ!", 404);
      return next(error);
    }

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    // Lấy danh sách ID của bạn bè và block_list
    const isFriend = user.friends.includes(userId);
    // Kiểm tra xem userId có nằm trong blockList không
    const isBlocked = user.block_list.some(
      (blockedUser) => blockedUser._id.toString() === userId
    );

    let postVisibilities = ["PUBLIC"];
    if (isFriend) postVisibilities.push("FRIENDS");
    if (user._id.toString().trim() === authUser._id.toString().trim())
      postVisibilities.push("PRIVATE");

    if (isBlocked) {
      // Nếu userId nằm trong blockList, có thể trả về mảng rỗng hoặc thông báo tùy chọn
      const error = new HttpError("Không tìm thấy posts!", 404);
      return next(error);
    } else {
      // Nếu userId không nằm trong blockList, sử dụng populate để lấy danh sách bài viết
      await user.populate({
        path: "posts",
        match: (baseMatch, virtual) => ({
          ...virtual.options.match(baseMatch),
          group: { $exists: false },
          visibility: { $in: postVisibilities },
        }),
        options: {
          sort: { created_at: -1 },
          skip: (page - 1) * limit,
          limit: limit,
        },
        populate: { path: "comments", select: { _id: 1 } },
      });

      const savedPostIds = authUser.saved_posts.map((savedPost) =>
        savedPost.post.toString()
      );

      const posts = await Promise.all(
        user.posts.map(async (post) => {
          // Kiểm tra xem có phản ứng nào từ người dùng không
          const isUserLiked = await React.exists({
            post: post._id,
            reacted_by: userId,
          })
            .lean()
            .then((react) => !!react);

          const isSaved = savedPostIds.includes(post._id.toString());

          let returnPost = {
            _id: post._id,
            reacts_count: post.reacts.length,
            comments_count: post.comments.length,
            created_at: post.created_at,
            media: post.media,
            content: post.content,
            banned: post.banned,
            is_user_liked: isUserLiked,
            ...(Object.entries(post.deleted_by).length === 0 &&
              post.deleted_by.constructor === Object && {
                deleted_by: post.deleted_by,
              }),
            is_saved: isSaved,
          };

          return returnPost;
        })
      );

      res.json({ posts: posts });
    }
  } catch (err) {
    console.log("Bài viết 1===============: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const getSavedPosts = async (req, res, next) => {
  const userId = req.userData.id;
  const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
  const limit = Math.max(15, parseInt(req.query.limit)) || 15; // Số lượng bài viết mỗi trang (mặc định là 15)

  try {
    const user = await User.findOne({ _id: userId, banned: false }).select(
      "saved_posts"
    );
    user.saved_posts.sort((a, b) => b.saved_time - a.saved_time);

    await user.populate({
      path: "saved_posts.post",
      match: {
        deleted_by: { $exists: false },
        $or: [{ banned: false }, { banned: { $exists: false } }],
      },
      options: { skip: (page - 1) * limit, limit: limit },
      populate: { path: "comments", select: { _id: 1 } },
    });

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    const savedPosts = await Promise.all(
      user.saved_posts.map(async (savedPost) => {
        const post = savedPost.post;

        // Kiểm tra xem có phản ứng nào từ người dùng không
        const isUserLiked = await React.exists({
          post: post._id,
          reacted_by: userId,
        })
          .lean()
          .then((react) => !!react);

        return {
          _id: post._id,
          reacts_count: post.reacts.length,
          comments_count: post.comments.length,
          created_at: post.created_at,
          media: post.media,
          content: post.content,
          banned: post.banned,
          saved_time: savedPost.saved_time,
          is_user_liked: isUserLiked,
          ...(Object.entries(post.deleted_by).length === 0 &&
            post.deleted_by.constructor === Object && {
              deleted_by: post.deleted_by,
            }),
          is_saved: true,
        };
      })
    );

    res.json({ saved_posts: savedPosts });
  } catch (err) {
    console.log("Lỗi khi lấy bài viết đã lưu: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy bài viết đã lưu, vui lòng thử lại!",
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
    const [user, post] = await Promise.all([
      User.findOne({ _id: userId, banned: false }).select("block_list"),
      Post.findOne(
        {
          _id: postId,
          deleted_by: { $exists: false },
          $or: [{ banned: false }, { banned: { $exists: false } }],
        },
        { comments: 1 }
      ).select("_id"),
    ]);

    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }
    if (!post) {
      const error = new HttpError("Không tìm thấy post!", 404);
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
        deleted_by: { $exists: false },
      })
      .lookup({
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      })
      .unwind("user")
      .match({
        $expr: {
          $not: {
            $in: [new mongoose.Types.ObjectId(userId), "$user.block_list"],
          },
        },
      })
      .lookup({
        from: "comments",
        localField: "_id",
        foreignField: "parent",
        as: "children",
        pipeline: [
          {
            $match: {
              deleted_by: { $exists: false }, // Thêm điều kiện không bị xóa
            },
          },
        ],
      })
      .addFields({ children_cmts_count: { $size: "$children" } })
      .project({
        user: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        children_cmts_count: 1,
        parent: 1,
        reply_to: 1,
        cmt_level: 1,
        media: 1,
        comment: 1,
        created_at: 1,
      })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ comments: comments });
  } catch (err) {
    console.log("Comment 2===============: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy comments, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const getChildrenComments = async (req, res, next) => {
  const userId = req.userData.id;
  const commentId = req.params.commentId;
  const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
  const limit = Math.max(300, parseInt(req.query.limit)) || 300; // Số lượng comments mỗi lần (mặc định là 300)

  try {
    const user = await User.findOne({ _id: userId, banned: false }).select(
      "block_list"
    );
    if (!user) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    const blockListIds = user.block_list.map((blockedUser) => blockedUser._id);

    const children = await Comment.aggregate()
      .match({
        parent: new mongoose.Types.ObjectId(commentId),
        user: {
          $nin: blockListIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        deleted_by: { $exists: false },
      })
      .lookup({
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      })
      .unwind("user")
      .match({
        $expr: {
          $not: {
            $in: [new mongoose.Types.ObjectId(userId), "$user.block_list"],
          },
        },
      })
      .project({
        user: { _id: 1, username: 1, profile_picture: 1, block_list: 1 },
        parent: 1,
        reply_to: 1,
        cmt_level: 1,
        media: 1,
        comment: 1,
        created_at: 1,
      })
      .sort({ created_at: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ replies: children });
  } catch (err) {
    console.log("Error while fetching children comments: ", err);
    const error = new HttpError("Có lỗi khi lấy các comment con!", 500);
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
    const [user, post] = await Promise.all([
      User.findOne({ _id: userId, banned: false }).select("_id"),
      Post.findOne(
        {
          _id: postId,
          deleted_by: { $exists: false },
          $or: [{ banned: false }, { banned: { $exists: false } }],
        },
        { comments: 1 }
      ).select("_id"),
    ]);

    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
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
    await newComment.populate("user", "username profile_picture");
    await newComment.populate("parent", "user");
    await sess.commitTransaction();

    res.status(201).json({ comment: newComment });
  } catch (err) {
    console.log("Comment 1===============: ", err);
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
    const comment = await Comment.findOne({
      _id: commentId,
      deleted_by: { $exists: false },
    })
      .select("user post cmt_level mother_cmt")
      .populate("post", "creator");

    if (!comment) {
      const error = new HttpError(
        "Không tìm thấy comment từ id cung cấp!",
        404
      );
      return next(error);
    }

    if (
      comment.user.toString() !== userId &&
      comment.post.creator.toString() !== userId
    ) {
      const error = new HttpError("Người dùng không có quyền xóa!", 403);
      return next(error);
    }

    let deletedByRole = "USER";

    // Kiểm tra xem user có phải là creator của post hay không
    const postCreatorId = comment.post.creator.toString();
    if (postCreatorId === userId) {
      deletedByRole = "POST_CREATOR";
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await comment.updateOne({
      deleted_by: {
        user: userId,
        user_role: deletedByRole,
      },
    });

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
  res.json({ message: "Xóa comment thành công!" });
};

const reportPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const userId = req.userData.id;
  const { postId, reason } = req.body;

  try {
    const [user, post, reportedPost] = await Promise.all([
      User.findOne({ _id: userId, banned: false }).select("_id"),
      Post.findOne({
        _id: postId,
        deleted_by: { $exists: false },
        $or: [{ banned: false }, { banned: { $exists: false } }],
      }).select("creator"),
      ReportedPost.findOne({ reported_by: userId, post: postId }),
    ]);

    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }

    if (!post) {
      const error = new HttpError("Không tìm thấy post!", 404);
      return next(error);
    }

    if (reportedPost) {
      // Nếu đã tồn tại ReportedPost, cập nhật reason mới
      reportedPost.reason = reason;
      await reportedPost.save();
    } else {
      // Nếu chưa tồn tại ReportedPost, tạo mới
      const newReport = new ReportedPost({
        reported_by: user._id,
        post: post._id,
        reason: reason,
      });
      await newReport.save();
    }

    res.status(200).json({ message: "Báo cáo bài viết thành công!" });
  } catch (err) {
    console.log("Báo cáo lỗi: ", err);
    const error = new HttpError(
      "Có lỗi báo cáo bài viết, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

exports.createPost = createPost;
exports.getHomePosts = getHomePosts;
exports.getPostComments = getPostComments;
exports.deletePost = deletePost;
exports.deleteComment = deleteComment;
exports.reactPost = reactPost;
exports.comment = comment;
exports.getUserPosts = getUserPosts;
exports.getSinglePost = getSinglePost;
exports.reportPost = reportPost;
exports.savePost = savePost;
exports.getSavedPosts = getSavedPosts;
exports.getChildrenComments = getChildrenComments;
