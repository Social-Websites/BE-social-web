const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const userToGroupSchema = new Schema(
  {
    group: { type: Types.ObjectId, required: true, ref: "Group" },
    user: { type: Types.ObjectId, required: true, ref: "User" },
    status: {
        type: String,
        required: true,
        enum: ["REQUESTED", "MEMBER", "INVITED"],
      },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

userToGroupSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User_to_group", userToGroupSchema);