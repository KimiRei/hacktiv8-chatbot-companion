const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

// Menggunakan SDK resmi Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Instruction untuk persona Companion Bot (Sesi 3)
const systemInstruction = `Kamu adalah 'Companion Bot', asisten virtual bergaya industrial untuk menemani programmer. 
Gunakan bahasa Indonesia santai. Jika user bilang 'Timer Fokus' berjalan, jawab sangat singkat. 
Jika bertanya soal error code, berikan snippet perbaikan yang rapi tanpa basa-basi berlebihan.`;

// Inisialisasi Model dengan konfigurasi (Sesi 3)
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash', // Atau bisa coba 'gemini-2.0-flash' kalau masih berat
    systemInstruction: systemInstruction,
    generationConfig: {
        temperature: 0.7,
    }
});

// Setup Multer untuk Sesi 2 (Upload File) - Disimpan di memori sementara
const upload = multer({ storage: multer.memoryStorage() });

// --- ENDPOINT SESI 3: Chatbot dengan Memori ---
// Menyimpan riwayat chat sementara di server (bisa direset jika server mati)
let chatHistory = [];

app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.prompt;
        
        // Memulai sesi chat dengan riwayat sebelumnya
        const chat = model.startChat({
            history: chatHistory,
        });

        // Mengirim pesan user ke Gemini
        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();

        // Simpan ke riwayat agar bot ingat percakapan sebelumnya
        chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        chatHistory.push({ role: 'model', parts: [{ text: responseText }] });

        res.json({ reply: responseText });
    } catch (error) {
        console.error("Error dari Gemini API:", error);
        res.status(500).json({ reply: "Aduh, servernya lagi pusing. Coba cek terminal VS Code ya!" });
    }
});

// --- ENDPOINT SESI 2: Multimodal (Gambar/Dokumen) ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("Tidak ada file yang diupload.");

        const prompt = req.body.prompt || "Jelaskan gambar/dokumen ini.";
        
        // Konversi file ke format Base64 yang bisa dibaca Gemini
        const filePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
            },
        };

        const result = await model.generateContent([prompt, filePart]);
        res.json({ reply: result.response.text() });
    } catch (error) {
        console.error(error);
        res.status(500).send("Gagal memproses file.");
    }
});

// Jalankan Server
const PORT = process.env.PORT || 3000;
app.use(express.static('.'));
app.listen(PORT, () => {
    console.log(`🚀 Server Companion Bot menyala di http://localhost:${PORT}`);
});