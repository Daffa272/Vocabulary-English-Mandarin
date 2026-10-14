import React, { useState, useEffect } from 'react';
import { X, Volume2, Mic, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { WordData } from '../types';
import { speakText, isSpeechRecognitionSupported, calculatePronunciationScore } from '../services/speech';

interface FlashcardModalProps {
  queue: WordData[];
  currentIndex: number;
  onRate: (quality: number) => void;
  onClose: () => void;
}

export const FlashcardModal: React.FC<FlashcardModalProps> = ({
  queue,
  currentIndex,
  onRate,
  onClose
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const card = queue[currentIndex];

  // Mini exercise states
  const [synSelected, setSynSelected] = useState<string | null>(null);
  const [antSelected, setAntSelected] = useState<string | null>(null);

  // Card pronunciation test state
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micResult, setMicResult] = useState<string | null>(null);

  useEffect(() => {
    setIsFlipped(false);
    setSynSelected(null);
    setAntSelected(null);
    setIsMicTesting(false);
    setMicResult(null);
  }, [currentIndex, card]);

  if (!card) return null;

  const example = card.tenses?.present || card.tenses?.past || card.tenses?.present_perfect || {
    example_en: '',
    example_id: ''
  };

  // Prepare synonym options
  const correctSyn = card.synonyms?.[0] || '';
  const distractorSyn = card.antonyms?.[0] || 'different';
  const synOptions = [correctSyn, distractorSyn, card.word]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .sort();

  // Prepare antonym options
  const correctAnt = card.antonyms?.[0] || '';
  const distractorAnt = card.synonyms?.[0] || 'similar';
  const antOptions = [correctAnt, distractorAnt, card.word]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .sort();

  const handleTestMic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSpeechRecognitionSupported()) {
      setMicResult('Browser tidak mendukung Speech Recognition.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = card.language === 'mandarin' ? 'zh-CN' : 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsMicTesting(true);
      setMicResult('Mendengarkan...');
    };

    recognition.onresult = (event: any) => {
      const spoken = event.results[0][0].transcript;
      const evalScore = calculatePronunciationScore(card.word, spoken);
      setMicResult(
        evalScore.score >= 70
          ? `✓ Benar (${evalScore.score}%) - "${spoken}"`
          : `✗ Kurang pas (${evalScore.score}%) - "${spoken}"`
      );
    };

    recognition.onerror = () => {
      setIsMicTesting(false);
      setMicResult('Suara tidak terdengar.');
    };

    recognition.onend = () => {
      setIsMicTesting(false);
    };

    recognition.start();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Sesi Flashcard Spaced Repetition
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Kartu {currentIndex + 1} dari {queue.length}</span>
              <span>·</span>
              <span className="font-semibold text-indigo-600">
                {card.repetition ? `Review ke-${card.repetition}` : 'Kartu Baru'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Flip Card Container */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="perspective-1000 my-6 cursor-pointer select-none"
        >
          <div
            className={`w-full min-h-[340px] rounded-2xl border transition-transform duration-500 transform-style-3d ${
              isFlipped ? 'rotate-y-180 border-emerald-300 bg-white' : 'border-indigo-200 bg-linear-to-br from-indigo-50/70 via-white to-indigo-50/40'
            } shadow-md relative`}
          >
            {/* FRONT FACE */}
            <div
              className={`absolute inset-0 p-8 flex flex-col items-center justify-center text-center backface-hidden ${
                isFlipped ? 'pointer-events-none' : ''
              }`}
            >
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">
                {card.language === 'mandarin' ? 'Hanzi & Pinyin' : 'Academic Vocabulary'}
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-2">
                {card.word}
              </h2>
              {card.phonetic && (
                <span className="font-mono text-base text-slate-500 font-semibold mb-6">
                  {card.phonetic}
                </span>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-white/80 border border-indigo-100 px-3 py-1.5 rounded-full shadow-2xs">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Ketuk kartu untuk melihat arti & latihan</span>
              </div>
            </div>

            {/* BACK FACE */}
            <div
              className={`absolute inset-0 p-6 flex flex-col justify-between overflow-y-auto backface-hidden rotate-y-180 ${
                !isFlipped ? 'pointer-events-none' : ''
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">
                      {card.word}
                    </h3>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">
                      {card.translation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(card.word, card.language);
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                    title="Dengarkan pengucapan"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>

                {/* Example sentence */}
                {example.example_en && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                    <span className="font-bold text-slate-400 block mb-1">
                      Contoh Kalimat:
                    </span>
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(example.example_en, card.language);
                      }}
                      className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600"
                    >
                      &ldquo;{example.example_en}&rdquo;
                    </p>
                    {example.example_id && (
                      <p className="text-slate-500 mt-1 italic">
                        {example.example_id}
                      </p>
                    )}
                  </div>
                )}

                {/* Mini synonym check */}
                {correctSyn && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/60"
                  >
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Tebak Sinonim Terdekat:
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {synOptions.map((opt) => {
                        const isChosen = synSelected === opt;
                        const isRight = opt === correctSyn;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSynSelected(opt)}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                              isChosen
                                ? isRight
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold'
                                  : 'bg-rose-100 text-rose-800 border-rose-400 font-bold'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Pronunciation Mic in Card */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs"
                >
                  <span className="font-bold text-slate-600">
                    Tes Pengucapan:
                  </span>
                  <div className="flex items-center gap-2">
                    {micResult && (
                      <span className="text-[11px] font-bold text-indigo-700">
                        {micResult}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleTestMic}
                      className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 ${
                        isMicTesting
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isMicTesting ? 'Merekam' : 'Ucapkan'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 text-center">
                Pilih tingkat ingatan Anda di bawah untuk menjadwalkan review berikutnya
              </div>
            </div>
          </div>
        </div>

        {/* SM-2 Quality Rating Buttons */}
        {isFlipped ? (
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onRate(1)}
              className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-center transition-colors group"
            >
              <span className="block text-xs font-bold text-rose-800">Lupa</span>
              <span className="text-[10px] text-rose-600 block mt-0.5">Hari ini</span>
            </button>
            <button
              type="button"
              onClick={() => onRate(3)}
              className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-center transition-colors group"
            >
              <span className="block text-xs font-bold text-amber-800">Sulit</span>
              <span className="text-[10px] text-amber-600 block mt-0.5">Besok</span>
            </button>
            <button
              type="button"
              onClick={() => onRate(4)}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-center transition-colors group"
            >
              <span className="block text-xs font-bold text-emerald-800">Ingat</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Terjadwal</span>
            </button>
            <button
              type="button"
              onClick={() => onRate(5)}
              className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-center transition-colors group"
            >
              <span className="block text-xs font-bold text-indigo-800">Mudah</span>
              <span className="text-[10px] text-indigo-600 block mt-0.5">Lebih lama</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-xs"
            >
              Tampilkan Jawaban & Evaluasi
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
