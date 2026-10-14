import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Sparkles, Brain, ArrowRight, Award } from 'lucide-react';
import { QuizQuestion } from '../types';

interface QuizModalProps {
  questions: QuizQuestion[];
  onFinish: (results: { word: string; isCorrect: boolean }[]) => void;
  onClose: () => void;
  isLoading: boolean;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  questions,
  onFinish,
  onClose,
  isLoading
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [history, setHistory] = useState<{ word: string; isCorrect: boolean }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (option: string) => {
    if (selectedOption !== null || !currentQ) return;

    setSelectedOption(option);
    setShowExplanation(true);

    const isCorrect =
      option.startsWith(currentQ.answer) ||
      option.includes(`${currentQ.answer}.`) ||
      option.includes(`${currentQ.answer} `);

    setHistory((prev) => [...prev, { word: currentQ.word, isCorrect }]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setIsCompleted(true);
      onFinish(history);
    }
  };

  const correctAnswers = history.filter((h) => h.isCorrect).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Latihan TOEFL AI (Fill-in-the-Blank)
              </h3>
              {!isLoading && !isCompleted && questions.length > 0 && (
                <p className="text-xs text-slate-500">
                  Soal {currentIndex + 1} dari {questions.length} · Fokus Word Family & Konteks
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Tutup kuis"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-16 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 animate-pulse">
              <Sparkles className="w-7 h-7 animate-spin" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              AI Sedang Meracik Soal Akademik...
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Membuat latihan tata bahasa TOEFL yang disesuaikan dengan kosakata flashcard Anda.
            </p>
          </div>
        )}

        {/* Question View */}
        {!isLoading && !isCompleted && currentQ && (
          <div className="py-6 space-y-6">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                Target Kosakata: {currentQ.word}
              </span>
              <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                {currentQ.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect =
                  option.startsWith(currentQ.answer) ||
                  option.includes(`${currentQ.answer}.`) ||
                  option.includes(`${currentQ.answer} `);

                let btnStyle = 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50';

                if (selectedOption !== null) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-50 border-rose-500 text-rose-900 font-bold';
                  } else {
                    btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={selectedOption !== null}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {selectedOption !== null && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    {selectedOption !== null && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box */}
            {showExplanation && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Penjelasan Grammar:</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {currentQ.explanation}
                </p>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full mt-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>
                    {currentIndex + 1 < questions.length ? 'Soal Berikutnya' : 'Lihat Hasil Latihan'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Completion View */}
        {!isLoading && isCompleted && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Latihan TOEFL Selesai!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Jadwal Spaced Repetition kosakata Anda telah diperbarui secara otomatis sesuai akurasi jawaban.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block w-full max-w-xs">
              <span className="text-xs font-semibold text-slate-500 block">
                Skor Latihan:
              </span>
              <span className="text-3xl font-black text-indigo-600 tabular-nums">
                {correctAnswers} / {questions.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs"
            >
              Tutup & Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
