import { WordData, QuizQuestion, Language, Lesson } from '../types';

export function getClientApiKey(): string {
  try {
    const raw = localStorage.getItem('vocab_app_settings_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && typeof parsed.apiKey === 'string') return parsed.apiKey.trim();
    }
    const legacy = localStorage.getItem('gemini_api_key');
    if (legacy && typeof legacy === 'string') return legacy.trim();
  } catch {}
  return '';
}

export async function callGeminiREST(
  prompt: string,
  systemPrompt: string,
  model = 'gemini-3.8-flash',
  apiKey = ''
): Promise<string> {
  const effectiveKey = apiKey.trim() || getClientApiKey();
  if (!effectiveKey) {
    throw new Error(
      'Kunci API Gemini belum diisi. Karena aplikasi berjalan di hosting statis (seperti Vercel), silakan buka menu Pengaturan (ikon ⚙️) dan masukkan Gemini API Key gratis Anda.'
    );
  }

  const primaryModel = model || 'gemini-3.8-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(primaryModel)}:generateContent?key=${encodeURIComponent(effectiveKey)}`;

  let response: globalThis.Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      })
    });
  } catch (netErr: any) {
    throw new Error(`Gagal menghubungi server Gemini: ${netErr.message || 'Periksa koneksi internet Anda.'}`);
  }

  // Automatic model fallback if model is unavailable or 503/404
  if (!response.ok && (response.status === 503 || response.status === 404 || response.status === 429)) {
    const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(effectiveKey)}`;
    try {
      response = await fetch(fallbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        })
      });
    } catch {}
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorDetail = `Gemini API menolak permintaan (${response.status}).`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed?.error?.message) {
        errorDetail += ` ${parsed.error.message}`;
      }
    } catch {}
    throw new Error(errorDetail);
  }

  const jsonResult = await response.json();
  const text = jsonResult.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  if (!text) {
    throw new Error('Gemini tidak memberikan jawaban yang valid.');
  }

  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export async function analyzeVocabularyDirect(
  target: string,
  language: Language = 'english',
  isRandom = false,
  model = 'gemini-3.8-flash',
  apiKey = ''
): Promise<WordData> {
  const isMandarin = language === 'mandarin';

  let systemPrompt = '';
  let userPrompt = '';

  if (!isMandarin) {
    systemPrompt = `Anda adalah instruktur ahli persiapan TOEFL iBT & GRE bertaraf internasional.
Tugas Anda adalah menganalisis kata, frasa, phrasal verb, atau klausa bahasa Inggris secara mendalam dan terstruktur.
Jika pengguna meminta kata acak, pilih satu kata penting dari Academic Word List (AWL) tingkat lanjut.

PENTING:
- Transkripsi fonetik IPA standar (contoh: /ˌʌnˈpres.ɪ.den.tɪd/)
- Terjemahan bahasa Indonesia yang akurat dan bernuansa formal/akademis
- 3 sinonim atau padanan kata akademik
- 2 antonim jika relevan (atau "-" jika tidak ada)
- Word Family (noun, verb, adjective, adverb) beserta bentuk katanya (atau "-" bila tidak berlaku)
- 3 Collocations (sandingan kata akademik yang lazim)
- Analisis Morphology (prefix, root, suffix beserta artinya dalam bahasa Indonesia)
- 3 Contoh Kalimat Akademik bernuansa TOEFL Reading/Listening dalam 3 bentuk tenses: Present Tense, Past Tense, dan Present Perfect Tense, lengkap dengan terjemahan Indonesia.

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
    systemPrompt = `Anda adalah pengajar bahasa Mandarin profesional (HSK Standard Course).
Tugas Anda adalah menganalisis kata, frasa, atau Chengyu Mandarin yang diberikan.
Jika pengguna meminta kata acak, pilih satu kata dari kosakata HSK 3 - HSK 6.

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

  const rawJson = await callGeminiREST(userPrompt, systemPrompt, model, apiKey);
  const result = JSON.parse(rawJson);

  return {
    id: `word-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    word: result.word || target,
    traditional: result.traditional || '',
    phonetic: result.phonetic || '',
    translation: result.translation || '',
    partOfSpeech: result.partOfSpeech || '',
    hskLevel: result.hskLevel || '',
    synonyms: Array.isArray(result.synonyms) ? result.synonyms : [],
    antonyms: Array.isArray(result.antonyms) ? result.antonyms : [],
    word_family: result.word_family || {},
    collocations: Array.isArray(result.collocations) ? result.collocations : [],
    morphology: result.morphology || {},
    tenses: result.tenses || {
      present: { form: 'Present', example_en: '', example_id: '' },
      past: { form: 'Past', example_en: '', example_id: '' },
      present_perfect: { form: 'Present Perfect', example_en: '', example_id: '' }
    },
    language,
    createdAt: new Date().toISOString(),
    repetition: 0,
    easiness: 2.5,
    interval: 0,
    nextReviewDate: new Date().toISOString()
  };
}

export async function generateAIQuizDirect(
  words: string[],
  language: Language = 'english',
  model = 'gemini-3.8-flash',
  apiKey = ''
): Promise<QuizQuestion[]> {
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

  const prompt = `Buat 3-5 butir soal pilihan ganda akademik untuk kata-kata: ${wordList}`;
  const rawJson = await callGeminiREST(prompt, systemPrompt, model, apiKey);
  const parsed = JSON.parse(rawJson);
  return parsed.questions || [];
}

export async function generateMandarinLessonDirect(
  englishTopic: string,
  model = 'gemini-3.8-flash',
  apiKey = ''
): Promise<Lesson> {
  const systemPrompt = `Anda adalah guru bahasa Mandarin pemula yang berpengalaman.
Tugas Anda adalah membuat satu unit pelajaran Mandarin pemula berdasarkan kata atau topik bahasa Inggris: "${englishTopic.trim()}".
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

  const prompt = `Buat pelajaran Mandarin pemula untuk topik: "${englishTopic.trim()}"`;
  const rawJson = await callGeminiREST(prompt, systemPrompt, model, apiKey);
  return JSON.parse(rawJson);
}
