const HttpError = require("../models/http-error");
const UserToGroup = require("../models/user_to_group");
const Group = require("../models/community_group");
const User = require("../models/user");



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
                                                    return { _id, name, cover, status:"MEMBER" };}
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
                return { _id, name, cover, status:"ADMIN" };}
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
                return { _id, name, cover, status:"INVITED" };}
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
                $set:{
                    name: name,
                    description: description,
                    cover: cover,
                }
            };
            await Group.updateOne({_id: groupId}, update);
            res.json(true);
        }

        catch (error) {
            console.error('Lỗi khi cập nhật thông tin!');
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

            const groups = await Group.find({ name: regex })
            let groupsInfo = [];
            for(const group of groups){
                const findgroup = await UserToGroup.find({ user: userId, group: group._id })
                console.log(findgroup);
                let status = null;
                if (findgroup.length > 0) {
                    status = findgroup[0].status;
                }
                groupsInfo.push({_id: group._id, name: group.name, cover: group.cover, status: status})
            }

            console.log(groupsInfo);

            res.json(groupsInfo);
        } catch (error) {
            console.log(error);
            next(error);
        }
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
            await Group.findOneAndUpdate(
                { user: userId, group: groupId },
                { $set: {status: "MEMBER"}} 
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
        console.log(userId,groupId)
        if (!user) {
            const error = new HttpError("Không tìm thấy user!", 404);
            return next(error);
        }
        try {
            await UserToGroup.deleteOne(
                { user: userId, group: groupId }
            );
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

}

module.exports = new GroupsController();
