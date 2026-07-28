const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// الموديل المستقر والأحدث من Google
const GEMINI_MODEL = "gemini-2.0-flash";
const SYSTEM_PROMPT = "أنت مساعد خدمة العملاء لمجمع OCR السكني التابع لمجموعة الجدار. أجب بأسلوب راقٍ ومختصر ومفيد باللغة العربية.";

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 300 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return res.status(500).json({ error: "upstream error", details: errText });
    }

    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .trim();

    res.json({ reply: text || "عذراً، ممكن توضح أكثر؟" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "server error" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`OCR chat server running on port ${PORT}`);
});
