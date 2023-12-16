const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const HttpError = require("./http-error");

const { Schema, Types } = mongoose;

const commentSchema = new Schema(
  {
    user: { type: Types.ObjectId, required: true, ref: "User" },
    post: { type: Types.ObjectId, required: true, ref: "Post" },
    cmt_level: { type: Number, require: true, enum: [1, 2, 3], default: 1 },
    reply_to: { type: Types.ObjectId, ref: "Comment" }, //Trả lời 1 CMT (nếu CMT được trả lời cấp 1 or 2 thì this.mother_cmt = this.reply_to, cấp 3 thì this.mother_cmt = this.reply_to.mother_cmt, cả 2 TH thì this.cmt_level = this.mother_cmt.cmt_level + 1)
    mother_cmt: { type: Types.ObjectId, ref: "Comment" }, //CMT cấp cao hơn: this.mother_cmt.cmt_level < this.cmt_level
    relate_cmts: [{ type: Types.ObjectId, ref: "Comment" }], // Các CMT cấp thấp hơn: thấp nhất là 3
    comment: { type: String },
    media: [{ type: String }],
    reacts: [
      {
        user: { type: Types.ObjectId, required: true, ref: "User" },
        emoji: {
          type: String,
          enum: ["LIKE", "HAHA", "LOVE", "WOW", "SAD", "ANGRY"],
        },
      },
    ],
    users_hide_cmt: [
      {
        user: { type: Types.ObjectId, required: true, ref: "User" },
        hided_time: { type: Date, default: new Date() },
      },
    ],
    deleted_by: {
      user: { type: Types.ObjectId, ref: "User" },
      user_role: { type: String, enum: ["USER", "ADMIN", "POST_CREATOR"] },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

commentSchema.plugin(uniqueValidator);

commentSchema.pre(
  "save",
  { document: true, query: false },
  async function (next) {
    // Check if there is a reply_to field
    if (this.isNew && this.reply_to) {
      try {
        // const doc = mongoose.model("Comment", commentSchema);
        const replyComment = await Comment.findByIdAndUpdate(
          this.reply_to,
          {
            $push: {
              relate_cmts: replyComment.cmt_level < 3 ? this._id : undefined,
              "mother_cmt.relate_cmts":
                replyComment.cmt_level === 3 ? this._id : undefined,
            },
          },
          { new: true, session: this.$session() }
        );

        console.log("----------------------------------middelware pre save");
        if (!replyComment) {
          const error = new HttpError(
            "Không tìm thấy comment cần phản hồi!",
            404
          );
          return next(error);
        }
        // Update the current document fields
        this.mother_cmt =
          replyComment.cmt_level < 3 ? this.reply_to : replyComment.mother_cmt;
        this.cmt_level =
          replyComment.cmt_level < 3
            ? replyComment.cmt_level + 1
            : replyComment.cmt_level;
      } catch (err) {
        console.log(err);
        const error = new HttpError("Có lỗi khi comment!", 500);
        return next(error);
      }
    }
  }
);

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
