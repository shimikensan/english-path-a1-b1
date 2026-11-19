import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { adminSaveSecurityVault } from '../../services/firestoreService';
import type { AdminSecurityVaultDoc } from '../../types';
import { createAdminPasswordRecord, verifyAdminPassword } from '../../utils/adminCrypto';
import { formatTimestampVi } from '../../utils/helpers';

interface AdminSecurityTabProps {
  vault: AdminSecurityVaultDoc | null;
  onVaultUpdated: (nextVault: AdminSecurityVaultDoc) => void;
  onLockNow: () => void;
}

export function AdminSecurityTab({ vault, onVaultUpdated, onLockNow }: AdminSecurityTabProps) {
  const { firebaseUser, addToast } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.email || !vault) return;
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('Mật khẩu quản trị mới cần tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg('Mật khẩu mới nên khác mật khẩu quản trị hiện tại.');
      return;
    }

    setSaving(true);
    try {
      const verified = await verifyAdminPassword(currentPassword, {
        saltHex: vault.saltHex,
        hashHex: vault.hashHex,
        iterations: vault.iterations,
      });

      if (!verified) {
        setErrorMsg('Mật khẩu quản trị hiện tại không chính xác.');
        return;
      }

      const nextRecord = await createAdminPasswordRecord(newPassword);
      const saved = await adminSaveSecurityVault({
        ...nextRecord,
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email,
      });

      onVaultUpdated(saved);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('success', 'Đã cập nhật mật khẩu quản trị thành công!');
    } catch {
      setErrorMsg('Không thể cập nhật mật khẩu quản trị. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Security Overview */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 self-start">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bảo vệ mật khẩu Quản trị
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Khu vực quản trị yêu cầu xác thực 2 lớp: quyền Admin xác minh trên Firestore Security Rules kết hợp mật khẩu quản trị băm PBKDF2-SHA256.
            </p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Thuật toán mã hóa</dt>
            <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {vault?.algorithm || 'PBKDF2-SHA256'}
            </dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Số vòng băm (Iterations)</dt>
            <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {(vault?.iterations ?? 120000).toLocaleString('vi-VN')}
            </dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Tự động khóa phiên</dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-200">30 phút</dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Cập nhật gần nhất</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
              {formatTimestampVi(vault?.updatedAt)}
            </dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Người cập nhật</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[190px]">
              {vault?.updatedByEmail || '—'}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onLockNow}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors"
        >
          <Lock className="w-4 h-4" />
          Khóa phiên Quản trị ngay
        </button>
      </div>

      {/* Right: Change Admin Password Form */}
      <form
        onSubmit={handleChangeAdminPassword}
        className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Đổi mật khẩu Quản trị
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nên thay đổi mật khẩu định kỳ và không dùng chung với mật khẩu đăng nhập email cá nhân.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-700 dark:text-rose-300"
          >
            {errorMsg}
          </div>
        )}

        <div>
          <label
            htmlFor="admin-cur-pass"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Mật khẩu quản trị hiện tại
          </label>
          <input
            id="admin-cur-pass"
            type={showPasswords ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="admin-new-pass"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Mật khẩu quản trị mới (≥ 8 ký tự)
            </label>
            <input
              id="admin-new-pass"
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="admin-confirm-pass"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Xác nhận mật khẩu mới
            </label>
            <input
              id="admin-confirm-pass"
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu quản trị'}
          </button>
        </div>
      </form>
    </div>
  );
}
