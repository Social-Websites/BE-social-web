const Messages = require("../models/message");
const User = require("../models/user");
const Conversation = require("../models/conversation");


class MessagesController {
  async getMessages(req, res, next) {  
    const messagesInfo = [];
    try{
      const conversationId = req.params.conversationId;
      const skip = parseInt(req.query.skip) || 0; // Số lượng tin nhắn đã lấy trước đó, mặc định là 0
      const userId = req.query.userId;
      console.log(userId+conversationId);
      if(conversationId && userId){
        const conversation = await Conversation.findById(conversationId).exec();
        if(conversation){
          let deleteTime = new Date(0, 0, 1);
          const userDeleted = conversation?.is_deleted.find(obj => obj.user_id.toString() === userId)?.delete_at;
          if(userDeleted){
            deleteTime = userDeleted;
          }
          console.log(deleteTime,userDeleted, userId, conversation, conversationId);
          const messages = await Messages.find(
              {
                conversation_id: conversationId,
                created_at: { $gt: deleteTime }
              }
          )
          .sort({ created_at: -1 })
          .skip(skip) // Bỏ qua số lượng tin nhắn đã lấy trước đó
          .limit(20) // Giới hạn 20 tin nhắn
          .exec();
          // console.log(messages);
          if(messages){
            for (const message of messages) {
              const sender = await User.findById(message.sender).exec();
              messagesInfo.push({_id: message._id, sender_id:message.sender, conversationId: message.conversation_id, name: sender.full_name, 
                img: sender.profile_picture, content: message.content, media: message.media, removed: message.removed, createAt: message.created_at});
            }
          }
        }
      }
      res.json(messagesInfo.reverse());
    }
     catch (error) {
      next(error);
      console.log(error);
    }
    
  }

  async sendMessage(req, res, next) {
    try {
      const { conversationId, sender_id, content, media } = req.body;
      if(conversationId && sender_id && (content || media)){
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
      } else {
        res.json("Lỗi khi gửi message");
      }
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { messageId } = req.body;
      await Messages.findOneAndUpdate(
        { _id: messageId },
        { $set: {removed: true}} 
      );
      res.json(true);
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