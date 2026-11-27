import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gem,
  RotateCcw,
  Send,
  Target,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getLessonGemReward } from '../../data/pilotGearCatalog';
import { isFirestoreQuotaError } from '../../firebase';
import type { LessonDoc, QuizRating } from '../../types';
import { ConfettiCelebration } from '../ConfettiCelebration';
import {
  playCorrectBeep,
  playMissionCompleteChime,
  playWrongTone,
} from '../../utils/cockpitAudio';
import {
  getQuestionTypeLabelVi,
  getQuizRating,
  getQuizRatingVi,
  prepareShuffledQuiz,
  type ShuffledQuizQuestion,
} from '../../utils/helpers';

interface QuizSectionProps {
  lesson: LessonDoc;
  onNextLesson?: () => void;
}

type ReviewFilterMode = 'all' | 'mistakes';

export function QuizSection({ lesson, onNextLesson }: QuizSectionProps) {
  const { saveQuizAttempt, addToast, progressMap, triggerGemFlight } = useApp();

  const [questions, setQuestions] = useState<ShuffledQuizQuestion[]>(() =>
    prepareShuffledQuiz(lesson.quiz)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [earnedGems, setEarnedGems] = useState(0);
  const [completedLessonNow, setCompletedLessonNow] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterMode>('all');

  // Focused reinforcement drill state for re-answering only missed questions
  const [drillQuestions, setDrillQuestions] = useState<ShuffledQuizQuestion[] | null>(null);
  const [drillAnswers, setDrillAnswers] = useState<Record<string, number>>({});

  const startTimeRef = useRef<number>(Date.now());
  const reviewSectionRef = useRef<HTMLElement | null>(null);

  // Reset quiz with fresh shuffle when lesson changes
  useEffect(() => {
    setQuestions(prepareShuffledQuiz(lesson.quiz));
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
    setElapsedSeconds(0);
    setConfettiKey(0);
    setEarnedGems(0);
    setCompletedLessonNow(false);
    setReviewFilter('all');
    setDrillQuestions(null);
    setDrillAnswers({});
    startTimeRef.current = Date.now();
  }, [lesson.lessonId, lesson.quiz]);

  // Live timer while quiz is active
  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const progressPct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const summary = useMemo(() => {
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.shuffledCorrectIndex) correct += 1;
    });
    const wrong = Math.max(0, totalCount - correct);
    const score = totalCount > 0 ? Math.round((correct / totalCount) * 100) : 0;
    const rating: QuizRating = getQuizRating(score);
    return { correct, wrong, score, rating };
  }, [questions, answers, totalCount]);

  const reviewEntries = useMemo(() => {
    return questions.map((q, idx) => {
      const userAns = answers[q.id];
      const isCorrect = userAns === q.shuffledCorrectIndex;
      return { q, originalNumber: idx + 1, userAns, isCorrect };
    });
  }, [questions, answers]);

  const mistakeEntries = useMemo(
    () => reviewEntries.filter((entry) => !entry.isCorrect),
    [reviewEntries]
  );

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (submitted) return;
    // Lock each question once answered so learner gets instant feedback without gaming the score
    if (answers[questionId] !== undefined) return;
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      if (optionIdx === question.shuffledCorrectIndex) {
        playCorrectBeep();
      } else {
        playWrongTone();
      }
    }
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (answeredCount < totalCount) {
      addToast(
        'info',
        `Bạn còn ${totalCount - answeredCount} câu chưa trả lời. Hãy hoàn thành tất cả các câu trước khi nộp bài.`
      );
      const firstUnanswered = questions.findIndex((q) => answers[q.id] === undefined);
      if (firstUnanswered >= 0) setCurrentIdx(firstUnanswered);
      return;
    }

    const wasCompleted = Boolean(progressMap[lesson.lessonId]?.lessonCompleted);
    const quizGems =
      Math.round((Math.max(0, Math.min(100, summary.score)) / 100) * 20) +
      (summary.score >= 100 ? 8 : 0);
    const completedNow = !wasCompleted && summary.score >= 60;
    const totalGained = quizGems + (completedNow ? getLessonGemReward(lesson) : 0);

    setSubmitting(true);
    try {
      const duration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
      await saveQuizAttempt({
        lesson,
        score: summary.score,
        totalQuestions: totalCount,
        correctAnswers: summary.correct,
        wrongAnswers: summary.wrong,
        rating: summary.rating,
        durationSeconds: duration,
      });
      setEarnedGems(totalGained);
      setCompletedLessonNow(completedNow);
      setElapsedSeconds(duration);
      setSubmitted(true);
      setReviewFilter('all');
      setDrillQuestions(null);
      setDrillAnswers({});
      setConfettiKey((k) => k + 1);
      playMissionCompleteChime();
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        const duration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setEarnedGems(totalGained);
        setCompletedLessonNow(completedNow);
        setElapsedSeconds(duration);
        setSubmitted(true);
        setReviewFilter('all');
        setDrillQuestions(null);
        setDrillAnswers({});
        setConfettiKey((k) => k + 1);
        if (totalGained > 0) {
          triggerGemFlight({
            amount: totalGained,
            lessonCompleted: completedNow,
            label: completedNow ? 'Hoàn thành bài học' : 'Thưởng kiểm tra',
          });
        }
        playMissionCompleteChime();
        addToast(
          'info',
          'Chúc mừng bạn đã hoàn thành bài kiểm tra! Hạn mức lưu Firestore hôm nay đã tạm hết nên kết quả được hiển thị trực tiếp trên máy.'
        );
      } else {
        const rawMsg = err instanceof Error ? err.message : '';
        const friendlyMsg =
          rawMsg && !rawMsg.trim().startsWith('{')
            ? rawMsg
            : 'Không thể lưu kết quả bài kiểm tra lên máy chủ. Vui lòng thử lại sau ít giây.';
        addToast('error', friendlyMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setQuestions(prepareShuffledQuiz(lesson.quiz));
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
    setElapsedSeconds(0);
    setConfettiKey(0);
    setReviewFilter('all');
    setDrillQuestions(null);
    setDrillAnswers({});
    startTimeRef.current = Date.now();
  };

  const handleOpenReviewMistakes = () => {
    setReviewFilter('mistakes');
    setDrillQuestions(null);
    setDrillAnswers({});
    window.requestAnimationFrame(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleStartMistakesDrill = () => {
    if (mistakeEntries.length === 0) return;
    const missedRaw = mistakeEntries.map((entry) => entry.q);
    setReviewFilter('mistakes');
    setDrillQuestions(prepareShuffledQuiz(missedRaw));
    setDrillAnswers({});
    window.requestAnimationFrame(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSelectDrillOption = (questionId: string, optionIdx: number) => {
    if (!drillQuestions || drillAnswers[questionId] !== undefined) return;
    const target = drillQuestions.find((q) => q.id === questionId);
    if (target) {
      if (optionIdx === target.shuffledCorrectIndex) {
        playCorrectBeep();
      } else {
        playWrongTone();
      }
    }
    setDrillAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  if (totalCount === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center text-sm text-slate-500">
        Bài học này hiện chưa có câu hỏi kiểm tra.
      </div>
    );
  }

  // Submitted Result Summary Screen
  if (submitted) {
    const ratingInfo = getQuizRatingVi(summary.rating);
    const toneClass =
      ratingInfo.tone === 'emerald'
        ? 'text-emerald-600 dark:text-emerald-400'
        : ratingInfo.tone === 'blue'
          ? 'text-blue-600 dark:text-blue-400'
          : ratingInfo.tone === 'amber'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-rose-600 dark:text-rose-400';

    const visibleEntries = reviewFilter === 'mistakes' ? mistakeEntries : reviewEntries;
    const drillAnsweredCount = drillQuestions ? Object.keys(drillAnswers).length : 0;
    const drillCorrectCount = drillQuestions
      ? drillQuestions.filter((q) => drillAnswers[q.id] === q.shuffledCorrectIndex).length
      : 0;
    const drillCompleted = Boolean(drillQuestions && drillAnsweredCount === drillQuestions.length);

    return (
      <div className="space-y-6">
        <ConfettiCelebration
          triggerKey={confettiKey}
          intensity={summary.score >= 70 ? 'grand' : 'standard'}
        />
        <section className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-[#FF6B00]/30 text-[#FF6B00] dark:text-[#FF8524] flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <div className={`text-sm font-bold ${toneClass}`}>
              {summary.rating} — {ratingInfo.labelVi}
            </div>
            <div className="text-5xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {summary.score}%
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {ratingInfo.descriptionVi}
            </p>
            {earnedGems > 0 && (
              <div
                data-gem-origin="lesson-reward"
                className="pt-1.5 inline-flex flex-wrap items-center justify-center gap-1.5 text-sm font-extrabold text-sky-600 dark:text-sky-400 tabular-nums"
              >
                <Gem className="w-4 h-4 shrink-0" />
                <span>+{earnedGems.toLocaleString('vi-VN')} Ngọc kiến thức</span>
                <span className="text-slate-300 dark:text-slate-700 font-normal" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {completedLessonNow
                    ? 'Đã hoàn thành bài học & cộng vào Bảng xếp hạng'
                    : 'Đã cộng vào Bảng xếp hạng'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4 border-t border-slate-100 dark:border-slate-800 tabular-nums">
            <div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {summary.correct}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Câu đúng</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {summary.wrong}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Câu sai</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatTimer(elapsedSeconds)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Thời gian làm</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {mistakeEntries.length > 0 && (
              <button
                type="button"
                onClick={handleOpenReviewMistakes}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-sm font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition-colors whitespace-nowrap"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                Ôn lại câu sai ({mistakeEntries.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              Làm lại bài kiểm tra (trộn mới)
            </button>
            {onNextLesson && (
              <button
                type="button"
                onClick={onNextLesson}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors whitespace-nowrap shadow-[0_0_16px_rgba(255,107,0,0.22)]"
              >
                Sang bài học tiếp theo
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </section>

        {/* Detailed Review & Focused Review Mistakes Section */}
        <section
          ref={reviewSectionRef}
          className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {drillQuestions
                  ? `Luyện củng cố câu sai (${drillQuestions.length} câu)`
                  : reviewFilter === 'mistakes'
                    ? `Ôn lại câu trả lời sai (${mistakeEntries.length} câu)`
                    : 'Xem lại chi tiết đáp án và giải thích'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {drillQuestions
                  ? 'Trả lời lại các câu bạn đã làm sai với thứ tự đáp án được trộn mới để ghi nhớ chắc chắn hơn.'
                  : reviewFilter === 'mistakes'
                    ? 'Chỉ hiển thị những câu bạn trả lời chưa đúng để tập trung khắc phục lỗ hổng kiến thức.'
                    : 'Xem toàn bộ kết quả bài làm hoặc chuyển sang chế độ chỉ xem câu sai để ôn tập trọng tâm.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              {/* Filter toggle: Only Mistakes vs All Questions */}
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setReviewFilter('mistakes');
                    setDrillQuestions(null);
                    setDrillAnswers({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                    reviewFilter === 'mistakes' && !drillQuestions
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-rose-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Chỉ câu sai ({mistakeEntries.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewFilter('all');
                    setDrillQuestions(null);
                    setDrillAnswers({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                    reviewFilter === 'all' && !drillQuestions
                      ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tất cả ({questions.length})
                </button>
              </div>

              {mistakeEntries.length > 0 && !drillQuestions && (
                <button
                  type="button"
                  onClick={handleStartMistakesDrill}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  Làm lại {mistakeEntries.length} câu sai
                </button>
              )}

              {drillQuestions && (
                <button
                  type="button"
                  onClick={() => {
                    setDrillQuestions(null);
                    setDrillAnswers({});
                    setReviewFilter('mistakes');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  Quay lại danh sách câu sai
                </button>
              )}
            </div>
          </div>

          {/* Focused Reinforcement Interactive Drill Mode */}
          {drillQuestions ? (
            <div className="space-y-5">
              {drillCompleted && (
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    drillCorrectCount === drillQuestions.length
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold tabular-nums">
                      Kết quả luyện củng cố: {drillCorrectCount}/{drillQuestions.length} câu đúng
                    </p>
                    <p className="text-xs opacity-90">
                      {drillCorrectCount === drillQuestions.length
                        ? 'Xuất sắc! Bạn đã khắc phục toàn bộ các câu sai trước đó.'
                        : 'Bạn có thể trộn lại vòng luyện củng cố để ghi nhớ chắc chắn hơn.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartMistakesDrill}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold whitespace-nowrap self-start sm:self-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Luyện lại vòng này
                  </button>
                </div>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {drillQuestions.map((dq, idx) => {
                  const chosen = drillAnswers[dq.id];
                  const answered = chosen !== undefined;
                  const isRight = chosen === dq.shuffledCorrectIndex;
                  return (
                    <div key={dq.id} className="py-5 first:pt-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          Câu sai {idx + 1}/{drillQuestions.length}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{getQuestionTypeLabelVi(dq.type)}</span>
                      </div>

                      {dq.passage && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm font-serif text-slate-800 dark:text-slate-200 leading-relaxed">
                          {dq.passage}
                        </div>
                      )}

                      <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {dq.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dq.shuffledOptions.map((optText, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isSelected = chosen === optIdx;
                          const isCorrectOpt = optIdx === dq.shuffledCorrectIndex;

                          let btnClass =
                            'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-[#FF6B00]/60 hover:bg-amber-50/40 dark:hover:bg-slate-800';
                          if (answered) {
                            if (isCorrectOpt) {
                              btnClass =
                                'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold';
                            } else if (isSelected) {
                              btnClass =
                                'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
                            } else {
                              btnClass =
                                'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={answered}
                              onClick={() => handleSelectDrillOption(dq.id, optIdx)}
                              className={`text-left px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-colors flex items-center justify-between gap-2 ${btnClass}`}
                            >
                              <span className="flex items-start gap-2">
                                <span className="font-mono text-xs font-bold mt-0.5 shrink-0">
                                  {letter}.
                                </span>
                                <span>{optText}</span>
                              </span>
                              {answered && isCorrectOpt && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              )}
                              {answered && isSelected && !isCorrectOpt && (
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <p
                          className={`text-xs leading-relaxed ${
                            isRight
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          <span className="font-bold">
                            {isRight ? 'Chính xác!' : 'Vẫn chưa đúng:'}
                          </span>{' '}
                          {dq.explanationVi}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Tuyệt vời! Bạn không làm sai câu nào
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Bạn đã đạt điểm tuyệt đối 100% trong bài kiểm tra này. Hãy chuyển sang bài học tiếp theo hoặc xem lại toàn bộ đáp án nếu muốn.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleEntries.map(({ q, originalNumber, userAns, isCorrect }) => (
                <div key={q.id} className="py-4 first:pt-1 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-1" />
                    )}
                    <div className="space-y-1.5 text-sm flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          Câu {originalNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{getQuestionTypeLabelVi(q.type)}</span>
                      </div>

                      {q.passage && reviewFilter === 'mistakes' && (
                        <p className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm font-serif text-slate-800 dark:text-slate-200 leading-relaxed">
                          {q.passage}
                        </p>
                      )}

                      <p className="font-semibold text-slate-900 dark:text-white">
                        {q.question}
                      </p>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Bạn chọn:{' '}
                        <span
                          className={`font-semibold ${
                            isCorrect
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400 line-through decoration-rose-400/70'
                          }`}
                        >
                          {q.shuffledOptions[userAns] ?? 'Chưa chọn'}
                        </span>
                        {!isCorrect && (
                          <>
                            {' · '}Đáp án đúng:{' '}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {q.shuffledOptions[q.shuffledCorrectIndex]}
                            </span>
                          </>
                        )}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {q.explanationVi}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Active Quiz Interface
  const selectedForCurrent = currentQ ? answers[currentQ.id] : undefined;
  const isCurrentAnswered = selectedForCurrent !== undefined;
  const isCurrentCorrect = currentQ && selectedForCurrent === currentQ.shuffledCorrectIndex;

  return (
    <div className="space-y-6">
      {/* Progress & Timer Header */}
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm tabular-nums">
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            Câu {currentIdx + 1} / {totalCount}
            <span className="text-slate-400 mx-2" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">
              Đã trả lời {answeredCount}/{totalCount}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-[#FF6B00] dark:text-[#FF8524]" />
            {formatTimer(elapsedSeconds)}
          </div>
        </div>

        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C] rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Question Jump Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isActive = idx === currentIdx;
            const statusStyle =
              ans === undefined
                ? isActive
                  ? 'border-[#FF6B00] bg-amber-50 dark:bg-amber-950/60 text-[#D94E00] dark:text-[#FF8524]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                : ans === q.shuffledCorrectIndex
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300';

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`w-8 h-8 rounded-lg border text-xs font-mono font-semibold transition-colors ${statusStyle} ${
                  isActive ? 'ring-2 ring-[#FF6B00]/40' : ''
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Question Card */}
      {currentQ && (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 space-y-6">
          <div className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
            Dạng câu hỏi: {getQuestionTypeLabelVi(currentQ.type)}
          </div>

          {currentQ.passage && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Đọc đoạn văn sau và trả lời câu hỏi:
              </div>
              <p className="text-sm sm:text-base font-serif text-slate-900 dark:text-slate-100 leading-relaxed">
                {currentQ.passage}
              </p>
            </div>
          )}

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
            {currentQ.question}
          </h3>

          {/* 4 Shuffled Options A, B, C, D */}
          <div className="space-y-3">
            {currentQ.shuffledOptions.map((optionText, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const isSelected = selectedForCurrent === optIdx;
              const isRightOption = optIdx === currentQ.shuffledCorrectIndex;

              let btnClass =
                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-800';

              if (isCurrentAnswered) {
                if (isRightOption) {
                  btnClass =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold';
                } else if (isSelected) {
                  btnClass =
                    'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
                } else {
                  btnClass =
                    'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={isCurrentAnswered}
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-colors flex items-center justify-between gap-3 ${btnClass}`}
                >
                  <span className="flex items-start gap-3">
                    <span className="font-mono text-xs font-bold mt-0.5 shrink-0">{letter}.</span>
                    <span>{optionText}</span>
                  </span>
                  {isCurrentAnswered && isRightOption && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {isCurrentAnswered && isSelected && !isRightOption && (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Instant Right/Wrong Feedback + Vietnamese Explanation */}
          {isCurrentAnswered && (
            <div
              className={`p-4 rounded-xl border text-sm leading-relaxed flex items-start gap-3 ${
                isCurrentCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              }`}
            >
              {isCurrentCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold mb-1">
                  {isCurrentCorrect ? 'Chính xác!' : 'Chưa chính xác'}
                </p>
                <p className="text-xs sm:text-sm opacity-95">{currentQ.explanationVi}</p>
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Câu trước
            </button>

            <div className="flex items-center gap-2.5">
              {currentIdx < totalCount - 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(totalCount - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Câu tiếp theo
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {(answeredCount === totalCount || currentIdx === totalCount - 1) && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmitQuiz()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-[0_0_16px_rgba(255,107,0,0.22)]"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Đang chấm điểm...' : 'Nộp bài & Lưu điểm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
