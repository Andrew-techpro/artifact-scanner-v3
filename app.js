require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 10000;

// Use the key name from your Render Environment tab
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use memory storage to avoid local file permission issues on Render
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(express.json());

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image selected." });
        }

        // Use the stable Gemini 1.5 Flash model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Convert the buffer to base64 directly from memory
        const imageBase64 = req.file.buffer.toString("base64");
        
        const result = await model.generateContent([
            "Identify this artifact and explain its historical significance in 4 concise sentences.",
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: req.file.mimetype
                }
            }
        ]);

        const text = result.response.text();
        
        // Return JSON instead of a redirect to prevent "instant" page errors
        res.json({ success: true, analysis: text });

    } catch (error) {
        // This will now show up in your Render Logs properly
        console.error("SCANNER ERROR:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, '0.0.0.0', () => console.log(`🚀 Live on port ${port}`));