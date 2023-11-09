const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const userSettingSchema = new Schema(
  {
    user_id: { type: Types.ObjectId, require: true, ref: "User" },
    notification_setting: { type: String },
    privacy_setting: { type: String },
    theme: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

userSettingSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User_setting", userSettingSchema);
