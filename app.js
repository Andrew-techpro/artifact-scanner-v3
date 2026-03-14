require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// FIX: This must match the library's export structure
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 10000;

// Use the key name from your Render Environment tab
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ... [Keep your existing app.get('/') and app.get('/history') routes] ...

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.send("No file selected.");
    try {
        // Fix: Use the correct method to get the model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imageBase64 = fs.readFileSync(req.file.path).toString("base64");
        
        const result = await model.generateContent([
            "Identify this artifact and explain its historical significance.",
            { inlineData: { data: imageBase64, mimeType: req.file.mimetype } }
        ]);

        const fileBaseName = path.parse(req.file.filename).name;
        const artifactData = {
            id: fileBaseName,
            imageFile: req.file.filename,
            analysis: result.response.text(),
            timestamp: new Date().toLocaleString('en-GB')
        };
        
        fs.writeFileSync(path.join(__dirname, 'uploads', `${fileBaseName}.json`), JSON.stringify(artifactData, null, 2));
        res.redirect('/history');
    } catch (error) {
        console.error(error);
        res.status(500).send("AI Error: " + error.message);
    }
});

// Important: Listen on 0.0.0.0 for Render deployments
app.listen(port, '0.0.0.0', () => console.log(`✅ Server running on port ${port}`));