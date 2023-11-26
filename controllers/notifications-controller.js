
const User = require("../models/user");
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
            notificationsInfo.push({_id: notification._id, sender_id: notification.sender_id, senderName: sender.username, 
                img: sender.profile_picture, content: notification.content, read:notification.read, createAt: notification.created_at});
            }
        }
        res.json(notificationsInfo);
        }
        catch (error) {
        next(error);
        }
    }

    async sendNotification(req, res, next) {
        const { sender_id, receiver_id, content_id, type } = req.body;
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
}

module.exports = new NotificationsController();