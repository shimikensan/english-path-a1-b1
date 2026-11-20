import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Edit3,
  KeyRound,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AdminPasswordGate } from '../components/admin/AdminPasswordGate';
import { AdminSecurityTab } from '../components/admin/AdminSecurityTab';
import { useApp } from '../context/AppContext';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase';
import {
  adminDeleteLesson,
  adminDeleteLevel,
  adminGetSecurityVault,
  adminGrantAdmin,
  adminListAdmins,
  adminListAllQuizResults,
  adminListAllUsers,
  adminRevokeAdmin,
  adminSaveLesson,
  adminSaveLevel,
  seedCurriculumToFirestore,
} from '../services/firestoreService';
import type {
  AdminRecord,
  AdminSecurityVaultDoc,
  LessonDoc,
  LevelDoc,
  PartOfSpeech,
  QuizQuestion,
  QuizQuestionType,
  QuizResultDoc,
  SentencePattern,
  UserProfile,
  VocabularyItem,
} from '../types';
import { formatTimestampVi, getQuizRatingVi, sanitizeId } from '../utils/helpers';

type AdminTab = 'overview' | 'levels' | 'lessons' | 'users' | 'security';
type EditorSection = 'meta' | 'vocabulary' | 'patterns' | 'grammar' | 'quiz';

const ADMIN_SESSION_STORAGE_KEY = 'pilot-admin-vault-session';
const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000;

function readActiveVaultSession(uid?: string): boolean {
  if (!uid) return false;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { uid?: string; expiresAt?: number };
    return parsed.uid === uid && typeof parsed.expiresAt === 'number' && Date.now() < parsed.expiresAt;
  } catch {
    return false;
  }
}

function writeVaultSession(uid: string): void {
  try {
    window.sessionStorage.setItem(
      ADMIN_SESSION_STORAGE_KEY,
      JSON.stringify({ uid, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS })
    );
  } catch {
    // Ignore storage quota errors
  }
}

function clearVaultSession(): void {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

const PART_OF_SPEECH_OPTIONS: PartOfSpeech[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'preposition',
  'conjunction',
  'pronoun',
];

const QUIZ_TYPE_LABELS: Record<QuizQuestionType, string> = {
  vocab_en_to_vi: 'Từ vựng Anh → Việt',
  vocab_vi_to_en: 'Từ vựng Việt → Anh',
  fill_blank: 'Điền từ vào chỗ trống',
  sentence_pattern: 'Mẫu câu giao tiếp',
  grammar: 'Ngữ pháp',
  word_order: 'Sắp xếp câu',
  reading_comprehension: 'Đọc hiểu đoạn văn',
};

function createEmptyLesson(nextOrder: number, defaultLevelId = 'A1'): LessonDoc {
  const id = `lesson_${defaultLevelId.toLowerCase()}_${Date.now().toString(36)}`;
  return {
    lessonId: id,
    levelId: defaultLevelId,
    topic: 'New Topic',
    topicOrder: 1,
    title: '',
    description: '',
    order: nextOrder,
    estimatedMinutes: 20,
    isPublished: true,
    vocabulary: [
      {
        id: `${id}_v1`,
        word: 'example',
        ipa: '/ɪɡˈzɑːmpl/',
        partOfSpeech: 'noun',
        meaningVi: 'ví dụ',
        exampleEn: 'This is a clear example.',
        exampleVi: 'Đây là một ví dụ rõ ràng.',
      },
    ],
    sentencePatterns: [
      {
        id: `${id}_p1`,
        structure: 'Could you tell me about ...?',
        meaningVi: 'Bạn có thể kể cho tôi nghe về ... được không?',
        usageVi: 'Dùng khi muốn hỏi thông tin một cách lịch sự.',
        exampleEn: 'Could you tell me about your daily routine?',
        exampleVi: 'Bạn có thể kể cho tôi nghe về thói quen hằng ngày của bạn được không?',
        dialogue: [
          {
            speaker: 'A',
            en: 'Could you tell me about your new job?',
            vi: 'Bạn có thể kể cho tôi nghe về công việc mới của bạn không?',
          },
          {
            speaker: 'B',
            en: 'Sure, I work as a software engineer in Da Nang.',
            vi: 'Chắc chắn rồi, tôi làm kỹ sư phần mềm ở Đà Nẵng.',
          },
        ],
      },
    ],
    grammar: {
      title: 'Cấu trúc ngữ pháp trọng tâm',
      summaryVi: 'Tóm tắt ngắn gọn cách dùng chủ điểm ngữ pháp của bài học.',
      formula: 'Subject + Verb + Object',
      usageVi: ['Diễn tả hành động hoặc sự việc trong ngữ cảnh của bài học.'],
      examples: [
        {
          en: 'She practices English every morning.',
          vi: 'Cô ấy luyện tập tiếng Anh mỗi sáng.',
        },
      ],
      commonMistakes: [
        {
          wrong: 'She practice English every morning.',
          right: 'She practices English every morning.',
          explanationVi: 'Chủ ngữ ngôi thứ 3 số ít cần thêm -s/-es ở thì hiện tại đơn.',
        },
      ],
      miniPractice: [
        {
          id: `${id}_gm1`,
          prompt: 'She ___ English every morning.',
          options: ['practice', 'practices', 'practicing', 'practiced'],
          correctIndex: 1,
          explanationVi: 'Với chủ ngữ "She" ở thì hiện tại đơn, động từ thêm -s.',
        },
      ],
    },
    quiz: [
      {
        id: `${id}_q1`,
        type: 'vocab_en_to_vi',
        question: 'Nghĩa tiếng Việt của từ "example" là gì?',
        options: ['ví dụ', 'bài kiểm tra', 'thói quen', 'lịch trình'],
        correctIndex: 0,
        explanationVi: '"Example" (danh từ) có nghĩa là "ví dụ".',
      },
    ],
  };
}

interface AdminPageProps {
  onBackToDashboard?: () => void;
}

export function AdminPage({ onBackToDashboard }: AdminPageProps) {
  const { firebaseUser, isAdmin, levels, lessons, firestoreSeeded, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [vaultDoc, setVaultDoc] = useState<AdminSecurityVaultDoc | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState<boolean>(() =>
    readActiveVaultSession(firebaseUser?.uid)
  );

  // Admin stats & records
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [allQuizResults, setAllQuizResults] = useState<QuizResultDoc[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);

  // Seeding state
  const [seedingTarget, setSeedingTarget] = useState<string | null>(null);

  // Level form state
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [levelForm, setLevelForm] = useState({
    levelId: '',
    name: '',
    subtitle: '',
    description: '',
    order: 4,
    isPublished: true,
  });
  const [savingLevel, setSavingLevel] = useState(false);

  // Lessons tab filter & editor state
  const [lessonLevelFilter, setLessonLevelFilter] = useState<string>('ALL');
  const [lessonSearch, setLessonSearch] = useState('');
  const [editingLesson, setEditingLesson] = useState<LessonDoc | null>(null);
  const [isNewLesson, setIsNewLesson] = useState(false);
  const [editorSection, setEditorSection] = useState<EditorSection>('meta');
  const [savingLesson, setSavingLesson] = useState(false);

  // Role mutation state
  const [busyUserUid, setBusyUserUid] = useState<string | null>(null);

  // Custom confirm modal (zero window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const handleLockAdmin = useCallback(() => {
    clearVaultSession();
    setVaultUnlocked(false);
    setEditingLesson(null);
    addToast('info', 'Đã khóa phiên Quản trị.');
  }, [addToast]);

  const handleVaultUnlocked = useCallback(
    (unlockedVault: AdminSecurityVaultDoc) => {
      setVaultDoc(unlockedVault);
      if (firebaseUser?.uid) {
        writeVaultSession(firebaseUser.uid);
      }
      setVaultUnlocked(true);
    },
    [firebaseUser?.uid]
  );

  // Sync unlocked session with active UID & auto-lock when TTL expires
  useEffect(() => {
    if (!firebaseUser?.uid || !isAdmin) {
      setVaultUnlocked(false);
      return;
    }
    if (!readActiveVaultSession(firebaseUser.uid)) {
      setVaultUnlocked(false);
      return;
    }
    // Load vault metadata when resuming an active unlocked session
    if (!vaultDoc) {
      void adminGetSecurityVault()
        .then((docData) => {
          if (docData) {
            setVaultDoc(docData);
          } else {
            clearVaultSession();
            setVaultUnlocked(false);
          }
        })
        .catch(() => {
          clearVaultSession();
          setVaultUnlocked(false);
        });
    }
    const interval = window.setInterval(() => {
      if (!readActiveVaultSession(firebaseUser.uid)) {
        clearVaultSession();
        setVaultUnlocked(false);
        addToast('info', 'Phiên Quản trị đã tự động khóa sau 30 phút để bảo mật.');
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [firebaseUser?.uid, isAdmin, vaultDoc, addToast]);

  const loadAdminOverview = useCallback(async () => {
    if (!isAdmin || !vaultUnlocked) return;
    setLoadingAdminData(true);
    try {
      const [users, admins, results] = await Promise.all([
        adminListAllUsers(),
        adminListAdmins(),
        adminListAllQuizResults(),
      ]);
      setUsersList(users);
      setAdminsList(admins);
      const sortedResults = [...results].sort((a, b) => {
        const ta =
          a.completedAt && typeof a.completedAt === 'object' && 'toMillis' in a.completedAt
            ? (a.completedAt as { toMillis: () => number }).toMillis()
            : 0;
        const tb =
          b.completedAt && typeof b.completedAt === 'object' && 'toMillis' in b.completedAt
            ? (b.completedAt as { toMillis: () => number }).toMillis()
            : 0;
        return tb - ta;
      });
      setAllQuizResults(sortedResults);
    } catch {
      addToast('error', 'Không thể tải danh sách thống kê quản trị từ Firestore.');
    } finally {
      setLoadingAdminData(false);
    }
  }, [isAdmin, vaultUnlocked, addToast]);

  useEffect(() => {
    void loadAdminOverview();
  }, [loadAdminOverview]);

  const adminUidSet = useMemo(() => new Set(adminsList.map((a) => a.uid)), [adminsList]);

  const globalAvgScore = useMemo(() => {
    if (allQuizResults.length === 0) return 0;
    const sum = allQuizResults.reduce((acc, r) => acc + r.score, 0);
    return Math.round(sum / allQuizResults.length);
  }, [allQuizResults]);

  const filteredLessons = useMemo(() => {
    const q = lessonSearch.trim().toLowerCase();
    return lessons.filter((l) => {
      if (lessonLevelFilter !== 'ALL' && l.levelId !== lessonLevelFilter) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.topic.toLowerCase().includes(q) ||
        l.lessonId.toLowerCase().includes(q)
      );
    });
  }, [lessons, lessonLevelFilter, lessonSearch]);

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Không có quyền truy cập khu vực Quản trị
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Khu vực này được bảo vệ bởi Firestore Security Rules và chỉ dành cho tài khoản Quản trị viên đã được cấp quyền.
        </p>
        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Quay lại Trang chủ
          </button>
        )}
      </div>
    );
  }

  if (!vaultUnlocked) {
    return (
      <AdminPasswordGate
        onUnlocked={handleVaultUnlocked}
        onBackToDashboard={onBackToDashboard}
      />
    );
  }

  // --- Handlers ---

  const handleSeed = async (target?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'ESP') => {
    const label = target ?? 'ALL';
    setSeedingTarget(label);
    try {
      const res = await seedCurriculumToFirestore(target);
      addToast(
        'success',
        `Đã đồng bộ ${res.levelsCount} cấp độ và ${res.lessonsCount} bài học (${target ?? 'A1–C1 & Chuyên ngành'}) lên Firestore.`
      );
    } catch {
      addToast('error', 'Đồng bộ giáo trình thất bại. Vui lòng kiểm tra kết nối và quyền Admin.');
    } finally {
      setSeedingTarget(null);
    }
  };

  const resetLevelForm = () => {
    setEditingLevelId(null);
    setLevelForm({
      levelId: '',
      name: '',
      subtitle: '',
      description: '',
      order: levels.length + 1,
      isPublished: true,
    });
  };

  const handleEditLevel = (lvl: LevelDoc) => {
    setEditingLevelId(lvl.levelId);
    setLevelForm({
      levelId: lvl.levelId,
      name: lvl.name,
      subtitle: lvl.subtitle,
      description: lvl.description,
      order: lvl.order,
      isPublished: lvl.isPublished,
    });
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = sanitizeId(levelForm.levelId, 32).toUpperCase();
    if (!cleanId || !levelForm.name.trim() || !levelForm.subtitle.trim()) {
      addToast('error', 'Vui lòng nhập đầy đủ mã cấp độ, tên cấp độ và mô tả ngắn.');
      return;
    }
    setSavingLevel(true);
    try {
      await adminSaveLevel({
        levelId: cleanId,
        name: levelForm.name.trim(),
        subtitle: levelForm.subtitle.trim(),
        description: levelForm.description.trim() || levelForm.subtitle.trim(),
        order: Number(levelForm.order) || 1,
        isPublished: levelForm.isPublished,
      });
      addToast('success', `Đã lưu cấp độ ${cleanId} lên Firestore.`);
      resetLevelForm();
    } catch {
      addToast('error', 'Không thể lưu cấp độ. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setSavingLevel(false);
    }
  };

  const requestDeleteLevel = (lvl: LevelDoc) => {
    setConfirmDialog({
      title: `Xóa cấp độ ${lvl.levelId}?`,
      description: `Cấp độ "${lvl.name}" sẽ bị xóa khỏi Firestore. Các bài học thuộc cấp độ này sẽ không tự động bị xóa nhưng có thể cần gán lại cấp độ.`,
      confirmLabel: 'Xóa cấp độ',
      danger: true,
      onConfirm: async () => {
        await adminDeleteLevel(lvl.levelId);
        addToast('success', `Đã xóa cấp độ ${lvl.levelId}.`);
      },
    });
  };

  const openCreateLesson = () => {
    const nextOrder = lessons.reduce((max, l) => Math.max(max, l.order), 0) + 1;
    const defaultLvl = lessonLevelFilter !== 'ALL' ? lessonLevelFilter : levels[0]?.levelId || 'A1';
    setEditingLesson(createEmptyLesson(nextOrder, defaultLvl));
    setIsNewLesson(true);
    setEditorSection('meta');
  };

  const openEditLesson = (lesson: LessonDoc) => {
    setEditingLesson(structuredClone(lesson));
    setIsNewLesson(false);
    setEditorSection('meta');
  };

  const handleSaveLesson = async () => {
    if (!editingLesson) return;
    if (!editingLesson.lessonId.trim() || !editingLesson.title.trim() || !editingLesson.topic.trim()) {
      addToast('error', 'Vui lòng nhập Mã bài học, Chủ đề và Tiêu đề bài học.');
      setEditorSection('meta');
      return;
    }
    if (!editingLesson.description.trim()) {
      addToast('error', 'Vui lòng nhập mô tả bài học.');
      setEditorSection('meta');
      return;
    }

    setSavingLesson(true);
    try {
      await adminSaveLesson(editingLesson);
      addToast('success', `Đã lưu bài học "${editingLesson.title}" lên Firestore.`);
      setEditingLesson(null);
    } catch {
      addToast('error', 'Không thể lưu bài học. Kiểm tra giới hạn số lượng câu/từ hoặc định dạng dữ liệu.');
    } finally {
      setSavingLesson(false);
    }
  };

  const requestDeleteLesson = (lesson: LessonDoc) => {
    setConfirmDialog({
      title: `Xóa bài học "${lesson.title}"?`,
      description: 'Bài học này cùng toàn bộ nội dung từ vựng, mẫu câu, ngữ pháp và câu hỏi kiểm tra sẽ bị xóa khỏi Firestore.',
      confirmLabel: 'Xóa bài học',
      danger: true,
      onConfirm: async () => {
        await adminDeleteLesson(lesson.lessonId);
        addToast('success', `Đã xóa bài học "${lesson.title}".`);
      },
    });
  };

  const handleToggleAdminRole = (target: UserProfile, currentlyAdmin: boolean) => {
    if (!firebaseUser) return;
    if (currentlyAdmin) {
      setConfirmDialog({
        title: `Thu hồi quyền Admin của ${target.fullName}?`,
        description: `Tài khoản ${target.email} sẽ trở về vai trò học viên thông thường và không còn truy cập được trang Quản trị.`,
        confirmLabel: 'Thu hồi quyền',
        danger: true,
        onConfirm: async () => {
          setBusyUserUid(target.uid);
          try {
            await adminRevokeAdmin(target.uid);
            setAdminsList((prev) => prev.filter((a) => a.uid !== target.uid));
            addToast('success', `Đã thu hồi quyền Admin của ${target.email}.`);
          } finally {
            setBusyUserUid(null);
          }
        },
      });
    } else {
      setConfirmDialog({
        title: `Cấp quyền Admin cho ${target.fullName}?`,
        description: `Tài khoản ${target.email} sẽ có toàn quyền chỉnh sửa cấp độ, bài học, từ vựng và quản lý người dùng.`,
        confirmLabel: 'Cấp quyền Admin',
        danger: false,
        onConfirm: async () => {
          setBusyUserUid(target.uid);
          try {
            await adminGrantAdmin({ uid: target.uid, email: target.email }, firebaseUser.uid);
            setAdminsList((prev) => [
              ...prev,
              { uid: target.uid, email: target.email, grantedBy: firebaseUser.uid },
            ]);
            addToast('success', `Đã cấp quyền Admin cho ${target.email}.`);
          } finally {
            setBusyUserUid(null);
          }
        },
      });
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch {
      addToast('error', 'Thao tác không thành công. Vui lòng thử lại.');
    } finally {
      setConfirmBusy(false);
    }
  };

  // --- Lesson Editor Sub-mutators ---

  const updateVocabItem = (index: number, patch: Partial<VocabularyItem>) => {
    if (!editingLesson) return;
    const next = [...editingLesson.vocabulary];
    next[index] = { ...next[index], ...patch };
    setEditingLesson({ ...editingLesson, vocabulary: next });
  };

  const addVocabItem = () => {
    if (!editingLesson || editingLesson.vocabulary.length >= 40) return;
    const idx = editingLesson.vocabulary.length + 1;
    setEditingLesson({
      ...editingLesson,
      vocabulary: [
        ...editingLesson.vocabulary,
        {
          id: `${editingLesson.lessonId}_v${Date.now().toString(36)}_${idx}`,
          word: '',
          ipa: '',
          partOfSpeech: 'noun',
          meaningVi: '',
          exampleEn: '',
          exampleVi: '',
        },
      ],
    });
  };

  const removeVocabItem = (index: number) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      vocabulary: editingLesson.vocabulary.filter((_, i) => i !== index),
    });
  };

  const updatePatternItem = (index: number, patch: Partial<SentencePattern>) => {
    if (!editingLesson) return;
    const next = [...editingLesson.sentencePatterns];
    next[index] = { ...next[index], ...patch };
    setEditingLesson({ ...editingLesson, sentencePatterns: next });
  };

  const addPatternItem = () => {
    if (!editingLesson || editingLesson.sentencePatterns.length >= 20) return;
    const idx = editingLesson.sentencePatterns.length + 1;
    setEditingLesson({
      ...editingLesson,
      sentencePatterns: [
        ...editingLesson.sentencePatterns,
        {
          id: `${editingLesson.lessonId}_p${Date.now().toString(36)}_${idx}`,
          structure: '',
          meaningVi: '',
          usageVi: '',
          exampleEn: '',
          exampleVi: '',
          dialogue: [
            { speaker: 'A', en: '', vi: '' },
            { speaker: 'B', en: '', vi: '' },
          ],
        },
      ],
    });
  };

  const removePatternItem = (index: number) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      sentencePatterns: editingLesson.sentencePatterns.filter((_, i) => i !== index),
    });
  };

  const updateQuizItem = (index: number, patch: Partial<QuizQuestion>) => {
    if (!editingLesson) return;
    const next = [...editingLesson.quiz];
    next[index] = { ...next[index], ...patch };
    setEditingLesson({ ...editingLesson, quiz: next });
  };

  const updateQuizOption = (qIndex: number, optIndex: number, value: string) => {
    if (!editingLesson) return;
    const next = [...editingLesson.quiz];
    const opts = [...next[qIndex].options] as [string, string, string, string];
    opts[optIndex] = value;
    next[qIndex] = { ...next[qIndex], options: opts };
    setEditingLesson({ ...editingLesson, quiz: next });
  };

  const addQuizItem = () => {
    if (!editingLesson || editingLesson.quiz.length >= 40) return;
    const idx = editingLesson.quiz.length + 1;
    setEditingLesson({
      ...editingLesson,
      quiz: [
        ...editingLesson.quiz,
        {
          id: `${editingLesson.lessonId}_q${Date.now().toString(36)}_${idx}`,
          type: 'vocab_en_to_vi',
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanationVi: '',
        },
      ],
    });
  };

  const removeQuizItem = (index: number) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      quiz: editingLesson.quiz.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Admin Sub-Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Bảng điều khiển Quản trị viên · Đã xác thực mật khẩu</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Quản lý giáo trình CEFR A1–C1, Chuyên ngành & Học viên
            </h2>
          </div>

          <button
            type="button"
            onClick={handleLockAdmin}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors self-start whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            Khóa quản trị
          </button>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          {[
            { id: 'overview' as const, label: 'Tổng quan & Seed', icon: Database },
            { id: 'levels' as const, label: `Cấp độ (${levels.length})`, icon: Layers },
            { id: 'lessons' as const, label: `Bài học (${lessons.length})`, icon: BookOpen },
            { id: 'users' as const, label: `Người dùng (${usersList.length})`, icon: Users },
            { id: 'security' as const, label: 'Mật khẩu & Bảo mật', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & SEED */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng số học viên</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">
                {usersList.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {adminsList.length + 1} tài khoản quản trị
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bài học đang phát hành</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">
                {lessons.filter((l) => l.isPublished).length} / {lessons.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {firestoreSeeded ? 'Đã đồng bộ trên Cloud Firestore' : 'Đang dùng dữ liệu mặc định'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lượt nộp bài kiểm tra</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">
                {allQuizResults.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lưu trữ bất biến trên Firestore
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Điểm trung bình toàn hệ thống</p>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 tabular-nums">
                {allQuizResults.length > 0 ? `${globalAvgScore}%` : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tính trên tất cả các lượt làm bài
              </p>
            </div>
          </div>

          {/* Seed Curriculum Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Khởi tạo & Đồng bộ dữ liệu giáo trình chuẩn lên Cloud Firestore
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Đẩy toàn bộ 6 cấp độ (A1, A2, B1, B2, C1 và Chuyên ngành ESP) gồm 51 bài học chuẩn (765 từ vựng, mẫu câu, ngữ pháp và trắc nghiệm) vào Firestore để tất cả học viên đồng bộ theo thời gian thực.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadAdminOverview()}
                disabled={loadingAdminData}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 self-start whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminData ? 'animate-spin' : ''}`} />
                Làm mới thống kê
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSeed()}
                disabled={seedingTarget !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                <Database className="w-4 h-4" />
                {seedingTarget === 'ALL' ? 'Đang đồng bộ 51 bài...' : 'Đồng bộ toàn bộ 51 bài (A1–C1 & ESP)'}
              </button>
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'ESP'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => void handleSeed(lvl)}
                  disabled={seedingTarget !== null}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 disabled:opacity-60 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
                >
                  {seedingTarget === lvl
                    ? `Đang đồng bộ ${lvl}...`
                    : lvl === 'ESP'
                      ? 'Seed riêng Chuyên ngành (9 bài)'
                      : lvl === 'B2' || lvl === 'C1'
                        ? `Seed riêng Level ${lvl} (6 bài)`
                        : `Seed riêng Level ${lvl} (10 bài)`}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Quiz Submissions Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                Kết quả kiểm tra gần nhất toàn hệ thống
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Hiển thị tối đa 10 lượt mới nhất
              </span>
            </div>

            {allQuizResults.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                Chưa có học viên nào hoàn thành bài kiểm tra.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 pr-4">Bài học</th>
                      <th className="py-2.5 px-3">Cấp độ</th>
                      <th className="py-2.5 px-3">Điểm</th>
                      <th className="py-2.5 px-3">Đánh giá</th>
                      <th className="py-2.5 pl-3 text-right">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {allQuizResults.slice(0, 10).map((res) => (
                      <tr key={res.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                          {res.lessonTitle}
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {res.levelId}
                        </td>
                        <td className="py-3 px-3 font-bold tabular-nums text-slate-900 dark:text-white">
                          {res.score}% ({res.correctAnswers}/{res.totalQuestions})
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                          {getQuizRatingVi(res.rating).labelVi}
                        </td>
                        <td className="py-3 pl-3 text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatTimestampVi(res.completedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LEVELS MANAGEMENT */}
      {activeTab === 'levels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <form
            onSubmit={handleSaveLevel}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 self-start"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingLevelId ? `Chỉnh sửa cấp độ ${editingLevelId}` : 'Thêm cấp độ mới'}
              </h3>
              {editingLevelId && (
                <button
                  type="button"
                  onClick={resetLevelForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã cấp độ (VD: A1, B2)
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingLevelId)}
                  value={levelForm.levelId}
                  onChange={(e) => setLevelForm((p) => ({ ...p, levelId: e.target.value.toUpperCase() }))}
                  placeholder="A1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thứ tự hiển thị
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={levelForm.order}
                  onChange={(e) => setLevelForm((p) => ({ ...p, order: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên cấp độ
              </label>
              <input
                type="text"
                required
                value={levelForm.name}
                onChange={(e) => setLevelForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="LEVEL A1: Beginner"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu đề phụ
              </label>
              <input
                type="text"
                required
                value={levelForm.subtitle}
                onChange={(e) => setLevelForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="Nền tảng giao tiếp cơ bản"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mô tả chi tiết
              </label>
              <textarea
                rows={3}
                value={levelForm.description}
                onChange={(e) => setLevelForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Mô tả mục tiêu đầu ra của cấp độ..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={levelForm.isPublished}
                onChange={(e) => setLevelForm((p) => ({ ...p, isPublished: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Phát hành công khai cho học viên</span>
            </label>

            <button
              type="submit"
              disabled={savingLevel}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingLevel ? 'Đang lưu...' : editingLevelId ? 'Cập nhật cấp độ' : 'Tạo cấp độ'}
            </button>
          </form>

          {/* List */}
          <div className="lg:col-span-7 space-y-3">
            {levels.map((lvl) => {
              const lessonCount = lessons.filter((l) => l.levelId === lvl.levelId).length;
              return (
                <div
                  key={lvl.levelId}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="text-blue-700 dark:text-blue-400 font-bold">{lvl.levelId}</span>
                      <span aria-hidden="true">·</span>
                      <span>Thứ tự {lvl.order}</span>
                      <span aria-hidden="true">·</span>
                      <span>{lessonCount} bài học</span>
                      <span aria-hidden="true">·</span>
                      <span className={lvl.isPublished ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>
                        {lvl.isPublished ? 'Đang phát hành' : 'Bản nháp'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{lvl.name}</h4>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{lvl.subtitle}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {lvl.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditLevel(lvl)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300"
                      aria-label={`Sửa ${lvl.levelId}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteLevel(lvl)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300"
                      aria-label={`Xóa ${lvl.levelId}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LESSONS & CONTENT MANAGEMENT */}
      {activeTab === 'lessons' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {['ALL', ...levels.map((l) => l.levelId)].map((lvlId) => (
                  <button
                    key={lvlId}
                    type="button"
                    onClick={() => setLessonLevelFilter(lvlId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      lessonLevelFilter === lvlId
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lvlId === 'ALL' ? 'Tất cả' : lvlId}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  placeholder="Tìm bài học hoặc chủ đề..."
                  className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white w-60"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateLesson}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Tạo bài học mới
            </button>
          </div>

          {/* Lessons Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Bài</th>
                    <th className="py-3 px-3">Cấp độ & Chủ đề</th>
                    <th className="py-3 px-3">Nội dung</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLessons.map((lesson) => (
                    <tr key={lesson.lessonId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {lesson.order}. {lesson.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {lesson.lessonId}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                          {lesson.levelId}
                        </span>
                        <span className="text-xs text-slate-400 mx-1.5">·</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300">{lesson.topic}</span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {lesson.vocabulary.length} từ · {lesson.sentencePatterns.length} mẫu câu · {lesson.quiz.length} câu hỏi
                      </td>
                      <td className="py-3 px-3 text-xs font-semibold">
                        <span
                          className={
                            lesson.isPublished
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {lesson.isPublished ? 'Công khai' : 'Nháp'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditLesson(lesson)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteLesson(lesson)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-rose-400 hover:text-rose-600"
                            aria-label={`Xóa ${lesson.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLessons.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Không có bài học nào khớp bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & RBAC */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Danh sách tài khoản & Phân quyền Quản trị (RBAC)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quyền Quản trị được xác thực trực tiếp trên Firestore Security Rules thông qua collection admins.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAdminOverview()}
              disabled={loadingAdminData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminData ? 'animate-spin' : ''}`} />
              Cập nhật
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Học viên</th>
                  <th className="py-3 px-3">Trình độ</th>
                  <th className="py-3 px-3">Chuỗi học</th>
                  <th className="py-3 px-3">Vai trò</th>
                  <th className="py-3 px-3">Ngày tham gia</th>
                  <th className="py-3 px-4 text-right">Phân quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((u) => {
                  const isBootstrapped =
                    u.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
                  const hasAdminRole = isBootstrapped || adminUidSet.has(u.uid);
                  const isSelf = firebaseUser?.uid === u.uid;
                  const canModify = !isBootstrapped && !isSelf;

                  return (
                    <tr key={u.uid}>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{u.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-blue-700 dark:text-blue-400">
                        CEFR {u.currentLevel}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                        {u.streakDays} ngày
                      </td>
                      <td className="py-3 px-3 text-xs font-semibold">
                        {hasAdminRole ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {isBootstrapped ? 'Quản trị gốc' : 'Admin'}
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">Học viên</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatTimestampVi(u.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canModify ? (
                          <button
                            type="button"
                            disabled={busyUserUid === u.uid}
                            onClick={() => handleToggleAdminRole(u, hasAdminRole)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 ${
                              hasAdminRole
                                ? 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
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
                        ) : (
                          <span className="text-xs text-slate-400">
                            {isSelf ? 'Tài khoản hiện tại' : 'Được bảo vệ'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      Chưa có dữ liệu học viên nào trên Firestore.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ADMIN PASSWORD & SECURITY */}
      {activeTab === 'security' && (
        <AdminSecurityTab
          vault={vaultDoc}
          onVaultUpdated={(nextVault) => setVaultDoc(nextVault)}
          onLockNow={handleLockAdmin}
        />
      )}

      {/* FULL LESSON EDITOR MODAL */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {isNewLesson ? 'Tạo bài học mới' : `Chỉnh sửa bài học · ${editingLesson.lessonId}`}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {editingLesson.title || 'Bài học chưa đặt tên'}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleSaveLesson()}
                  disabled={savingLesson}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold"
                >
                  <Save className="w-4 h-4" />
                  {savingLesson ? 'Đang lưu...' : 'Lưu bài học'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Đóng trình chỉnh sửa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Editor Section Tabs */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-wrap gap-1.5">
              {[
                { id: 'meta' as const, label: 'Thông tin chung' },
                { id: 'vocabulary' as const, label: `Từ vựng (${editingLesson.vocabulary.length})` },
                { id: 'patterns' as const, label: `Mẫu câu (${editingLesson.sentencePatterns.length})` },
                { id: 'grammar' as const, label: 'Ngữ pháp' },
                { id: 'quiz' as const, label: `Kiểm tra (${editingLesson.quiz.length})` },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setEditorSection(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    editorSection === s.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {editorSection === 'meta' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mã bài học (Lesson ID)
                    </label>
                    <input
                      type="text"
                      disabled={!isNewLesson}
                      value={editingLesson.lessonId}
                      onChange={(e) =>
                        setEditingLesson({ ...editingLesson, lessonId: sanitizeId(e.target.value, 80) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cấp độ CEFR
                    </label>
                    <select
                      value={editingLesson.levelId}
                      onChange={(e) => setEditingLesson({ ...editingLesson, levelId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    >
                      {levels.map((l) => (
                        <option key={l.levelId} value={l.levelId}>
                          {l.levelId} — {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Chủ đề (Topic)
                    </label>
                    <input
                      type="text"
                      value={editingLesson.topic}
                      onChange={(e) => setEditingLesson({ ...editingLesson, topic: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tiêu đề bài học
                    </label>
                    <input
                      type="text"
                      value={editingLesson.title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                      placeholder="VD: Greetings & First Meetings"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mô tả ngắn
                    </label>
                    <textarea
                      rows={3}
                      value={editingLesson.description}
                      onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Thứ tự bài
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={editingLesson.order}
                        onChange={(e) =>
                          setEditingLesson({ ...editingLesson, order: Number(e.target.value) || 1 })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Thứ tự chủ đề
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={editingLesson.topicOrder}
                        onChange={(e) =>
                          setEditingLesson({ ...editingLesson, topicOrder: Number(e.target.value) || 1 })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Thời lượng (phút)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={editingLesson.estimatedMinutes}
                        onChange={(e) =>
                          setEditingLesson({
                            ...editingLesson,
                            estimatedMinutes: Number(e.target.value) || 20,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 sm:col-span-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingLesson.isPublished}
                      onChange={(e) =>
                        setEditingLesson({ ...editingLesson, isPublished: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Hiển thị bài học công khai cho học viên</span>
                  </label>
                </div>
              )}

              {editorSection === 'vocabulary' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tối đa 40 từ vựng mỗi bài (khuyến nghị 15–20 từ).
                    </p>
                    <button
                      type="button"
                      onClick={addVocabItem}
                      disabled={editingLesson.vocabulary.length >= 40}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm từ vựng
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingLesson.vocabulary.map((v, idx) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Từ #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeVocabItem(idx)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Xóa từ này
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <input
                            type="text"
                            placeholder="Từ tiếng Anh"
                            value={v.word}
                            onChange={(e) => updateVocabItem(idx, { word: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="IPA (/.../)"
                            value={v.ipa}
                            onChange={(e) => updateVocabItem(idx, { ipa: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                          />
                          <select
                            value={v.partOfSpeech}
                            onChange={(e) =>
                              updateVocabItem(idx, { partOfSpeech: e.target.value as PartOfSpeech })
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          >
                            {PART_OF_SPEECH_OPTIONS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Nghĩa tiếng Việt"
                            value={v.meaningVi}
                            onChange={(e) => updateVocabItem(idx, { meaningVi: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            placeholder="Ví dụ tiếng Anh"
                            value={v.exampleEn}
                            onChange={(e) => updateVocabItem(idx, { exampleEn: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Dịch ví dụ tiếng Việt"
                            value={v.exampleVi}
                            onChange={(e) => updateVocabItem(idx, { exampleVi: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editorSection === 'patterns' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tối đa 20 mẫu câu mỗi bài (khuyến nghị 5–10 mẫu câu).
                    </p>
                    <button
                      type="button"
                      onClick={addPatternItem}
                      disabled={editingLesson.sentencePatterns.length >= 20}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm mẫu câu
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingLesson.sentencePatterns.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Mẫu câu #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removePatternItem(idx)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Xóa mẫu câu
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            placeholder="Cấu trúc tiếng Anh"
                            value={p.structure}
                            onChange={(e) => updatePatternItem(idx, { structure: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Ý nghĩa tiếng Việt"
                            value={p.meaningVi}
                            onChange={(e) => updatePatternItem(idx, { meaningVi: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Cách sử dụng (tiếng Việt)"
                          value={p.usageVi}
                          onChange={(e) => updatePatternItem(idx, { usageVi: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            placeholder="Ví dụ tiếng Anh"
                            value={p.exampleEn}
                            onChange={(e) => updatePatternItem(idx, { exampleEn: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Dịch ví dụ tiếng Việt"
                            value={p.exampleVi}
                            onChange={(e) => updatePatternItem(idx, { exampleVi: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editorSection === 'grammar' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tiêu đề chủ điểm ngữ pháp
                    </label>
                    <input
                      type="text"
                      value={editingLesson.grammar.title}
                      onChange={(e) =>
                        setEditingLesson({
                          ...editingLesson,
                          grammar: { ...editingLesson.grammar, title: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tóm tắt tiếng Việt
                    </label>
                    <textarea
                      rows={2}
                      value={editingLesson.grammar.summaryVi}
                      onChange={(e) =>
                        setEditingLesson({
                          ...editingLesson,
                          grammar: { ...editingLesson.grammar, summaryVi: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Công thức (Formula)
                    </label>
                    <input
                      type="text"
                      value={editingLesson.grammar.formula}
                      onChange={(e) =>
                        setEditingLesson({
                          ...editingLesson,
                          grammar: { ...editingLesson.grammar, formula: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cách sử dụng (mỗi dòng một ý)
                    </label>
                    <textarea
                      rows={4}
                      value={editingLesson.grammar.usageVi.join('\n')}
                      onChange={(e) =>
                        setEditingLesson({
                          ...editingLesson,
                          grammar: {
                            ...editingLesson.grammar,
                            usageVi: e.target.value.split('\n').filter((line) => line.trim().length > 0),
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>
              )}

              {editorSection === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tối đa 40 câu hỏi mỗi bài (khuyến nghị tối thiểu 15 câu).
                    </p>
                    <button
                      type="button"
                      onClick={addQuizItem}
                      disabled={editingLesson.quiz.length >= 40}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm câu hỏi
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editingLesson.quiz.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">Câu #{qIdx + 1}</span>
                            <select
                              value={q.type}
                              onChange={(e) =>
                                updateQuizItem(qIdx, { type: e.target.value as QuizQuestionType })
                              }
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            >
                              {Object.entries(QUIZ_TYPE_LABELS).map(([k, label]) => (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQuizItem(qIdx)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Xóa câu hỏi
                          </button>
                        </div>

                        {q.type === 'reading_comprehension' && (
                          <textarea
                            rows={2}
                            placeholder="Đoạn văn đọc hiểu (tuỳ chọn)..."
                            value={q.passage || ''}
                            onChange={(e) => updateQuizItem(qIdx, { passage: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                          />
                        )}

                        <input
                          type="text"
                          placeholder="Nội dung câu hỏi"
                          value={q.question}
                          onChange={(e) => updateQuizItem(qIdx, { question: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(['A', 'B', 'C', 'D'] as const).map((letter, optIdx) => (
                            <div key={letter} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuizItem(qIdx, { correctIndex: optIdx })}
                                className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center border transition-colors ${
                                  q.correctIndex === optIdx
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                                title={`Chọn đáp án ${letter} là đáp án đúng`}
                              >
                                {q.correctIndex === optIdx ? <CheckCircle2 className="w-4 h-4" /> : letter}
                              </button>
                              <input
                                type="text"
                                placeholder={`Đáp án ${letter}`}
                                value={q.options[optIdx]}
                                onChange={(e) => updateQuizOption(qIdx, optIdx, e.target.value)}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                              />
                            </div>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder="Giải thích đáp án (tiếng Việt)"
                          value={q.explanationVi}
                          onChange={(e) => updateQuizItem(qIdx, { explanationVi: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => void runConfirmedAction()}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-colors ${
                  confirmDialog.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmBusy ? 'Đang xử lý...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
