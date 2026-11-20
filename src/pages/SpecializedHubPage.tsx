import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Headphones,
  Image as ImageIcon,
  MessageSquareQuote,
  Radar,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Volume2,
  XCircle,
} from 'lucide-react';
import { VisualVocabDeck } from '../components/specialized/VisualVocabDeck';
import { useApp } from '../context/AppContext';
import {
  ESP_ACRONYMS,
  ESP_SCENARIOS,
  ESP_TRACKS,
  ESP_VISUAL_CARDS,
  type EspTrackId,
} from '../data';
import type { LessonTab, VocabularyItem } from '../types';
import {
  playCardFlipBeep,
  playCorrectBeep,
  playMissionCompleteChime,
  playWrongTone,
} from '../utils/cockpitAudio';
import { shuffleArray } from '../utils/helpers';
import { speakEnglish, type SpeechAccent } from '../utils/speech';

interface SpecializedHubPageProps {
  onOpenLesson: (lessonId: string, tab?: LessonTab) => void;
}

type WorkspaceTab = 'lessons' | 'visual_cards' | 'acronyms' | 'scenarios' | 'listening';

const TRACK_ICONS: Record<EspTrackId, React.ComponentType<{ className?: string }>> = {
  ew_uav: Radar,
  security: ShieldAlert,
  food_testing: FlaskConical,
};

interface ListeningQuestion {
  vocab: VocabularyItem;
  options: VocabularyItem[];
  correctIndex: number;
}

export function SpecializedHubPage({ onOpenLesson }: SpecializedHubPageProps) {
  const { lessons, progressMap, vocabMap } = useApp();
  const [selectedTrackId, setSelectedTrackId] = useState<EspTrackId>('ew_uav');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('lessons');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [accent, setAccent] = useState<SpeechAccent>('en-US');

  // Acronym search & reveal state
  const [acronymSearch, setAcronymSearch] = useState('');
  const [hiddenAcronymMode, setHiddenAcronymMode] = useState(false);
  const [revealedAcronyms, setRevealedAcronyms] = useState<Record<string, boolean>>({});

  // Scenario simulator state
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [selectedScenarioOpt, setSelectedScenarioOpt] = useState<number | null>(null);
  const [scenarioCompletedMap, setScenarioCompletedMap] = useState<Record<string, boolean>>({});

  // Listening drill state
  const [drillSeed, setDrillSeed] = useState(0);
  const [drillIdx, setDrillIdx] = useState(0);
  const [drillSelectedOpt, setDrillSelectedOpt] = useState<number | null>(null);
  const [drillScore, setDrillScore] = useState(0);
  const [drillFinished, setDrillFinished] = useState(false);

  const selectedTrack = useMemo(
    () => ESP_TRACKS.find((t) => t.id === selectedTrackId) || ESP_TRACKS[0],
    [selectedTrackId]
  );

  // Foundation CEFR A1–C1 completion readout & overall ESP progress
  const overviewStats = useMemo(() => {
    const coreLessons = lessons.filter(
      (l) =>
        l.levelId === 'A1' ||
        l.levelId === 'A2' ||
        l.levelId === 'B1' ||
        l.levelId === 'B2' ||
        l.levelId === 'C1'
    );
    const coreCompleted = coreLessons.filter(
      (l) => progressMap[l.lessonId]?.lessonCompleted
    ).length;
    const espLessons = lessons.filter((l) => l.levelId === 'ESP');
    const espCompleted = espLessons.filter(
      (l) => progressMap[l.lessonId]?.lessonCompleted
    ).length;
    const espTotalVocab = espLessons.reduce((sum, l) => sum + l.vocabulary.length, 0);
    const espLearnedVocab = espLessons.reduce(
      (sum, l) => sum + l.vocabulary.filter((v) => vocabMap[v.id]?.isLearned).length,
      0
    );

    return {
      coreCompleted,
      coreTotal: coreLessons.length,
      corePct: coreLessons.length > 0 ? Math.round((coreCompleted / coreLessons.length) * 100) : 0,
      espCompleted,
      espTotal: espLessons.length,
      espPct: espLessons.length > 0 ? Math.round((espCompleted / espLessons.length) * 100) : 0,
      espLearnedVocab,
      espTotalVocab,
    };
  }, [lessons, progressMap, vocabMap]);

  const trackLessons = useMemo(() => {
    const idSet = new Set(selectedTrack.lessonIds);
    return lessons
      .filter((l) => idSet.has(l.lessonId))
      .sort((a, b) => a.order - b.order);
  }, [lessons, selectedTrack]);

  const trackAcronyms = useMemo(() => {
    const q = acronymSearch.trim().toLowerCase();
    return ESP_ACRONYMS.filter((item) => {
      if (item.trackId !== selectedTrackId) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.fullEn.toLowerCase().includes(q) ||
        item.meaningVi.toLowerCase().includes(q)
      );
    });
  }, [selectedTrackId, acronymSearch]);

  const trackScenarios = useMemo(
    () => ESP_SCENARIOS.filter((s) => s.trackId === selectedTrackId),
    [selectedTrackId]
  );

  const trackVocabulary = useMemo<VocabularyItem[]>(() => {
    const items: VocabularyItem[] = [];
    trackLessons.forEach((l) => items.push(...l.vocabulary));
    return items;
  }, [trackLessons]);

  const listeningQuestions = useMemo<ListeningQuestion[]>(() => {
    if (trackVocabulary.length < 4) return [];
    const shuffled = shuffleArray(trackVocabulary).slice(0, 10);
    return shuffled.map((target) => {
      const distractors = shuffleArray(
        trackVocabulary.filter((v) => v.id !== target.id)
      ).slice(0, 3);
      const options = shuffleArray([target, ...distractors]);
      return {
        vocab: target,
        options,
        correctIndex: options.findIndex((o) => o.id === target.id),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackVocabulary, drillSeed]);

  // Reset interactive sub-states when switching specialization track
  useEffect(() => {
    setAcronymSearch('');
    setRevealedAcronyms({});
    setScenarioIdx(0);
    setSelectedScenarioOpt(null);
    setDrillSeed((s) => s + 1);
    setDrillIdx(0);
    setDrillSelectedOpt(null);
    setDrillScore(0);
    setDrillFinished(false);
  }, [selectedTrackId]);

  const activeScenario = trackScenarios[scenarioIdx] || trackScenarios[0];
  const activeDrill = listeningQuestions[drillIdx];

  const handleRestartDrill = () => {
    setDrillSeed((s) => s + 1);
    setDrillIdx(0);
    setDrillSelectedOpt(null);
    setDrillScore(0);
    setDrillFinished(false);
  };

  return (
    <div className="space-y-8">
      {/* Cockpit Specialized Mission Overview */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid cockpit-radar-panel p-6 sm:p-7 text-white">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#FF8524]">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Chặng 6 · Tiếng Anh Chuyên ngành (ESP — Mở rộng sau nền tảng CEFR A1–C1)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
              Huấn luyện tiếng Anh thực chiến theo 3 chuyên ngành trọng yếu
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Thiết kế nối tiếp cùng hệ thống CEFR A1–C1, tập trung vào thuật ngữ kỹ thuật chuẩn quốc tế,
              mẫu câu điều hành – kiểm tra – báo cáo, bộ giải mã từ viết tắt, mô phỏng tình huống thực tế và luyện nghe phản xạ thuật ngữ.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0 sm:min-w-[280px]">
            <div className="rounded-xl bg-slate-900/75 border border-slate-700/80 p-3.5">
              <div className="text-[11px] font-medium text-slate-400">Nền tảng CEFR A1–C1</div>
              <div className="text-xl font-extrabold text-white tabular-nums mt-0.5">
                {overviewStats.coreCompleted}/{overviewStats.coreTotal}
                <span className="text-xs font-semibold text-slate-400 ml-1">bài</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                Đã hoàn thành {overviewStats.corePct}%
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/75 border border-[#FF6B00]/45 p-3.5">
              <div className="text-[11px] font-medium text-[#FF8524]">Tiến độ Chuyên ngành</div>
              <div className="text-xl font-extrabold text-white tabular-nums mt-0.5">
                {overviewStats.espCompleted}/{overviewStats.espTotal}
                <span className="text-xs font-semibold text-slate-400 ml-1">bài</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 tabular-nums">
                {overviewStats.espLearnedVocab}/{overviewStats.espTotalVocab} thuật ngữ đã thuộc
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Specialization Track Selector Cards */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Chọn chuyên ngành huấn luyện
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhấn vào một chuyên ngành bên dưới để mở toàn bộ bài học, từ viết tắt, tình huống thực chiến và luyện nghe.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-xl self-start">
            {(
              [
                { id: 'en-US', label: 'Giọng Mỹ (US)' },
                { id: 'en-GB', label: 'Giọng Anh (UK)' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAccent(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  accent === item.id
                    ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ESP_TRACKS.map((track, idx) => {
            const Icon = TRACK_ICONS[track.id];
            const isSelected = track.id === selectedTrackId;
            const trackLsns = lessons.filter((l) => track.lessonIds.includes(l.lessonId));
            const doneCount = trackLsns.filter((l) => progressMap[l.lessonId]?.lessonCompleted).length;
            const totalTerms = trackLsns.reduce((sum, l) => sum + l.vocabulary.length, 0);
            const learnedTerms = trackLsns.reduce(
              (sum, l) => sum + l.vocabulary.filter((v) => vocabMap[v.id]?.isLearned).length,
              0
            );
            const pct = trackLsns.length > 0 ? Math.round((doneCount / trackLsns.length) * 100) : 0;

            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setSelectedTrackId(track.id)}
                className={`text-left bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive overflow-hidden flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'ring-2 ring-[#FF6B00] shadow-[0_0_24px_rgba(255,107,0,0.22)]'
                    : 'opacity-90 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                    {!failedImages[track.id] ? (
                      <img
                        src={track.bannerImage}
                        alt={track.titleVi}
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImages((prev) => ({ ...prev, [track.id]: true }))}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#0B192C] to-[#1D3557]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-2 text-xs font-mono font-bold text-[#FF9A3C] bg-slate-950/75 border border-[#FF6B00]/45 px-2.5 py-1 rounded-lg">
                      <Icon className="w-3.5 h-3.5" />
                      <span>
                        0{idx + 1} · {track.code}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[11px] font-medium text-slate-300 truncate">{track.titleEn}</p>
                      <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug line-clamp-2">
                        {track.titleVi}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {track.summaryVi}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="text-slate-500 dark:text-slate-400">
                          {doneCount}/{trackLsns.length} bài · {learnedTerms}/{totalTerms} thuật ngữ
                        </span>
                        <span className="font-bold text-[#D94E00] dark:text-[#FF8524]">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold ${
                    isSelected
                      ? 'bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524]'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span>{isSelected ? 'Đang mở chuyên ngành này' : 'Chọn chuyên ngành này'}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Specialization Workspace */}
      <section className="space-y-5">
        {/* Track Summary + 4 Interactive Mode Tabs */}
        <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="text-xs font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
                {selectedTrack.code} · {selectedTrack.titleEn}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {selectedTrack.titleVi}
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                {selectedTrack.focusPoints.map((pt, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 leading-relaxed"
                  >
                    <span className="font-mono font-bold text-[#D94E00] dark:text-[#FF8524] mr-1.5">
                      0{i + 1}.
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5 Interactive Learning Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            {(
              [
                {
                  id: 'lessons',
                  label: `Bài học chuyên ngành (${trackLessons.length})`,
                  icon: BookOpen,
                },
                {
                  id: 'visual_cards',
                  label: `Thẻ từ trực quan (${ESP_VISUAL_CARDS.filter((c) => c.trackId === selectedTrackId).length})`,
                  icon: ImageIcon,
                },
                {
                  id: 'acronyms',
                  label: `Từ viết tắt (${ESP_ACRONYMS.filter((a) => a.trackId === selectedTrackId).length})`,
                  icon: Terminal,
                },
                {
                  id: 'scenarios',
                  label: `Tình huống thực chiến (${trackScenarios.length})`,
                  icon: MessageSquareQuote,
                },
                {
                  id: 'listening',
                  label: 'Luyện nghe thuật ngữ',
                  icon: Headphones,
                },
              ] as const
            ).map((tab) => {
              const TabIcon = tab.icon;
              const active = workspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWorkspaceTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#FF6B00] text-white shadow-[0_0_14px_rgba(255,107,0,0.28)]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: SPECIALIZED LESSONS */}
        {workspaceTab === 'lessons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {trackLessons.map((lesson, idx) => {
              const prog = progressMap[lesson.lessonId];
              const isCompleted = Boolean(prog?.lessonCompleted);
              const bestScore = prog?.quizBestScore ?? 0;
              const learnedCount = lesson.vocabulary.filter((v) => vocabMap[v.id]?.isLearned).length;

              return (
                <article
                  key={lesson.lessonId}
                  className="bg-white dark:bg-slate-900 cockpit-radar-panel cockpit-radar-panel-interactive p-5 sm:p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
                        CHUYÊN ĐỀ 0{idx + 1}
                      </span>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã xong · {bestScore}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          ~{lesson.estimatedMinutes} phút
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                      {lesson.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {lesson.description}
                    </p>

                    {/* Preview 4 key terms */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Thuật ngữ tiêu biểu
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {lesson.vocabulary.slice(0, 4).map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => speakEnglish(v.word, { accent })}
                            title={`${v.word}: ${v.meaningVi} (Nhấn để nghe phát âm)`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6B00]/15 hover:text-[#D94E00] dark:hover:text-[#FF8524] transition-colors font-medium"
                          >
                            <Volume2 className="w-3 h-3 opacity-70" />
                            <span>{v.word}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>
                          Từ vựng: {learnedCount}/{lesson.vocabulary.length}
                        </span>
                        <span>
                          {lesson.sentencePatterns.length} mẫu câu · {lesson.quiz.length} câu thi
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF9A3C] rounded-full transition-all"
                          style={{
                            width: `${Math.round(
                              (learnedCount / Math.max(1, lesson.vocabulary.length)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onOpenLesson(lesson.lessonId, 'vocabulary')}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors"
                    >
                      <span>{isCompleted ? 'Ôn tập lại bài học' : 'Vào học bài đầy đủ'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenLesson(lesson.lessonId, 'patterns')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <MessageSquareQuote className="w-3.5 h-3.5 text-[#FF6B00]" />
                        Mẫu câu
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenLesson(lesson.lessonId, 'quiz')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-[#FF6B00]" />
                        Thi 15 câu
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* TAB 2: VISUAL ILLUSTRATED VOCABULARY CARDS */}
        {workspaceTab === 'visual_cards' && (
          <VisualVocabDeck
            selectedTrackId={selectedTrackId}
            accent={accent}
            onOpenLesson={onOpenLesson}
          />
        )}

        {/* TAB 3: ACRONYMS & CODES DECODER */}
        {workspaceTab === 'acronyms' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={acronymSearch}
                  onChange={(e) => setAcronymSearch(e.target.value)}
                  placeholder="Tra cứu ký hiệu viết tắt (ví dụ: C-UAS, GNSS, ETD, HACCP, COA...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setHiddenAcronymMode((prev) => !prev);
                  setRevealedAcronyms({});
                }}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap ${
                  hiddenAcronymMode
                    ? 'border-[#FF6B00] bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {hiddenAcronymMode ? 'Đang bật chế độ tự kiểm tra (Ẩn nghĩa)' : 'Bật chế độ che nghĩa tự kiểm tra'}
              </button>
            </div>

            {trackAcronyms.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Không tìm thấy từ viết tắt nào khớp với "{acronymSearch}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trackAcronyms.map((item) => {
                  const isVisible = !hiddenAcronymMode || Boolean(revealedAcronyms[item.id]);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (hiddenAcronymMode) {
                          playCardFlipBeep();
                          setRevealedAcronyms((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                        }
                      }}
                      className={`bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col justify-between gap-3 ${
                        hiddenAcronymMode ? 'cursor-pointer hover:border-[#FF6B00]' : ''
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xl font-mono font-extrabold text-[#D94E00] dark:text-[#FF8524] tracking-tight">
                            {item.code}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakEnglish(item.fullEn, { accent });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#D94E00] dark:hover:text-[#FF8524] text-xs font-semibold transition-colors"
                            aria-label={`Nghe đọc ${item.fullEn}`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            Nghe
                          </button>
                        </div>

                        {isVisible ? (
                          <div className="space-y-1.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                              {item.fullEn}
                            </p>
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                              {item.meaningVi}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
                              {item.usageVi}
                            </p>
                          </div>
                        ) : (
                          <div className="py-5 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                            Bạn có nhớ đầy đủ cụm từ tiếng Anh và nghĩa của <strong className="font-mono">{item.code}</strong>? Nhấn thẻ để mở đáp án.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INTERACTIVE FIELD SCENARIO SIMULATOR */}
        {workspaceTab === 'scenarios' && activeScenario && (
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Scenario Step Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {trackScenarios.map((scn, idx) => {
                  const isCurrent = idx === scenarioIdx;
                  const solved = Boolean(scenarioCompletedMap[scn.id]);
                  return (
                    <button
                      key={scn.id}
                      type="button"
                      onClick={() => {
                        setScenarioIdx(idx);
                        setSelectedScenarioOpt(null);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        isCurrent
                          ? 'border-[#FF6B00] bg-[#FF6B00] text-white shadow-[0_0_14px_rgba(255,107,0,0.25)]'
                          : solved
                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {solved && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Tình huống 0{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Đã xử lý đúng:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {trackScenarios.filter((s) => scenarioCompletedMap[s.id]).length}/{trackScenarios.length}
                </strong>
              </span>
            </div>

            {/* Active Scenario Console Card */}
            <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-7 space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
                  MÔ PHỎNG TÌNH HUỐNG THỰC CHIẾN · 0{scenarioIdx + 1}/0{trackScenarios.length}
                </div>
                <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {activeScenario.titleVi}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeScenario.situationVi}
                </p>
              </div>

              {/* Incoming English Prompt Box */}
              <div className="rounded-2xl bg-[#091526] text-white border border-slate-700/80 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-mono font-bold text-[#FF8524]">
                    TÍN HIỆU / LỜI THOẠI ĐẾN · {activeScenario.speakerLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speakEnglish(activeScenario.incomingEn, { accent, rate: 0.94 })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Nghe tình huống
                    </button>
                    <button
                      type="button"
                      onClick={() => speakEnglish(activeScenario.incomingEn, { accent, rate: 0.74 })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 text-xs font-semibold transition-colors"
                    >
                      Nghe chậm
                    </button>
                  </div>
                </div>
                <p className="text-sm sm:text-base font-serif leading-relaxed text-slate-100">
                  "{activeScenario.incomingEn}"
                </p>
              </div>

              {/* 4 Response Options */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Chọn phương án phản hồi tiếng Anh chuyên nghiệp và đúng quy trình nhất:
                </div>
                {activeScenario.options.map((opt, idx) => {
                  const answered = selectedScenarioOpt !== null;
                  const isCorrect = idx === activeScenario.correctIndex;
                  const isPicked = idx === selectedScenarioOpt;

                  let cls =
                    'border-slate-200 dark:border-slate-700 hover:border-[#FF6B00] hover:bg-amber-50/40 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100';
                  if (answered) {
                    if (isCorrect) {
                      cls =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-semibold';
                    } else if (isPicked) {
                      cls =
                        'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200';
                    } else {
                      cls = 'border-slate-200 dark:border-slate-800 opacity-55';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => {
                        setSelectedScenarioOpt(idx);
                        if (idx === activeScenario.correctIndex) {
                          playCorrectBeep();
                          setScenarioCompletedMap((prev) => ({
                            ...prev,
                            [activeScenario.id]: true,
                          }));
                        } else {
                          playWrongTone();
                        }
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm leading-relaxed transition-colors flex items-start justify-between gap-3 ${cls}`}
                    >
                      <span className="flex items-start gap-2.5">
                        <span className="font-mono font-bold text-xs mt-0.5 text-[#D94E00] dark:text-[#FF8524]">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span>{opt}</span>
                      </span>
                      {answered && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      {answered && isPicked && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback & Key Takeaway Phrase */}
              {selectedScenarioOpt !== null && (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div
                      className={`text-sm font-bold ${
                        selectedScenarioOpt === activeScenario.correctIndex
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {selectedScenarioOpt === activeScenario.correctIndex
                        ? 'Xử lý chính xác theo chuẩn nghiệp vụ!'
                        : 'Chưa phù hợp quy trình — hãy xem phân tích bên dưới:'}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeScenario.explanationVi}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#FF6B00]/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
                        CÂU MẪU CẦN NHỚ (KEY PHRASE)
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        "{activeScenario.keyPhraseEn}"
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activeScenario.keyPhraseVi}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(activeScenario.keyPhraseEn, { accent })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524] text-xs font-bold hover:bg-[#FF6B00]/20 transition-colors whitespace-nowrap self-start sm:self-center"
                    >
                      <Volume2 className="w-4 h-4" />
                      Đọc mẫu câu
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedScenarioOpt(null)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Thử lại tình huống này
                    </button>

                    {scenarioIdx + 1 < trackScenarios.length && (
                      <button
                        type="button"
                        onClick={() => {
                          setScenarioIdx((i) => i + 1);
                          setSelectedScenarioOpt(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors"
                      >
                        Tình huống tiếp theo
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LISTENING TERM RECOGNITION DRILL */}
        {workspaceTab === 'listening' && (
          <div className="max-w-2xl mx-auto">
            {drillFinished ? (
              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-8 text-center space-y-5">
                <div className="text-xs font-mono font-bold text-[#D94E00] dark:text-[#FF8524]">
                  HOÀN THÀNH LUYỆN NGHE THUẬT NGỮ · {selectedTrack.code}
                </div>
                <div className="text-5xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {drillScore} / {listeningQuestions.length}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Tỷ lệ nhận diện âm thanh chính xác{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {Math.round((drillScore / Math.max(1, listeningQuestions.length)) * 100)}%
                  </strong>
                  . Nghe lặp lại thuật ngữ giúp phản xạ tức thì qua bộ đàm, tại chốt an ninh và trong phòng thí nghiệm.
                </p>
                <button
                  type="button"
                  onClick={handleRestartDrill}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Luyện nghe vòng mới (10 thuật ngữ ngẫu nhiên)
                </button>
              </div>
            ) : activeDrill ? (
              <div className="bg-white dark:bg-slate-900 cockpit-radar-panel p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    Câu {drillIdx + 1} / {listeningQuestions.length} · {selectedTrack.shortTitleVi}
                  </span>
                  <span>
                    Điểm hiện tại: <strong className="text-slate-900 dark:text-white">{drillScore}</strong>
                  </span>
                </div>

                {/* Audio Trigger Area */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Nhấn nút nghe bên dưới và chọn đúng thuật ngữ tiếng Anh + nghĩa tiếng Việt tương ứng:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => speakEnglish(activeDrill.vocab.word, { accent, rate: 0.94 })}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors shadow-[0_0_20px_rgba(255,107,0,0.28)]"
                    >
                      <Volume2 className="w-5 h-5" />
                      Phát âm thuật ngữ
                    </button>
                    <button
                      type="button"
                      onClick={() => speakEnglish(activeDrill.vocab.word, { accent, rate: 0.72 })}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                    >
                      Nghe tốc độ chậm
                    </button>
                  </div>
                  {drillSelectedOpt !== null && (
                    <div className="pt-2 text-xs font-mono text-[#D94E00] dark:text-[#FF8524]">
                      {activeDrill.vocab.word} · {activeDrill.vocab.ipa}
                    </div>
                  )}
                </div>

                {/* 4 Term Options */}
                <div className="space-y-2.5">
                  {activeDrill.options.map((opt, idx) => {
                    const answered = drillSelectedOpt !== null;
                    const isCorrect = idx === activeDrill.correctIndex;
                    const isPicked = idx === drillSelectedOpt;

                    let cls =
                      'border-slate-200 dark:border-slate-700 hover:border-[#FF6B00] hover:bg-amber-50/40 dark:hover:bg-slate-800';
                    if (answered) {
                      if (isCorrect) {
                        cls =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-semibold';
                      } else if (isPicked) {
                        cls =
                          'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200';
                      } else {
                        cls = 'border-slate-200 dark:border-slate-800 opacity-50';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={answered}
                        onClick={() => {
                          setDrillSelectedOpt(idx);
                          if (idx === activeDrill.correctIndex) {
                            playCorrectBeep();
                            setDrillScore((s) => s + 1);
                          } else {
                            playWrongTone();
                          }
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center justify-between gap-3 ${cls}`}
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{opt.word}</span>
                          <span className="text-slate-500 dark:text-slate-400"> — {opt.meaningVi}</span>
                        </div>
                        {answered && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {answered && isPicked && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {drillSelectedOpt !== null && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Ví dụ:{' '}
                      <span className="font-serif text-slate-900 dark:text-slate-200">
                        {activeDrill.vocab.exampleEn}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (drillIdx + 1 < listeningQuestions.length) {
                          setDrillIdx((i) => i + 1);
                          setDrillSelectedOpt(null);
                        } else {
                          playMissionCompleteChime();
                          setDrillFinished(true);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold whitespace-nowrap self-end sm:self-center"
                    >
                      {drillIdx + 1 < listeningQuestions.length ? 'Thuật ngữ tiếp theo' : 'Xem kết quả'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
