const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const postSchema = new Schema(
  {
    group: { type: Types.ObjectId, ref: "Group" },
    creator: { type: Types.ObjectId, required: true, ref: "User" },
    content: { type: String },
    media: [{ type: String }],
    visibility: {
      type: String,
      enum: ["PUBLIC", "GROUP", "FRIENDS", "PRIVATE"],
      default: "PUBLIC",
    },
    reacts: [
      {
        user: { type: Types.ObjectId, required: true, ref: "User" },
        emoji: {
          type: String,
          enum: ["LIKE", "HAHA", "LOVE", "WOW", "SAD", "ANGRY"],
        },
      },
    ],
    comments: [{ type: Types.ObjectId, ref: "Comment" }],
    has_read: [{ type: Types.ObjectId, ref: "User" }],
    edit_at: { type: Date },
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
