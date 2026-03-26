// routes/chat.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// ================= CONVERSATIONS =================
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender receiver", "name profilePic");

    const convMap = {};

    messages.forEach((msg) => {
      const senderId = msg.sender?._id?.toString();
      const receiverId = msg.receiver?._id?.toString();
      if (!senderId || !receiverId) return;

      const otherUser = senderId === userId ? msg.receiver : msg.sender;

      if (!convMap[otherUser?._id]) {
        let preview =
          msg.text ||
          (msg.fileType === "image"
            ? "📷 Image"
            : msg.fileType === "video"
            ? "🎥 Video"
            : msg.fileType === "file"
            ? "📎 Attachment"
            : "");

        convMap[otherUser._id] = {
          user: otherUser,
          lastMessage: preview,
          createdAt: msg.createdAt,
          unreadCount: receiverId === userId && !msg.isRead ? 1 : 0,
        };
      } else {
        if (receiverId === userId && !msg.isRead) {
          convMap[otherUser._id].unreadCount += 1;
        }
      }
    });

    res.json(Object.values(convMap));
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Conversation error" });
  }
});

// ================= GET CHAT =================
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    // Mark all messages from the other user as read
    const updated = await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    // ✅ If any messages were marked read, notify the SENDER so they see "Seen"
    if (updated.modifiedCount > 0) {
      const io = req.app.get("socketio");
      if (io) {
        io.to(otherUserId).emit("messageRead", { by: currentUserId });
      }
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender receiver", "name profilePic");

    res.json(messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Chat error" });
  }
});

// ================= SEND TEXT =================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const message = new Message({
      sender: req.user.id,
      receiver: req.body.receiver,
      text: req.body.text,
      isRead: false,
    });

    await message.save();

    const io = req.app.get("socketio");
    if (io && req.body.receiver) {
      io.to(req.body.receiver).emit("newMessage", message);
    }

    res.json(message);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Send failed" });
  }
});

// ================= SEND FILE =================
router.post(
  "/send-file",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { receiverId } = req.body;
      if (!receiverId || !req.file) {
        return res.status(400).json({ error: "File or receiver missing" });
      }

      let type = "file";
      if (req.file.mimetype.startsWith("image")) type = "image";
      else if (req.file.mimetype.startsWith("video")) type = "video";

      const message = new Message({
        sender: req.user.id,
        receiver: receiverId,
        fileUrl: "/uploads/" + req.file.filename,
        fileType: type,
        isRead: false,
      });

      await message.save();

      const io = req.app.get("socketio");
      if (io) io.to(receiverId).emit("newMessage", message);

      res.json(message);
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "File send failed" });
    }
  }
);

module.exports = router;