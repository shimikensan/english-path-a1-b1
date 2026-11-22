import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  LayoutGrid,
  RefreshCw,
  RotateCw,
  Search,
  Shuffle,
  Sparkles,
  Square,
  Type,
  Volume2,
} from 'lucide-react';
import {
  TopicPracticeBoard,
  type TopicPracticeLevel,
} from '../components/reading/TopicPracticeBoard';
import { useApp } from '../context/AppContext';
import type { LearnerCEFRLevel, ReadingPassageDoc } from '../types';
import { playCorrectBeep } from '../utils/cockpitAudio';
import { speakEnglish, stopSpeaking } from '../utils/speech';

const LEVEL_FILTERS: Array<'ALL' | LearnerCEFRLevel> = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'];
const PRACTICE_LEVEL_ORDER: TopicPracticeLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'ALL'];
const CEFR_PROGRESSION: LearnerCEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

type ReadingViewMode = 'explore' | 'topic_practice';

type FontSizeScale = 'sm' | 'md' | 'lg';

const FONT_SIZE_CLASSES: Record<FontSizeScale, string> = {
  sm: 'text-[15px] sm:text-base leading-relaxed',
  md: 'text-base sm:text-[18px] leading-[1.78]',
  lg: 'text-lg sm:text-[20px] leading-[1.82]',
};

function getReadStorageKey(uid: string): string {
  return `pilot_reading_done_v1_${uid}`;
}

function loadReadIds(uid?: string): string[] {
  if (!uid) return [];
  try {
    const raw = window.localStorage.getItem(getReadStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveReadIds(uid: string, ids: string[]): void {
  try {
    window.localStorage.setItem(getReadStorageKey(uid), JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

export function ReadingHubPage() {
  const {
    profile,
    readingPassages,
    readingPassagesLoading,
    refreshReadingPassages,
    recordStudyActivity,
    addToast,
  } = useApp();

  const [viewMode, setViewMode] = useState<ReadingViewMode>('explore');

  // Explore mode filters
  const [levelFilter, setLevelFilter] = useState<'ALL' | LearnerCEFRLevel>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);

  // Topic Practice mode state (defaults to learner's CEFR level so A1/A2/B1 learners see right-sized articles immediately)
  const [practiceLevel, setPracticeLevel] = useState<TopicPracticeLevel>(
    () => profile?.currentLevel ?? 'A1'
  );
  const [practiceTopic, setPracticeTopic] = useState<string | null>(null);
  const [practiceUnreadOnly, setPracticeUnreadOnly] = useState(false);

  const [activePassageId, setActivePassageId] = useState<string>('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [fontScale, setFontScale] = useState<FontSizeScale>('md');
  const [speechRate, setSpeechRate] = useState<0.82 | 0.96>(0.96);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => loadReadIds(profile?.uid));

  const CATALOG_PAGE_SIZE = 24;

  useEffect(() => {
    void refreshReadingPassages(false);
  }, [refreshReadingPassages]);

  useEffect(() => {
    setReadIds(loadReadIds(profile?.uid));
  }, [profile?.uid]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const publishedPassages = useMemo(
    () => readingPassages.filter((p) => p.isPublished !== false),
    [readingPassages]
  );

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    publishedPassages.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return map;
  }, [publishedPassages]);

  const categories = useMemo(() => Array.from(categoryCounts.keys()), [categoryCounts]);

  const filteredPassages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedPassages.filter((p) => {
      if (levelFilter !== 'ALL' && p.levelId !== levelFilter) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (statusFilter === 'READ' && !readSet.has(p.passageId)) return false;
      if (statusFilter === 'UNREAD' && readSet.has(p.passageId)) return false;
      if (!q) return true;
      return (
        p.titleEn.toLowerCase().includes(q) ||
        p.titleVi.toLowerCase().includes(q) ||
        p.contentEn.toLowerCase().includes(q) ||
        p.contentVi.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [publishedPassages, levelFilter, categoryFilter, statusFilter, searchQuery, readSet]);

  const totalCatalogPages = Math.max(1, Math.ceil(filteredPassages.length / CATALOG_PAGE_SIZE));
  const safeCatalogPage = Math.min(catalogPage, totalCatalogPages);
  const pagedCatalogPassages = useMemo(() => {
    const start = (safeCatalogPage - 1) * CATALOG_PAGE_SIZE;
    return filteredPassages.slice(start, start + CATALOG_PAGE_SIZE);
  }, [filteredPassages, safeCatalogPage]);

  useEffect(() => {
    setCatalogPage(1);
  }, [levelFilter, categoryFilter, statusFilter, searchQuery]);

  // Passages in the selected Topic + CEFR Level (used for progress & level switcher inside Topic Practice)
  const topicAllPassages = useMemo(() => {
    if (!practiceTopic) return [];
    return publishedPassages.filter((p) => {
      if (p.category !== practiceTopic) return false;
      if (practiceLevel !== 'ALL' && p.levelId !== practiceLevel) return false;
      return true;
    });
  }, [publishedPassages, practiceTopic, practiceLevel]);

  const practiceDeckPassages = useMemo(() => {
    if (!practiceUnreadOnly) return topicAllPassages;
    return topicAllPassages.filter((p) => !readSet.has(p.passageId));
  }, [topicAllPassages, practiceUnreadOnly, readSet]);

  const topicCompletedCount = useMemo(
    () => topicAllPassages.filter((p) => readSet.has(p.passageId)).length,
    [topicAllPassages, readSet]
  );

  const isTopicLevelComplete =
    Boolean(practiceTopic) &&
    topicAllPassages.length > 0 &&
    topicCompletedCount === topicAllPassages.length;

  const nextPracticeLevel: LearnerCEFRLevel | null = useMemo(() => {
    if (practiceLevel === 'ALL') return null;
    const idx = CEFR_PROGRESSION.indexOf(practiceLevel);
    if (idx < 0 || idx >= CEFR_PROGRESSION.length - 1) return null;
    return CEFR_PROGRESSION[idx + 1];
  }, [practiceLevel]);

  const isShowingTopicBoard = viewMode === 'topic_practice' && !practiceTopic;
  const deckPassages =
    viewMode === 'topic_practice' && practiceTopic ? practiceDeckPassages : filteredPassages;

  const activeIndex = useMemo(() => {
    if (deckPassages.length === 0) return -1;
    const found = deckPassages.findIndex((p) => p.passageId === activePassageId);
    return found >= 0 ? found : 0;
  }, [deckPassages, activePassageId]);

  const activePassage: ReadingPassageDoc | null =
    !isShowingTopicBoard && activeIndex >= 0 ? deckPassages[activeIndex] : null;

  const completedCount = useMemo(
    () => publishedPassages.filter((p) => readSet.has(p.passageId)).length,
    [publishedPassages, readSet]
  );

  const selectPassage = useCallback((passage: ReadingPassageDoc) => {
    stopSpeaking();
    setIsSpeaking(false);
    setActivePassageId(passage.passageId);
    setIsFlipped(false);
  }, []);

  const handleStartTopicPractice = useCallback(
    (category: string) => {
      stopSpeaking();
      setIsSpeaking(false);
      setPracticeTopic(category);
      setPracticeUnreadOnly(false);
      setIsFlipped(false);

      const candidates = publishedPassages.filter(
        (p) => p.category === category && (practiceLevel === 'ALL' || p.levelId === practiceLevel)
      );
      const firstUnread = candidates.find((p) => !readSet.has(p.passageId));
      const initial = firstUnread ?? candidates[0];
      if (initial) {
        setActivePassageId(initial.passageId);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [publishedPassages, practiceLevel, readSet]
  );

  const handleSwitchMode = useCallback((mode: ReadingViewMode) => {
    stopSpeaking();
    setIsSpeaking(false);
    setIsFlipped(false);
    setViewMode(mode);
    if (mode === 'topic_practice') {
      setPracticeTopic(null);
    }
  }, []);

  const handleToggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    recordStudyActivity();
  }, [recordStudyActivity]);

  const handleStep = useCallback(
    (delta: number) => {
      if (deckPassages.length <= 1 || activeIndex < 0) return;
      const nextIdx = (activeIndex + delta + deckPassages.length) % deckPassages.length;
      selectPassage(deckPassages[nextIdx]);
    },
    [deckPassages, activeIndex, selectPassage]
  );

  const handleShuffle = useCallback(() => {
    if (deckPassages.length <= 1) return;
    let nextIdx = activeIndex;
    for (let i = 0; i < 8 && nextIdx === activeIndex; i++) {
      nextIdx = Math.floor(Math.random() * deckPassages.length);
    }
    if (nextIdx === activeIndex) {
      nextIdx = (activeIndex + 1) % deckPassages.length;
    }
    selectPassage(deckPassages[nextIdx]);
  }, [deckPassages, activeIndex, selectPassage]);

  const handleToggleRead = useCallback(
    (passage: ReadingPassageDoc) => {
      if (!profile?.uid) return;
      recordStudyActivity();
      setReadIds((prev) => {
        const exists = prev.includes(passage.passageId);
        const next = exists
          ? prev.filter((id) => id !== passage.passageId)
          : [...prev, passage.passageId];
        saveReadIds(profile.uid, next);
        if (!exists) {
          playCorrectBeep();
          addToast('success', `Đã đánh dấu hoàn thành bài đọc "${passage.titleEn}"!`);
        }
        return next;
      });
    },
    [profile?.uid, recordStudyActivity, addToast]
  );

  const handleCompleteAndNext = useCallback(
    (passage: ReadingPassageDoc) => {
      if (profile?.uid && !readSet.has(passage.passageId)) {
        recordStudyActivity();
        setReadIds((prev) => {
          if (prev.includes(passage.passageId)) return prev;
          const next = [...prev, passage.passageId];
          saveReadIds(profile.uid, next);
          return next;
        });
        playCorrectBeep();
        addToast('success', `Tuyệt vời! Đã hoàn thành "${passage.titleEn}".`);
      }

      if (deckPassages.length > 1 && activeIndex >= 0) {
        const nextIdx = (activeIndex + 1) % deckPassages.length;
        selectPassage(deckPassages[nextIdx]);
      } else {
        setIsFlipped(false);
      }
    },
    [profile?.uid, readSet, recordStudyActivity, addToast, deckPassages, activeIndex, selectPassage]
  );

  const handleSpeakPassage = useCallback(
    (passage: ReadingPassageDoc) => {
      if (isSpeaking) {
        stopSpeaking();
        setIsSpeaking(false);
        return;
      }
      recordStudyActivity();
      setIsSpeaking(true);
      speakEnglish(`${passage.titleEn}. ${passage.contentEn}`, {
        accent: 'en-US',
        rate: speechRate,
        onEnd: () => setIsSpeaking(false),
      });
    },
    [isSpeaking, speechRate, recordStudyActivity]
  );

  // Keyboard shortcuts: Space to flip, Left/Right arrows to navigate cards
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!activePassage || isShowingTopicBoard) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStep(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStep(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePassage, isShowingTopicBoard, handleToggleFlip, handleStep]);

  const isCurrentRead = activePassage ? readSet.has(activePassage.passageId) : false;

  return (
    <div className="space-y-6">
      {/* Header Banner + Mode Switcher */}
      <section className="cockpit-radar-panel bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
              <BookOpenText className="w-4 h-4" />
              <span>Đọc hiểu song ngữ · Thẻ lật Flashcard</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Đọc hiểu tiếng Anh qua những bài viết cuộc sống
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Đọc đoạn văn tiếng Anh ở <strong>mặt trước</strong> để rèn tư duy ngữ cảnh, sau đó nhấn lật thẻ (hoặc phím <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-[11px]">Space</kbd>) để đối chiếu bản dịch tiếng Việt và cụm từ hay ở <strong>mặt sau</strong>.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white tabular-nums">
                {completedCount} / {publishedPassages.length} bài đã đọc
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Mở rộng vốn từ & cảm thụ câu tự nhiên
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchMode('explore')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'explore'
                  ? 'bg-white dark:bg-slate-800 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Thẻ đọc tự do ({publishedPassages.length})
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('topic_practice')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'topic_practice'
                  ? 'bg-[#FF6B00] text-white shadow-[0_4px_14px_-4px_rgba(255,107,0,0.5)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Luyện tập theo chủ đề
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {viewMode === 'topic_practice'
              ? 'Chọn cấp độ A1, A2, B1... phù hợp khả năng rồi luyện tập trọn bộ từng chủ đề.'
              : 'Khám phá tự do toàn bộ thư viện 200 bài đọc song ngữ.'}
          </p>
        </div>
      </section>

      {/* TOPIC PRACTICE MODE: Board Overview */}
      {isShowingTopicBoard && (
        <TopicPracticeBoard
          passages={publishedPassages}
          readSet={readSet}
          selectedLevel={practiceLevel}
          userLevel={profile?.currentLevel}
          onSelectLevel={(lvl) => setPracticeLevel(lvl)}
          onStartTopic={handleStartTopicPractice}
        />
      )}

      {/* TOPIC PRACTICE MODE: Active Focused Session Header */}
      {viewMode === 'topic_practice' && practiceTopic && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsSpeaking(false);
                  setPracticeTopic(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Chọn chủ đề khác
              </button>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
                  Chế độ Luyện tập theo chủ đề
                </p>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {practiceTopic}
                </h3>
              </div>
            </div>

            {/* Inline CEFR Level Switcher inside active Topic Session */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/70 dark:border-slate-800">
                {PRACTICE_LEVEL_ORDER.map((lvl) => {
                  const lvlCount = publishedPassages.filter(
                    (p) => p.category === practiceTopic && (lvl === 'ALL' || p.levelId === lvl)
                  ).length;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        stopSpeaking();
                        setIsSpeaking(false);
                        setPracticeLevel(lvl);
                        setIsFlipped(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors tabular-nums ${
                        practiceLevel === lvl
                          ? 'bg-[#FF6B00] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {lvl === 'ALL' ? `Tất cả (${lvlCount})` : `${lvl} (${lvlCount})`}
                    </button>
                  );
                })}
              </div>

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={practiceUnreadOnly}
                  onChange={(e) => {
                    setPracticeUnreadOnly(e.target.checked);
                    setIsFlipped(false);
                  }}
                  className="rounded accent-[#FF6B00]"
                />
                Chỉ bài chưa đọc
              </label>
            </div>
          </div>

          {/* Topic-Level Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                Tiến độ chủ đề ({practiceLevel === 'ALL' ? 'A1–C1' : `CEFR ${practiceLevel}`}):{' '}
                <strong className="text-slate-900 dark:text-white">
                  {topicCompletedCount} / {topicAllPassages.length} bài
                </strong>
              </span>
              <span className="font-bold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                {topicAllPassages.length > 0
                  ? Math.round((topicCompletedCount / topicAllPassages.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isTopicLevelComplete ? 'bg-emerald-500' : 'bg-[#FF6B00]'
                }`}
                style={{
                  width: `${
                    topicAllPassages.length > 0
                      ? Math.round((topicCompletedCount / topicAllPassages.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Topic-Level Completion Celebration Banner */}
          {isTopicLevelComplete && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/70">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    Chúc mừng! Bạn đã hoàn thành trọn bộ &ldquo;{practiceTopic}&rdquo; ở cấp độ{' '}
                    {practiceLevel === 'ALL' ? 'A1–C1' : practiceLevel}!
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-300/80 text-xs mt-0.5">
                    Bạn có thể ôn lại các thẻ bên dưới hoặc thử thách bản thân ở cấp độ cao hơn.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {nextPracticeLevel && (
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeLevel(nextPracticeLevel);
                      setPracticeUnreadOnly(false);
                      setIsFlipped(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    Nâng lên cấp độ {nextPracticeLevel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPracticeTopic(null)}
                  className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40"
                >
                  Đổi chủ đề
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* EXPLORE MODE: Filter & Search Toolbar */}
      {viewMode === 'explore' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {LEVEL_FILTERS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setLevelFilter(lvl);
                    setIsFlipped(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    levelFilter === lvl
                      ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl === 'ALL' ? 'Tất cả' : lvl}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setIsFlipped(false);
              }}
              aria-label="Lọc theo chủ đề bài đọc"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              <option value="ALL">Tất cả chủ đề ({publishedPassages.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({categoryCounts.get(cat) ?? 0})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'UNREAD' | 'READ');
                setIsFlipped(false);
              }}
              aria-label="Lọc theo trạng thái đã đọc"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="UNREAD">Chưa đọc</option>
              <option value="READ">Đã đọc</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 lg:max-w-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tiêu đề hoặc nội dung bài đọc..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => void refreshReadingPassages(true)}
              disabled={readingPassagesLoading}
              title="Tải lại danh sách bài đọc mới nhất"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              aria-label="Làm mới bài đọc"
            >
              <RefreshCw className={`w-4 h-4 ${readingPassagesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </section>
      )}

      {/* Main 3D Reading Flashcard Deck (shown in Explore mode OR active Topic Practice Session) */}
      {!isShowingTopicBoard && (activePassage ? (
        <section className="space-y-4">
          {/* Card Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-[#FF6B00]/12 border border-[#FF6B00]/30 text-[#D94E00] dark:text-[#FF8524] font-bold">
                CEFR {activePassage.levelId}
              </span>
              <span className="text-slate-600 dark:text-slate-300">{activePassage.category}</span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 tabular-nums">
                <Clock className="w-3.5 h-3.5" />~{activePassage.estimatedMinutes} phút đọc
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Font size switcher */}
              <div
                className="inline-flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                title="Chỉnh cỡ chữ bài đọc"
              >
                <Type className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
                {(['sm', 'md', 'lg'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontScale(sz)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                      fontScale === sz
                        ? 'bg-[#FF6B00] text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : 'A+'}
                  </button>
                ))}
              </div>

              {/* Speech speed toggle */}
              <button
                type="button"
                onClick={() => setSpeechRate((r) => (r === 0.96 ? 0.82 : 0.96))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#FF6B00]/40 tabular-nums"
                title="Đổi tốc độ đọc tiếng Anh"
              >
                Tốc độ: {speechRate === 0.82 ? 'Chậm 0.8x' : 'Chuẩn 1.0x'}
              </button>

              {/* Listen button */}
              <button
                type="button"
                onClick={() => handleSpeakPassage(activePassage)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                  isSpeaking
                    ? 'border-rose-500 bg-rose-600 text-white'
                    : 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/20'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Dừng nghe
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    Nghe bài đọc
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3D Flip Reading Card (Auto-sizing Grid Overlay so long passages never clip) */}
          <div className="flashcard-scene max-w-4xl mx-auto">
            <div
              className={`flashcard-inner grid grid-cols-1 grid-rows-1 ${
                isFlipped ? 'is-flipped' : ''
              }`}
            >
              {/* FRONT FACE: ENGLISH PASSAGE (Editorial Reading Card Aesthetic) */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleToggleFlip}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleToggleFlip();
                  }
                }}
                aria-label="Mặt trước bài đọc tiếng Anh — nhấn để lật xem bản dịch tiếng Việt"
                className="flashcard-face [grid-area:1/1] cursor-pointer rounded-[22px] p-6 sm:p-10 md:p-12 bg-[#FAF5EC] dark:bg-slate-900 border-2 border-[#E7D8C3] dark:border-[#FF6B00]/50 shadow-[0_14px_40px_-20px_rgba(15,23,42,0.35)] dark:shadow-[0_0_28px_-8px_rgba(255,107,0,0.32)] flex flex-col justify-between gap-8 select-text"
              >
                <div className="space-y-6">
                  {/* Top face label */}
                  <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest">
                    <span className="text-[#C84300] dark:text-[#FF8524]">
                      Mặt trước · English Reading
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      #{activeIndex + 1} / {deckPassages.length}
                    </span>
                  </div>

                  {/* Editorial Serif Title (inspired by the warm reading card aesthetic) */}
                  <h3 className="font-serif text-center text-3xl sm:text-4xl font-bold tracking-tight text-[#D81B60] dark:text-[#FF7E29] leading-tight">
                    {activePassage.titleEn}
                  </h3>

                  {/* Body text */}
                  <div
                    className={`font-serif text-slate-900 dark:text-slate-100 whitespace-pre-line text-justify sm:text-left ${FONT_SIZE_CLASSES[fontScale]}`}
                  >
                    {activePassage.contentEn}
                  </div>
                </div>

                {/* Bottom Flip Hint */}
                <div className="pt-5 border-t border-[#E6D7C2] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Nhấn vào thẻ để xem bản dịch tiếng Việt & từ vựng nổi bật
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFlip();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors shadow-[0_0_16px_rgba(255,107,0,0.25)]"
                  >
                    <RotateCw className="w-4 h-4" />
                    Lật xem bản dịch Tiếng Việt
                  </button>
                </div>
              </div>

              {/* BACK FACE: VIETNAMESE TRANSLATION + KEY PHRASES */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleToggleFlip}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleToggleFlip();
                  }
                }}
                aria-label="Mặt sau bản dịch tiếng Việt — nhấn để lật lại bài đọc tiếng Anh"
                className="flashcard-face flashcard-back [grid-area:1/1] cursor-pointer rounded-[22px] p-6 sm:p-10 md:p-12 bg-white dark:bg-[#0A1628] border-2 border-[#FF6B00]/55 dark:border-[#FF8524]/60 shadow-[0_14px_40px_-20px_rgba(255,107,0,0.28)] flex flex-col justify-between gap-8 select-text"
              >
                <div className="space-y-6">
                  {/* Top face label */}
                  <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Mặt sau · Bản dịch Tiếng Việt
                    </span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      CEFR {activePassage.levelId}
                    </span>
                  </div>

                  {/* Vietnamese Title */}
                  <div className="text-center space-y-1">
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                      {activePassage.titleVi}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      ({activePassage.titleEn})
                    </p>
                  </div>

                  {/* Vietnamese Translation */}
                  <div
                    className={`text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed ${FONT_SIZE_CLASSES[fontScale]}`}
                  >
                    {activePassage.contentVi}
                  </div>

                  {/* Key Phrases Extracted from Passage */}
                  {activePassage.keyPhrases && activePassage.keyPhrases.length > 0 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Cụm từ & từ vựng đáng nhớ trong bài</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activePassage.keyPhrases.map((kp, idx) => (
                          <button
                            key={`${kp.phrase}_${idx}`}
                            type="button"
                            onClick={() => speakEnglish(kp.phrase, { accent: 'en-US', rate: 0.88 })}
                            className="flex items-start justify-between gap-2 text-left px-3 py-2 rounded-lg bg-white dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 hover:border-[#FF6B00]/50 transition-colors"
                            title={`Nghe phát âm "${kp.phrase}"`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {kp.phrase}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {kp.meaningVi}
                              </p>
                            </div>
                            <Volume2 className="w-3.5 h-3.5 text-[#FF6B00] shrink-0 mt-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Flip Back */}
                <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Nhấn lại vào thẻ để tự đọc lại bản tiếng Anh
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFlip();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#FF6B00]/50 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/20 text-xs sm:text-sm font-bold transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                    Lật lại mặt Tiếng Anh
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Deck Navigation & Mark-as-Read Bar */}
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                disabled={deckPassages.length <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Bài trước
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={deckPassages.length <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Bài tiếp theo
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShuffle}
                disabled={deckPassages.length <= 1}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-[#FF6B00]/40 disabled:opacity-50"
                title="Chọn ngẫu nhiên một bài đọc khác"
              >
                <Shuffle className="w-4 h-4" />
                <span className="hidden sm:inline">Ngẫu nhiên</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {viewMode === 'topic_practice' && practiceTopic ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleToggleRead(activePassage)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
                      isCurrentRead
                        ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isCurrentRead ? 'Đã đọc' : 'Đánh dấu đã đọc'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompleteAndNext(activePassage)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs"
                  >
                    Hoàn thành &amp; bài tiếp theo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleRead(activePassage)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-colors ${
                    isCurrentRead
                      ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isCurrentRead ? 'Đã đọc hiểu bài này' : 'Đánh dấu đã đọc xong'}
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <BookOpenText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {viewMode === 'topic_practice' && practiceUnreadOnly
              ? 'Bạn đã hoàn thành toàn bộ bài đọc trong cấp độ này!'
              : 'Không tìm thấy bài đọc phù hợp với bộ lọc hiện tại'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {viewMode === 'topic_practice' && practiceUnreadOnly
              ? 'Tắt mục "Chỉ bài chưa đọc" để ôn lại hoặc chuyển sang cấp độ CEFR tiếp theo.'
              : 'Hãy thử chọn lại cấp độ "Tất cả" hoặc xóa từ khóa tìm kiếm.'}
          </p>
          {viewMode === 'topic_practice' && practiceUnreadOnly && (
            <button
              type="button"
              onClick={() => setPracticeUnreadOnly(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold"
            >
              Xem lại toàn bộ bài trong chủ đề
            </button>
          )}
        </div>
      ))}

      {/* TOPIC PRACTICE MODE: Compact Topic Playlist */}
      {viewMode === 'topic_practice' && practiceTopic && topicAllPassages.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Danh sách bài luyện tập · {practiceTopic} ({practiceLevel === 'ALL' ? 'A1–C1' : practiceLevel})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {topicAllPassages.length} bài · Chọn nhanh bất kỳ bài nào
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topicAllPassages.map((passage, idx) => {
              const isSelected = activePassage?.passageId === passage.passageId;
              const isDone = readSet.has(passage.passageId);
              return (
                <button
                  key={passage.passageId}
                  type="button"
                  onClick={() => {
                    if (practiceUnreadOnly && isDone) {
                      setPracticeUnreadOnly(false);
                    }
                    selectPassage(passage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#FF6B00]/8 dark:bg-[#FF6B00]/12 border-[#FF6B00] ring-1 ring-[#FF6B00]/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#FF6B00]/50'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="font-mono text-slate-400 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[#D94E00] dark:text-[#FF8524]">{passage.levelId}</span>
                      <span className="text-slate-400 font-normal tabular-nums">
                        ~{passage.estimatedMinutes} phút
                      </span>
                    </div>
                    <h4 className="font-serif text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                      {passage.titleEn}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {passage.titleVi}
                    </p>
                  </div>
                  {isDone && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* EXPLORE MODE: Reading Library Catalog Grid */}
      {viewMode === 'explore' && filteredPassages.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Thư viện bài đọc ({filteredPassages.length} bài)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Trang {safeCatalogPage} / {totalCatalogPages} · Chọn bất kỳ bài nào để mở trên thẻ lật phía trên
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {pagedCatalogPassages.map((passage) => {
              const isSelected = activePassage?.passageId === passage.passageId;
              const isDone = readSet.has(passage.passageId);
              return (
                <button
                  key={passage.passageId}
                  type="button"
                  onClick={() => {
                    selectPassage(passage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#FF6B00]/8 dark:bg-[#FF6B00]/12 border-[#FF6B00] ring-1 ring-[#FF6B00]/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#FF6B00]/50'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                      <span className="text-[#D94E00] dark:text-[#FF8524]">
                        {passage.levelId} · {passage.category}
                      </span>
                      {isDone && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <h4 className="font-serif text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {passage.titleEn}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                      {passage.titleVi}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed pt-1">
                      {passage.contentEn}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="tabular-nums">
                      #{passage.order} · ~{passage.estimatedMinutes} phút
                    </span>
                    <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
                      {isSelected ? 'Đang mở' : 'Đọc ngay →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {totalCatalogPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                disabled={safeCatalogPage <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45"
              >
                <ChevronLeft className="w-4 h-4" />
                Trang trước
              </button>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {Array.from({ length: totalCatalogPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCatalogPage(pageNum)}
                    className={`min-w-[34px] h-8 px-2 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                      pageNum === safeCatalogPage
                        ? 'bg-[#FF6B00] text-white shadow-xs'
                        : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-[#FF6B00]/50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                disabled={safeCatalogPage >= totalCatalogPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45"
              >
                Trang sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
