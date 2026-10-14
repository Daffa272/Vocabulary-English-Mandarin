import React, { useState } from 'react';
import {
  BookOpen,
  Flame,
  Search,
  Trash2,
  Volume2,
  Download,
  Upload,
  Brain,
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { WordData, ReviewMode } from '../types';
import { speakText } from '../services/speech';

interface FlashcardsViewProps {
  words: WordData[];
  onStartReview: (mode: ReviewMode) => void;
  onSelectWord: (word: WordData) => void;
  onDeleteWord: (id: string, e: React.MouseEvent) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  words,
  onStartReview,
  onSelectWord,
  onDeleteWord,
  onExport,
  onImport
}) => {
  const [filterType, setFilterType] = useState<'all' | 'learning' | 'new' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate proficiency
  const getProficiency = (word: WordData): 'mastered' | 'learning' | 'new' => {
    if ((word.repetition || 0) >= 3 && (word.interval || 0) >= 14) return 'mastered';
    if ((word.repetition || 0) > 0) return 'learning';
    return 'new';
  };

  const total = words.length;
  const newCount = words.filter(w => getProficiency(w) === 'new').length;
  const learningCount = words.filter(w => getProficiency(w) === 'learning').length;
  const masteredCount = words.filter(w => getProficiency(w) === 'mastered').length;

  const now = new Date();
  const dueWords = words.filter(w => !w.nextReviewDate || new Date(w.nextReviewDate) <= now);
  const dueLearningWords = words.filter(w => getProficiency(w) === 'learning' && (!w.nextReviewDate || new Date(w.nextReviewDate) <= now));
  const dueNewWords = words.filter(w => (w.repetition || 0) === 1 && (!w.nextReviewDate || new Date(w.nextReviewDate) <= now));

  // Conic gradient segments for donut chart
  const pNew = total ? (newCount / total) * 100 : 0;
  const pLearning = total ? (learningCount / total) * 100 : 0;
  const pMastered = total ? (masteredCount / total) * 100 : 0;

  const donutStyle = total > 0
    ? {
        background: `conic-gradient(
          #cbd5e1 0% ${pNew}%,
          #f59e0b ${pNew}% ${pNew + pLearning}%,
          #10b981 ${pNew + pLearning}% 100%
        )`
      }
    : { background: '#e2e8f0' };

  // Filtered words
  const filteredWords = words.filter(w => {
    const prof = getProficiency(w);
    if (filterType === 'learning' && prof !== 'learning') return false;
    if (filterType === 'new' && (w.repetition || 0) !== 1 && prof !== 'new') return false;
    if (filterType === 'mastered' && prof !== 'mastered') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.word.toLowerCase().includes(q) ||
        w.translation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Reviews */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Spaced Repetition System (SRS)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Algoritma memori SM-2 yang menjadwalkan review kata tepat sebelum memori otak Anda memudar.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <button
              type="button"
              onClick={() => onStartReview('due')}
              disabled={dueWords.length === 0}
              className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs min-h-[42px]"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Review Jatuh Tempo ({dueWords.length})</span>
            </button>
          </div>
        </div>

        {/* Proficiency Donut & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
          {/* Donut Chart */}
          <div className="md:col-span-4 flex items-center justify-center gap-6">
            <div
              className="w-28 h-28 rounded-full relative flex items-center justify-center shadow-xs shrink-0"
              style={donutStyle}
            >
              <div className="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-xl font-black text-slate-900 tabular-nums">
                  {total}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Kosakata
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                <span className="text-slate-600">Baru:</span>
                <span className="font-bold text-slate-900 tabular-nums">{newCount} ({Math.round(pNew)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-600">Sedang Dipelajari:</span>
                <span className="font-bold text-slate-900 tabular-nums">{learningCount} ({Math.round(pLearning)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600">Dikuasai:</span>
                <span className="font-bold text-slate-900 tabular-nums">{masteredCount} ({Math.round(pMastered)}%)</span>
              </div>
            </div>
          </div>

          {/* Quick Review Mode Buttons */}
          <div className="md:col-span-8 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onStartReview('learning')}
              disabled={learningCount === 0}
              className="flex-1 p-3.5 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/60 rounded-xl text-left transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-amber-600" />
                  Review Sedang Dipelajari
                </span>
                <span className="text-xs font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                  {dueLearningWords.length} due
                </span>
              </div>
              <p className="text-[11px] text-amber-800/80">
                Latih kata yang sudah mulai diingat agar semakin melekat di memori jangka panjang.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onStartReview('new-learning')}
              disabled={newCount === 0}
              className="flex-1 p-3.5 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/60 rounded-xl text-left transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Review Baru Masuk
                </span>
                <span className="text-xs font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-md">
                  {dueNewWords.length} due
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80">
                Ulangi kata yang baru disimpan hari ini untuk membentuk jejak ingatan awal.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Filter, Search & Backup Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({total})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('learning')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === 'learning'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sedang Dipelajari ({learningCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('new')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === 'new'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Baru ({newCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('mastered')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterType === 'mastered'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dikuasai ({masteredCount})
            </button>
          </div>

          {/* Backup & Restore Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              title="Download backup file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <label className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onImport}
              />
            </label>
          </div>
        </div>

        {/* Search within flashcards */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari dalam daftar flashcard tersimpan..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {filteredWords.length > 0 ? (
          filteredWords.slice().reverse().map((word) => {
            const isDue = !word.nextReviewDate || new Date(word.nextReviewDate) <= now;
            let dueLabel = 'Due Now!';
            if (!isDue && word.nextReviewDate) {
              const days = Math.ceil(
                (new Date(word.nextReviewDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              dueLabel = days <= 1 ? 'Besok' : `${days} hari lagi`;
            }

            return (
              <div
                key={word.id}
                onClick={() => onSelectWord(word)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {word.word}
                    </span>
                    {word.phonetic && (
                      <span className="font-mono text-xs text-slate-400">
                        {word.phonetic}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isDue
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dueLabel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 truncate">
                    {word.translation}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span>Review: {word.repetition || 0}x</span>
                    <span>·</span>
                    <span>Interval: {word.interval || 0} hari</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(word.word, word.language);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Dengarkan pengucapan"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => onDeleteWord(word.id, e)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus flashcard"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              Tidak ada kosakata yang cocok
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Simpan kata dari tab Analisis untuk menambahkan kosakata baru ke memori Spaced Repetition.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
