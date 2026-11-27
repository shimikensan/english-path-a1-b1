import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Gem, Gift, Trophy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { playMissionCompleteChime } from '../utils/cockpitAudio';
import {
  claimAllAvailableDailyRewards,
  computeDailyChallengesState,
  DAILY_CHALLENGES_CELEBRATE_EVENT,
  DAILY_CHALLENGES_UPDATED_EVENT,
  markDailyCelebrationShown,
  type DailyCelebrationTriggerDetail,
} from '../utils/dailyChallenges';

interface FireworkRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
}

interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  twinklePhase: number;
}

const FIREWORK_PALETTES = [
  ['#FF6B00', '#FFB347', '#FFF3B0'],
  ['#38BDF8', '#7DD3FC', '#E0F2FE'],
  ['#10B981', '#6EE7B7', '#D1FAE5'],
  ['#F59E0B', '#FDE68A', '#FFFBEB'],
  ['#FB7185', '#FDA4AF', '#FFE4E6'],
];

function FireworksCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Reduced-motion accessibility: render a gentle static celebratory starburst constellation
    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, width, height);
      const anchors = [
        { x: width * 0.2, y: height * 0.24, palette: FIREWORK_PALETTES[0] },
        { x: width * 0.8, y: height * 0.22, palette: FIREWORK_PALETTES[1] },
        { x: width * 0.25, y: height * 0.72, palette: FIREWORK_PALETTES[2] },
        { x: width * 0.78, y: height * 0.74, palette: FIREWORK_PALETTES[3] },
      ];
      for (const anchor of anchors) {
        for (let i = 0; i < 24; i += 1) {
          const angle = (Math.PI * 2 * i) / 24;
          const dist = 28 + (i % 3) * 18;
          ctx.beginPath();
          ctx.fillStyle = anchor.palette[i % anchor.palette.length];
          ctx.globalAlpha = 0.7;
          ctx.arc(
            anchor.x + Math.cos(angle) * dist,
            anchor.y + Math.sin(angle) * dist,
            2.4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    const rockets: FireworkRocket[] = [];
    const sparks: FireworkSpark[] = [];
    let rafId = 0;
    let lastTime = performance.now();
    let launchCooldown = 0;
    const timeouts: number[] = [];

    const spawnBurst = (bx: number, by: number, paletteIdx?: number) => {
      const palette =
        FIREWORK_PALETTES[
          paletteIdx !== undefined
            ? paletteIdx % FIREWORK_PALETTES.length
            : Math.floor(Math.random() * FIREWORK_PALETTES.length)
        ];
      const count = 48 + Math.floor(Math.random() * 24);
      const isRing = Math.random() < 0.35;

      for (let i = 0; i < count; i += 1) {
        const angle = isRing
          ? (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.08
          : Math.random() * Math.PI * 2;
        const speed = isRing
          ? 2.8 + Math.random() * 1.4
          : 1.4 + Math.random() * 4.4;
        sparks.push({
          x: bx,
          y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.011 + Math.random() * 0.011,
          size: 1.8 + Math.random() * 2.1,
          color: palette[Math.floor(Math.random() * palette.length)],
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const launchRocket = (xRatio?: number) => {
      const startX =
        xRatio !== undefined
          ? width * xRatio
          : width * (0.14 + Math.random() * 0.72);
      const targetY = height * (0.14 + Math.random() * 0.34);
      const palette =
        FIREWORK_PALETTES[Math.floor(Math.random() * FIREWORK_PALETTES.length)];
      rockets.push({
        x: startX,
        y: height + 10,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -(8.8 + Math.random() * 3.4),
        targetY,
        color: palette[0],
        trail: [],
      });
    };

    // Immediate celebratory opening salvo around left, right, and upper-center
    spawnBurst(width * 0.22, height * 0.28, 0);
    timeouts.push(
      window.setTimeout(() => spawnBurst(width * 0.78, height * 0.25, 1), 220),
      window.setTimeout(() => spawnBurst(width * 0.5, height * 0.19, 3), 460),
      window.setTimeout(() => launchRocket(0.18), 640),
      window.setTimeout(() => launchRocket(0.82), 880)
    );

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 2.2);
      lastTime = now;

      // Clear softly while preserving transparent backdrop over the modal scrim
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';

      launchCooldown -= dt * 16.67;
      if (launchCooldown <= 0 && rockets.length < 4 && sparks.length < 420) {
        launchRocket();
        launchCooldown = 580 + Math.random() * 480;
      }

      // Update rockets
      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 7) r.trail.shift();

        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.vy += 0.11 * dt;

        // Draw rocket tail
        for (let t = 0; t < r.trail.length; t += 1) {
          const pt = r.trail[t];
          const ratio = (t + 1) / r.trail.length;
          ctx.beginPath();
          ctx.fillStyle = r.color;
          ctx.globalAlpha = ratio * 0.65;
          ctx.arc(pt.x, pt.y, 1.5 + ratio * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        if (r.y <= r.targetY || r.vy >= -0.8) {
          spawnBurst(r.x, r.y);
          rockets.splice(i, 1);
        }
      }

      // Update burst sparks
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= Math.pow(0.972, dt);
        s.vy = s.vy * Math.pow(0.972, dt) + 0.065 * dt;
        s.alpha -= s.decay * dt;
        s.twinklePhase += 0.28 * dt;

        if (s.alpha <= 0.02) {
          sparks.splice(i, 1);
          continue;
        }

        const flicker = 0.72 + 0.28 * Math.sin(s.twinklePhase);
        ctx.beginPath();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.alpha * flicker);
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(rafId);
      timeouts.forEach((id) => window.clearTimeout(id));
      ctx.clearRect(0, 0, width, height);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[95]"
    />
  );
}

export function DailyChallengesCelebration() {
  const {
    profile,
    firebaseUser,
    quizResults,
    vocabMap,
    awardBonusGems,
    triggerGemFlight,
  } = useApp();

  const uid = profile?.uid || firebaseUser?.uid || '';
  const [syncTick, setSyncTick] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [alreadyAwardedAmount, setAlreadyAwardedAmount] = useState<number | null>(null);
  const prevAllCompletedRef = useRef<boolean | null>(null);
  const prevUidDateRef = useRef<string>('');

  useEffect(() => {
    const handleSync = () => setSyncTick((n) => n + 1);
    const handleManualCelebrate = (ev: Event) => {
      const customEv = ev as CustomEvent<DailyCelebrationTriggerDetail>;
      const detail = customEv.detail ?? {};
      if (detail.alreadyAwarded && typeof detail.awardedGems === 'number') {
        setAlreadyAwardedAmount(detail.awardedGems);
      } else {
        setAlreadyAwardedAmount(null);
      }
      setIsOpen(true);
      playMissionCompleteChime();
    };

    window.addEventListener(DAILY_CHALLENGES_UPDATED_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener(DAILY_CHALLENGES_CELEBRATE_EVENT, handleManualCelebrate);

    return () => {
      window.removeEventListener(DAILY_CHALLENGES_UPDATED_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener(DAILY_CHALLENGES_CELEBRATE_EVENT, handleManualCelebrate);
    };
  }, []);

  const summary = useMemo(
    () =>
      computeDailyChallengesState({
        uid,
        quizResults,
        vocabMap,
      }),
    // syncTick guarantees immediate refresh when local daily counters or claims change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, quizResults, vocabMap, syncTick]
  );

  // Automatically trigger celebration popup once per day when all 3 challenges become completed
  useEffect(() => {
    if (!uid) {
      prevAllCompletedRef.current = null;
      prevUidDateRef.current = '';
      return;
    }

    const sessionKey = `${uid}_${summary.dateKey}`;
    if (prevUidDateRef.current !== sessionKey) {
      prevUidDateRef.current = sessionKey;
      prevAllCompletedRef.current = summary.allCompleted;
      // Do not fire unsolicited popup on initial load if already shown today
      return;
    }

    const wasAllCompleted = prevAllCompletedRef.current === true;
    prevAllCompletedRef.current = summary.allCompleted;

    if (!wasAllCompleted && summary.allCompleted && !summary.celebrationShown) {
      markDailyCelebrationShown(uid);
      setAlreadyAwardedAmount(null);
      setIsOpen(true);
      playMissionCompleteChime();
    }
  }, [uid, summary.dateKey, summary.allCompleted, summary.celebrationShown]);

  const handleClose = useCallback(() => {
    if (uid && summary.allCompleted && !summary.celebrationShown) {
      markDailyCelebrationShown(uid);
    }
    setIsOpen(false);
  }, [uid, summary.allCompleted, summary.celebrationShown]);

  // Close with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  const handleClaimAndClose = async () => {
    if (!uid || claiming) return;

    if (summary.unclaimedReadyGems > 0) {
      setClaiming(true);
      try {
        const { totalClaimedGems } = claimAllAvailableDailyRewards({
          uid,
          quizResults,
          vocabMap,
        });
        setSyncTick((n) => n + 1);
        if (totalClaimedGems > 0) {
          await awardBonusGems(
            totalClaimedGems,
            'Hoàn thành trọn bộ 3 thử thách hàng ngày'
          );
          triggerGemFlight({
            amount: totalClaimedGems,
            lessonCompleted: true,
            label: 'Hoàn tất 3/3 thử thách ngày',
          });
        }
      } finally {
        setClaiming(false);
        setIsOpen(false);
      }
    } else {
      handleClose();
    }
  };

  const displayRewardGems =
    summary.unclaimedReadyGems > 0
      ? summary.unclaimedReadyGems
      : alreadyAwardedAmount ?? summary.totalPossibleGems;

  const isPendingClaim = summary.unclaimedReadyGems > 0;

  return (
    <>
      <FireworksCanvas active={isOpen} />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="daily-celebration-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-celebration-title"
            className="fixed inset-0 z-[96] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={handleClose}
          >
            <motion.div
              key="daily-celebration-card"
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Đóng thông báo chúc mừng"
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Celebration Block */}
              <div className="px-6 pt-7 pb-5 text-center border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-orange-50/90 via-amber-50/40 to-transparent dark:from-orange-500/12 dark:via-amber-500/5 dark:to-transparent">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Trophy className="w-7 h-7" />
                </div>

                <p className="mt-4 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
                  Thử thách hàng ngày · 3/3 hoàn thành
                </p>
                <h2
                  id="daily-celebration-title"
                  className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance"
                >
                  Chúc mừng Cơ trưởng!
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bạn đã chinh phục trọn vẹn cả 3 nhiệm vụ học tập hôm nay.
                </p>

                {/* Primary Gem Reward Callout */}
                <div className="mt-4 inline-flex items-center gap-2 text-2xl font-extrabold text-sky-600 dark:text-sky-400 tabular-nums">
                  <Gem className="w-6 h-6 shrink-0" />
                  <span>+{displayRewardGems} Ngọc</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isPendingClaim
                    ? 'Phần thưởng đang chờ bạn nhận ngay hôm nay'
                    : 'Đã cộng thẳng vào kho Ngọc & đồng bộ bảng xếp hạng'}
                </p>
              </div>

              {/* Completed Missions Hairline List */}
              <div className="px-6 py-4 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {summary.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                        {item.titleVi}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 tabular-nums shrink-0">
                      +{item.rewardGems} Ngọc
                    </span>
                  </div>
                ))}

                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Gift className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524] shrink-0" />
                    <span className="text-slate-900 dark:text-white font-semibold truncate">
                      Thưởng hoàn tất 3/3 nhiệm vụ
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#D94E00] dark:text-[#FF8524] tabular-nums shrink-0">
                    +{summary.allClearBonusGems} Ngọc
                  </span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  disabled={claiming}
                  onClick={() => void handleClaimAndClose()}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#D94E00] disabled:opacity-60 text-white text-sm font-bold transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <Gem className="w-4 h-4 shrink-0" />
                  {claiming
                    ? 'Đang cộng thưởng...'
                    : isPendingClaim
                    ? `Nhận ngay +${summary.unclaimedReadyGems} Ngọc`
                    : 'Tuyệt vời, tiếp tục học'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
