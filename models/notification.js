const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const notificationSchema = new Schema({
  user_id: { type: Types.ObjectId, required: true, ref: "User" },
  sender_id: { type: Types.ObjectId, required: true, ref: "User" },
  content: { type: String, required: true },
  content_id: { type: Types.ObjectId, required: true },
  read: { type: Boolean, required: true },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

notificationSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Notification", notificationSchema);
