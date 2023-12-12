const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const reactSchema = new Schema(
  {
    post: { type: Types.ObjectId, required: true, ref: "Post" },
    reacted_by: { type: Types.ObjectId, required: true, ref: "User" },
    emoji: {
      type: String,
      required: true,
      enum: ["LIKE", "HAHA", "LOVE", "WOW", "SAD", "ANGRY"],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

//reactSchema.plugin(uniqueValidator);

module.exports = mongoose.model("React", reactSchema);
