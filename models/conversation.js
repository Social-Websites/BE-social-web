const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const conversationSchema = new Schema({
  users: [{ type: Types.ObjectId, required: true, ref: "User" }],
  last_message: {type: Types.ObjectId, ref: "Message"},
  is_group: { type: Boolean, required: true },
  name: { type: String},
  description: { type: String },
  created_by: { type: Types.ObjectId, ref: "User" },
  admins: [{ type: Types.ObjectId, ref: "User" }],
  avatar: { type: String },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

conversationSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Conversation", conversationSchema);
