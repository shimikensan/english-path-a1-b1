import { useMemo } from 'react';
import { Award, CheckCircle2, Flame } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { formatTimestampVi, getQuizRatingVi } from '../utils/helpers';

interface ProgressPageProps {
  onOpenLesson: (lessonId: string) => void;
}

export function ProgressPage({ onOpenLesson }: ProgressPageProps) {
  const { profile, levels, lessons, progressMap, quizResults, vocabMap } = useApp();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const levelBreakdown = useMemo(() => {
    return levels.map((lvl) => {
      const levelLessons = lessons.filter((l) => l.levelId === lvl.levelId);
      const completed = levelLessons.filter((l) => progressMap[l.lessonId]?.lessonCompleted).length;
      const totalVocab = levelLessons.reduce((sum, l) => sum + l.vocabulary.length, 0);
      const learnedVocab = levelLessons.reduce(
        (sum, l) => sum + l.vocabulary.filter((v) => vocabMap[v.id]?.isLearned).length,
        0
      );
      const levelResults = quizResults.filter((r) => r.levelId === lvl.levelId);
      const avgScore =
        levelResults.length > 0
          ? Math.round(levelResults.reduce((sum, r) => sum + r.score, 0) / levelResults.length)
          : 0;
      const pct = levelLessons.length > 0 ? Math.round((completed / levelLessons.length) * 100) : 0;

      return {
        levelId: lvl.levelId,
        name: lvl.name,
        completed,
        total: levelLessons.length,
        learnedVocab,
        totalVocab,
        avgScore,
        pct,
      };
    });
  }, [levels, lessons, progressMap, quizResults, vocabMap]);

  return (
    <div className="space-y-8">
      {/* Level Mastery Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {levelBreakdown.map((item) => (
          <div
            key={item.levelId}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.name}</h3>
              <span className="text-sm font-extrabold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                {item.pct}%
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C] rounded-full transition-all"
                style={{ width: `${item.pct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs tabular-nums">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {item.completed}/{item.total}
                </div>
                <div className="text-slate-500 dark:text-slate-400">Bài học</div>
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {item.learnedVocab}/{item.totalVocab}
                </div>
                <div className="text-slate-500 dark:text-slate-400">Từ vựng</div>
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {item.avgScore > 0 ? `${item.avgScore}%` : '—'}
                </div>
                <div className="text-slate-500 dark:text-slate-400">Điểm TB</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Streak & Avg Summary + Bar Chart */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Biểu đồ hoàn thành từ vựng & bài học theo cấp độ
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dữ liệu cập nhật theo thời gian thực từ Cloud Firestore
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
              Chuỗi {profile?.streakDays ?? 1} ngày
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Award className="w-4 h-4" />
              {quizResults.length} bài thi đã nộp
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={levelBreakdown} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#2E445E' : '#94a3b8'}
                strokeOpacity={isDark ? 0.5 : 0.25}
              />
              <XAxis dataKey="levelId" tick={{ fontSize: 12 }} stroke={isDark ? '#93A8C0' : '#4C627B'} />
              <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#93A8C0' : '#4C627B'} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  backgroundColor: isDark ? '#0D1C30' : '#FFFFFF',
                  border: isDark ? '1px solid #2E445E' : '1px solid #D1DCE8',
                  color: isDark ? '#F1F5F9' : '#0D1C30',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="learnedVocab" name="Từ đã học" fill="#3381E0" radius={[6, 6, 0, 0]} maxBarSize={44} />
              <Bar dataKey="avgScore" name="Điểm TB (%)" fill="#FF6B00" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Full Quiz History Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Lịch sử bài kiểm tra đã nộp
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mỗi lượt nộp bài kiểm tra đều được lưu trữ cố định để bạn theo dõi tiến bộ qua thời gian.
          </p>
        </div>

        {quizResults.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Bạn chưa nộp bài kiểm tra nào. Hãy mở một bài học và hoàn thành phần Kiểm tra 15 câu!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60">
                  <th className="py-3 px-5">Bài học</th>
                  <th className="py-3 px-4">Cấp độ</th>
                  <th className="py-3 px-4 text-right">Đúng / Tổng</th>
                  <th className="py-3 px-4 text-right">Điểm số</th>
                  <th className="py-3 px-4">Xếp loại</th>
                  <th className="py-3 px-5 text-right">Thời gian nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {quizResults.map((res) => {
                  const info = getQuizRatingVi(res.rating);
                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-white">
                        <button
                          type="button"
                          onClick={() => onOpenLesson(res.lessonId)}
                          className="text-left hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                        >
                          {res.lessonTitle}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {res.levelId}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        {res.correctAnswers}/{res.totalQuestions}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {res.score}%
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        <span
                          className={
                            info.tone === 'emerald'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : info.tone === 'blue'
                                ? 'text-blue-600 dark:text-blue-400'
                                : info.tone === 'amber'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                          {res.rating}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatTimestampVi(res.completedAt)}
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
