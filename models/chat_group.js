const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const chatGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  created_by: { type: Types.ObjectId, required: true, ref: "User" },
  admins: [{ type: Types.ObjectId, required: true, ref: "User" }],
  members: [{ type: Types.ObjectId, required: true, ref: "User" }],
  avatar: { type: String },
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

chatGroupSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Chat_group", chatGroupSchema);
