const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Uses the Cloudinary keys you already added in Render
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Uses the GEMINI_API_KEY variable already in Render
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const upload = multer({ dest: 'uploads/' });
app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file.' });

        // 1. Upload to Cloudinary for permanent storage
        const cloudRes = await cloudinary.uploader.upload(req.file.path, { folder: 'artifacts' });

        // 2. Analyze with Gemini 2.0 Flash
        const imageData = fs.readFileSync(req.file.path).toString("base64");
        const result = await ai.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent([
            "Identify this artifact. Format: Title: [Name] | Info: [4-sentence history]",
            { inlineData: { data: imageData, mimeType: req.file.mimetype } }
        ]);

        fs.unlinkSync(req.file.path);
        const text = result.response.text();
        
        let title = "Artifact Identified", info = text;
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ title, info, imageUrl: cloudRes.secure_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Scanner Error" });
    }
});

app.listen(port, () => console.log(`🚀 Live on port ${port}`));