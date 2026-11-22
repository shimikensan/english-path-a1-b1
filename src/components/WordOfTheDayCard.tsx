import { useCallback, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Shuffle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LearnerCEFRLevel, LessonDoc, PartOfSpeech, VocabularyItem } from '../types';
import { playCorrectBeep } from '../utils/cockpitAudio';
import { getLocalDateString } from '../utils/helpers';
import { speakEnglish } from '../utils/speech';

interface WordOfTheDayCardProps {
  onOpenLesson: (lessonId: string) => void;
}

interface LevelVocabCandidate {
  lesson: LessonDoc;
  vocab: VocabularyItem;
}

const POS_LABELS_VI: Record<PartOfSpeech, string> = {
  noun: 'Danh từ (n.)',
  verb: 'Động từ (v.)',
  adjective: 'Tính từ (adj.)',
  adverb: 'Trạng từ (adv.)',
  phrase: 'Cụm từ (phrase)',
  preposition: 'Giới từ (prep.)',
  conjunction: 'Liên từ (conj.)',
  pronoun: 'Đại từ (pron.)',
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function formatTodayVi(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

export function WordOfTheDayCard({ onOpenLesson }: WordOfTheDayCardProps) {
  const { profile, lessons, vocabMap, toggleVocabState, addToast } = useApp();
  const [customSelection, setCustomSelection] = useState<{
    level: LearnerCEFRLevel;
    index: number;
  } | null>(null);
  const [speakingTarget, setSpeakingTarget] = useState<'word' | 'example' | null>(null);
  const [savingAction, setSavingAction] = useState<'learned' | 'favorite' | null>(null);

  const currentLevel: LearnerCEFRLevel = profile?.currentLevel || 'A1';
  const todayKey = getLocalDateString();

  // Gather all vocabulary entries matching the learner's current CEFR level
  const candidates = useMemo<LevelVocabCandidate[]>(() => {
    const levelLessons = lessons.filter(
      (l) => l.levelId === currentLevel && l.isPublished !== false && l.vocabulary.length > 0
    );
    const sourceLessons =
      levelLessons.length > 0
        ? levelLessons
        : lessons.filter((l) => l.isPublished !== false && l.vocabulary.length > 0);

    const list: LevelVocabCandidate[] = [];
    for (const lesson of sourceLessons) {
      for (const vocab of lesson.vocabulary) {
        list.push({ lesson, vocab });
      }
    }
    return list;
  }, [lessons, currentLevel]);

  // Deterministic daily index for the learner & level (prefers unlearned words on initial daily pick)
  const dailyIndex = useMemo(() => {
    if (candidates.length === 0) return 0;
    const seedStr = `${profile?.uid || 'pilot'}_${currentLevel}_${todayKey}`;
    const baseIdx = hashString(seedStr) % candidates.length;

    // Look ahead from baseIdx for an unlearned word so daily pick boosts passive acquisition
    for (let offset = 0; offset < candidates.length; offset++) {
      const idx = (baseIdx + offset) % candidates.length;
      if (!vocabMap[candidates[idx].vocab.id]?.isLearned) {
        return idx;
      }
    }
    return baseIdx;
  }, [candidates, profile?.uid, currentLevel, todayKey, vocabMap]);

  const activeIndex =
    customSelection !== null &&
    customSelection.level === currentLevel &&
    customSelection.index >= 0 &&
    customSelection.index < candidates.length
      ? customSelection.index
      : dailyIndex;

  const currentEntry = candidates[activeIndex] ?? null;

  const handleShuffleWord = useCallback(() => {
    if (candidates.length <= 1) return;
    let nextIdx = activeIndex;
    for (let attempts = 0; attempts < 8 && nextIdx === activeIndex; attempts++) {
      nextIdx = Math.floor(Math.random() * candidates.length);
    }
    if (nextIdx === activeIndex) {
      nextIdx = (activeIndex + 1) % candidates.length;
    }
    setCustomSelection({ level: currentLevel, index: nextIdx });
  }, [candidates.length, activeIndex, currentLevel]);

  const handleSpeak = useCallback((text: string, target: 'word' | 'example') => {
    setSpeakingTarget(target);
    speakEnglish(text, {
      accent: 'en-US',
      rate: target === 'word' ? 0.88 : 0.94,
      onEnd: () => setSpeakingTarget(null),
    });
  }, []);

  if (!currentEntry) return null;

  const { lesson, vocab } = currentEntry;
  const savedState = vocabMap[vocab.id];
  const isLearned = Boolean(savedState?.isLearned);
  const isFavorite = Boolean(savedState?.isFavorite);
  const posLabel = POS_LABELS_VI[vocab.partOfSpeech] || vocab.partOfSpeech;

  const handleToggleLearned = async () => {
    setSavingAction('learned');
    // Pin the currently displayed word so marking it learned does not jump abruptly to another word
    setCustomSelection({ level: currentLevel, index: activeIndex });
    try {
      const nextLearned = !isLearned;
      await toggleVocabState(lesson, vocab, { isLearned: nextLearned });
      if (nextLearned) {
        playCorrectBeep();
        addToast('success', `Đã đánh dấu "${vocab.word}" là đã thuộc!`);
      }
    } catch {
      addToast('error', 'Không thể cập nhật trạng thái từ vựng lúc này.');
    } finally {
      setSavingAction(null);
    }
  };

  const handleToggleFavorite = async () => {
    setSavingAction('favorite');
    try {
      const nextFav = !isFavorite;
      await toggleVocabState(lesson, vocab, { isFavorite: nextFav });
      addToast(
        'info',
        nextFav
          ? `Đã lưu "${vocab.word}" vào danh sách Từ đã lưu.`
          : `Đã bỏ lưu "${vocab.word}".`
      );
    } catch {
      addToast('error', 'Không thể cập nhật mục yêu thích lúc này.');
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <section
      aria-label="Từ vựng của ngày"
      className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/12 border border-[#FF6B00]/35 text-[#D94E00] dark:text-[#FF8524] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
              <span>Từ vựng của ngày</span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span>CEFR {currentLevel}</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                {formatTodayVi()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Gợi ý theo trình độ {currentLevel} giúp nạp từ vựng thụ động mỗi ngày · Nguồn: {lesson.title}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShuffleWord}
          disabled={candidates.length <= 1}
          title="Gợi ý một từ vựng ngẫu nhiên khác ở trình độ hiện tại"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-[#FF6B00]/50 hover:text-[#D94E00] dark:hover:text-[#FF8524] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Đổi từ khác
        </button>
      </div>

      {/* Main Word Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Core Word, IPA, Meaning */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 p-4 sm:p-5 rounded-xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
                  {vocab.word}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {vocab.ipa && (
                    <span className="text-sm font-mono text-[#D94E00] dark:text-[#FF8524] font-semibold">
                      {vocab.ipa}
                    </span>
                  )}
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {posLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSpeak(vocab.word, 'word')}
                className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                  speakingTarget === 'word'
                    ? 'border-[#FF6B00] bg-[#FF6B00] text-white'
                    : 'border-[#FF6B00]/35 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/20'
                }`}
                aria-label={`Nghe phát âm từ ${vocab.word}`}
                title="Nghe phát âm"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Nghĩa tiếng Việt
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">
                {vocab.meaningVi}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleToggleLearned()}
              disabled={savingAction !== null}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                isLearned
                  ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isLearned ? 'Đã thuộc từ này' : 'Đánh dấu đã thuộc'}
            </button>

            <button
              type="button"
              onClick={() => void handleToggleFavorite()}
              disabled={savingAction !== null}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                isFavorite
                  ? 'border-[#FF6B00]/45 bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524]'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#FF6B00]/40'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? 'Đã lưu' : 'Lưu ôn tập'}
            </button>
          </div>
        </div>

        {/* Right: Example in Context & Quick Lesson Jump */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4 p-4 sm:p-5 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Ví dụ thực tế trong ngữ cảnh
              </span>
              {vocab.exampleEn && (
                <button
                  type="button"
                  onClick={() => handleSpeak(vocab.exampleEn, 'example')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    speakingTarget === 'example'
                      ? 'bg-[#FF6B00] text-white'
                      : 'text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/10'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Nghe câu ví dụ
                </button>
              )}
            </div>

            <blockquote className="pl-3.5 border-l-2 border-[#FF6B00] space-y-1.5">
              <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                &ldquo;{vocab.exampleEn}&rdquo;
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {vocab.exampleVi}
              </p>
            </blockquote>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 truncate">
              Chủ đề:{' '}
              <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                {lesson.topic}
              </strong>{' '}
              ({lesson.levelId})
            </span>

            <button
              type="button"
              onClick={() => onOpenLesson(lesson.lessonId)}
              className="inline-flex items-center gap-1.5 font-bold text-[#D94E00] dark:text-[#FF8524] hover:underline whitespace-nowrap"
            >
              Học trọn bộ từ vựng bài này
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
