const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");


class ConversationController {
  async getUserConversations(req, res, next) {
    const userId = req.params.userId; // ID của người dùng
    const conversationInfo = [];
  
    try {
      // Tìm người dùng dựa trên userId
      const user = await User.findById(userId).exec();
  
      if (!user) {
        // Xử lý khi không tìm thấy người dùng
        return res.status(404).json({ message: "Người dùng không tồn tại" });
      }
  
      // Lấy danh sách cuộc trò chuyện dựa trên trường conversations trong user
      const conversationIds = user.conversations;
  
      // Tìm các cuộc trò chuyện dựa trên danh sách conversationIds
      const conversations = await Conversation.find({
        $and: [
          { _id: { $in: conversationIds } },
          { $or: [
            { is_deleted: { $exists: false } },
            { "is_deleted.user_id": { $ne: userId } },
            { "is_deleted.user_id": userId, "is_deleted.deleted": false }
          ] }
        ]
      })
      .sort({ updated_at: -1 }) // Sắp xếp theo thứ tự giảm dần của createdAt
      .exec();
      
      for (const conversation of conversations) {
        let last_message = "";
        let unread;
        if(conversation.last_message){
          const message = await Message.findById(conversation?.last_message).exec();
          if (message && (message.reader.includes(userId) || message.sender == userId)) unread = false;
          else unread = true;
          if(message.sender != userId){
            if(message.removed === true){
              last_message = "Tin nhắn đã được thu hồi";
            } else {
              if(message.media.length == 0) last_message = message?.content;
              else last_message = "Image";
            }
          }
          else{
            if(message.removed === true){
              last_message = "You: Tin nhắn đã được thu hồi";
            } else {
              if(message.media.length == 0) last_message = "You: " + message?.content;
              else last_message = "You: Image";
            }
          }
        }
        const userIds = [];

        const friends = await User.findById(conversation.users.filter(item => item != userId)).exec();
        const friendIdsArray = Array.isArray(friends) ? friends : [friends];
        for(const user of friendIdsArray){
          userIds.push(user._id);
        }
        if(!conversation.is_group){
          conversationInfo.push({_id: conversation._id, userIds: userIds, name: friends.full_name, img: friends.profile_picture, msg_id: conversation.last_message, lastMsg: last_message, unread: unread, online: friends.online, last_online: friends.last_online, is_deleted: conversation.is_deleted});
        }
        else
          conversationInfo.push({_id: conversation._id, userIds: userIds, name: conversation.name, img: conversation.avatar, msg_id: conversation.last_message, lastMsg: last_message, unread: unread, online: true})
      }

      res.json(conversationInfo);
    } catch (error) {
      next(error);
    }
  }

  async checkUserConversation(req, res, next) {
    const userId = req.query.userId; // ID của người dùng
    const userSearchId = req.query.userSearchId; // ID của người dùng
    let conversationInfo;
  
    try {
      // Tìm các cuộc trò chuyện dựa trên danh sách conversationIds
      const conversation = await Conversation.findOne(
        { users: [userId,userSearchId]}
      ).exec();
      if(conversation){
        let last_message = "";
        let unread;
        if(conversation.last_message){
          const message = await Message.findById(conversation?.last_message).exec();
          if (message && (message.reader.includes(userId) || message.sender == userId)) unread = false;
          else unread = true;
          if(message.sender != userId){
            if(message.removed === true){
              last_message = "Tin nhắn đã được thu hồi";
            } else {
              if(message.media.length == 0) last_message = message?.content;
              else last_message = "Image";
            }
          }
          else{
            if(message.removed === true){
              last_message = "You: Tin nhắn đã được thu hồi";
            } else {
              if(message.media.length == 0) last_message = "You: " + message?.content;
              else last_message = "You: Image";
            }
          }
        }
        const userIds = [];

        const friends = await User.findById(conversation.users.filter(item => item != userId)).exec();
        const friendIdsArray = Array.isArray(friends) ? friends : [friends];
        for(const user of friendIdsArray){
          userIds.push(user._id);
        }
        if(!conversation.is_group){
          conversationInfo={_id: conversation._id, userIds: userIds, name: friends.full_name, img: friends.profile_picture, 
            msg_id: conversation.last_message, lastMsg: last_message, unread: unread, online: friends.online, last_online: friends.last_online,
            is_deleted: conversation.is_deleted
          };
        }
        else
          conversationInfo={_id: conversation._id, userIds: userIds, name: conversation.name, img: conversation.avatar, msg_id: conversation.last_message, lastMsg: last_message, unread: unread, online: true};
      }

      res.json(conversationInfo);
      
    } catch (error) {
      next(error);
    }
  }

  async createConversation(req, res, next) {
    const { userIds, name, description, created_by, admins, avatar } = req.body;
    const isGroup = false;

    try {
      // Kiểm tra xem tất cả người dùng có tồn tại hay không
      const users = await User.find({ _id: { $in: userIds } }).exec();

      if (users.length !== userIds.length) {
        return res.status(404).json({ message: "Một hoặc nhiều người dùng không tồn tại" });
      }
      if (users.length > 2) {
        isGroup = true;
      }


      

      // Tạo mới đối tượng Conversation
      const conversation = new Conversation({
        users: userIds, // Các người dùng tham gia cuộc trò chuyện
        last_message: null, // Trường last_message có thể thay đổi khi có tin nhắn mới
        is_group: isGroup,
        name,
        description,
        created_by,
        admins,
        avatar,
      });

      // Lưu cuộc trò chuyện vào cơ sở dữ liệu
      const savedConversation = await conversation.save();

      const conversationInfo={_id: conversation._id, online: users[0].online, last_online: users[0].last_online};

      // Thêm ID cuộc trò chuyện vào danh sách conversations của từng người dùng
      for (const user of users) {
        if (!user.conversations) {
          user.conversations = []; // Khởi tạo mảng conversations nếu không tồn tại
        }
        user.conversations.push(savedConversation._id);
        await user.save();
      }

      res.json(conversationInfo);
    } catch (error) {
      next(error);
    }
  }

  async searchConversation(req, res, next) {
    const conversationInfo = [];
    const userId = req.query.userId; // ID của người dùng
    const searchText = req.query.searchText;
    console.log("userId" + userId);
    console.log("Search" + searchText);
    try {
      const regex = new RegExp(searchText, "i");
      const users = await User.find({
        $or: [{ username: regex }, { full_name: regex }],
      }).limit(20); // Giới hạn trả về 50 kết quả
      const userIds = users.map(user => user._id)
      console.log("userId" + userIds);
      const firendIds = userIds.filter(id => id != userId);
      console.log("firendId" + firendIds);
      const cons = await Conversation.find({
        $and: [
          { users: userId },
          { users: { $in: firendIds } },
          { $or: [
            { is_deleted: { $exists: false } },
            { "is_deleted.user_id": { $ne: userId } },
            { "is_deleted.user_id": userId, "is_deleted.deleted": false }
          ] }
        ] }).limit(20); // Giới hạn trả về 50 kết quả
      console.log("Consvaersarion: " + cons.map(con => con._id));
      for (const conversation of cons) {
        let last_message = "";
        let unread;
        if(conversation.last_message){
          const message = await Message.findById(conversation?.last_message).exec();
          if (message && (message.reader.includes(userId) || message.sender == userId)) unread = false;
          else unread = true;
          if(message.sender != userId){
            if(message.removed === true){
              last_message = "Tin nhắn đã được thu hồi";
            } else {
              if(message.media.length == 0) last_message = message?.content;
              else last_message = "Image";
            }
          }
          else{
            if(message.removed === true){
              last_message = "You: Tin nhắn đã được thu hồi";
            } else {
              if(message.media.length == 0) last_message = "You: " + message?.content;
              else last_message = "You: Image";
            }
          }
        }
        const userIds = [];

        const friends = await User.findById(conversation.users.filter(item => item != userId)).exec();
        const friendIdsArray = Array.isArray(friends) ? friends : [friends];
        for(const user of friendIdsArray){
          userIds.push(user._id);
        }
        if(!conversation.is_group){
          conversationInfo.push({_id: conversation._id, userIds: userIds, name: friends.full_name, img: friends.profile_picture, msg_id: conversation.last_message, lastMsg: last_message, unread: unread, online: friends.online, last_online: friends.last_online, is_deleted: conversation.is_deleted});
        }
        else
          conversationInfo.push({_id: conversation._id, userIds: userIds, name: conversation.name, img: conversation.avatar, msg_id: conversation.last_message, lastMsg: last_message, unread: unread, online: true})
      }

      res.json(conversationInfo);
      
    } catch (error) {
      console.error(error);
      next(error + searchText);
    }
  }

  async deleteConversation(req, res, next) {
    try {
      const { userId, conversationId } = req.body;
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        // Kiểm tra xem phần tử có user_id = userId đã tồn tại trong mảng is_deleted hay chưa
        const userIndex = conversation?.is_deleted.findIndex(obj => obj.user_id.toString() === userId);
        if (userIndex !== -1) {
          // Phần tử đã tồn tại, thay đổi giá trị deleted và delete_at
          conversation.is_deleted[userIndex].deleted = true;
          conversation.is_deleted[userIndex].delete_at = new Date();
        } else {
          // Phần tử chưa tồn tại, thêm mới vào mảng is_deleted
          conversation.is_deleted.push({
            user_id: userId,
            deleted: true,
            delete_at: new Date()
          });
        }

        // Lưu thay đổi vào cơ sở dữ liệu
        await conversation.save();
      }
      // await Conversation.findOneAndUpdate(
      //   { _id: conversationId },
      //   { $push: { "is_deleted": { user_id: userId, deleted: true, delete_at: new Date() } } }
      // );
      res.json(true);
    } catch (error) {
      next(error);
    }
  }

  async returnConversation(req, res, next) {
    try {
      const { userId, conversationId } = req.body;
      await Conversation.findOneAndUpdate(
        { _id: conversationId, is_deleted: { $elemMatch: { user_id: userId } } },
        { $set: { "is_deleted.$.deleted": false } }
      );
      res.json(true);
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new ConversationController();