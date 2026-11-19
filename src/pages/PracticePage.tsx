import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { VocabularyItem } from '../types';
import { shuffleArray } from '../utils/helpers';
import { speakEnglish } from '../utils/speech';

type PracticeSource = 'A1' | 'A2' | 'B1' | 'learned' | 'favorite';
type PracticeMode = 'flashcard' | 'speed_quiz';

interface SpeedQuestion {
  vocab: VocabularyItem;
  options: string[];
  correctIndex: number;
}

export function PracticePage() {
  const { lessons, vocabMap } = useApp();
  const [source, setSource] = useState<PracticeSource>('A1');
  const [mode, setMode] = useState<PracticeMode>('speed_quiz');
  const [sessionSeed, setSessionSeed] = useState(0);

  // Flashcard states
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Speed Quiz states
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const pool = useMemo<VocabularyItem[]>(() => {
    const all: VocabularyItem[] = [];
    lessons.forEach((l) => {
      if (source === 'A1' || source === 'A2' || source === 'B1') {
        if (l.levelId === source) all.push(...l.vocabulary);
      } else if (source === 'learned') {
        l.vocabulary.forEach((v) => {
          if (vocabMap[v.id]?.isLearned) all.push(v);
        });
      } else if (source === 'favorite') {
        l.vocabulary.forEach((v) => {
          if (vocabMap[v.id]?.isFavorite) all.push(v);
        });
      }
    });
    return shuffleArray(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, vocabMap, source, sessionSeed]);

  const speedQuestions = useMemo<SpeedQuestion[]>(() => {
    if (pool.length < 4) return [];
    const selected = pool.slice(0, Math.min(10, pool.length));
    return selected.map((target) => {
      const distractors = shuffleArray(pool.filter((v) => v.id !== target.id))
        .slice(0, 3)
        .map((v) => v.meaningVi);
      const mixed = shuffleArray([target.meaningVi, ...distractors]);
      return {
        vocab: target,
        options: mixed,
        correctIndex: mixed.indexOf(target.meaningVi),
      };
    });
  }, [pool]);

  const resetSession = (nextSource?: PracticeSource, nextMode?: PracticeMode) => {
    if (nextSource) setSource(nextSource);
    if (nextMode) setMode(nextMode);
    setSessionSeed((s) => s + 1);
    setCardIdx(0);
    setFlipped(false);
    setQIdx(0);
    setSelectedOpt(null);
    setScore(0);
    setFinished(false);
  };

  const currentQuestion = speedQuestions[qIdx];
  const currentCard = pool[cardIdx];

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Nguồn ôn tập:
          </span>
          {(
            [
              { id: 'A1', label: 'Level A1' },
              { id: 'A2', label: 'Level A2' },
              { id: 'B1', label: 'Level B1' },
              { id: 'learned', label: 'Từ đã học' },
              { id: 'favorite', label: 'Từ yêu thích' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => resetSession(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                source === item.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => resetSession(undefined, 'speed_quiz')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'speed_quiz'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Phản xạ nhanh 10 từ
          </button>
          <button
            type="button"
            onClick={() => resetSession(undefined, 'flashcard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'flashcard'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Lật thẻ Flashcard trộn
          </button>
        </div>
      </div>

      {/* Empty Guard */}
      {pool.length < (mode === 'speed_quiz' ? 4 : 1) ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            Chưa đủ từ vựng trong nhóm "{source === 'learned' ? 'Từ đã học' : 'Từ yêu thích'}"
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {mode === 'speed_quiz'
              ? 'Cần ít nhất 4 từ vựng để tạo bài luyện phản xạ. Hãy đánh dấu thêm từ trong bài học hoặc chọn luyện theo cấp độ A1, A2, B1.'
              : 'Hãy đánh dấu ít nhất 1 từ vựng để bắt đầu ôn thẻ Flashcard.'}
          </p>
        </div>
      ) : mode === 'speed_quiz' ? (
        finished ? (
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-5">
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Hoàn thành phiên luyện tập nhanh
            </div>
            <div className="text-5xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {score} / {speedQuestions.length}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tỷ lệ chính xác {Math.round((score / speedQuestions.length) * 100)}%. Luyện lặp lại 5 phút mỗi ngày sẽ giúp bạn phản xạ từ vựng tức thì.
            </p>
            <button
              type="button"
              onClick={() => resetSession()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              <RotateCcw className="w-4 h-4" />
              Luyện vòng mới (trộn ngẫu nhiên)
            </button>
          </div>
        ) : currentQuestion ? (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>
                Câu {qIdx + 1} / {speedQuestions.length}
              </span>
              <span>Điểm hiện tại: {score}</span>
            </div>

            <div className="text-center space-y-2 py-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Chọn nghĩa tiếng Việt đúng cho từ sau:
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentQuestion.vocab.word}
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                  {currentQuestion.vocab.ipa}
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglish(currentQuestion.vocab.word)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Nghe
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, idx) => {
                const answered = selectedOpt !== null;
                const isRight = idx === currentQuestion.correctIndex;
                const isChosen = idx === selectedOpt;

                let cls =
                  'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-800';
                if (answered) {
                  if (isRight) {
                    cls =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold';
                  } else if (isChosen) {
                    cls =
                      'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
                  } else {
                    cls = 'border-slate-200 dark:border-slate-800 opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={answered}
                    onClick={() => {
                      setSelectedOpt(idx);
                      if (idx === currentQuestion.correctIndex) {
                        setScore((s) => s + 1);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center justify-between ${cls}`}
                  >
                    <span>{opt}</span>
                    {answered && isRight && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {answered && isChosen && !isRight && (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedOpt !== null && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ví dụ: <span className="font-serif text-slate-900 dark:text-slate-200">{currentQuestion.vocab.exampleEn}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (qIdx + 1 < speedQuestions.length) {
                      setQIdx((i) => i + 1);
                      setSelectedOpt(null);
                    } else {
                      setFinished(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 whitespace-nowrap"
                >
                  {qIdx + 1 < speedQuestions.length ? 'Câu tiếp theo' : 'Xem kết quả'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : null
      ) : currentCard ? (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between tabular-nums">
            <span>
              Thẻ {cardIdx + 1} / {Math.min(20, pool.length)}
            </span>
            <button
              type="button"
              onClick={() => resetSession()}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Trộn bộ thẻ mới
            </button>
          </div>

          <div className="flashcard-scene">
            <div
              onClick={() => setFlipped((f) => !f)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFlipped((f) => !f);
                }
              }}
              className={`flashcard-inner relative w-full min-h-[290px] cursor-pointer ${
                flipped ? 'is-flipped' : ''
              }`}
            >
              <div className="flashcard-face absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col justify-between text-center">
                <div className="text-xs text-slate-400">{currentCard.partOfSpeech}</div>
                <div className="space-y-3">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {currentCard.word}
                  </div>
                  <div className="text-sm font-mono text-blue-600 dark:text-blue-400">
                    {currentCard.ipa}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakEnglish(currentCard.word);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                  >
                    <Volume2 className="w-4 h-4" />
                    Nghe phát âm
                  </button>
                </div>
                <div className="text-xs text-slate-400 inline-flex items-center justify-center gap-1">
                  <RotateCw className="w-3.5 h-3.5" />
                  Nhấn để lật thẻ
                </div>
              </div>

              <div className="flashcard-face flashcard-back absolute inset-0 bg-blue-50/70 dark:bg-slate-900 border border-blue-200 dark:border-blue-900 rounded-2xl p-8 flex flex-col justify-between text-center">
                <div className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                  {currentCard.word} · {currentCard.ipa}
                </div>
                <div className="space-y-3">
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {currentCard.meaningVi}
                  </div>
                  <p className="text-sm font-serif text-slate-800 dark:text-slate-200">
                    "{currentCard.exampleEn}"
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentCard.exampleVi}
                  </p>
                </div>
                <div className="text-xs text-slate-400">Nhấn để lật lại</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setCardIdx((i) => (i > 0 ? i - 1 : Math.min(19, pool.length - 1)));
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Thẻ trước
            </button>
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setCardIdx((i) => (i + 1 < Math.min(20, pool.length) ? i + 1 : 0));
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Thẻ tiếp theo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
