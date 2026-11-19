import React, { useState } from 'react';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  Compass,
  Dumbbell,
  Flame,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageSquareQuote,
  Moon,
  ShieldCheck,
  Sun,
  UserCircle,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import type { AppRoute } from '../types';

interface LayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  pageTitle: string;
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
  { id: 'vocabulary', label: 'Từ vựng', icon: BookOpen },
  { id: 'patterns', label: 'Mẫu câu', icon: MessageSquareQuote },
  { id: 'practice', label: 'Luyện tập', icon: Dumbbell },
  { id: 'quizzes', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'saved', label: 'Từ đã lưu', icon: BookMarked },
  { id: 'progress', label: 'Tiến độ học tập', icon: BarChart3 },
  { id: 'account', label: 'Tài khoản cá nhân', icon: UserCircle },
];

export function Layout({ currentRoute, onNavigate, pageTitle, children }: LayoutProps) {
  const { profile, isAdmin, signOutUser } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              ENGLISH PATH
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Lộ trình CEFR A1–B1
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
            currentRoute === item.id || (currentRoute === 'lesson' && item.id === 'roadmap');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectRoute(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSelectRoute('admin')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentRoute === 'admin'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-amber-950/30'
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
              {profile?.fullName || 'Học viên'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Trình độ {profile?.currentLevel || 'A1'} · {profile?.streakDays ?? 1} ngày liên tiếp
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
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
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
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Clean Top Bar */}
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

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>{profile?.streakDays ?? 1} ngày</span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                CEFR {profile?.currentLevel || 'A1'}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Tối</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
