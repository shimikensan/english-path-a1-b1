import { useMemo, useState } from 'react';
import { CheckCircle2, CloudOff, HardDriveDownload, Heart, Search, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserVocabularyDoc } from '../types';
import { formatTimestampVi } from '../utils/helpers';
import { speakEnglish } from '../utils/speech';

interface SavedWordsPageProps {
  onOpenLesson: (lessonId: string) => void;
}

export function SavedWordsPage({ onOpenLesson }: SavedWordsPageProps) {
  const { lessons, vocabMap, offlineVocabSyncedAt, isOnline, toggleVocabState, addToast } = useApp();
  const [tab, setTab] = useState<'learned' | 'favorites'>('learned');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const learnedCount = useMemo(
    () => Object.values(vocabMap).filter((v) => v.isLearned).length,
    [vocabMap]
  );
  const favCount = useMemo(
    () => Object.values(vocabMap).filter((v) => v.isFavorite).length,
    [vocabMap]
  );

  const items = useMemo<UserVocabularyDoc[]>(() => {
    const q = search.trim().toLowerCase();
    const all = Object.values(vocabMap);
    return all
      .filter((v) => (tab === 'favorites' ? v.isFavorite : v.isLearned))
      .filter((v) => (levelFilter === 'ALL' ? true : v.levelId === levelFilter))
      .filter((v) => {
        if (!q) return true;
        return (
          v.word.toLowerCase().includes(q) ||
          v.meaningVi.toLowerCase().includes(q) ||
          (v.exampleEn || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [vocabMap, tab, search, levelFilter]);

  const handleUpdate = async (
    item: UserVocabularyDoc,
    changes: { isFavorite?: boolean; isLearned?: boolean }
  ) => {
    if (!isOnline) {
      addToast(
        'info',
        'Bạn đang ngoại tuyến — chỉ có thể xem lại từ vựng đã lưu. Hãy kết nối mạng để chỉnh sửa trạng thái.'
      );
      return;
    }
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
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Sổ tay từ vựng cá nhân
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Danh sách từ đã thuộc và từ yêu thích được tự động lưu đệm ngoại tuyến để bạn ôn tập mọi lúc, kể cả khi mất kết nối mạng.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start shrink-0">
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
          </div>
        </div>

        {/* Offline cache readiness strip */}
        <div
          className={`rounded-xl px-3.5 py-2.5 border text-xs flex flex-wrap items-center justify-between gap-2 ${
            isOnline
              ? 'border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-300'
              : 'border-amber-300/80 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/35 text-amber-800 dark:text-amber-200'
          }`}
        >
          <span className="inline-flex items-center gap-2 font-medium">
            {isOnline ? (
              <>
                <HardDriveDownload className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Bộ nhớ đệm ngoại tuyến sẵn sàng ({learnedCount} từ đã thuộc · {favCount} từ yêu thích)
                </span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Đang xem danh sách từ vựng từ bộ nhớ đệm ngoại tuyến · Tìm kiếm & phát âm vẫn hoạt động
                </span>
              </>
            )}
          </span>
          {offlineVocabSyncedAt && (
            <span className="text-[11px] opacity-80 tabular-nums">
              Đồng bộ gần nhất: {formatTimestampVi(offlineVocabSyncedAt)}
            </span>
          )}
        </div>

        {/* Search & CEFR Level Filter for fast offline review */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nhanh từ tiếng Anh, nghĩa tiếng Việt hoặc ví dụ..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl self-start">
            {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'ESP'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  levelFilter === lvl
                    ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {lvl === 'ALL' ? 'Tất cả' : lvl === 'ESP' ? 'Chuyên ngành' : lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-10 text-center space-y-2">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {search.trim() || levelFilter !== 'ALL'
              ? 'Không tìm thấy từ vựng phù hợp'
              : tab === 'favorites'
                ? 'Chưa có từ yêu thích nào'
                : 'Chưa có từ nào được đánh dấu đã thuộc'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {search.trim() || levelFilter !== 'ALL'
              ? 'Hãy thử xóa từ khóa tìm kiếm hoặc chọn cấp độ "Tất cả".'
              : 'Khi học Flashcard hoặc tra từ vựng trong các bài học A1–C1 & Chuyên ngành, hãy nhấn biểu tượng trái tim hoặc nút "Đánh dấu đã học" để lưu vào sổ tay ngoại tuyến này.'}
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
                  disabled={busyId === item.vocabularyId || !isOnline}
                  onClick={() => void handleUpdate(item, { isFavorite: !item.isFavorite })}
                  title={isOnline ? 'Bỏ/Thêm yêu thích' : 'Cần kết nối mạng để chỉnh sửa'}
                  className={`p-2 rounded-lg border transition-colors disabled:opacity-50 ${
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
                  disabled={busyId === item.vocabularyId || !isOnline}
                  onClick={() => void handleUpdate(item, { isLearned: !item.isLearned })}
                  title={isOnline ? 'Cập nhật trạng thái đã thuộc' : 'Cần kết nối mạng để chỉnh sửa'}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 ${
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
