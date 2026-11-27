import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Eye,
  EyeOff,
  Gem,
  GraduationCap,
  Headphones,
  Layers,
  MessageSquareQuote,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { ToeicChallengeNavTarget } from '../components/ToeicQuickChallengeNotifier';
import { ToeicStudyGroupsPanel } from '../components/ToeicStudyGroupsPanel';
import { useApp } from '../context/AppContext';
import {
  LESSONS_TOEIC,
  TOEIC_CATEGORIES,
  TOEIC_PART5_DRILLS,
  TOEIC_TOPICS,
  TOEIC_WORD_FAMILIES,
  type ToeicCategoryId,
  type ToeicPart5Question,
} from '../data';
import { getLessonGemReward } from '../data/pilotGearCatalog';
import type { LessonDoc, LessonTab, VocabularyItem } from '../types';
import { shuffleArray } from '../utils/helpers';
import { speakEnglish, type SpeechAccent } from '../utils/speech';

interface ToeicHubPageProps {
  onOpenLesson: (lessonId: string, tab?: LessonTab) => void;
  initialGroupTarget?: ToeicChallengeNavTarget | null;
}

type ToeicWorkspaceTab = 'topics' | 'word_family' | 'part5' | 'listening' | 'groups';

interface ListeningQuestion {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  topicLabel: string;
  exampleEn: string;
  exampleVi: string;
  correctMeaning: string;
  options: string[];
  correctIndex: number;
}

const CATEGORY_MAP = new Map(TOEIC_CATEGORIES.map((c) => [c.id, c]));

export function ToeicHubPage({ onOpenLesson, initialGroupTarget }: ToeicHubPageProps) {
  const {
    lessons,
    progressMap,
    vocabMap,
    toggleVocabState,
    awardBonusGems,
    triggerGemFlight,
    recordStudyActivity,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ToeicWorkspaceTab>(() =>
    initialGroupTarget ? 'groups' : 'topics'
  );

  useEffect(() => {
    if (initialGroupTarget?.groupId) {
      setActiveTab('groups');
    }
  }, [initialGroupTarget?.nonce, initialGroupTarget?.groupId]);
  const [accent, setAccent] = useState<SpeechAccent>('en-US');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ToeicCategoryId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [topicSearch, setTopicSearch] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [savingVocabId, setSavingVocabId] = useState<string | null>(null);

  // Word family state
  const [wfSearch, setWfSearch] = useState('');
  const [wfHideAnswers, setWfHideAnswers] = useState(false);
  const [wfRevealedIds, setWfRevealedIds] = useState<Record<string, boolean>>({});

  // Part 5 drill state
  const [part5Category, setPart5Category] = useState<'all' | ToeicCategoryId>('all');
  const [part5Questions, setPart5Questions] = useState<ToeicPart5Question[]>(() =>
    shuffleArray(TOEIC_PART5_DRILLS).slice(0, 10)
  );
  const [part5Index, setPart5Index] = useState(0);
  const [part5Selected, setPart5Selected] = useState<number | null>(null);
  const [part5CorrectCount, setPart5CorrectCount] = useState(0);
  const [part5Finished, setPart5Finished] = useState(false);
  const [part5AwardedGems, setPart5AwardedGems] = useState<number>(0);

  // Listening recognition drill state
  const [listeningScope, setListeningScope] = useState<string>('all'); // 'all' | `cat:${categoryId}` | `topic:${lessonId}`
  const [listeningSlow, setListeningSlow] = useState(false);
  const [listeningIndex, setListeningIndex] = useState(0);
  const [listeningSelected, setListeningSelected] = useState<number | null>(null);
  const [listeningCorrectCount, setListeningCorrectCount] = useState(0);
  const [listeningFinished, setListeningFinished] = useState(false);
  const [listeningAwardedGems, setListeningAwardedGems] = useState<number>(0);
  const [listeningSeed, setListeningSeed] = useState(1);

  const toeicLessons = useMemo<LessonDoc[]>(() => {
    const fromContext = lessons.filter((l) => l.levelId === 'TOEIC');
    const source = fromContext.length >= LESSONS_TOEIC.length ? fromContext : LESSONS_TOEIC;
    return [...source].sort((a, b) => a.order - b.order);
  }, [lessons]);

  const lessonById = useMemo(
    () => new Map(toeicLessons.map((l) => [l.lessonId, l])),
    [toeicLessons]
  );

  // Aggregate TOEIC progress & Gem calculations across all 44 topics (616 words)
  const toeicStats = useMemo(() => {
    let completedLessons = 0;
    let totalVocab = 0;
    let learnedVocab = 0;
    let totalLessonGemsAvailable = 0;
    let earnedFromToeicLessons = 0;

    toeicLessons.forEach((lesson) => {
      const reward = getLessonGemReward(lesson);
      totalLessonGemsAvailable += reward + lesson.vocabulary.length * 3;
      totalVocab += lesson.vocabulary.length;

      const prog = progressMap[lesson.lessonId];
      if (prog?.lessonCompleted) {
        completedLessons += 1;
        earnedFromToeicLessons += reward;
      }

      lesson.vocabulary.forEach((v) => {
        if (vocabMap[v.id]?.isLearned) {
          learnedVocab += 1;
          earnedFromToeicLessons += 3;
        }
      });
    });

    const overallPct =
      totalVocab > 0
        ? Math.round(
            ((completedLessons / Math.max(1, toeicLessons.length)) * 0.5 +
              (learnedVocab / totalVocab) * 0.5) *
              100
          )
        : 0;

    return {
      completedLessons,
      totalLessons: toeicLessons.length,
      learnedVocab,
      totalVocab,
      totalLessonGemsAvailable,
      earnedFromToeicLessons,
      overallPct,
    };
  }, [toeicLessons, progressMap, vocabMap]);

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    return TOEIC_TOPICS.filter((topic) => {
      if (selectedCategory !== 'all' && topic.categoryId !== selectedCategory) return false;
      const done = Boolean(progressMap[topic.lessonId]?.lessonCompleted);
      if (statusFilter === 'done' && !done) return false;
      if (statusFilter === 'todo' && done) return false;
      if (!q) return true;
      const lesson = lessonById.get(topic.lessonId);
      const matchesTopic =
        topic.code.toLowerCase().includes(q) ||
        topic.titleVi.toLowerCase().includes(q) ||
        topic.titleEn.toLowerCase().includes(q) ||
        topic.summaryVi.toLowerCase().includes(q);
      const matchesVocab = lesson?.vocabulary.some(
        (v) => v.word.toLowerCase().includes(q) || v.meaningVi.toLowerCase().includes(q)
      );
      return matchesTopic || Boolean(matchesVocab);
    });
  }, [selectedCategory, statusFilter, topicSearch, progressMap, lessonById]);

  const filteredWordFamilies = useMemo(() => {
    const q = wfSearch.trim().toLowerCase();
    return TOEIC_WORD_FAMILIES.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.rootMeaningVi.toLowerCase().includes(q) ||
        (item.noun ?? '').toLowerCase().includes(q) ||
        (item.verb ?? '').toLowerCase().includes(q) ||
        (item.adjective ?? '').toLowerCase().includes(q) ||
        (item.adverb ?? '').toLowerCase().includes(q)
      );
    });
  }, [wfSearch, selectedCategory]);

  // Build Listening Quiz Pool across all 616 TOEIC words
  const listeningQuestions = useMemo<ListeningQuestion[]>(() => {
    void listeningSeed;
    const allPool: Array<{
      vocab: VocabularyItem;
      topicLabel: string;
      categoryId: ToeicCategoryId;
      lessonId: string;
    }> = [];

    TOEIC_TOPICS.forEach((topic) => {
      const lesson = lessonById.get(topic.lessonId);
      if (!lesson) return;
      lesson.vocabulary.forEach((vocab) => {
        allPool.push({
          vocab,
          topicLabel: `${topic.code}. ${topic.titleVi}`,
          categoryId: topic.categoryId,
          lessonId: topic.lessonId,
        });
      });
    });

    let scopedPool = allPool;
    if (listeningScope.startsWith('cat:')) {
      const catId = listeningScope.slice(4);
      scopedPool = allPool.filter((entry) => entry.categoryId === catId);
    } else if (listeningScope.startsWith('topic:')) {
      const lsnId = listeningScope.slice(6);
      scopedPool = allPool.filter((entry) => entry.lessonId === lsnId);
    }

    const picked = shuffleArray(scopedPool).slice(0, 10);

    return picked.map((entry, idx) => {
      const distractors = shuffleArray(
        allPool
          .filter(
            (other) =>
              other.vocab.id !== entry.vocab.id &&
              other.vocab.meaningVi !== entry.vocab.meaningVi
          )
          .map((other) => other.vocab.meaningVi)
      ).slice(0, 3);
      const options = shuffleArray([entry.vocab.meaningVi, ...distractors]);
      return {
        id: `listen_${idx}_${entry.vocab.id}`,
        word: entry.vocab.word,
        ipa: entry.vocab.ipa,
        partOfSpeech: entry.vocab.partOfSpeech,
        topicLabel: entry.topicLabel,
        exampleEn: entry.vocab.exampleEn,
        exampleVi: entry.vocab.exampleVi,
        correctMeaning: entry.vocab.meaningVi,
        options,
        correctIndex: options.indexOf(entry.vocab.meaningVi),
      };
    });
  }, [lessonById, listeningScope, listeningSeed]);

  const handleToggleQuickVocab = async (lesson: LessonDoc, vocab: VocabularyItem) => {
    setSavingVocabId(vocab.id);
    try {
      const alreadyLearned = Boolean(vocabMap[vocab.id]?.isLearned);
      await toggleVocabState(lesson, vocab, { isLearned: !alreadyLearned });
    } catch {
      addToast('error', 'Không thể cập nhật trạng thái từ vựng lúc này.');
    } finally {
      setSavingVocabId(null);
    }
  };

  // Part 5 handlers
  const startPart5Round = useCallback((cat: 'all' | ToeicCategoryId) => {
    const source =
      cat === 'all'
        ? TOEIC_PART5_DRILLS
        : TOEIC_PART5_DRILLS.filter((q) => q.categoryId === cat);
    const count = Math.min(10, source.length);
    setPart5Category(cat);
    setPart5Questions(shuffleArray(source).slice(0, count));
    setPart5Index(0);
    setPart5Selected(null);
    setPart5CorrectCount(0);
    setPart5Finished(false);
    setPart5AwardedGems(0);
  }, []);

  const handleSelectPart5 = (optionIdx: number) => {
    if (part5Selected !== null) return;
    const current = part5Questions[part5Index];
    if (!current) return;
    setPart5Selected(optionIdx);
    if (optionIdx === current.correctIndex) {
      setPart5CorrectCount((c) => c + 1);
    }
    recordStudyActivity();
  };

  const handleNextPart5 = () => {
    if (part5Index + 1 < part5Questions.length) {
      setPart5Index((i) => i + 1);
      setPart5Selected(null);
      return;
    }
    setPart5Finished(true);
    const total = Math.max(1, part5Questions.length);
    const accuracy = Math.round((part5CorrectCount / total) * 100);
    if (accuracy >= 60) {
      const reward = accuracy === 100 ? 28 : accuracy >= 80 ? 22 : 15;
      setPart5AwardedGems(reward);
      awardBonusGems(reward, `Hoàn thành luyện đề TOEIC Part 5 (${accuracy}%)`);
      triggerGemFlight({
        amount: reward,
        lessonCompleted: accuracy >= 80,
        label: 'Thưởng TOEIC Part 5',
      });
    } else {
      setPart5AwardedGems(0);
    }
  };

  // Listening handlers
  const restartListeningRound = useCallback((nextScope: string) => {
    setListeningScope(nextScope);
    setListeningSeed((s) => s + 1);
    setListeningIndex(0);
    setListeningSelected(null);
    setListeningCorrectCount(0);
    setListeningFinished(false);
    setListeningAwardedGems(0);
  }, []);

  const handleSelectListening = (optionIdx: number) => {
    if (listeningSelected !== null) return;
    const current = listeningQuestions[listeningIndex];
    if (!current) return;
    setListeningSelected(optionIdx);
    if (optionIdx === current.correctIndex) {
      setListeningCorrectCount((c) => c + 1);
    }
    recordStudyActivity();
  };

  const handleNextListening = () => {
    if (listeningIndex + 1 < listeningQuestions.length) {
      setListeningIndex((i) => i + 1);
      setListeningSelected(null);
      return;
    }
    setListeningFinished(true);
    const total = Math.max(1, listeningQuestions.length);
    const accuracy = Math.round((listeningCorrectCount / total) * 100);
    if (accuracy >= 60) {
      const reward = accuracy === 100 ? 25 : accuracy >= 80 ? 20 : 15;
      setListeningAwardedGems(reward);
      awardBonusGems(reward, `Hoàn thành luyện nghe từ vựng TOEIC (${accuracy}%)`);
      triggerGemFlight({
        amount: reward,
        lessonCompleted: accuracy >= 80,
        label: 'Thưởng Nghe TOEIC',
      });
    } else {
      setListeningAwardedGems(0);
    }
  };

  const currentPart5 = part5Questions[part5Index];
  const currentListening = listeningQuestions[listeningIndex];

  return (
    <div className="space-y-6">
      {/* TOEIC Cockpit Overview */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid border border-slate-700/80 p-6 sm:p-7 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF8524]">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>TỔNG HỢP 600+ TỪ VỰNG TOEIC THÔNG DỤNG · 44 CHỦ ĐỀ (1 – 44)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Chinh phục 44 Chủ đề TOEIC & Thu thập Ngọc kiến thức
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Đầy đủ 44 chủ đề từ 1. Hợp đồng (Contracts) đến 44. Giao thông (Traffic) với{' '}
              <span className="font-semibold text-white tabular-nums">{toeicStats.totalVocab}</span>{' '}
              từ vựng trọng tâm chuẩn đề thi TOEIC mới nhất, mẫu câu hội thoại, bảng Gia đình từ
              (Word Family), luyện đề Part 5, luyện nghe phản xạ và Nhóm học TOEIC thách đấu thời
              gian thực.
            </p>

            {/* Accent selector & Gem earning summary */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
              <div className="inline-flex items-center gap-1.5 text-amber-300 font-semibold tabular-nums">
                <Gem className="w-3.5 h-3.5 shrink-0" />
                <span>+3 Ngọc/từ thuộc · +91 Ngọc/bài thi · +15–28 Ngọc/phiên luyện đề</span>
              </div>

              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/70 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setAccent('en-US')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    accent === 'en-US'
                      ? 'bg-[#FF6B00] text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Giọng Mỹ (US)
                </button>
                <button
                  type="button"
                  onClick={() => setAccent('en-GB')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    accent === 'en-GB'
                      ? 'bg-[#FF6B00] text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Giọng Anh (UK)
                </button>
              </div>
            </div>
          </div>

          {/* 3 Compact Live Telemetry Stats */}
          <div className="grid grid-cols-3 gap-3 shrink-0 lg:w-[390px]">
            <div className="rounded-xl bg-slate-900/65 border border-slate-700/80 p-3.5">
              <div className="text-[11px] font-medium text-slate-400">Chủ đề đã xong</div>
              <div className="text-xl font-extrabold text-white mt-1 tabular-nums">
                {toeicStats.completedLessons}/{toeicStats.totalLessons}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5 tabular-nums">
                {toeicStats.overallPct}% tiến độ
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/65 border border-slate-700/80 p-3.5">
              <div className="text-[11px] font-medium text-slate-400">Từ TOEIC đã thuộc</div>
              <div className="text-xl font-extrabold text-white mt-1 tabular-nums">
                {toeicStats.learnedVocab}/{toeicStats.totalVocab}
              </div>
              <div className="text-[11px] text-sky-300 mt-0.5">+3 Ngọc / từ</div>
            </div>

            <div className="rounded-xl bg-slate-900/65 border border-amber-500/35 p-3.5">
              <div className="text-[11px] font-medium text-amber-200/80">Ngọc từ TOEIC</div>
              <div className="text-xl font-extrabold text-amber-300 mt-1 tabular-nums">
                {toeicStats.earnedFromToeicLessons.toLocaleString('vi-VN')}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                /{toeicStats.totalLessonGemsAvailable.toLocaleString('vi-VN')}+ Ngọc
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl"
          role="tablist"
          aria-label="Phân khu học TOEIC"
        >
          {[
            { id: 'topics' as const, label: '44 Chủ đề (1–44)', icon: Briefcase },
            { id: 'word_family' as const, label: 'Gia đình từ (Word Family)', icon: Layers },
            { id: 'part5' as const, label: 'Luyện đề Part 5 (+Ngọc)', icon: ClipboardCheck },
            { id: 'listening' as const, label: 'Luyện nghe 600+ từ (+Ngọc)', icon: Headphones },
            { id: 'groups' as const, label: 'Nhóm học TOEIC (+Ngọc)', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {(activeTab === 'topics' || activeTab === 'word_family') && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {activeTab === 'topics' && (
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl">
                {[
                  { id: 'all' as const, label: 'Tất cả' },
                  { id: 'todo' as const, label: 'Chưa xong' },
                  { id: 'done' as const, label: 'Đã xong' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      statusFilter === st.id
                        ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={activeTab === 'topics' ? topicSearch : wfSearch}
                onChange={(e) =>
                  activeTab === 'topics'
                    ? setTopicSearch(e.target.value)
                    : setWfSearch(e.target.value)
                }
                placeholder={
                  activeTab === 'topics'
                    ? 'Tìm chủ đề 1..44 hoặc từ tiếng Anh...'
                    : 'Tìm gốc từ, danh từ, động từ...'
                }
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>
        )}
      </div>

      {/* 8 Thematic Category Filter Strip (shared by Topics & Word Family) */}
      {(activeTab === 'topics' || activeTab === 'word_family') && (
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả 44 chủ đề
            </button>
            {TOEIC_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="font-mono opacity-80 mr-1">{cat.rangeLabel}</span>
                  {cat.titleVi}
                </button>
              );
            })}
          </div>
          {activeTab === 'topics' && (
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Đang hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{filteredTopics.length}</span> / 44 chủ đề TOEIC ({filteredTopics.reduce((s, t) => s + t.wordCount, 0)} từ vựng)
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: 44 CHỦ ĐỀ TOEIC (1 – 44)                                   */}
      {/* ================================================================= */}
      {activeTab === 'topics' && (
        filteredTopics.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Không tìm thấy chủ đề hoặc từ vựng TOEIC nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filteredTopics.map((topic) => {
              const lesson = lessonById.get(topic.lessonId);
              if (!lesson) return null;

              const prog = progressMap[lesson.lessonId];
              const isCompleted = Boolean(prog?.lessonCompleted);
              const bestScore = prog?.quizBestScore ?? 0;
              const learnedCount = lesson.vocabulary.filter((v) => vocabMap[v.id]?.isLearned).length;
              const totalWords = lesson.vocabulary.length;
              const vocabPct = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;
              const lessonGemReward = getLessonGemReward(lesson);
              const isExpanded = Boolean(expandedTopics[topic.id]);
              const visibleVocab = isExpanded ? lesson.vocabulary : lesson.vocabulary.slice(0, 4);
              const catMeta = CATEGORY_MAP.get(topic.categoryId);

              return (
                <article
                  key={topic.id}
                  className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3.5">
                    {/* Top metadata row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
                            {topic.code}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {catMeta?.titleVi}
                          </span>
                          {isCompleted && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đạt {bestScore}%
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {topic.code}. {topic.titleVi}{' '}
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            ({topic.titleEn})
                          </span>
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          <Gem className="w-3.5 h-3.5" />
                          <span>+{lessonGemReward} Ngọc</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          {totalWords} từ · {lesson.quiz.length} câu thi
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {topic.summaryVi}
                    </p>

                    {/* Exam tip */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold text-slate-800 dark:text-slate-100">Mẹo TOEIC: </span>
                      {topic.examTipVi}
                    </div>

                    {/* Vocabulary Preview + Expand to all 14 words */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Từ vựng chủ đề (bấm loa nghe · bấm tick nhận +3 Ngọc)
                        </span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                          {learnedCount}/{totalWords} từ ({vocabPct}%)
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-amber-400 transition-all duration-300"
                          style={{ width: `${vocabPct}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {visibleVocab.map((vocab) => {
                          const isLearned = Boolean(vocabMap[vocab.id]?.isLearned);
                          return (
                            <div
                              key={vocab.id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                                isLearned
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {vocab.word}{' '}
                                  <span className="font-mono font-normal text-[11px] text-slate-500 dark:text-slate-400">
                                    {vocab.ipa}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                  {vocab.meaningVi}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => speakEnglish(vocab.word, { accent })}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF6B00] hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                  aria-label={`Nghe phát âm ${vocab.word}`}
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={savingVocabId === vocab.id}
                                  onClick={() => void handleToggleQuickVocab(lesson, vocab)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isLearned
                                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800'
                                  }`}
                                  title={isLearned ? 'Đã thuộc từ này' : 'Đánh dấu đã thuộc (+3 Ngọc)'}
                                  aria-label={`Đánh dấu đã thuộc ${vocab.word}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {totalWords > 4 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTopics((prev) => ({ ...prev, [topic.id]: !prev[topic.id] }))
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] hover:underline pt-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Thu gọn danh sách từ</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Xem nhanh toàn bộ {totalWords} từ vựng chủ đề {topic.code}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onOpenLesson(lesson.lessonId, 'vocabulary')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Học chi tiết ({totalWords} từ)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenLesson(lesson.lessonId, 'patterns')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-[#FF6B00]/50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                    >
                      <MessageSquareQuote className="w-3.5 h-3.5" />
                      <span>Mẫu câu & Ngữ pháp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenLesson(lesson.lessonId, 'quiz')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ml-auto"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'Thi lại (15 câu)' : 'Thi lấy Ngọc'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {/* ================================================================= */}
      {/* TAB 2: GIA ĐÌNH TỪ (WORD FAMILY — PART 5)                         */}
      {/* ================================================================= */}
      {activeTab === 'word_family' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                24 Gia đình từ (Word Family) xuất hiện dày đặc trong TOEIC Part 5
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Học theo nhóm Danh từ – Động từ – Tính từ – Trạng từ giúp bạn mở rộng vốn từ gấp 3 lần và
                chọn đáp án Part 5 chỉ trong 5 giây.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWfHideAnswers((prev) => !prev);
                setWfRevealedIds({});
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                wfHideAnswers
                  ? 'bg-[#FF6B00] text-white'
                  : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#FF6B00]/50'
              }`}
            >
              {wfHideAnswers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>{wfHideAnswers ? 'Hiện lại toàn bộ từ loại' : 'Chế độ tự kiểm tra (Ẩn đáp án)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredWordFamilies.map((wf) => {
              const catMeta = CATEGORY_MAP.get(wf.categoryId);
              const isRevealed = !wfHideAnswers || Boolean(wfRevealedIds[wf.id]);
              const forms: Array<{ label: string; value?: string }> = [
                { label: 'Danh từ (N)', value: wf.noun },
                { label: 'Động từ (V)', value: wf.verb },
                { label: 'Tính từ (Adj)', value: wf.adjective },
                { label: 'Trạng từ (Adv)', value: wf.adverb },
              ];

              return (
                <article
                  key={wf.id}
                  className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
                        {catMeta ? `${catMeta.rangeLabel} · ${catMeta.titleVi}` : 'TOEIC'}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {wf.rootMeaningVi}
                      </h4>
                    </div>

                    {wfHideAnswers && (
                      <button
                        type="button"
                        onClick={() =>
                          setWfRevealedIds((prev) => ({ ...prev, [wf.id]: !prev[wf.id] }))
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FF6B00] whitespace-nowrap shrink-0"
                      >
                        {isRevealed ? 'Ẩn' : 'Xem đáp án'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {forms.map((f) => {
                      const hasValue = Boolean(f.value && f.value !== '—');
                      const speakTarget = hasValue ? f.value!.split('/')[0].trim() : '';
                      return (
                        <div
                          key={f.label}
                          className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {f.label}
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                              {!hasValue ? '—' : isRevealed ? f.value : '• • • • •'}
                            </div>
                          </div>
                          {hasValue && isRevealed && (
                            <button
                              type="button"
                              onClick={() => speakEnglish(speakTarget, { accent })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF6B00] hover:bg-white dark:hover:bg-slate-800 shrink-0"
                              aria-label={`Nghe phát âm ${speakTarget}`}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pt-1">
                    <p>
                      <span className="font-bold text-slate-800 dark:text-slate-100">Ghi nhớ Part 5: </span>
                      {wf.examTipVi}
                    </p>
                    <div className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 px-3 py-2 border border-slate-200/70 dark:border-slate-800">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {wf.exampleEn}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">{wf.exampleVi}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakEnglish(wf.exampleEn, { accent })}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF6B00] shrink-0"
                        aria-label="Nghe câu ví dụ"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: LUYỆN ĐỀ PART 5 (+NGỌC)                                    */}
      {/* ================================================================= */}
      {activeTab === 'part5' && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Luyện tốc độ TOEIC Part 5 (Incomplete Sentences)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đạt từ 60% trở lên để nhận thưởng +15 đến +28 Ngọc kiến thức bay thẳng vào kho Ngọc.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={part5Category}
                onChange={(e) => startPart5Round(e.target.value as 'all' | ToeicCategoryId)}
                aria-label="Chọn nhóm chủ đề luyện đề Part 5"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="all">Trộn tất cả 8 nhóm chủ đề (10 câu)</option>
                {TOEIC_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.rangeLabel} · {c.titleVi}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => startPart5Round(part5Category)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FF6B00] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đề mới</span>
              </button>
            </div>
          </div>

          {part5Finished ? (
            <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Hoàn thành phiên luyện đề TOEIC Part 5!
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                  Bạn trả lời đúng{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {part5CorrectCount}/{part5Questions.length}
                  </span>{' '}
                  câu ({Math.round((part5CorrectCount / Math.max(1, part5Questions.length)) * 100)}%)
                </p>
              </div>

              {part5AwardedGems > 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-sm font-bold tabular-nums">
                  <Gem className="w-4 h-4" />
                  <span>Đã cộng +{part5AwardedGems} Ngọc vào tài khoản của bạn!</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hãy đạt từ 60% trở lên để mở khóa phần thưởng +15 đến +28 Ngọc nhé!
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startPart5Round(part5Category)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Luyện bộ câu hỏi mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('topics')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FF6B00] whitespace-nowrap shrink-0"
                >
                  <span>Về danh sách 44 chủ đề</span>
                </button>
              </div>
            </div>
          ) : (
            currentPart5 && (
              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-7 space-y-5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-[#D94E00] dark:text-[#FF8524]">
                    {currentPart5.categoryVi}
                  </span>
                  <span className="font-semibold tabular-nums">
                    Câu {part5Index + 1}/{part5Questions.length} · Đúng {part5CorrectCount}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#FF6B00] transition-all duration-300"
                    style={{
                      width: `${Math.round(((part5Index + (part5Selected !== null ? 1 : 0)) / Math.max(1, part5Questions.length)) * 100)}%`,
                    }}
                  />
                </div>

                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentPart5.sentence}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentPart5.options.map((option, idx) => {
                    const isAnswered = part5Selected !== null;
                    const isCorrect = idx === currentPart5.correctIndex;
                    const isPicked = idx === part5Selected;

                    let btnStyle =
                      'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 hover:border-[#FF6B00] text-slate-800 dark:text-slate-100';
                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                      } else if (isPicked) {
                        btnStyle =
                          'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                      } else {
                        btnStyle =
                          'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-400';
                      }
                    }

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelectPart5(idx)}
                        className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-semibold transition-colors ${btnStyle}`}
                      >
                        <span>
                          <span className="font-mono text-xs opacity-70 mr-2">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {option}
                        </span>
                        {isAnswered && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {isAnswered && isPicked && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {part5Selected !== null && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Giải thích chi tiết
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {currentPart5.explanationVi}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakEnglish(currentPart5.completedSentence, { accent })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FF6B00] shrink-0 whitespace-nowrap"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                        <span>Nghe câu đủ</span>
                      </button>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleNextPart5}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>
                          {part5Index + 1 < part5Questions.length
                            ? 'Câu tiếp theo'
                            : 'Xem kết quả & Nhận Ngọc'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: LUYỆN NGHE 600+ TỪ TOEIC (+NGỌC)                           */}
      {/* ================================================================= */}
      {activeTab === 'listening' && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Luyện nghe bắt từ khóa trong 616 từ TOEIC
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chọn toàn bộ 44 chủ đề, theo nhóm hoặc từng chủ đề 1–44. Đạt ≥60% nhận +15 đến +25 Ngọc!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={listeningScope}
                onChange={(e) => restartListeningRound(e.target.value)}
                aria-label="Chọn phạm vi luyện nghe TOEIC"
                className="max-w-[240px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="all">Trộn ngẫu nhiên 616 từ (44 chủ đề)</option>
                <optgroup label="Theo 8 nhóm chủ đề">
                  {TOEIC_CATEGORIES.map((c) => (
                    <option key={c.id} value={`cat:${c.id}`}>
                      Nhóm {c.rangeLabel}: {c.titleVi}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Theo từng chủ đề 1 – 44">
                  {TOEIC_TOPICS.map((t) => (
                    <option key={t.id} value={`topic:${t.lessonId}`}>
                      {t.code}. {t.titleVi} ({t.titleEn})
                    </option>
                  ))}
                </optgroup>
              </select>

              <button
                type="button"
                onClick={() => setListeningSlow((s) => !s)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  listeningSlow
                    ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-950/40 text-[#D94E00] dark:text-[#FF8524]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {listeningSlow ? 'Tốc độ: 0.78x (Chậm)' : 'Tốc độ: 0.95x (Chuẩn)'}
              </button>
            </div>
          </div>

          {listeningFinished ? (
            <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Headphones className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Hoàn thành phiên luyện nghe TOEIC!
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                  Bạn nghe chính xác{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {listeningCorrectCount}/{listeningQuestions.length}
                  </span>{' '}
                  từ khóa (
                  {Math.round((listeningCorrectCount / Math.max(1, listeningQuestions.length)) * 100)}
                  %)
                </p>
              </div>

              {listeningAwardedGems > 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-sm font-bold tabular-nums">
                  <Gem className="w-4 h-4" />
                  <span>Đã thưởng +{listeningAwardedGems} Ngọc kiến thức!</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hãy đạt tối thiểu 60% để nhận thưởng Ngọc kiến thức ở lượt tiếp theo.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => restartListeningRound(listeningScope)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Luyện nghe lượt mới</span>
                </button>
              </div>
            </div>
          ) : (
            currentListening && (
              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-7 space-y-6">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-[#D94E00] dark:text-[#FF8524]">
                    {currentListening.topicLabel} · Giọng {accent === 'en-US' ? 'Mỹ (US)' : 'Anh (UK)'}
                  </span>
                  <span className="font-semibold tabular-nums">
                    Câu {listeningIndex + 1}/{listeningQuestions.length} · Đúng {listeningCorrectCount}
                  </span>
                </div>

                {/* Audio Trigger Area */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center gap-3">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglish(currentListening.word, {
                          accent,
                          rate: listeningSlow ? 0.78 : 0.95,
                        })
                      }
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
                    >
                      <Volume2 className="w-5 h-5" />
                      <span>Nghe từ vựng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        speakEnglish(currentListening.exampleEn, {
                          accent,
                          rate: listeningSlow ? 0.78 : 0.94,
                        })
                      }
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#FF6B00] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                    >
                      <Headphones className="w-4 h-4 text-[#FF6B00]" />
                      <span>Nghe cả câu ngữ cảnh</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bấm nút loa để nghe phát âm, sau đó chọn nghĩa tiếng Việt tương ứng bên dưới.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentListening.options.map((meaning, idx) => {
                    const isAnswered = listeningSelected !== null;
                    const isCorrect = idx === currentListening.correctIndex;
                    const isPicked = idx === listeningSelected;

                    let btnStyle =
                      'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 hover:border-[#FF6B00] text-slate-800 dark:text-slate-100';
                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                      } else if (isPicked) {
                        btnStyle =
                          'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                      } else {
                        btnStyle =
                          'border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-400';
                      }
                    }

                    return (
                      <button
                        key={meaning}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelectListening(idx)}
                        className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-semibold transition-colors ${btnStyle}`}
                      >
                        <span>{meaning}</span>
                        {isAnswered && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {isAnswered && isPicked && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {listeningSelected !== null && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {currentListening.word}
                      </span>
                      <span className="text-xs font-mono text-sky-600 dark:text-sky-400">
                        {currentListening.ipa}
                      </span>
                      <span className="text-xs text-slate-500">({currentListening.partOfSpeech})</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        — {currentListening.correctMeaning}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {currentListening.exampleEn} — {currentListening.exampleVi}
                    </p>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleNextListening}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>
                          {listeningIndex + 1 < listeningQuestions.length
                            ? 'Từ tiếp theo'
                            : 'Hoàn tất & Nhận Ngọc'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5: NHÓM HỌC TOEIC (CHIA SẺ TỪ VỰNG & THÁCH ĐẤU REAL-TIME)     */}
      {/* ================================================================= */}
      {activeTab === 'groups' && (
        <ToeicStudyGroupsPanel
          accent={accent}
          toeicLessons={toeicLessons}
          initialGroupTarget={initialGroupTarget}
        />
      )}
    </div>
  );
}
