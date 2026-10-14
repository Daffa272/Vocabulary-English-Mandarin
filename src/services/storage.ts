import { WordData, DreamItem, AppSettings, Language, Lesson } from '../types';

const SETTINGS_KEY = 'vocab_app_settings_v2';
const WORDS_KEY = 'vocab_words_list_v2';
const RECENT_KEY = 'vocab_recent_searches_v2';
const DREAMS_KEY = 'vocab_dreams_list_v2';
const LESSONS_KEY = 'mandarin_beginner_lessons_v1';
const LEARNED_KEY = 'mandarin_beginner_learned_v1';

export const starterLessons: Lesson[] = [
  {
    id: 'greetings',
    title: 'Salam dasar',
    goal: 'Menyapa dan mengucapkan terima kasih.',
    words: [
      ['你好', 'nǐ hǎo', 'halo'],
      ['谢谢', 'xièxie', 'terima kasih'],
      ['再见', 'zàijiàn', 'sampai jumpa']
    ],
    question: 'Apa arti 你好?',
    answer: 'halo',
    options: ['halo', 'terima kasih', 'sampai jumpa']
  },
  {
    id: 'introduction',
    title: 'Perkenalan',
    goal: 'Memperkenalkan nama dengan pola sederhana.',
    words: [
      ['我', 'wǒ', 'saya'],
      ['你', 'nǐ', 'kamu'],
      ['叫', 'jiào', 'bernama/disebut']
    ],
    question: 'Bagaimana mengatakan "Saya bernama..."?',
    answer: '我叫',
    options: ['我叫', '你好', '谢谢'],
    sentence: ['我叫安娜。', 'Wǒ jiào Ānnà.', 'Nama saya Anna.']
  },
  {
    id: 'numbers',
    title: 'Angka 1-10',
    goal: 'Mengenali angka paling dasar dalam Mandarin.',
    words: [
      ['一', 'yī', 'satu'],
      ['二', 'èr', 'dua'],
      ['三', 'sān', 'tiga'],
      ['四', 'sì', 'empat'],
      ['五', 'wǔ', 'lima'],
      ['十', 'shí', 'sepuluh']
    ],
    question: 'Apa arti 五?',
    answer: 'lima',
    options: ['tiga', 'lima', 'sepuluh']
  },
  {
    id: 'family',
    title: 'Keluarga',
    goal: 'Menyebut anggota keluarga inti.',
    words: [
      ['妈妈', 'māma', 'ibu'],
      ['爸爸', 'bàba', 'ayah'],
      ['朋友', 'péngyou', 'teman']
    ],
    question: 'Apa arti 妈妈?',
    answer: 'ibu',
    options: ['ibu', 'ayah', 'teman']
  },
  {
    id: 'questions',
    title: 'Kata tanya',
    goal: 'Menggunakan siapa, apa, dan di mana.',
    words: [
      ['谁', 'shéi', 'siapa'],
      ['什么', 'shénme', 'apa'],
      ['哪里', 'nǎlǐ', 'di mana']
    ],
    question: 'Apa arti 哪里?',
    answer: 'di mana',
    options: ['siapa', 'apa', 'di mana']
  },
  {
    id: 'sentences',
    title: 'Pola kalimat',
    goal: 'Membuat kalimat afirmatif sederhana.',
    words: [
      ['是', 'shì', 'adalah'],
      ['不', 'bù', 'tidak/bukan'],
      ['吗', 'ma', 'partikel pertanyaan']
    ],
    question: 'Mana yang berarti "bukan/tidak"?',
    answer: '不',
    options: ['是', '不', '吗'],
    sentence: ['你是学生吗？', 'Nǐ shì xuéshēng ma?', 'Apakah kamu seorang pelajar?']
  }
];

export function getLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(LESSONS_KEY);
    const custom: Lesson[] = raw ? JSON.parse(raw) : [];
    return [...starterLessons, ...(Array.isArray(custom) ? custom : [])];
  } catch {
    return starterLessons;
  }
}

export function saveCustomLesson(lesson: Lesson): Lesson[] {
  try {
    const raw = localStorage.getItem(LESSONS_KEY);
    const custom: Lesson[] = raw ? JSON.parse(raw) : [];
    custom.push(lesson);
    localStorage.setItem(LESSONS_KEY, JSON.stringify(custom));
    return [...starterLessons, ...custom];
  } catch {
    return starterLessons;
  }
}

export function getLearnedLessons(): string[] {
  try {
    const raw = localStorage.getItem(LEARNED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleLearnedLesson(id: string): string[] {
  try {
    const current = getLearnedLessons();
    const updated = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    localStorage.setItem(LEARNED_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}


export function getSavedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
    const legacyKey = localStorage.getItem('gemini_api_key') || '';
    return {
      apiKey: legacyKey,
      model: 'gemini-3.8-flash',
      language: 'english'
    };
  } catch {
    return {
      apiKey: '',
      model: 'gemini-3.8-flash',
      language: 'english'
    };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (settings.apiKey) {
      localStorage.setItem('gemini_api_key', settings.apiKey);
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function getSavedWords(): WordData[] {
  try {
    const raw = localStorage.getItem(WORDS_KEY);
    if (raw) return JSON.parse(raw);

    // Migration from legacy app states
    const legacyRaw = localStorage.getItem('repetition_words') || localStorage.getItem('english_app_state_v1');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.words) ? parsed.words : []);
      if (list.length > 0) {
        const migrated: WordData[] = list.map((item: any, idx: number) => ({
          id: item.id || `migrated-${Date.now()}-${idx}`,
          word: item.word || 'Unknown',
          traditional: item.traditional || '',
          phonetic: item.phonetic || '',
          translation: item.translation || '',
          partOfSpeech: item.partOfSpeech || '',
          hskLevel: item.hskLevel || '',
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          antonyms: Array.isArray(item.antonyms) ? item.antonyms : [],
          word_family: item.word_family || {},
          collocations: Array.isArray(item.collocations) ? item.collocations : [],
          morphology: item.morphology || {},
          tenses: item.tenses || {
            present: { form: 'Present', example_en: '', example_id: '' },
            past: { form: 'Past', example_en: '', example_id: '' },
            present_perfect: { form: 'Present Perfect', example_en: '', example_id: '' }
          },
          language: item.language || 'english',
          createdAt: item.createdAt || new Date().toISOString(),
          repetition: typeof item.repetition === 'number' ? item.repetition : 0,
          easiness: typeof item.easiness === 'number' ? item.easiness : 2.5,
          interval: typeof item.interval === 'number' ? item.interval : 0,
          nextReviewDate: item.nextReviewDate || new Date().toISOString()
        }));
        saveWords(migrated);
        return migrated;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveWords(words: WordData[]): void {
  try {
    localStorage.setItem(WORDS_KEY, JSON.stringify(words));
    localStorage.setItem('repetition_words', JSON.stringify(words));
  } catch (err) {
    console.error('Failed to save words:', err);
  }
}

export function updateWordSM2(wordId: string, quality: number): WordData[] {
  const words = getSavedWords();
  const index = words.findIndex(w => w.id === wordId || w.word.toLowerCase() === wordId.toLowerCase());
  if (index === -1) return words;

  const card = words[index];
  let easiness = card.easiness || 2.5;
  let repetition = card.repetition || 0;
  let interval = card.interval || 0;

  // SM-2 formula
  easiness = Math.max(1.3, easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    repetition = 0;
    interval = 0;
  } else {
    if (repetition === 0) {
      interval = quality === 5 ? 2 : 1;
    } else if (repetition === 1) {
      interval = quality === 5 ? 8 : 6;
    } else {
      interval = Math.max(1, Math.round(interval * easiness * (quality === 5 ? 1.3 : quality === 3 ? 0.7 : 1)));
    }
    repetition += 1;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  words[index] = {
    ...card,
    easiness,
    repetition,
    interval,
    nextReviewDate: nextDate.toISOString()
  };

  saveWords(words);
  return words;
}

export function getRecentSearches(lang: Language = 'english'): string[] {
  try {
    const raw = localStorage.getItem(`${RECENT_KEY}_${lang}`);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem('recent_searches');
    if (legacy && lang === 'english') {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) return parsed.slice(0, 8);
    }
    return [];
  } catch {
    return [];
  }
}

export function addRecentSearch(word: string, lang: Language = 'english'): string[] {
  const current = getRecentSearches(lang).filter(w => w.toLowerCase() !== word.toLowerCase());
  const updated = [word, ...current].slice(0, 8);
  try {
    localStorage.setItem(`${RECENT_KEY}_${lang}`, JSON.stringify(updated));
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  } catch {}
  return updated;
}

export function getSavedDreams(): DreamItem[] {
  try {
    const raw = localStorage.getItem(DREAMS_KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem('english-dream-list');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        const migrated: DreamItem[] = parsed.map((d: any, idx: number) => ({
          id: d.id || `dream-${Date.now()}-${idx}`,
          text: d.text || '',
          achieved: Boolean(d.achieved),
          createdAt: d.createdAt || new Date().toISOString()
        }));
        saveDreams(migrated);
        return migrated;
      }
    }
    return [
      { id: '1', text: 'Mencapai skor TOEFL iBT 100+ tahun ini', achieved: false, createdAt: new Date().toISOString() },
      { id: '2', text: 'Menguasai 500 kosakata akademik tingkat lanjut', achieved: false, createdAt: new Date().toISOString() }
    ];
  } catch {
    return [];
  }
}

export function saveDreams(dreams: DreamItem[]): void {
  try {
    localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams));
    localStorage.setItem('english-dream-list', JSON.stringify(dreams));
  } catch (err) {
    console.error('Failed to save dreams:', err);
  }
}

export function exportFullBackup(): void {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: getSavedSettings(),
    words: getSavedWords(),
    dreams: getSavedDreams(),
    recentSearches: {
      english: getRecentSearches('english'),
      mandarin: getRecentSearches('mandarin')
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vocabmaster-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importFullBackup(jsonContent: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonContent);
    if (Array.isArray(parsed.words)) {
      saveWords(parsed.words);
    } else if (Array.isArray(parsed)) {
      saveWords(parsed);
    }

    if (Array.isArray(parsed.dreams)) {
      saveDreams(parsed.dreams);
    }

    if (parsed.settings) {
      saveSettings(parsed.settings);
    }

    return { success: true, message: 'Data backup berhasil diimpor dengan sempurna!' };
  } catch (err: any) {
    return { success: false, message: 'Format file JSON tidak valid.' };
  }
}
