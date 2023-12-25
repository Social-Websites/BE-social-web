const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const communityGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    cover: { type: String, default: "" },
    created_by: { type: Types.ObjectId, required: true, ref: "User" },
    visibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PUBLIC",
    },
  },
  {
    toJSON: { virtuals: true },

    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

communityGroupSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "group",
  match: (baseMatch) => ({
    deleted_by: { $exists: false },
    $or: [{ banned: false }, { banned: { $exists: false } }],
  }),
});

communityGroupSchema.virtual("members", {
  ref: "User_to_group",
  localField: "_id",
  foreignField: "group", // Dùng _id để làm trung gian, vì không có trường group trong User
  match: (baseMatch) => ({ status: { $in: ["MEMBER", "ADMIN"] } }),
});

communityGroupSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Group", communityGroupSchema);
