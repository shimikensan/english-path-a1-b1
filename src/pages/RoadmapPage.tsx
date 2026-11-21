import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Search } from 'lucide-react';
import { LessonMiniProgress } from '../components/LessonMiniProgress';
import { useApp } from '../context/AppContext';
import { LEVEL_BANNERS, PILOT_RANKS } from '../data';

interface RoadmapPageProps {
  onOpenLesson: (lessonId: string) => void;
}

export function RoadmapPage({ onOpenLesson }: RoadmapPageProps) {
  const { levels, lessons, progressMap, vocabMap } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedBanners, setFailedBanners] = useState<Record<string, boolean>>({});

  const visibleLevels = useMemo(() => {
    if (selectedLevel === 'ALL') return levels;
    return levels.filter((l) => l.levelId === selectedLevel);
  }, [levels, selectedLevel]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div className="space-y-8">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setSelectedLevel('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              selectedLevel === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ({lessons.length})
          </button>
          {levels.map((lvl) => {
            const count = lessons.filter((lsn) => lsn.levelId === lvl.levelId).length;
            return (
              <button
                key={lvl.levelId}
                type="button"
                onClick={() => setSelectedLevel(lvl.levelId)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  selectedLevel === lvl.levelId
                    ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lvl.levelId} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm chủ đề hoặc tên bài học..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>
      </div>

      {/* Levels & Lesson Grids */}
      <div className="space-y-10">
        {visibleLevels.map((lvl) => {
          const levelLessons = lessons
            .filter((l) => l.levelId === lvl.levelId)
            .filter((l) => {
              if (!normalizedQuery) return true;
              return (
                l.title.toLowerCase().includes(normalizedQuery) ||
                l.topic.toLowerCase().includes(normalizedQuery) ||
                l.description.toLowerCase().includes(normalizedQuery)
              );
            });

          const totalForLevel = lessons.filter((l) => l.levelId === lvl.levelId).length;
          const completedForLevel = lessons.filter(
            (l) => l.levelId === lvl.levelId && progressMap[l.lessonId]?.lessonCompleted
          ).length;
          const pct = totalForLevel > 0 ? Math.round((completedForLevel / totalForLevel) * 100) : 0;
          const bannerSrc = LEVEL_BANNERS[lvl.levelId];

          return (
            <section key={lvl.levelId} className="space-y-5">
              {/* Level Banner Header */}
              <div className="relative cockpit-radar-panel overflow-hidden bg-blue-950 min-h-[170px] flex items-end">
                {bannerSrc && !failedBanners[lvl.levelId] ? (
                  <img
                    src={bannerSrc}
                    alt={lvl.name}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedBanners((prev) => ({ ...prev, [lvl.levelId]: true }))}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20" />

                <div className="relative z-10 w-full p-6 flex flex-col md:flex-row md:items-end justify-between gap-4 text-white">
                  <div className="space-y-1.5 max-w-2xl">
                    <p className="text-xs font-semibold text-amber-300">
                      {PILOT_RANKS[lvl.levelId]
                        ? `${PILOT_RANKS[lvl.levelId].stage} · ${PILOT_RANKS[lvl.levelId].rankVi} (${PILOT_RANKS[lvl.levelId].callsign})`
                        : lvl.subtitle || `Chuẩn khung năng lực CEFR ${lvl.levelId}`}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-extrabold">{lvl.name}</h2>
                    <p className="text-sm text-slate-200 leading-relaxed">{lvl.description}</p>
                  </div>
                  <div className="md:text-right shrink-0 tabular-nums">
                    <div className="text-2xl font-extrabold">{pct}%</div>
                    <div className="text-xs text-slate-300">
                      Hoàn thành {completedForLevel}/{totalForLevel} bài học
                    </div>
                  </div>
                </div>
              </div>

              {/* Lessons List */}
              {levelLessons.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                  Không tìm thấy bài học nào khớp với từ khóa "{searchQuery}" trong {lvl.name}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {levelLessons.map((lesson, idx) => {
                    const prog = progressMap[lesson.lessonId];
                    const learnedCount = prog?.vocabularyLearned?.length ?? 0;
                    const isCompleted = Boolean(prog?.lessonCompleted);
                    const bestScore = prog?.quizBestScore ?? 0;

                    return (
                      <div
                        key={lesson.lessonId}
                        className="bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
                              {String(idx + 1).padStart(2, '0')}. {lesson.topic}
                            </span>
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã xong · {bestScore}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Clock className="w-3.5 h-3.5" />
                                {lesson.estimatedMinutes} phút
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {lesson.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {lesson.description}
                          </p>

                          <div className="pt-1">
                            <LessonMiniProgress
                              lesson={lesson}
                              progress={prog}
                              vocabMap={vocabMap}
                              compact
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <span>
                              Từ vựng: {learnedCount}/{lesson.vocabulary.length}
                            </span>
                            <span className="mx-1.5" aria-hidden="true">
                              ·
                            </span>
                            <span>{lesson.sentencePatterns.length} mẫu câu</span>
                            <span className="mx-1.5" aria-hidden="true">
                              ·
                            </span>
                            <span>{lesson.quiz.length} câu hỏi</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenLesson(lesson.lessonId)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#FF7E1F] transition-colors whitespace-nowrap shrink-0"
                          >
                            {isCompleted ? 'Ôn lại' : learnedCount > 0 ? 'Học tiếp' : 'Bắt đầu'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
