import type { LessonDoc, UserProgressDoc, UserVocabularyDoc } from '../types';

export interface LessonCompletionStats {
  percent: number;
  learnedVocab: number;
  totalVocab: number;
  quizCompleted: boolean;
  bestScore: number;
  statusLabel: string;
}

export function calculateLessonCompletion(
  lesson: LessonDoc,
  progress?: UserProgressDoc,
  vocabMap?: Record<string, UserVocabularyDoc>
): LessonCompletionStats {
  const totalVocab = lesson.vocabulary.length;
  const learnedFromVocabMap = vocabMap
    ? lesson.vocabulary.filter((v) => vocabMap[v.id]?.isLearned).length
    : 0;
  const learnedFromProgress = progress?.vocabularyLearned?.length ?? 0;
  const learnedVocab = Math.min(totalVocab, Math.max(learnedFromVocabMap, learnedFromProgress));
  const quizCompleted = Boolean(progress?.lessonCompleted);
  const bestScore = progress?.quizBestScore ?? 0;

  const vocabRatio = totalVocab > 0 ? learnedVocab / totalVocab : 0;
  const percent = Math.min(
    100,
    Math.max(0, Math.round(vocabRatio * 50 + (quizCompleted ? 50 : 0)))
  );

  let statusLabel = 'Chưa bắt đầu';
  if (percent === 100) {
    statusLabel = 'Hoàn tất bài học';
  } else if (quizCompleted) {
    statusLabel = `Đã kiểm tra (${bestScore}%) · ${learnedVocab}/${totalVocab} từ`;
  } else if (learnedVocab > 0) {
    statusLabel = `${learnedVocab}/${totalVocab} từ · Chưa kiểm tra`;
  }

  return {
    percent,
    learnedVocab,
    totalVocab,
    quizCompleted,
    bestScore,
    statusLabel,
  };
}

interface LessonMiniProgressProps {
  lesson: LessonDoc;
  progress?: UserProgressDoc;
  vocabMap?: Record<string, UserVocabularyDoc>;
  compact?: boolean;
}

export function LessonMiniProgress({
  lesson,
  progress,
  vocabMap,
  compact = false,
}: LessonMiniProgressProps) {
  const stats = calculateLessonCompletion(lesson, progress, vocabMap);
  const isDone = stats.percent === 100;
  const hasStarted = stats.percent > 0;

  const barFillClass = isDone
    ? 'bg-emerald-500 dark:bg-emerald-400'
    : hasStarted
      ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C]'
      : 'bg-slate-300 dark:bg-slate-700';

  const percentTextClass = isDone
    ? 'text-emerald-600 dark:text-emerald-400'
    : hasStarted
      ? 'text-[#D94E00] dark:text-[#FF8524]'
      : 'text-slate-500 dark:text-slate-400';

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
        <span className="text-slate-500 dark:text-slate-400 truncate">
          {compact ? stats.statusLabel : `Hoàn thành bài học · ${stats.statusLabel}`}
        </span>
        <span className={`font-mono font-bold shrink-0 ${percentTextClass}`}>
          {stats.percent}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`Tiến độ hoàn thành bài học ${lesson.title}`}
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`${compact ? 'h-1.5' : 'h-2'} w-full rounded-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden`}
      >
        <div
          className={`h-full w-full rounded-full origin-left transition-transform duration-200 ease-out ${barFillClass}`}
          style={{
            transform: `scaleX(${stats.percent / 100})`,
          }}
        />
      </div>
    </div>
  );
}
