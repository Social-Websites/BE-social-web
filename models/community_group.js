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

communityGroupSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Group", communityGroupSchema);
