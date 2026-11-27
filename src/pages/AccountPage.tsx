import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Save,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { LevelBadgeShowcase, LevelBadgeStrip } from '../components/LevelBadgeEmblem';
import { PILOT_RANKS } from '../data';
import { computeLevelBadgeProgress } from '../data/levelBadges';
import type { LearnerCEFRLevel } from '../types';
import {
  buildStudyReportSummary,
  exportStudyReportCsv,
  exportStudyReportPdf,
} from '../utils/exportStudyReport';
import { formatTimestampVi } from '../utils/helpers';
import { buildStudyReminderCopy, STUDY_INACTIVITY_THRESHOLD_MS } from '../utils/studyReminder';

interface AccountPageProps {
  onStartPractice?: () => void;
  onOpenRoadmap?: () => void;
}

export function AccountPage({ onStartPractice, onOpenRoadmap }: AccountPageProps) {
  const {
    firebaseUser,
    profile,
    isAdmin,
    lastStudyAtMs,
    lessons,
    progressMap,
    vocabMap,
    quizResults,
    addToast,
    updateProfileSettings,
    changeUserPassword,
    signOutUser,
  } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [currentLevel, setCurrentLevel] = useState<LearnerCEFRLevel>(
    profile?.currentLevel || 'A1'
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(profile?.dailyGoalMinutes ?? 20);
  const [reminderEnabled, setReminderEnabled] = useState(profile?.reminderEnabled ?? true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Study report export state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'csv' | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const reportSummary = useMemo(
    () =>
      buildStudyReportSummary({
        profile,
        lessons,
        progressMap,
        vocabMap,
        quizResults,
      }),
    [profile, lessons, progressMap, vocabMap, quizResults]
  );

  const badgeProgressItems = useMemo(
    () => computeLevelBadgeProgress({ lessons, progressMap }),
    [lessons, progressMap]
  );

  const earnedBadges = useMemo(
    () => badgeProgressItems.filter((item) => item.earned).map((item) => item.badge),
    [badgeProgressItems]
  );

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [exportMenuOpen]);

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    setExportMenuOpen(false);
    setExportingFormat(format);
    try {
      const payload = { profile, lessons, progressMap, vocabMap, quizResults };
      if (format === 'csv') {
        const res = exportStudyReportCsv(payload);
        addToast(
          'success',
          `Đã tải báo cáo CSV (${res.learnedVocabCount} từ vựng đã học, ${res.quizAttemptsCount} bài trắc nghiệm).`
        );
      } else {
        const res = await exportStudyReportPdf(payload);
        addToast(
          'success',
          `Đã tải báo cáo PDF (${res.learnedVocabCount} từ vựng đã học, ${res.quizAttemptsCount} bài trắc nghiệm).`
        );
      }
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Không thể xuất báo cáo học tập. Vui lòng thử lại.'
      );
    } finally {
      setExportingFormat(null);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setCurrentLevel(profile.currentLevel);
      setDailyGoalMinutes(profile.dailyGoalMinutes);
      setReminderEnabled(profile.reminderEnabled);
    }
  }, [profile]);

  const hasPasswordProvider = Boolean(
    firebaseUser?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfileSettings({
        fullName,
        currentLevel,
        dailyGoalMinutes,
        reminderEnabled,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới cần tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    setSavingPassword(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Không thể đổi mật khẩu.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* CEFR Milestone Badges Showcase */}
      <LevelBadgeShowcase items={badgeProgressItems} onStartRoadmap={onOpenRoadmap} />

      {/* Profile Info Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Thông tin tài khoản học tập
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile?.email} · Đăng ký: {formatTimestampVi(profile?.createdAt)} · Lần đăng nhập gần nhất:{' '}
              {formatTimestampVi(profile?.lastLogin)}
            </p>
            {earnedBadges.length > 0 && (
              <div className="pt-1">
                <LevelBadgeStrip badges={earnedBadges} size="sm" showHighestTitle />
              </div>
            )}
          </div>
          {isAdmin && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
              Quản trị viên
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="acc-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Họ và tên hiển thị
              </label>
              <input
                id="acc-name"
                type="text"
                required
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div>
              <label
                htmlFor="acc-goal"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Mục tiêu học mỗi ngày (phút)
              </label>
              <input
                id="acc-goal"
                type="number"
                min={5}
                max={240}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(Number(e.target.value) || 20)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] tabular-nums"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Cấp độ tiếng Anh đang theo học
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setCurrentLevel(lvl)}
                  className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
                    currentLevel === lvl
                      ? 'border-[#FF6B00] bg-[#FF6B00]/12 dark:bg-[#FF6B00]/15 text-[#D94E00] dark:text-[#FF8524]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>CEFR {lvl}</div>
                  <div className="text-[11px] font-normal opacity-80 mt-0.5 truncate">
                    {PILOT_RANKS[lvl]?.rankVi}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524]" />
                  <span>Nhắc nhở định kỳ quay lại luyện tập (sau 24 giờ)</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Tự động hiển thị thông báo Toast định kỳ nhắc bạn quay lại luyện tập nếu đã quá 24 giờ kể từ phiên học cuối cùng, đồng thời hiện nhắc nhẹ trên Trang chủ.
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#FF6B00] shrink-0"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Phiên học cuối cùng:{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                  {lastStudyAtMs ? formatTimestampVi(new Date(lastStudyAtMs)) : 'Chưa ghi nhận'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  const elapsedMs = lastStudyAtMs
                    ? Math.max(STUDY_INACTIVITY_THRESHOLD_MS, Date.now() - lastStudyAtMs)
                    : STUDY_INACTIVITY_THRESHOLD_MS;
                  const { title, message } = buildStudyReminderCopy({
                    elapsedMs,
                    streakDays: profile?.streakDays ?? 1,
                    dailyGoalMinutes: dailyGoalMinutes || 20,
                  });
                  addToast('reminder', message, {
                    title,
                    durationMs: 12000,
                    action: onStartPractice
                      ? { label: 'Luyện tập ngay', onClick: onStartPractice }
                      : undefined,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/15 font-semibold transition-colors"
              >
                <BellRing className="w-3.5 h-3.5" />
                Xem thử thông báo nhắc học
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#FF7E1F] transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>

      {/* Study Data Export Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524]" />
              Báo cáo &amp; Xuất dữ liệu học tập
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tải xuống báo cáo chi tiết tiến độ cá nhân gồm danh sách từ vựng đã học, phiên âm IPA, lịch sử điểm trắc nghiệm và tiến độ từng bài học.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 tabular-nums">
              <strong className="font-semibold text-slate-900 dark:text-white">
                {reportSummary.learnedVocabCount}
              </strong>{' '}
              từ vựng đã học ·{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {reportSummary.quizAttemptsCount}
              </strong>{' '}
              lượt trắc nghiệm
              {reportSummary.quizAttemptsCount > 0 && (
                <> (TB {reportSummary.averageQuizScore}%)</>
              )}{' '}
              ·{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {reportSummary.completedLessons}/{reportSummary.totalLessons}
              </strong>{' '}
              bài học hoàn thành
            </p>
          </div>

          <div ref={exportMenuRef} className="relative shrink-0">
            <button
              type="button"
              disabled={exportingFormat !== null}
              onClick={() => setExportMenuOpen((prev) => !prev)}
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#FF7E1F] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {exportingFormat ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {exportingFormat === 'pdf'
                  ? 'Đang tạo PDF...'
                  : exportingFormat === 'csv'
                    ? 'Đang tạo CSV...'
                    : 'Xuất dữ liệu học tập'}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  exportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {exportMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5 z-30"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExportReport('pdf')}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Tải báo cáo PDF (.pdf)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Định dạng A4 trình bày đẹp, hỗ trợ tiếng Việt &amp; IPA
                    </div>
                  </div>
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleExportReport('csv')}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Tải bảng dữ liệu CSV (.csv)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mở trực tiếp bằng Excel hoặc Google Sheets (UTF-8)
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Password Management */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#FF6B00] dark:text-[#FF8524]" />
          Đổi mật khẩu tài khoản
        </h3>

        {!hasPasswordProvider ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Tài khoản của bạn đang đăng nhập qua <strong>Google Authentication</strong>, nên mật khẩu được bảo vệ trực tiếp bởi tài khoản Google của bạn.
          </p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {passwordError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mật khẩu hiện tại"
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mật khẩu mới (≥6 ký tự)"
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {savingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        )}
      </section>

      {/* Appearance & Sign out */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Giao diện Buồng lái & Phiên đăng nhập
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Đang sử dụng chế độ {theme === 'dark' ? 'Buồng lái Đêm (Navy · Steel · Neon Orange)' : 'Ban ngày (Cockpit Daylight)'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FF8524]" /> : <Moon className="w-4 h-4 text-slate-700" />}
            Đổi giao diện
          </button>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </section>
    </div>
  );
}
