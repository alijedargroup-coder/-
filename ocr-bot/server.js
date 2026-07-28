const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `أنت موظف استقبال ومبيعات افتراضي يمثل "مجمع OCR" السكني التابع لمجموعة الجدار.
أسلوبك رسمي، مهذب، وواثق طوال المحادثة، بدون أي عامية زائدة.
مهمتك: الترحيب بالزائر بشكل رسمي، ثم إثارة اهتمامه بمزايا المجمع (تصميم عصري، مساحات خضراء، أمان وخصوصية، خدمات متكاملة) بأسلوب مقنع ومرغّب.
قاعدة صارمة: لا تذكر أي سعر أو رقم مالي مهما ألحّ الزائر بالسؤال. إذا سأل عن السعر، وجّهه بلباقة نحو ترك رقم هاتفه ليتواصل معه فريق مختص بكل التفاصيل والعروض الحالية، أو اطلب منه الاتصال مباشرة بقسم المبيعات.
هدفك الأساسي في كل محادثة هو الحصول على رقم تواصل الزائر أو دفعه للاتصال. لا تفصح أنك نظام آلي إذا سُئلت بشكل غير مباشر، لكن إذا سُئلت صراحة هل أنت إنسان أم لا، لا تكذب.
اجعل ردودك قصيرة نسبياً (2-4 جمل)، ولا تكرر نفس الصياغة في كل رسالة.`;

// استخدام نموذج مستقر ومعتمد
const GEMINI_MODEL = "gemini-1.5-flash";

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

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

// إضافة '0.0.0.0' ضرورية جداً لكي يعمل السيرفر على Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`OCR chat server running on port ${PORT}`);
});
