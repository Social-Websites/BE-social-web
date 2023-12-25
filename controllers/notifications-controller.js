
const User = require("../models/user");
const Group = require("../models/community_group");
const Notification = require("../models/notification");


class NotificationsController {
    async getNotifications(req, res, next) {
        const notificationsInfo = [];
        try{
        const userId = req.params.userId;
        const skip = parseInt(req.query.skip) || 0; // Số lượng tin nhắn đã lấy trước đó, mặc định là 0
        const notifications = await Notification.find({user_id: userId})
        .sort({ created_at: -1 })
        .skip(skip) // Bỏ qua số lượng tin nhắn đã lấy trước đó
        .limit(20) // Giới hạn 20 tin nhắn
        .exec();

        if(notifications){
            for (const notification of notifications) {
                const sender = await User.findById(notification.sender_id).exec();
                const group = await Group.findById(notification.group_id).exec();
                notificationsInfo.push({_id: notification._id, sender_id: notification.sender_id, senderName: sender?.username, 
                    img: sender?.profile_picture, content_id: notification.content_id, group_id: notification.group_id, group_cover: group?.cover, group_name: group?.name,
                    content: notification.content, reponse: notification.reponse, read:notification.read, createAt: notification.created_at});
            }
        }
        res.json(notificationsInfo);
        }
        catch (error) {
            next(error);
            console.log(error);
        }
    }

    async sendNotification(req, res, next) {
        const { sender_id, receiver_id, content_id, group_id, type } = req.body;
        let content = ""
        if(type == "like"){
            content = " liked your post";
        } else if(type == "comment"){
            content = " comment on your post";
        } else if(type == "post"){
            content = "create the post";
        }

        const newNotification = new Notification({
            user_id: receiver_id,
            sender_id: sender_id,
            content: content,
            content_id: content_id,
            group_id: group_id,
            read: false
        });
        
        // Lưu thông báo vào cơ sở dữ liệu
        await newNotification.save()
            .then((notification) => {
                console.log("Thông báo đã được tạo:", notification);
                res.json(notification);
            })
            .catch((error) => {
                console.error("Lỗi khi tạo thông báo:", error);
                next(error);
            });
    }

    async addReader(req, res, next) {
        try {
            await Notification.updateMany(
                {  },
                { $set: { read: true } });
          res.json(true);
        } catch (error) {
          next(error);
        }
    }

    async deleteNotification(req, res, next) {
        const notificationId = req.query.notificationId;

        Notification.deleteOne({ _id: notificationId })
        .then(() => {
            console.log("Notification deleted successfully.");
            res.json(true);
        })
        .catch((error) => {
            console.error("Error deleting notification:", error);
            next(error);
        });
    }
}

module.exports = new NotificationsController();