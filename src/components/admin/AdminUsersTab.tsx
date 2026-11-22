import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserX,
  X,
} from 'lucide-react';
import { BOOTSTRAPPED_ADMIN_EMAIL, isFirestoreQuotaError } from '../../firebase';
import {
  adminDeleteUserAccount,
  adminRestoreRevokedUser,
  adminSendUserPasswordResetEmail,
} from '../../services/firestoreService';
import type {
  AdminRecord,
  LeaderboardEntryDoc,
  RevokedUserDoc,
  UserProfile,
} from '../../types';
import { formatTimestampVi } from '../../utils/helpers';

interface AdminUsersTabProps {
  usersList: UserProfile[];
  adminsList: AdminRecord[];
  revokedUsersList: RevokedUserDoc[];
  leaderboard: LeaderboardEntryDoc[];
  currentUserUid?: string;
  currentUserEmail?: string;
  busyUserUid: string | null;
  syncingAllLeaderboard: boolean;
  loadingAdminData: boolean;
  onSyncAllLeaderboards: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onToggleAdminRole: (target: UserProfile, currentlyAdmin: boolean) => void;
  onUserDeleted: (deletedUid: string, revokedRecord: RevokedUserDoc, deletedDocsCount: number) => void;
  onRevokedUserRestored: (restoredUid: string) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'reminder', message: string) => void;
}

type RoleFilter = 'ALL' | 'ADMIN' | 'LEARNER';

export function AdminUsersTab({
  usersList,
  adminsList,
  revokedUsersList,
  leaderboard,
  currentUserUid,
  currentUserEmail,
  busyUserUid,
  syncingAllLeaderboard,
  loadingAdminData,
  onSyncAllLeaderboards,
  onRefresh,
  onToggleAdminRole,
  onUserDeleted,
  onRevokedUserRestored,
  addToast,
}: AdminUsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  // Password reset modal state
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetDoneEmail, setResetDoneEmail] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Delete user modal state
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Restore revoked user modal state
  const [restoreTarget, setRestoreTarget] = useState<RevokedUserDoc | null>(null);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);

  const adminUidSet = useMemo(() => new Set(adminsList.map((a) => a.uid)), [adminsList]);
  const leaderboardByUid = useMemo(() => {
    const map = new Map<string, LeaderboardEntryDoc>();
    leaderboard.forEach((entry) => map.set(entry.uid, entry));
    return map;
  }, [leaderboard]);

  const missingOnLeaderboardCount = useMemo(
    () => usersList.filter((u) => !leaderboardByUid.has(u.uid)).length,
    [usersList, leaderboardByUid]
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return usersList.filter((u) => {
      const isBootstrapped = u.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
      const hasAdminRole = isBootstrapped || adminUidSet.has(u.uid);
      if (roleFilter === 'ADMIN' && !hasAdminRole) return false;
      if (roleFilter === 'LEARNER' && hasAdminRole) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.currentLevel.toLowerCase().includes(q)
      );
    });
  }, [usersList, adminUidSet, searchQuery, roleFilter]);

  const openResetModal = (target: UserProfile) => {
    setResetTarget(target);
    setResetDoneEmail(null);
    setResetError(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetTarget) return;
    setResetSubmitting(true);
    setResetError(null);
    try {
      await adminSendUserPasswordResetEmail(resetTarget.email);
      setResetDoneEmail(resetTarget.email);
      addToast('success', `Đã gửi email đổi mật khẩu tới ${resetTarget.email}.`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.';
      setResetError(msg);
      addToast('error', msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  const openDeleteModal = (target: UserProfile) => {
    setDeleteTarget(target);
    setDeleteReason('');
    setDeleteConfirmEmail('');
    setDeleteError(null);
  };

  const isDeleteEmailMatched = Boolean(
    deleteTarget &&
      deleteConfirmEmail.trim().toLowerCase() === deleteTarget.email.trim().toLowerCase()
  );

  const handleConfirmDeleteUser = async () => {
    if (!deleteTarget || !currentUserUid || !isDeleteEmailMatched) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await adminDeleteUserAccount({
        targetUser: deleteTarget,
        adminUid: currentUserUid,
        adminEmail: currentUserEmail || BOOTSTRAPPED_ADMIN_EMAIL,
        reason: deleteReason,
      });
      onUserDeleted(deleteTarget.uid, res.revokedRecord, res.deletedDocsCount);
      setDeleteTarget(null);
    } catch (err) {
      const msg = isFirestoreQuotaError(err)
        ? 'Firestore đã chạm giới hạn lượt đọc/ghi hôm nay. Chưa thể xóa tài khoản lúc này.'
        : err instanceof Error
          ? err.message
          : 'Không thể xóa tài khoản người dùng. Vui lòng thử lại.';
      setDeleteError(msg);
      addToast('error', msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleConfirmRestoreRevoked = async () => {
    if (!restoreTarget) return;
    setRestoreSubmitting(true);
    try {
      await adminRestoreRevokedUser(restoreTarget.uid);
      onRevokedUserRestored(restoreTarget.uid);
      addToast('success', `Đã mở khóa quyền đăng nhập lại cho ${restoreTarget.email}.`);
      setRestoreTarget(null);
    } catch (err) {
      addToast(
        'error',
        isFirestoreQuotaError(err)
          ? 'Firestore đang tạm quá hạn mức hôm nay. Vui lòng thử lại sau.'
          : 'Không thể gỡ trạng thái khóa tài khoản. Vui lòng thử lại.'
      );
    } finally {
      setRestoreSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ACTIVE USERS MANAGEMENT CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quản lý tài khoản, Mật khẩu & Phân quyền (RBAC)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                Tổng {usersList.length} tài khoản hoạt động · Đã đồng bộ Bảng xếp hạng:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {leaderboard.length}/{usersList.length}
                </strong>
                {missingOnLeaderboardCount > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {' '}
                    (Còn {missingOnLeaderboardCount} tài khoản chưa có trên BXH)
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onSyncAllLeaderboards()}
                disabled={syncingAllLeaderboard || loadingAdminData}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-xs font-semibold text-white transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAllLeaderboard ? 'animate-spin' : ''}`} />
                {syncingAllLeaderboard
                  ? 'Đang đồng bộ BXH...'
                  : `Đồng bộ đủ ${usersList.length} tài khoản lên BXH`}
              </button>
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={loadingAdminData}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminData ? 'animate-spin' : ''}`} />
                Cập nhật
              </button>
            </div>
          </div>

          {/* Search & Role Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo họ tên, email hoặc trình độ (A1–C1)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
              {(
                [
                  { id: 'ALL', label: `Tất cả (${usersList.length})` },
                  { id: 'LEARNER', label: 'Học viên' },
                  { id: 'ADMIN', label: 'Quản trị' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRoleFilter(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    roleFilter === item.id
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Học viên</th>
                <th className="py-3 px-3">Trình độ</th>
                <th className="py-3 px-3">Tiến độ BXH</th>
                <th className="py-3 px-3">Chuỗi học</th>
                <th className="py-3 px-3">Vai trò</th>
                <th className="py-3 px-3">Ngày tham gia</th>
                <th className="py-3 px-4 text-right">Thao tác quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const isBootstrapped =
                  u.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
                const hasAdminRole = isBootstrapped || adminUidSet.has(u.uid);
                const isSelf = currentUserUid === u.uid;
                const canModify = !isBootstrapped && !isSelf;
                const canSendReset = !isBootstrapped || isSelf;
                const lbEntry = leaderboardByUid.get(u.uid);

                return (
                  <tr
                    key={u.uid}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{u.fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    </td>
                    <td className="py-3 px-3 text-xs font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      CEFR {u.currentLevel}
                    </td>
                    <td className="py-3 px-3 text-xs tabular-nums whitespace-nowrap">
                      {lbEntry ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {lbEntry.completionPercent}% ({lbEntry.completedLessons}/{lbEntry.totalLessons}{' '}
                          bài)
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Chưa lên BXH
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {u.streakDays} ngày
                    </td>
                    <td className="py-3 px-3 text-xs font-semibold whitespace-nowrap">
                      {hasAdminRole ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {isBootstrapped ? 'Quản trị gốc' : 'Admin'}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">Học viên</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {formatTimestampVi(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {canSendReset && (
                          <button
                            type="button"
                            disabled={busyUserUid === u.uid}
                            onClick={() => openResetModal(u)}
                            title="Gửi email đổi mật khẩu qua Firebase Authentication"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Đổi mật khẩu
                          </button>
                        )}

                        {canModify ? (
                          <>
                            <button
                              type="button"
                              disabled={busyUserUid === u.uid}
                              onClick={() => onToggleAdminRole(u, hasAdminRole)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ${
                                hasAdminRole
                                  ? 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  : 'border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                              }`}
                            >
                              {hasAdminRole ? (
                                <>
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  Thu hồi Admin
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Cấp Admin
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={busyUserUid === u.uid}
                              onClick={() => openDeleteModal(u)}
                              title="Xóa tài khoản & toàn bộ dữ liệu học tập"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 px-1.5 whitespace-nowrap">
                            {isSelf ? 'Tài khoản hiện tại' : 'Được bảo vệ'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {usersList.length === 0
                      ? 'Chưa có dữ liệu học viên nào trên Firestore.'
                      : 'Không tìm thấy tài khoản nào khớp bộ lọc hiện tại.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVOKED / DELETED ACCOUNTS AUDIT LIST */}
      {revokedUsersList.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Tài khoản đã xóa & thu hồi quyền truy cập ({revokedUsersList.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các tài khoản này đã bị xóa sạch dữ liệu và bị chặn tự động đăng nhập lại bởi Security Rules.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Tài khoản</th>
                  <th className="py-2.5 px-3">Lý do xóa</th>
                  <th className="py-2.5 px-3">Người thực hiện</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-4 text-right">Khôi phục truy cập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {revokedUsersList.map((rev) => (
                  <tr key={rev.uid}>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{rev.fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{rev.email}</p>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                      {rev.reason || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">
                      {rev.revokedByEmail}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {formatTimestampVi(rev.revokedAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setRestoreTarget(rev)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Mở khóa truy cập
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: SEND PASSWORD RESET EMAIL */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Đổi / Đặt lại mật khẩu người dùng
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {resetTarget.fullName} · {resetTarget.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={resetSubmitting}
                onClick={() => setResetTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetDoneEmail ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Đã gửi email đặt lại mật khẩu thành công!</span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  Liên kết đổi mật khẩu bảo mật từ Firebase Authentication đã được gửi đến{' '}
                  <strong className="font-semibold">{resetDoneEmail}</strong>. Người dùng hãy kiểm
                  tra hộp thư (kể cả thư mục Spam) và nhấn vào liên kết để tạo mật khẩu mới.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Hệ thống sẽ gửi <strong>email đặt lại mật khẩu chính thức</strong> qua Firebase
                  Authentication tới địa chỉ{' '}
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {resetTarget.email}
                  </span>
                  .
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p>
                    • Người dùng tự nhập mật khẩu mới qua liên kết bảo mật có thời hạn, không lưu
                    mật khẩu dạng văn bản thô.
                  </p>
                  <p>
                    • Lưu ý: Nếu học viên chỉ đăng nhập bằng <strong>Google</strong>, mật khẩu chính
                    được quản lý tại Google Account.
                  </p>
                </div>
              </div>
            )}

            {resetError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"
              >
                {resetError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={resetSubmitting}
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {resetDoneEmail ? 'Đóng' : 'Hủy'}
              </button>
              {!resetDoneEmail && (
                <button
                  type="button"
                  disabled={resetSubmitting}
                  onClick={() => void handleConfirmResetPassword()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-sm font-semibold text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {resetSubmitting ? 'Đang gửi email...' : 'Gửi email đổi mật khẩu'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STRICT DELETE USER ACCOUNT CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Xóa vĩnh viễn tài khoản người dùng?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {deleteTarget.fullName} · {deleteTarget.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1.5 leading-relaxed">
              <p className="font-bold">Thao tác này sẽ xóa sạch dữ liệu và không thể khôi phục:</p>
              <p>• Hồ sơ tài khoản, quyền quản trị (nếu có) và thứ hạng trên Bảng xếp hạng.</p>
              <p>• Toàn bộ tiến độ bài học, lịch sử điểm kiểm tra, từ vựng đã lưu và góp ý.</p>
              <p>
                • Thu hồi quyền truy cập ứng dụng ngay lập tức (người dùng sẽ bị đăng xuất và không
                thể tự tạo lại hồ sơ cho tới khi Admin mở khóa).
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="delete-user-reason"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Lý do xóa tài khoản (tùy chọn)
                </label>
                <input
                  id="delete-user-reason"
                  type="text"
                  maxLength={250}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ví dụ: Theo yêu cầu người dùng / Tài khoản thử nghiệm..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label
                  htmlFor="delete-user-confirm-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nhập chính xác email{' '}
                  <span className="font-mono text-rose-600 dark:text-rose-400 select-all">
                    {deleteTarget.email}
                  </span>{' '}
                  để xác nhận:
                </label>
                <input
                  id="delete-user-confirm-email"
                  type="email"
                  autoComplete="off"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder={deleteTarget.email}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"
              >
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!isDeleteEmailMatched || deleteSubmitting}
                onClick={() => void handleConfirmDeleteUser()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleteSubmitting ? 'Đang xóa dữ liệu...' : 'Xóa vĩnh viễn tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESTORE REVOKED ACCESS */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Mở khóa truy cập cho {restoreTarget.fullName}?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Email <strong className="text-slate-900 dark:text-white">{restoreTarget.email}</strong>{' '}
              sẽ được gỡ khỏi danh sách thu hồi và có thể đăng nhập lại với hồ sơ học tập mới. Dữ
              liệu cũ đã xóa trước đó sẽ không được khôi phục.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={restoreSubmitting}
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={restoreSubmitting}
                onClick={() => void handleConfirmRestoreRevoked()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-sm font-semibold text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {restoreSubmitting ? 'Đang mở khóa...' : 'Xác nhận mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
