import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Pause, Play, RotateCcw } from 'lucide-react';

interface FocusStudyTimerProps {
  dailyGoalMinutes?: number;
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function FocusStudyTimer({ dailyGoalMinutes = 20 }: FocusStudyTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [paused]);

  const safeGoalMinutes = Math.max(1, dailyGoalMinutes);
  const goalSeconds = safeGoalMinutes * 60;
  const goalProgress = Math.min(1, elapsedSeconds / goalSeconds);
  const goalReached = elapsedSeconds >= goalSeconds;

  const handleReset = () => {
    setElapsedSeconds(0);
    setPaused(false);
  };

  if (minimized) {
    return (
      <div
        role="timer"
        aria-live="off"
        aria-label="Đồng hồ tập trung"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 dark:bg-[#0B172A]/95 backdrop-blur-md border border-[#FF6B00]/45 shadow-lg shadow-slate-950/15 dark:shadow-black/40"
      >
        <Clock className="w-3.5 h-3.5 text-[#FF6B00] dark:text-[#FF8524] shrink-0" />
        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
          {formatDuration(elapsedSeconds)}
        </span>
        {paused && (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
            Tạm dừng
          </span>
        )}
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Mở rộng đồng hồ học tập"
          title="Mở rộng đồng hồ học tập"
          className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <aside
      role="timer"
      aria-live="off"
      aria-label="Đồng hồ đếm thời gian học tập"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 w-56 rounded-2xl bg-white/95 dark:bg-[#0B172A]/95 backdrop-blur-md border border-[#FF6B00]/45 shadow-xl shadow-slate-950/15 dark:shadow-black/50 p-3.5 space-y-2.5"
    >
      {/* Top row: Label + Minimize */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-[#FF6B00] dark:text-[#FF8524] shrink-0" />
          <span>Thời gian tập trung</span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          aria-label="Thu gọn đồng hồ học tập"
          title="Thu gọn đồng hồ"
          className="p-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timer Readout & Controls */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
            {formatDuration(elapsedSeconds)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {paused
              ? 'Đã tạm dừng'
              : goalReached
                ? `Đạt mục tiêu ${safeGoalMinutes} phút`
                : `Mục tiêu ${safeGoalMinutes} phút/ngày`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Tiếp tục đếm thời gian' : 'Tạm dừng đếm thời gian'}
            title={paused ? 'Tiếp tục' : 'Tạm dừng'}
            className="w-8 h-8 rounded-lg bg-[#FF6B00]/12 hover:bg-[#FF6B00]/22 border border-[#FF6B00]/40 text-[#D94E00] dark:text-[#FF8524] flex items-center justify-center transition-colors"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Đặt lại đồng hồ về 00:00"
            title="Đặt lại về 00:00"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtle Goal Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden">
        <div
          className={`h-full w-full rounded-full origin-left transition-transform duration-300 ease-out ${
            goalReached
              ? 'bg-emerald-500 dark:bg-emerald-400'
              : 'bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C]'
          }`}
          style={{ transform: `scaleX(${goalProgress})` }}
        />
      </div>
    </aside>
  );
}
