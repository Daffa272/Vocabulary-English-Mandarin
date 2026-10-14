import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Volume2,
  Bookmark,
  BookmarkCheck,
  Mic,
  MicOff,
  Dices,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Layers,
  GitBranch,
  Split,
  PenTool
} from 'lucide-react';
import { WordData, Language } from '../types';
import { speakText, isSpeechRecognitionSupported, calculatePronunciationScore } from '../services/speech';

interface SearchAnalysisProps {
  language: Language;
  onSearch: (word: string) => Promise<void>;
  onRandom: () => Promise<void>;
  currentWord: WordData | null;
  isLoading: boolean;
  recentSearches: string[];
  isSaved: boolean;
  onToggleSave: () => void;
  onSelectWord: (word: string) => void;
  onPracticeWriting?: (character: string) => void;
}

export const SearchAnalysis: React.FC<SearchAnalysisProps> = ({
  language,
  onSearch,
  onRandom,
  currentWord,
  isLoading,
  recentSearches,
  isSaved,
  onToggleSave,
  onSelectWord,
  onPracticeWriting
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // Pronunciation test state for main word
  const [isRecording, setIsRecording] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<{
    score: number;
    transcript: string;
    feedback: string;
  } | null>(null);

  // Paragraph pronunciation test state
  const [isParagraphTesting, setIsParagraphTesting] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [paragraphWordScores, setParagraphWordScores] = useState<Record<number, boolean>>({});
  const [paragraphStatus, setParagraphStatus] = useState<string>('');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (currentWord) {
      setInputValue(currentWord.word);
      setPronunciationResult(null);
      setParagraphWordScores({});
      setIsParagraphTesting(false);
      setActiveWordIndex(null);
      setParagraphStatus('Klik kata untuk mendengarkan, atau mulai latihan suara.');
    }
  }, [currentWord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    onSearch(inputValue.trim());
  };

  // Main word pronunciation test
  const togglePronunciationTest = () => {
    if (!currentWord) return;

    if (!isSpeechRecognitionSupported()) {
      setPronunciationResult({
        score: 0,
        transcript: '',
        feedback: 'Browser ini belum mendukung Speech Recognition. Disarankan menggunakan Google Chrome atau Microsoft Edge.'
      });
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'mandarin' ? 'zh-CN' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setPronunciationResult({
        score: 0,
        transcript: '',
        feedback: 'Mendengarkan... Ucapkan kata dengan jelas sekarang!'
      });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const evaluation = calculatePronunciationScore(currentWord.word, transcript);
      setPronunciationResult({
        score: evaluation.score,
        transcript,
        feedback: evaluation.feedback
      });
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      const isNotAllowed = event.error === 'not-allowed';
      setPronunciationResult({
        score: 0,
        transcript: '',
        feedback: isNotAllowed
          ? 'Izin mikrofon tidak diberikan. Berikan izin mikrofon pada browser Anda.'
          : 'Gagal mendeteksi suara. Silakan coba kembali.'
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Paragraph sentence breakdown
  const sampleSentence = currentWord?.tenses?.present?.example_en || currentWord?.word || '';
  const sentenceWords = sampleSentence.match(/[\w\u4e00-\u9fa5]+(?:['’][\w]+)?/g) || [];

  const handleTestParagraphWord = (word: string, index: number) => {
    speakText(word, language);
    setActiveWordIndex(index);

    if (!isSpeechRecognitionSupported() || !isParagraphTesting) {
      setParagraphStatus(`Mendengarkan contoh: "${word}"`);
      return;
    }

    setParagraphStatus(`Dengarkan lalu ucapkan: "${word}"...`);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'mandarin' ? 'zh-CN' : 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const spoken = event.results[0][0].transcript;
      const evalScore = calculatePronunciationScore(word, spoken);
      const isCorrect = evalScore.score >= 70;
      setParagraphWordScores(prev => ({ ...prev, [index]: isCorrect }));
      setParagraphStatus(
        isCorrect
          ? `✓ Benar! Kata "${word}" terdengar jelas.`
          : `✗ Belum pas ("${spoken}"). Coba dengarkan lagi kata "${word}".`
      );
    };

    recognition.start();
  };

  const startParagraphSession = () => {
    setIsParagraphTesting(true);
    setParagraphWordScores({});
    setParagraphStatus('Sesi aktif! Ketuk kata pertama untuk mulai menguji pengucapan Anda.');
  };

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            {language === 'mandarin'
              ? 'Masukkan Hanzi, Pinyin, atau kata Mandarin:'
              : 'Kata, frasa, phrasal verb, atau klausa akademik:'}
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  language === 'mandarin'
                    ? 'Contoh: 坚持, 潜移默化, atau 影响'
                    : 'Contoh: unprecedented, narrow down, atau empirical'
                }
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-base"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px]"
              >
                <Search className="w-4 h-4" />
                <span>Analisis</span>
              </button>

              <button
                type="button"
                onClick={onRandom}
                disabled={isLoading}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px]"
                title="Pilih kata acak tingkat lanjut"
              >
                <Dices className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Acak</span>
              </button>
            </div>
          </div>
        </form>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-400 shrink-0">Terakhir:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentSearches.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => onSelectWord(word)}
                  className="text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1 rounded-md transition-colors"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 animate-pulse">
            <Sparkles className="w-7 h-7 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Menganalisis dengan Gemini AI...
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Membedah struktur morfologi, sandingan kata akademik, pengucapan fonetik, dan contoh kalimat TOEFL.
          </p>
        </div>
      )}

      {/* Word Result Content */}
      {!isLoading && currentWord && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Word Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                    {currentWord.word}
                  </h1>
                  {currentWord.traditional && (
                    <span className="text-xl font-bold text-slate-400">
                      ({currentWord.traditional})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => speakText(currentWord.word, language)}
                    className="w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-transform hover:scale-105"
                    title="Dengarkan pengucapan kata"
                    aria-label="Dengarkan pengucapan"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {currentWord.phonetic && (
                    <span className="font-mono text-sm font-semibold text-indigo-700 bg-indigo-50/80 px-2.5 py-0.5 rounded-md">
                      {currentWord.phonetic}
                    </span>
                  )}
                  {currentWord.partOfSpeech && (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {currentWord.partOfSpeech}
                    </span>
                  )}
                  {currentWord.hskLevel && (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {currentWord.hskLevel}
                    </span>
                  )}
                </div>

                <p className="text-lg sm:text-xl font-semibold text-slate-700 mt-3">
                  {currentWord.translation}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {language === 'mandarin' && onPracticeWriting && (
                  <button
                    type="button"
                    onClick={() => {
                      const char = Array.from(currentWord.word).find((c) => /[\u3400-\u9fff]/.test(c)) || currentWord.word[0];
                      onPracticeWriting(char);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-all min-h-[44px] shadow-2xs"
                  >
                    <PenTool className="w-4 h-4 text-emerald-600" />
                    <span>Latih Tulis Hanzi</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleSave}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs min-h-[44px] ${
                    isSaved
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Simpan ke Flashcard</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Pronunciation Mic Tester */}
            <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-indigo-600" />
                    Tes Pengucapan (Pronunciation Test)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dengarkan pelafalan penutur asli, lalu tekan mic dan ucapkan kata target.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => speakText(currentWord.word, language)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors min-h-[40px]"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                    Dengarkan
                  </button>

                  <button
                    type="button"
                    onClick={togglePronunciationTest}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all min-h-[40px] ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop Rekam</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Mulai Tes Suara</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {pronunciationResult && (
                <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Skor Akurasi:</span>
                    <span
                      className={`text-lg font-extrabold ${
                        pronunciationResult.score >= 70
                          ? 'text-emerald-600'
                          : pronunciationResult.score > 0
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {pronunciationResult.score}%
                    </span>
                  </div>
                  {pronunciationResult.transcript && (
                    <p className="text-xs text-slate-600 mb-1">
                      <span className="font-semibold text-slate-800">Transkripsi terdeteksi: </span>
                      &ldquo;{pronunciationResult.transcript}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-slate-500">{pronunciationResult.feedback}</p>
                </div>
              )}
            </div>
          </div>

          {/* Paragraph Pronunciation Interactive Exercise */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
                  Latihan Pengucapan Kalimat Kontekstual
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ketuk setiap kata untuk mendengar suaranya, atau klik &ldquo;Mulai Latihan Suara&rdquo;.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakText(sampleSentence, language)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  Dengar Kalimat
                </button>
                <button
                  type="button"
                  onClick={startParagraphSession}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    isParagraphTesting
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isParagraphTesting ? 'Sesi Aktif' : 'Mulai Latihan Suara'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Sentence Tokens */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 leading-relaxed text-base sm:text-lg">
              {sentenceWords.map((word, idx) => {
                const isPassed = paragraphWordScores[idx];
                const isActive = activeWordIndex === idx;
                return (
                  <button
                    key={`${word}-${idx}`}
                    type="button"
                    onClick={() => handleTestParagraphWord(word, idx)}
                    className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-md font-medium transition-all ${
                      isPassed
                        ? 'bg-emerald-100 text-emerald-800 border-b-2 border-emerald-500 font-semibold'
                        : isActive
                        ? 'bg-indigo-100 text-indigo-800 border-b-2 border-indigo-600'
                        : 'text-slate-800 hover:bg-slate-200 border-b-2 border-transparent'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {paragraphStatus && (
              <p className="text-xs font-medium text-slate-500">{paragraphStatus}</p>
            )}
          </div>

          {/* Bento Grid: Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Synonyms & Antonyms */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Split className="w-4 h-4 text-indigo-600" />
                Sinonim & Antonim
              </h3>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Sinonim (Padanan Makna):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentWord.synonyms && currentWord.synonyms.length > 0 ? (
                    currentWord.synonyms.map((syn) => (
                      <button
                        key={syn}
                        type="button"
                        onClick={() => speakText(syn, language)}
                        className="text-xs font-medium text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        title="Klik untuk mendengarkan"
                      >
                        <span>{syn}</span>
                        <Volume2 className="w-3 h-3 opacity-60" />
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Antonim (Lawan Makna):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentWord.antonyms && currentWord.antonyms.length > 0 ? (
                    currentWord.antonyms.map((ant) => (
                      <button
                        key={ant}
                        type="button"
                        onClick={() => speakText(ant, language)}
                        className="text-xs font-medium text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        title="Klik untuk mendengarkan"
                      >
                        <span>{ant}</span>
                        <Volume2 className="w-3 h-3 opacity-60" />
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </div>
              </div>
            </div>

            {/* Word Family */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                Word Family (Keluarga Kata)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['noun', 'verb', 'adjective', 'adverb'] as const).map((pos) => {
                  const val = currentWord.word_family?.[pos];
                  return (
                    <div
                      key={pos}
                      className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between"
                    >
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {pos}
                      </span>
                      <span
                        onClick={() => val && val !== '-' && speakText(val, language)}
                        className={`font-semibold mt-1 truncate ${
                          val && val !== '-'
                            ? 'text-slate-800 cursor-pointer hover:text-indigo-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {val || '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Common Collocations */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Common Collocations (Sandingan Kata)
              </h3>
              <div className="space-y-1.5">
                {currentWord.collocations && currentWord.collocations.length > 0 ? (
                  currentWord.collocations.map((col, idx) => (
                    <div
                      key={idx}
                      onClick={() => speakText(col, language)}
                      className="p-2 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100/80 rounded-lg text-xs font-semibold text-emerald-900 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span>{col}</span>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </div>
            </div>

            {/* Morphology & Root Analysis */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Morfologi & Akar Kata
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    {language === 'mandarin' ? 'Radikal (部首)' : 'Awalan (Prefix)'}:
                  </span>
                  <p className="text-slate-700 mt-0.5 font-medium">
                    {currentWord.morphology?.prefix || '-'}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    {language === 'mandarin' ? 'Struktur Karakter' : 'Akar Kata (Root)'}:
                  </span>
                  <p className="text-slate-700 mt-0.5 font-medium">
                    {currentWord.morphology?.root || '-'}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    {language === 'mandarin' ? 'Pola Gabungan' : 'Akhiran (Suffix)'}:
                  </span>
                  <p className="text-slate-700 mt-0.5 font-medium">
                    {currentWord.morphology?.suffix || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Context Sentences / Tenses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              {language === 'mandarin'
                ? 'Contoh Penggunaan Kontekstual & HSK'
                : 'Penggunaan dalam Kalimat Akademik TOEFL (3 Tenses)'}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(['present', 'past', 'present_perfect'] as const).map((tenseKey) => {
                const item = currentWord.tenses?.[tenseKey];
                if (!item) return null;

                const tenseTitles = {
                  present: language === 'mandarin' ? 'Contoh 1' : 'Present Tense',
                  past: language === 'mandarin' ? 'Contoh 2' : 'Past Tense',
                  present_perfect: language === 'mandarin' ? 'Contoh 3' : 'Present Perfect'
                };

                return (
                  <div
                    key={tenseKey}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800">
                          {tenseTitles[tenseKey]}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                          {item.form}
                        </span>
                      </div>
                      <p
                        onClick={() => speakText(item.example_en, language)}
                        className="text-xs sm:text-sm font-semibold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors leading-relaxed"
                        title="Klik untuk mendengarkan"
                      >
                        &ldquo;{item.example_en}&rdquo;
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-500 italic leading-relaxed">
                        {item.example_id}
                      </p>
                      <button
                        type="button"
                        onClick={() => speakText(item.example_en, language)}
                        className="p-1 text-slate-400 hover:text-indigo-600 shrink-0"
                        title="Putar suara"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no word analyzed yet */}
      {!isLoading && !currentWord && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 sm:p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Siap menganalisis kosakata {language === 'mandarin' ? 'Mandarin' : 'Bahasa Inggris'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
            Ketik kata di kolom pencarian atau klik tombol &ldquo;Acak&rdquo; untuk mempelajari kosakata baru hari ini.
          </p>
          <button
            type="button"
            onClick={onRandom}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs"
          >
            <Dices className="w-4 h-4" />
            <span>Mulai dengan Kosakata Acak</span>
          </button>
        </div>
      )}
    </div>
  );
};
