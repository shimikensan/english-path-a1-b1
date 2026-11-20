/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
import { Plane } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { ToastContainer } from './components/ToastContainer';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { APP_BRAND } from './data';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { LessonDetailPage } from './pages/LessonDetailPage';
import { PatternsHubPage } from './pages/PatternsHubPage';
import { PracticePage } from './pages/PracticePage';
import { ProgressPage } from './pages/ProgressPage';
import { QuizzesHubPage } from './pages/QuizzesHubPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SavedWordsPage } from './pages/SavedWordsPage';
import { SpecializedHubPage } from './pages/SpecializedHubPage';
import { VocabularyHubPage } from './pages/VocabularyHubPage';
import type { AppRoute, LessonTab } from './types';

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'Buồng lái · Trang chủ',
  roadmap: 'Đường bay CEFR A1–B1 & Chuyên ngành',
  specialized: 'Tiếng Anh Chuyên ngành (ESP)',
  vocabulary: 'Kho từ vựng',
  patterns: 'Mẫu câu giao tiếp',
  practice: 'Luyện tập tương tác',
  quizzes: 'Kiểm tra trắc nghiệm',
  saved: 'Từ vựng đã lưu',
  progress: 'Tiến độ học tập',
  leaderboard: 'Bảng xếp hạng học viên',
  account: 'Tài khoản cá nhân',
  lesson: 'Chi tiết bài học',
  admin: 'Quản trị hệ thống',
};

function AppShell() {
  const { firebaseUser, authReady, needsEmailVerification, profile, dataLoading, lessons } = useApp();
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [initialLessonTab, setInitialLessonTab] = useState<LessonTab>('vocabulary');

  const handleOpenLesson = useCallback((lessonId: string, tab: LessonTab = 'vocabulary') => {
    setSelectedLessonId(lessonId);
    setInitialLessonTab(tab);
    setRoute('lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigate = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    return (
      <>
        <AuthPage />
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
                onNavigate={handleNavigate}
              />
            )}
            {route === 'roadmap' && (
              <RoadmapPage onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')} />
            )}
            {route === 'specialized' && (
              <SpecializedHubPage onOpenLesson={(id, tab) => handleOpenLesson(id, tab ?? 'vocabulary')} />
            )}
            {route === 'vocabulary' && (
              <VocabularyHubPage onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')} />
            )}
            {route === 'patterns' && (
              <PatternsHubPage onOpenLesson={(id) => handleOpenLesson(id, 'patterns')} />
            )}
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
            {route === 'account' && <AccountPage />}
            {route === 'lesson' && (
              <LessonDetailPage
                key={`${effectiveLessonId}-${initialLessonTab}`}
                lessonId={effectiveLessonId}
                initialTab={initialLessonTab}
                onBack={() =>
                  handleNavigate(activeLesson?.levelId === 'ESP' ? 'specialized' : 'roadmap')
                }
                onOpenLesson={(id) => handleOpenLesson(id, 'vocabulary')}
              />
            )}
            {route === 'admin' && <AdminPage onBackToDashboard={() => handleNavigate('dashboard')} />}
          </motion.div>
        </AnimatePresence>
      </Layout>
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
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
