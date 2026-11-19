import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  Plane,
  RefreshCw,
  Sun,
  Trophy,
} from 'lucide-react';
import { LeaderboardPanel } from '../components/LeaderboardPanel';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { APP_BRAND, AUTH_HERO_IMAGE } from '../data';

type AuthMode = 'login' | 'register' | 'reset';

export function AuthPage() {
  const {
    firebaseUser,
    needsEmailVerification,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendResetPasswordEmail,
    resendVerificationEmail,
    refreshVerificationStatus,
    signOutUser,
  } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1'>('A1');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        if (!fullName.trim()) {
          setErrorMsg('Vui lòng nhập họ và tên của bạn.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Mật khẩu cần tối thiểu 6 ký tự.');
          return;
        }
        await signUpWithEmail(fullName, email, password, level);
      } else {
        await sendResetPasswordEmail(email);
        setInfoMsg('Liên kết đặt lại mật khẩu đã được gửi tới email của bạn.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể đăng nhập bằng Google.');
    } finally {
      setSubmitting(false);
    }
  };

  // Dedicated verified-email gate for newly registered email/password users
  if (needsEmailVerification && firebaseUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Xác thực địa chỉ email
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            Chúng tôi đã gửi email xác thực tới{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {firebaseUser.email}
            </span>
            . Vui lòng mở hộp thư và nhấn vào liên kết xác thực để kích hoạt đồng bộ tiến độ trên Cloud Firestore.
          </p>

          <div className="space-y-3">
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await refreshVerificationStatus();
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              Tôi đã xác thực — Vào học ngay
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void resendVerificationEmail()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Gửi lại email xác thực
            </button>

            <button
              type="button"
              onClick={() => void signOutUser()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Quay lại trang đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Minimal 3-zone top bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 lg:px-10 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center ring-1 ring-amber-400/40">
            <Plane className="w-4 h-4" />
          </div>
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            {APP_BRAND.fullName}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <span>3 chặng bay CEFR A1–B1</span>
          <span aria-hidden="true">·</span>
          <span>30 bài học & 450 từ vựng IPA</span>
          <span aria-hidden="true">·</span>
          <span>Đồng bộ Firebase</span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              document.getElementById('public-leaderboard')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300/80 dark:border-amber-700/70 bg-amber-50/70 dark:bg-amber-950/40 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-950/70 transition-colors whitespace-nowrap"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Bảng xếp hạng</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Chế độ sáng</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Chế độ tối</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Split Editorial Auth Layout */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Visual Showcase */}
        <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-blue-950 min-h-[300px] lg:min-h-[580px] flex flex-col justify-end">
          {!imgError ? (
            <img
              src={AUTH_HERO_IMAGE}
              alt="Cậu bé Pilot vui vẻ trong buồng lái máy bay cùng sổ tay học tiếng Anh trên nền trời xanh"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-900 via-blue-900 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/40 to-transparent" />

          <div className="relative z-10 p-6 sm:p-8 text-white space-y-4">
            <p className="text-xs font-semibold text-amber-300 tracking-wide">
              Học tiếng Anh cùng Cậu bé Pilot · Chặng bay CEFR A1 → A2 → B1
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-balance">
              Cất cánh cùng Cậu bé Pilot — Chinh phục tiếng Anh từ A1 đến B1.
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed max-w-lg">
              Mỗi chặng bay gồm 4 phần trọn vẹn: Flashcard phát âm chuẩn IPA, Mẫu câu kèm hội thoại thực tế, Ngữ pháp giải thích dễ hiểu bằng tiếng Việt và Bài kiểm tra 15 câu lưu điểm tự động.
            </p>
            <div className="pt-3 border-t border-white/15 grid grid-cols-3 gap-4 tabular-nums">
              <div>
                <div className="text-xl font-bold text-white">30</div>
                <div className="text-xs text-slate-300">Chặng bài A1–B1</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">450</div>
                <div className="text-xs text-slate-300">Từ vựng & IPA</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">450</div>
                <div className="text-xs text-slate-300">Câu trắc nghiệm</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          {/* Segmented Mode Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đăng ký mới
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'reset'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Quên mật khẩu
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {mode === 'login' && 'Chào mừng trở lại'}
              {mode === 'register' && 'Tạo tài khoản học tập'}
              {mode === 'reset' && 'Khôi phục mật khẩu'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'login' && 'Đăng nhập để đồng bộ lộ trình, từ vựng đã lưu và điểm kiểm tra trên mọi thiết bị.'}
              {mode === 'register' && 'Bắt đầu hành trình chinh phục tiếng Anh từ A1 đến B1 ngay hôm nay.'}
              {mode === 'reset' && 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu từ Firebase.'}
            </p>
          </div>

          {/* Primary Google Sign-In */}
          {mode !== 'reset' && (
            <div className="mb-6">
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                Tiếp tục nhanh bằng Google
              </button>

              <div className="relative my-5 flex items-center">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                <span className="px-3 text-xs text-slate-400 dark:text-slate-500">
                  hoặc bằng Email & mật khẩu
                </span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-700 dark:text-rose-300 leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Họ và tên
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Địa chỉ Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Mật khẩu
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Trình độ xuất phát của bạn
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['A1', 'A2', 'B1'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                        level === lvl
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lvl} · {lvl === 'A1' ? 'Cơ bản' : lvl === 'A2' ? 'Sơ cấp' : 'Trung cấp'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {mode === 'reset' ? (
                <>
                  <KeyRound className="w-4 h-4" />
                  {submitting ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
                </>
              ) : (
                <>
                  {submitting
                    ? 'Đang xử lý...'
                    : mode === 'login'
                      ? 'Đăng nhập ngay'
                      : 'Tạo tài khoản & Bắt đầu học'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Public Live Completion Leaderboard (Accessible Before Sign-In) */}
      <section
        id="public-leaderboard"
        className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12"
      >
        <LeaderboardPanel
          onRequireLogin={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{APP_BRAND.fullName} · Nền tảng học tiếng Anh chuẩn CEFR A1–B1</span>
          <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
            {APP_BRAND.copyright}
          </span>
        </div>
      </footer>
    </div>
  );
}
