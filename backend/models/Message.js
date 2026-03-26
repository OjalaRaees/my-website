const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  text: String,

  fileUrl: String,
  fileType: String, 

  isRead: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("Message", MessageSchema);