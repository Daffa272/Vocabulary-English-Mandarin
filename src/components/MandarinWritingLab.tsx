import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  Play,
  Eye,
  EyeOff,
  RotateCcw,
  RotateCw,
  Trash2,
  CheckCircle2,
  Volume2,
  Sparkles,
  BookOpen,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Award
} from 'lucide-react';
import HanziWriter from 'hanzi-writer';
import { Lesson, WordData } from '../types';
import {
  getLessons,
  saveCustomLesson,
  getLearnedLessons,
  toggleLearnedLesson
} from '../services/storage';
import { speakText } from '../services/speech';
import { generateMandarinLesson } from '../services/api';

interface MandarinWritingLabProps {
  savedCards: WordData[];
  selectedInitialChar?: string;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  apiKey?: string;
  model?: string;
}

export const MandarinWritingLab: React.FC<MandarinWritingLabProps> = ({
  savedCards,
  selectedInitialChar,
  onToast,
  apiKey,
  model
}) => {
  // Lessons state
  const [lessons, setLessons] = useState<Lesson[]>(() => getLessons());
  const [learnedLessonIds, setLearnedLessonIds] = useState<string[]>(() => getLearnedLessons());
  const [currentLessonId, setCurrentLessonId] = useState<string>('greetings');
  const [lessonTopicInput, setLessonTopicInput] = useState('');
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);

  // Lesson Quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  // Hanzi Writing state
  const [writingChar, setWritingChar] = useState<string>('你');
  const [penSize, setPenSize] = useState<number>(14);
  const [writingStatus, setWritingStatus] = useState<string>('Pilih karakter, lalu ikuti bayangan di kanvas.');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Stroke history for Undo/Redo
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [redoStack, setRedoStack] = useState<{ x: number; y: number }[][]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  // Refs
  const guideContainerRef = useRef<HTMLDivElement>(null);
  const writerInstanceRef = useRef<HanziWriter | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // All available unique Chinese characters for writing
  const availableCharacters = React.useMemo(() => {
    const set = new Set<string>();
    // Collect from lessons
    lessons.forEach((l) => {
      l.words.forEach((w) => {
        Array.from(w[0]).forEach((c) => {
          if (/[\u3400-\u9fff]/.test(c)) set.add(c);
        });
      });
      if (l.sentence) {
        Array.from(l.sentence[0]).forEach((c) => {
          if (/[\u3400-\u9fff]/.test(c)) set.add(c);
        });
      }
    });
    // Collect from saved cards
    savedCards.forEach((card) => {
      Array.from(card.word).forEach((c) => {
        if (/[\u3400-\u9fff]/.test(c)) set.add(c);
      });
    });
    return Array.from(set);
  }, [lessons, savedCards]);

  // Set initial writing character if provided
  useEffect(() => {
    if (selectedInitialChar && /[\u3400-\u9fff]/.test(selectedInitialChar)) {
      setWritingChar(selectedInitialChar);
    }
  }, [selectedInitialChar]);

  // Initialize or update HanziWriter guide
  useEffect(() => {
    if (!guideContainerRef.current || !writingChar) return;

    guideContainerRef.current.innerHTML = '';
    try {
      const writer = HanziWriter.create(guideContainerRef.current, writingChar, {
        width: 260,
        height: 260,
        padding: 24,
        showOutline: false,
        strokeColor: '#059669', // Emerald
        highlightColor: '#f59e0b', // Amber
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 350
      });

      writerInstanceRef.current = writer;
      writer.showCharacter({ animationDuration: 300 });
      setWritingStatus(`Urutan coretan untuk karakter "${writingChar}" siap.`);
    } catch (err) {
      console.warn('HanziWriter error:', err);
    }
  }, [writingChar]);

  // Animate strokes guide
  const handleAnimateGuide = () => {
    if (!writerInstanceRef.current) return;
    writerInstanceRef.current.hideCharacter({ animationDuration: 100 });
    writerInstanceRef.current.animateCharacter({
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 350,
      onComplete: () => {
        setWritingStatus(`Urutan selesai! Sekarang tirukan coretan di kanvas latihan.`);
      }
    });
    setWritingStatus(`Memperagakan urutan coretan "${writingChar}"...`);
  };

  const handleShowAllGuide = () => {
    if (!writerInstanceRef.current) return;
    writerInstanceRef.current.showCharacter({ animationDuration: 300 });
    setWritingStatus(`Karakter lengkap ditampilkan.`);
  };

  const handleHideGuide = () => {
    if (!writerInstanceRef.current) return;
    writerInstanceRef.current.hideCharacter({ animationDuration: 200 });
    setWritingStatus(`Bantuan disembunyikan. Uji ingatan coretan Anda!`);
  };

  // Canvas Drawing
  const redrawCanvas = (allStrokes: { x: number; y: number }[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#047857';
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    allStrokes.forEach((stroke) => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      if (stroke.length === 1) {
        ctx.arc(stroke[0].x, stroke[0].y, penSize / 2, 0, Math.PI * 2);
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    redrawCanvas(strokes);
  }, [strokes, penSize]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    isDrawingRef.current = true;
    const point = getCanvasPoint(e);
    currentStrokeRef.current = [point];
    const newStrokes = [...strokes, currentStrokeRef.current];
    setStrokes(newStrokes);
    setRedoStack([]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    currentStrokeRef.current.push(point);
    redrawCanvas(strokes);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    const popped = strokes[strokes.length - 1];
    setStrokes(nextStrokes);
    setRedoStack((prev) => [...prev, popped]);
    setWritingStatus('1 coretan dibatalkan.');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextRedo = redoStack.slice(0, -1);
    const popped = redoStack[redoStack.length - 1];
    setRedoStack(nextRedo);
    setStrokes((prev) => [...prev, popped]);
    setWritingStatus('Coretan dikembalikan.');
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    setWritingStatus('Kanvas telah dibersihkan.');
  };

  const handleCheckWriting = () => {
    const totalPoints = strokes.reduce((acc, s) => acc + s.length, 0);
    if (totalPoints < 12) {
      setWritingStatus('Coretan belum cukup. Tulis mengikuti bayangan Hanzi terlebih dahulu.');
      return;
    }
    setWritingStatus(`✓ Bentuk karakter "${writingChar}" sudah tergores bagus! Periksa urutan dengan animasi.`);
    onToast(`Latihan menulis "${writingChar}" selesai!`, 'success');
  };

  // Lessons handling
  const activeLesson = lessons.find((l) => l.id === currentLessonId) || lessons[0];
  const activeLessonIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const isCurrentLessonLearned = learnedLessonIds.includes(activeLesson?.id);

  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLessonId(lesson.id);
    setSelectedQuizOption(null);
    setQuizFeedback(null);

    // Auto set writing character to first Hanzi of lesson
    const firstChar = Array.from(lesson.words[0]?.[0] || '').find((c) => /[\u3400-\u9fff]/.test(c));
    if (firstChar) {
      setWritingChar(firstChar);
      setStrokes([]);
      setRedoStack([]);
    }
  };

  const handleGenerateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTopicInput.trim() || isGeneratingLesson) return;

    setIsGeneratingLesson(true);
    try {
      const generated = await generateMandarinLesson(lessonTopicInput.trim(), model, apiKey);
      const newLesson: Lesson = {
        ...generated,
        id: `ai-lesson-${Date.now()}`,
        custom: true
      };

      const updated = saveCustomLesson(newLesson);
      setLessons(updated);
      setCurrentLessonId(newLesson.id);
      setLessonTopicInput('');
      onToast(`Pelajaran baru "${newLesson.title}" berhasil dibuat!`, 'success');

      // Set writing char
      const firstChar = Array.from(newLesson.words[0]?.[0] || '').find((c) => /[\u3400-\u9fff]/.test(c));
      if (firstChar) {
        setWritingChar(firstChar);
      }
    } catch (err: any) {
      onToast(err.message || 'Gagal membuat pelajaran AI.', 'error');
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const handleAnswerQuiz = (index: number) => {
    if (!activeLesson || selectedQuizOption !== null) return;
    setSelectedQuizOption(index);
    const chosen = activeLesson.options[index];
    const isCorrect = chosen === activeLesson.answer;

    if (isCorrect) {
      setQuizFeedback(`✓ Benar! Jawaban tepat adalah "${activeLesson.answer}".`);
      if (!isCurrentLessonLearned) {
        const nextLearned = toggleLearnedLesson(activeLesson.id);
        setLearnedLessonIds(nextLearned);
      }
    } else {
      setQuizFeedback(`✗ Belum tepat. Jawaban yang benar adalah "${activeLesson.answer}".`);
    }
  };

  const handleToggleCurrentLessonLearned = () => {
    if (!activeLesson) return;
    const nextLearned = toggleLearnedLesson(activeLesson.id);
    setLearnedLessonIds(nextLearned);
    onToast(
      nextLearned.includes(activeLesson.id)
        ? `Pelajaran "${activeLesson.title}" ditandai sudah hafal! 🎓`
        : `Status hafalan dibatalkan.`,
      'info'
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* SECTION 1: LATIHAN MENULIS HANZI (STROKE ORDER & CANVAS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PenTool className="w-5 h-5 text-emerald-600" />
              Latihan Menulis Hanzi & Animasi Urutan Coretan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pilih karakter Hanzi, pelajari urutan coretannya dengan animasi HanziWriter, lalu gambar di atas bayangan teks.
            </p>
          </div>

          {/* Character Picker Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-semibold text-slate-600">Pilih Karakter:</label>
            <select
              value={writingChar}
              onChange={(e) => {
                setWritingChar(e.target.value);
                setStrokes([]);
                setRedoStack([]);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {availableCharacters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => speakText(writingChar, 'mandarin')}
              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
              title="Dengarkan pelafalan karakter"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Writing Practice Grid (2 Columns on tablet/desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Stroke Order Animation Guide */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-emerald-600" />
                  Urutan Coretan (Stroke Order)
                </h3>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-600 px-1.5 tabular-nums">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* HanziWriter Animation Container */}
              <div className="w-full h-64 bg-white border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner">
                <div
                  ref={guideContainerRef}
                  style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease' }}
                  className="flex items-center justify-center"
                />
              </div>
            </div>

            {/* Guide Controls */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAnimateGuide}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Ulangi Animasi</span>
              </button>
              <button
                type="button"
                onClick={handleShowAllGuide}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Tampilkan</span>
              </button>
              <button
                type="button"
                onClick={handleHideGuide}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Sembunyikan</span>
              </button>
            </div>
          </div>

          {/* Card 2: Interactive Drawing Board */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  Kanvas Latihan Menulis
                </h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>Tebal:</span>
                  <input
                    type="range"
                    min="6"
                    max="28"
                    value={penSize}
                    onChange={(e) => setPenSize(Number(e.target.value))}
                    className="w-20 accent-emerald-600 cursor-pointer"
                  />
                  <span className="tabular-nums text-[11px] font-bold text-slate-700">{penSize}px</span>
                </div>
              </div>

              {/* Interactive Drawing Canvas with Text Shadow */}
              <div className="w-full h-64 bg-white border border-emerald-200/80 rounded-2xl relative overflow-hidden shadow-inner cursor-crosshair">
                {/* Traditional Rice Grid Background Lines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #059669 1px, transparent 1px), linear-gradient(to bottom, #059669 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                  }}
                />

                {/* Faint Text Shadow Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-emerald-600/15 font-black text-8xl sm:text-9xl font-sans">
                  {writingChar}
                </div>

                <canvas
                  ref={canvasRef}
                  width={560}
                  height={512}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="w-full h-full absolute inset-0 touch-none block"
                />
              </div>
            </div>

            {/* Canvas Actions */}
            <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-xl transition-colors"
                  title="Batalkan goresan (Undo)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-xl transition-colors"
                  title="Kembalikan goresan (Redo)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-2 bg-white border border-slate-200 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl transition-colors"
                  title="Bersihkan kanvas"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleCheckWriting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cek Latihan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Status */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 flex items-center justify-between">
          <span>{writingStatus}</span>
          <span className="text-[11px] text-slate-400">
            Total Coretan: {strokes.length}
          </span>
        </div>
      </div>

      {/* SECTION 2: SISTEM PEMBELAJARAN MANDARIN PEMULA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
              Kurikulum Dasar
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sistem Pembelajaran Mandarin Pemula
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pelajari Hanzi bertahap, dengarkan pelafalan penutur asli, dan uji penguasaan dengan kuis singkat.
            </p>
          </div>

          {/* Progress Tracker */}
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
            <Award className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-xs font-bold text-emerald-900 block">
                {learnedLessonIds.length} dari {lessons.length} Selesai
              </span>
              <div className="w-24 bg-emerald-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${lessons.length ? (learnedLessonIds.length / lessons.length) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Lesson Generator Form */}
        <form onSubmit={handleGenerateLesson} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
          <label className="block text-xs font-bold text-emerald-900 mb-2">
            ✨ Tambah Pelajaran Baru dengan Gemini AI
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={lessonTopicInput}
              onChange={(e) => setLessonTopicInput(e.target.value)}
              placeholder="Masukkan topik bahasa Inggris, contoh: coffee, food, weather, hospital"
              className="flex-1 px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={isGeneratingLesson || !lessonTopicInput.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingLesson ? 'Meracik Pelajaran...' : 'Generate Pelajaran'}</span>
            </button>
          </div>
        </form>

        {/* Lesson Layout: Left Tabs + Right Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Lessons List Tabs */}
          <div className="md:col-span-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
            {lessons.map((lesson, idx) => {
              const isLearned = learnedLessonIds.includes(lesson.id);
              const isActive = lesson.id === activeLesson?.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => handleSelectLesson(lesson)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 whitespace-nowrap md:whitespace-normal shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-xs truncate">
                    {idx + 1}. {lesson.title}
                  </span>
                  {isLearned && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      ✓ Hafal
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Lesson Content */}
          {activeLesson && (
            <div className="md:col-span-8 p-6 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Pelajaran {activeLessonIndex + 1} dari {lessons.length}
                    {activeLesson.custom ? ' · Dibuat AI' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleCurrentLessonLearned}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                      isCurrentLessonLearned
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isCurrentLessonLearned ? '✓ Sudah Hafal' : 'Tandai Sudah Hafal'}</span>
                  </button>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{activeLesson.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{activeLesson.goal}</p>
              </div>

              {/* Vocabulary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {activeLesson.words.map(([hanzi, pinyin, meaning], idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-2xl font-black text-emerald-800 font-sans tracking-tight">
                          {hanzi}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakText(hanzi, 'mandarin')}
                          className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Dengarkan pelafalan"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs font-bold text-amber-600 font-mono mt-0.5">
                        {pinyin}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 truncate">{meaning}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const char = Array.from(hanzi).find((c) => /[\u3400-\u9fff]/.test(c)) || hanzi[0];
                        setWritingChar(char);
                        setStrokes([]);
                        setRedoStack([]);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        onToast(`Karakter "${char}" disiapkan di kanvas menulis!`, 'info');
                      }}
                      className="mt-2 text-[10px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      <PenTool className="w-2.5 h-2.5" />
                      Latih Tulis
                    </button>
                  </div>
                ))}
              </div>

              {/* Contextual Sentence Example */}
              {activeLesson.sentence && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Contoh Pola Kalimat:
                  </span>
                  <div
                    onClick={() => speakText(activeLesson.sentence![0], 'mandarin')}
                    className="text-base sm:text-lg font-bold text-slate-900 cursor-pointer hover:text-emerald-700 flex items-center justify-between"
                  >
                    <span>{activeLesson.sentence[0]}</span>
                    <Volume2 className="w-4 h-4 text-amber-700 shrink-0" />
                  </div>
                  <div className="text-xs font-semibold text-amber-800 font-mono">
                    {activeLesson.sentence[1]}
                  </div>
                  <div className="text-xs text-slate-600 italic">
                    {activeLesson.sentence[2]}
                  </div>
                </div>
              )}

              {/* Mini Lesson Quiz */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Latihan Cepat: {activeLesson.question}
                </span>

                <div className="flex flex-wrap gap-2">
                  {activeLesson.options.map((option, oIdx) => {
                    const isSelected = selectedQuizOption === oIdx;
                    const isCorrect = option === activeLesson.answer;

                    let btnClass = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';
                    if (selectedQuizOption !== null) {
                      if (isCorrect) {
                        btnClass = 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnClass = 'bg-rose-100 text-rose-900 border-rose-400 font-bold';
                      } else {
                        btnClass = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={selectedQuizOption !== null}
                        onClick={() => handleAnswerQuiz(oIdx)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${btnClass}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {quizFeedback && (
                  <p className="text-xs font-semibold text-emerald-700 mt-2">
                    {quizFeedback}
                  </p>
                )}
              </div>

              {/* Previous / Next Lesson Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={activeLessonIndex <= 0}
                  onClick={() => handleSelectLesson(lessons[activeLessonIndex - 1])}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  type="button"
                  disabled={activeLessonIndex >= lessons.length - 1}
                  onClick={() => handleSelectLesson(lessons[activeLessonIndex + 1])}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
