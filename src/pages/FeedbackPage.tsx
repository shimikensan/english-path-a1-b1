import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Bug,
  CheckCircle2,
  Clock,
  Layout as LayoutIcon,
  Lightbulb,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isFirestoreQuotaError } from '../firebase';
import { fetchMyFeedback, submitUserFeedback } from '../services/firestoreService';
import type { FeedbackCategory, FeedbackStatus, UserFeedbackDoc } from '../types';
import { playCorrectBeep } from '../utils/cockpitAudio';
import { formatTimestampVi } from '../utils/helpers';

interface CategoryOption {
  id: FeedbackCategory;
  label: string;
  hint: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'bug',
    label: 'Báo lỗi phần mềm',
    hint: 'Lỗi hiển thị, nút bấm, âm thanh hoặc lỗi đồng bộ',
    placeholder:
      'Mô tả chi tiết lỗi bạn gặp phải, các bước dẫn đến lỗi và thiết bị/trình duyệt bạn đang dùng...',
    icon: Bug,
  },
  {
    id: 'content',
    label: 'Dữ liệu & Bài học',
    hint: 'Sai chính tả, phiên âm IPA, nghĩa từ vựng hoặc đáp án quiz',
    placeholder:
      'Ghi rõ tên bài học/cấp độ, từ vựng hoặc câu hỏi cần chỉnh sửa và gợi ý sửa đổi của bạn...',
    icon: BookOpen,
  },
  {
    id: 'feature',
    label: 'Đề xuất tính năng',
    hint: 'Ý tưởng tính năng mới giúp việc học hiệu quả hơn',
    placeholder:
      'Bạn muốn phần mềm có thêm tính năng nào? Tính năng này sẽ giúp ích thế nào trong quá trình học?',
    icon: Lightbulb,
  },
  {
    id: 'ui_ux',
    label: 'Giao diện & Trải nghiệm',
    hint: 'Bố cục, màu sắc, cỡ chữ hoặc thao tác trên điện thoại/máy tính',
    placeholder:
      'Chia sẻ phần giao diện bạn thấy chưa thuận tiện hoặc đề xuất cải thiện trải nghiệm...',
    icon: LayoutIcon,
  },
  {
    id: 'other',
    label: 'Góp ý khác',
    hint: 'Nhận xét chung hoặc các góp ý khác gửi tới Admin',
    placeholder: 'Nhập chia sẻ hoặc góp ý của bạn để đội ngũ phát triển ngày càng hoàn thiện hơn...',
    icon: MessageSquare,
  },
];

const CONTEXT_AREAS = [
  'Trang chủ / Buồng lái',
  'Lộ trình học CEFR (A1–C1)',
  'Tiếng Anh Chuyên ngành (ESP)',
  'Chi tiết bài học (Từ vựng / Mẫu câu / Ngữ pháp)',
  'Kiểm tra trắc nghiệm (Quiz)',
  'Nhắn tin tiếng Anh với AI',
  'Luyện tập & Từ đã lưu',
  'Bảng xếp hạng & Tiến độ',
  'Tài khoản & Cài đặt',
  'Khác / Toàn hệ thống',
];

const RATING_LABELS: Record<number, string> = {
  1: 'Cần cải thiện nhiều',
  2: 'Chưa hài lòng lắm',
  3: 'Bình thường / Khá ổn',
  4: 'Hài lòng',
  5: 'Rất hài lòng!',
};

const STATUS_META: Record<FeedbackStatus, { label: string; badgeClass: string }> = {
  new: {
    label: 'Mới gửi',
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  reviewing: {
    label: 'Admin đang xem xét',
    badgeClass:
      'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  resolved: {
    label: 'Đã tiếp nhận & xử lý',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  closed: {
    label: 'Đã đóng',
    badgeClass:
      'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
  },
};

function getCategoryLabel(cat: FeedbackCategory): string {
  return CATEGORY_OPTIONS.find((c) => c.id === cat)?.label || 'Góp ý khác';
}

export function FeedbackPage() {
  const { profile, addToast } = useApp();

  const [category, setCategory] = useState<FeedbackCategory>('content');
  const [contextPage, setContextPage] = useState<string>(CONTEXT_AREAS[3]);
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [myFeedback, setMyFeedback] = useState<UserFeedbackDoc[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadMyFeedback = useCallback(async () => {
    if (!profile?.uid) return;
    setLoadingHistory(true);
    try {
      const rows = await fetchMyFeedback(profile.uid);
      setMyFeedback(rows);
    } catch (err) {
      addToast(
        'error',
        isFirestoreQuotaError(err)
          ? 'Firestore đang chạm giới hạn lượt đọc hôm nay. Vui lòng thử lại sau.'
          : 'Không thể tải lịch sử góp ý của bạn.'
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [profile?.uid, addToast]);

  useEffect(() => {
    void loadMyFeedback();
  }, [loadMyFeedback]);

  const activeCategoryMeta =
    CATEGORY_OPTIONS.find((c) => c.id === category) || CATEGORY_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (cleanTitle.length < 3) {
      addToast('error', 'Tiêu đề góp ý cần tối thiểu 3 ký tự.');
      return;
    }
    if (cleanContent.length < 5) {
      addToast('error', 'Nội dung chi tiết cần tối thiểu 5 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitUserFeedback(profile, {
        category,
        contextPage,
        title: cleanTitle,
        content: cleanContent,
        rating,
      });
      setMyFeedback((prev) => [created, ...prev]);
      setTitle('');
      setContent('');
      setRating(5);
      playCorrectBeep();
      addToast('success', 'Cảm ơn bạn! Góp ý đã được gửi thành công tới Quản trị viên.');
    } catch (err) {
      const msg =
        err instanceof Error && err.message && !isFirestoreQuotaError(err)
          ? err.message
          : isFirestoreQuotaError(err)
            ? 'Firestore đang tạm quá hạn mức hôm nay. Vui lòng thử lại sau.'
            : 'Không thể gửi góp ý lúc này. Vui lòng thử lại.';
      addToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cockpit Header Banner */}
      <section className="cockpit-radar-panel rounded-2xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
              <MessageSquarePlus className="w-4 h-4" />
              <span>Hộp thư đóng góp ý kiến · Cải thiện hệ thống</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Góp ý cải thiện phần mềm & dữ liệu bài học
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Mọi báo lỗi, phát hiện sai sót về từ vựng/đáp án hay đề xuất tính năng của bạn sẽ được gửi trực tiếp tới bảng điều khiển của Quản trị viên để kịp thời nâng cấp ứng dụng.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                {myFeedback.length} góp ý đã gửi
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Theo dõi phản hồi trực tiếp bên dưới
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Feedback Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              1. Chọn phân loại góp ý
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Giúp Admin phân loại và ưu tiên xử lý nhanh nhất.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
              {CATEGORY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 ring-1 ring-[#FF6B00]/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        selected
                          ? 'bg-[#FF6B00] text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold ${
                          selected
                            ? 'text-[#D94E00] dark:text-[#FF8524]'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {opt.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Context Area */}
            <div>
              <label
                htmlFor="feedback-context"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                2. Khu vực liên quan
              </label>
              <select
                id="feedback-context"
                value={contextPage}
                onChange={(e) => setContextPage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50"
              >
                {CONTEXT_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Star Rating */}
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                3. Mức độ hài lòng hiện tại
              </span>
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] transition-transform hover:scale-110"
                        aria-label={`Đánh giá ${star} sao`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            active
                              ? 'text-[#FF6B00] fill-[#FF6B00]'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {RATING_LABELS[rating]}
                </span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="feedback-title"
                className="text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                4. Tiêu đề ngắn gọn <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {title.length}/120
              </span>
            </div>
            <input
              id="feedback-title"
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Câu số 5 bài A2-03 bị trùng đáp án / Đề xuất thêm flashcards luyện nghe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50"
            />
          </div>

          {/* Detailed Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="feedback-content"
                className="text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                5. Nội dung chi tiết <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {content.length}/2000
              </span>
            </div>
            <textarea
              id="feedback-content"
              rows={5}
              required
              minLength={5}
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={activeCategoryMeta.placeholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50 resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gửi với tài khoản{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {profile?.fullName}
              </span>{' '}
              ({profile?.email})
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-60 text-white text-sm font-bold transition-colors shadow-[0_0_20px_rgba(255,107,0,0.22)] whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Đang gửi góp ý...' : 'Gửi góp ý tới Admin'}
            </button>
          </div>
        </form>

        {/* Right: Learner's Own Feedback History */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Lịch sử góp ý của tôi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật trạng thái xử lý & phản hồi từ Quản trị viên
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadMyFeedback()}
              disabled={loadingHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {loadingHistory && myFeedback.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Đang tải lịch sử góp ý...
            </div>
          ) : myFeedback.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <MessageSquarePlus className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Bạn chưa gửi góp ý nào
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Nếu phát hiện lỗi phần mềm, nội dung bài học chưa chính xác hoặc có ý tưởng mới, hãy gửi ngay ở biểu mẫu bên cạnh nhé!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {myFeedback.map((item) => {
                const statusInfo = STATUS_META[item.status] || STATUS_META.new;
                return (
                  <article
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestampVi(item.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        <Star className="w-3 h-3 fill-current" />
                        {item.rating}/5
                      </span>
                    </div>

                    {item.adminNote && item.adminNote.trim().length > 0 && (
                      <div className="mt-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Phản hồi từ Quản trị viên</span>
                        </div>
                        <p className="text-xs text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed">
                          {item.adminNote}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
