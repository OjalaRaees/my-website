// models/Post.js  — supports carousel (multiple media per post)
const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  file:     { type: String, required: true },
  fileType: { type: String, enum: ["image", "video"], required: true },
});

const CommentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const PostSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content:  { type: String, default: "" },

    // ── Legacy single-file fields (keep for backward compat) ──
    file:     { type: String, default: null },
    fileType: { type: String, enum: ["image", "video", null], default: null },

    // ── NEW: carousel media array ──
    // For new posts this will be populated; legacy posts only have file/fileType
    media:    { type: [MediaSchema], default: [] },

    likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);