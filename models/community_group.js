const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const communityGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  created_by: { type: Types.ObjectId, required: true, ref: "User" },
  admins: [{ type: Types.ObjectId, required: true, ref: "User" }],
  members: [{ type: Types.ObjectId, required: true, ref: "User" }],
  visibility: { type: String, enum: ["PUBLIC", "PRIVATE"] },
  requested_list: [
    {
      user_id: { type: Types.ObjectId, required: true, ref: "User" },
      answer: { type: String },
    },
  ],
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

communityGroupSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Group", communityGroupSchema);
