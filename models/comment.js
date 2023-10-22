const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const commentSchema = new Schema({
  user_id: { type: Types.ObjectId, required: true, ref: "User" },
  post_id: { type: Types.ObjectId, required: true, ref: "Post" },
  content: { type: String },
  media: [{ type: String }],
  reacts: [
    {
      user_id: { type: Types.ObjectId, required: true, ref: "User" },
      emoji: {
        type: String,
        enum: ["LIKE", "DISLIKE", "HAHA", "HEART", "WOW", "SAD", "ANGRY"],
      },
    },
  ],
  replies: [{ type: Types.ObjectId, ref: "Comment" }],
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

commentSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Comment", commentSchema);
