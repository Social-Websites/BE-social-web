const Messages = require("../models/message");
const Conversation = require("../models/conversation");


class MessagesController {
  async getMessages(req, res, next) {
    const conversationId = req.params.conversationId;;
    await Messages.find({conversation_id: conversationId})
      .sort({ createdAt: 1 })
      .then((messages) => {
        res.json(messages);
      })
      .catch(next);
  }

  async sendMessage(req, res, next) {
    const { conversationId, senderId, content, media } = req.body;
  
    try {
      // Tạo tin nhắn mới
      const message = new Messages({
        conversation_id: conversationId,
        sender: senderId,
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