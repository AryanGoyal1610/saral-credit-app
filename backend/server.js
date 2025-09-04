// SaralCredit - Final Corrected Backend Server
// This version contains a specific fix for the 'Missing parameter name' error.

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

let GoogleGenerativeAI;
let sdkInstalled = false;
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
  sdkInstalled = true;
} catch (e) {
  console.error("🔴 FATAL: The '@google/generative-ai' package is not installed.");
  console.error("Please stop the server (Ctrl+C) and run: npm install @google/generative-ai");
}

const app = express();
const port = process.env.PORT || 3000;

const BACKEND_DIR = __dirname;
const FRONTEND_DIR = path.join(BACKEND_DIR, '..', 'frontend');
const INDEX_HTML_PATH = path.join(FRONTEND_DIR, 'index.html');

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

let model = null;
if (sdkInstalled && process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    console.log("✅ Gemini AI Client Initialized successfully.");
  } catch (err) {
    console.error("🔴 FATAL: Could not initialize Gemini client. Is your API key valid?");
    console.error(err.message);
  }
} else {
    if (!process.env.GEMINI_API_KEY) {
        console.error("🔴 FATAL: GEMINI_API_KEY is not set in your backend/.env file.");
    }
}

function buildFullPrompt(type, prompt) {
    switch (type) {
        case 'chat': return `You are a helpful financial assistant for a loan app in India. Keep answers simple and short. User's question: "${prompt}"`;
        case 'analysis': return `Analyze this unstructured text from a loan applicant in India. Provide a concise credit insights summary in bullet points. Text data: "${prompt}"`;
        case 'simplify': return `Simplify this complex loan agreement text into simple bullet points for someone with low financial literacy. Text to simplify: "${prompt}"`;
        case 'eligibility': return `You are an AI loan eligibility assessor. Based on this data, provide a preliminary, non-binding assessment for a user in India. Start with a likely outcome (Good, Moderate, Challenging), then briefly explain why. User's data: "${prompt}"`;
        case 'emi_advice': return `You are an AI financial advisor. A user's loan details are: ${prompt}. Provide simple, actionable advice on: 1) Affordability, 2) Impact of Tenure, 3) Simple Tips.`;
        case 'fraud_analysis': return `You are a fraud detection analyst. Analyze these underwriter notes. Provide three sections: **Potential Red Flags**, **Summary of Risk**, and **Recommended Verification Steps**. Notes: "${prompt}"`;
        default: return null;
    }
}

app.post('/api/gemini', async (req, res) => {
  if (!model) {
    return res.status(500).json({ error: 'Gemini client not initialized on server. Check server logs.' });
  }
  try {
    const { prompt, type } = req.body;
    if (!prompt || !type) {
        return res.status(400).json({ error: 'Missing required fields: prompt and type.' });
    }
    const fullPrompt = buildFullPrompt(type, prompt);
    if (!fullPrompt) {
        return res.status(400).json({ error: `Invalid request type: ${type}` });
    }
    console.log(`[Gemini] Generating content for type: ${type}`);
    const result = await model.generateContent(fullPrompt);
    const text = result?.response?.text ? result.response.text() : '';
    res.json({ response: text });
  } catch (err) {
    console.error("[Gemini Error]", err);
    res.status(500).json({ error: 'Failed to get response from Gemini model. See server logs.' });
  }
});

if (fs.existsSync(INDEX_HTML_PATH)) {
    console.log(`✅ Frontend found at: ${FRONTEND_DIR}`);
    app.use(express.static(FRONTEND_DIR));

    // --- THIS IS THE CORRECTED CODE ---
    // This is a more robust way to handle the 'catch-all' route for single-page apps
    // It specifically catches any route that is NOT an API route.
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(INDEX_HTML_PATH);
    });
    // --- END OF CORRECTION ---

} else {
    console.error(`🔴 FATAL: Frontend file not found at expected path: ${INDEX_HTML_PATH}`);
    console.error("Please ensure your folder structure is correct: project/frontend/index.html");
}

app.listen(port, () => {
  console.log(`\n🚀 SaralCredit Server is running!`);
  console.log(`   Please open your browser and go to: http://localhost:${port}\n`);
});

