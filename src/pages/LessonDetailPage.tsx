import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Maximize2,
  MessageSquareQuote,
} from 'lucide-react';
import { ConfettiCelebration } from '../components/ConfettiCelebration';
import { calculateLessonCompletion, LessonMiniProgress } from '../components/LessonMiniProgress';
import { GrammarSection } from '../components/lesson/GrammarSection';
import { QuizSection } from '../components/lesson/QuizSection';
import { SentencePatternsSection } from '../components/lesson/SentencePatternsSection';
import { VocabularySection } from '../components/lesson/VocabularySection';
import { useApp } from '../context/AppContext';
import type { LessonTab } from '../types';
import { playMissionCompleteChime } from '../utils/cockpitAudio';

interface LessonDetailPageProps {
  lessonId: string;
  initialTab?: LessonTab;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
}

export function LessonDetailPage({
  lessonId,
  initialTab = 'vocabulary',
  focusMode = false,
  onToggleFocusMode,
  onBack,
  onOpenLesson,
}: LessonDetailPageProps) {
  const { lessons, progressMap, vocabMap, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<LessonTab>(initialTab);
  const [masteryConfettiKey, setMasteryConfettiKey] = useState(0);

  const lessonIndex = lessons.findIndex((l) => l.lessonId === lessonId);
  const lesson = lessonIndex >= 0 ? lessons[lessonIndex] : lessons[0];
  const nextLesson = lessonIndex >= 0 && lessonIndex + 1 < lessons.length ? lessons[lessonIndex + 1] : undefined;

  const progress = lesson ? progressMap[lesson.lessonId] : undefined;
  const completionPct = useMemo(
    () => (lesson ? calculateLessonCompletion(lesson, progress, vocabMap).percent : 0),
    [lesson, progress, vocabMap]
  );

  // Trigger celebration when learner hits 100% completion while studying vocabulary
  const prevStateRef = useRef<{ lessonId: string; pct: number }>({
    lessonId: lesson?.lessonId ?? '',
    pct: completionPct,
  });

  useEffect(() => {
    const currentId = lesson?.lessonId ?? '';
    if (prevStateRef.current.lessonId !== currentId) {
      prevStateRef.current = { lessonId: currentId, pct: completionPct };
      return;
    }
    if (prevStateRef.current.pct < 100 && completionPct === 100 && activeTab !== 'quiz') {
      setMasteryConfettiKey((k) => k + 1);
      playMissionCompleteChime();
      addToast('success', `Tuyệt vời! Bạn đã hoàn tất 100% bài học "${lesson?.title}".`);
    }
    prevStateRef.current = { lessonId: currentId, pct: completionPct };
  }, [lesson?.lessonId, lesson?.title, completionPct, activeTab, addToast]);

  const tabs = useMemo(
    () => [
      { id: 'vocabulary' as const, label: '1. Từ vựng', icon: BookOpen, count: lesson?.vocabulary.length ?? 0 },
      { id: 'patterns' as const, label: '2. Mẫu câu', icon: MessageSquareQuote, count: lesson?.sentencePatterns.length ?? 0 },
      { id: 'grammar' as const, label: '3. Ngữ pháp', icon: FileText, count: lesson?.grammar.miniPractice.length ?? 0 },
      { id: 'quiz' as const, label: '4. Kiểm tra', icon: ClipboardCheck, count: lesson?.quiz.length ?? 0 },
    ],
    [lesson]
  );

  if (!lesson) {
    return (
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center space-y-4">
        <p className="text-base font-bold text-slate-900 dark:text-white">
          Không tìm thấy bài học yêu cầu
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-semibold transition-colors"
        >
          Quay lại Lộ trình học
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfettiCelebration triggerKey={masteryConfettiKey} intensity="grand" />
      {/* Lesson Header */}
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#D94E00] dark:hover:text-[#FF8524] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {lesson.levelId === 'ESP' ? 'Quay lại Chuyên ngành' : 'Quay lại lộ trình'}
          </button>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
              {lesson.levelId === 'ESP' ? 'Chuyên ngành' : `Level ${lesson.levelId}`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{lesson.topic}</span>
            {progress?.lessonCompleted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Điểm cao nhất {progress.quizBestScore}%
                </span>
              </>
            )}
            {!focusMode && onToggleFocusMode && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onToggleFocusMode}
                  className="inline-flex items-center gap-1 font-semibold text-[#D94E00] dark:text-[#FF8524] hover:underline whitespace-nowrap"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Tập trung toàn màn hình
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {lesson.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {lesson.description}
            </p>
          </div>
          <LessonMiniProgress lesson={lesson} progress={progress} vocabMap={vocabMap} compact />
        </div>

        {/* 4-Part Lesson Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#FF6B00] bg-[#FF6B00] text-white shadow-[0_0_16px_rgba(255,107,0,0.24)]'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:border-[#FF6B00]/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Content */}
      {activeTab === 'vocabulary' && (
        <VocabularySection lesson={lesson} onNextSection={() => setActiveTab('patterns')} />
      )}
      {activeTab === 'patterns' && (
        <SentencePatternsSection lesson={lesson} onNextSection={() => setActiveTab('grammar')} />
      )}
      {activeTab === 'grammar' && (
        <GrammarSection lesson={lesson} onNextSection={() => setActiveTab('quiz')} />
      )}
      {activeTab === 'quiz' && (
        <QuizSection
          lesson={lesson}
          onNextLesson={
            nextLesson
              ? () => {
                  setActiveTab('vocabulary');
                  onOpenLesson(nextLesson.lessonId);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
