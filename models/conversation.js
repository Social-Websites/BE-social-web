const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const conversationSchema = new Schema({
  user: [{ type: Types.ObjectId, required: true, ref: "User" }],
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

conversationSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Conversation", conversationSchema);
