import { useMemo, useState } from 'react';
import { ArrowRight, Award, Crown, Eye, Gem, Medal, RefreshCw, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PILOT_RANKS } from '../data';
import { calculateWeeklyActivityGems, resolveLeaderboardCurrentGems } from '../data/pilotGearCatalog';
import type { AppRoute, LeaderboardEntryDoc } from '../types';
import { getCurrentIsoWeekInfo, toTimestampMillis } from '../utils/helpers';
import {
  LeaderboardPilotModal,
  type RankedLeaderboardEntry,
} from './pilot3d/LeaderboardPilotModal';

interface PilotHallOfFameProps {
  onNavigate: (route: AppRoute) => void;
}

interface WeeklyRankedPilot extends RankedLeaderboardEntry {
  weeklyRank: number;
  displayGems: number;
  isExactWeekly: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface TierVisualConfig {
  rankTitle: string;
  medalIcon: typeof Crown;
  orderClass: string;
  elevationClass: string;
  cardGlowClass: string;
  cardSurfaceClass: string;
  ambientGlowStyle: string;
  conicRingStyle: string;
  spinClass: string;
  breatheClass: string;
  avatarSurfaceClass: string;
  rankNumberClass: string;
  gemTextClass: string;
  pedestalBarClass: string;
}

const TIER_VISUALS: Record<1 | 2 | 3, TierVisualConfig> = {
  1: {
    rankTitle: 'Hạng 1 · Quán quân tuần',
    medalIcon: Crown,
    orderClass: 'order-1 lg:order-2',
    elevationClass: 'lg:-mt-3 lg:pb-6',
    cardGlowClass: 'hof-card-gold',
    cardSurfaceClass:
      'bg-gradient-to-b from-amber-50/90 via-white to-white dark:from-[#261B0A]/90 dark:via-[#111E33] dark:to-[#0D1C30] border-amber-300/80 dark:border-amber-400/50',
    ambientGlowStyle:
      'radial-gradient(circle, rgba(251,191,36,0.52) 0%, rgba(255,107,0,0.24) 44%, rgba(251,191,36,0) 74%)',
    conicRingStyle:
      'conic-gradient(from 0deg, rgba(251,191,36,0.95), rgba(255,107,0,0.25), rgba(254,240,138,0.95), rgba(245,158,11,0.2), rgba(251,191,36,0.95))',
    spinClass: 'hof-aura-spin-gold',
    breatheClass: 'hof-aura-breathe-gold',
    avatarSurfaceClass:
      'bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 dark:from-amber-900/90 dark:via-[#2C1B06] dark:to-orange-950 text-amber-900 dark:text-amber-200 border-amber-400/80 dark:border-amber-300/70',
    rankNumberClass: 'text-amber-700 dark:text-amber-300',
    gemTextClass: 'text-amber-700 dark:text-amber-300',
    pedestalBarClass: 'from-amber-400 via-[#FF6B00] to-amber-300',
  },
  2: {
    rankTitle: 'Hạng 2 · Á quân tuần',
    medalIcon: Medal,
    orderClass: 'order-2 lg:order-1',
    elevationClass: 'lg:mt-4',
    cardGlowClass: 'hof-card-silver',
    cardSurfaceClass:
      'bg-gradient-to-b from-sky-50/80 via-white to-white dark:from-[#0E223B]/90 dark:via-[#101F35] dark:to-[#0D1C30] border-sky-300/75 dark:border-sky-400/45',
    ambientGlowStyle:
      'radial-gradient(circle, rgba(125,211,252,0.46) 0%, rgba(148,163,184,0.22) 48%, rgba(56,189,248,0) 74%)',
    conicRingStyle:
      'conic-gradient(from 45deg, rgba(125,211,252,0.92), rgba(148,163,184,0.22), rgba(226,232,240,0.95), rgba(56,189,248,0.22), rgba(125,211,252,0.92))',
    spinClass: 'hof-aura-spin-silver',
    breatheClass: 'hof-aura-breathe-silver',
    avatarSurfaceClass:
      'bg-gradient-to-br from-sky-100 via-slate-50 to-slate-200 dark:from-slate-700 dark:via-slate-800 dark:to-sky-950 text-slate-800 dark:text-sky-100 border-sky-300/80 dark:border-sky-300/60',
    rankNumberClass: 'text-sky-700 dark:text-sky-300',
    gemTextClass: 'text-sky-700 dark:text-sky-300',
    pedestalBarClass: 'from-slate-300 via-sky-400 to-slate-200',
  },
  3: {
    rankTitle: 'Hạng 3 · Phi công nổi bật',
    medalIcon: Award,
    orderClass: 'order-3 lg:order-3',
    elevationClass: 'lg:mt-6',
    cardGlowClass: 'hof-card-bronze',
    cardSurfaceClass:
      'bg-gradient-to-b from-orange-50/80 via-white to-white dark:from-[#24160D]/90 dark:via-[#111E33] dark:to-[#0D1C30] border-orange-300/75 dark:border-orange-400/40',
    ambientGlowStyle:
      'radial-gradient(circle, rgba(251,146,60,0.44) 0%, rgba(217,119,6,0.2) 48%, rgba(234,88,12,0) 74%)',
    conicRingStyle:
      'conic-gradient(from 90deg, rgba(251,146,60,0.9), rgba(180,83,9,0.22), rgba(253,186,116,0.92), rgba(234,88,12,0.2), rgba(251,146,60,0.9))',
    spinClass: 'hof-aura-spin-bronze',
    breatheClass: 'hof-aura-breathe-bronze',
    avatarSurfaceClass:
      'bg-gradient-to-br from-orange-100 via-amber-50 to-orange-200 dark:from-orange-950 dark:via-[#2A180D] dark:to-amber-950 text-orange-900 dark:text-orange-200 border-orange-400/75 dark:border-orange-400/60',
    rankNumberClass: 'text-orange-700 dark:text-orange-300',
    gemTextClass: 'text-orange-700 dark:text-orange-300',
    pedestalBarClass: 'from-orange-400 via-amber-500 to-orange-300',
  },
};

export function PilotHallOfFame({ onNavigate }: PilotHallOfFameProps) {
  const {
    leaderboard,
    leaderboardLoading,
    refreshLeaderboard,
    profile,
    lessons,
    progressMap,
    vocabMap,
    quizResults,
    gemBreakdown,
    hangarState,
  } = useApp();

  const [selectedPilot, setSelectedPilot] = useState<RankedLeaderboardEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const weekInfo = useMemo(() => getCurrentIsoWeekInfo(), []);

  const currentUserActivityWeeklyGems = useMemo(() => {
    if (!profile?.uid) return 0;
    const publishedLessons = lessons.filter((l) => l.isPublished !== false);
    return calculateWeeklyActivityGems({
      lessons: publishedLessons,
      progressMap,
      vocabMap,
      quizResults,
      weekStartMs: weekInfo.weekStartMs,
      weekEndMs: weekInfo.weekEndMs,
      toMillis: toTimestampMillis,
    });
  }, [profile?.uid, lessons, progressMap, vocabMap, quizResults, weekInfo.weekStartMs, weekInfo.weekEndMs]);

  const { topThree, currentUserRankInfo, usingCumulativeFallback } = useMemo(() => {
    const publishedLessons = lessons.filter((l) => l.isPublished !== false);
    const canonicalTotalLessons = Math.max(1, publishedLessons.length);
    const canonicalTotalVocab = Math.max(
      1,
      publishedLessons.reduce((sum, l) => sum + l.vocabulary.length, 0)
    );

    const enriched = leaderboard.map((entry: LeaderboardEntryDoc) => {
      const totalLessons = Math.max(canonicalTotalLessons, entry.completedLessons);
      const lessonRatio = Math.min(1, entry.completedLessons / totalLessons);
      const vocabRatio = Math.min(1, entry.learnedVocabCount / canonicalTotalVocab);
      const completionPercent = Math.min(
        100,
        Math.max(0, Math.round((lessonRatio * 0.6 + vocabRatio * 0.4) * 100))
      );
      const isCurrentUser = Boolean(profile?.uid && entry.uid === profile.uid);
      const gemsCount = isCurrentUser
        ? Math.max(0, Math.floor(gemBreakdown.availableGems))
        : resolveLeaderboardCurrentGems(entry);

      const hasSyncedThisWeek =
        entry.weeklyGemsWeekKey === weekInfo.weekKey &&
        typeof entry.weeklyGems === 'number' &&
        Number.isFinite(entry.weeklyGems);

      let exactWeeklyGems = hasSyncedThisWeek ? Math.max(0, Math.floor(entry.weeklyGems!)) : 0;
      if (isCurrentUser) {
        exactWeeklyGems = Math.max(exactWeeklyGems, currentUserActivityWeeklyGems);
      }

      const isExactWeekly = (hasSyncedThisWeek || isCurrentUser) && exactWeeklyGems > 0;
      const updatedMs = toTimestampMillis(entry.updatedAt);
      const activeThisWeek =
        isExactWeekly || (updatedMs !== null && updatedMs >= weekInfo.weekStartMs);

      return {
        ...entry,
        totalLessons,
        completionPercent,
        gemsCount,
        exactWeeklyGems,
        isExactWeekly,
        activeThisWeek,
      };
    });

    const exactWeeklyCount = enriched.filter((e) => e.isExactWeekly).length;
    const fallbackNeeded = exactWeeklyCount < 3;

    // Sort: pilots with verified weekly gems come first; remaining podium slots rank by total gems
    const sorted = [...enriched].sort((a, b) => {
      if (a.isExactWeekly !== b.isExactWeekly) {
        return a.isExactWeekly ? -1 : 1;
      }
      if (a.isExactWeekly && b.isExactWeekly && b.exactWeeklyGems !== a.exactWeeklyGems) {
        return b.exactWeeklyGems - a.exactWeeklyGems;
      }
      if (a.activeThisWeek !== b.activeThisWeek) {
        return a.activeThisWeek ? -1 : 1;
      }
      if (b.gemsCount !== a.gemsCount) {
        return b.gemsCount - a.gemsCount;
      }
      if (b.completionPercent !== a.completionPercent) {
        return b.completionPercent - a.completionPercent;
      }
      return b.streakDays - a.streakDays;
    });

    const ranked: WeeklyRankedPilot[] = sorted.map((item, idx) => ({
      ...item,
      globalRank: idx + 1,
      weeklyRank: idx + 1,
      displayGems: item.isExactWeekly ? item.exactWeeklyGems : item.gemsCount,
    }));

    const me = profile?.uid ? ranked.find((r) => r.uid === profile.uid) ?? null : null;

    return {
      topThree: ranked.slice(0, 3),
      currentUserRankInfo: me,
      usingCumulativeFallback: fallbackNeeded,
    };
  }, [
    leaderboard,
    lessons,
    profile?.uid,
    gemBreakdown.availableGems,
    weekInfo.weekKey,
    weekInfo.weekStartMs,
    currentUserActivityWeeklyGems,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLeaderboard(true);
    } finally {
      setRefreshing(false);
    }
  };

  const thirdPlaceGems = topThree[2]?.displayGems ?? 0;
  const gemsGapToPodium =
    currentUserRankInfo && currentUserRankInfo.weeklyRank > 3
      ? Math.max(1, thirdPlaceGems - currentUserRankInfo.displayGems + 1)
      : 0;

  return (
    <section
      aria-labelledby="pilot-hall-of-fame-heading"
      className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7"
    >
      {/* Subtle Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span>Vinh danh đường bay</span>
            <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
              Tuần {weekInfo.weekNumber} ({weekInfo.rangeLabelVi})
            </span>
          </div>
          <h3
            id="pilot-hall-of-fame-heading"
            className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            Bảng vàng phi công
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Top 3 học viên sở hữu tổng số Ngọc cao nhất tuần này. Nhấn vào từng phi công để ngắm mô hình 3D.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing || leaderboardLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Cập nhật
          </button>
          <button
            type="button"
            onClick={() => onNavigate('leaderboard')}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#D94E00] dark:text-[#FF8524] hover:underline whitespace-nowrap"
          >
            Xem toàn bộ
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {leaderboardLoading && topThree.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-7 items-end">
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-6 flex flex-col items-center gap-4 animate-pulse"
            >
              <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-28 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : topThree.length === 0 ? (
        /* Empty State */
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-10 text-center">
          <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Chưa có phi công nào ghi danh Bảng vàng tuần này
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-md mx-auto">
            Hãy học từ vựng, hoàn thành bài kiểm tra hoặc chinh phục chặng TOEIC để trở thành Quán quân đầu tiên của tuần!
          </p>
          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors"
          >
            Bắt đầu tích lũy Ngọc
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Podium Showcase with Radiant Position Auras */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-7 items-end">
          {topThree.map((pilot) => {
            const rankPos = (pilot.weeklyRank <= 3 ? pilot.weeklyRank : 3) as 1 | 2 | 3;
            const visual = TIER_VISUALS[rankPos];
            const MedalIcon = visual.medalIcon;
            const pilotRankMeta = PILOT_RANKS[pilot.currentLevel] || PILOT_RANKS.A1;
            const isCurrentUser = Boolean(profile?.uid && pilot.uid === profile.uid);

            return (
              <button
                key={pilot.uid}
                type="button"
                onClick={() => setSelectedPilot(pilot)}
                className={`group relative text-center rounded-2xl border p-6 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] cursor-pointer overflow-hidden ${visual.orderClass} ${visual.elevationClass} ${visual.cardSurfaceClass} ${visual.cardGlowClass}`}
              >
                {/* Top Radiant Rim Line */}
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${visual.pedestalBarClass}`}
                />

                {/* Soft Ambient Aura Spotlight Behind Podium Header */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-2xl ${visual.breatheClass}`}
                  style={{ background: visual.ambientGlowStyle }}
                />

                {/* Content Layer */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Rank Label Row (Zero-pill clean typography) */}
                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-tight ${visual.rankNumberClass}`}
                  >
                    <MedalIcon className="w-4 h-4 shrink-0" />
                    <span>{visual.rankTitle}</span>
                  </div>

                  {/* Radiant Aura Avatar Medallion */}
                  <div className="relative my-5 flex items-center justify-center">
                    {/* Outer Breathing Soft Glow Halo */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -inset-4 rounded-full blur-md ${visual.breatheClass}`}
                      style={{ background: visual.ambientGlowStyle }}
                    />

                    {/* Rotating Conic Halo Ring */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -inset-1.5 rounded-full opacity-90 ${visual.spinClass}`}
                      style={{ background: visual.conicRingStyle }}
                    />

                    {/* Inner Mask Ring for Crisp Halo Separation */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-[3px] rounded-full bg-white dark:bg-slate-900"
                    />

                    {/* Pilot Initials Crest */}
                    <div
                      className={`relative flex items-center justify-center rounded-full border-2 font-extrabold tracking-tight shadow-inner ${
                        rankPos === 1 ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-xl'
                      } ${visual.avatarSurfaceClass}`}
                    >
                      {getInitials(pilot.displayName)}
                    </div>

                    {/* Numeric Position Medallion Stamp */}
                    <span
                      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 min-w-[26px] h-6 px-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow-sm`}
                    >
                      #{rankPos}
                    </span>
                  </div>

                  {/* Pilot Name & Quiet Unboxed Metadata */}
                  <h4
                    title={pilot.displayName}
                    className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white max-w-full truncate px-1"
                  >
                    {pilot.displayName}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs font-bold text-[#D94E00] dark:text-[#FF8524]">
                        (Bạn)
                      </span>
                    )}
                  </h4>

                  <div className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                    <span>{pilotRankMeta.rankVi}</span>
                    <span aria-hidden="true">·</span>
                    <span>CEFR {pilot.currentLevel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{pilot.streakDays} ngày bay</span>
                  </div>

                  {/* Weekly Gems Counter */}
                  <div className="mt-4 pt-4 w-full border-t border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center">
                    <div
                      className={`inline-flex items-center gap-1.5 font-extrabold tabular-nums ${
                        rankPos === 1 ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                      } ${visual.gemTextClass}`}
                    >
                      <Gem className={rankPos === 1 ? 'w-5 h-5 shrink-0' : 'w-4 h-4 shrink-0'} />
                      <span>{pilot.displayGems.toLocaleString('vi-VN')}</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {pilot.isExactWeekly ? 'Ngọc tích lũy tuần này' : 'Ngọc hiện có'}
                    </span>

                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#D94E00] dark:group-hover:text-[#FF8524] transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      Xem Phi công 3D
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Personal Weekly Standing Footer Strip */}
      {currentUserRankInfo && (
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600 dark:text-slate-300 tabular-nums">
            <span className="font-bold text-slate-900 dark:text-white">
              Vị trí của bạn: #{currentUserRankInfo.weeklyRank}
            </span>
            <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>
              {currentUserRankInfo.isExactWeekly
                ? `${currentUserRankInfo.displayGems.toLocaleString('vi-VN')} Ngọc tuần này`
                : `${currentUserRankInfo.gemsCount.toLocaleString('vi-VN')} Ngọc hiện có`}
            </span>
            {currentUserRankInfo.weeklyRank <= 3 ? (
              <>
                <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Bạn đang tỏa sáng trên Bảng vàng tuần này!
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span>
                  Cần thêm{' '}
                  <strong className="text-[#D94E00] dark:text-[#FF8524]">
                    {gemsGapToPodium.toLocaleString('vi-VN')} Ngọc
                  </strong>{' '}
                  để vào Top 3
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {usingCumulativeFallback && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Tự động cập nhật khi học viên hoàn thành bài trong tuần
              </span>
            )}
            <button
              type="button"
              onClick={() => onNavigate('pilot-hangar')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D94E00] dark:text-[#FF8524] hover:underline whitespace-nowrap"
            >
              Đổi thưởng Ngọc
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive 3D Pilot Showcase Modal */}
      <LeaderboardPilotModal
        entry={selectedPilot}
        isCurrentUser={Boolean(selectedPilot && profile?.uid && selectedPilot.uid === profile.uid)}
        liveOwnEquipped={hangarState.equipped}
        onClose={() => setSelectedPilot(null)}
      />
    </section>
  );
}
