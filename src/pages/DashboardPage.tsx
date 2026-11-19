import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  Flame,
  Plane,
  PlayCircle,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LeaderboardPanel } from '../components/LeaderboardPanel';
import { useApp } from '../context/AppContext';
import { AUTH_HERO_IMAGE, PILOT_RANKS } from '../data';
import type { AppRoute, LessonDoc } from '../types';
import { formatShortDateVi, getLocalDateString } from '../utils/helpers';

interface DashboardPageProps {
  onOpenLesson: (lessonId: string) => void;
  onNavigate: (route: AppRoute) => void;
}

export function DashboardPage({ onOpenLesson, onNavigate }: DashboardPageProps) {
  const { profile, lessons, progressMap, quizResults, vocabMap } = useApp();
  const [pilotAvatarFailed, setPilotAvatarFailed] = useState(false);

  const stats = useMemo(() => {
    const learnedVocabCount = Object.values(vocabMap).filter((v) => v.isLearned).length;
    const completedLessons = Object.values(progressMap).filter((p) => p.lessonCompleted);
    const avgScore =
      quizResults.length > 0
        ? Math.round(quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length)
        : 0;

    // Level progress breakdown for chart
    const levelChartData = ['A1', 'A2', 'B1'].map((lvl) => {
      const levelLessons = lessons.filter((l) => l.levelId === lvl);
      const done = levelLessons.filter((l) => progressMap[l.lessonId]?.lessonCompleted).length;
      const pct = levelLessons.length > 0 ? Math.round((done / levelLessons.length) * 100) : 0;
      return {
        level: `Level ${lvl}`,
        completed: done,
        total: levelLessons.length,
        percent: pct,
      };
    });

    // Recent quiz scores trend (oldest -> newest)
    const quizTrend = [...quizResults]
      .slice(0, 8)
      .reverse()
      .map((r, idx) => ({
        name: formatShortDateVi(r.completedAt) !== '—' ? formatShortDateVi(r.completedAt) : `Lần ${idx + 1}`,
        score: r.score,
        lesson: r.lessonTitle,
      }));

    // Active lesson: most recently studied incomplete lesson
    const inProgress = lessons
      .filter((l) => {
        const p = progressMap[l.lessonId];
        return p && !p.lessonCompleted && (p.vocabularyLearned.length > 0 || p.quizAttempts > 0);
      })
      .sort((a, b) => a.order - b.order);

    const activeLesson: LessonDoc | undefined =
      inProgress[0] ||
      lessons.find(
        (l) => l.levelId === (profile?.currentLevel || 'A1') && !progressMap[l.lessonId]?.lessonCompleted
      ) ||
      lessons.find((l) => !progressMap[l.lessonId]?.lessonCompleted) ||
      lessons[0];

    // Next recommended lesson (after activeLesson)
    const recommendedLesson: LessonDoc | undefined =
      lessons.find(
        (l) =>
          l.lessonId !== activeLesson?.lessonId &&
          l.levelId === (profile?.currentLevel || 'A1') &&
          !progressMap[l.lessonId]?.lessonCompleted
      ) ||
      lessons.find(
        (l) => l.lessonId !== activeLesson?.lessonId && !progressMap[l.lessonId]?.lessonCompleted
      ) ||
      lessons[1];

    return {
      learnedVocabCount,
      completedCount: completedLessons.length,
      totalLessons: lessons.length,
      avgScore,
      levelChartData,
      quizTrend,
      activeLesson,
      recommendedLesson,
    };
  }, [lessons, progressMap, quizResults, vocabMap, profile?.currentLevel]);

  const studiedToday = profile?.lastStudyDate === getLocalDateString();
  const activeProgress = stats.activeLesson ? progressMap[stats.activeLesson.lessonId] : undefined;
  const activeVocabLearned = activeProgress?.vocabularyLearned?.length ?? 0;
  const activeVocabTotal = stats.activeLesson?.vocabulary?.length ?? 15;
  const currentRank = PILOT_RANKS[profile?.currentLevel || 'A1'] || PILOT_RANKS.A1;
  const overallFlightPct =
    stats.totalLessons > 0 ? Math.round((stats.completedCount / stats.totalLessons) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Pilot Cockpit Hero Greeting & Flight Progress */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-sky-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5 max-w-2xl">
            <div className="hidden sm:flex w-16 h-16 rounded-xl overflow-hidden border border-amber-400/40 shrink-0 bg-gradient-to-br from-sky-600 to-blue-800 items-center justify-center">
              {!pilotAvatarFailed ? (
                <img
                  src={AUTH_HERO_IMAGE}
                  alt="Cậu bé Pilot đồng hành học tiếng Anh"
                  referrerPolicy="no-referrer"
                  onError={() => setPilotAvatarFailed(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <Plane className="w-7 h-7 text-amber-300" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300">
                <Plane className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {currentRank.rankVi} ({currentRank.callsign})
                </span>
                <span className="text-white/40" aria-hidden="true">
                  ·
                </span>
                <span>CEFR {profile?.currentLevel || 'A1'}</span>
                <span className="text-white/40" aria-hidden="true">
                  ·
                </span>
                <span>Mục tiêu {profile?.dailyGoalMinutes ?? 20} phút/ngày</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                Xin chào phi công {profile?.fullName || 'bạn'}!
              </h2>
              <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed">
                {studiedToday
                  ? `Hành trình bay hôm nay đã được ghi nhận! Bạn đang giữ chuỗi ${profile?.streakDays ?? 1} ngày học liên tiếp cùng Cậu bé Pilot.`
                  : `Đường băng đã sẵn sàng. Chỉ cần học 5 từ vựng hoặc hoàn thành 1 bài kiểm tra hôm nay để giữ vững chuỗi ${profile?.streakDays ?? 1} ngày học liên tiếp.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats.activeLesson && (
              <button
                type="button"
                onClick={() => onOpenLesson(stats.activeLesson!.lessonId)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 text-sm font-bold hover:bg-amber-400 transition-colors whitespace-nowrap"
              >
                <PlayCircle className="w-4 h-4" />
                Tiếp tục học ngay
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('roadmap')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-white/25 bg-white/10 text-sm font-semibold text-white hover:bg-white/15 transition-colors whitespace-nowrap"
            >
              Xem đường bay A1–B1
            </button>
          </div>
        </div>

        {/* Runway Flight Plan Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15 space-y-2">
          <div className="flex items-center justify-between text-xs text-sky-100/90 tabular-nums">
            <span>Hành trình chinh phục A1 → A2 → B1</span>
            <span className="font-semibold text-amber-300">
              {stats.completedCount}/{stats.totalLessons} chặng bài ({overallFlightPct}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-amber-400 rounded-full transition-all"
              style={{ width: `${Math.max(4, overallFlightPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Daily Study Reminder Banner (only if enabled & not yet studied today) */}
      {profile?.reminderEnabled && !studiedToday && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                Nhắc nhở duy trì thói quen học tiếng Anh
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                Dành {profile.dailyGoalMinutes} phút hôm nay để ôn Flashcard và giữ chuỗi học không bị gián đoạn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap self-start sm:self-center"
          >
            Ôn tập nhanh 5 phút
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            <span>Từ vựng đã học</span>
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {stats.learnedVocabCount}
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1">
              / {lessons.reduce((sum, l) => sum + l.vocabulary.length, 0)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Đồng bộ tự động theo tài khoản
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            <span>Bài học đã hoàn thành</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {stats.completedCount}
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1">
              / {stats.totalLessons}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Hoàn thành sau khi nộp bài kiểm tra
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            <span>Điểm kiểm tra trung bình</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {quizResults.length > 0 ? `${stats.avgScore}%` : '—'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {quizResults.length > 0
              ? `Dựa trên ${quizResults.length} lượt kiểm tra`
              : 'Chưa có lượt kiểm tra nào'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            <span>Chuỗi ngày học liên tiếp</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {profile?.streakDays ?? 1}
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1">ngày</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Trình độ mục tiêu: CEFR {profile?.currentLevel || 'A1'}
          </p>
        </div>
      </section>

      {/* Active Lesson & Recommended Next Lesson */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.activeLesson && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  Bài học đang học · {stats.activeLesson.levelId}
                </span>
                <span>{stats.activeLesson.topic}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {stats.activeLesson.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {stats.activeLesson.description}
              </p>

              {/* Progress bar */}
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-slate-500 dark:text-slate-400">Tiến độ từ vựng</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeVocabLearned}/{activeVocabTotal} từ
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((activeVocabLearned / Math.max(1, activeVocabTotal)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenLesson(stats.activeLesson!.lessonId)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Tiếp tục bài học này
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {stats.recommendedLesson && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Đề xuất tiếp theo · {stats.recommendedLesson.levelId}
                </span>
                <span>{stats.recommendedLesson.topic}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {stats.recommendedLesson.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {stats.recommendedLesson.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 tabular-nums">
                <span>{stats.recommendedLesson.vocabulary.length} từ vựng</span>
                <span aria-hidden="true">·</span>
                <span>{stats.recommendedLesson.sentencePatterns.length} mẫu câu</span>
                <span aria-hidden="true">·</span>
                <span>{stats.recommendedLesson.quiz.length} câu kiểm tra</span>
                <span aria-hidden="true">·</span>
                <span>~{stats.recommendedLesson.estimatedMinutes} phút</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenLesson(stats.recommendedLesson!.lessonId)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Mở bài học đề xuất
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Completion Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tiến độ theo cấp độ CEFR
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tỷ lệ bài học đã hoàn thành (%) trên từng cấp độ A1, A2 và B1
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.levelChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="level" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Hoàn thành']}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="percent" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={54} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quiz Score Trend Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Biểu đồ điểm kiểm tra gần đây
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Theo dõi sự tiến bộ qua tối đa 8 bài kiểm tra gần nhất
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('progress')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              Xem chi tiết
            </button>
          </div>

          {stats.quizTrend.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.quizTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Điểm số']}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#scoreFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-center px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Chưa có dữ liệu điểm kiểm tra
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs">
                Hãy hoàn thành bài kiểm tra 15 câu đầu tiên để bắt đầu vẽ biểu đồ tiến độ cá nhân của bạn.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('quizzes')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                Làm bài kiểm tra đầu tiên
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Live Learner Completion Leaderboard Preview (Top 5) */}
      <LeaderboardPanel
        compact
        maxRows={5}
        onViewAll={() => onNavigate('leaderboard')}
      />
    </div>
  );
}
