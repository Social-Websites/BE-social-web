const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const reportedPostSchema = new Schema(
  {
    post: { type: Types.ObjectId, required: true, ref: "Post" },
    reported_by: { type: Types.ObjectId, required: true, ref: "User" },
    reason: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

reportedPostSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Reported_post", reportedPostSchema);
