const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const communityGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    cover: { type: String },
    created_by: { type: Types.ObjectId, required: true, ref: "User" },
    visibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PUBLIC",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

communityGroupSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Group", communityGroupSchema);
