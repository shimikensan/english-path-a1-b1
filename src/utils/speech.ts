export type SpeechAccent = 'en-US' | 'en-GB';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakEnglish(
  text: string,
  options?: { accent?: SpeechAccent; rate?: number; onEnd?: () => void }
): void {
  if (!isSpeechSupported() || !text.trim()) {
    options?.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const accent = options?.accent ?? 'en-US';
    utterance.lang = accent;
    utterance.rate = options?.rate ?? 0.92;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find((v) => v.lang.toLowerCase() === accent.toLowerCase());
    const fallbackVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (exactVoice) {
      utterance.voice = exactVoice;
    } else if (fallbackVoice) {
      utterance.voice = fallbackVoice;
    }

    if (options?.onEnd) {
      utterance.onend = options.onEnd;
      utterance.onerror = options.onEnd;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    options?.onEnd?.();
  }
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}
