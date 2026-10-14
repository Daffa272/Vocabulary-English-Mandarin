// Speech Synthesis & Recognition Services for VocabMaster AI

export function speakText(text: string, lang: 'english' | 'mandarin' = 'english', rate = 0.85): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'mandarin' ? 'zh-CN' : 'en-US';
  utterance.rate = rate;

  // Try to pick natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const targetPrefix = lang === 'mandarin' ? 'zh' : 'en';
  const matchingVoice = voices.find(v => v.lang.startsWith(targetPrefix));
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function normalizeSpeechText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/gi, '')
    .replace(/\s+/g, ' ');
}

export interface SpeechTestResult {
  score: number;
  transcript: string;
  feedback: string;
  isSuccess: boolean;
}

export function calculatePronunciationScore(target: string, spoken: string): { score: number; feedback: string } {
  const normTarget = normalizeSpeechText(target);
  const normSpoken = normalizeSpeechText(spoken);

  if (!normSpoken) {
    return {
      score: 0,
      feedback: 'Suara tidak terdeteksi dengan jelas. Silakan coba lagi dengan artikulasi lebih tegas.'
    };
  }

  if (normSpoken === normTarget) {
    return {
      score: 100,
      feedback: 'Luar biasa! Pengucapan sangat akurat dan terdengar natural.'
    };
  }

  if (normSpoken.includes(normTarget) || normTarget.includes(normSpoken)) {
    return {
      score: 75,
      feedback: 'Cukup bagus! Intonasi sudah mendekati, dengarkan audio dan ulangi untuk skor sempurna.'
    };
  }

  return {
    score: 30,
    feedback: 'Pelafalan belum tepat. Tekan tombol dengarkan untuk meniru ketukan dan aksen kata.'
  };
}
