const Conversation = require("../models/conversation");


class ConversationController {
  async getConversation(req, res, next) {
    const conversationId = req.conversation._id;
    await Conversation.find({_id: conversationId})
      .then((conversation) => {
        res.json(conversation);
      })
      .catch(next);
  }

}

module.exports = new ConversationController();