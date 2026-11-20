import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Layers,
  List,
  RotateCw,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ESP_VOCAB_IMAGE_MAP } from '../../data';
import type { LessonDoc, VocabularyItem } from '../../types';
import { playCardFlipBeep, playCorrectBeep } from '../../utils/cockpitAudio';
import { speakEnglish, type SpeechAccent } from '../../utils/speech';

interface VocabularySectionProps {
  lesson: LessonDoc;
  onNextSection: () => void;
}

type VocabViewMode = 'flashcard' | 'list' | 'review_learned';

export function VocabularySection({ lesson, onNextSection }: VocabularySectionProps) {
  const { vocabMap, toggleVocabState, addToast } = useApp();
  const [viewMode, setViewMode] = useState<VocabViewMode>('flashcard');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [accent, setAccent] = useState<SpeechAccent>('en-US');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [previewMedia, setPreviewMedia] = useState<{
    word: string;
    meaningVi: string;
    imageUrl: string;
    captionVi: string;
  } | null>(null);

  const learnedIds = useMemo(() => {
    const set = new Set<string>();
    lesson.vocabulary.forEach((v) => {
      if (vocabMap[v.id]?.isLearned) set.add(v.id);
    });
    return set;
  }, [lesson.vocabulary, vocabMap]);

  const activeDeck = useMemo<VocabularyItem[]>(() => {
    if (viewMode === 'review_learned') {
      return lesson.vocabulary.filter((v) => learnedIds.has(v.id));
    }
    return lesson.vocabulary;
  }, [lesson.vocabulary, viewMode, learnedIds]);

  const safeIndex = activeDeck.length > 0 ? Math.min(currentIndex, activeDeck.length - 1) : 0;
  const currentWord = activeDeck[safeIndex];

  const handleToggle = async (
    vocab: VocabularyItem,
    changes: { isFavorite?: boolean; isLearned?: boolean }
  ) => {
    if (changes.isLearned) {
      playCorrectBeep();
    }
    setSavingId(vocab.id);
    try {
      await toggleVocabState(lesson, vocab, changes);
    } catch {
      addToast('error', 'Không thể cập nhật trạng thái từ vựng. Vui lòng thử lại.');
    } finally {
      setSavingId(null);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, activeDeck.length - 1)));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < activeDeck.length ? prev + 1 : 0));
  };

  const isCurrentFavorite = currentWord ? Boolean(vocabMap[currentWord.id]?.isFavorite) : false;
  const isCurrentLearned = currentWord ? Boolean(vocabMap[currentWord.id]?.isLearned) : false;

  return (
    <div className="space-y-6">
      {/* Mode Controls & Accent Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => {
              setViewMode('flashcard');
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'flashcard'
                ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Flashcard ({lesson.vocabulary.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Danh sách từ
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('review_learned');
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'review_learned'
                ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ôn từ đã học ({learnedIds.size})
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Giọng đọc:</span>
          <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setAccent('en-US')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                accent === 'en-US'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524]'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Anh – Mỹ (US)
            </button>
            <button
              type="button"
              onClick={() => setAccent('en-GB')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                accent === 'en-GB'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524]'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Anh – Anh (UK)
            </button>
          </div>
        </div>
      </div>

      {/* Flashcard / Review Learned Mode */}
      {viewMode !== 'list' ? (
        activeDeck.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-10 text-center space-y-3">
            <p className="text-base font-bold text-slate-900 dark:text-white">
              Bạn chưa đánh dấu từ nào đã học trong bài này
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Hãy học qua bộ Flashcard và nhấn "Đánh dấu đã học" để thêm từ vào danh sách ôn tập.
            </p>
            <button
              type="button"
              onClick={() => setViewMode('flashcard')}
              className="mt-2 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-semibold transition-colors"
            >
              Quay lại học Flashcard
            </button>
          </div>
        ) : currentWord ? (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Progress counter */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>
                Thẻ {safeIndex + 1} / {activeDeck.length}
              </span>
              <span>
                Đã thuộc: {learnedIds.size} / {lesson.vocabulary.length} từ
              </span>
            </div>

            {/* 3D Flippable Flashcard */}
            {(() => {
              const currentVisual =
                currentWord && !failedImages[currentWord.id]
                  ? ESP_VOCAB_IMAGE_MAP[currentWord.id]
                  : undefined;

              return (
                <div className="flashcard-scene">
                  <div
                    onClick={() => {
                      playCardFlipBeep();
                      setIsFlipped((prev) => !prev);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playCardFlipBeep();
                        setIsFlipped((prev) => !prev);
                      }
                    }}
                    aria-label="Nhấn để lật thẻ từ vựng"
                    className={`flashcard-inner relative w-full ${
                      currentVisual ? 'min-h-[380px]' : 'min-h-[320px]'
                    } cursor-pointer ${isFlipped ? 'is-flipped' : ''}`}
                  >
                    {/* Front Face (English + optional visual illustration) */}
                    <div className="flashcard-face absolute inset-0 bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-7 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
                          {lesson.levelId === 'ESP' ? 'Chuyên ngành' : lesson.levelId} ·{' '}
                          {currentWord.partOfSpeech}
                        </span>
                        <span>Nhấn vào thẻ để xem nghĩa tiếng Việt</span>
                      </div>

                      {currentVisual ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center py-3">
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <img
                              src={currentVisual.imageUrl}
                              alt={currentVisual.altVi}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedImages((prev) => ({
                                  ...prev,
                                  [currentWord.id]: true,
                                }))
                              }
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent px-3 py-2">
                              <p className="text-[11px] font-medium text-slate-100 leading-snug">
                                {currentVisual.captionVi}
                              </p>
                            </div>
                          </div>

                          <div className="text-center sm:text-left space-y-2.5">
                            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                              {currentWord.word}
                            </div>
                            <div className="text-sm sm:text-base font-mono text-[#D94E00] dark:text-[#FF8524]">
                              {currentWord.ipa}
                            </div>
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakEnglish(currentWord.word, { accent });
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-[#FF6B00]/30 text-[#D94E00] dark:text-[#FF8524] text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                              >
                                <Volume2 className="w-4 h-4" />
                                Nghe phát âm
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-3 py-4">
                          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {currentWord.word}
                          </div>
                          <div className="text-base font-mono text-[#D94E00] dark:text-[#FF8524]">
                            {currentWord.ipa}
                          </div>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakEnglish(currentWord.word, { accent });
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-[#FF6B00]/30 text-[#D94E00] dark:text-[#FF8524] text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                            >
                              <Volume2 className="w-4 h-4" />
                              Nghe phát âm
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Lật thẻ</span>
                      </div>
                    </div>

                {/* Back Face (Vietnamese + Example) */}
                <div className="flashcard-face flashcard-back absolute inset-0 bg-amber-50/50 dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-[#D94E00] dark:text-[#FF8524]">
                    <span className="font-semibold">
                      {currentWord.word} · {currentWord.partOfSpeech}
                    </span>
                    <span className="font-mono">{currentWord.ipa}</span>
                  </div>

                  <div className="space-y-4 py-2 text-center">
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                      {currentWord.meaningVi}
                    </div>

                    <div className="pt-4 border-t border-amber-200/70 dark:border-slate-800 space-y-1.5 text-left max-w-lg mx-auto">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm sm:text-base font-serif text-slate-900 dark:text-slate-100 leading-relaxed">
                          "{currentWord.exampleEn}"
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakEnglish(currentWord.exampleEn, { accent });
                          }}
                          className="p-2 rounded-lg text-[#D94E00] dark:text-[#FF8524] hover:bg-amber-100 dark:hover:bg-slate-800 shrink-0"
                          aria-label="Nghe câu ví dụ"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {currentWord.exampleVi}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Nhấn để lật lại mặt tiếng Anh</span>
                  </div>
                </div>
              </div>
            </div>
              );
            })()}

            {/* Action Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Từ trước
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Từ tiếp theo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingId === currentWord.id}
                  onClick={() => void handleToggle(currentWord, { isFavorite: !isCurrentFavorite })}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
                    isCurrentFavorite
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isCurrentFavorite ? 'fill-current' : ''}`} />
                  {isCurrentFavorite ? 'Đã yêu thích' : 'Yêu thích'}
                </button>

                <button
                  type="button"
                  disabled={savingId === currentWord.id}
                  onClick={() => void handleToggle(currentWord, { isLearned: !isCurrentLearned })}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                    isCurrentLearned
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-[#FF6B00] text-white hover:bg-[#FF7E1F]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isCurrentLearned ? 'Đã thuộc từ này' : 'Đánh dấu đã học'}
                </button>
              </div>
            </div>
          </div>
        ) : null
      ) : (
        /* Full List Mode */
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {lesson.vocabulary.map((vocab, idx) => {
            const isFav = Boolean(vocabMap[vocab.id]?.isFavorite);
            const isLearned = Boolean(vocabMap[vocab.id]?.isLearned);
            const visual = !failedImages[vocab.id] ? ESP_VOCAB_IMAGE_MAP[vocab.id] : undefined;
            return (
              <div
                key={vocab.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {visual && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewMedia({
                          word: vocab.word,
                          meaningVi: vocab.meaningVi,
                          imageUrl: visual.imageUrl,
                          captionVi: visual.captionVi,
                        })
                      }
                      className="w-24 aspect-[4/3] rounded-xl overflow-hidden border border-[#FF6B00]/40 bg-slate-950 shrink-0 hover:opacity-90 transition-opacity"
                      title="Nhấn để phóng to hình minh họa"
                    >
                      <img
                        src={visual.imageUrl}
                        alt={visual.altVi}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [vocab.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {vocab.word}
                      </span>
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        {vocab.ipa}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({vocab.partOfSpeech})
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        — {vocab.meaningVi}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-serif text-slate-800 dark:text-slate-200">
                        {vocab.exampleEn}
                      </span>{' '}
                      · {vocab.exampleVi}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-6 md:pl-0">
                  <button
                    type="button"
                    onClick={() => speakEnglish(vocab.word, { accent })}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    aria-label={`Nghe phát âm ${vocab.word}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={savingId === vocab.id}
                    onClick={() => void handleToggle(vocab, { isFavorite: !isFav })}
                    className={`p-2 rounded-lg border transition-colors ${
                      isFav
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600'
                    }`}
                    aria-label="Đánh dấu yêu thích"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    disabled={savingId === vocab.id}
                    onClick={() => void handleToggle(vocab, { isLearned: !isLearned })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      isLearned
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isLearned ? 'Đã thuộc' : 'Đã học'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Next section CTA */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNextSection}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors shadow-[0_0_16px_rgba(255,107,0,0.22)]"
        >
          Chuyển sang Phần 2: Mẫu câu
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Lightbox Modal for Enlarged Visual Illustration */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 cockpit-radar-panel overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {previewMedia.word}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {previewMedia.meaningVi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Đóng ảnh minh họa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[4/3] w-full bg-slate-950">
              <img
                src={previewMedia.imageUrl}
                alt={previewMedia.captionVi}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
              <span>{previewMedia.captionVi}</span>
              <button
                type="button"
                onClick={() => speakEnglish(previewMedia.word, { accent })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] text-white font-semibold whitespace-nowrap"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Nghe phát âm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
