const Messages = require("../models/message");
const User = require("../models/user");
const Conversation = require("../models/conversation");


class MessagesController {
  async getMessages(req, res, next) {
    const conversationId = req.params.conversationId;
    const skip = parseInt(req.query.skip) || 0; // Số lượng tin nhắn đã lấy trước đó, mặc định là 0
    const messagesInfo = [];
    try{
      const messages = await Messages.find({conversation_id: conversationId})
      .sort({ created_at: -1 })
      .skip(skip) // Bỏ qua số lượng tin nhắn đã lấy trước đó
      .limit(20) // Giới hạn 20 tin nhắn
      .exec();

      for (const message of messages) {
        const sender = await User.findById(message.sender).exec();
        messagesInfo.push({_id: message._id, sender_id:message.sender, name: sender.full_name, img: sender.profile_picture, content: message.content, media: message.media, createAt: message.created_at});
      }
      res.json(messagesInfo.reverse());
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
        removed: false,
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

  async addReader(req, res, next) {
    const { conversation_id, reader_id } = req.body;
    try {
      const conversation = await Conversation.findById(conversation_id).exec();
      await Messages.findOneAndUpdate(
      { _id: conversation.last_message },
      { $push: { reader: reader_id } },
      { new: true });
      res.json(true);
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new MessagesController();