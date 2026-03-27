const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// FIX: Check if we are running on Vercel (Production)
const isVercel = process.env.VERCEL === '1';

// Ensure uploads/profile exists ONLY if not on Vercel
const profileDir = "/tmp/profile"; // Use /tmp for temporary storage on serverless
if (!isVercel) {
    const localDir = "uploads/profile";
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
}

// Multer storage - Using /tmp for Vercel compatibility
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Vercel only allows writing to the /tmp folder
    const dest = isVercel ? "/tmp" : "uploads/profile";
    cb(null, dest);
  },
  filename: (req, file, cb) =>
    cb(null, req.user.id + path.extname(file.originalname)),
});
const upload = multer({ storage });

// GET profile
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      name: user.name,
      email: user.email,
      description: user.description || "",
      profilePic: user.profilePic || "",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE profile info
router.put("/", authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, description },
      { new: true }
    );
    res.json({
      name: user.name,
      description: user.description,
      profilePic: user.profilePic || "",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE profile picture
router.put("/pic", authMiddleware, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });
  try {
    // Note: This URL will only work temporarily on Vercel
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: `/uploads/profile/${req.file.filename}` },
      { new: true }
    );
    res.json({ profilePic: user.profilePic });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

