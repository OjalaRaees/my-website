// routes/ai.js
const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// node-fetch v2 is require()-able; v3+ is ESM only.
// If you get "fetch is not a function" run:  npm install node-fetch@2
let fetch;
try {
  fetch = global.fetch || require("node-fetch");
} catch {
  fetch = global.fetch;
}

router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages array is required" });
    }

    // Sanitize — only valid roles, no empty content
    const sanitized = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map(m => {
        let content = m.content;
        if (Array.isArray(content)) {
          content = content.filter(b =>
            b && b.type && (
              (b.type === "text"     && b.text?.trim())  ||
              (b.type === "image"    && b.source?.data)  ||
              (b.type === "document" && b.source?.data)
            )
          );
          if (!content.length) return null;
          if (content.length === 1 && content[0].type === "text") content = content[0].text;
        }
        if (!content || (typeof content === "string" && !content.trim())) return null;
        return { role: m.role, content };
      })
      .filter(Boolean);

    if (!sanitized.length) {
      return res.status(400).json({ message: "No valid messages after sanitizing" });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-3-haiku-20240307",  // ✅ fast, reliable, widely available
        max_tokens: 1024,
        system:     "You are Vibe AI, a friendly assistant inside a social media app called Vibe. Be warm and concise. Use markdown when helpful.",
        messages:   sanitized,
      }),
    });

    const rawText = await anthropicRes.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch { return res.status(500).json({ message: "Anthropic returned non-JSON", raw: rawText.slice(0, 200) }); }

    if (!anthropicRes.ok) {
      console.error("Anthropic error:", anthropicRes.status, data);
      return res.status(400).json({
        message: data?.error?.message || `Anthropic error ${anthropicRes.status}`,
        type:    data?.error?.type,
      });
    }

    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    res.json({ text, content: data.content });

  } catch (err) {
    console.error("ai route error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;