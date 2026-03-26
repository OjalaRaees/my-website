// routes/status.js  — supports multi-file upload + caption per status
const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Status         = require("../models/Status");
const multer         = require("multer");
const path           = require("path");
const fs             = require("fs");

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads", { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2) + path.extname(file.originalname)),
});
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ([".jpg",".jpeg",".png",".gif",".webp",".mp4",".mov",".webm"].includes(ext)) cb(null, true);
  else cb(new Error("Only images/videos allowed"), false);
};

// Accept up to 10 files at once under field name "files"
const upload = multer({ storage, fileFilter });

// ── CREATE STATUS(ES)  POST /status/upload ────────────────────────
// Accepts multiple files → creates one Status doc per file
router.post("/upload", authMiddleware, upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "At least one file required" });

    const caption = req.body.caption?.trim() || "";

    const created = [];
    for (const f of files) {
      const ext      = path.extname(f.filename).toLowerCase();
      const fileType = [".mp4",".mov",".webm"].includes(ext) ? "video" : "image";

      const status = new Status({
        user:     req.user.id,
        file:     `/uploads/${f.filename}`,
        fileType,
        caption,
      });
      await status.save();
      created.push(status);
    }

    // Populate and return all created statuses
    const populated = await Status.find({ _id: { $in: created.map(s => s._id) } })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── GET ALL STATUSES  GET /status ─────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const statuses = await Status.find()
      .populate("user",          "name profilePic")
      .populate("viewers",       "name profilePic")
      .populate("likes",         "name profilePic")  // ← populate likes too
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });
    res.json(statuses);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── MARK VIEWED  POST /status/view/:id ───────────────────────────
router.post("/view/:id", authMiddleware, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: "Status not found" });

    if (!status.viewers.includes(req.user.id)) {
      status.viewers.push(req.user.id);
      await status.save();
    }

    const populated = await status.populate([
      { path: "user",          select: "name profilePic" },
      { path: "viewers",       select: "name profilePic" },
      { path: "likes",         select: "name profilePic" },
      { path: "comments.user", select: "name profilePic" },
    ]);

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── LIKE / UNLIKE  POST /status/like/:id ─────────────────────────
router.post("/like/:id", authMiddleware, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: "Status not found" });

    const idx = status.likes.indexOf(req.user.id);
    if (idx === -1) status.likes.push(req.user.id);
    else            status.likes.splice(idx, 1);

    await status.save();

    // Repopulate likes so frontend gets user objects
    await status.populate("likes", "name profilePic");
    res.json({ likes: status.likes });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ── ADD COMMENT  POST /status/comment/:id ────────────────────────
router.post("/comment/:id", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: "Status not found" });

    status.comments.push({ user: req.user.id, text: text.trim(), createdAt: new Date() });
    await status.save();
    await status.populate("comments.user", "name profilePic");

    res.json({ comments: status.comments });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;