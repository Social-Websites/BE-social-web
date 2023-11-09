const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const searchHistorySchema = new Schema(
  {
    user_id: { type: Types.ObjectId, required: true, ref: "User" },
    query: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

searchHistorySchema.plugin(uniqueValidator);

module.exports = mongoose.model("Search_history", searchHistorySchema);
