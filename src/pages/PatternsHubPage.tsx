import { useMemo, useState } from 'react';
import { ArrowUpRight, Search, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LessonDoc, SentencePattern } from '../types';
import { speakEnglish } from '../utils/speech';

interface PatternsHubPageProps {
  onOpenLesson: (lessonId: string) => void;
}

export function PatternsHubPage({ onOpenLesson }: PatternsHubPageProps) {
  const { lessons } = useApp();
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const allPatterns = useMemo(() => {
    const list: Array<{ lesson: LessonDoc; pattern: SentencePattern }> = [];
    lessons.forEach((lesson) => {
      lesson.sentencePatterns.forEach((pattern) => {
        list.push({ lesson, pattern });
      });
    });
    return list;
  }, [lessons]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPatterns.filter(({ lesson, pattern }) => {
      if (levelFilter !== 'ALL' && lesson.levelId !== levelFilter) return false;
      if (!q) return true;
      return (
        pattern.structure.toLowerCase().includes(q) ||
        pattern.meaningVi.toLowerCase().includes(q) ||
        lesson.topic.toLowerCase().includes(q)
      );
    });
  }, [allPatterns, levelFilter, search]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm cấu trúc câu, nghĩa tiếng Việt hoặc tình huống..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          {['ALL', 'A1', 'A2', 'B1'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                levelFilter === lvl
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lvl === 'ALL' ? `Tất cả (${allPatterns.length})` : lvl}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Không tìm thấy mẫu câu phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.slice(0, 60).map(({ lesson, pattern }) => (
            <article
              key={pattern.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {lesson.levelId} · {lesson.topic}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakEnglish(pattern.exampleEn)}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Nghe
                  </button>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {pattern.structure}
                </h3>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {pattern.meaningVi}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pattern.usageVi}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="text-sm font-serif text-slate-900 dark:text-slate-100">
                    "{pattern.exampleEn}"
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{pattern.exampleVi}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenLesson(lesson.lessonId)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Học bài đầy đủ
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
