const Messages = require("../models/message");


class MessagesController {
  async getMessages(req, res, next) {
    const conversationId = req.conversation._id;
    await Messages.find({conversation_id: conversationId})
      .then((messages) => {
        res.json(messages);
      })
      .catch(next);
  }
}

module.exports = new MessagesController();