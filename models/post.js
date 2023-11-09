const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const postSchema = new Schema(
  {
    post_url: { type: String },
    group_id: { type: Types.ObjectId, ref: "Group" },
    user_id: { type: Types.ObjectId, required: true, ref: "User" },
    content: { type: String },
    media: [{ type: String }],
    visibility: {
      type: String,
      enum: ["PUBLIC", "GROUP", "FRIENDS", "PRIVATE"],
    },
    reacts: [
      {
        user_id: { type: Types.ObjectId, required: true, ref: "User" },
        emoji: {
          type: String,
          enum: ["LIKE", "DISLIKE", "HAHA", "HEART", "WOW", "SAD", "ANGRY"],
        },
      },
    ],
    comments: [{ type: Types.ObjectId, ref: "Comment" }],
    has_read: [{ type: Types.ObjectId, ref: "User" }],
    shared_by: { type: Types.ObjectId, ref: "User" },
    original_post: { type: Types.ObjectId, ref: "Post" },
    deleted_by: { type: String, enum: ["ADMIN", "USER"] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

postSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Post", postSchema);
