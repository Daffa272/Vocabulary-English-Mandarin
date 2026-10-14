import { WordData, QuizQuestion, Language, Lesson } from '../types';
import {
  analyzeVocabularyDirect,
  generateAIQuizDirect,
  generateMandarinLessonDirect,
  getClientApiKey
} from './geminiDirect';

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
    if (!res.ok) {
      // 404 means static hosting like Vercel without express server
      return { status: 'static', hasServerKey: false };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { status: 'static', hasServerKey: false };
    }
    return await res.json();
  } catch {
    return { status: 'static', hasServerKey: false };
  }
}

export async function analyzeVocabulary(params: AnalyzeParams): Promise<WordData> {
  const {
    target = '',
    language = 'english',
    isRandom = false,
    model = 'gemini-3.8-flash',
    apiKey = ''
  } = params;

  const effectiveKey = apiKey.trim() || getClientApiKey();

  // Try server-side endpoint first
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (effectiveKey) {
      headers['x-gemini-key'] = effectiveKey;
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

    // Check if endpoint exists (404 means static host like Vercel)
    if (response.status === 404) {
      console.info('Server /api/analyze not found (Static host like Vercel). Using direct Gemini API client fallback...');
      return await analyzeVocabularyDirect(target, language, isRandom, model, effectiveKey);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // HTML fallback returned by Vercel / Vite SPA router
      return await analyzeVocabularyDirect(target, language, isRandom, model, effectiveKey);
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      // If server returned an error but we have a client API key, try direct
      if (effectiveKey) {
        return await analyzeVocabularyDirect(target, language, isRandom, model, effectiveKey);
      }
      throw new Error(data.error || 'Gagal menganalisis kosakata.');
    }

    const result = data.data;
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
  } catch (error: any) {
    // If fetch failed or server returned 404, fallback to direct client call
    console.warn('Backend call failed, trying direct Gemini client fallback...', error.message);
    return await analyzeVocabularyDirect(target, language, isRandom, model, effectiveKey);
  }
}

export async function generateAIQuiz(
  words: string[],
  language: Language = 'english',
  model = 'gemini-3.8-flash',
  apiKey = ''
): Promise<QuizQuestion[]> {
  const effectiveKey = apiKey.trim() || getClientApiKey();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (effectiveKey) {
      headers['x-gemini-key'] = effectiveKey;
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

    if (response.status === 404) {
      return await generateAIQuizDirect(words, language, model, effectiveKey);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return await generateAIQuizDirect(words, language, model, effectiveKey);
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      if (effectiveKey) {
        return await generateAIQuizDirect(words, language, model, effectiveKey);
      }
      throw new Error(data.error || 'Gagal membuat kuis AI.');
    }

    return data.questions || [];
  } catch (error: any) {
    return await generateAIQuizDirect(words, language, model, effectiveKey);
  }
}

export async function generateMandarinLesson(
  englishTopic: string,
  model = 'gemini-3.8-flash',
  apiKey = ''
): Promise<Lesson> {
  const effectiveKey = apiKey.trim() || getClientApiKey();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (effectiveKey) {
      headers['x-gemini-key'] = effectiveKey;
    }

    const response = await fetch('/api/generate-lesson', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        english: englishTopic,
        model
      })
    });

    if (response.status === 404) {
      return await generateMandarinLessonDirect(englishTopic, model, effectiveKey);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return await generateMandarinLessonDirect(englishTopic, model, effectiveKey);
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      if (effectiveKey) {
        return await generateMandarinLessonDirect(englishTopic, model, effectiveKey);
      }
      throw new Error(data.error || 'Gagal membuat pelajaran Mandarin AI.');
    }

    return data.lesson;
  } catch (error: any) {
    return await generateMandarinLessonDirect(englishTopic, model, effectiveKey);
  }
}
