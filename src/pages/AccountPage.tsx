import React, { useEffect, useState } from 'react';
import { KeyRound, LogOut, Moon, Save, ShieldCheck, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PILOT_RANKS } from '../data';
import { formatTimestampVi } from '../utils/helpers';

export function AccountPage() {
  const {
    firebaseUser,
    profile,
    isAdmin,
    updateProfileSettings,
    changeUserPassword,
    signOutUser,
  } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'A2' | 'B1'>(
    profile?.currentLevel || 'A1'
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(profile?.dailyGoalMinutes ?? 20);
  const [reminderEnabled, setReminderEnabled] = useState(profile?.reminderEnabled ?? true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    <div className="max-w-3xl space-y-6">
      {/* Profile Info Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Thông tin tài khoản học tập
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {profile?.email} · Đăng ký: {formatTimestampVi(profile?.createdAt)} · Lần đăng nhập gần nhất:{' '}
              {formatTimestampVi(profile?.lastLogin)}
            </p>
          </div>
          {isAdmin && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Cấp độ tiếng Anh đang theo học
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(['A1', 'A2', 'B1'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setCurrentLevel(lvl)}
                  className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
                    currentLevel === lvl
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>CEFR {lvl}</div>
                  <div className="text-[11px] font-normal opacity-80 mt-0.5">
                    {PILOT_RANKS[lvl]?.rankVi}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Nhắc nhở duy trì việc học hằng ngày
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị thông báo nhẹ trên Trang chủ khi bạn chưa học bài trong ngày.
              </div>
            </div>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>

      {/* Password Management */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
            Giao diện hiển thị & Phiên đăng nhập
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Đang sử dụng chế độ {theme === 'dark' ? 'Tối (Dark Mode)' : 'Sáng (Light Mode)'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
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
