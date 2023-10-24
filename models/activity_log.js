const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const activityLogSchema = new Schema({
  user_id: { type: Types.ObjectId, required: true, ref: "User" },
  action: { type: String, required: true },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

activityLogSchema.plugin(uniqueValidator);

module.exports = mongoose.model("activity_log", activityLogSchema);
