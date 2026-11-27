import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Feather,
  GraduationCap,
  HelpCircle,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ENGLISH_STORIES, STORY_COLLECTIONS } from '../data/stories';
import type { EnglishStory, LearnerCEFRLevel, StoryCollectionId } from '../types';
import {
  buildLocalCurriculumDictionary,
  lookupCachedTranslation,
  lookupLocalDictionary,
  normalizeLookupKey,
  saveCachedTranslation,
  type DictionaryEntry,
} from '../utils/localDictionary';
import {
  speakEnglish,
  speakEnglishWithWordTracking,
  stopSpeaking,
  type SpeechAccent,
  type WordTrackingSpeechController,
} from '../utils/speech';

type LevelFilter = 'ALL' | LearnerCEFRLevel;
type CollectionFilter = 'ALL' | StoryCollectionId;
type DeckTab = 'vocab' | 'grammar' | 'quiz';

const CEFR_LEVELS: LearnerCEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
const PLAYBACK_RATES = [0.75, 0.9, 1.0, 1.15] as const;

interface ActiveWordLookup {
  rawWord: string;
  sentenceEn: string;
  loading: boolean;
  entry: DictionaryEntry | null;
  error: string | null;
  offlineMiss: boolean;
}

function getCompletedStorageKey(uid?: string): string {
  return `pilot_completed_stories_v1_${uid || 'guest'}`;
}

function readCompletedStoryIds(uid?: string): string[] {
  try {
    const raw = window.localStorage.getItem(getCompletedStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeCompletedStoryIds(uid: string | undefined, ids: string[]): void {
  try {
    window.localStorage.setItem(getCompletedStorageKey(uid), JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Splits an English sentence into whitespace tokens while separating leading/trailing punctuation
 * so every word is cleanly clickable and maps 1:1 to SpeechSynthesis word indices.
 */
function tokenizeSentence(sentence: string): Array<{
  raw: string;
  prefix: string;
  core: string;
  suffix: string;
}> {
  return sentence
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(/^([^A-Za-z0-9]*)([A-Za-z0-9'’-]+)([^A-Za-z0-9]*)$/);
      if (!match) {
        return { raw, prefix: '', core: raw, suffix: '' };
      }
      return {
        raw,
        prefix: match[1] || '',
        core: match[2] || raw,
        suffix: match[3] || '',
      };
    });
}

function StoryCoverImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-[#0B192E] flex flex-col items-center justify-center p-4 text-center ${className || ''}`}
      >
        <Feather className="w-7 h-7 text-[#FF8C2E] mb-2" />
        <span className="text-xs font-semibold text-slate-200 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className || ''}`}
    />
  );
}

export function StoriesPage() {
  const { profile, lessons, readingPassages, isOnline, recordStudyActivity, addToast } = useApp();

  // Library filter state
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedIds, setCompletedIds] = useState<string[]>(() =>
    readCompletedStoryIds(profile?.uid)
  );
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);

  // Reader playback & display state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [playbackRate, setPlaybackRate] = useState<number>(0.9);
  const [accent, setAccent] = useState<SpeechAccent>('en-US');
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [revealedSentenceMap, setRevealedSentenceMap] = useState<Record<number, boolean>>({});
  const [deckTab, setDeckTab] = useState<DeckTab>('vocab');

  // Instant tap-to-translate word lookup
  const [wordLookup, setWordLookup] = useState<ActiveWordLookup | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);

  // Story comprehension quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  // Speech playback refs
  const speechControllerRef = useRef<WordTrackingSpeechController | null>(null);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(playbackRate);
  const accentRef = useRef(accent);
  const sentenceNodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  isPlayingRef.current = isPlaying;
  playbackRateRef.current = playbackRate;
  accentRef.current = accent;

  // Sync completed stories when user switches account
  useEffect(() => {
    setCompletedIds(readCompletedStoryIds(profile?.uid));
  }, [profile?.uid]);

  const localCurriculumDict = useMemo(
    () => buildLocalCurriculumDictionary(lessons, readingPassages),
    [lessons, readingPassages]
  );

  const activeStory = useMemo(
    () => ENGLISH_STORIES.find((s) => s.id === activeStoryId) || null,
    [activeStoryId]
  );

  // Build story-specific glossary lookup map for 0ms instant hits
  const storyGlossaryMap = useMemo(() => {
    const map = new Map<string, DictionaryEntry>();
    if (!activeStory) return map;
    for (const item of activeStory.glossary) {
      const key = normalizeLookupKey(item.word);
      if (key) {
        map.set(key, {
          text: item.word,
          ipa: item.ipa,
          partOfSpeech: item.partOfSpeech,
          meaningVi: item.meaningVi,
          source: 'reading',
        });
      }
    }
    return map;
  }, [activeStory]);

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveWordIdx(-1);
    speechControllerRef.current?.stop();
    speechControllerRef.current = null;
    stopSpeaking();
  }, []);

  // Stop speech cleanly on unmount or when leaving reader
  useEffect(() => {
    return () => {
      speechControllerRef.current?.stop();
      lookupAbortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  const playSentenceSequence = useCallback(
    (story: EnglishStory, startIdx: number, continueAfter: boolean) => {
      speechControllerRef.current?.stop();
      speechControllerRef.current = null;

      if (startIdx < 0 || startIdx >= story.sentences.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setActiveWordIdx(-1);
        return;
      }

      setActiveSentenceIdx(startIdx);
      setActiveWordIdx(0);
      isPlayingRef.current = true;
      setIsPlaying(true);

      // Keep active sentence smoothly visible
      const node = sentenceNodeRefs.current[startIdx];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      const sentenceText = story.sentences[startIdx].en;
      speechControllerRef.current = speakEnglishWithWordTracking(sentenceText, {
        accent: accentRef.current,
        rate: playbackRateRef.current,
        onWordIndex: (wIdx) => {
          setActiveWordIdx(wIdx);
        },
        onEnd: () => {
          if (!isPlayingRef.current) {
            setActiveWordIdx(-1);
            return;
          }
          if (continueAfter && startIdx + 1 < story.sentences.length) {
            window.setTimeout(() => {
              if (isPlayingRef.current) {
                playSentenceSequence(story, startIdx + 1, true);
              }
            }, 260);
          } else {
            isPlayingRef.current = false;
            setIsPlaying(false);
            setActiveWordIdx(-1);
          }
        },
      });
    },
    []
  );

  const handleOpenStory = (story: EnglishStory) => {
    stopPlayback();
    lookupAbortRef.current?.abort();
    setActiveStoryId(story.id);
    setActiveSentenceIdx(0);
    setActiveWordIdx(-1);
    setRevealedSentenceMap({});
    setWordLookup(null);
    setQuizAnswers({});
    setDeckTab('vocab');
    recordStudyActivity();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLibrary = () => {
    stopPlayback();
    lookupAbortRef.current?.abort();
    setActiveStoryId(null);
    setWordLookup(null);
  };

  const handleTogglePlayPause = () => {
    if (!activeStory) return;
    if (isPlaying) {
      stopPlayback();
    } else {
      playSentenceSequence(activeStory, activeSentenceIdx, true);
    }
  };

  const handleStepSentence = (delta: number) => {
    if (!activeStory) return;
    const next = Math.max(0, Math.min(activeStory.sentences.length - 1, activeSentenceIdx + delta));
    if (isPlaying) {
      playSentenceSequence(activeStory, next, true);
    } else {
      setActiveSentenceIdx(next);
      setActiveWordIdx(-1);
      sentenceNodeRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleRestartStory = () => {
    if (!activeStory) return;
    playSentenceSequence(activeStory, 0, true);
  };

  const handleToggleCompleteStory = (storyId: string) => {
    setCompletedIds((prev) => {
      const exists = prev.includes(storyId);
      const next = exists ? prev.filter((id) => id !== storyId) : [...prev, storyId];
      writeCompletedStoryIds(profile?.uid, next);
      if (!exists) {
        recordStudyActivity();
        addToast('success', 'Đã đánh dấu hoàn thành câu chuyện! Tiếp tục duy trì thói quen đọc mỗi ngày.');
      }
      return next;
    });
  };

  // Parroto-style instant click-to-lookup on any word in the story
  const handleTapWord = useCallback(
    async (rawWord: string, sentenceEn: string) => {
      const cleaned = rawWord.trim();
      if (!cleaned) return;

      lookupAbortRef.current?.abort();
      lookupAbortRef.current = null;
      setDeckTab('vocab');

      // 1. Story glossary (0ms)
      const storyHit = lookupLocalDictionary(storyGlossaryMap, cleaned);
      if (storyHit) {
        setWordLookup({
          rawWord: cleaned,
          sentenceEn,
          loading: false,
          entry: storyHit,
          error: null,
          offlineMiss: false,
        });
        return;
      }

      // 2. App curriculum dictionary (0ms)
      const localHit = lookupLocalDictionary(localCurriculumDict, cleaned);
      if (localHit) {
        setWordLookup({
          rawWord: cleaned,
          sentenceEn,
          loading: false,
          entry: localHit,
          error: null,
          offlineMiss: false,
        });
        return;
      }

      // 3. Persistent browser cache (0ms)
      const cachedHit = lookupCachedTranslation(cleaned);
      if (cachedHit) {
        setWordLookup({
          rawWord: cleaned,
          sentenceEn,
          loading: false,
          entry: cachedHit,
          error: null,
          offlineMiss: false,
        });
        return;
      }

      if (!isOnline) {
        setWordLookup({
          rawWord: cleaned,
          sentenceEn,
          loading: false,
          entry: null,
          error: null,
          offlineMiss: true,
        });
        return;
      }

      // 4. Server-side AI Dictionary (/api/ai/translate)
      const controller = new AbortController();
      lookupAbortRef.current = controller;
      setWordLookup({
        rawWord: cleaned,
        sentenceEn,
        loading: true,
        entry: null,
        error: null,
        offlineMiss: false,
      });

      try {
        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleaned, context: sentenceEn }),
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as {
          wordOrPhrase?: string;
          ipa?: string;
          partOfSpeech?: string;
          meaningVi?: string;
          noteVi?: string;
          error?: string;
        };

        if (!res.ok || !data.meaningVi) {
          throw new Error(data.error || 'Không thể tra nghĩa từ này lúc này.');
        }

        const aiEntry: DictionaryEntry = {
          text: data.wordOrPhrase || cleaned,
          ipa: data.ipa || '',
          partOfSpeech: data.partOfSpeech || 'Từ vựng',
          meaningVi: data.meaningVi,
          noteVi: data.noteVi || undefined,
          source: 'ai',
        };
        saveCachedTranslation(cleaned, {
          text: aiEntry.text,
          ipa: aiEntry.ipa,
          partOfSpeech: aiEntry.partOfSpeech,
          meaningVi: aiEntry.meaningVi,
          noteVi: aiEntry.noteVi,
        });

        if (lookupAbortRef.current !== controller) return;
        setWordLookup({
          rawWord: cleaned,
          sentenceEn,
          loading: false,
          entry: aiEntry,
          error: null,
          offlineMiss: false,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setWordLookup({
          rawWord: cleaned,
          sentenceEn,
          loading: false,
          entry: null,
          error: err instanceof Error ? err.message : 'Lỗi kết nối từ điển AI.',
          offlineMiss: false,
        });
      }
    },
    [isOnline, localCurriculumDict, storyGlossaryMap]
  );

  // Filtered stories for Library View
  const filteredStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ENGLISH_STORIES.filter((story) => {
      if (levelFilter !== 'ALL' && story.levelId !== levelFilter) return false;
      if (collectionFilter !== 'ALL' && story.collection !== collectionFilter) return false;
      if (q) {
        const haystack = `${story.titleEn} ${story.titleVi} ${story.author} ${story.summaryVi}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [levelFilter, collectionFilter, searchQuery]);

  // ==================== READER VIEW ====================
  if (activeStory) {
    const isCompleted = completedIds.includes(activeStory.id);
    const answeredCount = Object.keys(quizAnswers).length;
    const correctQuizCount = activeStory.quiz.reduce(
      (sum, q, idx) => sum + (quizAnswers[idx] === q.correctIndex ? 1 : 0),
      0
    );

    return (
      <div className="space-y-6">
        {/* Top Reader Navigation & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToLibrary}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại thư viện truyện</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleCompleteStory(activeStory.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isCompleted
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#FF6B00] hover:text-[#D94E00] dark:hover:text-[#FF8524]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? 'Đã hoàn thành truyện' : 'Đánh dấu đã đọc xong'}</span>
          </button>
        </div>

        {/* Sticky Audio Narration & Reading Toolbar */}
        <section className="sticky top-16 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Transport controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs sm:text-sm font-bold hover:bg-[#FF7E1F] transition-colors cursor-pointer whitespace-nowrap"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Tạm dừng' : 'Nghe đọc truyện'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleStepSentence(-1)}
                disabled={activeSentenceIdx <= 0}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                aria-label="Câu trước"
                title="Câu trước"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleStepSentence(1)}
                disabled={activeSentenceIdx >= activeStory.sentences.length - 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                aria-label="Câu tiếp theo"
                title="Câu tiếp theo"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleRestartStory}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Đọc lại từ đầu"
                title="Đọc lại từ đầu"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums pl-1">
                Câu {activeSentenceIdx + 1}/{activeStory.sentences.length}
              </span>
            </div>

            {/* Playback Speed, Accent & Bilingual Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                role="group"
                aria-label="Tốc độ đọc"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <div
                className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                role="group"
                aria-label="Giọng đọc"
              >
                {(['en-US', 'en-GB'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setAccent(code)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      accent === code
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {code === 'en-US' ? 'US' : 'UK'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowTranslations((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  showTranslations
                    ? 'border-blue-500/40 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {showTranslations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showTranslations ? 'Đang hiện dịch VI' : 'Đang ẩn dịch VI'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Two-Zone Educational Layout: Story Stage (Left) + Interactive Study Deck (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Story Reader Stage */}
          <article className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Editorial Story Cover Banner */}
            <div className="relative h-52 sm:h-64 w-full overflow-hidden">
              <StoryCoverImage src={activeStory.coverImage} alt={activeStory.titleEn} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200 font-medium">
                  <span className="font-bold text-[#FF9D4D]">CEFR {activeStory.levelId}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeStory.author}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activeStory.sentences.length} câu</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activeStory.estimatedMinutes} phút đọc</span>
                </div>
                <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
                  {activeStory.titleEn}
                </h1>
                <p className="mt-0.5 text-sm text-slate-200/95 font-medium">
                  {activeStory.titleVi}
                </p>
              </div>
            </div>

            {/* Interactive reading instruction */}
            <div className="px-5 sm:px-7 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <span>
                Chạm vào <strong>bất kỳ từ tiếng Anh nào</strong> để tra nghĩa tức thì · Nhấn nút loa từng câu để luyện nghe theo từng chữ.
              </span>
            </div>

            {/* Mobile Inline Word Lookup Result (immediately visible on narrow screens) */}
            {wordLookup && (
              <div className="lg:hidden px-5 py-3.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200/70 dark:border-blue-800/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {wordLookup.entry?.text || wordLookup.rawWord}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglish(wordLookup.entry?.text || wordLookup.rawWord, { accent })}
                        className="p-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 cursor-pointer"
                        aria-label={`Nghe phát âm ${wordLookup.rawWord}`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {wordLookup.loading && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6B00]" />
                        Đang tra nghĩa tiếng Việt...
                      </p>
                    )}
                    {wordLookup.entry && (
                      <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">
                        {wordLookup.entry.ipa && (
                          <span className="font-mono text-blue-600 dark:text-blue-400 mr-1.5">
                            {wordLookup.entry.ipa}
                          </span>
                        )}
                        {wordLookup.entry.partOfSpeech && (
                          <span className="text-slate-500 dark:text-slate-400 mr-1.5">
                            ({wordLookup.entry.partOfSpeech})
                          </span>
                        )}
                        <strong className="font-semibold">{wordLookup.entry.meaningVi}</strong>
                      </p>
                    )}
                    {wordLookup.offlineMiss && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Chưa có trong bộ nhớ đệm ngoại tuyến. Kết nối mạng để tra bằng AI.
                      </p>
                    )}
                    {wordLookup.error && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                        {wordLookup.error}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setWordLookup(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Đóng khung tra từ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Sentence-by-sentence Interactive Bilingual Text */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {activeStory.sentences.map((sentence, sIdx) => {
                const isActiveSentence = activeSentenceIdx === sIdx;
                const tokens = tokenizeSentence(sentence.en);
                const showThisVi = showTranslations || Boolean(revealedSentenceMap[sIdx]);

                return (
                  <div
                    key={sIdx}
                    ref={(el) => {
                      sentenceNodeRefs.current[sIdx] = el;
                    }}
                    className={`px-5 sm:px-7 py-4 sm:py-5 transition-colors duration-150 ${
                      isActiveSentence
                        ? 'bg-[#FF6B00]/[0.05] dark:bg-[#FF6B00]/[0.08]'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Sentence play button + index */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isPlaying && isActiveSentence) {
                            stopPlayback();
                          } else {
                            playSentenceSequence(activeStory, sIdx, true);
                          }
                        }}
                        className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isActiveSentence && isPlaying
                            ? 'bg-[#FF6B00] text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#FF6B00]/15 hover:text-[#D94E00] dark:hover:text-[#FF8524]'
                        }`}
                        aria-label={`Nghe câu ${sIdx + 1}`}
                        title={`Nghe từ câu ${sIdx + 1}`}
                      >
                        {isActiveSentence && isPlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Clickable word-by-word English sentence */}
                        <p className="text-[16px] sm:text-[17px] leading-[1.85] text-slate-900 dark:text-slate-100 font-medium">
                          {tokens.map((tok, wIdx) => {
                            const isSpokenWord = isActiveSentence && isPlaying && activeWordIdx === wIdx;
                            const isGlossaryWord = Boolean(
                              tok.core && storyGlossaryMap.has(normalizeLookupKey(tok.core))
                            );
                            const isSelectedWord =
                              wordLookup &&
                              normalizeLookupKey(wordLookup.rawWord) ===
                                normalizeLookupKey(tok.core);

                            return (
                              <span key={wIdx}>
                                {tok.prefix}
                                {tok.core ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleTapWord(tok.core, sentence.en)}
                                    className={`inline rounded px-0.5 transition-colors duration-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                                      isSpokenWord
                                        ? 'bg-[#FF6B00] text-white font-semibold'
                                        : isSelectedWord
                                          ? 'bg-blue-600/15 dark:bg-blue-400/25 text-blue-700 dark:text-blue-300 underline decoration-blue-500 underline-offset-4'
                                          : isGlossaryWord
                                            ? 'underline decoration-dotted decoration-[#FF6B00]/70 underline-offset-4 hover:bg-[#FF6B00]/12 dark:hover:bg-[#FF6B00]/20'
                                            : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                                    }`}
                                  >
                                    {tok.core}
                                  </button>
                                ) : null}
                                {tok.suffix}
                                {wIdx < tokens.length - 1 ? ' ' : ''}
                              </span>
                            );
                          })}
                        </p>

                        {/* Vietnamese Translation or Per-Sentence Reveal */}
                        {showThisVi ? (
                          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            {sentence.vi}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedSentenceMap((prev) => ({ ...prev, [sIdx]: true }))
                            }
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Hiện dịch câu này
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Moral / Takeaway Footer */}
            <div className="px-5 sm:px-7 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8C2E]">
                Thông điệp câu chuyện
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeStory.moralVi}
              </p>
            </div>
          </article>

          {/* Right Sticky Interactive Study Deck */}
          <aside className="lg:col-span-4 lg:sticky lg:top-36 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Segmented Tab Switcher */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'vocab', label: 'Từ vựng', icon: BookOpen },
                    { id: 'grammar', label: 'Ngữ pháp', icon: GraduationCap },
                    { id: 'quiz', label: 'Đọc hiểu', icon: HelpCircle },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = deckTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDeckTab(tab.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-5 max-h-[calc(100vh-13rem)] overflow-y-auto space-y-4">
              {/* TAB 1: Instant Lookup + Story Glossary */}
              {deckTab === 'vocab' && (
                <div className="space-y-4">
                  {/* Live Word Lookup Result */}
                  {wordLookup && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/70 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                            Tra từ nhanh trong truyện
                          </div>
                          <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                            {wordLookup.entry?.text || wordLookup.rawWord}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              speakEnglish(wordLookup.entry?.text || wordLookup.rawWord, { accent })
                            }
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 cursor-pointer"
                            aria-label={`Nghe phát âm ${wordLookup.rawWord}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setWordLookup(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            aria-label="Đóng kết quả tra từ"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {wordLookup.loading && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin text-[#FF6B00]" />
                          <span>Đang tra nghĩa sát ngữ cảnh...</span>
                        </div>
                      )}

                      {wordLookup.offlineMiss && (
                        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                          <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Từ này chưa có trong kho ngoại tuyến. Hãy kết nối mạng để tra bằng AI.</span>
                        </div>
                      )}

                      {wordLookup.error && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">{wordLookup.error}</p>
                      )}

                      {wordLookup.entry && (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {wordLookup.entry.ipa && (
                              <span className="font-mono text-blue-600 dark:text-blue-400">
                                {wordLookup.entry.ipa}
                              </span>
                            )}
                            {wordLookup.entry.ipa && wordLookup.entry.partOfSpeech && (
                              <span aria-hidden="true">·</span>
                            )}
                            {wordLookup.entry.partOfSpeech && (
                              <span>{wordLookup.entry.partOfSpeech}</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                            {wordLookup.entry.meaningVi}
                          </p>
                          {wordLookup.entry.noteVi && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {wordLookup.entry.noteVi}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Curated Glossary List */}
                  <div>
                    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5">
                      Từ vựng trọng tâm ({activeStory.glossary.length} từ)
                    </h2>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeStory.glossary.map((item) => (
                        <div
                          key={item.word}
                          className="py-2.5 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {item.word}
                              </span>
                              <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                {item.ipa}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.partOfSpeech}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-200">
                              {item.meaningVi}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => speakEnglish(item.word, { accent })}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                            aria-label={`Nghe phát âm ${item.word}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Embedded Story Grammar Insights */}
              {deckTab === 'grammar' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeStory.grammarPoints.map((gp, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {idx + 1}. {gp.title}
                      </h3>
                      <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-[#D94E00] dark:text-[#FF8C2E]">
                        {gp.formula}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {gp.explanationVi}
                      </p>
                      <div className="pt-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                            “{gp.exampleEn}”
                          </p>
                          <button
                            type="button"
                            onClick={() => speakEnglish(gp.exampleEn, { accent })}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 shrink-0 cursor-pointer"
                            aria-label="Nghe câu ví dụ ngữ pháp"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{gp.exampleVi}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Quick Comprehension Quiz */}
              {deckTab === 'quiz' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      Đã trả lời {answeredCount}/{activeStory.quiz.length} câu
                    </span>
                    {answeredCount === activeStory.quiz.length && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Đúng {correctQuizCount}/{activeStory.quiz.length}
                      </span>
                    )}
                  </div>

                  {activeStory.quiz.map((q, qIdx) => {
                    const selected = quizAnswers[qIdx];
                    const hasAnswered = selected !== undefined;
                    return (
                      <div
                        key={qIdx}
                        className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0 space-y-2.5"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oIdx) => {
                            const isPicked = selected === oIdx;
                            const isCorrect = oIdx === q.correctIndex;
                            let optionStyle =
                              'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800';
                            if (hasAnswered) {
                              if (isCorrect) {
                                optionStyle =
                                  'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold';
                              } else if (isPicked) {
                                optionStyle =
                                  'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200';
                              } else {
                                optionStyle =
                                  'border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500';
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={hasAnswered}
                                onClick={() =>
                                  setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                                }
                                className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors cursor-pointer disabled:cursor-default ${optionStyle}`}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </button>
                            );
                          })}
                        </div>
                        {hasAnswered && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                            {selected === q.correctIndex ? 'Chính xác: ' : 'Giải thích: '}
                            {q.explanationVi}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {answeredCount > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setQuizAnswers({})}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        Làm lại câu hỏi
                      </button>
                      {!isCompleted && answeredCount === activeStory.quiz.length && (
                        <button
                          type="button"
                          onClick={() => handleToggleCompleteStory(activeStory.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hoàn thành truyện
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ==================== STORY LIBRARY VIEW ====================
  return (
    <div className="space-y-6">
      {/* Editorial Library Header */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8C2E]">
              Thư viện truyện song ngữ phân cấp CEFR A1–C1
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
              Học tiếng Anh qua truyện kinh điển &amp; hiện đại
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Nghe đọc phát âm kèm làm nổi bật từng từ theo giọng đọc, chạm vào bất kỳ từ nào để tra nghĩa tức thì, khám phá ngữ pháp ẩn trong truyện và làm trắc nghiệm đọc hiểu.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>
                Đã hoàn thành <strong className="text-slate-900 dark:text-white">{completedIds.length}/{ENGLISH_STORIES.length}</strong> truyện
              </span>
              <span aria-hidden="true">·</span>
              <span>{STORY_COLLECTIONS.length} bộ sưu tập chọn lọc</span>
              <span aria-hidden="true">·</span>
              <span>Hỗ trợ nghe US/UK &amp; dịch song ngữ</span>
            </div>
          </div>

          {/* Search input */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên truyện, tác giả..."
              aria-label="Tìm kiếm câu chuyện"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>

        {/* Interactive Level & Collection Filters */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Collection Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Bộ sưu tập truyện">
            <button
              type="button"
              onClick={() => setCollectionFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                collectionFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả bộ truyện
            </button>
            {STORY_COLLECTIONS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setCollectionFilter(col.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  collectionFilter === col.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {col.name}
              </button>
            ))}
          </div>

          {/* CEFR Level Segmented Filter */}
          <div
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start md:self-auto"
            role="group"
            aria-label="Lọc theo cấp độ CEFR"
          >
            <button
              type="button"
              onClick={() => setLevelFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                levelFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mọi cấp độ
            </button>
            {CEFR_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  levelFilter === lvl
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Story Grid */}
      {filteredStories.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Không tìm thấy câu chuyện phù hợp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={() => {
              setLevelFilter('ALL');
              setCollectionFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#FF7E1F] cursor-pointer"
          >
            Xem toàn bộ {ENGLISH_STORIES.length} câu chuyện
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStories.map((story) => {
            const done = completedIds.includes(story.id);
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => handleOpenStory(story)}
                className="group text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-[#FF6B00]/60 transition-colors duration-150 flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
              >
                {/* 4:3 Editorial Cover */}
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <StoryCoverImage
                    src={story.coverImage}
                    alt={story.titleEn}
                    className="group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>

                {/* Clean Unboxed Metadata & Story Title */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="font-bold text-[#D94E00] dark:text-[#FF8C2E]">
                        {story.levelId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{story.author}</span>
                      <span aria-hidden="true">·</span>
                      <span>{story.estimatedMinutes} phút đọc</span>
                      {done && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã đọc
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#D94E00] dark:group-hover:text-[#FF8C2E] transition-colors">
                      {story.titleEn}
                    </h2>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {story.titleVi}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 pt-0.5">
                      {story.summaryVi}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                      {story.sentences.length} câu · {story.glossary.length} từ vựng ·{' '}
                      {story.grammarPoints.length} ngữ pháp
                    </span>
                    <span className="font-bold text-[#FF6B00] dark:text-[#FF8C2E]">
                      Đọc ngay →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
