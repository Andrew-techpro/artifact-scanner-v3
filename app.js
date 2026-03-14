const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenAI } = require("@google/generative-ai");
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Cloudinary Config (Keys stay in Render Dashboard)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

const upload = multer({ dest: 'uploads/' });
app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

        // 1. Permanent storage on Cloudinary
        const cloudRes = await cloudinary.uploader.upload(req.file.path, { folder: 'v3-scans' });

        // 2. Analysis with Gemini 2.0 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const imageData = fs.readFileSync(req.file.path).toString("base64");
        
        const result = await model.generateContent([
            "Identify this artifact. Format: Title: [Name] | Info: [4-sentence history]",
            { inlineData: { data: imageData, mimeType: req.file.mimetype } }
        ]);

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        const text = result.response.text();
        let title = "Artifact Found", info = text;
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ title, info, imageUrl: cloudRes.secure_url });
    } catch (error) {
        console.error("DEPLOYMENT ERROR:", error);
        res.status(500).json({ error: "Scanner Offline" });
    }
});

// Important: Listen on 0.0.0.0 for Render
app.listen(port, '0.0.0.0', () => console.log(`🚀 Live on port ${port}`));