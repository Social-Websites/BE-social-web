const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const commentSchema = new Schema(
  {
    user_id: { type: Types.ObjectId, required: true, ref: "User" },
    post_id: { type: Types.ObjectId, required: true, ref: "Post" },
    cmt_level: { type: Number, require: true, enum: [1, 2, 3], default: 1 },
    reply_to: { type: Types.ObjectId, ref: "Comment" }, //Trả lời 1 CMT (nếu CMT được trả lời cấp 1 or 2 thì this.mother_cmt = this.reply_to, cấp 3 thì this.mother_cmt = this.reply_to.mother_cmt, cả 2 TH thì this.cmt_level = this.mother_cmt.cmt_level + 1)
    mother_cmt: { type: Types.ObjectId, ref: "Comment" }, //CMT cấp cao hơn: this.mother_cmt.cmt_level < this.cmt_level
    relate_cmt: [{ type: Types.ObjectId, ref: "Comment" }], // Các CMT cấp thấp hơn: thấp nhất là 3
    content: { type: String },
    media: [{ type: String }],
    reacts: [
      {
        user_id: { type: Types.ObjectId, required: true, ref: "User" },
        emoji: {
          type: String,
          enum: ["LIKE", "DISLIKE", "HAHA", "HEART", "WOW", "SAD", "ANGRY"],
        },
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

commentSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Comment", commentSchema);
