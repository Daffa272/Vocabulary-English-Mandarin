import { WordData, QuizQuestion, Language } from '../types';

export interface AnalyzeParams {
  target?: string;
  language?: Language;
  isRandom?: boolean;
  model?: string;
  apiKey?: string;
}

export async function checkServerHealth(): Promise<{ status: string; hasServerKey: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch {
    return { status: 'error', hasServerKey: false };
  }
}

export async function analyzeVocabulary(params: AnalyzeParams): Promise<WordData> {
  const { target = '', language = 'english', isRandom = false, model = 'gemini-3.8-flash', apiKey = '' } = params;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey && apiKey.trim()) {
    headers['x-gemini-key'] = apiKey.trim();
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      target: target.trim(),
      language,
      isRandom,
      model
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Gagal menganalisis kosakata. Pastikan koneksi atau API Key valid.');
  }

  const result = data.data;

  // Standardize WordData object
  const wordData: WordData = {
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

  return wordData;
}

export async function generateAIQuiz(words: string[], language: Language = 'english', model = 'gemini-3.8-flash', apiKey = ''): Promise<QuizQuestion[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey && apiKey.trim()) {
    headers['x-gemini-key'] = apiKey.trim();
  }

  const response = await fetch('/api/quiz', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      words,
      language,
      model
    })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Gagal membuat soal latihan AI.');
  }

  return data.questions || [];
}

export async function generateMandarinLesson(englishTopic: string, model = 'gemini-3.8-flash', apiKey = ''): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey && apiKey.trim()) {
    headers['x-gemini-key'] = apiKey.trim();
  }

  const response = await fetch('/api/generate-lesson', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      english: englishTopic,
      model
    })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Gagal membuat pelajaran Mandarin AI.');
  }

  return data.lesson;
}

