import { useEffect, useMemo, useState } from 'react';
import { Award, Check, Flame, PlayCircle, Sparkles, Trophy, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface StudyStreakWidgetProps {
  uid?: string;
  streakDays: number;
  studiedToday: boolean;
  dailyGoalMinutes: number;
  onStartStudy: () => void;
}

interface ConfettiParticle {
  id: number;
  x: number;
  yPeak: number;
  yEnd: number;
  rotate: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = [
  '#FF6B00',
  '#FF9A3C',
  '#F59E0B',
  '#FACC15',
  '#10B981',
  '#38BDF8',
  '#F43F5E',
];

function buildCelebrationParticles(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const spread = ((i / Math.max(1, count - 1)) - 0.5) * 2; // -1..1
    const jitter = ((i * 37) % 19) - 9;
    return {
      id: i,
      x: spread * 240 + jitter * 4,
      yPeak: -80 - ((i * 29) % 110),
      yEnd: 110 + ((i * 23) % 90),
      rotate: ((i % 2 === 0 ? 1 : -1) * (180 + ((i * 47) % 360))),
      delay: (i % 7) * 0.045,
      duration: 1.5 + ((i * 13) % 7) * 0.14,
      size: 6 + (i % 5) * 2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      shape: i % 3 === 0 ? 'circle' : 'rect',
    };
  });
}

function getCelebratedStorageKey(uid: string | undefined, milestone: number): string {
  return `pilot_streak_celebrated_${uid || 'guest'}_m${milestone}`;
}

export function StudyStreakWidget({
  uid,
  streakDays,
  studiedToday,
  dailyGoalMinutes,
  onStartStudy,
}: StudyStreakWidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const safeStreak = Math.max(0, Math.floor(streakDays));
  const reachedSevenDays = safeStreak >= 7;
  const currentMilestone = reachedSevenDays ? Math.floor(safeStreak / 7) * 7 : 7;

  // Progress inside the 7-day cycle (0..7; if >= 7 and multiple of 7 -> 7/7 completed)
  const daysInSevenCycle = useMemo(() => {
    if (safeStreak === 0) return 0;
    if (safeStreak >= 7) {
      const mod = safeStreak % 7;
      return mod === 0 ? 7 : mod;
    }
    return safeStreak;
  }, [safeStreak]);

  const remainingToSeven = reachedSevenDays ? 0 : Math.max(0, 7 - safeStreak);
  const particles = useMemo(() => buildCelebrationParticles(28), []);

  const [celebrating, setCelebrating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);

  // Automatically trigger the 7-day celebration animation once per 7-day milestone reached
  useEffect(() => {
    if (!reachedSevenDays || !uid) return;
    const key = getCelebratedStorageKey(uid, currentMilestone);
    try {
      if (window.localStorage.getItem(key) === '1') {
        return;
      }
      window.localStorage.setItem(key, '1');
    } catch {
      // Ignore storage restrictions
    }
    setIsPreviewMode(false);
    setCelebrationKey((k) => k + 1);
    setCelebrating(true);
  }, [reachedSevenDays, uid, currentMilestone]);

  // Auto-dismiss celebration overlay after 6.5s so the dashboard stays calm
  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => {
      setCelebrating(false);
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [celebrating, celebrationKey]);

  const triggerCelebration = (preview: boolean) => {
    setIsPreviewMode(preview);
    setCelebrationKey((k) => k + 1);
    setCelebrating(true);
  };

  // Compute day labels for the 7-day track
  const sevenDaySlots = useMemo(() => {
    const cycleStartDay =
      reachedSevenDays && safeStreak > 7 && safeStreak % 7 !== 0
        ? Math.floor(safeStreak / 7) * 7 + 1
        : reachedSevenDays && safeStreak > 7
          ? safeStreak - 6
          : 1;

    return Array.from({ length: 7 }, (_, index) => {
      const dayNumber = cycleStartDay + index;
      const isMilestoneDay = dayNumber % 7 === 0;
      const completed =
        reachedSevenDays && safeStreak % 7 === 0
          ? true
          : index < daysInSevenCycle;
      const isCurrentFocus =
        !completed && index === daysInSevenCycle;
      return {
        index,
        dayNumber,
        isMilestoneDay,
        completed,
        isCurrentFocus,
      };
    });
  }, [reachedSevenDays, safeStreak, daysInSevenCycle]);

  const progressPercent = Math.min(100, Math.round((daysInSevenCycle / 7) * 100));

  return (
    <section
      aria-label="Chuỗi ngày học tập"
      className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6"
    >
      {/* Subtle warm radial glow behind the flame zone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full bg-gradient-to-br from-[#FF6B00]/12 via-amber-400/8 to-transparent dark:from-[#FF6B00]/18 dark:via-amber-500/8 dark:to-transparent blur-2xl"
      />

      {/* Top Row: Flame Emblem, Streak Counter & Primary Actions */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          {/* Animated Flame Icon Emblem */}
          <div className="relative shrink-0 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FF6B00] via-[#FF8524] to-amber-500 text-white shadow-[0_8px_24px_rgba(255,107,0,0.3)]">
            {!prefersReducedMotion && safeStreak > 0 && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-2xl border-2 border-[#FF9A3C]/70"
                animate={{ scale: [1, 1.14, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <motion.div
              animate={
                prefersReducedMotion || safeStreak === 0
                  ? undefined
                  : {
                      scale: [1, 1.09, 0.97, 1.05, 1],
                      rotate: [0, -3, 3, -1.5, 0],
                    }
              }
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10"
            >
              <Flame className="w-8 h-8 sm:w-9 sm:h-9 fill-amber-100/90 text-white drop-shadow-xs" />
            </motion.div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
                Chuỗi ngày học tập
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {studiedToday ? 'Hôm nay đã điểm danh học' : 'Chưa học hôm nay'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Mục tiêu {dailyGoalMinutes} phút/ngày</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {safeStreak} ngày liên tiếp
              </h3>
              {reachedSevenDays && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Trophy className="w-3.5 h-3.5" />
                  Đạt mốc {currentMilestone} ngày
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {reachedSevenDays
                ? `Tuyệt vời! Bạn đã duy trì kỷ luật học tiếng Anh ${safeStreak} ngày liên tiếp — tiếp tục giữ vững ngọn lửa nhé.`
                : `Còn ${remainingToSeven} ngày nữa để hoàn thành mốc 7 ngày liên tiếp và mở khóa chúc mừng danh hiệu Phi công kiên trì.`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!studiedToday && (
            <button
              type="button"
              onClick={onStartStudy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shadow-[0_0_16px_rgba(255,107,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
            >
              <PlayCircle className="w-4 h-4 shrink-0" />
              Học ngay giữ chuỗi
            </button>
          )}

          <button
            type="button"
            onClick={() => triggerCelebration(!reachedSevenDays)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
              reachedSevenDays
                ? 'border border-amber-400/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-950/70'
                : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B00] dark:text-[#FF8524] shrink-0" />
            {reachedSevenDays ? 'Phát lại chúc mừng 7 ngày' : 'Xem trước mốc 7 ngày'}
          </button>
        </div>
      </div>

      {/* 7-Day Milestone Progress Track */}
      <div className="relative z-10 mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            Tiến trình mốc 7 ngày liên tiếp ({daysInSevenCycle}/7 ngày)
          </span>
          <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
            {progressPercent}%
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {sevenDaySlots.map((slot) => {
            const isGoldMilestone = slot.isMilestoneDay;
            return (
              <button
                key={slot.dayNumber}
                type="button"
                onClick={
                  isGoldMilestone
                    ? () => triggerCelebration(!reachedSevenDays)
                    : undefined
                }
                disabled={!isGoldMilestone}
                title={
                  isGoldMilestone
                    ? 'Nhấn để xem hiệu ứng chúc mừng mốc 7 ngày liên tiếp'
                    : `Ngày ${slot.dayNumber}`
                }
                className={`group flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all tabular-nums ${
                  slot.completed
                    ? isGoldMilestone
                      ? 'border-amber-400 dark:border-amber-500/70 bg-gradient-to-b from-amber-50 to-orange-50/80 dark:from-amber-950/50 dark:to-orange-950/30 text-amber-800 dark:text-amber-300 cursor-pointer hover:scale-[1.03]'
                      : 'border-[#FF6B00]/35 dark:border-[#FF6B00]/40 bg-[#FF6B00]/[0.07] dark:bg-[#FF6B00]/[0.12] text-[#D94E00] dark:text-[#FF8524]'
                    : slot.isCurrentFocus
                      ? 'border-dashed border-[#FF6B00]/60 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                      : isGoldMilestone
                        ? 'border-dashed border-amber-400/70 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 cursor-pointer hover:border-amber-500'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform ${
                    slot.completed
                      ? isGoldMilestone
                        ? 'bg-gradient-to-br from-amber-400 to-[#FF6B00] text-white shadow-xs'
                        : 'bg-[#FF6B00] text-white'
                      : isGoldMilestone
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {slot.completed ? (
                    isGoldMilestone ? (
                      <Trophy className="w-4 h-4" />
                    ) : (
                      <Flame className="w-4 h-4 fill-amber-100/80" />
                    )
                  ) : isGoldMilestone ? (
                    <Award className="w-4 h-4" />
                  ) : (
                    <Check className="w-3.5 h-3.5 opacity-40" />
                  )}
                </div>
                <span className="text-[11px] font-bold leading-none whitespace-nowrap">
                  {isGoldMilestone ? `Ngày ${slot.dayNumber}` : `N${slot.dayNumber}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7-Day Consecutive Streak Celebration Animation Overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            key={celebrationKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Chúc mừng đạt mốc 7 ngày học liên tiếp"
          >
            {/* Confetti burst layer (compositor-only transform & opacity) */}
            {!prefersReducedMotion && (
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 overflow-hidden flex items-center justify-center"
              >
                {particles.map((p) => (
                  <motion.span
                    key={`${celebrationKey}-${p.id}`}
                    initial={{ x: 0, y: 20, scale: 0, rotate: 0, opacity: 1 }}
                    animate={{
                      x: p.x,
                      y: [20, p.yPeak, p.yEnd],
                      scale: [0, 1.15, 0.9],
                      rotate: p.rotate,
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      width: p.size,
                      height: p.shape === 'circle' ? p.size : p.size * 1.6,
                      backgroundColor: p.color,
                      borderRadius: p.shape === 'circle' ? 999 : 3,
                    }}
                    className="absolute"
                  />
                ))}
              </div>
            )}

            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86, y: 18 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-[#0D1F38] to-[#07111F] border border-amber-400/50 p-6 sm:p-7 text-center text-white shadow-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setCelebrating(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                aria-label="Đóng thông báo chúc mừng"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Animated Flame Crest */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center mb-4">
                {!prefersReducedMotion && (
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF6B00]/45 to-amber-300/35 blur-md"
                    animate={{ scale: [1, 1.28, 1], opacity: [0.65, 0.95, 0.65] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <motion.div
                  initial={prefersReducedMotion ? undefined : { scale: 0.5, rotate: -15 }}
                  animate={prefersReducedMotion ? undefined : { scale: [0.5, 1.18, 1], rotate: [ -15, 6, 0 ] }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 w-18 h-18 rounded-2xl bg-gradient-to-br from-amber-400 via-[#FF6B00] to-[#D94E00] flex items-center justify-center shadow-[0_0_32px_rgba(255,107,0,0.55)] ring-2 ring-amber-300/70"
                >
                  <Flame className="w-10 h-10 text-white fill-amber-100" />
                </motion.div>
              </div>

              <p className="text-xs font-bold text-amber-300 tracking-wide">
                {isPreviewMode
                  ? 'Xem trước hiệu ứng phần thưởng · Mốc 7 ngày liên tiếp'
                  : `Cột mốc xuất sắc · ${currentMilestone} ngày học liên tiếp`}
              </p>

              <h4 className="mt-2 text-2xl font-extrabold tracking-tight text-white text-balance">
                {isPreviewMode
                  ? 'Chinh phục 7 ngày liên tiếp!'
                  : `Chúc mừng! Đạt chuỗi ${safeStreak} ngày!`}
              </h4>

              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                {isPreviewMode
                  ? `Bạn đang ở ngày thứ ${safeStreak}/7. Chỉ cần duy trì thêm ${remainingToSeven} ngày học liên tiếp nữa để chính thức thắp sáng huy hiệu ngọn lửa 7 ngày!`
                  : 'Sự bền bỉ mỗi ngày của bạn đã tạo nên thói quen tiếng Anh vững chắc cùng Cậu bé Pilot. Tiếp tục bay cao ở chặng kế tiếp nhé!'}
              </p>

              {/* 7 lit mini flames */}
              <div className="mt-5 flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <motion.div
                    key={day}
                    initial={prefersReducedMotion ? undefined : { scale: 0, y: 10 }}
                    animate={prefersReducedMotion ? undefined : { scale: 1, y: 0 }}
                    transition={{ delay: 0.12 + day * 0.06, duration: 0.28 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      day === 7
                        ? 'bg-gradient-to-br from-amber-300 to-[#FF6B00] text-slate-950 ring-2 ring-amber-200/80'
                        : 'bg-[#FF6B00]/25 border border-[#FF8524]/60 text-amber-300'
                    }`}
                  >
                    {day === 7 ? (
                      <Trophy className="w-4 h-4" />
                    ) : (
                      <Flame className="w-4 h-4 fill-amber-300/80" />
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCelebrating(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors whitespace-nowrap"
                >
                  Tiếp tục hành trình
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
