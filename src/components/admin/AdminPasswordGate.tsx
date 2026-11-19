import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../../firebase';
import {
  adminGetSecurityVault,
  adminResetSecurityVault,
  adminSaveSecurityVault,
} from '../../services/firestoreService';
import type { AdminSecurityVaultDoc } from '../../types';
import { createAdminPasswordRecord, verifyAdminPassword } from '../../utils/adminCrypto';
import { formatTimestampVi } from '../../utils/helpers';

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

interface AdminPasswordGateProps {
  onUnlocked: (vault: AdminSecurityVaultDoc) => void;
  onBackToDashboard?: () => void;
}

export function AdminPasswordGate({ onUnlocked, onBackToDashboard }: AdminPasswordGateProps) {
  const { firebaseUser, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [vault, setVault] = useState<AdminSecurityVaultDoc | null>(null);

  // Unlock form
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // First-time setup form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Root-admin emergency reset
  const [showResetBox, setShowResetBox] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isRootAdmin =
    Boolean(firebaseUser?.email) &&
    firebaseUser!.email!.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    let active = true;
    const fetchVault = async () => {
      setLoading(true);
      try {
        const docData = await adminGetSecurityVault();
        if (active) setVault(docData);
      } catch {
        if (active) {
          setErrorMsg('Không thể kiểm tra cấu hình bảo mật quản trị từ Firestore.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchVault();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.email) return;
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('Mật khẩu quản trị cần tối thiểu 8 ký tự để đảm bảo an toàn.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }

    setSubmitting(true);
    try {
      const record = await createAdminPasswordRecord(newPassword);
      const saved = await adminSaveSecurityVault({
        ...record,
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email,
      });
      setVault(saved);
      setNewPassword('');
      setConfirmPassword('');
      addToast('success', 'Đã thiết lập mật khẩu quản trị (mã hóa PBKDF2-SHA256) và mở khóa thành công.');
      onUnlocked(saved);
    } catch {
      setErrorMsg('Không thể lưu mật khẩu quản trị lên Firestore. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vault || cooldownLeft > 0) return;
    setErrorMsg(null);

    if (!passwordInput) {
      setErrorMsg('Vui lòng nhập mật khẩu quản trị.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await verifyAdminPassword(passwordInput, {
        saltHex: vault.saltHex,
        hashHex: vault.hashHex,
        iterations: vault.iterations,
      });

      if (ok) {
        setPasswordInput('');
        setFailedAttempts(0);
        addToast('success', 'Xác thực mật khẩu quản trị thành công.');
        onUnlocked(vault);
      } else {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= MAX_FAILED_ATTEMPTS) {
          setCooldownLeft(COOLDOWN_SECONDS);
          setFailedAttempts(0);
          setErrorMsg(
            `Bạn đã nhập sai quá ${MAX_FAILED_ATTEMPTS} lần liên tiếp. Tạm khóa nhập trong ${COOLDOWN_SECONDS} giây.`
          );
        } else {
          setErrorMsg(
            `Mật khẩu quản trị không chính xác (còn ${MAX_FAILED_ATTEMPTS - nextFails} lần thử).`
          );
        }
      }
    } catch {
      setErrorMsg('Không thể xác thực mật khẩu trên trình duyệt hiện tại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRootEmergencyReset = async () => {
    if (!isRootAdmin) return;
    setResetting(true);
    setErrorMsg(null);
    try {
      await adminResetSecurityVault();
      setVault(null);
      setShowResetBox(false);
      setPasswordInput('');
      setFailedAttempts(0);
      setCooldownLeft(0);
      addToast('info', 'Đã xóa mật khẩu quản trị cũ. Vui lòng tạo mật khẩu quản trị mới.');
    } catch {
      setErrorMsg('Không thể đặt lại mật khẩu quản trị. Vui lòng kiểm tra quyền quản trị gốc.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Đang kiểm tra lớp bảo mật Quản trị...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {/* Aviation-styled Security Header */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-sky-900 p-6 text-white space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Lớp bảo vệ cấp 2 · Khu vực Quản trị Admin</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {vault ? 'Nhập mật khẩu Quản trị' : 'Thiết lập mật khẩu Quản trị lần đầu'}
          </h2>
          <p className="text-xs sm:text-sm text-sky-100/85 leading-relaxed">
            {vault
              ? 'Xác thực mật khẩu quản trị riêng để mở khóa quyền chỉnh sửa giáo trình, bài học và danh sách học viên.'
              : 'Để tăng cường bảo mật, hãy tạo mật khẩu quản trị riêng (tối thiểu 8 ký tự). Mật khẩu được băm an toàn bằng PBKDF2-SHA256 kèm salt ngẫu nhiên trước khi lưu lên Firestore.'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!vault ? (
            <form onSubmit={handleSetupPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-setup-pass"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Mật khẩu quản trị mới (tối thiểu 8 ký tự)
                </label>
                <div className="relative">
                  <input
                    id="admin-setup-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mạnh dành riêng cho Admin"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-setup-confirm"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Xác nhận mật khẩu quản trị
                </label>
                <input
                  id="admin-setup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu quản trị"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password Strength Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                  <span>Tối thiểu 8 ký tự</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      /[0-9]/.test(newPassword) && /[A-Za-z]/.test(newPassword)
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                  <span>Nên kết hợp cả chữ cái và chữ số</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      newPassword.length > 0 && newPassword === confirmPassword
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                  <span>Mật khẩu xác nhận trùng khớp</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                {submitting ? 'Đang mã hóa & lưu...' : 'Lưu mật khẩu & Mở khóa Quản trị'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyUnlock} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-unlock-pass"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Mật khẩu Quản trị
                </label>
                <div className="relative">
                  <input
                    id="admin-unlock-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={cooldownLeft > 0 || submitting}
                    autoComplete="current-password"
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu quản trị của bạn"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || cooldownLeft > 0}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                <Unlock className="w-4 h-4" />
                {cooldownLeft > 0
                  ? `Tạm khóa (${cooldownLeft}s)`
                  : submitting
                    ? 'Đang xác thực...'
                    : 'Mở khóa khu vực Quản trị'}
              </button>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <p>
                  Cập nhật lần cuối bởi{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {vault.updatedByEmail}
                  </span>{' '}
                  · {formatTimestampVi(vault.updatedAt)}
                </p>

                {isRootAdmin && !showResetBox && (
                  <button
                    type="button"
                    onClick={() => setShowResetBox(true)}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    Quên mật khẩu quản trị? Đặt lại bằng quyền Quản trị gốc
                  </button>
                )}

                {isRootAdmin && showResetBox && (
                  <div className="mt-2 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-2.5">
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      Tài khoản quản trị gốc ({BOOTSTRAPPED_ADMIN_EMAIL}) có thể xóa mã mật khẩu quản trị cũ để thiết lập mật khẩu mới ngay lập tức.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={resetting}
                        onClick={() => void handleRootEmergencyReset()}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold"
                      >
                        {resetting ? 'Đang đặt lại...' : 'Xác nhận đặt lại mật khẩu'}
                      </button>
                      <button
                        type="button"
                        disabled={resetting}
                        onClick={() => setShowResetBox(false)}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {onBackToDashboard && (
        <div className="text-center">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại Trang chủ
          </button>
        </div>
      )}
    </div>
  );
}
