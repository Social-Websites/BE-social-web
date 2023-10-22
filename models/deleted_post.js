const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const deletedPostSchema = new Schema({
  original_post_id: { type: Types.ObjectId, required: true, ref: "Post" },
  deleted_by: { type: Types.ObjectId, required: true, ref: "User" },
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

deletedPostSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Deleted_post", deletedPostSchema);
