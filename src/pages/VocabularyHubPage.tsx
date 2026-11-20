import { useMemo, useState } from 'react';
import { CheckCircle2, Heart, Search, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LessonDoc, VocabularyItem } from '../types';
import { speakEnglish } from '../utils/speech';

interface VocabularyHubPageProps {
  onOpenLesson: (lessonId: string) => void;
}

export function VocabularyHubPage({ onOpenLesson }: VocabularyHubPageProps) {
  const { lessons, vocabMap, toggleVocabState, addToast } = useApp();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'learned' | 'unlearned'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const allItems = useMemo(() => {
    const list: Array<{ lesson: LessonDoc; vocab: VocabularyItem }> = [];
    lessons.forEach((lesson) => {
      lesson.vocabulary.forEach((vocab) => {
        list.push({ lesson, vocab });
      });
    });
    return list;
  }, [lessons]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter(({ lesson, vocab }) => {
      if (levelFilter !== 'ALL' && lesson.levelId !== levelFilter) return false;
      const isLearned = Boolean(vocabMap[vocab.id]?.isLearned);
      if (statusFilter === 'learned' && !isLearned) return false;
      if (statusFilter === 'unlearned' && isLearned) return false;
      if (!q) return true;
      return (
        vocab.word.toLowerCase().includes(q) ||
        vocab.meaningVi.toLowerCase().includes(q) ||
        lesson.topic.toLowerCase().includes(q)
      );
    });
  }, [allItems, search, levelFilter, statusFilter, vocabMap]);

  const handleToggle = async (
    lesson: LessonDoc,
    vocab: VocabularyItem,
    changes: { isFavorite?: boolean; isLearned?: boolean }
  ) => {
    setSavingId(vocab.id);
    try {
      await toggleVocabState(lesson, vocab, changes);
    } catch {
      addToast('error', 'Không thể lưu trạng thái từ vựng.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm từ tiếng Anh, nghĩa tiếng Việt hoặc chủ đề..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl self-start">
            {['ALL', 'A1', 'A2', 'B1', 'ESP'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  levelFilter === lvl
                    ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {lvl === 'ALL' ? 'Tất cả' : lvl === 'ESP' ? 'Chuyên ngành' : lvl}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl self-start">
            {[
              { id: 'all', label: 'Mọi trạng thái' },
              { id: 'unlearned', label: 'Chưa thuộc' },
              { id: 'learned', label: 'Đã thuộc' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Hiển thị {filtered.length} / {allItems.length} từ vựng chuẩn CEFR A1–B1 & Chuyên ngành
        </div>
      </div>

      {/* Results List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Không tìm thấy từ vựng nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.slice(0, 120).map(({ lesson, vocab }) => {
            const isFav = Boolean(vocabMap[vocab.id]?.isFavorite);
            const isLearned = Boolean(vocabMap[vocab.id]?.isLearned);

            return (
              <div
                key={vocab.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2.5">
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
                  <button
                    type="button"
                    onClick={() => onOpenLesson(lesson.lessonId)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {lesson.levelId} · {lesson.topic}
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakEnglish(vocab.word)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    aria-label={`Nghe phát âm ${vocab.word}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={savingId === vocab.id}
                    onClick={() => void handleToggle(lesson, vocab, { isFavorite: !isFav })}
                    className={`p-2 rounded-lg border transition-colors ${
                      isFav
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600'
                    }`}
                    aria-label="Yêu thích"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    disabled={savingId === vocab.id}
                    onClick={() => void handleToggle(lesson, vocab, { isLearned: !isLearned })}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
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
            );
          })}
          {filtered.length > 120 && (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Đang hiển thị 120 từ đầu tiên. Hãy nhập từ khóa tìm kiếm hoặc chọn cấp độ để thu hẹp kết quả.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
