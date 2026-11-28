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

let unlockListenersAttached = false;

export function unlockCockpitAudio(): void {
  if (typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

function ensureAudioUnlockListeners(): void {
  if (typeof window === 'undefined' || unlockListenersAttached) return;
  unlockListenersAttached = true;
  const handleGesture = () => {
    unlockCockpitAudio();
    if (cachedContext && cachedContext.state === 'running') {
      window.removeEventListener('pointerdown', handleGesture, true);
      window.removeEventListener('keydown', handleGesture, true);
    }
  };
  window.addEventListener('pointerdown', handleGesture, true);
  window.addEventListener('keydown', handleGesture, true);
}

ensureAudioUnlockListeners();

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

let lastChallengeChimeAt = 0;
const recentChallengeChimes = new Map<string, number>();

/**
 * Distinct, bright push-notification radar bell chime played when a real-time
 * TOEIC Quick Challenge invitation arrives from a study group member.
 * Includes built-in dedupe so global & in-page listeners never double-fire.
 */
export function playChallengeInviteChime(options?: {
  forcePlay?: boolean;
  challengeId?: string;
}): void {
  if (!options?.forcePlay && !audioEnabledState) return;

  const nowMs = Date.now();
  if (!options?.forcePlay) {
    if (options?.challengeId) {
      const prevForId = recentChallengeChimes.get(options.challengeId) ?? 0;
      if (nowMs - prevForId < 2500) return;
      recentChallengeChimes.set(options.challengeId, nowMs);
      if (recentChallengeChimes.size > 40) {
        recentChallengeChimes.clear();
        recentChallengeChimes.set(options.challengeId, nowMs);
      }
    }
    if (nowMs - lastChallengeChimeAt < 850) return;
  }
  lastChallengeChimeAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + 0.015;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, now);
    compressor.knee.setValueAtTime(14, now);
    compressor.ratio.setValueAtTime(5, now);
    compressor.attack.setValueAtTime(0.004, now);
    compressor.release.setValueAtTime(0.14, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, now);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Helper: crisp crystal push-notification bell with harmonic shimmer
    const playBell = (freq: number, delaySec: number, durationSec: number, peakGain: number) => {
      const tStart = now + delaySec;
      const tEnd = tStart + durationSec;

      const oscMain = ctx.createOscillator();
      const oscHarm = ctx.createOscillator();
      const envMain = ctx.createGain();
      const envHarm = ctx.createGain();

      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(freq, tStart);

      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(freq * 2, tStart);

      envMain.gain.setValueAtTime(0.0001, tStart);
      envMain.gain.linearRampToValueAtTime(peakGain, tStart + 0.008);
      envMain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

      envHarm.gain.setValueAtTime(0.0001, tStart);
      envHarm.gain.linearRampToValueAtTime(peakGain * 0.28, tStart + 0.006);
      envHarm.gain.exponentialRampToValueAtTime(0.0001, tStart + durationSec * 0.45);

      oscMain.connect(envMain);
      oscHarm.connect(envHarm);
      envMain.connect(compressor);
      envHarm.connect(compressor);

      oscMain.start(tStart);
      oscHarm.start(tStart);
      oscMain.stop(tEnd + 0.02);
      oscHarm.stop(tEnd + 0.02);
    };

    // Subtle tactile radar sub-ping for push-alert presence
    const subOsc = ctx.createOscillator();
    const subEnv = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(220, now);
    subOsc.frequency.exponentialRampToValueAtTime(140, now + 0.11);
    subEnv.gain.setValueAtTime(0.0001, now);
    subEnv.gain.linearRampToValueAtTime(0.12, now + 0.008);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    subOsc.connect(subEnv);
    subEnv.connect(compressor);
    subOsc.start(now);
    subOsc.stop(now + 0.15);

    // Burst 1: Bright rising push chime (G5 -> C6 -> E6)
    playBell(783.99, 0.0, 0.14, 0.14);
    playBell(1046.5, 0.085, 0.16, 0.16);
    playBell(1318.51, 0.17, 0.24, 0.17);

    // Burst 2: Crisp push-notification double echo (C6 -> G6 sparkling tail)
    playBell(1046.5, 0.34, 0.15, 0.13);
    playBell(1567.98, 0.43, 0.36, 0.17);
  } catch {
    // Ignore Web Audio synthesis errors
  }
}

/**
 * Energetic ascending cockpit launch confirmation when accepting or launching a Quick Challenge.
 */
export function playChallengeAcceptedSfx(): void {
  playSequence([
    {
      startFreq: 587.33, // D5
      delaySec: 0,
      durationSec: 0.075,
      gain: 0.08,
      type: 'triangle',
    },
    {
      startFreq: 880, // A5
      delaySec: 0.07,
      durationSec: 0.085,
      gain: 0.09,
      type: 'sine',
    },
    {
      startFreq: 1174.66, // D6
      delaySec: 0.145,
      durationSec: 0.18,
      gain: 0.1,
      type: 'sine',
    },
  ]);
}

/**
 * Soft neutral descending tone when declining a Quick Challenge invite.
 */
export function playChallengeDeclinedSfx(): void {
  playSequence([
    {
      startFreq: 440,
      endFreq: 330,
      delaySec: 0,
      durationSec: 0.11,
      gain: 0.055,
      type: 'sine',
    },
  ]);
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Heroic & joyful multi-layered victory fanfare played when a learner completes
 * all lessons in a CEFR level (A1, A2, B1, B2, C1) and promotes to a new Pilot rank.
 * Combines:
 *  - Crisp snare roll crescendo
 *  - Warm triumphant brass horn melody & grand major chord
 *  - Resonant timpani bass impacts
 *  - Sparkling glockenspiel chime cascade & celebratory firework pops
 */
export function playLevelUpFanfare(options?: { forcePlay?: boolean }): void {
  if (!options?.forcePlay && !audioEnabledState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + 0.02;

    // Master dynamics compressor prevents clipping across layered brass, timpani & chimes
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, now);
    compressor.knee.setValueAtTime(18, now);
    compressor.ratio.setValueAtTime(6, now);
    compressor.attack.setValueAtTime(0.005, now);
    compressor.release.setValueAtTime(0.18, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Helper: Warm brass-like voice (detuned sawtooth + triangle through sweeping lowpass)
    const playBrassNote = (
      freq: number,
      delaySec: number,
      durationSec: number,
      peakGain: number
    ) => {
      const tStart = now + delaySec;
      const tEnd = tStart + durationSec;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(1.4, tStart);
      filter.frequency.setValueAtTime(750, tStart);
      filter.frequency.exponentialRampToValueAtTime(Math.min(4200, freq * 5.2), tStart + 0.055);
      filter.frequency.exponentialRampToValueAtTime(Math.max(950, freq * 2.4), tEnd);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, tStart);
      env.gain.linearRampToValueAtTime(peakGain, tStart + 0.028);
      env.gain.setValueAtTime(peakGain * 0.86, tStart + Math.max(0.04, durationSec * 0.65));
      env.gain.exponentialRampToValueAtTime(0.0001, tEnd);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, tStart);
      osc1.detune.setValueAtTime(-5, tStart);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq, tStart);
      osc2.detune.setValueAtTime(5, tStart);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(env);
      env.connect(compressor);

      osc1.start(tStart);
      osc2.start(tStart);
      osc1.stop(tEnd + 0.03);
      osc2.stop(tEnd + 0.03);
    };

    // Helper: Resonant timpani drum boom
    const playTimpani = (delaySec: number, startHz: number, endHz: number, peakGain: number) => {
      const tStart = now + delaySec;
      const tEnd = tStart + 0.36;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startHz, tStart);
      osc.frequency.exponentialRampToValueAtTime(endHz, tStart + 0.14);

      env.gain.setValueAtTime(0.0001, tStart);
      env.gain.linearRampToValueAtTime(peakGain, tStart + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, tEnd);

      osc.connect(env);
      env.connect(compressor);
      osc.start(tStart);
      osc.stop(tEnd + 0.02);
    };

    // Helper: Filtered noise burst for snare hits / firework crackles
    const playNoiseBurst = (
      delaySec: number,
      durationSec: number,
      filterFreq: number,
      filterType: BiquadFilterType,
      peakGain: number
    ) => {
      const tStart = now + delaySec;
      const tEnd = tStart + durationSec;
      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, durationSec + 0.02);

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, tStart);
      filter.Q.setValueAtTime(1.1, tStart);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, tStart);
      env.gain.linearRampToValueAtTime(peakGain, tStart + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, tEnd);

      src.connect(filter);
      filter.connect(env);
      env.connect(compressor);
      src.start(tStart);
      src.stop(tEnd + 0.02);
    };

    // Helper: Bright joyful glockenspiel chime
    const playChime = (freq: number, delaySec: number, durationSec: number, peakGain: number) => {
      const tStart = now + delaySec;
      const tEnd = tStart + durationSec;

      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const env = ctx.createGain();
      const overEnv = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, tStart);

      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, tStart);

      env.gain.setValueAtTime(0.0001, tStart);
      env.gain.linearRampToValueAtTime(peakGain, tStart + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, tEnd);

      overEnv.gain.setValueAtTime(0.0001, tStart);
      overEnv.gain.linearRampToValueAtTime(peakGain * 0.35, tStart + 0.006);
      overEnv.gain.exponentialRampToValueAtTime(0.0001, tStart + durationSec * 0.45);

      osc.connect(env);
      overtone.connect(overEnv);
      env.connect(compressor);
      overEnv.connect(compressor);

      osc.start(tStart);
      overtone.start(tStart);
      osc.stop(tEnd + 0.02);
      overtone.stop(tEnd + 0.02);
    };

    // 1. Snare roll lead-in (t = 0.00 -> 0.16)
    [0.0, 0.045, 0.09, 0.13].forEach((d, idx) => {
      playNoiseBurst(d, 0.055, 2200 + idx * 350, 'bandpass', 0.045 + idx * 0.018);
    });

    // 2. Heroic brass fanfare phrase 1: C5 -> E5 -> G5 -> C6!
    playTimpani(0.16, 140, 68, 0.24);
    playBrassNote(523.25, 0.16, 0.13, 0.12); // C5
    playBrassNote(261.63, 0.16, 0.13, 0.08); // C4 bass support

    playBrassNote(659.25, 0.29, 0.13, 0.13); // E5
    playBrassNote(783.99, 0.42, 0.14, 0.14); // G5

    // Accent hit on C6 with harmony + timpani + celebratory firework pop
    playTimpani(0.57, 165, 76, 0.28);
    playNoiseBurst(0.58, 0.22, 3600, 'highpass', 0.09);
    playBrassNote(1046.5, 0.57, 0.3, 0.16); // C6
    playBrassNote(659.25, 0.57, 0.3, 0.09); // E5
    playBrassNote(392.0, 0.57, 0.3, 0.09); // G4

    // 3. Playful joyful bridge: G5 -> A5 -> B5
    playBrassNote(783.99, 0.89, 0.11, 0.12); // G5
    playBrassNote(880.0, 1.0, 0.11, 0.13); // A5
    playBrassNote(987.77, 1.11, 0.12, 0.14); // B5

    // 4. Grand Heroic Climax Chord (C major lush brass + bass + shimmering cymbal)
    playTimpani(1.24, 150, 65, 0.32);
    playNoiseBurst(1.24, 0.48, 4200, 'highpass', 0.11); // Cymbal / firework burst wash
    playBrassNote(261.63, 1.24, 1.05, 0.11); // C4
    playBrassNote(392.0, 1.24, 1.05, 0.1); // G4
    playBrassNote(523.25, 1.24, 1.05, 0.11); // C5
    playBrassNote(659.25, 1.24, 1.08, 0.11); // E5
    playBrassNote(783.99, 1.24, 1.1, 0.11); // G5
    playBrassNote(1046.5, 1.24, 1.15, 0.16); // C6

    // 5. Joyful sparkling celesta/glockenspiel arpeggio over the grand finale
    const sparkles = [1318.51, 1567.98, 1760.0, 2093.0, 2637.02, 3135.96];
    sparkles.forEach((freq, idx) => {
      playChime(freq, 1.32 + idx * 0.085, 0.42, 0.075);
    });

    // Secondary celebratory firework crackle tail
    playNoiseBurst(1.62, 0.16, 2800, 'bandpass', 0.06);
    playNoiseBurst(1.86, 0.18, 3400, 'highpass', 0.055);
  } catch {
    // Never interrupt learning flow if audio synthesis fails
  }
}

/**
 * Playful firework launch whistle + sparkling pop + celebratory major chord burst
 * when the learner triggers an extra fireworks salvo inside the rank-up modal.
 */
export function playFireworkSalvoSfx(options?: { forcePlay?: boolean }): void {
  if (!options?.forcePlay && !audioEnabledState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + 0.01;

    // Rising rocket whistle
    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(480, now);
    whistle.frequency.exponentialRampToValueAtTime(1680, now + 0.22);
    whistleGain.gain.setValueAtTime(0.0001, now);
    whistleGain.gain.linearRampToValueAtTime(0.055, now + 0.04);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    whistle.connect(whistleGain);
    whistleGain.connect(ctx.destination);
    whistle.start(now);
    whistle.stop(now + 0.25);

    // Burst crackle
    const burst = ctx.createBufferSource();
    burst.buffer = createNoiseBuffer(ctx, 0.26);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2600, now + 0.22);
    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0.0001, now + 0.22);
    burstGain.gain.linearRampToValueAtTime(0.11, now + 0.24);
    burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    burst.connect(filter);
    filter.connect(burstGain);
    burstGain.connect(ctx.destination);
    burst.start(now + 0.22);
    burst.stop(now + 0.47);

    // Joyful sparkling arpeggio
    const notes = [783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const tStart = now + 0.23 + idx * 0.055;
      const tEnd = tStart + 0.3;
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, tStart);
      gain.gain.setValueAtTime(0.0001, tStart);
      gain.gain.linearRampToValueAtTime(0.08, tStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, tEnd);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(tStart);
      osc.stop(tEnd + 0.02);
    });
  } catch {
    // Ignore synthesis failures
  }
}
