import { useMemo, useState } from 'react';
import { CheckCircle2, Heart, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserVocabularyDoc } from '../types';
import { speakEnglish } from '../utils/speech';

interface SavedWordsPageProps {
  onOpenLesson: (lessonId: string) => void;
}

export function SavedWordsPage({ onOpenLesson }: SavedWordsPageProps) {
  const { lessons, vocabMap, toggleVocabState, addToast } = useApp();
  const [tab, setTab] = useState<'favorites' | 'learned'>('favorites');
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = useMemo<UserVocabularyDoc[]>(() => {
    const all = Object.values(vocabMap);
    if (tab === 'favorites') return all.filter((v) => v.isFavorite);
    return all.filter((v) => v.isLearned);
  }, [vocabMap, tab]);

  const favCount = useMemo(
    () => Object.values(vocabMap).filter((v) => v.isFavorite).length,
    [vocabMap]
  );
  const learnedCount = useMemo(
    () => Object.values(vocabMap).filter((v) => v.isLearned).length,
    [vocabMap]
  );

  const handleUpdate = async (
    item: UserVocabularyDoc,
    changes: { isFavorite?: boolean; isLearned?: boolean }
  ) => {
    const lesson = lessons.find((l) => l.lessonId === item.lessonId);
    const vocab = lesson?.vocabulary.find((v) => v.id === item.vocabularyId) || {
      id: item.vocabularyId,
      word: item.word,
      ipa: item.ipa,
      partOfSpeech: item.partOfSpeech as 'noun',
      meaningVi: item.meaningVi,
      exampleEn: item.exampleEn,
      exampleVi: item.exampleVi,
    };
    if (!lesson) {
      addToast('error', 'Không tìm thấy bài học gốc cho từ vựng này.');
      return;
    }
    setBusyId(item.vocabularyId);
    try {
      await toggleVocabState(lesson, vocab, changes);
    } catch {
      addToast('error', 'Không thể cập nhật từ vựng.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Sổ tay từ vựng cá nhân
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tất cả từ yêu thích và từ đã thuộc được đồng bộ an toàn theo tài khoản của bạn trên Firestore.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setTab('favorites')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'favorites'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Từ yêu thích ({favCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('learned')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'learned'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Từ đã thuộc ({learnedCount})
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-10 text-center space-y-2">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {tab === 'favorites' ? 'Chưa có từ yêu thích nào' : 'Chưa có từ nào được đánh dấu đã thuộc'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Khi học Flashcard hoặc tra từ vựng trong các bài học A1–B1, hãy nhấn biểu tượng trái tim hoặc nút "Đánh dấu đã học" để lưu vào sổ tay này.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <div
              key={item.vocabularyId}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {item.word}
                  </span>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                    {item.ipa}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({item.partOfSpeech})
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    — {item.meaningVi}
                  </span>
                </div>
                {item.exampleEn && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-serif text-slate-800 dark:text-slate-200">
                      {item.exampleEn}
                    </span>{' '}
                    · {item.exampleVi}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onOpenLesson(item.lessonId)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Level {item.levelId} · Mở bài học gốc
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => speakEnglish(item.word)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  aria-label={`Nghe phát âm ${item.word}`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={busyId === item.vocabularyId}
                  onClick={() => void handleUpdate(item, { isFavorite: !item.isFavorite })}
                  className={`p-2 rounded-lg border transition-colors ${
                    item.isFavorite
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                  aria-label="Bỏ/Thêm yêu thích"
                >
                  <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  disabled={busyId === item.vocabularyId}
                  onClick={() => void handleUpdate(item, { isLearned: !item.isLearned })}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    item.isLearned
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {item.isLearned ? 'Đã thuộc' : 'Đánh dấu thuộc'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
