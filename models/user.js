const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const bcrypt = require("bcryptjs");
const HttpError = require("./http-error");

const { Schema, Types } = mongoose;

const userInfoSchema = new Schema(
  {
    bio: { type: String, default: "", maxLength: 150 },
    date_of_birth: { type: Date },
    gender: { type: Boolean },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, minLength: 10, maxLength: 12 },
    job: { type: String },
    workplace: { type: String },
    high_school: { type: String },
    college: { type: String },
    current_city: { type: String },
    hometown: { type: String },
  },
  { _id: false }
);

const userSettingSchema = new Schema(
  {
    notification_setting: { type: String },
    privacy_setting: { type: String },
    theme: { type: String },
    list_creators_posts_hided: [
      { type: Types.ObjectId, required: true, ref: "User" },
    ],
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
    search_keyword: { type: String, required: true, default: "" },
    user_info: userInfoSchema,
    profile_picture: { type: String, trim: true, default: "" },
    deleted_posts: [{ type: Types.ObjectId, ref: "Post" }],
    saved_posts: [
      new Schema(
        {
          post: { type: Types.ObjectId, ref: "Post" },
          saved_time: { type: Date, default: new Date() },
        },
        { _id: false }
      ),
    ],
    friend_requests: [{ type: Types.ObjectId, ref: "User" }],
    friend_requests_sent: [{ type: Types.ObjectId, ref: "User" }],
    friends: [{ type: Types.ObjectId, ref: "User" }],
    conversations: [{ type: Types.ObjectId, ref: "Conversation" }],
    online: { type: Boolean },
    last_online: { type: Date, default: new Date() },
    banned: { type: Boolean, required: true, default: false },
    self_lock: { type: Boolean, required: true, default: false },
    block_list: [{ type: Types.ObjectId, ref: "User" }],
    admin: { type: Boolean, required: true, default: false },
    user_setting: userSettingSchema,
    reset_token: { type: String },
    deleted_by: {
      user: { type: Types.ObjectId, ref: "User" },
      user_role: { type: String, enum: ["USER", "ADMIN"] },
    },
  },
  {
    toJSON: { virtuals: true }, // So `res.json()` and other `JSON.stringify()` functions include virtuals
    //toObject: { virtuals: true }, // So `console.log()` and other functions that use `toObject()` include virtuals
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "creator",
  match: (baseMatch) => ({
    deleted_by: { $exists: false },
    $or: [{ banned: false }, { banned: { $exists: false } }],
  }),
});

//Plugins, methods, middlewares, statics, query helpers
userSchema.plugin(uniqueValidator);

userSchema.methods.comparePassword = async function (candidatePassword, next) {
  try {
    const isValidPassword = await bcrypt.compare(
      candidatePassword,
      this.password
    );
    return isValidPassword;
  } catch (err) {
    return next(err);
  }
};

userSchema.pre("save", { document: true, query: false }, async function (next) {
  if (!this.isNew) {
    if (!this.isModified("password")) return next();
  }

  try {
    console.log("Có hash pass");
    const saltRounds = 10;
    const hashedPass = await bcrypt.hash(this.password, saltRounds);
    this.password = hashedPass;
    next();
  } catch (err) {
    const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại sau!", 500);
    return next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
