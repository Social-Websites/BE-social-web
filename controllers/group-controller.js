const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Post = require("../models/post");
const UserToGroup = require("../models/user_to_group");
const Group = require("../models/community_group");
const User = require("../models/user");
const Comment = require("../models/comment");
const { validationResult } = require("express-validator");





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
            const userToGroup = await UserToGroup.find({ user: userId, status: "MEMBER" }).populate("group");
            const groups = userToGroup.map(userGroup => userGroup.group);
            const groupInfoPromises = groups.map(async (group) => {const g = await Group.findById(group._id);
                                                    const { _id, name, cover } = g;
                                                    return { id: _id, name, cover };}
                                                );
            const groupInfo = await Promise.all(groupInfoPromises);
            res.json({groups: groupInfo});
        } catch(err){
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
            const userToGroup = await UserToGroup.find({ user: userId, status: "ADMIN" }).populate("group");
            const groups = userToGroup.map(userGroup => userGroup.group);
            const groupInfoPromises = groups.map(async (group) => {const g = await Group.findById(group._id);
                const { _id, name, cover } = g;
                return { _id, name, cover };}
            );
            const groupInfo = await Promise.all(groupInfoPromises);
            res.json({groups: groupInfo });
        } catch(err){
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
            const userToGroup = await UserToGroup.find({ user: userId, status: "INVITED" }).populate("group");
            const groups = userToGroup.map(userGroup => userGroup.group);
            const groupInfoPromises = groups.map(async (group) => {const g = await Group.findById(group._id);
                const { _id, name, cover } = g;
                return { id: _id, name, cover };}
            );
            const groupInfo = await Promise.all(groupInfoPromises);
            res.json({groups: groupInfo });
        } catch(err){
            console.log(err);
            const error = new HttpError(
            "Có lỗi khi lấy bài viết, vui lòng thử lại!",
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
            const groups = await Group.find({ name: regex }).limit(15); // Giới hạn trả về 50 kết quả
            res.json(groups);
        } catch (error) {
            console.log(error);
            next(error);
        }
    }

}

module.exports = new GroupsController();
