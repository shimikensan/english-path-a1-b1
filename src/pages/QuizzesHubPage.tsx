import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getQuizRating } from '../utils/helpers';

interface QuizzesHubPageProps {
  onStartLessonQuiz: (lessonId: string) => void;
}

export function QuizzesHubPage({ onStartLessonQuiz }: QuizzesHubPageProps) {
  const { lessons, progressMap } = useApp();
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  const filteredLessons = useMemo(() => {
    if (levelFilter === 'ALL') return lessons;
    return lessons.filter((l) => l.levelId === levelFilter);
  }, [lessons, levelFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Ngân hàng 30 bài kiểm tra trắc nghiệm chuẩn CEFR
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mỗi bài gồm 15 câu hỏi trộn ngẫu nhiên đáp án, giải thích chi tiết bằng tiếng Việt và tự động lưu điểm lên Firestore.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          {['ALL', 'A1', 'A2', 'B1'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                levelFilter === lvl
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lvl === 'ALL' ? 'Tất cả' : lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLessons.map((lesson) => {
          const prog = progressMap[lesson.lessonId];
          const done = Boolean(prog?.lessonCompleted);
          const best = prog?.quizBestScore ?? 0;
          const attempts = prog?.quizAttempts ?? 0;

          return (
            <div
              key={lesson.lessonId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {lesson.levelId} · {lesson.topic}
                  </span>
                  {done && (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {best}%
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {lesson.title}
                </h3>

                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {lesson.quiz.length} câu hỏi · {attempts > 0 ? `Đã thi ${attempts} lần (${getQuizRating(best)})` : 'Chưa làm bài'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onStartLessonQuiz(lesson.lessonId)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" />
                {done ? 'Làm lại bài kiểm tra' : 'Bắt đầu kiểm tra'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
