import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  Medal,
  Plane,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PILOT_RANKS } from '../data';
import type { LeaderboardEntryDoc } from '../types';

interface LeaderboardPanelProps {
  compact?: boolean;
  maxRows?: number;
  onViewAll?: () => void;
  onRequireLogin?: () => void;
}

type LevelFilter = 'ALL' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getRankVisual(rank: number) {
  if (rank === 1) {
    return {
      icon: Trophy,
      iconColor: 'text-[#FF6B00] dark:text-[#FF8524]',
      numberColor: 'text-[#D94E00] dark:text-[#FF8524]',
      avatarBg: 'bg-[#FF6B00]/15 dark:bg-[#FF6B00]/20 text-[#D94E00] dark:text-[#FF8524] border-[#FF6B00]/50',
      barClass: 'bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C]',
      cardAccent: 'border-[#FF6B00]/50 dark:border-[#FF6B00]/45 bg-[#FF6B00]/[0.05] dark:bg-[#FF6B00]/[0.07]',
      label: 'Hạng 1 · Cơ trưởng dẫn đầu',
    };
  }
  if (rank === 2) {
    return {
      icon: Medal,
      iconColor: 'text-slate-500 dark:text-slate-300',
      numberColor: 'text-slate-700 dark:text-slate-200',
      avatarBg: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
      barClass: 'bg-gradient-to-r from-[#1E62B8] to-[#5AA3F8]',
      cardAccent: 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900',
      label: 'Hạng 2 · Á quân đường bay',
    };
  }
  if (rank === 3) {
    return {
      icon: Medal,
      iconColor: 'text-amber-600 dark:text-amber-300',
      numberColor: 'text-amber-700 dark:text-amber-300',
      avatarBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      barClass: 'bg-gradient-to-r from-[#FF6B00]/85 to-[#5AA3F8]',
      cardAccent: 'border-slate-300 dark:border-slate-700/90 bg-white dark:bg-slate-900',
      label: 'Hạng 3 · Phi công xuất sắc',
    };
  }
  return {
    icon: null,
    iconColor: 'text-slate-400',
    numberColor: 'text-slate-600 dark:text-slate-400',
    avatarBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    barClass: 'bg-[#FF6B00] dark:bg-[#FF7E1F]',
    cardAccent: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    label: `Hạng ${rank}`,
  };
}

export function LeaderboardPanel({
  compact = false,
  maxRows,
  onViewAll,
  onRequireLogin,
}: LeaderboardPanelProps) {
  const { leaderboard, leaderboardLoading, leaderboardError, profile } = useApp();
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign global rank (1-based) to every entry in the full sorted leaderboard
  const rankedAll = useMemo(() => {
    return leaderboard.map((entry, idx) => ({
      ...entry,
      globalRank: idx + 1,
    }));
  }, [leaderboard]);

  const currentUserRanked = useMemo(() => {
    if (!profile) return null;
    return rankedAll.find((e) => e.uid === profile.uid) ?? null;
  }, [rankedAll, profile]);

  const avgCompletion = useMemo(() => {
    if (leaderboard.length === 0) return 0;
    const sum = leaderboard.reduce((acc, e) => acc + e.completionPercent, 0);
    return Math.round(sum / leaderboard.length);
  }, [leaderboard]);

  const levelCounts = useMemo(() => {
    return {
      ALL: leaderboard.length,
      A1: leaderboard.filter((e) => e.currentLevel === 'A1').length,
      A2: leaderboard.filter((e) => e.currentLevel === 'A2').length,
      B1: leaderboard.filter((e) => e.currentLevel === 'B1').length,
      B2: leaderboard.filter((e) => e.currentLevel === 'B2').length,
      C1: leaderboard.filter((e) => e.currentLevel === 'C1').length,
    };
  }, [leaderboard]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = rankedAll.filter((entry) => {
      if (levelFilter !== 'ALL' && entry.currentLevel !== levelFilter) return false;
      if (q && !entry.displayName.toLowerCase().includes(q)) return false;
      return true;
    });
    return maxRows ? list.slice(0, maxRows) : list;
  }, [rankedAll, levelFilter, searchQuery, maxRows]);

  const topThree = useMemo(() => {
    if (compact || searchQuery.trim() !== '') return [];
    return filteredList.slice(0, 3);
  }, [compact, searchQuery, filteredList]);

  // --- Compact Dashboard Widget ---
  if (compact) {
    return (
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524]" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bảng xếp hạng học viên · Top {maxRows ?? 5}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentUserRanked ? (
                <>
                  Thứ hạng hiện tại của bạn:{' '}
                  <span className="font-semibold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                    #{currentUserRanked.globalRank}/{rankedAll.length}
                  </span>{' '}
                  ·{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {currentUserRanked.completionPercent}% hoàn thiện
                  </span>
                </>
              ) : (
                'Xếp hạng theo tỷ lệ hoàn thiện tổng hợp (60% bài học + 40% từ vựng)'
              )}
            </p>
          </div>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] hover:underline whitespace-nowrap self-start sm:self-center"
            >
              Xem toàn bộ bảng xếp hạng
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {leaderboardLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/70 animate-pulse"
              />
            ))}
          </div>
        ) : leaderboardError ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4">{leaderboardError}</p>
        ) : filteredList.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Chưa có học viên nào trên bảng xếp hạng
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hoàn thành từ vựng hoặc bài kiểm tra đầu tiên để ghi danh lên đường bay.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredList.map((entry) => {
              const visual = getRankVisual(entry.globalRank);
              const RankIcon = visual.icon;
              const isMe = profile?.uid === entry.uid;
              const pilotRank = PILOT_RANKS[entry.currentLevel] || PILOT_RANKS.A1;
              return (
                <div
                  key={entry.uid}
                  className={`py-3 px-3 -mx-3 rounded-xl flex items-center gap-3 sm:gap-4 transition-colors ${
                    isMe ? 'bg-[#FF6B00]/10 dark:bg-[#FF6B00]/12' : ''
                  }`}
                >
                  <div className="w-8 flex items-center justify-center shrink-0 tabular-nums">
                    {RankIcon ? (
                      <RankIcon className={`w-4 h-4 ${visual.iconColor}`} />
                    ) : (
                      <span className={`text-sm font-bold ${visual.numberColor}`}>
                        #{entry.globalRank}
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${visual.avatarBg}`}
                  >
                    {getInitials(entry.displayName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {entry.displayName}
                      </span>
                      {isMe && (
                        <span className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] shrink-0">
                          (Bạn)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
                      {pilotRank.rankVi} · CEFR {entry.currentLevel} · {entry.completedLessons}/
                      {entry.totalLessons} bài · {entry.learnedVocabCount} từ
                    </div>
                  </div>

                  <div className="w-28 sm:w-36 shrink-0 space-y-1">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="text-slate-500 dark:text-slate-400">Hoàn thiện</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {entry.completionPercent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${visual.barClass}`}
                        style={{ width: `${Math.max(3, entry.completionPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  // --- Full Leaderboard View (Public on AuthPage & Authenticated LeaderboardPage) ---
  return (
    <div className="space-y-6">
      {/* Aviation Header & Live Summary */}
      <section className="bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid border border-slate-700/80 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF8524]">
              <Plane className="w-3.5 h-3.5 shrink-0" />
              <span>Bảng xếp hạng trực tuyến · Đồng bộ Cloud Firestore</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Bảng xếp hạng Phi công học tập
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tỷ lệ hoàn thiện tổng hợp của từng học viên trên lộ trình CEFR A1–C1 & Chuyên ngành (tính theo 60% bài học đã hoàn thành + 40% từ vựng đã thuộc). Ai cũng có thể theo dõi trước và sau khi đăng nhập.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-700/70 shrink-0 tabular-nums">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Học viên tham gia</span>
              </div>
              <div className="text-2xl font-extrabold text-white">{rankedAll.length}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hoàn thiện TB</span>
              </div>
              <div className="text-2xl font-extrabold text-[#FF8524]">{avgCompletion}%</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>{profile ? 'Thứ hạng của bạn' : 'Tham gia ngay'}</span>
              </div>
              {profile && currentUserRanked ? (
                <div className="text-2xl font-extrabold text-white">
                  #{currentUserRanked.globalRank}
                  <span className="text-sm font-semibold text-[#FF8524] ml-1.5">
                    ({currentUserRanked.completionPercent}%)
                  </span>
                </div>
              ) : profile ? (
                <div className="text-sm font-semibold text-slate-300 mt-1.5">Đang đồng bộ...</div>
              ) : onRequireLogin ? (
                <button
                  type="button"
                  onClick={onRequireLogin}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#FF7E1F] transition-colors shadow-[0_0_16px_rgba(255,107,0,0.28)]"
                >
                  Đăng nhập ghi danh
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="text-sm font-semibold text-slate-300 mt-1.5">Khách tham quan</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Top 3 Podium Cards */}
      {!leaderboardLoading && topThree.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((entry: LeaderboardEntryDoc & { globalRank: number }, idx) => {
            const rankInView = levelFilter === 'ALL' ? entry.globalRank : idx + 1;
            const visual = getRankVisual(rankInView);
            const RankIcon = visual.icon;
            const isMe = profile?.uid === entry.uid;
            const pilotRank = PILOT_RANKS[entry.currentLevel] || PILOT_RANKS.A1;
            return (
              <div
                key={entry.uid}
                className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 ${visual.cardAccent}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-full border flex items-center justify-center text-sm font-extrabold shrink-0 ${visual.avatarBg}`}
                    >
                      {getInitials(entry.displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${visual.numberColor}`}>{visual.label}</p>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {entry.displayName}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            (Bạn)
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {pilotRank.rankVi} · CEFR {entry.currentLevel}
                      </p>
                    </div>
                  </div>
                  {RankIcon && <RankIcon className={`w-5 h-5 shrink-0 ${visual.iconColor}`} />}
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between tabular-nums">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Tỷ lệ hoàn thiện
                    </span>
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {entry.completionPercent}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${visual.barClass}`}
                      style={{ width: `${Math.max(4, entry.completionPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {entry.completedLessons}/{entry.totalLessons} bài
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {entry.learnedVocabCount} từ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    {entry.streakDays} ngày
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Filter Toolbar & Full Ranking Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Segmented Level Filter */}
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-xl self-start">
            {(['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'] as const).map((lvl) => {
              const active = levelFilter === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl === 'ALL' ? 'Tất cả' : lvl} ({levelCounts[lvl]})
                </button>
              );
            })}
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên học viên..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>

        {leaderboardLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((k) => (
              <div
                key={k}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/70 animate-pulse"
              />
            ))}
          </div>
        ) : leaderboardError ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {leaderboardError}
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {rankedAll.length === 0
                ? 'Chưa có học viên nào được ghi nhận trên bảng xếp hạng'
                : 'Không tìm thấy học viên phù hợp với bộ lọc hiện tại'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {rankedAll.length === 0
                ? 'Hãy đăng nhập và bắt đầu học từ vựng hoặc làm bài kiểm tra để trở thành phi công đầu tiên dẫn đầu bảng xếp hạng!'
                : 'Thử chọn lại cấp độ "Tất cả" hoặc xóa từ khóa tìm kiếm.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 w-16">Hạng</th>
                  <th className="py-3 px-4 min-w-[200px]">Học viên</th>
                  <th className="py-3 px-4 min-w-[190px]">Phần trăm hoàn thiện</th>
                  <th className="py-3 px-4 whitespace-nowrap">Bài hoàn thành</th>
                  <th className="py-3 px-4 whitespace-nowrap">Từ vựng</th>
                  <th className="py-3 px-4 whitespace-nowrap">Điểm TB</th>
                  <th className="py-3 px-4 whitespace-nowrap">Chuỗi bay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredList.map((entry, idx) => {
                  const displayRank = levelFilter === 'ALL' && !searchQuery.trim() ? entry.globalRank : idx + 1;
                  const visual = getRankVisual(displayRank);
                  const RankIcon = visual.icon;
                  const isMe = profile?.uid === entry.uid;
                  const pilotRank = PILOT_RANKS[entry.currentLevel] || PILOT_RANKS.A1;

                  return (
                    <tr
                      key={entry.uid}
                      className={`transition-colors ${
                        isMe
                          ? 'bg-[#FF6B00]/10 dark:bg-[#FF6B00]/12'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="flex items-center gap-1.5">
                          {RankIcon ? (
                            <RankIcon className={`w-4 h-4 ${visual.iconColor}`} />
                          ) : null}
                          <span className={`font-bold ${visual.numberColor}`}>
                            #{displayRank}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${visual.avatarBg}`}
                          >
                            {getInitials(entry.displayName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {entry.displayName}
                              {isMe && (
                                <span className="ml-1.5 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
                                  (Bạn)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {pilotRank.rankVi} · CEFR {entry.currentLevel}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 max-w-[220px]">
                          <div className="flex items-center justify-between text-xs tabular-nums">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {entry.completionPercent}%
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">
                              {entry.completionPercent === 100
                                ? 'Hoàn tất lộ trình'
                                : entry.completionPercent >= 60
                                  ? 'Tăng tốc tốt'
                                  : entry.completionPercent >= 20
                                    ? 'Đang cất cánh'
                                    : 'Khởi hành'}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${visual.barClass}`}
                              style={{ width: `${Math.max(3, entry.completionPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">
                        {entry.completedLessons}/{entry.totalLessons} bài
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {entry.learnedVocabCount} từ
                      </td>

                      <td className="py-3.5 px-4 tabular-nums whitespace-nowrap">
                        {entry.averageQuizScore > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-100">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            {entry.averageQuizScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          {entry.streakDays} ngày
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
