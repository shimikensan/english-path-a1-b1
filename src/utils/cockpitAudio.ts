import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pilot-cockpit-sfx';

type AudioListener = (enabled: boolean) => void;
const listeners = new Set<AudioListener>();

let cachedContext: AudioContext | null = null;

function readStoredEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'off') return false;
    return true;
  } catch {
    return true;
  }
}

let audioEnabledState: boolean = readStoredEnabled();

export function isCockpitAudioEnabled(): boolean {
  return audioEnabledState;
}

export function setCockpitAudioEnabled(enabled: boolean): void {
  audioEnabledState = enabled;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }
  listeners.forEach((fn) => fn(enabled));
}

export function toggleCockpitAudio(): boolean {
  const next = !audioEnabledState;
  setCockpitAudioEnabled(next);
  if (next) {
    playCockpitToggleBeep();
  }
  return next;
}

export function useCockpitAudio(): {
  audioEnabled: boolean;
  toggleAudio: () => void;
} {
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => isCockpitAudioEnabled());

  useEffect(() => {
    const handler: AudioListener = (next) => setAudioEnabled(next);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    audioEnabled,
    toggleAudio: () => {
      toggleCockpitAudio();
    },
  };
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!cachedContext) {
      cachedContext = new AudioCtx();
    }
    if (cachedContext.state === 'suspended') {
      void cachedContext.resume().catch(() => {});
    }
    return cachedContext;
  } catch {
    return null;
  }
}

interface ToneStep {
  startFreq: number;
  endFreq?: number;
  delaySec: number;
  durationSec: number;
  gain: number;
  type: OscillatorType;
}

function playSequence(steps: ToneStep[]): void {
  if (!audioEnabledState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    steps.forEach((step) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = step.type;
      const tStart = now + step.delaySec;
      const tEnd = tStart + step.durationSec;

      osc.frequency.setValueAtTime(step.startFreq, tStart);
      if (step.endFreq && step.endFreq !== step.startFreq) {
        osc.frequency.exponentialRampToValueAtTime(step.endFreq, tEnd);
      }

      // Smooth envelope to eliminate clicks/pops
      gainNode.gain.setValueAtTime(0.0001, tStart);
      gainNode.gain.linearRampToValueAtTime(step.gain, tStart + Math.min(0.01, step.durationSec * 0.25));
      gainNode.gain.exponentialRampToValueAtTime(0.0001, tEnd);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(tStart);
      osc.stop(tEnd + 0.015);
    });
  } catch {
    // Never interrupt learning flow if audio synthesis fails
  }
}

/**
 * Subtle glass-cockpit confirmation beep ("bíp" kép nhẹ thanh thoát)
 * Played when learner selects a correct answer or marks a word mastered.
 */
export function playCorrectBeep(): void {
  playSequence([
    {
      startFreq: 880, // A5
      delaySec: 0,
      durationSec: 0.065,
      gain: 0.065,
      type: 'sine',
    },
    {
      startFreq: 1318.5, // E6
      delaySec: 0.068,
      durationSec: 0.11,
      gain: 0.07,
      type: 'sine',
    },
  ]);
}

/**
 * Subtle tactile avionics HUD blip when flipping a vocabulary flashcard or revealing a card.
 */
export function playCardFlipBeep(): void {
  playSequence([
    {
      startFreq: 560,
      endFreq: 760,
      delaySec: 0,
      durationSec: 0.055,
      gain: 0.05,
      type: 'triangle',
    },
  ]);
}

/**
 * Gentle muted low advisory tone when learner selects an incorrect option.
 */
export function playWrongTone(): void {
  playSequence([
    {
      startFreq: 310,
      endFreq: 235,
      delaySec: 0,
      durationSec: 0.125,
      gain: 0.048,
      type: 'triangle',
    },
  ]);
}

/**
 * Refined 3-note cockpit autopilot-engaged chime when completing a quiz or drill.
 */
export function playMissionCompleteChime(): void {
  playSequence([
    {
      startFreq: 659.25, // E5
      delaySec: 0,
      durationSec: 0.08,
      gain: 0.055,
      type: 'sine',
    },
    {
      startFreq: 880, // A5
      delaySec: 0.085,
      durationSec: 0.085,
      gain: 0.06,
      type: 'sine',
    },
    {
      startFreq: 1318.5, // E6
      delaySec: 0.175,
      durationSec: 0.16,
      gain: 0.068,
      type: 'sine',
    },
  ]);
}

/**
 * Soft avionics switch click played when turning cockpit audio feedback back ON.
 */
export function playCockpitToggleBeep(): void {
  playSequence([
    {
      startFreq: 1046.5, // C6
      delaySec: 0,
      durationSec: 0.055,
      gain: 0.055,
      type: 'sine',
    },
  ]);
}

/**
 * Crisp 3-pulse cockpit radar alert played when a real-time TOEIC Quick Challenge invite arrives.
 */
export function playChallengeInviteChime(): void {
  playSequence([
    {
      startFreq: 783.99, // G5
      delaySec: 0,
      durationSec: 0.075,
      gain: 0.06,
      type: 'sine',
    },
    {
      startFreq: 1046.5, // C6
      delaySec: 0.09,
      durationSec: 0.075,
      gain: 0.065,
      type: 'sine',
    },
    {
      startFreq: 1567.98, // G6
      delaySec: 0.18,
      durationSec: 0.14,
      gain: 0.07,
      type: 'triangle',
    },
  ]);
}
