require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai"); //

const app = express();
const port = process.env.PORT || 10000; //

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <body style="background:#0f0f0f;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;">
            <div style="background:#1a1a1a;padding:30px;border-radius:15px;text-align:center;border:1px solid #333;">
                <h2 style="color:#007bff;">🏺 ARTIFACT SCANNER</h2>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <input type="file" name="image" required style="margin-bottom:20px;display:block;width:100%;">
                    <button type="submit" style="background:#007bff;color:white;border:none;padding:12px;width:100%;border-radius:8px;cursor:pointer;font-weight:bold;">START ANALYSIS</button>
                </form>
            </div>
        </body>
    `);
});

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.send("No file uploaded.");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imageBase64 = fs.readFileSync(req.file.path).toString("base64");
        
        const result = await model.generateContent([
            "Identify this artifact and its history in 3 sentences.",
            { inlineData: { data: imageBase64, mimeType: req.file.mimetype } }
        ]);

        fs.unlinkSync(req.file.path);
        const text = result.response.text();

        res.send(`
            <body style="background:#0f0f0f;color:white;font-family:sans-serif;padding:40px;">
                <h2 style="color:#007bff;">Analysis Complete</h2>
                <div style="background:#1a1a1a;padding:20px;border-radius:10px;border:1px solid #333;line-height:1.6;">
                    ${text.replace(/\n/g, '<br>')}
                </div>
                <br><a href="/" style="color:#007bff;text-decoration:none;">← Scan Another</a>
            </body>
        `);
    } catch (error) {
        console.error("CRITICAL ERROR:", error.message);
        res.status(500).send("AI Error: " + error.message);
    }
});

app.listen(port, '0.0.0.0', () => console.log(`🚀 Live on ${port}`));