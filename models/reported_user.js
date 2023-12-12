const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const reportedUserSchema = new Schema(
  {
    user: { type: Types.ObjectId, required: true, ref: "User" },
    reported_by: { type: Types.ObjectId, required: true, ref: "User" },
    reason: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

reportedUserSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Reported_user", reportedUserSchema);
