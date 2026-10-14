import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { SearchAnalysis } from './components/SearchAnalysis';
import { FlashcardsView } from './components/FlashcardsView';
import { FlashcardModal } from './components/FlashcardModal';
import { QuizModal } from './components/QuizModal';
import { DreamsView } from './components/DreamsView';
import { SettingsModal } from './components/SettingsModal';
import { MandarinWritingLab } from './components/MandarinWritingLab';
import { Toast, ToastMessage } from './components/Toast';
import {
  WordData,
  DreamItem,
  AppSettings,
  Language,
  ActiveTab,
  ReviewMode,
  QuizQuestion
} from './types';
import {
  getSavedSettings,
  saveSettings,
  getSavedWords,
  saveWords,
  updateWordSM2,
  getRecentSearches,
  addRecentSearch,
  getSavedDreams,
  saveDreams,
  exportFullBackup,
  importFullBackup
} from './services/storage';
import {
  analyzeVocabulary,
  generateAIQuiz,
  checkServerHealth
} from './services/api';
import { Sparkles, Brain, BookOpen } from 'lucide-react';

export default function App() {
  // App settings & Language
  const [settings, setSettings] = useState<AppSettings>(() => getSavedSettings());
  const [language, setLanguage] = useState<Language>(() => settings.language || 'english');
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  // Words & Analysis state
  const [words, setWords] = useState<WordData[]>(() => getSavedWords());
  const [currentWord, setCurrentWord] = useState<WordData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    getRecentSearches(settings.language || 'english')
  );

  // Dreams & Server status
  const [dreams, setDreams] = useState<DreamItem[]>(() => getSavedDreams());
  const [hasServerKey, setHasServerKey] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWritingChar, setSelectedWritingChar] = useState<string | undefined>();

  // Review & Quiz modal states
  const [reviewQueue, setReviewQueue] = useState<WordData[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check backend server health & Gemini API key on mount
  useEffect(() => {
    checkServerHealth().then((health) => {
      setHasServerKey(health.hasServerKey);
    });
  }, []);

  // Sync recent searches when language switches
  useEffect(() => {
    setRecentSearches(getRecentSearches(language));
  }, [language]);

  // Due flashcards count
  const now = new Date();
  const dueWords = words.filter(
    (w) => (!w.nextReviewDate || new Date(w.nextReviewDate) <= now)
  );

  // Search handler
  const handleSearch = async (targetWord: string) => {
    // Check if word already exists in saved flashcards for instant load
    const existing = words.find(
      (w) => w.word.toLowerCase() === targetWord.toLowerCase()
    );
    if (existing) {
      setCurrentWord(existing);
      setRecentSearches(addRecentSearch(existing.word, language));
      addToast(`Memuat "${existing.word}" dari daftar flashcard!`, 'info');
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeVocabulary({
        target: targetWord,
        language,
        isRandom: false,
        model: settings.model,
        apiKey: settings.apiKey
      });

      setCurrentWord(result);
      setRecentSearches(addRecentSearch(result.word, language));
    } catch (err: any) {
      addToast(err.message || 'Gagal menganalisis kosakata.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Random word handler
  const handleRandom = async () => {
    setIsLoading(true);
    try {
      const result = await analyzeVocabulary({
        language,
        isRandom: true,
        model: settings.model,
        apiKey: settings.apiKey
      });

      setCurrentWord(result);
      setRecentSearches(addRecentSearch(result.word, language));
      addToast(`Kosakata acak ditemukan: ${result.word}`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal memuat kosakata acak.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle save flashcard
  const isCurrentWordSaved = currentWord
    ? words.some((w) => w.word.toLowerCase() === currentWord.word.toLowerCase())
    : false;

  const handleToggleSave = () => {
    if (!currentWord) return;

    if (isCurrentWordSaved) {
      const nextWords = words.filter(
        (w) => w.word.toLowerCase() !== currentWord.word.toLowerCase()
      );
      setWords(nextWords);
      saveWords(nextWords);
      addToast(`"${currentWord.word}" dihapus dari flashcard.`, 'info');
    } else {
      const newCard: WordData = {
        ...currentWord,
        repetition: 0,
        easiness: 2.5,
        interval: 0,
        nextReviewDate: new Date().toISOString()
      };
      const nextWords = [newCard, ...words];
      setWords(nextWords);
      saveWords(nextWords);
      addToast(`"${currentWord.word}" berhasil disimpan ke Spaced Repetition!`, 'success');
    }
  };

  const handleDeleteWord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = words.find((w) => w.id === id);
    const nextWords = words.filter((w) => w.id !== id);
    setWords(nextWords);
    saveWords(nextWords);
    addToast(`"${target?.word || 'Kosakata'}" telah dihapus.`, 'info');
  };

  // Start Flashcard Review Session
  const handleStartReview = (mode: ReviewMode) => {
    let candidates: WordData[] = [];
    if (mode === 'learning') {
      candidates = words.filter((w) => (w.repetition || 0) > 0);
    } else if (mode === 'new-learning') {
      candidates = words.filter((w) => (w.repetition || 0) === 1);
    } else {
      candidates = words;
    }

    const queue = candidates.filter(
      (w) => !w.nextReviewDate || new Date(w.nextReviewDate) <= now
    );

    if (queue.length === 0) {
      addToast(
        mode === 'learning'
          ? 'Belum ada kartu yang sedang dipelajari dan jatuh tempo.'
          : mode === 'new-learning'
          ? 'Belum ada kartu baru masuk yang jatuh tempo.'
          : 'Semua memori Anda segar! Tidak ada kartu jatuh tempo hari ini. 🎉',
        'info'
      );
      return;
    }

    // Shuffle queue
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    setReviewQueue(shuffled);
    setReviewIndex(0);
    setIsReviewOpen(true);
  };

  // Rate card during flashcard review
  const handleRateCard = (quality: number) => {
    const card = reviewQueue[reviewIndex];
    if (!card) return;

    const updatedWords = updateWordSM2(card.id, quality);
    setWords(updatedWords);

    if (reviewIndex + 1 < reviewQueue.length) {
      setReviewIndex((prev) => prev + 1);
    } else {
      setIsReviewOpen(false);
      addToast('Sesi review selesai! Jadwal memori telah diperbarui.', 'success');
    }
  };

  // Start AI Quiz session
  const handleStartQuiz = async () => {
    if (words.length === 0) {
      addToast('Simpan beberapa kosakata ke flashcard terlebih dahulu untuk latihan kuis.', 'info');
      setActiveTab('search');
      return;
    }

    setIsQuizOpen(true);
    setIsQuizLoading(true);

    try {
      // Pick due or recent words for quiz testing
      const due = words.filter((w) => !w.nextReviewDate || new Date(w.nextReviewDate) <= now);
      const pool = due.length > 0 ? due : words;
      const selectedWords = [...pool].sort(() => Math.random() - 0.5).slice(0, 5).map((w) => w.word);

      const questions = await generateAIQuiz(
        selectedWords,
        language,
        settings.model,
        settings.apiKey
      );

      setQuizQuestions(questions);
    } catch (err: any) {
      addToast(err.message || 'Gagal membuat kuis AI.', 'error');
      setIsQuizOpen(false);
    } finally {
      setIsQuizLoading(false);
    }
  };

  // Finish quiz and update SM-2 memory intervals
  const handleFinishQuiz = (results: { word: string; isCorrect: boolean }[]) => {
    let nextWords = [...words];
    results.forEach(({ word, isCorrect }) => {
      const idx = nextWords.findIndex(
        (w) => w.word.toLowerCase() === word.toLowerCase()
      );
      if (idx !== -1) {
        nextWords = updateWordSM2(nextWords[idx].id, isCorrect ? 4 : 1);
      }
    });
    setWords(nextWords);
  };

  // Dream list handlers
  const handleAddDream = (text: string) => {
    const newDream: DreamItem = {
      id: `dream-${Date.now()}`,
      text,
      achieved: false,
      createdAt: new Date().toISOString()
    };
    const nextDreams = [newDream, ...dreams];
    setDreams(nextDreams);
    saveDreams(nextDreams);
    addToast('Target baru berhasil ditambahkan!', 'success');
  };

  const handleToggleDream = (id: string) => {
    const nextDreams = dreams.map((d) =>
      d.id === id ? { ...d, achieved: !d.achieved } : d
    );
    setDreams(nextDreams);
    saveDreams(nextDreams);
  };

  const handleDeleteDream = (id: string) => {
    const nextDreams = dreams.filter((d) => d.id !== id);
    setDreams(nextDreams);
    saveDreams(nextDreams);
    addToast('Target telah dihapus.', 'info');
  };

  // Import / Export backup
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importFullBackup(content);
      if (res.success) {
        setWords(getSavedWords());
        setDreams(getSavedDreams());
        setSettings(getSavedSettings());
        addToast(res.message, 'success');
      } else {
        addToast(res.message, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 md:pb-8">
      {/* Top Navigation */}
      <Navbar
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          setSettings((prev) => {
            const next = { ...prev, language: lang };
            saveSettings(next);
            return next;
          });
          setCurrentWord(null);
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dueCount={dueWords.length}
        onStartDueReview={() => handleStartReview('due')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Review Announcement Banner if due cards exist */}
        {dueWords.length > 0 && activeTab === 'search' && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold">
                  {dueWords.length} Kosakata Jatuh Tempo Hari Ini
                </h4>
                <p className="text-xs text-amber-100">
                  Ulangi kartu Anda sekarang agar ingatan tidak hilang menurut kurva memori Ebbinghaus.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartReview('due')}
              className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 whitespace-nowrap"
            >
              Mulai Review
            </button>
          </div>
        )}

        {/* Tab 1: Search & Analysis */}
        {activeTab === 'search' && (
          <SearchAnalysis
            language={language}
            onSearch={handleSearch}
            onRandom={handleRandom}
            currentWord={currentWord}
            isLoading={isLoading}
            recentSearches={recentSearches}
            isSaved={isCurrentWordSaved}
            onToggleSave={handleToggleSave}
            onSelectWord={handleSearch}
            onPracticeWriting={(char) => {
              setSelectedWritingChar(char);
              setActiveTab('writing');
            }}
          />
        )}

        {/* Tab 2: Mandarin Writing Lab & Beginner Lessons */}
        {activeTab === 'writing' && (
          <MandarinWritingLab
            savedCards={words.filter((w) => w.language === 'mandarin')}
            selectedInitialChar={selectedWritingChar}
            onToast={addToast}
            apiKey={settings.apiKey}
            model={settings.model}
          />
        )}

        {/* Tab 3: Flashcards (SRS) */}
        {activeTab === 'flashcards' && (
          <FlashcardsView
            words={words}
            onStartReview={handleStartReview}
            onSelectWord={(word) => {
              setCurrentWord(word);
              setActiveTab('search');
            }}
            onDeleteWord={handleDeleteWord}
            onExport={exportFullBackup}
            onImport={handleImport}
          />
        )}

        {/* Tab 3: AI Quiz Practice */}
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center max-w-2xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Brain className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Latihan TOEFL Akademik Berbasis AI
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Gemini AI akan membuatkan kalimat rumpang (fill-in-the-blank) baru secara dinamis untuk menguji Word Family dan tata bahasa dari kosakata flashcard Anda.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-xs inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mulai Kuis Soal Baru</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-400">
                <span>✓ Sesuai Konteks Soal TOEFL</span>
                <span>✓ Evaluasi Grammar Otomatis</span>
                <span>✓ Integrasi Jadwal SM-2</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Target & Cita-cita (Dreams) */}
        {activeTab === 'dreams' && (
          <DreamsView
            dreams={dreams}
            onAddDream={handleAddDream}
            onToggleDream={handleToggleDream}
            onDeleteDream={handleDeleteDream}
          />
        )}

        {/* Tab 5: Settings (from bottom nav) */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Pengaturan Aplikasi</h3>
              <p className="text-xs text-slate-500 mb-4">
                Klik tombol di bawah untuk membuka panel konfigurasi API Key, pilihan model, dan panduan Google AI Studio.
              </p>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs"
              >
                Buka Pengaturan API & Cadangan
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dueCount={dueWords.length}
      />

      {/* 3D Flashcard Modal */}
      {isReviewOpen && (
        <FlashcardModal
          queue={reviewQueue}
          currentIndex={reviewIndex}
          onRate={handleRateCard}
          onClose={() => setIsReviewOpen(false)}
        />
      )}

      {/* AI Quiz Modal */}
      {isQuizOpen && (
        <QuizModal
          questions={quizQuestions}
          onFinish={handleFinishQuiz}
          onClose={() => setIsQuizOpen(false)}
          isLoading={isQuizLoading}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
            addToast('Pengaturan berhasil disimpan!', 'success');
          }}
          onClose={() => setIsSettingsOpen(false)}
          hasServerKey={hasServerKey}
          onExport={exportFullBackup}
          onImport={handleImport}
        />
      )}

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
