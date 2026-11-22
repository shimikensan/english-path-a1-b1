import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Database,
  Edit3,
  Eye,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_READING_PASSAGES, READING_CATEGORIES } from '../../data';
import { isFirestoreQuotaError } from '../../firebase';
import {
  adminSaveReadingPassage,
  seedReadingPassagesToFirestore,
} from '../../services/firestoreService';
import type { LearnerCEFRLevel, ReadingPassageDoc } from '../../types';
import { sanitizeId } from '../../utils/helpers';

interface AdminReadingTabProps {
  passages: ReadingPassageDoc[];
  isSeeded: boolean;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onRequestDelete: (passage: ReadingPassageDoc) => void;
}

const LEVELS: LearnerCEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

function createEmptyPassage(nextOrder: number): ReadingPassageDoc {
  return {
    passageId: `read_${Date.now().toString(36)}`,
    titleEn: '',
    titleVi: '',
    levelId: 'B1',
    category: READING_CATEGORIES[0],
    contentEn: '',
    contentVi: '',
    keyPhrases: [{ phrase: '', meaningVi: '' }],
    estimatedMinutes: 3,
    order: nextOrder,
    isPublished: true,
  };
}

export function AdminReadingTab({
  passages,
  isSeeded,
  loading,
  onRefresh,
  onRequestDelete,
}: AdminReadingTabProps) {
  const { addToast } = useApp();

  const [levelFilter, setLevelFilter] = useState<'ALL' | LearnerCEFRLevel>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ written: number; total: number } | null>(null);

  const ADMIN_PAGE_SIZE = 20;

  // Modal Editor state
  const [editingPassage, setEditingPassage] = useState<ReadingPassageDoc | null>(null);
  const [isNewPassage, setIsNewPassage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewSide, setPreviewSide] = useState<'edit' | 'front' | 'back'>('edit');

  const categories = useMemo(() => {
    const set = new Set<string>(READING_CATEGORIES);
    passages.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [passages]);

  const filteredPassages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return passages.filter((p) => {
      if (levelFilter !== 'ALL' && p.levelId !== levelFilter) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.titleEn.toLowerCase().includes(q) ||
        p.titleVi.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.passageId.toLowerCase().includes(q)
      );
    });
  }, [passages, levelFilter, categoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPassages.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedPassages = useMemo(() => {
    const start = (safePage - 1) * ADMIN_PAGE_SIZE;
    return filteredPassages.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filteredPassages, safePage]);

  useEffect(() => {
    setPage(1);
  }, [levelFilter, categoryFilter, searchQuery]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    setSeedProgress(null);
    try {
      const res = await seedReadingPassagesToFirestore((written, total) => {
        setSeedProgress({ written, total });
      });
      await onRefresh();
      addToast(
        'success',
        res.createdCount > 0
          ? `Đã đồng bộ thêm ${res.createdCount} bài đọc mẫu lên Firestore (tổng ${res.totalCount} bài).`
          : `Toàn bộ ${res.totalCount} bài đọc mẫu đã có sẵn trên Firestore.`
      );
    } catch (err) {
      addToast(
        'error',
        isFirestoreQuotaError(err)
          ? 'Firestore đang tạm quá hạn mức hôm nay. Vui lòng thử lại sau.'
          : 'Không thể đồng bộ bài đọc mẫu lên Firestore.'
      );
    } finally {
      setSeeding(false);
      setSeedProgress(null);
    }
  };

  const openCreateModal = () => {
    setIsNewPassage(true);
    setPreviewSide('edit');
    setEditingPassage(createEmptyPassage(passages.length + 1));
  };

  const openEditModal = (passage: ReadingPassageDoc) => {
    setIsNewPassage(false);
    setPreviewSide('edit');
    setEditingPassage({
      ...passage,
      keyPhrases: passage.keyPhrases?.length
        ? passage.keyPhrases.map((kp) => ({ ...kp }))
        : [],
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPassage) return;

    const cleanTitleEn = editingPassage.titleEn.trim();
    const cleanTitleVi = editingPassage.titleVi.trim();
    const cleanContentEn = editingPassage.contentEn.trim();
    const cleanContentVi = editingPassage.contentVi.trim();

    if (!cleanTitleEn || !cleanTitleVi) {
      addToast('error', 'Vui lòng nhập đầy đủ tiêu đề tiếng Anh và tiêu đề tiếng Việt.');
      return;
    }
    if (cleanContentEn.length < 10 || cleanContentVi.length < 10) {
      addToast('error', 'Nội dung tiếng Anh và bản dịch tiếng Việt cần tối thiểu 10 ký tự.');
      return;
    }

    setSaving(true);
    try {
      const safeId = isNewPassage
        ? sanitizeId(editingPassage.passageId || `read_${cleanTitleEn}`, 80)
        : editingPassage.passageId;

      await adminSaveReadingPassage(
        {
          ...editingPassage,
          passageId: safeId,
          titleEn: cleanTitleEn,
          titleVi: cleanTitleVi,
          contentEn: cleanContentEn,
          contentVi: cleanContentVi,
        },
        isNewPassage
      );
      await onRefresh();
      addToast(
        'success',
        isNewPassage
          ? `Đã thêm bài đọc "${cleanTitleEn}" lên Firestore!`
          : `Đã cập nhật bài đọc "${cleanTitleEn}"!`
      );
      setEditingPassage(null);
    } catch (err) {
      const msg =
        err instanceof Error && err.message && !isFirestoreQuotaError(err)
          ? err.message
          : isFirestoreQuotaError(err)
            ? 'Firestore đang tạm quá hạn mức hôm nay. Vui lòng thử lại sau.'
            : 'Không thể lưu bài đọc. Vui lòng kiểm tra lại dữ liệu.';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const updateKeyPhrase = (index: number, patch: { phrase?: string; meaningVi?: string }) => {
    if (!editingPassage) return;
    const next = [...editingPassage.keyPhrases];
    next[index] = { ...next[index], ...patch };
    setEditingPassage({ ...editingPassage, keyPhrases: next });
  };

  const addKeyPhrase = () => {
    if (!editingPassage || editingPassage.keyPhrases.length >= 12) return;
    setEditingPassage({
      ...editingPassage,
      keyPhrases: [...editingPassage.keyPhrases, { phrase: '', meaningVi: '' }],
    });
  };

  const removeKeyPhrase = (index: number) => {
    if (!editingPassage) return;
    setEditingPassage({
      ...editingPassage,
      keyPhrases: editingPassage.keyPhrases.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpenText className="w-4 h-4 text-[#FF6B00]" />
              Quản lý mục Đọc hiểu song ngữ (Flashcard)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isSeeded
                ? `Đang đồng bộ trực tiếp với Cloud Firestore (${passages.length} bài đọc). Mọi thay đổi sẽ hiển thị cho học viên.`
                : `Đang hiển thị bộ ${DEFAULT_READING_PASSAGES.length} bài đọc mẫu theo 6 chủ đề cuộc sống. Nhấn "Đồng bộ ${DEFAULT_READING_PASSAGES.length} bài đọc mẫu" để lưu toàn bộ lên Cloud Firestore.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleSeedDefaults()}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
            >
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {seeding
                ? seedProgress
                  ? `Đang đồng bộ ${seedProgress.written}/${seedProgress.total}...`
                  : 'Đang đồng bộ...'
                : `Đồng bộ ${DEFAULT_READING_PASSAGES.length} bài đọc mẫu`}
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Thêm bài đọc mới
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài đọc theo tiêu đề Anh/Việt, chủ đề hoặc ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Lọc theo chủ đề"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              <option value="ALL">Tất cả chủ đề</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'ALL' | LearnerCEFRLevel)}
              aria-label="Lọc theo cấp độ CEFR"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
            >
              <option value="ALL">Tất cả cấp độ</option>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  CEFR {lvl}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Passages List */}
      {filteredPassages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Không tìm thấy bài đọc nào khớp bộ lọc.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 tabular-nums">
            <span>
              Hiển thị {pagedPassages.length} / {filteredPassages.length} bài đọc phù hợp
            </span>
            <span>
              Trang {safePage} / {totalPages}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pagedPassages.map((passage) => (
            <div
              key={passage.passageId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="text-[#D94E00] dark:text-[#FF8524] font-bold">
                      {passage.levelId}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{passage.category}</span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                      #{passage.order}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <span
                      className={
                        passage.isPublished
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }
                    >
                      {passage.isPublished ? 'Đang phát hành' : 'Bản nháp'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(passage)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300"
                      aria-label={`Sửa ${passage.titleEn}`}
                      title="Chỉnh sửa bài đọc"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(passage)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300"
                      aria-label={`Xóa ${passage.titleEn}`}
                      title="Xóa bài đọc"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                    {passage.titleEn}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {passage.titleVi}
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                  {passage.contentEn}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-mono">{passage.passageId}</span>
                <span className="tabular-nums">
                  {passage.keyPhrases?.length ?? 0} cụm từ nổi bật · ~{passage.estimatedMinutes} phút
                </span>
              </div>
            </div>
          ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45"
              >
                <ChevronLeft className="w-4 h-4" />
                Trang trước
              </button>

              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                Trang {safePage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45"
              >
                Trang sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* EDITOR & LIVE PREVIEW MODAL */}
      {editingPassage && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#D94E00] dark:text-[#FF8524]">
                  {isNewPassage ? 'Tạo bài đọc hiểu mới' : `Chỉnh sửa bài đọc · ${editingPassage.passageId}`}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {editingPassage.titleEn || 'Bài đọc chưa đặt tên'}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Đang lưu...' : 'Lưu bài đọc'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPassage(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Đóng trình soạn thảo bài đọc"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher (Edit vs Live Flashcard Preview) */}
            <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewSide('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  previewSide === 'edit'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Soạn nội dung
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('front')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  previewSide === 'front'
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Xem trước Mặt trước (Anh)
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('back')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  previewSide === 'back'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                Xem trước Mặt sau (Việt)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {previewSide === 'front' ? (
                <div className="max-w-2xl mx-auto rounded-2xl p-8 bg-[#FAF5EC] dark:bg-slate-950 border-2 border-[#E7D8C3] dark:border-[#FF6B00]/50 space-y-5">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#C84300] dark:text-[#FF8524]">
                    Mặt trước · English Reading ({editingPassage.levelId})
                  </div>
                  <h4 className="font-serif text-center text-3xl font-bold text-[#D81B60] dark:text-[#FF7E29]">
                    {editingPassage.titleEn || 'Untitled Reading'}
                  </h4>
                  <p className="font-serif text-base sm:text-lg leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-line">
                    {editingPassage.contentEn || 'Chưa nhập nội dung tiếng Anh...'}
                  </p>
                </div>
              ) : previewSide === 'back' ? (
                <div className="max-w-2xl mx-auto rounded-2xl p-8 bg-white dark:bg-[#0A1628] border-2 border-[#FF6B00]/55 space-y-5">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    Mặt sau · Bản dịch Tiếng Việt
                  </div>
                  <h4 className="font-serif text-center text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {editingPassage.titleVi || 'Chưa nhập tiêu đề tiếng Việt'}
                  </h4>
                  <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-line">
                    {editingPassage.contentVi || 'Chưa nhập bản dịch tiếng Việt...'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mã bài đọc (ID)
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!isNewPassage}
                        maxLength={80}
                        value={editingPassage.passageId}
                        onChange={(e) =>
                          setEditingPassage({ ...editingPassage, passageId: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cấp độ CEFR
                      </label>
                      <select
                        value={editingPassage.levelId}
                        onChange={(e) =>
                          setEditingPassage({
                            ...editingPassage,
                            levelId: e.target.value as LearnerCEFRLevel,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        {LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            CEFR {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Thứ tự hiển thị
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={editingPassage.order}
                        onChange={(e) =>
                          setEditingPassage({
                            ...editingPassage,
                            order: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Thời gian đọc (phút)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={editingPassage.estimatedMinutes}
                        onChange={(e) =>
                          setEditingPassage({
                            ...editingPassage,
                            estimatedMinutes: Number(e.target.value) || 3,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Chủ đề cuộc sống (tối đa 60 ký tự)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        list="reading-category-suggestions"
                        value={editingPassage.category}
                        onChange={(e) =>
                          setEditingPassage({ ...editingPassage, category: e.target.value })
                        }
                        placeholder="VD: Động lực & Cuộc sống"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                      <datalist id="reading-category-suggestions">
                        {READING_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPassage.isPublished}
                        onChange={(e) =>
                          setEditingPassage({ ...editingPassage, isPublished: e.target.checked })
                        }
                        className="rounded border-slate-300 accent-[#FF6B00]"
                      />
                      <span>Phát hành công khai cho học viên</span>
                    </label>
                  </div>

                  {/* Front Face (English) */}
                  <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/15 space-y-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#D94E00] dark:text-[#FF8524]">
                      Mặt trước Flashcard · Nội dung Tiếng Anh
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Tiêu đề Tiếng Anh *
                        </label>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {editingPassage.titleEn.length}/160
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={160}
                        value={editingPassage.titleEn}
                        onChange={(e) =>
                          setEditingPassage({ ...editingPassage, titleEn: e.target.value })
                        }
                        placeholder="VD: No Pain, No Gain"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Đoạn văn Tiếng Anh * (tối thiểu 10 ký tự)
                        </label>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {editingPassage.contentEn.length}/3000
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        required
                        minLength={10}
                        maxLength={3000}
                        value={editingPassage.contentEn}
                        onChange={(e) =>
                          setEditingPassage({ ...editingPassage, contentEn: e.target.value })
                        }
                        placeholder="Nhập nội dung bài đọc tiếng Anh..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white resize-y"
                      />
                    </div>
                  </div>

                  {/* Back Face (Vietnamese) */}
                  <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/35 dark:bg-emerald-950/15 space-y-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Mặt sau Flashcard · Bản dịch Tiếng Việt
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Tiêu đề Tiếng Việt *
                        </label>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {editingPassage.titleVi.length}/160
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={160}
                        value={editingPassage.titleVi}
                        onChange={(e) =>
                          setEditingPassage({ ...editingPassage, titleVi: e.target.value })
                        }
                        placeholder="VD: Không Có Nỗ Lực, Không Có Thành Công"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Bản dịch Tiếng Việt * (tối thiểu 10 ký tự)
                        </label>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {editingPassage.contentVi.length}/3500
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        required
                        minLength={10}
                        maxLength={3500}
                        value={editingPassage.contentVi}
                        onChange={(e) =>
                          setEditingPassage({ ...editingPassage, contentVi: e.target.value })
                        }
                        placeholder="Nhập bản dịch tiếng Việt tự nhiên tương ứng với đoạn văn tiếng Anh..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white resize-y"
                      />
                    </div>
                  </div>

                  {/* Key Phrases (Optional up to 12) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Cụm từ & từ vựng nổi bật (tối đa 12 cụm, hiển thị ở mặt sau)
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tùy chọn — giúp học viên ghi nhớ nhanh các cụm từ hay trong bài đọc.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addKeyPhrase}
                        disabled={editingPassage.keyPhrases.length >= 12}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm cụm từ
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editingPassage.keyPhrases.map((kp, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            maxLength={120}
                            value={kp.phrase}
                            onChange={(e) => updateKeyPhrase(idx, { phrase: e.target.value })}
                            placeholder="Cụm từ tiếng Anh (VD: comfort zone)"
                            className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            maxLength={200}
                            value={kp.meaningVi}
                            onChange={(e) => updateKeyPhrase(idx, { meaningVi: e.target.value })}
                            placeholder="Nghĩa tiếng Việt (VD: vùng an toàn)"
                            className="sm:col-span-6 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeKeyPhrase(idx)}
                            className="sm:col-span-1 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 justify-self-end"
                            aria-label="Xóa cụm từ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
