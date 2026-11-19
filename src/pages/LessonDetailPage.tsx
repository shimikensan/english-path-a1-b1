import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquareQuote,
} from 'lucide-react';
import { GrammarSection } from '../components/lesson/GrammarSection';
import { QuizSection } from '../components/lesson/QuizSection';
import { SentencePatternsSection } from '../components/lesson/SentencePatternsSection';
import { VocabularySection } from '../components/lesson/VocabularySection';
import { useApp } from '../context/AppContext';
import type { LessonTab } from '../types';

interface LessonDetailPageProps {
  lessonId: string;
  initialTab?: LessonTab;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
}

export function LessonDetailPage({
  lessonId,
  initialTab = 'vocabulary',
  onBack,
  onOpenLesson,
}: LessonDetailPageProps) {
  const { lessons, progressMap } = useApp();
  const [activeTab, setActiveTab] = useState<LessonTab>(initialTab);

  const lessonIndex = lessons.findIndex((l) => l.lessonId === lessonId);
  const lesson = lessonIndex >= 0 ? lessons[lessonIndex] : lessons[0];
  const nextLesson = lessonIndex >= 0 && lessonIndex + 1 < lessons.length ? lessons[lessonIndex + 1] : undefined;

  const progress = lesson ? progressMap[lesson.lessonId] : undefined;

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <p className="text-base font-bold text-slate-900 dark:text-white">
          Không tìm thấy bài học yêu cầu
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
        >
          Quay lại Lộ trình học
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lesson Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại lộ trình
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              Level {lesson.levelId}
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
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {lesson.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {lesson.description}
          </p>
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
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
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
