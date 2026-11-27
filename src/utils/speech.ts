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

export interface WordTrackingSpeechController {
  stop: () => void;
}

/**
 * Speaks an English sentence while emitting the active word index (0-based across
 * whitespace-delimited tokens) using native SpeechSynthesis boundary events with
 * a calibrated timer fallback for engines that do not fire boundary events.
 */
export function speakEnglishWithWordTracking(
  text: string,
  options?: {
    accent?: SpeechAccent;
    rate?: number;
    onWordIndex?: (wordIndex: number) => void;
    onEnd?: () => void;
  }
): WordTrackingSpeechController {
  const cleaned = text.trim();
  if (!isSpeechSupported() || !cleaned) {
    options?.onEnd?.();
    return { stop: () => undefined };
  }

  // Build character ranges for each whitespace-delimited token
  const tokenStarts: number[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    tokenStarts.push(match.index);
  }

  let stopped = false;
  let boundaryReceived = false;
  let fallbackInterval: number | null = null;
  let fallbackStartTimer: number | null = null;

  const clearTimers = () => {
    if (fallbackInterval !== null) {
      window.clearInterval(fallbackInterval);
      fallbackInterval = null;
    }
    if (fallbackStartTimer !== null) {
      window.clearTimeout(fallbackStartTimer);
      fallbackStartTimer = null;
    }
  };

  const finish = () => {
    clearTimers();
    if (!stopped) {
      stopped = true;
      options?.onWordIndex?.(-1);
      options?.onEnd?.();
    }
  };

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    const accent = options?.accent ?? 'en-US';
    const rate = options?.rate ?? 0.92;
    utterance.lang = accent;
    utterance.rate = rate;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find((v) => v.lang.toLowerCase() === accent.toLowerCase());
    const fallbackVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (exactVoice) utterance.voice = exactVoice;
    else if (fallbackVoice) utterance.voice = fallbackVoice;

    utterance.onstart = () => {
      if (stopped) return;
      options?.onWordIndex?.(0);
      // If browser does not emit boundary events within 420ms, activate smooth fallback pacing
      fallbackStartTimer = window.setTimeout(() => {
        if (stopped || boundaryReceived || tokenStarts.length <= 1) return;
        let idx = 1;
        const msPerWord = Math.max(190, Math.round(355 / Math.max(0.5, rate)));
        fallbackInterval = window.setInterval(() => {
          if (stopped || boundaryReceived) {
            clearTimers();
            return;
          }
          if (idx < tokenStarts.length) {
            options?.onWordIndex?.(idx);
            idx += 1;
          } else {
            clearTimers();
          }
        }, msPerWord);
      }, 420);
    };

    utterance.onboundary = (event) => {
      if (stopped) return;
      if (event.name && event.name !== 'word') return;
      boundaryReceived = true;
      clearTimers();
      const charIdx = event.charIndex;
      let matchedIndex = 0;
      for (let i = 0; i < tokenStarts.length; i++) {
        if (tokenStarts[i] <= charIdx) {
          matchedIndex = i;
        } else {
          break;
        }
      }
      options?.onWordIndex?.(matchedIndex);
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  } catch {
    finish();
  }

  return {
    stop: () => {
      stopped = true;
      clearTimers();
      options?.onWordIndex?.(-1);
      stopSpeaking();
    },
  };
}
