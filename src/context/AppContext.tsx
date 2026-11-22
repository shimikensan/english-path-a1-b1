import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { ALL_DEFAULT_LESSONS, DEFAULT_LEVELS, DEFAULT_READING_PASSAGES } from '../data';
import { auth, googleProvider, handleFirestoreError, isFirestoreQuotaError, OperationType } from '../firebase';
import {
  checkIsAdmin,
  ensureUserProfile,
  fetchLessonsOnce,
  fetchLevelsOnce,
  fetchPublicLeaderboardOnce,
  fetchReadingPassagesOnce,
  getCachedLeaderboardSnapshot,
  seedCurriculumToFirestore,
  subscribeQuizResults,
  subscribeUserProfile,
  subscribeUserProgress,
  subscribeUserVocabulary,
  submitQuizAttempt,
  syncUserLeaderboardEntry,
  toggleUserVocabularyState,
  updateUserProfileData,
} from '../services/firestoreService';
import type {
  LeaderboardEntryDoc,
  LearnerCEFRLevel,
  LessonDoc,
  LevelDoc,
  QuizRating,
  QuizResultDoc,
  ReadingPassageDoc,
  UserProfile,
  UserProgressDoc,
  UserVocabularyDoc,
  VocabularyItem,
} from '../types';
import {
  clearLastReminderShownMs,
  computeLastStudyTimestampMs,
  writeLocalLastStudyMs,
} from '../utils/studyReminder';

const CANONICAL_LEVEL_RANK: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  ESP: 6,
};

function getLevelSortRank(levelId: string, fallbackOrder: number): number {
  return CANONICAL_LEVEL_RANK[levelId] ?? 100 + fallbackOrder;
}

const VALID_LEARNER_LEVELS: ReadonlySet<LearnerCEFRLevel> = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);

function parseLearnerLevel(raw: string | null): LearnerCEFRLevel {
  if (raw && VALID_LEARNER_LEVELS.has(raw as LearnerCEFRLevel)) {
    return raw as LearnerCEFRLevel;
  }
  return 'A1';
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title?: string;
  durationMs?: number;
  action?: ToastAction;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'reminder';
  title?: string;
  message: string;
  durationMs?: number;
  action?: ToastAction;
}

interface AppContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  needsEmailVerification: boolean;
  profile: UserProfile | null;
  isAdmin: boolean;
  dataLoading: boolean;
  studyDataHydrated: boolean;
  lastStudyAtMs: number | null;
  recordStudyActivity: () => void;
  firestoreSeeded: boolean;
  levels: LevelDoc[];
  lessons: LessonDoc[];
  readingPassages: ReadingPassageDoc[];
  readingPassagesSeeded: boolean;
  readingPassagesLoading: boolean;
  progressMap: Record<string, UserProgressDoc>;
  quizResults: QuizResultDoc[];
  vocabMap: Record<string, UserVocabularyDoc>;
  leaderboard: LeaderboardEntryDoc[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  quotaExceeded: boolean;
  refreshLeaderboard: (force?: boolean) => Promise<void>;
  refreshCurriculum: (force?: boolean) => Promise<void>;
  refreshReadingPassages: (force?: boolean) => Promise<void>;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string, level: LearnerCEFRLevel) => Promise<void>;
  sendResetPasswordEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProfileSettings: (updates: {
    fullName?: string;
    currentLevel?: LearnerCEFRLevel;
    dailyGoalMinutes?: number;
    reminderEnabled?: boolean;
  }) => Promise<void>;
  toggleVocabState: (
    lesson: LessonDoc,
    vocab: VocabularyItem,
    changes: { isFavorite?: boolean; isLearned?: boolean }
  ) => Promise<void>;
  saveQuizAttempt: (params: {
    lesson: LessonDoc;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    rating: QuizRating;
    durationSeconds: number;
  }) => Promise<string>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng chức năng Quên mật khẩu.';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu. Vui lòng nhập ít nhất 6 ký tự.';
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập Email/Mật khẩu chưa được bật trên Firebase Console. Bạn có thể đăng nhập nhanh bằng Google hoặc bật Email/Password trong Firebase Authentication.';
    case 'auth/too-many-requests':
      return 'Bạn thao tác quá nhiều lần. Vui lòng chờ một lát rồi thử lại.';
    case 'auth/requires-recent-login':
      return 'Vui lòng đăng xuất và đăng nhập lại trước khi đổi mật khẩu.';
    default:
      return error instanceof Error ? error.message : 'Đã xảy ra lỗi xác thực. Vui lòng thử lại.';
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [firestoreLevels, setFirestoreLevels] = useState<LevelDoc[]>([]);
  const [firestoreLessons, setFirestoreLessons] = useState<LessonDoc[]>([]);
  const [firestoreReadings, setFirestoreReadings] = useState<ReadingPassageDoc[]>([]);
  const [readingPassagesLoaded, setReadingPassagesLoaded] = useState(false);
  const [readingPassagesLoading, setReadingPassagesLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgressDoc>>({});
  const [quizResults, setQuizResults] = useState<QuizResultDoc[]>([]);
  const [vocabMap, setVocabMap] = useState<Record<string, UserVocabularyDoc>>({});
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [quizHydrated, setQuizHydrated] = useState(false);
  const [vocabHydrated, setVocabHydrated] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryDoc[]>(() =>
    getCachedLeaderboardSnapshot()
  );
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [localStudyTick, setLocalStudyTick] = useState(0);

  const autoSeededRef = useRef(false);
  const quotaToastShownRef = useRef(false);
  const lastLeaderboardSigRef = useRef('');
  const toastTimersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastMessage['type'], message: string, options?: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const durationMs = options?.durationMs ?? (type === 'reminder' ? 12000 : 4500);
      setToasts((prev) => {
        // Avoid stacking multiple reminder toasts simultaneously
        const filtered =
          type === 'reminder' ? prev.filter((t) => t.type !== 'reminder') : prev;
        return [
          ...filtered.slice(-3),
          {
            id,
            type,
            title: options?.title,
            message,
            durationMs,
            action: options?.action,
          },
        ];
      });
      const timerId = window.setTimeout(() => {
        toastTimersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
      toastTimersRef.current.set(id, timerId);
    },
    []
  );

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const notifyQuotaExceeded = useCallback(() => {
    setQuotaExceeded(true);
    if (!quotaToastShownRef.current) {
      quotaToastShownRef.current = true;
      addToast(
        'info',
        'Firestore đã chạm giới hạn lượt đọc miễn phí hôm nay. Bạn vẫn có thể học toàn bộ 51 bài chuẩn; hạn mức sẽ tự đặt lại vào ngày mai.'
      );
    }
  }, [addToast]);

  const refreshLeaderboard = useCallback(
    async (force = false) => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      try {
        const { entries } = await fetchPublicLeaderboardOnce(force);
        setLeaderboard(entries);
        setQuotaExceeded(false);
        setLeaderboardError(null);
      } catch (err) {
        if (isFirestoreQuotaError(err)) {
          notifyQuotaExceeded();
          const cached = getCachedLeaderboardSnapshot();
          if (cached.length > 0) {
            setLeaderboard(cached);
          }
          setLeaderboardError(
            'Cloud Firestore đã chạm giới hạn lượt đọc miễn phí trong ngày (Spark Free Tier). Hạn mức sẽ tự động đặt lại vào ngày mai.'
          );
        } else {
          setLeaderboardError('Chưa thể tải bảng xếp hạng lúc này. Vui lòng thử lại sau ít giây.');
        }
      } finally {
        setLeaderboardLoading(false);
      }
    },
    [notifyQuotaExceeded]
  );

  const refreshCurriculum = useCallback(
    async (force = false) => {
      try {
        const [lvls, lsns] = await Promise.all([
          fetchLevelsOnce(isAdmin, force),
          fetchLessonsOnce(isAdmin, force),
        ]);
        setFirestoreLevels(lvls);
        setFirestoreLessons(lsns);
      } catch (err) {
        if (isFirestoreQuotaError(err)) {
          notifyQuotaExceeded();
        }
      }
    },
    [isAdmin, notifyQuotaExceeded]
  );

  const refreshReadingPassages = useCallback(
    async (force = false) => {
      if (!firebaseUser || !firebaseUser.emailVerified) return;
      if (!force && readingPassagesLoaded) return;
      setReadingPassagesLoading(true);
      try {
        const items = await fetchReadingPassagesOnce(isAdmin, force);
        setFirestoreReadings(items);
        setReadingPassagesLoaded(true);
      } catch (err) {
        if (isFirestoreQuotaError(err)) {
          notifyQuotaExceeded();
        }
      } finally {
        setReadingPassagesLoading(false);
      }
    },
    [firebaseUser, isAdmin, readingPassagesLoaded, notifyQuotaExceeded]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        setProgressMap({});
        setQuizResults([]);
        setVocabMap({});
        setProgressHydrated(false);
        setQuizHydrated(false);
        setVocabHydrated(false);
        autoSeededRef.current = false;
        lastLeaderboardSigRef.current = '';
        setFirestoreLevels([]);
        setFirestoreLessons([]);
        setFirestoreReadings([]);
        setReadingPassagesLoaded(false);
      }
    });
    return unsub;
  }, []);

  // Load public PII-free leaderboard via cached one-time query (avoids continuous snapshot read drain)
  useEffect(() => {
    void refreshLeaderboard(false);
  }, [refreshLeaderboard]);

  const needsEmailVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);

  // Attach Firestore subscriptions strictly after auth is ready & user is verified
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    let cancelled = false;
    const unsubscribers: Array<() => void> = [];

    const handleSubError = (path: string, op: OperationType) => (err: unknown) => {
      if (cancelled) return;
      if (isFirestoreQuotaError(err)) {
        notifyQuotaExceeded();
        return;
      }
      handleFirestoreError(err, op, path);
    };

    const bootstrap = async () => {
      setDataLoading(true);
      try {
        const [ensuredProfile, adminFlag] = await Promise.all([
          ensureUserProfile(firebaseUser),
          checkIsAdmin(firebaseUser),
        ]);
        if (cancelled) return;
        setProfile(ensuredProfile);
        setIsAdmin(adminFlag);

        // Fetch curriculum once with 30-min local cache instead of permanent 57-doc onSnapshot listeners
        try {
          const [lvls, lsns] = await Promise.all([
            fetchLevelsOnce(adminFlag, false),
            fetchLessonsOnce(adminFlag, false),
          ]);
          if (!cancelled) {
            setFirestoreLevels(lvls);
            setFirestoreLessons(lsns);

            const firestoreIds = new Set(lsns.map((l) => l.lessonId));
            const hasMissingDefaults =
              lsns.length === 0 || ALL_DEFAULT_LESSONS.some((d) => !firestoreIds.has(d.lessonId));
            if (adminFlag && hasMissingDefaults && !autoSeededRef.current) {
              autoSeededRef.current = true;
              seedCurriculumToFirestore()
                .then(async (res) => {
                  if (!cancelled) {
                    const [freshLvls, freshLsns] = await Promise.all([
                      fetchLevelsOnce(true, true),
                      fetchLessonsOnce(true, true),
                    ]);
                    if (!cancelled) {
                      setFirestoreLevels(freshLvls);
                      setFirestoreLessons(freshLsns);
                    }
                    addToast(
                      'info',
                      `Đã tự động đồng bộ ${res.lessonsCount} bài học chuẩn A1–C1 & Chuyên ngành lên Firestore.`
                    );
                  }
                })
                .catch((seedErr) => {
                  if (isFirestoreQuotaError(seedErr)) {
                    notifyQuotaExceeded();
                  } else {
                    autoSeededRef.current = false;
                  }
                });
            }
          }
        } catch (currErr) {
          if (isFirestoreQuotaError(currErr)) {
            notifyQuotaExceeded();
          }
        }

        unsubscribers.push(
          subscribeUserProfile(
            firebaseUser.uid,
            (p) => {
              if (!cancelled && p) setProfile(p);
            },
            handleSubError(`users/${firebaseUser.uid}`, OperationType.GET)
          )
        );
        unsubscribers.push(
          subscribeUserProgress(
            firebaseUser.uid,
            (map) => {
              if (!cancelled) {
                setProgressMap(map);
                setProgressHydrated(true);
              }
            },
            handleSubError('user_progress', OperationType.LIST)
          )
        );
        unsubscribers.push(
          subscribeQuizResults(
            firebaseUser.uid,
            (results) => {
              if (!cancelled) {
                setQuizResults(results);
                setQuizHydrated(true);
              }
            },
            handleSubError('quiz_results', OperationType.LIST)
          )
        );
        unsubscribers.push(
          subscribeUserVocabulary(
            firebaseUser.uid,
            (vMap) => {
              if (!cancelled) {
                setVocabMap(vMap);
                setVocabHydrated(true);
              }
            },
            handleSubError('user_vocabulary', OperationType.LIST)
          )
        );
      } catch (err) {
        if (!cancelled) {
          if (isFirestoreQuotaError(err)) {
            notifyQuotaExceeded();
            // Provide a usable fallback profile from Firebase Auth so learner can still study bundled lessons
            setProfile((prev) =>
              prev ?? {
                uid: firebaseUser.uid,
                fullName:
                  firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Học viên',
                email: firebaseUser.email || '',
                currentLevel: 'A1',
                streakDays: 1,
                lastStudyDate: '',
                dailyGoalMinutes: 20,
                reminderEnabled: true,
              }
            );
          } else {
            addToast(
              'error',
              err instanceof Error ? 'Không thể tải dữ liệu học tập từ Firestore.' : 'Lỗi kết nối Firestore.'
            );
          }
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      unsubscribers.forEach((u) => u());
    };
  }, [authReady, firebaseUser, addToast, notifyQuotaExceeded]);

  const firestoreSeeded = firestoreLessons.length > 0;

  const levels = useMemo<LevelDoc[]>(() => {
    if (firestoreLevels.length === 0) return DEFAULT_LEVELS;
    const existingIds = new Set(firestoreLevels.map((l) => l.levelId));
    const missingDefaults = DEFAULT_LEVELS.filter(
      (l) => (l.levelId === 'B2' || l.levelId === 'C1' || l.levelId === 'ESP') && !existingIds.has(l.levelId)
    );
    return [...firestoreLevels, ...missingDefaults].sort(
      (a, b) => getLevelSortRank(a.levelId, a.order) - getLevelSortRank(b.levelId, b.order)
    );
  }, [firestoreLevels]);

  const lessons = useMemo<LessonDoc[]>(() => {
    if (firestoreLessons.length === 0) return ALL_DEFAULT_LESSONS;
    const existingIds = new Set(firestoreLessons.map((l) => l.lessonId));
    const missingExtended = ALL_DEFAULT_LESSONS.filter(
      (l) =>
        (l.levelId === 'B2' || l.levelId === 'C1' || l.levelId === 'ESP') &&
        !existingIds.has(l.lessonId)
    );
    return [...firestoreLessons, ...missingExtended].sort((a, b) => {
      const rankDiff = getLevelSortRank(a.levelId, 99) - getLevelSortRank(b.levelId, 99);
      if (rankDiff !== 0) return rankDiff;
      return a.order - b.order;
    });
  }, [firestoreLessons]);

  const readingPassagesSeeded = firestoreReadings.length > 0;

  const readingPassages = useMemo<ReadingPassageDoc[]>(() => {
    if (firestoreReadings.length === 0) return DEFAULT_READING_PASSAGES;
    return [...firestoreReadings].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [firestoreReadings]);

  // Automatically sync verified learner's public completion stats to /leaderboard/{uid}
  useEffect(() => {
    if (
      quotaExceeded ||
      !firebaseUser ||
      !firebaseUser.emailVerified ||
      !profile ||
      dataLoading ||
      !progressHydrated ||
      !quizHydrated ||
      !vocabHydrated ||
      lessons.length === 0
    ) {
      return;
    }

    const publishedLessons = lessons.filter((l) => l.isPublished !== false);
    const totalLessons = Math.max(1, publishedLessons.length);
    const totalVocab = Math.max(
      1,
      publishedLessons.reduce((sum, l) => sum + l.vocabulary.length, 0)
    );
    const publishedIds = new Set(publishedLessons.map((l) => l.lessonId));
    const completedLessons = Object.values(progressMap).filter(
      (p) => p.lessonCompleted && publishedIds.has(p.lessonId)
    ).length;
    const learnedVocabCount = Object.values(vocabMap).filter((v) => v.isLearned).length;
    const lessonRatio = Math.min(1, completedLessons / totalLessons);
    const vocabRatio = Math.min(1, learnedVocabCount / totalVocab);
    const completionPercent = Math.min(
      100,
      Math.max(0, Math.round((lessonRatio * 0.6 + vocabRatio * 0.4) * 100))
    );
    const averageQuizScore =
      quizResults.length > 0
        ? Math.round(quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length)
        : 0;

    const displayName = (profile.fullName || 'Phi công tập sự').trim();
    const sig = [
      profile.uid,
      displayName,
      profile.currentLevel,
      completedLessons,
      totalLessons,
      completionPercent,
      learnedVocabCount,
      averageQuizScore,
      profile.streakDays ?? 1,
    ].join('|');

    if (lastLeaderboardSigRef.current === sig) {
      return;
    }
    lastLeaderboardSigRef.current = sig;

    syncUserLeaderboardEntry({
      uid: profile.uid,
      displayName,
      currentLevel: profile.currentLevel,
      completedLessons,
      totalLessons,
      completionPercent,
      learnedVocabCount,
      averageQuizScore,
      streakDays: profile.streakDays ?? 1,
      isPublic: true,
    })
      .then(() => {
        // Optimistically update local leaderboard state without re-reading the entire collection
        setLeaderboard((prev) => {
          const nextEntry: LeaderboardEntryDoc = {
            uid: profile.uid,
            displayName,
            currentLevel: profile.currentLevel,
            completedLessons,
            totalLessons,
            completionPercent,
            learnedVocabCount,
            averageQuizScore,
            streakDays: profile.streakDays ?? 1,
            isPublic: true,
          };
          const exists = prev.some((e) => e.uid === profile.uid);
          const merged = exists
            ? prev.map((e) => (e.uid === profile.uid ? { ...e, ...nextEntry } : e))
            : [...prev, nextEntry];
          return merged.sort((a, b) => {
            if (b.completionPercent !== a.completionPercent) return b.completionPercent - a.completionPercent;
            if (b.completedLessons !== a.completedLessons) return b.completedLessons - a.completedLessons;
            if (b.learnedVocabCount !== a.learnedVocabCount) return b.learnedVocabCount - a.learnedVocabCount;
            if (b.averageQuizScore !== a.averageQuizScore) return b.averageQuizScore - a.averageQuizScore;
            return b.streakDays - a.streakDays;
          });
        });
      })
      .catch((err) => {
        if (isFirestoreQuotaError(err)) {
          notifyQuotaExceeded();
          return;
        }
        console.error('Failed to sync leaderboard entry:', err);
        lastLeaderboardSigRef.current = '';
      });
  }, [
    quotaExceeded,
    firebaseUser,
    profile,
    dataLoading,
    progressHydrated,
    quizHydrated,
    vocabHydrated,
    lessons,
    progressMap,
    vocabMap,
    quizResults,
    notifyQuotaExceeded,
  ]);

  // --- Auth Actions ---

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast('success', 'Đăng nhập bằng Google thành công!');
    } catch (error) {
      const msg = mapFirebaseAuthError(error);
      addToast('error', msg);
      throw new Error(msg);
    }
  }, [addToast]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        addToast('success', 'Đăng nhập thành công!');
      } catch (error) {
        const msg = mapFirebaseAuthError(error);
        addToast('error', msg);
        throw new Error(msg);
      }
    },
    [addToast]
  );

  const signUpWithEmail = useCallback(
    async (fullName: string, email: string, password: string, level: LearnerCEFRLevel) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
        window.localStorage.setItem('english-path-pending-level', level);
        await sendEmailVerification(cred.user);
        addToast(
          'info',
          'Tài khoản đã được tạo! Vui lòng mở hộp thư email và nhấn liên kết xác thực để bắt đầu học.'
        );
      } catch (error) {
        const msg = mapFirebaseAuthError(error);
        addToast('error', msg);
        throw new Error(msg);
      }
    },
    [addToast]
  );

  const sendResetPasswordEmail = useCallback(
    async (email: string) => {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        addToast('success', 'Đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.');
      } catch (error) {
        const msg = mapFirebaseAuthError(error);
        addToast('error', msg);
        throw new Error(msg);
      }
    },
    [addToast]
  );

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      addToast('success', 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư (kể cả thư mục Spam).');
    } catch (error) {
      const msg = mapFirebaseAuthError(error);
      addToast('error', msg);
    }
  }, [addToast]);

  const refreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const refreshed = auth.currentUser;
    if (refreshed.emailVerified) {
      // Force React state refresh with a fresh reference via token refresh
      await refreshed.getIdToken(true);
      setFirebaseUser({ ...refreshed } as User);
      const pendingLevel = parseLearnerLevel(window.localStorage.getItem('english-path-pending-level'));
      await ensureUserProfile(refreshed, refreshed.displayName || undefined, pendingLevel);
      window.localStorage.removeItem('english-path-pending-level');
      addToast('success', 'Email đã được xác thực! Chào mừng bạn đến với Học tiếng Anh cùng Cậu bé Pilot.');
      return true;
    }
    addToast('info', 'Email vẫn chưa được xác thực. Vui lòng nhấn vào liên kết trong hộp thư của bạn.');
    return false;
  }, [addToast]);

  const changeUserPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Không tìm thấy phiên đăng nhập hợp lệ.');
      }
      try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        addToast('success', 'Đổi mật khẩu thành công!');
      } catch (error) {
        const msg = mapFirebaseAuthError(error);
        addToast('error', msg);
        throw new Error(msg);
      }
    },
    [addToast]
  );

  const signOutUser = useCallback(async () => {
    try {
      window.sessionStorage.removeItem('pilot-admin-vault-session');
    } catch {
      // Ignore storage errors
    }
    await signOut(auth);
    addToast('info', 'Đã đăng xuất khỏi tài khoản.');
  }, [addToast]);

  // --- Learner Mutations ---

  const updateProfileSettings = useCallback(
    async (updates: {
      fullName?: string;
      currentLevel?: LearnerCEFRLevel;
      dailyGoalMinutes?: number;
      reminderEnabled?: boolean;
    }) => {
      if (!profile) return;
      await updateUserProfileData(profile.uid, updates);
      addToast('success', 'Đã cập nhật thông tin cá nhân.');
    },
    [profile, addToast]
  );

  const studyDataHydrated = Boolean(
    profile && !dataLoading && (quotaExceeded || (progressHydrated && quizHydrated && vocabHydrated))
  );

  const lastStudyAtMs = useMemo(() => {
    if (!profile?.uid) return null;
    // Reference localStudyTick so updates from recordStudyActivity recompute immediately
    void localStudyTick;
    return computeLastStudyTimestampMs({
      uid: profile.uid,
      profile,
      progressMap,
      quizResults,
      vocabMap,
    });
  }, [profile, progressMap, quizResults, vocabMap, localStudyTick]);

  const recordStudyActivity = useCallback(() => {
    const uid = profile?.uid || firebaseUser?.uid;
    if (!uid) return;
    writeLocalLastStudyMs(uid, Date.now());
    clearLastReminderShownMs(uid);
    setLocalStudyTick((n) => n + 1);
    setToasts((prev) => prev.filter((t) => t.type !== 'reminder'));
  }, [profile?.uid, firebaseUser?.uid]);

  const toggleVocabState = useCallback(
    async (
      lesson: LessonDoc,
      vocab: VocabularyItem,
      changes: { isFavorite?: boolean; isLearned?: boolean }
    ) => {
      if (!profile) return;
      recordStudyActivity();
      await toggleUserVocabularyState(
        profile,
        lesson,
        vocab,
        changes,
        vocabMap[vocab.id],
        progressMap[lesson.lessonId]
      );
    },
    [profile, vocabMap, progressMap, recordStudyActivity]
  );

  const saveQuizAttempt = useCallback(
    async (params: {
      lesson: LessonDoc;
      score: number;
      totalQuestions: number;
      correctAnswers: number;
      wrongAnswers: number;
      rating: QuizRating;
      durationSeconds: number;
    }) => {
      if (!profile) throw new Error('Bạn cần đăng nhập để lưu kết quả kiểm tra.');
      recordStudyActivity();
      const id = await submitQuizAttempt({
        profile,
        lesson: params.lesson,
        score: params.score,
        totalQuestions: params.totalQuestions,
        correctAnswers: params.correctAnswers,
        wrongAnswers: params.wrongAnswers,
        rating: params.rating,
        durationSeconds: params.durationSeconds,
        existingProgress: progressMap[params.lesson.lessonId],
      });
      addToast('success', `Đã lưu kết quả kiểm tra (${params.score}%) lên Firestore!`);
      return id;
    },
    [profile, progressMap, addToast, recordStudyActivity]
  );

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        authReady,
        needsEmailVerification,
        profile,
        isAdmin,
        dataLoading,
        studyDataHydrated,
        lastStudyAtMs,
        recordStudyActivity,
        firestoreSeeded,
        levels,
        lessons,
        readingPassages,
        readingPassagesSeeded,
        readingPassagesLoading,
        progressMap,
        quizResults,
        vocabMap,
        leaderboard,
        leaderboardLoading,
        leaderboardError,
        quotaExceeded,
        refreshLeaderboard,
        refreshCurriculum,
        refreshReadingPassages,
        toasts,
        addToast,
        dismissToast,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendResetPasswordEmail,
        resendVerificationEmail,
        refreshVerificationStatus,
        changeUserPassword,
        signOutUser,
        updateProfileSettings,
        toggleVocabState,
        saveQuizAttempt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
