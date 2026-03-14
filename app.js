require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 10000; // Use Render's port

const apiKey = process.env.GEMINI_KEY;
const ai = new GoogleGenAI(apiKey);

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

// ... [Your app.get('/') and other routes stay exactly the same] ...

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.send("No file selected.");
    try {
        // Use Gemini 2.0 Flash (stable)
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const imageBase64 = fs.readFileSync(req.file.path).toString("base64");
        
        const result = await model.generateContent([
            "Identify this artifact and explain its historical significance.",
            { inlineData: { data: imageBase64, mimeType: req.file.mimetype } }
        ]);

        const fileBaseName = path.parse(req.file.filename).name;
        const artifactData = {
            id: fileBaseName,
            imageFile: req.file.filename,
            analysis: result.response.text(), // Fixed: .text() is a function
            timestamp: new Date().toLocaleString('en-GB')
        };
        
        fs.writeFileSync(path.join(__dirname, 'uploads', `${fileBaseName}.json`), JSON.stringify(artifactData, null, 2));
        res.redirect('/history');
    } catch (error) {
        console.error(error);
        res.status(500).send("AI Error: " + error.message);
    }
});

// [Rest of your delete and history routes stay the same]

app.listen(port, '0.0.0.0', () => console.log(`✅ Port ${port}`));