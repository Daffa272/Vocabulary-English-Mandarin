import React from 'react';
import { GraduationCap, BookOpen, Settings, Flame, PenTool, ExternalLink } from 'lucide-react';
import { Language, ActiveTab } from '../types';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  dueCount: number;
  onStartDueReview: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  activeTab,
  onTabChange,
  dueCount,
  onStartDueReview,
  onOpenSettings
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                VocabMaster AI
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded px-1.5 py-0.5">
                TOEFL & HSK
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Spaced Repetition & Analisis Bahasa
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-600">
          <button
            onClick={() => onTabChange('search')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            Analisis Kata
          </button>

          <button
            onClick={() => onTabChange('writing')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'writing'
                ? 'bg-slate-100 text-emerald-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tulis Hanzi & Dasar</span>
          </button>

          <button
            onClick={() => onTabChange('flashcards')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'flashcards'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            Flashcards
            {dueCount > 0 && (
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                {dueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('quiz')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            AI Kuis
          </button>

          <button
            onClick={() => onTabChange('dreams')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'dreams'
                ? 'bg-slate-100 text-slate-950 font-semibold'
                : 'hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            Target Belajar
          </button>
        </nav>

        {/* Zone 3: Actions, Tracker Lamaran & Language Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Tracker Lamaran External Link */}
          <a
            href="https://tracker-lamaran-2026.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 transition-all hover:-translate-y-0.5 shadow-2xs"
            title="Buka Tracker Lamaran"
          >
            <span>Tracker Lamaran</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => onLanguageChange('english')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                language === 'english'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bahasa Inggris / TOEFL"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('mandarin')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                language === 'mandarin'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bahasa Mandarin / HSK"
            >
              ZH
            </button>
          </div>

          {dueCount > 0 && (
            <button
              type="button"
              onClick={onStartDueReview}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Review ({dueCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Pengaturan API & Model"
            aria-label="Pengaturan"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
