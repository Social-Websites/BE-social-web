const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const UserToGroup = require("../models/user_to_group");
const Group = require("../models/community_group");
const User = require("../models/user");
const Post = require("../models/post");
const { validationResult } = require("express-validator");
const React = require("../models/react");

class GroupsController {
  // Sử dụng các hàm trên để lấy thông tin các group mà người dùng là thành viên
  async getMemberGroups(req, res, next) {
    const userId = req.userData.id;
    try {
      const user = await User.findOne({ _id: userId, banned: false });
      if (!user) {
        const error = new HttpError("Không tìm thấy user!", 404);
        return next(error);
      }
      const userToGroup = await UserToGroup.find({
        user: userId,
        status: "MEMBER",
      }).populate("group");
      const groups = userToGroup.map((userGroup) => userGroup.group);
      const groupInfoPromises = groups.map(async (group) => {
        const g = await Group.findById(group._id);
        const { _id, name, cover } = g;
        return { _id, name, cover, status: "MEMBER" };
      });
      const groupInfo = await Promise.all(groupInfoPromises);
      res.json({ groups: groupInfo });
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "Có lỗi khi lấy bài viết, vui lòng thử lại!",
        500
      );
      return next(error);
    }
  }

  // Sử dụng các hàm trên để lấy thông tin các group mà người dùng là admin
  async getAdminGroups(req, res, next) {
    const userId = req.userData.id;
    try {
      const user = await User.findOne({ _id: userId, banned: false });
      if (!user) {
        const error = new HttpError("Không tìm thấy user!", 404);
        return next(error);
      }
      const userToGroup = await UserToGroup.find({
        user: userId,
        status: "ADMIN",
      }).populate("group");
      const groups = userToGroup.map((userGroup) => userGroup.group);
      const groupInfoPromises = groups.map(async (group) => {
        const g = await Group.findById(group._id);
        const { _id, name, cover } = g;
        return { _id, name, cover, status: "ADMIN" };
      });
      const groupInfo = await Promise.all(groupInfoPromises);
      res.json({ groups: groupInfo });
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "Có lỗi khi lấy bài viết, vui lòng thử lại!",
        500
      );
      return next(error);
    }
  }

  // Sử dụng các hàm trên để lấy thông tin các group mà người dùng là admin
  async getInvitedGroups(req, res, next) {
    const userId = req.userData.id;
    try {
      const user = await User.findOne({ _id: userId, banned: false });
      if (!user) {
        const error = new HttpError("Không tìm thấy user!", 404);
        return next(error);
      }
      const userToGroup = await UserToGroup.find({
        user: userId,
        status: "INVITED",
      }).populate("group");
      const groups = userToGroup.map((userGroup) => userGroup.group);
      const groupInfoPromises = groups.map(async (group) => {
        const g = await Group.findById(group._id);
        const { _id, name, cover } = g;
        return { _id, name, cover, status: "INVITED" };
      });
      const groupInfo = await Promise.all(groupInfoPromises);
      res.json({ groups: groupInfo });
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "Có lỗi khi lấy bài viết, vui lòng thử lại!",
        500
      );
      return next(error);
    }
  }

  async getJoinGroupRequests(req, res, next) {
    const userId = req.userData.id;
    const groupId = req.params.groupId;
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(20, parseInt(req.query.limit)) || 20;

    try {
      const user = await User.findOne({ _id: userId, banned: false });
      if (!user) {
        const error = new HttpError("Không tìm thấy user!", 404);
        return next(error);
      }

      const userToGroupAdmin = await UserToGroup.findOne({
        group: groupId,
        user: userId,
        status: "ADMIN",
      });

      if (!userToGroupAdmin) {
        const error = new HttpError(
          "Bạn không có quyền truy cập vào yêu cầu tham gia nhóm!",
          403
        );
        return next(error);
      }

      const userToGroup = await UserToGroup.find({
        group: groupId,
        status: "REQUESTED",
      })
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: "user",
          match: { deleted_by: { $exists: false }, banned: false },
          select: "username profile_picture full_name created_at",
        });

      const users = userToGroup.map((userGroup) => {
        const { _id, username, profile_picture, full_name, created_at } =
          userGroup.user;
        return {
          _id,
          username,
          profile_picture,
          full_name,
          created_at,
          status: userGroup.status,
        };
      });

      res.json({ users: users });
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "Có lỗi khi lấy danh sách yêu cầu tham gia nhóm, vui lòng thử lại!",
        500
      );
      return next(error);
    }
  }

  async getGroupMembers(req, res, next) {
    const userId = req.userData.id;
    const groupId = req.params.groupId;
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(20, parseInt(req.query.limit)) || 20;

    try {
      const user = await User.findOne({ _id: userId, banned: false });
      if (!user) {
        const error = new HttpError("Không tìm thấy user!", 404);
        return next(error);
      }
      const group = await Group.findOne({ _id: groupId }); /*.populate({
        path: "members",
        populate: {
          path: "user",
          select: "username full_name profile_picture",
        },
      });*/
      if (!group) {
        const error = new HttpError("Không tìm thấy nhóm!", 404);
        return next(error);
      }

      const groupMembers = await UserToGroup.find({
        group: groupId,
        status: { $in: ["MEMBER", "ADMIN"] },
      })
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: "user",
          match: { deleted_by: { $exists: false }, banned: false },
          select: "username profile_picture full_name created_at",
        });

      const members = groupMembers.map((member) => {
        const { _id, username, profile_picture, full_name, created_at } =
          member.user;
        return {
          _id,
          username,
          profile_picture,
          full_name,
          created_at,
          status: member.status,
        };
      });

      res.json({ members: members });
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "Có lỗi khi lấy danh sách thành viên nhóm, vui lòng thử lại!",
        500
      );
      return next(error);
    }
  }

  async createGroup(req, res, next) {
    const { name, description, cover } = req.body;
    const userId = req.userData.id;
    const user = await User.findOne({ _id: userId, banned: false });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    try {
      // Tạo một document mới cho group
      const group = new Group({
        name,
        description,
        cover,
        created_by: userId,
      });
      // Lưu group vào cơ sở dữ liệu
      await group.save();
      // Lấy ID của group sau khi được lưu
      const groupId = group._id;

      // Tạo một document mới trong UserToGroup để lưu thông tin quan hệ người dùng - group
      const userToGroup = new UserToGroup({
        user: userId,
        group: groupId,
        status: "ADMIN",
      });
      // Lưu userToGroup vào cơ sở dữ liệu
      await userToGroup.save();
      res.json(group);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async editGroup(req, res) {
    const { name, description, cover, groupId } = req.body;
    const userId = req.userData.id;
    const user = await User.findOne({ _id: userId, banned: false });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    try {
      const update = {
        $set: {
          name: name,
          description: description,
          cover: cover,
        },
      };
      await Group.updateOne({ _id: groupId }, update);
      res.json(true);
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin!");
      console.log(error);
      next(error);
    }
  }

  async searchGroups(req, res, next) {
    const userId = req.userData.id;
    const user = await User.findOne({ _id: userId, banned: false });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    const searchText = req.query.searchText;
    console.log("userId" + userId);
    console.log("Search" + searchText);
    try {
      const regex = new RegExp(searchText, "i");

      const groups = await Group.find({ name: regex });
      let groupsInfo = [];
      for (const group of groups) {
        const [findgroup, ownergroup] = await Promise.all([
          UserToGroup.findOne({
            user: userId,
            group: group._id,
          }),
          UserToGroup.findOne({
            group: group._id,
            status: "ADMIN",
          }),
        ]);

        groupsInfo.push({
          _id: group._id,
          name: group.name,
          cover: group.cover,
          owner: ownergroup?.user,
          status: findgroup?.status,
        });
      }

      console.log(groupsInfo);

      res.json(groupsInfo);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async createGroupPost(req, res, next) {
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

    const { groupId, title, urlStrings } = req.body;
    const newPost = new Post({
      group: groupId,
      creator: userId,
      content: title,
      media: urlStrings,
      visibility: "GROUP",
      status: "PENDING",
    });

    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      await newPost.save({ session: sess });
      await newPost.populate("creator", "username profile_picture");
      await sess.commitTransaction();
    } catch (err) {
      console.log("Bài viết group 1===============: ", err);
      const error = new HttpError(
        "Có lỗi khi tạo bài viết, vui lòng thử lại!",
        500
      );
      return next(error);
    }

    res.status(201).json({ post: newPost });
  }

  async approveGroupPost(req, res, next) {
    const userId = req.userData.id;
    const postId = req.params.postId;

    try {
      const user = await User.findOne({ _id: userId, banned: false });
      if (!user) {
        const error = new HttpError(
          "Người dùng không tồn tại hoặc bị cấm!",
          404
        );
        return next(error);
      }
      const post = await Post.findOne({ _id: postId, status: "PENDING" });
      if (!post) {
        const error = new HttpError(
          "Bài viết không tồn tại hoặc không thể duyệt!",
          404
        );
        return next(error);
      }
      const userToGroup = await UserToGroup.findOne({
        user: userId,
        group: post.group,
        status: "ADMIN",
      });
      if (!userToGroup) {
        const error = new HttpError(
          "Người dùng không có quyền duyệt bài viết!",
          403
        );
        return next(error);
      }
      // Update status to "APPROVED"
      post.status = "APPROVED";
      await post.save();
    } catch (err) {
      console.log("Lỗi khi lưu bài viết: ", err);
      const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại!", 500);
      return next(error);
    }

    res.json({ message: "Bài viết đã được duyệt!" });
  }

  async rejectGroupPost(req, res, next) {
    const userId = req.userData.id;
    const postId = req.params.postId;

    try {
      const user = await User.findOne({ _id: userId, banned: false });
      if (!user) {
        const error = new HttpError(
          "Người dùng không tồn tại hoặc bị cấm!",
          404
        );
        return next(error);
      }
      const post = await Post.findOne({ _id: postId, status: "PENDING" });
      if (!post) {
        const error = new HttpError(
          "Bài viết không tồn tại hoặc không thể từ chối!",
          404
        );
        return next(error);
      }
      const userToGroup = await UserToGroup.findOne({
        user: userId,
        group: post.group,
        status: "ADMIN",
      });
      if (!userToGroup) {
        const error = new HttpError(
          "Người dùng không có quyền duyệt bài viết!",
          403
        );
        return next(error);
      }

      post.deleted_by = { user: userId, user_role: "GROUP_ADMIN" };
      await post.save();
    } catch (err) {
      console.log("Lỗi khi lưu bài viết: ", err);
      const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại!", 500);
      return next(error);
    }

    res.json({ message: "Bài viết đã bị từ chối!" });
  }

  async acceptGroup(req, res, next) {
    const userId = req.userData.id;
    const groupId = req.query.groupId;
    const user = await User.findOne({ _id: userId, banned: false });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    try {
      await UserToGroup.findOneAndUpdate(
        { user: userId, group: groupId },
        { $set: { status: "MEMBER" } }
      );
      res.json(true);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async kickGroup(req, res, next) {
    const userId = req.userData.id;
    const groupId = req.query.groupId;
    const user = await User.findOne({ _id: userId, banned: false });
    console.log(userId, groupId);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    try {
      await UserToGroup.deleteOne({ user: userId, group: groupId });
      res.json(true);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async requestToGroup(req, res, next) {
    const userId = req.userData.id;
    const groupId = req.query.groupId;
    const user = await User.findOne({ _id: userId, banned: false });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    try {
      // Tạo một document mới trong UserToGroup để lưu thông tin quan hệ người dùng - group
      const userToGroup = new UserToGroup({
        user: userId,
        group: groupId,
        status: "REQUESTED",
      });
      // Lưu userToGroup vào cơ sở dữ liệu
      await userToGroup.save();

      res.json(true);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async acceptRequest(req, res, next) {
    const userId = req.userData.id;
    const { groupId, requesterId } = req.params;

    const user = await User.findOne({ _id: userId, banned: false });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }

    const admin = await UserToGroup.findOne({ user: userId, status: "ADMIN" });
    if (!admin) {
      const error = new HttpError("Không có quyền!", 403);
      return next(error);
    }

    try {
      const userToGroup = await UserToGroup.findOneAndUpdate(
        { user: requesterId, group: groupId },
        { $set: { status: "MEMBER" } },
        { new: true }
      );
      if (!userToGroup) {
        const error = new HttpError("Cập nhật không thành công!", 404);
        return next(error);
      }
      res.json({ message: "Chấp nhận thành công!" });
    } catch (err) {
      console.log(err);
      const error = new HttpError("Có lỗi khi accept!", 500);
      return next(error);
    }
  }

  async rejectRequest(req, res, next) {
    const userId = req.userData.id;
    const { groupId, requesterId } = req.params;

    const user = await User.findOne({ _id: userId, banned: false });

    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }

    const admin = await UserToGroup.findOne({ user: userId, status: "ADMIN" });
    if (!admin) {
      const error = new HttpError("Không có quyền!", 403);
      return next(error);
    }

    try {
      const userToGroup = await UserToGroup.deleteOne({
        user: requesterId,
        group: groupId,
      });

      if (userToGroup.deletedCount === 0) {
        const error = new HttpError("Cập nhật không thành công!", 404);
        return next(error);
      }

      res.json({ message: "Loại thành công!" });
    } catch (err) {
      console.log(err);
      const error = new HttpError("Có lỗi khi kick!", 500);
      return next(error);
    }
  }

  async inviteToGroup(req, res, next) {
    const userId = req.userData.id;
    const { groupId, userToInviteId } = req.params;
    const user = await User.findOne({ _id: userId, banned: false });
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
      const error = new HttpError("Không tìm thấy group!", 404);
      return next(error);
    }
    try {
      // Tạo một document mới trong UserToGroup để lưu thông tin quan hệ người dùng - group
      const userToGroup = new UserToGroup({
        user: userToInviteId,
        group: groupId,
        status: "INVITED",
      });
      // Lưu userToGroup vào cơ sở dữ liệu
      await userToGroup.save();
      res.json({ message: "Mời thành công!" });
    } catch (err) {
      console.log(err);
      const error = new HttpError("Có lỗi khi mời!", 500);
      return next(error);
    }
  }

  async getGroupDetail(req, res, next) {
    const groupId = req.params.groupId;
    const userId = req.userData.id;

    try {
      const [group, userToGroup] = await Promise.all([
        Group.findById(groupId).populate(
          "created_by",
          "username full_name profile_picture"
        ),
        UserToGroup.findOne({
          group: groupId,
          user: userId,
          status: { $in: ["MEMBER", "ADMIN"] },
        }),
      ]);

      if (!group) {
        const error = new HttpError("Nhóm không tồn tại!", 404);
        return next(error);
      }

      if (!userToGroup && group.created_by.toString() !== userId) {
        const error = new HttpError(
          "Bạn không có quyền truy cập vào nhóm!",
          403
        );
        return next(error);
      }
      const [membersCount, requestsCount, groupPostsCount] = await Promise.all([
        UserToGroup.countDocuments({
          group: groupId,
          status: { $in: ["MEMBER", "ADMIN"] },
        }),
        UserToGroup.countDocuments({
          group: groupId,
          status: "REQUESTED",
        }),
        Post.countDocuments({
          group: groupId,
          status: "APPROVED",
        }),
      ]);

      const groupDetail = {
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        members_count: membersCount,
        requests_count: requestsCount,
        group_posts_count: groupPostsCount,
        is_group_admin: userToGroup.status === "ADMIN",
        // Các trường còn lại của schema Group
        cover: group.cover,
        visibility: group.visibility,
        created_at: group.created_at,
        updated_at: group.updated_at,
      };

      res.json({ group_detail: groupDetail });
    } catch (err) {
      console.log("Group detail 1===============: ", err);
      const error = new HttpError(
        "Có lỗi khi lấy thông tin Group, vui lòng thử lại!",
        500
      );
      return next(error);
    }
  }

  async getUserFriendsListToInvite(req, res, next) {
    const userId = req.userData.id;
    const groupId = req.params.groupId;

    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(20, parseInt(req.query.limit)) || 20;

    try {
      const group = Group.findOne({ _id: groupId });
      if (!group) {
        const error = new HttpError("Group không tồn tại", 404);
        return next(error);
      }
      const user = await User.findOne({
        _id: userId,
        banned: false,
      }).populate({
        path: "friends",
        match: { $or: [{ banned: false }, { banned: { $exists: false } }] },
        select: "username full_name profile_picture",
        options: {
          limit: limit,
          skip: (page - 1) * limit,
        },
      });

      if (!user) {
        const error = new HttpError("Người dùng không tồn tại", 404);
        return next(error);
      }

      const friendsList = user.friends.map(async (friend) => {
        const userToGroup = await UserToGroup.findOne({
          group: groupId,
          user: friend._id,
        });

        return {
          _id: friend._id,
          username: friend.username,
          full_name: friend.full_name,
          profile_picture: friend.profile_picture,
          status: userToGroup?.status ? userToGroup?.status : "NONE",
        };
      });

      const resolvedFriendsList = await Promise.all(friendsList);

      res.json({ friends: resolvedFriendsList });
    } catch (err) {
      console.error("======Lấy danh sách bạn bè của người dùng: ", err);
      const error = new HttpError(
        "Có lỗi khi lấy thông tin người dùng, vui lòng thử lại sau!",
        500
      );
      return next(error);
    }
  }

  async getGroupPostsWithStatus(req, res, next) {
    const userId = req.userData.id;
    const groupId = req.params.groupId;
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page)) || 1; // Trang hiện tại (mặc định là 1)
    const limit = Math.max(15, parseInt(req.query.limit)) || 15; // Số lượng bài viết mỗi trang (mặc định là 15)

    try {
      const user = await User.findOne({ _id: userId, banned: false }).select(
        "friends block_list saved_posts"
      );

      if (!user) {
        const error = new HttpError("Không tìm thấy người dùng!", 404);
        return next(error);
      }

      const group = await Group.findOne({ _id: groupId });

      if (!group) {
        const error = new HttpError("Không tìm thấy group!", 404);
        return next(error);
      }

      await group.populate({
        path: "posts",
        match: (baseMatch, virtual) => ({
          ...virtual.options.match(baseMatch),
          status: status,
        }),
        options: {
          sort: { created_at: -1 },
          skip: (page - 1) * limit,
          limit: limit,
        },
        populate: [
          { path: "creator", select: "username profile_picture" },
          { path: "comments", select: "_id" },
        ],
      });

      const savedPostIds = user.saved_posts.map((savedPost) =>
        savedPost.post.toString()
      );

      const posts = await Promise.all(
        group.posts.map(async (post) => {
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
            group: post.group,
            creator: post.creator,
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
    } catch (err) {
      console.log("Bài viết 1===============: ", err);
      const error = new HttpError(
        "Có lỗi khi lấy bài viết, vui lòng thử lại!",
        500
      );
      return next(error);
    }
  }
}

module.exports = new GroupsController();
