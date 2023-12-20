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

}

module.exports = new GroupsController();
