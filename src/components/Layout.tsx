import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenText,
  ClipboardCheck,
  Compass,
  Dumbbell,
  Flame,
  Focus,
  Home,
  LogOut,
  Maximize2,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  MessageSquareQuote,
  Minimize2,
  Moon,
  Phone,
  Plane,
  Radar,
  ShieldCheck,
  Sun,
  Trophy,
  UserCircle,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { FocusStudyTimer } from './FocusStudyTimer';
import { HudOverlay } from './HudOverlay';
import { PWAInstallButton } from './PWAInstallButton';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { APP_BRAND, PILOT_RANKS } from '../data';
import type { AppRoute } from '../types';
import { useCockpitAudio } from '../utils/cockpitAudio';

interface LayoutProps {
  currentRoute: AppRoute;
  activeLessonLevelId?: string;
  onNavigate: (route: AppRoute) => void;
  pageTitle: string;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  onExitFocusMode?: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Trang chủ', icon: Home },
  { id: 'roadmap', label: 'Lộ trình học', icon: Compass },
  { id: 'specialized', label: 'Chuyên ngành', icon: Radar },
  { id: 'ai-tutor', label: 'Nhắn tin AI', icon: MessageSquare },
  { id: 'english-club', label: 'Câu lạc bộ 3D', icon: Users },
  { id: 'vocabulary', label: 'Từ vựng', icon: BookOpen },
  { id: 'patterns', label: 'Mẫu câu', icon: MessageSquareQuote },
  { id: 'reading', label: 'Đọc hiểu', icon: BookOpenText },
  { id: 'practice', label: 'Luyện tập', icon: Dumbbell },
  { id: 'quizzes', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'saved', label: 'Từ đã lưu', icon: BookMarked },
  { id: 'progress', label: 'Tiến độ học tập', icon: BarChart3 },
  { id: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
  { id: 'feedback', label: 'Góp ý cải thiện', icon: MessageSquarePlus },
  { id: 'account', label: 'Tài khoản cá nhân', icon: UserCircle },
];

export function Layout({
  currentRoute,
  activeLessonLevelId,
  onNavigate,
  pageTitle,
  focusMode = false,
  onToggleFocusMode,
  onExitFocusMode,
  children,
}: LayoutProps) {
  const { profile, isAdmin, signOutUser } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { audioEnabled, toggleAudio } = useCockpitAudio();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (focusMode) {
      setMobileMenuOpen(false);
    }
  }, [focusMode]);

  const handleSelectRoute = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand mark */}
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleSelectRoute('dashboard')}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-lg"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#D94E00] text-white flex items-center justify-center shrink-0 ring-1 ring-[#FF8C2E]/50 shadow-[0_0_16px_rgba(255,107,0,0.28)]">
            <Plane className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              {APP_BRAND.shortName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              A1–C1 & Chuyên ngành
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Đóng thanh điều hướng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Điều hướng chính">
        {MAIN_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            currentRoute === item.id ||
            (currentRoute === 'lesson' &&
              ((activeLessonLevelId === 'ESP' && item.id === 'specialized') ||
                (activeLessonLevelId !== 'ESP' && item.id === 'roadmap')));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectRoute(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#FF6B00]/12 dark:bg-[#FF6B00]/15 text-[#D94E00] dark:text-[#FF8524] font-semibold ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FF6B00] dark:text-[#FF8524]' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {/* Software Author Card directly below "Tài khoản cá nhân" */}
        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 p-3 space-y-2.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
              Tác giả phần mềm
            </div>
            <div className="flex items-start gap-2.5">
              <img
                src="/assets/aistudio/Capture_73767794.JPG"
                alt="Đại úy Nguyễn Văn Biên"
                className="w-12 h-14 rounded-lg object-cover object-top border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs bg-white"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                  Đại úy Nguyễn Văn Biên
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  Đội 1 - Phòng Kỹ thuật bảo vệ - Bộ Tư lệnh Cảnh vệ
                </p>
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-700/70 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-[#FF6B00] dark:text-[#FF8524] shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">SĐT:</span>
              <a
                href="tel:0349007041"
                className="font-semibold text-slate-900 dark:text-white hover:text-[#D94E00] dark:hover:text-[#FF8524] tabular-nums transition-colors"
              >
                0349007041
              </a>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSelectRoute('admin')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentRoute === 'admin'
                  ? 'bg-[#FF6B00]/15 dark:bg-[#FF6B00]/18 text-[#D94E00] dark:text-[#FF8524] font-semibold ring-1 ring-[#FF6B00]/40'
                  : 'text-amber-700 dark:text-[#FF8524] hover:bg-[#FF6B00]/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Quản trị Admin</span>
            </button>
          </div>
        )}
      </nav>

      {/* Bottom learner summary + sign out */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {profile?.fullName || 'Phi công tập sự'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {PILOT_RANKS[profile?.currentLevel || 'A1']?.rankVi || 'Học viên Phi công'} · CEFR{' '}
              {profile?.currentLevel || 'A1'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Đăng xuất
        </button>
        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
          {APP_BRAND.copyright}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar (hidden in Focus Mode) */}
      {!focusMode && (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
          {renderSidebarContent()}
        </aside>
      )}

      {/* Mobile Drawer (hidden in Focus Mode) */}
      {!focusMode && mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 z-50">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 ${focusMode ? '' : 'lg:pl-64'}`}>
        {/* Top Bar: Minimal Focus Header vs Standard Workspace Header */}
        {focusMode ? (
          <header className="sticky top-0 z-20 h-14 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-[#FF6B00]/30 px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Focus className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524] shrink-0" />
              <span className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8524] whitespace-nowrap shrink-0">
                Focus Mode
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate hidden sm:block">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={toggleAudio}
                title={audioEnabled ? 'Tắt tiếng bíp buồng lái' : 'Bật tiếng bíp buồng lái'}
                className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${
                  audioEnabled
                    ? 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524]'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label={audioEnabled ? 'Tắt âm thanh phản hồi buồng lái' : 'Bật âm thanh phản hồi buồng lái'}
                aria-pressed={audioEnabled}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={theme === 'dark' ? 'Chuyển sang chế độ ban ngày' : 'Chuyển sang chế độ buồng lái đêm'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#FF8524]" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {onExitFocusMode && (
                <button
                  type="button"
                  onClick={onExitFocusMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  Thoát tập trung
                </button>
              )}
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-20 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Mở menu điều hướng"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums mr-1">
                <Flame className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524]" />
                <span>{profile?.streakDays ?? 1} ngày bay</span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-[#D94E00] dark:text-[#FF8524]">
                  {PILOT_RANKS[profile?.currentLevel || 'A1']?.rankVi || 'Học viên Phi công'} ({profile?.currentLevel || 'A1'})
                </span>
              </div>

              <PWAInstallButton />

              {onToggleFocusMode && (currentRoute === 'dashboard' || currentRoute === 'lesson') && (
                <button
                  type="button"
                  onClick={onToggleFocusMode}
                  title="Bật chế độ Focus Mode (ẩn thanh điều hướng và mở bài học hiện tại toàn màn hình)"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/15 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Focus Mode</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleAudio}
                title={
                  audioEnabled
                    ? 'Đang bật tiếng bíp buồng lái (nhấn để tắt)'
                    : 'Đang tắt tiếng bíp buồng lái (nhấn để bật)'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                  audioEnabled
                    ? 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/15'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label={audioEnabled ? 'Tắt âm thanh phản hồi buồng lái' : 'Bật âm thanh phản hồi buồng lái'}
                aria-pressed={audioEnabled}
              >
                {audioEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524]" />
                    <span className="hidden sm:inline">Bíp buồng lái</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span className="hidden sm:inline">Tắt bíp</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                aria-label={theme === 'dark' ? 'Chuyển sang chế độ ban ngày' : 'Chuyển sang chế độ buồng lái đêm'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-[#FF8524]" />
                    <span className="hidden sm:inline">Ban ngày</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-700" />
                    <span className="hidden sm:inline">Buồng lái đêm</span>
                  </>
                )}
              </button>
            </div>
          </header>
        )}

        {/* Subtle Cockpit Heads-Up Display (HUD) Overlay */}
        <HudOverlay variant="workspace" />

        {/* Main Workspace Canvas */}
        <main
          className={`relative z-10 flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 ${
            focusMode ? 'max-w-5xl pt-6 sm:pt-8 pb-24' : 'max-w-7xl py-6 sm:py-8'
          }`}
        >
          {children}
        </main>

        {focusMode && (
          <FocusStudyTimer dailyGoalMinutes={profile?.dailyGoalMinutes ?? 20} />
        )}

        {!focusMode && (
          <footer className="relative z-10 border-t border-slate-200/80 dark:border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {APP_BRAND.fullName} · {APP_BRAND.tagline}
              </span>
              <span className="font-mono">{APP_BRAND.copyright}</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
