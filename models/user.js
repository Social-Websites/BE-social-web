const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const userInfoSchema = new Schema(
  {
    bio: { type: String },
    date_of_birth: { type: Date },
    gender: { type: Boolean },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, minLength: 10, maxLength: 12 },
    job: { type: String },
    workplace: { type: String },
    high_school: { type: String },
    college: { type: String },
    current_city: { type: String },
    home_town: { type: String },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minLength: 5,
      maxLength: 15,
    },
    password: { type: String, required: true, minLength: 4, select: false },
    full_name: { type: String, required: true },
    search_keyword: { type: String, required: true },
    user_info: userInfoSchema,
    profile_picture: { type: String, trim: true, default: "" },
    posts: [{ type: Types.ObjectId, ref: "Post" }],
    friend_requests: [{ type: Types.ObjectId, ref: "User" }],
    friends: [{ type: Types.ObjectId, ref: "User" }],
    conversations: [{ type: Types.ObjectId, ref: "Conversation" }],
    online: { type: Boolean },
    last_online: { type: Date, default: new Date() },
    ban: { type: Boolean, required: true, default: false },
    self_lock: { type: Boolean, required: true, default: false },
    block_list: [{ type: Types.ObjectId, ref: "User" }],
    profile_url: { type: String, trim: true },
    admin: { type: Boolean, required: true, default: false },
    user_setting: { type: Types.ObjectId, ref: "User_setting" },
    reset_token: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
