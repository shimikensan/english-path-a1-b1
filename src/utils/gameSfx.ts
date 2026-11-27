// Synthesized Web Audio API sound effects for vocabulary mini-games.

let audioCtx: AudioContext | null = null;
let sfxMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

export function setGameSfxMuted(muted: boolean): void {
  sfxMuted = muted;
}

export function isGameSfxMuted(): boolean {
  return sfxMuted;
}

function playTone(
  freq: number,
  durationSec: number,
  options?: {
    type?: OscillatorType;
    gain?: number;
    delaySec?: number;
    endFreq?: number;
  }
): void {
  if (sfxMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const start = ctx.currentTime + (options?.delaySec ?? 0);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = options?.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (options?.endFreq) {
      osc.frequency.exponentialRampToValueAtTime(options.endFreq, start + durationSec);
    }

    const peak = options?.gain ?? 0.12;
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationSec + 0.02);
  } catch {
    // Ignore Web Audio errors on restricted devices
  }
}

export function playTileClick(): void {
  playTone(540, 0.06, { type: 'triangle', gain: 0.08, endFreq: 680 });
}

export function playCorrectChime(): void {
  playTone(523.25, 0.13, { type: 'triangle', gain: 0.12, delaySec: 0 });
  playTone(659.25, 0.14, { type: 'triangle', gain: 0.12, delaySec: 0.07 });
  playTone(783.99, 0.22, { type: 'sine', gain: 0.14, delaySec: 0.14 });
}

export function playGoldClink(): void {
  playTone(987.77, 0.09, { type: 'sine', gain: 0.12, delaySec: 0 });
  playTone(1318.51, 0.24, { type: 'triangle', gain: 0.14, delaySec: 0.06 });
}

export function playHookLaunch(): void {
  playTone(360, 0.14, { type: 'sawtooth', gain: 0.05, endFreq: 190 });
}

export function playWrongBuzz(): void {
  playTone(210, 0.16, { type: 'sawtooth', gain: 0.07, endFreq: 145 });
  playTone(150, 0.18, { type: 'triangle', gain: 0.08, delaySec: 0.08, endFreq: 120 });
}

export function playLevelFanfare(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, idx) => {
    playTone(n, 0.24, { type: 'triangle', gain: 0.13, delaySec: idx * 0.09 });
  });
}

export function playAircraftFlyby(): void {
  // Jet/rotor Doppler sweep followed by celebratory triad
  playTone(180, 0.55, { type: 'sawtooth', gain: 0.055, delaySec: 0, endFreq: 520 });
  playTone(520, 0.65, { type: 'triangle', gain: 0.05, delaySec: 0.5, endFreq: 160 });
  playTone(587.33, 0.22, { type: 'triangle', gain: 0.12, delaySec: 0.18 });
  playTone(739.99, 0.22, { type: 'triangle', gain: 0.12, delaySec: 0.28 });
  playTone(880.0, 0.28, { type: 'sine', gain: 0.14, delaySec: 0.38 });
  playTone(1174.66, 0.38, { type: 'sine', gain: 0.14, delaySec: 0.48 });
}

export function playGemCascade(): void {
  const sparkleNotes = [880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  sparkleNotes.forEach((freq, idx) => {
    playTone(freq, 0.16, {
      type: idx % 2 === 0 ? 'sine' : 'triangle',
      gain: 0.075,
      delaySec: 0.48 + idx * 0.065,
      endFreq: freq * 1.04,
    });
  });
}


