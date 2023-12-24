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
    reacts: [{ type: Types.ObjectId, ref: "React" }],
    //comments: [{ type: Types.ObjectId, ref: "Comment" }],
    pinned_comments: [{ type: Types.ObjectId, ref: "Comment" }],
    has_read: [{ type: Types.ObjectId, ref: "User" }],
    edit_at: { type: Date },
    status: { type: String, enum: ["APPROVED", "PENDING"] },
    shared_by: { type: Types.ObjectId, ref: "User" },
    original_post: { type: Types.ObjectId, ref: "Post" },
    deleted_by: {
      user: { type: Types.ObjectId, ref: "User" },
      user_role: { type: String, enum: ["CREATOR", "ADMIN", "GROUP_ADMIN"] },
    },
    banned: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "post",
  match: (baseMatch) => ({
    deleted_by: { $exists: false },
    $or: [{ banned: false }, { banned: { $exists: false } }],
  }),
});

postSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Post", postSchema);
