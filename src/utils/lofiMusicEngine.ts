// Procedural Web Audio API Lo-Fi Study Beat Synthesizer.
// Produces warm, low-passed Rhodes chords, mellow boom-bap drums, sub-bass,
// gentle vinyl/rain texture, and sparse pentatonic melodies with zero external dependencies.

export interface LofiTrackMeta {
  id: 'midnight_hangar' | 'cloud_drift' | 'cockpit_rain' | 'orbital_calm';
  title: string;
  subtitleVi: string;
  bpm: number;
  ambientLabelVi: string;
  accentHex: string;
}

export const LOFI_TRACKS: LofiTrackMeta[] = [
  {
    id: 'midnight_hangar',
    title: 'Midnight Hangar',
    subtitleVi: 'Rhodes ấm · Nhịp lo-fi êm dịu',
    bpm: 72,
    ambientLabelVi: 'Đĩa than nhẹ',
    accentHex: '#FF8524',
  },
  {
    id: 'cloud_drift',
    title: 'Cloud Drift',
    subtitleVi: 'Hợp âm bay bổng · Mưa rơi nhẹ',
    bpm: 68,
    ambientLabelVi: 'Mưa ngoài cửa kính',
    accentHex: '#38BDF8',
  },
  {
    id: 'cockpit_rain',
    title: 'Cockpit Rain',
    subtitleVi: 'Boom-bap chậm · Tập trung sâu',
    bpm: 76,
    ambientLabelVi: 'Nhịp jazz dịu',
    accentHex: '#34D399',
  },
  {
    id: 'orbital_calm',
    title: 'Orbital Calm',
    subtitleVi: 'Không gian tĩnh lặng · Synth mềm',
    bpm: 64,
    ambientLabelVi: 'Sóng vũ trụ êm',
    accentHex: '#A78BFA',
  },
];

interface TrackPattern {
  bpm: number;
  swing: number; // 0..0.14 sixteenth-note swing
  filterHz: number;
  noiseGain: number;
  noiseFilterHz: number;
  // 4-bar chord progression (MIDI notes per bar)
  chords: number[][];
  bassRoots: number[];
  // Sparse melody MIDI notes indexed across 16 steps per bar (null = rest)
  melodyPool: number[];
  kickSteps: number[];
  snareSteps: number[];
  hatSteps: number[];
  padMode?: boolean;
}

const TRACK_PATTERNS: Record<LofiTrackMeta['id'], TrackPattern> = {
  midnight_hangar: {
    bpm: 72,
    swing: 0.08,
    filterHz: 1850,
    noiseGain: 0.022,
    noiseFilterHz: 1400,
    // Fmaj9 -> Dm9 -> Bbmaj7 -> C13
    chords: [
      [53, 57, 60, 64, 67],
      [50, 53, 57, 60, 64],
      [46, 50, 53, 57, 62],
      [48, 52, 58, 62, 69],
    ],
    bassRoots: [41, 38, 34, 36],
    melodyPool: [69, 72, 74, 76, 77, 81],
    kickSteps: [0, 7, 10],
    snareSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  cloud_drift: {
    bpm: 68,
    swing: 0.05,
    filterHz: 1600,
    noiseGain: 0.036,
    noiseFilterHz: 950,
    // Ebmaj9 -> Cm9 -> Abmaj7 -> Bb6/9
    chords: [
      [51, 55, 58, 62, 65],
      [48, 51, 55, 58, 62],
      [44, 48, 51, 55, 60],
      [46, 50, 53, 55, 60],
    ],
    bassRoots: [39, 36, 32, 34],
    melodyPool: [67, 70, 72, 74, 75, 79],
    kickSteps: [0, 10],
    snareSteps: [4, 12],
    hatSteps: [2, 6, 10, 14],
    padMode: true,
  },
  cockpit_rain: {
    bpm: 76,
    swing: 0.11,
    filterHz: 2050,
    noiseGain: 0.028,
    noiseFilterHz: 1250,
    // Dm9 -> G13 -> Cmaj9 -> Am9
    chords: [
      [50, 53, 57, 60, 64],
      [43, 47, 53, 57, 64],
      [48, 52, 55, 59, 62],
      [45, 48, 52, 55, 59],
    ],
    bassRoots: [38, 43, 36, 33],
    melodyPool: [67, 69, 72, 74, 76, 79],
    kickSteps: [0, 6, 10, 15],
    snareSteps: [4, 12],
    hatSteps: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  orbital_calm: {
    bpm: 64,
    swing: 0.04,
    filterHz: 1750,
    noiseGain: 0.018,
    noiseFilterHz: 700,
    // Em9 -> Cmaj9 -> Gmaj7 -> D6/9
    chords: [
      [52, 55, 59, 62, 66],
      [48, 52, 55, 59, 62],
      [43, 47, 50, 54, 59],
      [50, 54, 57, 59, 64],
    ],
    bassRoots: [40, 36, 31, 38],
    melodyPool: [71, 74, 76, 78, 79, 83],
    kickSteps: [0, 8],
    snareSteps: [12],
    hatSteps: [4, 10, 14],
    padMode: true,
  },
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class LofiMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;

  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGainNode: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private trackId: LofiTrackMeta['id'] = 'midnight_hangar';
  private volume = 0.45;
  private muted = false;
  private playing = false;

  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0; // 0..63 (4 bars * 16 steps)

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;

    if (!this.ctx) {
      const ctx = new Ctx();
      this.ctx = ctx;

      const masterFilter = ctx.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.value = TRACK_PATTERNS[this.trackId].filterHz;
      masterFilter.Q.value = 0.7;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.0001;

      // Subtle warm tape delay for dreamy lo-fi space
      const delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = 0.36;

      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1150;

      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.24;

      const delayWet = ctx.createGain();
      delayWet.gain.value = 0.22;

      masterFilter.connect(masterGain);
      masterFilter.connect(delayNode);
      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayFilter.connect(delayWet);
      delayWet.connect(masterGain);

      masterGain.connect(ctx.destination);

      this.masterFilter = masterFilter;
      this.masterGain = masterGain;
      this.delayNode = delayNode;
      this.delayFeedback = delayFeedback;
      this.delayWet = delayWet;

      // Generate 4-second looping pink-ish noise + occasional soft vinyl crackle buffer
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 4;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        let sample = (b0 + b1 + b2) * 0.35;
        // Subtle vinyl dust pop
        if (Math.random() < 0.00035) {
          sample += (Math.random() * 2 - 1) * 0.42;
        }
        data[i] = Math.max(-1, Math.min(1, sample));
      }
      this.noiseBuffer = buffer;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private startAmbientNoise(): void {
    if (!this.ctx || !this.noiseBuffer || !this.masterGain) return;
    this.stopAmbientNoise();

    const pattern = TRACK_PATTERNS[this.trackId];
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = pattern.noiseFilterHz;
    filter.Q.value = 0.65;

    const gain = this.ctx.createGain();
    gain.gain.value = pattern.noiseGain;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.noiseSource = source;
    this.noiseFilter = filter;
    this.noiseGainNode = gain;
  }

  private stopAmbientNoise(): void {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
      } catch {
        // Already stopped
      }
      this.noiseSource = null;
    }
    if (this.noiseFilter) {
      this.noiseFilter.disconnect();
      this.noiseFilter = null;
    }
    if (this.noiseGainNode) {
      this.noiseGainNode.disconnect();
      this.noiseGainNode = null;
    }
  }

  private updateMasterVolume(immediate = false): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = this.playing && !this.muted ? Math.max(0.0001, this.volume * 0.62) : 0.0001;
    this.masterGain.gain.cancelScheduledValues(now);
    if (immediate) {
      this.masterGain.gain.setValueAtTime(target, now);
    } else {
      this.masterGain.gain.setTargetAtTime(target, now, 0.06);
    }
  }

  private scheduleRhodesChord(time: number, notes: number[], durationSec: number, padMode: boolean): void {
    if (!this.ctx || !this.masterFilter) return;
    const ctx = this.ctx;
    const chordGain = ctx.createGain();
    const peak = padMode ? 0.14 : 0.16;

    chordGain.gain.setValueAtTime(0.0001, time);
    chordGain.gain.linearRampToValueAtTime(peak, time + (padMode ? 0.24 : 0.055));
    chordGain.gain.exponentialRampToValueAtTime(peak * 0.45, time + durationSec * 0.55);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, time + durationSec);
    chordGain.connect(this.masterFilter);

    notes.forEach((midi, idx) => {
      // Slight human strum offset + gentle lo-fi detune
      const noteStart = time + idx * (padMode ? 0.03 : 0.018);
      const freq = midiToFreq(midi);

      const osc = ctx.createOscillator();
      osc.type = padMode ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.detune.setValueAtTime((idx % 2 === 0 ? 1 : -1) * 4.5, noteStart);

      // Soft warm second harmonic for electric piano bell tone
      const harmonic = ctx.createOscillator();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, noteStart);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(padMode ? 0.05 : 0.1, noteStart);
      harmGain.gain.exponentialRampToValueAtTime(0.001, noteStart + Math.min(0.65, durationSec * 0.45));

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 1 / Math.max(3, notes.length);

      osc.connect(voiceGain);
      harmonic.connect(harmGain);
      harmGain.connect(voiceGain);
      voiceGain.connect(chordGain);

      osc.start(noteStart);
      harmonic.start(noteStart);
      osc.stop(time + durationSec + 0.08);
      harmonic.stop(time + durationSec + 0.08);
    });
  }

  private scheduleBass(time: number, midi: number, durationSec: number): void {
    if (!this.ctx || !this.masterFilter) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(midiToFreq(midi), time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.24, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + durationSec);

    osc.connect(gain);
    gain.connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + durationSec + 0.05);
  }

  private scheduleMelodyNote(time: number, midi: number, durationSec: number): void {
    if (!this.ctx || !this.masterFilter) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(midiToFreq(midi), time);
    osc.detune.setValueAtTime((Math.random() - 0.5) * 7, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.075, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + durationSec);

    osc.connect(gain);
    gain.connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + durationSec + 0.05);
  }

  private scheduleKick(time: number): void {
    if (!this.ctx || !this.masterFilter) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(118, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.26, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

    osc.connect(gain);
    gain.connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  private scheduleSnare(time: number): void {
    if (!this.ctx || !this.masterFilter || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 1.1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.11, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilter);

    const offset = Math.random() * 2.5;
    src.start(time, offset, 0.16);
  }

  private scheduleHat(time: number, accent: boolean): void {
    if (!this.ctx || !this.masterFilter || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4600;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(accent ? 0.045 : 0.025, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilter);

    const offset = Math.random() * 2.5;
    src.start(time, offset, 0.07);
  }

  private scheduleStep(stepIndex: number, stepTime: number): void {
    const pattern = TRACK_PATTERNS[this.trackId];
    const stepInBar = stepIndex % 16;
    const barIndex = Math.floor(stepIndex / 16) % pattern.chords.length;
    const beatSec = 60 / pattern.bpm;
    const barSec = beatSec * 4;

    // Subtle swing on off-beat 16th notes
    const swingOffset = stepInBar % 2 === 1 ? (beatSec / 4) * pattern.swing : 0;
    const t = stepTime + swingOffset;

    if (stepInBar === 0) {
      this.scheduleRhodesChord(t, pattern.chords[barIndex], barSec * 0.96, Boolean(pattern.padMode));
      this.scheduleBass(t, pattern.bassRoots[barIndex], barSec * 0.55);
    } else if (stepInBar === 10 && !pattern.padMode) {
      // Gentle syncopated bass pickup
      this.scheduleBass(t, pattern.bassRoots[barIndex] + 7, beatSec * 1.1);
    }

    if (pattern.kickSteps.includes(stepInBar)) {
      this.scheduleKick(t);
    }
    if (pattern.snareSteps.includes(stepInBar)) {
      this.scheduleSnare(t);
    }
    if (pattern.hatSteps.includes(stepInBar)) {
      this.scheduleHat(t, stepInBar % 4 === 2);
    }

    // Sparse, meditative pentatonic notes on select off-beats
    if (
      (stepInBar === 2 || stepInBar === 6 || stepInBar === 11 || stepInBar === 14) &&
      ((stepIndex * 7 + barIndex * 3) % 5 === 0 || (stepInBar === 11 && barIndex % 2 === 1))
    ) {
      const noteIdx = (stepIndex + barIndex * 2) % pattern.melodyPool.length;
      this.scheduleMelodyNote(t + 0.012, pattern.melodyPool[noteIdx], beatSec * 1.5);
    }
  }

  private runScheduler(): void {
    if (!this.ctx || !this.playing) return;
    const pattern = TRACK_PATTERNS[this.trackId];
    const stepDuration = 60 / pattern.bpm / 4; // 16th note
    const lookaheadSec = 0.2;

    while (this.nextStepTime < this.ctx.currentTime + lookaheadSec) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 64;
    }
  }

  public play(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const pattern = TRACK_PATTERNS[this.trackId];
    if (this.masterFilter) {
      this.masterFilter.frequency.setTargetAtTime(pattern.filterHz, ctx.currentTime, 0.1);
    }
    if (this.delayNode) {
      this.delayNode.delayTime.setTargetAtTime((60 / pattern.bpm) * 0.75, ctx.currentTime, 0.1);
    }

    this.playing = true;
    this.nextStepTime = ctx.currentTime + 0.06;
    this.startAmbientNoise();
    this.updateMasterVolume();

    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
    }
    this.schedulerId = window.setInterval(() => this.runScheduler(), 75);
  }

  public pause(): void {
    this.playing = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.updateMasterVolume();
    this.stopAmbientNoise();
  }

  public setTrack(trackId: LofiTrackMeta['id']): void {
    if (this.trackId === trackId) return;
    this.trackId = trackId;
    this.currentStep = 0;

    if (this.ctx && this.masterFilter) {
      const pattern = TRACK_PATTERNS[trackId];
      this.masterFilter.frequency.setTargetAtTime(pattern.filterHz, this.ctx.currentTime, 0.12);
      if (this.delayNode) {
        this.delayNode.delayTime.setTargetAtTime((60 / pattern.bpm) * 0.75, this.ctx.currentTime, 0.12);
      }
      if (this.playing) {
        this.nextStepTime = this.ctx.currentTime + 0.05;
        this.startAmbientNoise();
      }
    }
  }

  public setVolume(nextVol: number): void {
    this.volume = Math.max(0, Math.min(1, nextVol));
    if (this.volume > 0 && this.muted) {
      this.muted = false;
    }
    this.updateMasterVolume();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateMasterVolume();
  }

  public dispose(): void {
    this.pause();
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    this.masterGain = null;
    this.masterFilter = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayWet = null;
    this.noiseBuffer = null;
  }
}
