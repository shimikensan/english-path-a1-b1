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
import { ALL_DEFAULT_LESSONS, DEFAULT_LEVELS } from '../data';
import { auth, googleProvider } from '../firebase';
import {
  checkIsAdmin,
  ensureUserProfile,
  seedCurriculumToFirestore,
  subscribeLessons,
  subscribeLevels,
  subscribeQuizResults,
  subscribeUserProfile,
  subscribeUserProgress,
  subscribeUserVocabulary,
  submitQuizAttempt,
  toggleUserVocabularyState,
  updateUserProfileData,
} from '../services/firestoreService';
import type {
  LessonDoc,
  LevelDoc,
  QuizRating,
  QuizResultDoc,
  UserProfile,
  UserProgressDoc,
  UserVocabularyDoc,
  VocabularyItem,
} from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  needsEmailVerification: boolean;
  profile: UserProfile | null;
  isAdmin: boolean;
  dataLoading: boolean;
  firestoreSeeded: boolean;
  levels: LevelDoc[];
  lessons: LessonDoc[];
  progressMap: Record<string, UserProgressDoc>;
  quizResults: QuizResultDoc[];
  vocabMap: Record<string, UserVocabularyDoc>;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string) => void;
  dismissToast: (id: string) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string, level: 'A1' | 'A2' | 'B1') => Promise<void>;
  sendResetPasswordEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProfileSettings: (updates: {
    fullName?: string;
    currentLevel?: 'A1' | 'A2' | 'B1';
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
  const [progressMap, setProgressMap] = useState<Record<string, UserProgressDoc>>({});
  const [quizResults, setQuizResults] = useState<QuizResultDoc[]>([]);
  const [vocabMap, setVocabMap] = useState<Record<string, UserVocabularyDoc>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const autoSeededRef = useRef(false);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
        setFirestoreLevels([]);
        setFirestoreLessons([]);
      }
    });
    return unsub;
  }, []);

  const needsEmailVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);

  // Attach Firestore subscriptions strictly after auth is ready & user is verified
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    let cancelled = false;
    const unsubscribers: Array<() => void> = [];

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

        unsubscribers.push(
          subscribeUserProfile(firebaseUser.uid, (p) => {
            if (!cancelled && p) setProfile(p);
          })
        );
        unsubscribers.push(
          subscribeLevels(adminFlag, (lvls) => {
            if (!cancelled) setFirestoreLevels(lvls);
          })
        );
        unsubscribers.push(
          subscribeLessons(adminFlag, (lsns) => {
            if (!cancelled) {
              setFirestoreLessons(lsns);
              // Automatically seed default A1-B1 curriculum on first Admin sign-in if Firestore lessons is empty
              if (adminFlag && lsns.length === 0 && !autoSeededRef.current) {
                autoSeededRef.current = true;
                seedCurriculumToFirestore()
                  .then((res) => {
                    if (!cancelled) {
                      addToast(
                        'info',
                        `Đã tự động đồng bộ ${res.lessonsCount} bài học chuẩn A1–B1 lên Firestore.`
                      );
                    }
                  })
                  .catch(() => {
                    autoSeededRef.current = false;
                  });
              }
            }
          })
        );
        unsubscribers.push(
          subscribeUserProgress(firebaseUser.uid, (map) => {
            if (!cancelled) setProgressMap(map);
          })
        );
        unsubscribers.push(
          subscribeQuizResults(firebaseUser.uid, (results) => {
            if (!cancelled) setQuizResults(results);
          })
        );
        unsubscribers.push(
          subscribeUserVocabulary(firebaseUser.uid, (vMap) => {
            if (!cancelled) setVocabMap(vMap);
          })
        );
      } catch (err) {
        if (!cancelled) {
          addToast(
            'error',
            err instanceof Error ? 'Không thể tải dữ liệu học tập từ Firestore.' : 'Lỗi kết nối Firestore.'
          );
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
  }, [authReady, firebaseUser, addToast]);

  const firestoreSeeded = firestoreLessons.length > 0;

  const levels = useMemo<LevelDoc[]>(() => {
    if (firestoreLevels.length > 0) return firestoreLevels;
    return DEFAULT_LEVELS;
  }, [firestoreLevels]);

  const lessons = useMemo<LessonDoc[]>(() => {
    if (firestoreLessons.length > 0) return firestoreLessons;
    return ALL_DEFAULT_LESSONS;
  }, [firestoreLessons]);

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
    async (fullName: string, email: string, password: string, level: 'A1' | 'A2' | 'B1') => {
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
      const pendingLevel = (window.localStorage.getItem('english-path-pending-level') as 'A1' | 'A2' | 'B1') || 'A1';
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
      currentLevel?: 'A1' | 'A2' | 'B1';
      dailyGoalMinutes?: number;
      reminderEnabled?: boolean;
    }) => {
      if (!profile) return;
      await updateUserProfileData(profile.uid, updates);
      addToast('success', 'Đã cập nhật thông tin cá nhân.');
    },
    [profile, addToast]
  );

  const toggleVocabState = useCallback(
    async (
      lesson: LessonDoc,
      vocab: VocabularyItem,
      changes: { isFavorite?: boolean; isLearned?: boolean }
    ) => {
      if (!profile) return;
      await toggleUserVocabularyState(
        profile,
        lesson,
        vocab,
        changes,
        vocabMap[vocab.id],
        progressMap[lesson.lessonId]
      );
    },
    [profile, vocabMap, progressMap]
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
    [profile, progressMap, addToast]
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
        firestoreSeeded,
        levels,
        lessons,
        progressMap,
        quizResults,
        vocabMap,
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
