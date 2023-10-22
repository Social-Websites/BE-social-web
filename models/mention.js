const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const mentionSchema = new Schema({
  user_id: { type: Types.ObjectId, required: true, ref: "User" },
  post_id: { type: Types.ObjectId, required: true, ref: "Post" },
  comment_id: { type: Types.ObjectId, required: true, ref: "Comment" },
  user_mentioned: [{ type: Types.ObjectId, required: true, ref: "User" }],
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

mentionSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Mention", mentionSchema);
