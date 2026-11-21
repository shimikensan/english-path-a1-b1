import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Filter,
  MessageSquareText,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isFirestoreQuotaError } from '../../firebase';
import { adminUpdateFeedback } from '../../services/firestoreService';
import type { FeedbackCategory, FeedbackStatus, UserFeedbackDoc } from '../../types';
import { formatTimestampVi } from '../../utils/helpers';

interface AdminFeedbackTabProps {
  feedbackList: UserFeedbackDoc[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onUpdated: (feedbackId: string, status: FeedbackStatus, adminNote: string) => void;
  onRequestDelete: (item: UserFeedbackDoc) => void;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Báo lỗi phần mềm',
  content: 'Dữ liệu & Bài học',
  feature: 'Đề xuất tính năng',
  ui_ux: 'Giao diện & UX',
  other: 'Góp ý khác',
};

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  bug: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  content: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  feature: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  ui_ux: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  other: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Mới gửi',
  reviewing: 'Đang xem xét',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng',
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: 'bg-[#FF6B00]/15 text-[#D94E00] dark:text-[#FF8524] border-[#FF6B00]/40',
  reviewing: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  closed: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
};

interface DraftTriage {
  status: FeedbackStatus;
  adminNote: string;
}

export function AdminFeedbackTab({
  feedbackList,
  loading,
  onRefresh,
  onUpdated,
  onRequestDelete,
}: AdminFeedbackTabProps) {
  const { addToast } = useApp();

  const [statusFilter, setStatusFilter] = useState<'ALL' | FeedbackStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | FeedbackCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftTriage>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    let newCount = 0;
    let reviewingCount = 0;
    let resolvedCount = 0;
    let ratingSum = 0;
    for (const item of feedbackList) {
      if (item.status === 'new') newCount += 1;
      else if (item.status === 'reviewing') reviewingCount += 1;
      else if (item.status === 'resolved') resolvedCount += 1;
      ratingSum += Number(item.rating) || 0;
    }
    const avgRating =
      feedbackList.length > 0 ? (ratingSum / feedbackList.length).toFixed(1) : '—';
    return { newCount, reviewingCount, resolvedCount, avgRating };
  }, [feedbackList]);

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return feedbackList.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.userName.toLowerCase().includes(q) ||
        item.userEmail.toLowerCase().includes(q) ||
        (item.contextPage || '').toLowerCase().includes(q) ||
        (item.adminNote || '').toLowerCase().includes(q)
      );
    });
  }, [feedbackList, statusFilter, categoryFilter, searchTerm]);

  const getDraft = (item: UserFeedbackDoc): DraftTriage => {
    const id = item.id || '';
    return (
      drafts[id] || {
        status: item.status,
        adminNote: item.adminNote || '',
      }
    );
  };

  const updateDraft = (item: UserFeedbackDoc, patch: Partial<DraftTriage>) => {
    const id = item.id || '';
    const current = getDraft(item);
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...current, ...patch },
    }));
  };

  const handleSaveTriage = async (item: UserFeedbackDoc) => {
    const id = item.id;
    if (!id) return;
    const draft = getDraft(item);
    setSavingId(id);
    try {
      await adminUpdateFeedback(id, {
        status: draft.status,
        adminNote: draft.adminNote,
      });
      onUpdated(id, draft.status, draft.adminNote.trim());
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      addToast('success', 'Đã lưu trạng thái & phản hồi góp ý tới học viên.');
    } catch (err) {
      addToast(
        'error',
        isFirestoreQuotaError(err)
          ? 'Firestore đang tạm quá hạn mức hôm nay. Vui lòng thử lại sau.'
          : 'Không thể cập nhật góp ý. Vui lòng kiểm tra quyền quản trị.'
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng góp ý</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {feedbackList.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.resolvedCount} đã giải quyết
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chờ tiếp nhận</p>
          <p className="text-2xl font-extrabold text-[#D94E00] dark:text-[#FF8524] mt-1.5 tabular-nums">
            {stats.newCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cần Admin xem xét
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang xử lý</p>
          <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-1.5 tabular-nums">
            {stats.reviewingCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Đang kiểm tra / sửa đổi
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đánh giá trung bình</p>
          <p className="text-2xl font-extrabold text-amber-500 mt-1.5 tabular-nums flex items-center gap-1.5">
            <Star className="w-5 h-5 fill-current" />
            {stats.avgRating}
            <span className="text-sm font-semibold text-slate-400">/ 5</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mức độ hài lòng học viên
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung, tên hoặc email học viên..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | FeedbackStatus)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            aria-label="Lọc theo trạng thái góp ý"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="new">Mới gửi ({stats.newCount})</option>
            <option value="reviewing">Đang xem xét ({stats.reviewingCount})</option>
            <option value="resolved">Đã giải quyết ({stats.resolvedCount})</option>
            <option value="closed">Đã đóng</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | FeedbackCategory)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            aria-label="Lọc theo phân loại góp ý"
          >
            <option value="ALL">Tất cả phân loại</option>
            {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Feedback Tickets List */}
      {loading && feedbackList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Đang tải danh sách góp ý từ học viên...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <MessageSquareText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {feedbackList.length === 0
              ? 'Chưa có góp ý nào từ người dùng'
              : 'Không có góp ý nào khớp bộ lọc hiện tại'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Khi học viên gửi góp ý ở mục &ldquo;Góp ý cải thiện&rdquo;, thông tin sẽ xuất hiện tại đây để bạn theo dõi và phản hồi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => {
            const id = item.id || '';
            const draft = getDraft(item);
            const hasChanges =
              draft.status !== item.status ||
              draft.adminNote.trim() !== (item.adminNote || '').trim();
            const isSaving = savingId === id;

            return (
              <article
                key={id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${
                          STATUS_COLORS[item.status]
                        }`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${
                          CATEGORY_COLORS[item.category]
                        }`}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      {item.contextPage && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          · {item.contextPage}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {item.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.userName}
                      </span>
                      <span>{item.userEmail}</span>
                      <span>CEFR {item.userLevel}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestampVi(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {item.rating}/5
                    </span>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(item)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 transition-colors"
                      aria-label={`Xóa góp ý ${item.title}`}
                      title="Xóa góp ý này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Learner message body */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {item.content}
                </div>

                {/* Admin triage controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                  <div className="lg:col-span-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Trạng thái xử lý
                    </label>
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        updateDraft(item, { status: e.target.value as FeedbackStatus })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="new">Mới gửi</option>
                      <option value="reviewing">Đang xem xét</option>
                      <option value="resolved">Đã giải quyết</option>
                      <option value="closed">Đã đóng</option>
                    </select>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Phản hồi gửi lại học viên (hiển thị ở Lịch sử góp ý)
                      </label>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {draft.adminNote.length}/1000
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={draft.adminNote}
                      onChange={(e) => updateDraft(item, { adminNote: e.target.value })}
                      placeholder="VD: Cảm ơn bạn đã báo lỗi! Admin đã cập nhật lại đáp án câu 5 trong bài A2-03."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white resize-y"
                    />
                  </div>

                  <div className="lg:col-span-2 lg:pt-5 flex justify-end">
                    <button
                      type="button"
                      disabled={!hasChanges || isSaving}
                      onClick={() => void handleSaveTriage(item)}
                      className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                        hasChanges
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : hasChanges ? (
                        <Save className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {isSaving ? 'Đang lưu...' : hasChanges ? 'Lưu xử lý' : 'Đã lưu'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
