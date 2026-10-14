export type Language = 'english' | 'mandarin';

export interface WordFamily {
  noun?: string;
  verb?: string;
  adjective?: string;
  adverb?: string;
}

export interface Morphology {
  prefix?: string;
  root?: string;
  suffix?: string;
}

export interface TenseExample {
  form: string;
  example_en: string;
  example_id: string;
}

export interface Tenses {
  present: TenseExample;
  past: TenseExample;
  present_perfect: TenseExample;
}

export interface WordData {
  id: string;
  word: string;
  traditional?: string;
  phonetic: string;
  translation: string;
  partOfSpeech?: string;
  hskLevel?: string;
  synonyms: string[];
  antonyms: string[];
  word_family: WordFamily;
  collocations: string[];
  morphology: Morphology;
  tenses: Tenses;
  language: Language;
  createdAt: string;
  // SM-2 Spaced Repetition fields
  repetition: number;
  easiness: number;
  interval: number;
  nextReviewDate: string;
}

export interface QuizQuestion {
  word: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface DreamItem {
  id: string;
  text: string;
  achieved: boolean;
  createdAt: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  language: Language;
}

export interface Lesson {
  id: string;
  title: string;
  goal: string;
  words: [string, string, string][]; // [hanzi, pinyin, indonesian]
  question: string;
  answer: string;
  options: string[];
  sentence?: [string, string, string]; // [hanzi, pinyin, indonesian]
  custom?: boolean;
}

export type ReviewMode = 'due' | 'learning' | 'new-learning';

export type ActiveTab = 'search' | 'writing' | 'flashcards' | 'quiz' | 'dreams' | 'settings';
