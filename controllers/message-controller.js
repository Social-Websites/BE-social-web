const Messages = require("../models/message");
const User = require("../models/user");
const Conversation = require("../models/conversation");


class MessagesController {
  async getMessages(req, res, next) {
    const conversationId = req.params.conversationId;
    const messagesInfo = [];
    try{
      const messages = await Messages.find({conversation_id: conversationId})
      .sort({ createdAt: 1 })
      .exec();

      for (const message of messages) {
        const sender = await User.findById(message.sender).exec();
        messagesInfo.push({_id: message._id, sender_id:message.sender, name: sender.full_name, img: sender.profile_picture, content: message.content, media: message.media});
      }
      res.json(messagesInfo);
    }
     catch (error) {
      next(error);
    }
    
  }

  async sendMessage(req, res, next) {
    const { conversationId, sender_id, content, media } = req.body;
  
    try {
      // Tạo tin nhắn mới
      const message = new Messages({
        conversation_id: conversationId,
        sender: sender_id,
        content,
        media,
        removed: false
      });
  
      // Lưu tin nhắn vào cơ sở dữ liệu
      const savedMessage = await message.save();
  
      // Cập nhật lastMessage trong conversation
      await Conversation.findByIdAndUpdate(
        conversationId,
        { last_message: savedMessage._id },
        { new: true }
      );
  
      res.json(savedMessage);
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new MessagesController();