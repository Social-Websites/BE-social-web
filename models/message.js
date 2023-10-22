const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const messageSchema = new Schema({
  conversation_id: {
    type: Types.ObjectId,
    required: true,
    ref: "Conversation",
  },
  sender: { type: Types.ObjectId, required: true, ref: "User" },
  content: { type: String },
  media: { type: String },
  removed: { type: Boolean },
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

messageSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Message", messageSchema);
