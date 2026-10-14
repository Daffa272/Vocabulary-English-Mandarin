import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '1mb' }));

// Helper to instantiate GoogleGenAI client with key precedence: request header > server env
function getGenAIClient(req: Request) {
  const customKey = req.headers['x-gemini-key'] as string | undefined;
  const apiKey = (customKey && customKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Kunci API Gemini tidak ditemukan. Harap masukkan API Key di menu Pengaturan atau pastikan GEMINI_API_KEY terkonfigurasi.');
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

// Generate with automatic fallback if primary model experiences 503 or 429
async function generateContentSafe(ai: GoogleGenAI, preferredModel: string, config: any) {
  try {
    return await ai.models.generateContent({
      model: preferredModel || 'gemini-3.8-flash',
      ...config
    });
  } catch (err: any) {
    console.warn(`Model ${preferredModel} encountered issue: ${err.message}. Trying gemini-3.1-flash-lite fallback...`);
    return await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      ...config
    });
  }
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasServerKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0)
  });
});

// Analyze vocabulary endpoint (English TOEFL or Mandarin HSK)
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { target, language = 'english', isRandom = false, model = 'gemini-3.8-flash' } = req.body;
    const ai = getGenAIClient(req);

    const isMandarin = language === 'mandarin';

    let systemPrompt = '';
    let userPrompt = '';

    if (!isMandarin) {
      // English TOEFL prompt
      systemPrompt = `Anda adalah instruktur ahli persiapan TOEFL iBT & GRE bertaraf internasional.
Tugas Anda adalah menganalisis kata, frasa, phrasal verb, atau klausa bahasa Inggris secara mendalam dan terstruktur.
Jika pengguna meminta kata acak, pilih satu kata penting dari Academic Word List (AWL) tingkat lanjut (contoh: unprecedented, ubiquitous, empirical, plausible, delineate).

PENTING:
- Transkripsi fonetik IPA standar (contoh: /ˌʌnˈpres.ɪ.den.tɪd/)
- Terjemahan bahasa Indonesia yang akurat dan bernuansa formal/akademis
- 3 sinonim atau padanan kata akademik
- 2 antonim jika relevan (atau "-" jika tidak ada)
- Word Family (noun, verb, adjective, adverb) beserta bentuk katanya (atau "-" bila tidak berlaku)
- 3 Collocations (sandingan kata akademik yang lazim)
- Analisis Morphology (prefix, root, suffix beserta artinya dalam bahasa Indonesia)
- 3 Contoh Kalimat Akademik bernuansa TOEFL Reading/Listening (bidang sains, sejarah, psikologi, ekonomi) dalam 3 bentuk tenses: Present Tense, Past Tense, dan Present Perfect Tense, lengkap dengan terjemahan Indonesia.

WAJIB FORMAT JSON MURNI TANPA MARKDOWN BACKTICKS:
{
  "word": "target kata/frasa persis",
  "phonetic": "/.../",
  "translation": "arti bahasa indonesia",
  "partOfSpeech": "noun / verb / adjective / adverb / phrase",
  "synonyms": ["sinonim 1", "sinonim 2", "sinonim 3"],
  "antonyms": ["antonim 1", "antonim 2"],
  "word_family": {
    "noun": "...",
    "verb": "...",
    "adjective": "...",
    "adverb": "..."
  },
  "collocations": ["collocation 1", "collocation 2", "collocation 3"],
  "morphology": {
    "prefix": "awalan & artinya (atau -)",
    "root": "akar kata & asal usul/artinya",
    "suffix": "akhiran & artinya (atau -)"
  },
  "tenses": {
    "present": { "form": "bentuk waktu", "example_en": "kalimat contoh akademik present", "example_id": "terjemahan indonesia" },
    "past": { "form": "bentuk waktu", "example_en": "kalimat contoh akademik past", "example_id": "terjemahan indonesia" },
    "present_perfect": { "form": "bentuk waktu", "example_en": "kalimat contoh akademik present perfect", "example_id": "terjemahan indonesia" }
  }
}`;

      userPrompt = isRandom
        ? "Berikan satu kosakata akademik tingkat lanjut dari Academic Word List (AWL) TOEFL secara acak lalu analisis lengkap."
        : `TARGET ANALISIS: "${target}"\nAnalisis tepat TARGET EKSPRESI tersebut secara mendalam. Nilai JSON "word" harus berisi "${target}" persis.`;
    } else {
      // Mandarin HSK prompt
      systemPrompt = `Anda adalah pengajar bahasa Mandarin profesional (HSK Standard Course).
Tugas Anda adalah menganalisis kata, frasa, atau Chengyu Mandarin yang diberikan.
Jika pengguna meminta kata acak, pilih satu kata dari kosakata HSK 3 - HSK 6 (contoh: 坚持, 影响, 佩服, 潜移默化).

Berikan:
- Hanzi Sederhana & Tradisional
- Pinyin dengan tanda nada yang tepat (misal: jiānchí)
- Tingkat HSK (HSK 1 - HSK 6)
- Terjemahan bahasa Indonesia yang jelas
- Bagian kata (Noun, Verb, Adjective, dsb.)
- Analisis Karakter / 部首 (Radikal, arti per karakter pembentuk)
- 3 Sinonim (Tongyici)
- 2 Antonim (Fanyici)
- 3 Collocations / Pasangan kata yang umum
- 3 Contoh Kalimat kontekstual dalam bahasa Mandarin beserta Pinyin dan terjemahan Indonesia.

WAJIB FORMAT JSON MURNI TANPA MARKDOWN BACKTICKS:
{
  "word": "Hanzi sederhana",
  "traditional": "Hanzi tradisional",
  "phonetic": "pinyin dengan nada",
  "translation": "arti indonesia",
  "partOfSpeech": "kategori kata",
  "hskLevel": "HSK 1 / 2 / 3 / 4 / 5 / 6",
  "synonyms": ["sinonim 1", "sinonim 2", "sinonim 3"],
  "antonyms": ["antonim 1", "antonim 2"],
  "word_family": {
    "noun": "-",
    "verb": "-",
    "adjective": "-",
    "adverb": "-"
  },
  "collocations": ["搭配 1", "搭配 2", "搭配 3"],
  "morphology": {
    "prefix": "Radikal (部首) & stroke",
    "root": "Analisis arti per karakter pembentuk",
    "suffix": "Struktur pembentukan kata"
  },
  "tenses": {
    "present": { "form": "Penggunaan Sehari-hari", "example_en": "Kalimat Mandarin 1 (Hanzi + Pinyin)", "example_id": "Terjemahan Indonesia 1" },
    "past": { "form": "Situasi Formal / Kerja", "example_en": "Kalimat Mandarin 2 (Hanzi + Pinyin)", "example_id": "Terjemahan Indonesia 2" },
    "present_perfect": { "form": "Konteks Lanjutan / HSK", "example_en": "Kalimat Mandarin 3 (Hanzi + Pinyin)", "example_id": "Terjemahan Indonesia 3" }
  }
}`;

      userPrompt = isRandom
        ? "Berikan satu kata Mandarin penting dari HSK 3-6 secara acak dan analisis lengkap."
        : `TARGET MANDARIN: "${target}"\nAnalisis tepat TARGET tersebut. Nilai JSON "word" harus berisi Hanzi target.`;
    }

    const response = await generateContentSafe(ai, model, {
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    res.json({
      success: true,
      data: parsed
    });
  } catch (error: any) {
    console.error('Analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal menganalisis kosakata.'
    });
  }
});

// AI Quiz generator endpoint
app.post('/api/quiz', async (req: Request, res: Response) => {
  try {
    const { words = [], language = 'english', model = 'gemini-3.8-flash' } = req.body;
    if (!words || words.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada kata yang dipilih untuk kuis.' });
    }

    const ai = getGenAIClient(req);
    const wordList = words.slice(0, 5).join(', ');

    const systemPrompt = `Anda adalah pembuat soal ujian TOEFL iBT & kemampuan bahasa profesional.
Buatkan latihan pilihan ganda (4 opsi: A, B, C, D) jenis melengkapi kalimat rumpang (sentence completion / fill-in-the-blank) bernuansa konteks akademik ilmiah atau bacaan formal untuk menguji kosakata berikut: [${wordList}].
Setiap soal harus menguji pemahaman makna kata dan/atau Word Family (pemilihan part of speech yang tepat sesuai struktur sintaksis kalimat).

WAJIB FORMAT JSON MURNI:
{
  "questions": [
    {
      "word": "kata_dasar",
      "question": "Kalimat soal akademis dengan bagian rumpang ditandai ___",
      "options": ["A. opsi 1", "B. opsi 2", "C. opsi 3", "D. opsi 4"],
      "answer": "A",
      "explanation": "Penjelasan tata bahasa (grammar) dan arti mengapa jawaban tersebut tepat."
    }
  ]
}`;

    const response = await generateContentSafe(ai, model, {
      contents: [
        { role: 'user', parts: [{ text: `Buat 3-5 butir soal pilihan ganda akademik untuk kata-kata: ${wordList}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    res.json({
      success: true,
      questions: parsed.questions || []
    });
  } catch (error: any) {
    console.error('Quiz error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal menghasilkan kuis AI.'
    });
  }
});

// AI Mandarin Lesson generator endpoint
app.post('/api/generate-lesson', async (req: Request, res: Response) => {
  try {
    const { english = '', model = 'gemini-3.8-flash' } = req.body;
    if (!english || !english.trim()) {
      return res.status(400).json({ success: false, error: 'Masukkan kata atau topik bahasa Inggris.' });
    }

    const ai = getGenAIClient(req);

    const systemPrompt = `Anda adalah guru bahasa Mandarin pemula yang berpengalaman.
Tugas Anda adalah membuat satu unit pelajaran Mandarin pemula berdasarkan kata atau topik bahasa Inggris: "${english.trim()}".
Gunakan Mandarin Simplified dengan Pinyin bertanda nada yang akurat.
Kembalikan JSON valid saja dengan struktur:
{
  "title": "Judul pelajaran singkat dalam bahasa Indonesia",
  "goal": "Tujuan pembelajaran dalam 1 kalimat bahasa Indonesia",
  "words": [
    ["Hanzi", "Pinyin bertanda nada", "Arti bahasa Indonesia"]
  ],
  "question": "Pertanyaan kuis pilihan ganda dalam bahasa Indonesia",
  "answer": "Jawaban tepat (harus salah satu dari pilihan di options)",
  "options": ["opsi 1", "opsi 2", "opsi 3"],
  "sentence": ["Kalimat Hanzi kontekstual", "Pinyin bertanda nada", "Terjemahan bahasa Indonesia"]
}
PENTING: Buat 3 sampai 5 kata terkait yang mudah untuk pemula. "options" harus memuat "answer" persis.`;

    const response = await generateContentSafe(ai, model, {
      contents: [
        { role: 'user', parts: [{ text: `Buat pelajaran Mandarin pemula untuk topik: "${english.trim()}"` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const lesson = JSON.parse(cleanJson);

    res.json({
      success: true,
      lesson
    });
  } catch (error: any) {
    console.error('Generate lesson error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal membuat pelajaran Mandarin AI.'
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VocabMaster AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
