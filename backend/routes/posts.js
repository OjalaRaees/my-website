// routes/posts.js  — full file, supports carousel posts
const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post           = require("../models/Post");
const multer         = require("multer");
const path           = require("path");
const fs             = require("fs");

// ── Ensure uploads dir ────────────────────────────────────────────
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Multer — accept up to 10 files ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2) + path.extname(file.originalname)),
});
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ([".jpg",".jpeg",".png",".gif",".webp",".mp4",".mov",".webm"].includes(ext))
    cb(null, true);
  else cb(new Error("Only images/videos allowed"), false);
};
const upload = multer({ storage, fileFilter });

// helper
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return [".mp4",".mov",".webm"].includes(ext) ? "video" : "image";
}

// ── CREATE POST (single OR multi-file carousel) ───────────────────
// Field name: "files"  (array, up to 10)
router.post("/upload", authMiddleware, upload.array("files", 10), async (req, res) => {
  try {
    const { content } = req.body;
    const files = req.files || [];

    if (!content?.trim() && files.length === 0)
      return res.status(400).json({ message: "Content or at least one file required" });

    // Build media array
    const media = files.map(f => ({
      file:     `/uploads/${f.filename}`,
      fileType: getFileType(f.filename),
    }));

    // For backward compat: also set top-level file/fileType from first item
    const post = new Post({
      user:     req.user.id,
      content:  content?.trim() || "",
      media,
      // legacy fallback
      file:     media[0]?.file     || null,
      fileType: media[0]?.fileType || null,
    });

    await post.save();
    await post.populate("user", "name profilePic");
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── GET ALL POSTS ─────────────────────────────────────────────────
router.get("/post", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user",          "name profilePic")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── GET POSTS BY USER ─────────────────────────────────────────────
router.get("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate("user",          "name profilePic")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── DELETE POST ───────────────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── LIKE / UNLIKE ─────────────────────────────────────────────────
router.post("/like/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const idx = post.likes.indexOf(req.user.id);
    if (idx === -1) post.likes.push(req.user.id);
    else            post.likes.splice(idx, 1);
    await post.save();
    res.json({ likes: post.likes });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── ADD COMMENT ───────────────────────────────────────────────────
router.post("/comment/:id", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user: req.user.id, text: text.trim(), createdAt: new Date() });
    await post.save();
    await post.populate("comments.user", "name profilePic");
    res.json({ comments: post.comments });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── DELETE COMMENT ────────────────────────────────────────────────
router.delete("/comment/:postId/:commentId", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.user.toString() !== req.user.id && post.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    comment.deleteOne();
    await post.save();
    await post.populate("comments.user", "name profilePic");
    res.json({ comments: post.comments });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;