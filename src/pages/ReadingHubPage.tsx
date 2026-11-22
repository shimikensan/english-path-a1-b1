import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  RotateCw,
  Search,
  Shuffle,
  Sparkles,
  Square,
  Type,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LearnerCEFRLevel, ReadingPassageDoc } from '../types';
import { playCorrectBeep } from '../utils/cockpitAudio';
import { speakEnglish, stopSpeaking } from '../utils/speech';

const LEVEL_FILTERS: Array<'ALL' | LearnerCEFRLevel> = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'];

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

  const [levelFilter, setLevelFilter] = useState<'ALL' | LearnerCEFRLevel>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePassageId, setActivePassageId] = useState<string>('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [fontScale, setFontScale] = useState<FontSizeScale>('md');
  const [speechRate, setSpeechRate] = useState<0.82 | 0.96>(0.96);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => loadReadIds(profile?.uid));

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedPassages.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [publishedPassages]);

  const filteredPassages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedPassages.filter((p) => {
      if (levelFilter !== 'ALL' && p.levelId !== levelFilter) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.titleEn.toLowerCase().includes(q) ||
        p.titleVi.toLowerCase().includes(q) ||
        p.contentEn.toLowerCase().includes(q) ||
        p.contentVi.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [publishedPassages, levelFilter, categoryFilter, searchQuery]);

  const activeIndex = useMemo(() => {
    if (filteredPassages.length === 0) return -1;
    const found = filteredPassages.findIndex((p) => p.passageId === activePassageId);
    return found >= 0 ? found : 0;
  }, [filteredPassages, activePassageId]);

  const activePassage: ReadingPassageDoc | null =
    activeIndex >= 0 ? filteredPassages[activeIndex] : null;

  const readSet = useMemo(() => new Set(readIds), [readIds]);
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

  const handleToggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    recordStudyActivity();
  }, [recordStudyActivity]);

  const handleStep = useCallback(
    (delta: number) => {
      if (filteredPassages.length <= 1 || activeIndex < 0) return;
      const nextIdx = (activeIndex + delta + filteredPassages.length) % filteredPassages.length;
      selectPassage(filteredPassages[nextIdx]);
    },
    [filteredPassages, activeIndex, selectPassage]
  );

  const handleShuffle = useCallback(() => {
    if (filteredPassages.length <= 1) return;
    let nextIdx = activeIndex;
    for (let i = 0; i < 8 && nextIdx === activeIndex; i++) {
      nextIdx = Math.floor(Math.random() * filteredPassages.length);
    }
    if (nextIdx === activeIndex) {
      nextIdx = (activeIndex + 1) % filteredPassages.length;
    }
    selectPassage(filteredPassages[nextIdx]);
  }, [filteredPassages, activeIndex, selectPassage]);

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
      if (!activePassage) return;

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
  }, [activePassage, handleToggleFlip, handleStep]);

  const isCurrentRead = activePassage ? readSet.has(activePassage.passageId) : false;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="cockpit-radar-panel bg-white dark:bg-slate-900 p-5 sm:p-6">
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
      </section>

      {/* Filter & Search Toolbar */}
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
            <option value="ALL">Tất cả chủ đề</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
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

      {/* Main 3D Reading Flashcard Deck */}
      {activePassage ? (
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
                      #{activeIndex + 1} / {filteredPassages.length}
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
                disabled={filteredPassages.length <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Bài trước
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={filteredPassages.length <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Bài tiếp theo
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShuffle}
                disabled={filteredPassages.length <= 1}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-[#FF6B00]/40 disabled:opacity-50"
                title="Chọn ngẫu nhiên một bài đọc khác"
              >
                <Shuffle className="w-4 h-4" />
                <span className="hidden sm:inline">Ngẫu nhiên</span>
              </button>
            </div>

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
          </div>
        </section>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <BookOpenText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Không tìm thấy bài đọc phù hợp với bộ lọc hiện tại
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hãy thử chọn lại cấp độ &ldquo;Tất cả&rdquo; hoặc xóa từ khóa tìm kiếm.
          </p>
        </div>
      )}

      {/* Reading Library Catalog Grid */}
      {filteredPassages.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Thư viện bài đọc ({filteredPassages.length} bài)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Chọn bất kỳ bài nào để mở trên thẻ lật phía trên
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredPassages.map((passage) => {
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
                    <span className="tabular-nums">~{passage.estimatedMinutes} phút đọc</span>
                    <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
                      {isSelected ? 'Đang mở' : 'Đọc ngay →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
