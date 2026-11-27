import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Gem,
  Maximize2,
  MessageSquare,
  Plane,
  PlayCircle,
  Radar,
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
import { DailyChallengesWidget } from '../components/DailyChallengesWidget';
import { LeaderboardPanel } from '../components/LeaderboardPanel';
import { calculateLessonCompletion, LessonMiniProgress } from '../components/LessonMiniProgress';
import { StudyStreakWidget } from '../components/StudyStreakWidget';
import { WordOfTheDayCard } from '../components/WordOfTheDayCard';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AUTH_HERO_IMAGE, PILOT_RANKS } from '../data';
import type { AppRoute, LessonDoc } from '../types';
import { formatAccessDurationVi, formatShortDateVi, getLocalDateString } from '../utils/helpers';

interface DashboardPageProps {
  onOpenLesson: (lessonId: string) => void;
  onEnterFocusMode: (lessonId: string) => void;
  onNavigate: (route: AppRoute) => void;
}

export function DashboardPage({
  onOpenLesson,
  onEnterFocusMode,
  onNavigate,
}: DashboardPageProps) {
  const { profile, lessons, progressMap, quizResults, vocabMap, gemBreakdown } = useApp();
  const { theme } = useTheme();
  const [pilotAvatarFailed, setPilotAvatarFailed] = useState(false);
  const [selectedCardLevel, setSelectedCardLevel] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const stats = useMemo(() => {
    const learnedVocabCount = Object.values(vocabMap).filter((v) => v.isLearned).length;
    const completedLessons = Object.values(progressMap).filter((p) => p.lessonCompleted);
    const avgScore =
      quizResults.length > 0
        ? Math.round(quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length)
        : 0;

    // Level progress breakdown for chart
    const levelChartData = ['A1', 'A2', 'B1', 'B2', 'C1', 'ESP'].map((lvl) => {
      const levelLessons = lessons.filter((l) => l.levelId === lvl);
      const done = levelLessons.filter((l) => progressMap[l.lessonId]?.lessonCompleted).length;
      const pct = levelLessons.length > 0 ? Math.round((done / levelLessons.length) * 100) : 0;
      return {
        level: lvl === 'ESP' ? 'ESP' : lvl,
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
  const currentRank = PILOT_RANKS[profile?.currentLevel || 'A1'] || PILOT_RANKS.A1;
  const overallFlightPct =
    stats.totalLessons > 0 ? Math.round((stats.completedCount / stats.totalLessons) * 100) : 0;

  const activeLevelFilter = selectedCardLevel ?? (profile?.currentLevel || 'A1');
  const dashboardLevelLessons = useMemo(() => {
    return lessons.filter((l) => l.levelId === activeLevelFilter).slice(0, 6);
  }, [lessons, activeLevelFilter]);

  return (
    <div className="space-y-8">
      {/* Pilot Cockpit Hero Greeting & Flight Progress */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid border border-slate-700/80 rounded-2xl p-6 sm:p-8 text-white">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5 max-w-2xl">
            <div className="hidden sm:flex w-16 h-16 rounded-xl overflow-hidden border border-[#FF6B00]/50 shrink-0 bg-gradient-to-br from-[#132B4D] to-[#07111F] items-center justify-center shadow-[0_0_18px_rgba(255,107,0,0.2)]">
              {!pilotAvatarFailed ? (
                <img
                  src={AUTH_HERO_IMAGE}
                  alt="Cậu bé Pilot đồng hành học tiếng Anh"
                  referrerPolicy="no-referrer"
                  onError={() => setPilotAvatarFailed(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <Plane className="w-7 h-7 text-[#FF8524]" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#FF8524]">
                <Plane className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {currentRank.rankVi} ({currentRank.callsign})
                </span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span>CEFR {profile?.currentLevel || 'A1'}</span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span>Mục tiêu {profile?.dailyGoalMinutes ?? 20} phút/ngày</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                Xin chào phi công {profile?.fullName || 'bạn'}!
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {studiedToday
                  ? `Hành trình bay hôm nay đã được ghi nhận! Bạn đang giữ chuỗi ${profile?.streakDays ?? 1} ngày học liên tiếp cùng Cậu bé Pilot.`
                  : `Đường băng đã sẵn sàng. Chỉ cần học 5 từ vựng hoặc hoàn thành 1 bài kiểm tra hôm nay để giữ vững chuỗi ${profile?.streakDays ?? 1} ngày học liên tiếp.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats.activeLesson && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenLesson(stats.activeLesson!.lessonId)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#FF7E1F] transition-colors whitespace-nowrap shadow-[0_0_20px_rgba(255,107,0,0.3)]"
                >
                  <PlayCircle className="w-4 h-4" />
                  Tiếp tục học ngay
                </button>
                <button
                  type="button"
                  onClick={() => onEnterFocusMode(stats.activeLesson!.lessonId)}
                  title="Ẩn thanh điều hướng phụ và học bài hiện tại toàn màn hình"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[#FF6B00]/55 bg-[#FF6B00]/15 text-sm font-bold text-[#FF9A3C] hover:bg-[#FF6B00]/25 transition-colors whitespace-nowrap"
                >
                  <Maximize2 className="w-4 h-4" />
                  Chế độ Tập trung
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onNavigate('pilot-hangar')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-sky-400/55 bg-sky-500/15 text-sm font-bold text-sky-200 hover:bg-sky-500/25 transition-colors whitespace-nowrap cursor-pointer tabular-nums"
            >
              <Gem className="w-4 h-4 text-sky-300" />
              Phi công 3D · {gemBreakdown.availableGems.toLocaleString('vi-VN')} Ngọc
            </button>
            <button
              type="button"
              onClick={() => onNavigate('roadmap')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-600/80 bg-slate-800/50 text-sm font-semibold text-slate-100 hover:bg-slate-800 hover:border-slate-500 transition-colors whitespace-nowrap"
            >
              Xem đường bay A1–C1
            </button>
          </div>
        </div>

        {/* Runway Flight Plan Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
            <span>Hành trình chinh phục A1 → A2 → B1 → B2 → C1 → Chuyên ngành</span>
            <span className="font-semibold text-[#FF8524]">
              {stats.completedCount}/{stats.totalLessons} chặng bài ({overallFlightPct}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C] rounded-full transition-all"
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
            <span>Tổng thời gian truy cập</span>
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {formatAccessDurationVi(profile?.totalAccessSeconds)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Trình độ mục tiêu: CEFR {profile?.currentLevel || 'A1'}
          </p>
        </div>
      </section>

      {/* Dedicated Study Streak Widget with Flame Icon & 7-Day Milestone Celebration */}
      <StudyStreakWidget
        uid={profile?.uid}
        streakDays={profile?.streakDays ?? 1}
        studiedToday={studiedToday}
        dailyGoalMinutes={profile?.dailyGoalMinutes ?? 20}
        onStartStudy={() => {
          if (stats.activeLesson) {
            onOpenLesson(stats.activeLesson.lessonId);
          } else {
            onNavigate('practice');
          }
        }}
      />

      {/* Daily Challenges Widget (3 Daily Missions with Gem Rewards) */}
      <DailyChallengesWidget onNavigate={onNavigate} />

      {/* Word of the Day (Level-Matched Passive Vocabulary Booster) */}
      <WordOfTheDayCard onOpenLesson={onOpenLesson} />

      {/* Active Lesson & Recommended Next Lesson */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.activeLesson && (
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
                  Bài học đang học · {stats.activeLesson.levelId}
                </span>
                <span className="truncate">{stats.activeLesson.topic}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {stats.activeLesson.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {stats.activeLesson.description}
              </p>

              {/* Lesson completion mini progress bar */}
              <div className="pt-2">
                <LessonMiniProgress
                  lesson={stats.activeLesson}
                  progress={progressMap[stats.activeLesson.lessonId]}
                  vocabMap={vocabMap}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenLesson(stats.activeLesson!.lessonId)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#FF7E1F] transition-colors whitespace-nowrap"
              >
                Tiếp tục bài học này
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onEnterFocusMode(stats.activeLesson!.lessonId)}
                title="Mở toàn màn hình ở chế độ Tập trung (Focus Mode)"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#FF6B00]/45 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/18 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
              >
                <Maximize2 className="w-4 h-4" />
                Focus Mode
              </button>
            </div>
          </div>
        )}

        {stats.recommendedLesson && (
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Đề xuất tiếp theo · {stats.recommendedLesson.levelId}
                </span>
                <span className="truncate">{stats.recommendedLesson.topic}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {stats.recommendedLesson.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {stats.recommendedLesson.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 tabular-nums">
                <span>{stats.recommendedLesson.vocabulary.length} từ vựng</span>
                <span aria-hidden="true">·</span>
                <span>{stats.recommendedLesson.sentencePatterns.length} mẫu câu</span>
                <span aria-hidden="true">·</span>
                <span>{stats.recommendedLesson.quiz.length} câu kiểm tra</span>
                <span aria-hidden="true">·</span>
                <span>~{stats.recommendedLesson.estimatedMinutes} phút</span>
              </div>

              {/* Lesson completion mini progress bar */}
              <div className="pt-1">
                <LessonMiniProgress
                  lesson={stats.recommendedLesson}
                  progress={progressMap[stats.recommendedLesson.lessonId]}
                  vocabMap={vocabMap}
                />
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

      {/* Current Level Lesson Cards Grid with Mini Progress Bars */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Tiến độ từng bài học · Chặng {activeLevelFilter === 'ESP' ? 'Chuyên ngành' : activeLevelFilter}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi phần trăm hoàn thành trực quan (50% từ vựng đã thuộc + 50% bài kiểm tra)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'ESP'] as const).map((lvl) => {
                const isSelected = activeLevelFilter === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedCardLevel(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('roadmap')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] hover:underline whitespace-nowrap"
            >
              Tất cả {stats.totalLessons} bài
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dashboardLevelLessons.map((lesson, idx) => {
            const prog = progressMap[lesson.lessonId];
            const completion = calculateLessonCompletion(lesson, prog, vocabMap);
            return (
              <button
                key={lesson.lessonId}
                type="button"
                onClick={() => onOpenLesson(lesson.lessonId)}
                className="group text-left bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive p-5 flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-[#D94E00] dark:text-[#FF8524] truncate">
                      {String(idx + 1).padStart(2, '0')}. {lesson.topic}
                    </span>
                    {completion.quizCompleted ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {completion.bestScore}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {lesson.estimatedMinutes}p
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#D94E00] dark:group-hover:text-[#FF8524] transition-colors">
                    {lesson.title}
                  </h4>
                </div>

                <div className="w-full space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <LessonMiniProgress
                    lesson={lesson}
                    progress={prog}
                    vocabMap={vocabMap}
                    compact
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                      {lesson.vocabulary.length} từ · {lesson.quiz.length} câu hỏi
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#D94E00] dark:text-[#FF8524]">
                      {completion.percent === 100
                        ? 'Ôn lại'
                        : completion.percent > 0
                          ? 'Học tiếp'
                          : 'Bắt đầu'}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI English Messaging Coach Quick Entry */}
      <section className="bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-11 h-11 rounded-xl bg-[#FF6B00]/12 border border-[#FF6B00]/35 text-[#D94E00] dark:text-[#FF8524] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
              CƠ TRƯỞNG AI · NHẮN TIN & TỪ VỰNG CHỦ ĐỘNG
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Nhắn tin tiếng Anh chủ động cùng Cơ trưởng AI
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Trò chuyện tiếng Anh theo cấp độ CEFR A1–C1 & Chuyên ngành, nhận góp ý sửa lỗi ngữ pháp, gợi ý diễn đạt tự nhiên và nhiệm vụ ứng dụng từ vựng chủ động ngay trong hội thoại.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('ai-tutor')}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 self-start lg:self-center shadow-[0_0_18px_rgba(255,107,0,0.24)]"
        >
          Nhắn tin với AI
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Specialized English (Stage 4 ESP) Quick Access Banner */}
      <section className="bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-11 h-11 rounded-xl bg-[#FF6B00]/12 border border-[#FF6B00]/35 text-[#D94E00] dark:text-[#FF8524] flex items-center justify-center shrink-0">
            <Radar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
              CHẶNG 6 · TIẾNG ANH CHUYÊN NGÀNH (ESP)
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              3 Chuyên ngành thực chiến: Chế áp vô tuyến & UAV · Kiểm tra an ninh · Kiểm nghiệm thực phẩm
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              135 thuật ngữ chuyên sâu, 36 mẫu câu nghiệp vụ, 27 từ viết tắt, mô phỏng tình huống bộ đàm/chốt an ninh/phòng Lab và luyện nghe nhận diện thuật ngữ.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('specialized')}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 self-start lg:self-center shadow-[0_0_18px_rgba(255,107,0,0.24)]"
        >
          Mở khu Chuyên ngành
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Completion Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tiến độ theo cấp độ & Chuyên ngành
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tỷ lệ bài học đã hoàn thành (%) trên A1, A2, B1, B2, C1 và Tiếng Anh chuyên ngành (ESP)
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524]" />
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.levelChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#2E445E' : '#94a3b8'}
                  strokeOpacity={isDark ? 0.5 : 0.25}
                />
                <XAxis dataKey="level" tick={{ fontSize: 12 }} stroke={isDark ? '#93A8C0' : '#4C627B'} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} stroke={isDark ? '#93A8C0' : '#4C627B'} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Hoàn thành']}
                  contentStyle={{
                    borderRadius: 10,
                    backgroundColor: isDark ? '#0D1C30' : '#FFFFFF',
                    border: isDark ? '1px solid #2E445E' : '1px solid #D1DCE8',
                    color: isDark ? '#F1F5F9' : '#0D1C30',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="percent" fill="#FF6B00" radius={[6, 6, 0, 0]} maxBarSize={54} />
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
              className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] hover:underline whitespace-nowrap"
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
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#2E445E' : '#94a3b8'}
                    strokeOpacity={isDark ? 0.5 : 0.25}
                  />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#93A8C0' : '#4C627B'} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} stroke={isDark ? '#93A8C0' : '#4C627B'} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Điểm số']}
                    contentStyle={{
                      borderRadius: 10,
                      backgroundColor: isDark ? '#0D1C30' : '#FFFFFF',
                      border: isDark ? '1px solid #2E445E' : '1px solid #D1DCE8',
                      color: isDark ? '#F1F5F9' : '#0D1C30',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#FF6B00"
                    strokeWidth={2.5}
                    fill="url(#scoreFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-center px-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Chưa có dữ liệu điểm kiểm tra
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs">
                Hãy hoàn thành bài kiểm tra 15 câu đầu tiên để bắt đầu vẽ biểu đồ tiến độ cá nhân của bạn.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('quizzes')}
                className="px-4 py-2 rounded-lg bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#FF7E1F] transition-colors"
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
