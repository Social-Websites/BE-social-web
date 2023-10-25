const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");


class ConversationController {
  async  getUserConversations(req, res, next) {
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
      const conversations = await Conversation.find({ _id: { $in: conversationIds } })
        .sort({ createdAt: -1 }) // Sắp xếp theo thứ tự giảm dần của createdAt
        .exec();
      
      for (const conversation of conversations) {
        const message = await Message.findById(conversation.last_message).exec();
        let last_message = "";
        
        if(!conversation.is_group){
          const friend = await User.findById(conversation.users.filter(item => item != userId)).exec();
          if(message.sender != userId){
            last_message = message.content;
          }
          else{
            last_message = "You: " + message.content;
          }
          conversationInfo.push({_id: conversation._id, name: friend.full_name, img: friend.profile_picture, lastMsg: last_message});
        }
        else
          conversationInfo.push({_id: conversation._id, name: conversation.name, img: conversation.avatar, lastMsg: last_message})
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

      // Thêm ID cuộc trò chuyện vào danh sách conversations của từng người dùng
      for (const user of users) {
        if (!user.conversations) {
          user.conversations = []; // Khởi tạo mảng conversations nếu không tồn tại
        }
        user.conversations.push(savedConversation._id);
        await user.save();
      }

      res.json(savedConversation);
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new ConversationController();