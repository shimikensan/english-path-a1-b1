import type { ClubMusicConfigDoc } from '../types';
import { DEFAULT_CLUB_MUSIC_CONFIG } from '../services/firestoreService';

const SAFE_UPLOADED_AUDIO_URL_REGEX =
  /^\/api\/club\/music\/files\/club_bgm_[0-9]+_[a-f0-9]{12}\.(mp3|wav|ogg|m4a|webm)$/;

// MIDI note number to frequency (Hz)
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface MelodyEvent {
  step: number; // 8th-note index within 64-step (8-bar) loop
  midi: number;
  durSteps: number;
  velocity: number;
}

interface ChordMeasure {
  step: number;
  durSteps: number;
  bassMidi: number;
  padMidis: number[];
  arpMidis: number[];
}

// 8-bar lounge piano arrangement in Bb Major (80 BPM, 8th note = 0.375s)
// Progression: | Gm7 | Bb | Eb | Bb/D F | Gm7 | Bb | Eb | Fsus4 F |
const CHORD_MEASURES: ChordMeasure[] = [
  { step: 0, durSteps: 8, bassMidi: 43, padMidis: [55, 58, 62, 65], arpMidis: [55, 62, 65, 62] }, // Gm7
  { step: 8, durSteps: 8, bassMidi: 46, padMidis: [58, 62, 65], arpMidis: [58, 62, 65, 62] }, // Bb
  { step: 16, durSteps: 8, bassMidi: 51, padMidis: [55, 58, 63], arpMidis: [55, 58, 63, 58] }, // Eb
  { step: 24, durSteps: 4, bassMidi: 50, padMidis: [58, 62, 65], arpMidis: [58, 62] }, // Bb/D
  { step: 28, durSteps: 4, bassMidi: 41, padMidis: [57, 60, 65], arpMidis: [57, 60] }, // F
  { step: 32, durSteps: 8, bassMidi: 43, padMidis: [55, 58, 62, 65], arpMidis: [55, 62, 65, 62] }, // Gm7
  { step: 40, durSteps: 8, bassMidi: 46, padMidis: [58, 62, 65], arpMidis: [58, 62, 65, 62] }, // Bb
  { step: 48, durSteps: 8, bassMidi: 51, padMidis: [55, 58, 63, 67], arpMidis: [55, 58, 63, 58] }, // EbMaj7
  { step: 56, durSteps: 4, bassMidi: 41, padMidis: [58, 60, 65], arpMidis: [58, 60] }, // Fsus4
  { step: 60, durSteps: 4, bassMidi: 41, padMidis: [57, 60, 65], arpMidis: [57, 60] }, // F
];

// Expressive lyrical felt-piano top line inspired by "See You Again" in Bb Major
const MELODY_EVENTS: MelodyEvent[] = [
  // Bar 1 (Gm7) - gentle opening phrase
  { step: 0, midi: 70, durSteps: 2, velocity: 0.72 }, // Bb4
  { step: 2, midi: 74, durSteps: 2, velocity: 0.78 }, // D5
  { step: 4, midi: 77, durSteps: 3, velocity: 0.84 }, // F5
  { step: 7, midi: 79, durSteps: 1, velocity: 0.74 }, // G5

  // Bar 2 (Bb) - soaring vocal-like lift
  { step: 8, midi: 77, durSteps: 3, velocity: 0.82 }, // F5
  { step: 11, midi: 74, durSteps: 1, velocity: 0.68 }, // D5
  { step: 12, midi: 74, durSteps: 2, velocity: 0.72 }, // D5
  { step: 14, midi: 72, durSteps: 2, velocity: 0.68 }, // C5

  // Bar 3 (Eb) - warm resolving arc
  { step: 16, midi: 70, durSteps: 3, velocity: 0.8 }, // Bb4
  { step: 19, midi: 72, durSteps: 1, velocity: 0.7 }, // C5
  { step: 20, midi: 74, durSteps: 2, velocity: 0.76 }, // D5
  { step: 22, midi: 72, durSteps: 2, velocity: 0.68 }, // C5

  // Bar 4 (Bb/D -> F) - reflective turnaround
  { step: 24, midi: 70, durSteps: 3, velocity: 0.76 }, // Bb4
  { step: 27, midi: 69, durSteps: 1, velocity: 0.62 }, // A4
  { step: 28, midi: 67, durSteps: 2, velocity: 0.7 }, // G4
  { step: 30, midi: 69, durSteps: 2, velocity: 0.66 }, // A4

  // Bar 5 (Gm7) - second phrase climbing higher
  { step: 32, midi: 70, durSteps: 2, velocity: 0.76 }, // Bb4
  { step: 34, midi: 74, durSteps: 2, velocity: 0.8 }, // D5
  { step: 36, midi: 77, durSteps: 2, velocity: 0.86 }, // F5
  { step: 38, midi: 79, durSteps: 2, velocity: 0.88 }, // G5

  // Bar 6 (Bb) - peak shimmer
  { step: 40, midi: 82, durSteps: 3, velocity: 0.88 }, // Bb5
  { step: 43, midi: 79, durSteps: 1, velocity: 0.76 }, // G5
  { step: 44, midi: 77, durSteps: 2, velocity: 0.8 }, // F5
  { step: 46, midi: 74, durSteps: 2, velocity: 0.72 }, // D5

  // Bar 7 (EbMaj7) - tender descent
  { step: 48, midi: 75, durSteps: 3, velocity: 0.82 }, // Eb5
  { step: 51, midi: 74, durSteps: 1, velocity: 0.72 }, // D5
  { step: 52, midi: 72, durSteps: 2, velocity: 0.76 }, // C5
  { step: 54, midi: 70, durSteps: 2, velocity: 0.7 }, // Bb4

  // Bar 8 (Fsus4 -> F) - soft breath before loop
  { step: 56, midi: 72, durSteps: 3, velocity: 0.78 }, // C5
  { step: 59, midi: 70, durSteps: 1, velocity: 0.66 }, // Bb4
  { step: 60, midi: 69, durSteps: 4, velocity: 0.72 }, // A4
];

const TOTAL_STEPS = 64;
const STEP_DURATION_SEC = 0.375; // 80 BPM eighth note

export interface ClubMusicEngineCallbacks {
  onPlayingChange?: (playing: boolean) => void;
  onFallbackToBuiltin?: (reason: string) => void;
}

export class ClubMusicEngine {
  private config: ClubMusicConfigDoc = DEFAULT_CLUB_MUSIC_CONFIG;
  private volume = DEFAULT_CLUB_MUSIC_CONFIG.defaultVolume;
  private isPlaying = false;
  private disposed = false;

  // Web Audio API synth graph for built-in "See You Again" piano lounge
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;

  // HTML5 Audio element for Admin-uploaded MP3/WAV/OGG/M4A/WebM
  private htmlAudio: HTMLAudioElement | null = null;
  private activeUploadedUrl = '';

  private callbacks: ClubMusicEngineCallbacks;

  constructor(callbacks: ClubMusicEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public configure(nextConfig: ClubMusicConfigDoc): void {
    if (this.disposed) return;
    const prevMode = this.config.mode;
    const prevUrl = this.config.audioUrl;
    this.config = nextConfig;

    const sourceChanged = prevMode !== nextConfig.mode || prevUrl !== nextConfig.audioUrl;
    if (sourceChanged && this.isPlaying) {
      this.stopAllSources();
      if (nextConfig.enabled) {
        void this.play();
      } else {
        this.setPlayingFlag(false);
      }
    } else if (!nextConfig.enabled && this.isPlaying) {
      this.pause();
    }
  }

  public setVolume(nextVolume: number): void {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(nextVolume) ? nextVolume : 0.42));
    this.volume = clamped;

    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.setTargetAtTime(clamped * 0.65, this.audioCtx.currentTime, 0.06);
      } catch {
        this.masterGain.gain.value = clamped * 0.65;
      }
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = clamped;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async play(): Promise<boolean> {
    if (this.disposed) return false;

    const useUploaded =
      this.config.mode === 'uploaded' &&
      typeof this.config.audioUrl === 'string' &&
      SAFE_UPLOADED_AUDIO_URL_REGEX.test(this.config.audioUrl);

    if (useUploaded) {
      const ok = await this.startUploadedAudio(this.config.audioUrl);
      if (ok) {
        this.setPlayingFlag(true);
        return true;
      }
      // Graceful fallback to built-in "See You Again" if uploaded track fails to decode/fetch
      this.callbacks.onFallbackToBuiltin?.(
        'Không thể tải bản nhạc đã upload, tự động chuyển về nhạc nền mặc định See You Again.'
      );
    }

    const synthOk = await this.startBuiltinSynth();
    this.setPlayingFlag(synthOk);
    return synthOk;
  }

  public pause(): void {
    this.stopAllSources();
    this.setPlayingFlag(false);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopAllSources();
    if (this.htmlAudio) {
      this.htmlAudio.src = '';
      this.htmlAudio = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
      this.masterGain = null;
      this.delayNode = null;
    }
    this.isPlaying = false;
  }

  private setPlayingFlag(next: boolean): void {
    if (this.isPlaying !== next) {
      this.isPlaying = next;
      this.callbacks.onPlayingChange?.(next);
    }
  }

  private stopAllSources(): void {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.setTargetAtTime(0.0001, this.audioCtx.currentTime, 0.04);
      } catch {
        // Ignore
      }
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
  }

  private async startUploadedAudio(url: string): Promise<boolean> {
    // Stop synth if it was playing
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.setTargetAtTime(0.0001, this.audioCtx.currentTime, 0.04);
      } catch {
        // Ignore
      }
    }

    try {
      if (!this.htmlAudio) {
        this.htmlAudio = new Audio();
        this.htmlAudio.loop = true;
        this.htmlAudio.preload = 'auto';
      }
      if (this.activeUploadedUrl !== url) {
        this.htmlAudio.src = url;
        this.activeUploadedUrl = url;
        this.htmlAudio.currentTime = 0;
      }
      this.htmlAudio.volume = this.volume;
      await this.htmlAudio.play();
      return true;
    } catch {
      return false;
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxCtor) return null;

    const ctx = new AudioCtxCtor();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;

    // Gentle lounge echo send for piano warmth
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.24;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1500;
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.26;

    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    delayFilter.connect(wetGain);
    wetGain.connect(compressor);

    masterGain.connect(compressor);
    masterGain.connect(delay);
    compressor.connect(ctx.destination);

    this.audioCtx = ctx;
    this.masterGain = masterGain;
    this.delayNode = delay;
    return ctx;
  }

  private async startBuiltinSynth(): Promise<boolean> {
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }

    const ctx = this.ensureAudioContext();
    if (!ctx || !this.masterGain) return false;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch {
      return false;
    }

    // Smooth fade-in to target volume
    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0.0001, this.volume * 0.65), now + 0.35);

    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
    }
    this.nextStepTime = ctx.currentTime + 0.08;
    this.schedulerTimer = window.setInterval(() => this.scheduleAhead(), 85);
    this.scheduleAhead();
    return true;
  }

  private scheduleAhead(): void {
    if (!this.audioCtx || !this.masterGain || this.disposed) return;
    const lookaheadSec = 0.25;
    while (this.nextStepTime < this.audioCtx.currentTime + lookaheadSec) {
      this.triggerStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += STEP_DURATION_SEC;
      this.currentStep = (this.currentStep + 1) % TOTAL_STEPS;
    }
  }

  private triggerStep(step: number, time: number): void {
    // 1. Chord pad, warm sub-bass, and gentle piano arpeggio
    for (const chord of CHORD_MEASURES) {
      if (chord.step === step) {
        const durSec = chord.durSteps * STEP_DURATION_SEC;
        this.playWarmPad(chord.padMidis, time, durSec);
        this.playBassNote(chord.bassMidi, time, durSec * 0.95);
      }
      if (step >= chord.step && step < chord.step + chord.durSteps) {
        const offset = step - chord.step;
        if (offset % 2 === 0) {
          const arpIdx = Math.floor(offset / 2) % chord.arpMidis.length;
          this.playFeltPianoNote(
            chord.arpMidis[arpIdx],
            time,
            STEP_DURATION_SEC * 2.4,
            0.34
          );
        }
      }
    }

    // 2. Lyrical "See You Again" piano melody
    for (const ev of MELODY_EVENTS) {
      if (ev.step === step) {
        this.playFeltPianoNote(
          ev.midi,
          time,
          ev.durSteps * STEP_DURATION_SEC + 0.45,
          ev.velocity * 0.52
        );
      }
    }
  }

  private playFeltPianoNote(midi: number, time: number, duration: number, gainPeak: number): void {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;
    const freq = midiToFreq(midi);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.16, time);
    osc2Gain.gain.exponentialRampToValueAtTime(0.01, time + Math.min(0.45, duration));

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3200, freq * 5.2), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(480, freq * 1.6), time + duration);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gainPeak, time + 0.018);
    env.gain.exponentialRampToValueAtTime(gainPeak * 0.38, time + Math.min(0.42, duration * 0.45));
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.04);
    osc2.stop(time + duration + 0.04);
  }

  private playWarmPad(midis: number[], time: number, duration: number): void {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(860, time);

    const env = ctx.createGain();
    const peak = 0.085 / Math.max(1, midis.length * 0.55);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(peak, time + Math.min(0.65, duration * 0.35));
    env.gain.setValueAtTime(peak * 0.85, time + Math.max(0.7, duration - 0.55));
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.25);

    filter.connect(env);
    env.connect(this.masterGain);

    midis.forEach((m, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(midiToFreq(m), time);
      osc.detune.setValueAtTime(idx % 2 === 0 ? -4 : 4, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + duration + 0.3);
    });
  }

  private playBassNote(midi: number, time: number, duration: number): void {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.16, time + 0.05);
    env.gain.exponentialRampToValueAtTime(0.07, time + duration * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.15);

    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.2);
  }
}
