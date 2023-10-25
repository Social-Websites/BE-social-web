const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const groupMessageSchema = new Schema({
  chat_group_id: { type: Types.ObjectId, required: true, ref: "Chat_group" },
  sender: { type: String, required: true, ref: "User" },
  content: { type: String },
  media: { type: String },
  removed: { type: Boolean },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

groupMessageSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Group_message", groupMessageSchema);
