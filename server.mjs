import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
    res.json({ status: "ok", service: "AI Context Hub API" });
});

app.post("/api/chat", async (req, res) => {
    try {
        const {
            model = "chatgpt",
            message,
            context = ""
        } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                error: "الرسالة فارغة"
            });
        }

        const prompt = `
أنت مساعد داخل موقع AI Context Hub.

السياق المحفوظ:
${context}

رسالة المستخدم:
${message}
`;

        if (model === "chatgpt") {
            if (!process.env.OPENAI_API_KEY) {
                return res.status(500).json({
                    error: "OPENAI_API_KEY غير موجود في إعدادات الخادم"
                });
            }

            const response = await openai.responses.create({
                model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
                input: prompt
            });

            return res.json({
                model: "ChatGPT",
                reply: response.output_text
            });
        }

        if (model === "gemini") {
            if (!process.env.GEMINI_API_KEY) {
                return res.status(500).json({
                    error: "GEMINI_API_KEY غير موجود في إعدادات الخادم"
                });
            }

            const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return res.status(response.status).json({
                    error: data.error?.message || "حدث خطأ في Gemini"
                });
            }

            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

            return res.json({
                model: "Gemini",
                reply: reply || "لم يتم الحصول على رد من Gemini"
            });
        }

        return res.status(400).json({
            error: "النموذج غير معروف. استخدم chatgpt أو gemini"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "حدث خطأ داخلي في الخادم"
        });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`AI Context Hub API running on port ${port}`);
});
