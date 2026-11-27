import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  LOFI_TRACKS,
  LofiMusicEngine,
  type LofiTrackMeta,
} from '../../utils/lofiMusicEngine';

const STORAGE_KEY = 'pilot_hangar_lofi_prefs_v1';

interface StoredLofiPrefs {
  trackId?: LofiTrackMeta['id'];
  volume?: number;
  muted?: boolean;
}

function readStoredPrefs(): {
  trackId: LofiTrackMeta['id'];
  volume: number;
  muted: boolean;
} {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredLofiPrefs;
      const validTrack = LOFI_TRACKS.some((t) => t.id === parsed.trackId)
        ? (parsed.trackId as LofiTrackMeta['id'])
        : 'midnight_hangar';
      const validVol =
        typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)
          ? Math.max(0, Math.min(1, parsed.volume))
          : 0.45;
      return {
        trackId: validTrack,
        volume: validVol,
        muted: Boolean(parsed.muted),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return { trackId: 'midnight_hangar', volume: 0.45, muted: false };
}

export function HangarLofiPlayer() {
  const prefersReducedMotion = useReducedMotion();
  const initialPrefs = useRef(readStoredPrefs());

  const [isPlaying, setIsPlaying] = useState(false);
  const [trackId, setTrackId] = useState<LofiTrackMeta['id']>(initialPrefs.current.trackId);
  const [volume, setVolume] = useState<number>(initialPrefs.current.volume);
  const [muted, setMuted] = useState<boolean>(initialPrefs.current.muted);

  const engineRef = useRef<LofiMusicEngine | null>(null);

  useEffect(() => {
    const engine = new LofiMusicEngine();
    engine.setTrack(initialPrefs.current.trackId);
    engine.setVolume(initialPrefs.current.volume);
    engine.setMuted(initialPrefs.current.muted);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ trackId, volume, muted })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [trackId, volume, muted]);

  const currentTrackIndex = LOFI_TRACKS.findIndex((t) => t.id === trackId);
  const currentTrack = LOFI_TRACKS[currentTrackIndex >= 0 ? currentTrackIndex : 0];

  const handleTogglePlay = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      engine.setTrack(trackId);
      engine.setVolume(volume);
      engine.setMuted(muted);
      engine.play();
      setIsPlaying(true);
    }
  };

  const handleSelectTrack = (nextId: LofiTrackMeta['id']) => {
    setTrackId(nextId);
    const engine = engineRef.current;
    if (!engine) return;
    engine.setTrack(nextId);
    if (!isPlaying) {
      engine.setVolume(volume);
      engine.setMuted(muted);
      engine.play();
      setIsPlaying(true);
    }
  };

  const handleStepTrack = (delta: -1 | 1) => {
    const idx = currentTrackIndex >= 0 ? currentTrackIndex : 0;
    const nextIdx = (idx + delta + LOFI_TRACKS.length) % LOFI_TRACKS.length;
    handleSelectTrack(LOFI_TRACKS[nextIdx].id);
  };

  const handleVolumeChange = (nextVolume: number) => {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVolume(clamped);
    if (clamped > 0 && muted) {
      setMuted(false);
      engineRef.current?.setMuted(false);
    }
    engineRef.current?.setVolume(clamped);
  };

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    engineRef.current?.setMuted(nextMuted);
  };

  const effectivePercent = muted ? 0 : Math.round(volume * 100);
  const VolumeIcon =
    muted || volume <= 0.01 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5">
      {/* Top Row: Play Controls + Track Info + Volume Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleStepTrack(-1)}
              aria-label="Bài nhạc trước"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Tạm dừng nhạc nền Lo-Fi' : 'Phát nhạc nền Lo-Fi'}
              aria-pressed={isPlaying}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                isPlaying
                  ? 'bg-[#FF6B00] hover:bg-[#FF7E1F] text-white'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleStepTrack(1)}
              aria-label="Bài nhạc tiếp theo"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Headphones className="w-3.5 h-3.5 text-[#FF6B00] dark:text-[#FF8524] shrink-0" />
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {currentTrack.title}
              </span>
              {/* Subtle audio level bars while actively playing */}
              {isPlaying && !muted && !prefersReducedMotion && (
                <span
                  className="inline-flex items-end gap-0.5 h-3 shrink-0"
                  aria-hidden="true"
                >
                  {[0, 1, 2].map((bar) => (
                    <motion.span
                      key={bar}
                      className="w-0.5 h-full rounded-full origin-bottom"
                      style={{ backgroundColor: currentTrack.accentHex }}
                      animate={{ scaleY: [0.28, 1, 0.42, 0.86, 0.28] }}
                      transition={{
                        duration: 0.95 + bar * 0.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: bar * 0.14,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="truncate">{currentTrack.subtitleVi}</span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className="whitespace-nowrap">{currentTrack.bpm} BPM</span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className="whitespace-nowrap">{currentTrack.ambientLabelVi}</span>
            </div>
          </div>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 shrink-0 sm:pl-2">
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Bật tiếng nhạc nền' : 'Tắt tiếng nhạc nền'}
            aria-pressed={muted}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <VolumeIcon className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={effectivePercent}
            onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
            aria-label="Âm lượng nhạc nền Lo-Fi"
            className="w-24 sm:w-28 h-1.5 rounded-full accent-[#FF6B00] bg-slate-200 dark:bg-slate-700 cursor-pointer"
          />

          <span className="w-9 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
            {effectivePercent}%
          </span>
        </div>
      </div>

      {/* Track Selector Strip */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800"
        role="tablist"
        aria-label="Chọn bản nhạc Lo-Fi học tập"
      >
        {LOFI_TRACKS.map((track) => {
          const active = track.id === trackId;
          return (
            <button
              key={track.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectTrack(track.id)}
              className={`px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                active
                  ? 'border-[#FF6B00]/60 bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 text-[#D94E00] dark:text-[#FF8524]'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-bold truncate whitespace-nowrap">
                {track.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                {track.bpm} BPM · {track.ambientLabelVi}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
