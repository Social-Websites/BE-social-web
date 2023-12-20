const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Post = require("../models/post");
const UserToGroup = require("../models/user_to_group");
const Group = require("../models/community_group");
const User = require("../models/user");
const Comment = require("../models/comment");
const { validationResult } = require("express-validator");

class GroupsController {
    // Lấy danh sách group mà người dùng là thành viên
    async getGroupsForMember(userId) {
        const userToGroup = await UserToGroup.find({ user: userId, status: "MEMBER" }).populate("group");
        const groups = userToGroup.map(userGroup => userGroup.group);
        return groups;
    }

    // Lấy danh sách group mà người dùng là admin
    async getGroupsForAdmin(userId) {
        const userToGroup = await UserToGroup.find({ user: userId, status: "ADMIN" }).populate("group");
        const groups = userToGroup.map(userGroup => userGroup.group);
        return groups;
    }

    // Lấy danh sách group mà người dùng được mời tham gia
    async getGroupsForInvited(userId) {
        const userToGroup = await UserToGroup.find({ user: userId, status: "INVITED" }).populate("group");
        const groups = userToGroup.map(userGroup => userGroup.group);
        return groups;
    }

    // Lấy thông tin id, name và cover của group
    async getGroupInfo(groupId) {
        const group = await Group.findById(groupId);
        const { _id, name, cover } = group;
        return { id: _id, name, cover };
    }
    
    // Sử dụng các hàm trên để lấy thông tin các group mà người dùng là thành viên
    async getMemberGroups() {
        const userId = req.userData.id;
        const user = await User.findOne({ _id: userId, banned: false });
        if (!user) {
            const error = new HttpError("Không tìm thấy user!", 404);
            return next(error);
        }
        const groups = await getGroupsForMember(userId);
        const groupInfoPromises = groups.map(group => getGroupInfo(group._id));
        const groupInfo = await Promise.all(groupInfoPromises);
        return groupInfo;
    }

    // Sử dụng các hàm trên để lấy thông tin các group mà người dùng là admin
    async getAdminGroups() {
        const userId = req.userData.id;
        const user = await User.findOne({ _id: userId, banned: false });
        if (!user) {
            const error = new HttpError("Không tìm thấy user!", 404);
            return next(error);
        }
        const groups = await getGroupsForAdmin(userId);
        const groupInfoPromises = groups.map(group => getGroupInfo(group._id));
        const groupInfo = await Promise.all(groupInfoPromises);
        return groupInfo;
    }

    // Sử dụng các hàm trên để lấy thông tin các group mà người dùng là admin
    async getInvitedGroups() {
        const userId = req.userData.id;
        const user = await User.findOne({ _id: userId, banned: false });
        if (!user) {
            const error = new HttpError("Không tìm thấy user!", 404);
            return next(error);
        }
        const groups = await getGroupsForInvited(userId);
        const groupInfoPromises = groups.map(group => getGroupInfo(group._id));
        const groupInfo = await Promise.all(groupInfoPromises);
        return groupInfo;
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
          });
          // Lưu group vào cơ sở dữ liệu
          await group.save();
          // Lấy ID của group sau khi được lưu
          const groupId = group._id;
          // Lấy ID của người dùng đang tạo group
          const userId = req.userData.id;
          // Tạo một document mới trong UserToGroup để lưu thông tin quan hệ người dùng - group
          const userToGroup = new UserToGroup({
            user: userId,
            group: groupId,
            status: "ADMIN",
          });
          // Lưu userToGroup vào cơ sở dữ liệu
          await userToGroup.save();
          res.status(201).json({ message: "Group đã được tạo thành công!" });
        } catch (error) {
          console.log(error);
          next(error);
        }
      }

}

module.exports = new GroupsController();
