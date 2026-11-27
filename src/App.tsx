/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, Plane, Volume2, WifiOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DailyChallengesCelebration } from './components/DailyChallengesCelebration';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GemLeaderboardFlight } from './components/GemLeaderboardFlight';
import { Layout } from './components/Layout';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { LevelUpCelebrationModal } from './components/LevelUpCelebrationModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ToastContainer } from './components/ToastContainer';
import {
  ToeicQuickChallengeNotifier,
  type ToeicChallengeNavTarget,
} from './components/ToeicQuickChallengeNotifier';
import { TooltipDictionary } from './components/TooltipDictionary';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { APP_BRAND } from './data';
import { formatTimestampVi } from './utils/helpers';
import { readLastOfflineVocabCache } from './utils/offlineVocabCache';
import { speakEnglish } from './utils/speech';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { AITutorPage } from './pages/AITutorPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { EnglishClubPage } from './pages/EnglishClubPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { LessonDetailPage } from './pages/LessonDetailPage';
import { PatternsHubPage } from './pages/PatternsHubPage';
import { PilotHangarPage } from './pages/PilotHangarPage';
import { PracticePage } from './pages/PracticePage';
import { ProgressPage } from './pages/ProgressPage';
import { QuizzesHubPage } from './pages/QuizzesHubPage';
import { ReadingHubPage } from './pages/ReadingHubPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SavedWordsPage } from './pages/SavedWordsPage';
import { SpecializedHubPage } from './pages/SpecializedHubPage';
import { StoriesPage } from './pages/StoriesPage';
import { ToeicHubPage } from './pages/ToeicHubPage';
import { VocabGamesPage } from './pages/VocabGamesPage';
import { VocabularyHubPage } from './pages/VocabularyHubPage';
import type { AppRoute, LessonTab } from './types';
import {
  buildStudyReminderCopy,
  readLastReminderShownMs,
  REMINDER_CHECK_INTERVAL_MS,
  REMINDER_REPEAT_COOLDOWN_MS,
  STUDY_INACTIVITY_THRESHOLD_MS,
  writeLastReminderShownMs,
} from './utils/studyReminder';

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'Buồng lái · Trang chủ',
  'pilot-hangar': 'Hangar Phi công 3D & Kho Ngọc',
  roadmap: 'Đường bay CEFR A1–C1 & Chuyên ngành',
  specialized: 'Tiếng Anh Chuyên ngành (ESP)',
  toeic: 'Luyện thi Tiếng Anh TOEIC',
  'ai-tutor': 'Nhắn tin tiếng Anh với AI',
  'english-club': 'Câu lạc bộ Tiếng Anh 3D',
  vocabulary: 'Kho từ vựng',
  patterns: 'Mẫu câu giao tiếp',
  reading: 'Đọc hiểu · Thẻ lật song ngữ',
  stories: 'Học tiếng Anh qua truyện',
  games: 'Game học từ vựng',
  practice: 'Luyện tập tương tác',
  quizzes: 'Kiểm tra trắc nghiệm',
  saved: 'Từ vựng đã lưu',
  progress: 'Tiến độ học tập',
  leaderboard: 'Bảng xếp hạng học viên',
  feedback: 'Góp ý & Cải thiện phần mềm',
  account: 'Tài khoản cá nhân',
  lesson: 'Chi tiết bài học',
  admin: 'Quản trị hệ thống',
};

function AppShell() {
  const {
    firebaseUser,
    authReady,
    needsEmailVerification,
    profile,
    dataLoading,
    studyDataHydrated,
    lastStudyAtMs,
    recordStudyActivity,
    lessons,
    progressMap,
    addToast,
  } = useApp();
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const routeRef = useRef<AppRoute>(route);
  routeRef.current = route;
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [initialLessonTab, setInitialLessonTab] = useState<LessonTab>('vocabulary');
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [showOfflineVocabModal, setShowOfflineVocabModal] = useState<boolean>(false);
  const [pendingToeicTarget, setPendingToeicTarget] = useState<ToeicChallengeNavTarget | null>(
    null
  );
  const preFocusRouteRef = useRef<AppRoute>('dashboard');

  // Resolve the learner's current active lesson for instant Focus Mode launch
  const defaultActiveLessonId = useMemo(() => {
    const inProgress = lessons
      .filter((l) => {
        const p = progressMap[l.lessonId];
        return p && !p.lessonCompleted && (p.vocabularyLearned.length > 0 || p.quizAttempts > 0);
      })
      .sort((a, b) => a.order - b.order);

    const target =
      inProgress[0] ||
      lessons.find(
        (l) => l.levelId === (profile?.currentLevel || 'A1') && !progressMap[l.lessonId]?.lessonCompleted
      ) ||
      lessons.find((l) => !progressMap[l.lessonId]?.lessonCompleted) ||
      lessons[0];

    return target?.lessonId || '';
  }, [lessons, progressMap, profile?.currentLevel]);

  const handleOpenLesson = useCallback(
    (lessonId: string, tab: LessonTab = 'vocabulary') => {
      recordStudyActivity();
      setSelectedLessonId(lessonId);
      setInitialLessonTab(tab);
      setRoute('lesson');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [recordStudyActivity]
  );

  const handleEnterFocusMode = useCallback(
    (lessonId?: string, tab: LessonTab = 'vocabulary') => {
      const targetId = lessonId || selectedLessonId || defaultActiveLessonId;
      if (!targetId) return;
      recordStudyActivity();
      preFocusRouteRef.current = route;
      setSelectedLessonId(targetId);
      setInitialLessonTab(tab);
      setRoute('lesson');
      setFocusMode(true);
      addToast('info', 'Đã bật Focus Mode — nhấn Esc hoặc nút "Thoát tập trung" để trở lại.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [selectedLessonId, defaultActiveLessonId, route, addToast, recordStudyActivity]
  );

  const handleExitFocusMode = useCallback(() => {
    setFocusMode(false);
    if (preFocusRouteRef.current === 'dashboard') {
      setRoute('dashboard');
    }
  }, []);

  const handleToggleFocusMode = useCallback(() => {
    if (focusMode) {
      handleExitFocusMode();
    } else {
      handleEnterFocusMode(route === 'lesson' ? selectedLessonId : defaultActiveLessonId);
    }
  }, [focusMode, handleExitFocusMode, handleEnterFocusMode, route, selectedLessonId, defaultActiveLessonId]);

  const handleNavigate = useCallback(
    (nextRoute: AppRoute) => {
      if (
        nextRoute === 'practice' ||
        nextRoute === 'ai-tutor' ||
        nextRoute === 'english-club' ||
        nextRoute === 'reading' ||
        nextRoute === 'stories' ||
        nextRoute === 'games' ||
        nextRoute === 'toeic'
      ) {
        recordStudyActivity();
      }
      setFocusMode(false);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [recordStudyActivity]
  );

  const handleJumpToPractice = useCallback(() => {
    if (defaultActiveLessonId) {
      handleOpenLesson(defaultActiveLessonId, 'vocabulary');
    } else {
      handleNavigate('practice');
    }
  }, [defaultActiveLessonId, handleOpenLesson, handleNavigate]);

  // Periodic Toast reminder when > 24 hours have passed since the learner's last study session
  useEffect(() => {
    if (
      !firebaseUser ||
      !firebaseUser.emailVerified ||
      !studyDataHydrated ||
      !profile ||
      !profile.reminderEnabled ||
      lastStudyAtMs === null
    ) {
      return;
    }

    const activeStudyRoutes: ReadonlySet<AppRoute> = new Set([
      'lesson',
      'practice',
      'ai-tutor',
      'english-club',
      'reading',
      'stories',
      'games',
      'toeic',
    ]);

    const checkAndNotifyInactivity = () => {
      if (document.visibilityState === 'hidden') return;
      if (activeStudyRoutes.has(routeRef.current)) return;

      const now = Date.now();
      const elapsedMs = now - lastStudyAtMs;
      if (elapsedMs < STUDY_INACTIVITY_THRESHOLD_MS) return;

      const lastShownMs = readLastReminderShownMs(profile.uid);
      if (lastShownMs > 0 && now - lastShownMs < REMINDER_REPEAT_COOLDOWN_MS) {
        return;
      }

      const { title, message } = buildStudyReminderCopy({
        elapsedMs,
        streakDays: profile.streakDays ?? 1,
        dailyGoalMinutes: profile.dailyGoalMinutes ?? 20,
      });

      writeLastReminderShownMs(profile.uid, now);
      addToast('reminder', message, {
        title,
        durationMs: 12000,
        action: {
          label: 'Luyện tập ngay',
          onClick: handleJumpToPractice,
        },
      });
    };

    // Slight delay on initial mount so the workspace renders before showing the reminder toast
    const initialTimer = window.setTimeout(checkAndNotifyInactivity, 1200);
    const intervalId = window.setInterval(checkAndNotifyInactivity, REMINDER_CHECK_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotifyInactivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [
    firebaseUser,
    studyDataHydrated,
    profile,
    lastStudyAtMs,
    addToast,
    handleJumpToPractice,
  ]);

  // Allow Esc key to exit Focus Mode swiftly
  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      handleExitFocusMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, handleExitFocusMode]);

  const activeLesson = useMemo(
    () => lessons.find((l) => l.lessonId === selectedLessonId),
    [lessons, selectedLessonId]
  );

  const pageTitle =
    route === 'lesson' && activeLesson
      ? `${activeLesson.levelId} · ${activeLesson.title}`
      : ROUTE_TITLES[route];

  // Initial auth & Firestore hydration screen
  if (!authReady || (firebaseUser && firebaseUser.emailVerified && dataLoading && !profile)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 cockpit-grid flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#D94E00] text-white flex items-center justify-center mb-4 ring-1 ring-[#FF8C2E]/50 shadow-[0_0_24px_rgba(255,107,0,0.32)]">
          <Plane className="w-6 h-6" />
        </div>
        <p className="text-base font-bold text-slate-900 dark:text-white">{APP_BRAND.fullName}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Đang khởi động bảng điều khiển buồng lái và đồng bộ tiến độ từ Firebase...
        </p>
        <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-6">{APP_BRAND.copyright}</p>
      </div>
    );
  }

  // Unauthenticated or unverified email gate
  if (!firebaseUser || needsEmailVerification) {
    const lastCachedSnap = readLastOfflineVocabCache();
    const cachedLearnedWords = lastCachedSnap
      ? Object.values(lastCachedSnap.vocabMap)
          .filter((v) => v.isLearned)
          .sort((a, b) => a.word.localeCompare(b.word))
      : [];

    return (
      <>
        <AuthPage />
        <OfflineIndicator
          showSavedShortcut={cachedLearnedWords.length > 0}
          onOpenSavedWords={() => setShowOfflineVocabModal(true)}
        />
        {showOfflineVocabModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Bộ nhớ đệm ngoại tuyến</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-[#FF6B00]" />
                    Từ vựng đã học ({cachedLearnedWords.length} từ)
                  </h3>
                  {lastCachedSnap?.savedAt && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Đồng bộ lần cuối: {formatTimestampVi(lastCachedSnap.savedAt)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfflineVocabModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Đóng danh sách từ vựng ngoại tuyến"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-4">
                {cachedLearnedWords.map((item) => (
                  <div
                    key={item.vocabularyId}
                    className="py-3 px-2 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.word}
                        </span>
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                          {item.ipa}
                        </span>
                        <span className="text-xs text-slate-500">({item.partOfSpeech})</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          — {item.meaningVi}
                        </span>
                      </div>
                      {item.exampleEn && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.exampleEn} · {item.exampleVi}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(item.word)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 shrink-0"
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
        <ToastContainer />
      </>
    );
  }

  const effectiveLessonId = selectedLessonId || lessons[0]?.lessonId || '';

  return (
    <>
      <Layout
        currentRoute={route}
        activeLessonLevelId={activeLesson?.levelId}
        onNavigate={handleNavigate}
        pageTitle={pageTitle}
        focusMode={focusMode}
        onToggleFocusMode={handleToggleFocusMode}
        onExitFocusMode={handleExitFocusMode}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={route === 'lesson' ? `lesson-${effectiveLessonId}-${initialLessonTab}` : route}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {route === 'dashboard' && (
              <DashboardPage
                onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')}
                onEnterFocusMode={(id) => handleEnterFocusMode(id, 'vocabulary')}
                onNavigate={handleNavigate}
              />
            )}
            {route === 'pilot-hangar' && (
              <PilotHangarPage
                onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')}
                onNavigate={handleNavigate}
              />
            )}
            {route === 'roadmap' && (
              <RoadmapPage onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')} />
            )}
            {route === 'specialized' && (
              <SpecializedHubPage onOpenLesson={(id, tab) => handleOpenLesson(id, tab ?? 'vocabulary')} />
            )}
            {route === 'toeic' && (
              <ToeicHubPage
                onOpenLesson={(id, tab) => handleOpenLesson(id, tab ?? 'vocabulary')}
                initialGroupTarget={pendingToeicTarget}
              />
            )}
            {route === 'ai-tutor' && <AITutorPage />}
            {route === 'english-club' && <EnglishClubPage onNavigate={handleNavigate} />}
            {route === 'vocabulary' && (
              <VocabularyHubPage onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')} />
            )}
            {route === 'patterns' && (
              <PatternsHubPage onOpenLesson={(id) => handleOpenLesson(id, 'patterns')} />
            )}
            {route === 'reading' && <ReadingHubPage />}
            {route === 'stories' && <StoriesPage />}
            {route === 'games' && <VocabGamesPage />}
            {route === 'practice' && <PracticePage />}
            {route === 'quizzes' && (
              <QuizzesHubPage onStartLessonQuiz={(id) => handleOpenLesson(id, 'quiz')} />
            )}
            {route === 'saved' && (
              <SavedWordsPage onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')} />
            )}
            {route === 'progress' && (
              <ProgressPage onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')} />
            )}
            {route === 'leaderboard' && <LeaderboardPanel />}
            {route === 'feedback' && <FeedbackPage />}
            {route === 'account' && <AccountPage onStartPractice={handleJumpToPractice} />}
            {route === 'lesson' && (
              <LessonDetailPage
                key={`${effectiveLessonId}-${initialLessonTab}`}
                lessonId={effectiveLessonId}
                initialTab={initialLessonTab}
                focusMode={focusMode}
                onToggleFocusMode={handleToggleFocusMode}
                onBack={() => {
                  if (focusMode) {
                    handleExitFocusMode();
                  } else {
                    handleNavigate(
                      activeLesson?.levelId === 'ESP'
                        ? 'specialized'
                        : activeLesson?.levelId === 'TOEIC'
                          ? 'toeic'
                          : 'roadmap'
                    );
                  }
                }}
                onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')}
              />
            )}
            {route === 'admin' && <AdminPage onBackToDashboard={() => handleNavigate('dashboard')} />}
          </motion.div>
        </AnimatePresence>
      </Layout>
      <DailyChallengesCelebration />
      <LevelUpCelebrationModal
        onStartNextLevel={(nextLevel) => {
          const firstLesson =
            lessons.find(
              (l) =>
                l.isPublished !== false &&
                l.levelId === nextLevel &&
                !progressMap[l.lessonId]?.lessonCompleted
            ) || lessons.find((l) => l.isPublished !== false && l.levelId === nextLevel);
          if (firstLesson) {
            handleOpenLesson(firstLesson.lessonId, 'vocabulary');
          } else {
            handleNavigate('roadmap');
          }
        }}
        onOpenRoadmap={() => handleNavigate('roadmap')}
      />
      <GemLeaderboardFlight onOpenLeaderboard={() => handleNavigate('leaderboard')} />
      <ToeicQuickChallengeNotifier
        onAcceptChallenge={(groupId, challengeId) => {
          setPendingToeicTarget({ groupId, challengeId, nonce: Date.now() });
          handleNavigate('toeic');
        }}
      />
      <OfflineIndicator
        showSavedShortcut={route !== 'saved'}
        onOpenSavedWords={() => handleNavigate('saved')}
      />
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <AppShell />
          <TooltipDictionary />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
