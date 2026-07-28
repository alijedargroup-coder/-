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

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(500).json({ error: "upstream error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map((b) => b.text || "")
      .join("")
      .trim();

    res.json({ reply: text || "عذراً، ممكن توضح أكثر؟" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OCR chat server running on port ${PORT}`);
});
