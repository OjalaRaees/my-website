// models/Status.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const StatusSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  file:      { type: String, required: true },
  fileType:  { type: String, enum: ["image", "video"], required: true },
  caption:   { type: String, default: "" },   // ← NEW: caption shown to all viewers
  viewers:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments:  [CommentSchema],
  createdAt: { type: Date, default: Date.now, expires: 86400 },
});

module.exports = mongoose.model("Status", StatusSchema);