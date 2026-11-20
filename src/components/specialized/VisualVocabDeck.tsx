import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ESP_VISUAL_CARDS,
  type EspTrackId,
  type EspVisualVocabCard,
} from '../../data';
import type { LessonTab } from '../../types';
import {
  playCardFlipBeep,
  playCorrectBeep,
  playMissionCompleteChime,
  playWrongTone,
} from '../../utils/cockpitAudio';
import { shuffleArray } from '../../utils/helpers';
import { speakEnglish, type SpeechAccent } from '../../utils/speech';

interface VisualVocabDeckProps {
  selectedTrackId: EspTrackId;
  accent: SpeechAccent;
  onOpenLesson: (lessonId: string, tab?: LessonTab) => void;
}

type DeckMode = 'cards' | 'visual_quiz';
type ScopeFilter = 'track' | 'all';

interface VisualQuizQuestion {
  card: EspVisualVocabCard;
  options: Array<{ word: string; meaningVi: string }>;
  correctIndex: number;
}

export function VisualVocabDeck({
  selectedTrackId,
  accent,
  onOpenLesson,
}: VisualVocabDeckProps) {
  const { lessons, vocabMap, toggleVocabState, addToast } = useApp();
  const [deckMode, setDeckMode] = useState<DeckMode>('cards');
  const [scope, setScope] = useState<ScopeFilter>('track');
  const [hideWordsMode, setHideWordsMode] = useState(false);
  const [flippedMap, setFlippedMap] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Visual memory quiz state ("Nhìn hình chọn đúng thuật ngữ")
  const [quizSeed, setQuizSeed] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizSelectedOpt, setQuizSelectedOpt] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const visibleCards = useMemo(() => {
    if (scope === 'all') return ESP_VISUAL_CARDS;
    return ESP_VISUAL_CARDS.filter((c) => c.trackId === selectedTrackId);
  }, [scope, selectedTrackId]);

  const visualQuizQuestions = useMemo<VisualQuizQuestion[]>(() => {
    const basePool = scope === 'all' ? ESP_VISUAL_CARDS : visibleCards;
    const shuffledCards = shuffleArray(basePool);
    return shuffledCards.map((card) => {
      // Collect authentic distractors from the same track or other visual cards
      const otherCards = ESP_VISUAL_CARDS.filter((c) => c.id !== card.id);
      const distractorPool: Array<{ word: string; meaningVi: string }> = [
        ...card.relatedTerms,
        ...otherCards.map((c) => ({ word: c.word, meaningVi: c.meaningVi })),
      ].filter((d) => d.word.toLowerCase() !== card.word.toLowerCase());

      const uniqueDistractors: Array<{ word: string; meaningVi: string }> = [];
      const seen = new Set<string>([card.word.toLowerCase()]);
      for (const item of shuffleArray(distractorPool)) {
        const key = item.word.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueDistractors.push(item);
        }
        if (uniqueDistractors.length >= 3) break;
      }

      const correctChoice = { word: card.word, meaningVi: card.meaningVi };
      const mixed = shuffleArray([correctChoice, ...uniqueDistractors]);
      return {
        card,
        options: mixed,
        correctIndex: mixed.findIndex((o) => o.word === card.word),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCards, scope, quizSeed]);

  useEffect(() => {
    setFlippedMap({});
    setQuizIdx(0);
    setQuizSelectedOpt(null);
    setQuizScore(0);
    setQuizFinished(false);
    setQuizSeed((s) => s + 1);
  }, [selectedTrackId, scope]);

  const handleToggleVocab = async (
    card: EspVisualVocabCard,
    changes: { isFavorite?: boolean; isLearned?: boolean }
  ) => {
    const lesson = lessons.find((l) => l.lessonId === card.lessonId);
    const vocab = lesson?.vocabulary.find((v) => v.id === card.vocabId);
    if (!lesson || !vocab) return;

    if (changes.isLearned) {
      playCorrectBeep();
    }

    setSavingId(card.vocabId);
    try {
      await toggleVocabState(lesson, vocab, changes);
    } catch {
      addToast('error', 'Không thể cập nhật trạng thái từ vựng.');
    } finally {
      setSavingId(null);
    }
  };

  const handleRestartVisualQuiz = () => {
    setQuizSeed((s) => s + 1);
    setQuizIdx(0);
    setQuizSelectedOpt(null);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const activeQuizQ = visualQuizQuestions[quizIdx];

  return (
    <div className="space-y-5">
      {/* Toolbar: Mode Switch + Scope + Guess-from-Image Toggle */}
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl">
            <button
              type="button"
              onClick={() => setDeckMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                deckMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Bộ thẻ ảnh lật 2 mặt
            </button>
            <button
              type="button"
              onClick={() => {
                setDeckMode('visual_quiz');
                handleRestartVisualQuiz();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                deckMode === 'visual_quiz'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Đố nhìn hình chọn từ
            </button>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl">
            <button
              type="button"
              onClick={() => setScope('track')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                scope === 'track'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Chuyên ngành đang chọn (3 thẻ)
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                scope === 'all'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả 3 chuyên ngành ({ESP_VISUAL_CARDS.length} thẻ)
            </button>
          </div>
        </div>

        {deckMode === 'cards' && (
          <button
            type="button"
            onClick={() => setHideWordsMode((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap self-start lg:self-auto ${
              hideWordsMode
                ? 'border-[#FF6B00] bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524]'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {hideWordsMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {hideWordsMode ? 'Đang ẩn từ (Nhìn ảnh đoán từ)' : 'Ẩn từ tiếng Anh để tự nhớ'}
          </button>
        )}
      </div>

      {/* MODE 1: INTERACTIVE VISUAL FLASHCARD GALLERY */}
      {deckMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleCards.map((card) => {
            const isFlipped = Boolean(flippedMap[card.id]);
            const isFav = Boolean(vocabMap[card.vocabId]?.isFavorite);
            const isLearned = Boolean(vocabMap[card.vocabId]?.isLearned);

            return (
              <article
                key={card.id}
                className="bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive overflow-hidden flex flex-col justify-between"
              >
                {!isFlipped ? (
                  /* VISUAL FRONT FACE */
                  <div className="flex flex-col flex-1 justify-between">
                    <div>
                      <div
                        onClick={() => {
                          playCardFlipBeep();
                          setFlippedMap((prev) => ({ ...prev, [card.id]: true }));
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            playCardFlipBeep();
                            setFlippedMap((prev) => ({ ...prev, [card.id]: true }));
                          }
                        }}
                        className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden cursor-pointer group"
                        aria-label={`Lật thẻ từ vựng ${card.word}`}
                      >
                        {!failedImages[card.id] ? (
                          <img
                            src={card.imageUrl}
                            alt={card.imageAltVi}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [card.id]: true }))
                            }
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#07111F] via-[#132B4D] to-[#1E3A5F] flex flex-col items-center justify-center p-4 text-center text-slate-200">
                            <ImageIcon className="w-8 h-8 text-[#FF8524] mb-2" />
                            <span className="text-sm font-bold">{card.word}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                          <div className="min-w-0">
                            {hideWordsMode ? (
                              <p className="text-xs font-semibold text-amber-300">
                                Nhấn vào ảnh để kiểm tra đáp án & giải thích
                              </p>
                            ) : (
                              <>
                                <h4 className="text-lg font-extrabold tracking-tight leading-tight">
                                  {card.word}
                                </h4>
                                <p className="text-xs font-mono text-amber-300 mt-0.5">
                                  {card.ipa} · {card.partOfSpeech}
                                </p>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakEnglish(card.word, { accent });
                            }}
                            className="p-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white shrink-0 shadow-[0_0_16px_rgba(255,107,0,0.35)] transition-colors"
                            aria-label={`Nghe phát âm ${card.word}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {hideWordsMode ? 'Bạn gọi thiết bị / quy trình này là gì?' : card.meaningVi}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                              {card.visualCueVi}
                            </p>
                          </div>
                        </div>

                        {/* Related Visual Terms in this Scene */}
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            Từ liên quan trong khung hình (nhấn để nghe):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {card.relatedTerms.map((rt) => (
                              <button
                                key={rt.word}
                                type="button"
                                onClick={() => speakEnglish(rt.word, { accent })}
                                title={`${rt.word}: ${rt.meaningVi}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-[#FF6B00]/15 hover:text-[#D94E00] dark:hover:text-[#FF8524] transition-colors"
                              >
                                <Volume2 className="w-3 h-3 opacity-70" />
                                <span>{rt.word}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playCardFlipBeep();
                          setFlippedMap((prev) => ({ ...prev, [card.id]: true }));
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D94E00] dark:text-[#FF8524] hover:underline"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Lật xem ví dụ & ngữ cảnh
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={savingId === card.vocabId}
                          onClick={() => void handleToggleVocab(card, { isFavorite: !isFav })}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isFav
                              ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600'
                          }`}
                          aria-label="Yêu thích thuật ngữ"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          disabled={savingId === card.vocabId}
                          onClick={() => void handleToggleVocab(card, { isLearned: !isLearned })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            isLearned
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isLearned ? 'Đã thuộc' : 'Đánh dấu'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CONTEXT & EXAMPLE BACK FACE */
                  <div className="p-5 flex flex-col flex-1 justify-between gap-4 bg-amber-50/35 dark:bg-slate-900">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                            {card.word}
                          </div>
                          <div className="text-xs font-mono text-[#D94E00] dark:text-[#FF8524]">
                            {card.ipa} · {card.partOfSpeech}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakEnglish(card.word, { accent })}
                          className="p-2 rounded-lg bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/20"
                          aria-label={`Nghe phát âm ${card.word}`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-base font-bold text-amber-800 dark:text-amber-300">
                        {card.meaningVi}
                      </div>

                      <div className="rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-serif text-slate-900 dark:text-slate-100 leading-relaxed">
                            "{card.exampleEn}"
                          </p>
                          <button
                            type="button"
                            onClick={() => speakEnglish(card.exampleEn, { accent })}
                            className="p-1.5 rounded-lg text-[#D94E00] dark:text-[#FF8524] hover:bg-amber-50 dark:hover:bg-slate-800 shrink-0"
                            aria-label="Nghe câu ví dụ"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {card.exampleVi}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Giải nghĩa các thuật ngữ đi kèm trong ảnh:
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                          {card.relatedTerms.map((rt) => (
                            <li key={rt.word} className="flex items-center justify-between gap-2">
                              <span>
                                <strong className="text-slate-900 dark:text-white">{rt.word}</strong> — {rt.meaningVi}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playCardFlipBeep();
                          setFlippedMap((prev) => ({ ...prev, [card.id]: false }));
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#D94E00] dark:hover:text-[#FF8524]"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Quay lại mặt ảnh
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenLesson(card.lessonId, 'vocabulary')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#D94E00] dark:text-[#FF8524] hover:underline"
                      >
                        Mở bài học gốc
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : /* MODE 2: VISUAL MEMORY QUIZ ("NHÌN HÌNH CHỌN TỪ") */
      quizFinished ? (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center space-y-5">
          <div className="text-xs font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
            HOÀN THÀNH THỬ THÁCH NHÌN HÌNH ĐOÁN THUẬT NGỮ
          </div>
          <div className="text-5xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {quizScore} / {visualQuizQuestions.length}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ghi nhớ từ vựng qua hình ảnh thiết bị và quy trình thực tế giúp tăng tốc độ nhận diện thuật ngữ lên gấp nhiều lần khi làm việc thực địa.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleRestartVisualQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Chơi lại (trộn thứ tự ảnh)
            </button>
            <button
              type="button"
              onClick={() => setDeckMode('cards')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Xem lại bộ thẻ ảnh
            </button>
          </div>
        </div>
      ) : activeQuizQ ? (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              Ảnh {quizIdx + 1} / {visualQuizQuestions.length}
            </span>
            <span>
              Điểm hiện tại:{' '}
              <strong className="text-slate-900 dark:text-white">{quizScore}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Image Prompt */}
            <div className="space-y-3">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
                {!failedImages[activeQuizQ.card.id] ? (
                  <img
                    src={activeQuizQ.card.imageUrl}
                    alt="Hình ảnh minh họa thuật ngữ chuyên ngành"
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [activeQuizQ.card.id]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#07111F] to-[#1D3557] flex items-center justify-center text-amber-400">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Quan sát thiết bị / quy trình trên ảnh
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglish(activeQuizQ.card.word, { accent })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-[#FF6B00]/30 text-[#D94E00] dark:text-[#FF8524] text-xs font-semibold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Gợi ý âm thanh
                </button>
              </div>
            </div>

            {/* 4 Term Choices */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Thuật ngữ tiếng Anh nào mô tả chính xác hình ảnh này?
              </p>
              <div className="space-y-2.5">
                {activeQuizQ.options.map((opt, idx) => {
                  const answered = quizSelectedOpt !== null;
                  const isCorrect = idx === activeQuizQ.correctIndex;
                  const isPicked = idx === quizSelectedOpt;

                  let cls =
                    'border-slate-200 dark:border-slate-700 hover:border-[#FF6B00] hover:bg-amber-50/40 dark:hover:bg-slate-800';
                  if (answered) {
                    if (isCorrect) {
                      cls =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-semibold';
                    } else if (isPicked) {
                      cls =
                        'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200';
                    } else {
                      cls = 'border-slate-200 dark:border-slate-800 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={opt.word}
                      type="button"
                      disabled={answered}
                      onClick={() => {
                        setQuizSelectedOpt(idx);
                        if (idx === activeQuizQ.correctIndex) {
                          playCorrectBeep();
                          setQuizScore((s) => s + 1);
                        } else {
                          playWrongTone();
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center justify-between gap-2 ${cls}`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{opt.word}</div>
                        {answered && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {opt.meaningVi}
                          </div>
                        )}
                      </div>
                      {answered && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {answered && isPicked && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {quizSelectedOpt !== null && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-white">{activeQuizQ.card.word}</strong> ({activeQuizQ.card.ipa}) —{' '}
                {activeQuizQ.card.visualCueVi}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (quizIdx + 1 < visualQuizQuestions.length) {
                    setQuizIdx((i) => i + 1);
                    setQuizSelectedOpt(null);
                  } else {
                    playMissionCompleteChime();
                    setQuizFinished(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold whitespace-nowrap self-end sm:self-center"
              >
                {quizIdx + 1 < visualQuizQuestions.length ? 'Ảnh tiếp theo' : 'Xem kết quả'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
