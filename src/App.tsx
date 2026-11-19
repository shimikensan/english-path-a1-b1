/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/ToastContainer';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
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
import { VocabularyHubPage } from './pages/VocabularyHubPage';
import type { AppRoute, LessonTab } from './types';

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'Trang chủ',
  roadmap: 'Lộ trình học CEFR A1–B1',
  vocabulary: 'Kho từ vựng',
  patterns: 'Mẫu câu giao tiếp',
  practice: 'Luyện tập tương tác',
  quizzes: 'Kiểm tra trắc nghiệm',
  saved: 'Từ vựng đã lưu',
  progress: 'Tiến độ học tập',
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4">
          <GraduationCap className="w-6 h-6" />
        </div>
        <p className="text-base font-bold text-slate-900 dark:text-white">ENGLISH PATH A1–B1</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Đang đồng bộ tài khoản và lộ trình học tập từ Firebase...
        </p>
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
      <Layout currentRoute={route} onNavigate={handleNavigate} pageTitle={pageTitle}>
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
            {route === 'account' && <AccountPage />}
            {route === 'lesson' && (
              <LessonDetailPage
                key={`${effectiveLessonId}-${initialLessonTab}`}
                lessonId={effectiveLessonId}
                initialTab={initialLessonTab}
                onBack={() => handleNavigate('roadmap')}
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
