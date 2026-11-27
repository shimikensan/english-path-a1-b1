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
import {
  computeGemBreakdown,
  DEFAULT_HANGAR_STATE,
  getLessonGemReward,
  PILOT_GEAR_CATALOG,
  type GemBreakdown,
  type PilotGearSlot,
  type PilotHangarState,
} from '../data/pilotGearCatalog';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  googleProvider,
  handleFirestoreError,
  isFirestoreQuotaError,
  OperationType,
} from '../firebase';
import {
  checkIsAdmin,
  checkUserRevoked,
  ensureUserProfile,
  fetchLessonsOnce,
  fetchLevelsOnce,
  fetchPublicLeaderboardOnce,
  fetchReadingPassagesOnce,
  getCachedLeaderboardSnapshot,
  savePilotHangarState,
  seedCurriculumToFirestore,
  subscribePilotHangar,
  subscribeQuizResults,
  subscribeUserProfile,
  subscribeUserProgress,
  subscribeUserVocabulary,
  submitQuizAttempt,
  syncUserLeaderboardEntry,
  toggleUserVocabularyState,
  updateUserAccessTime,
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
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { toTimestampMillis } from '../utils/helpers';
import {
  readOfflineProfileCache,
  readOfflineVocabCache,
  readOfflineVocabFromCacheStorage,
  saveOfflineProfileCache,
  saveOfflineVocabCache,
} from '../utils/offlineVocabCache';
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
  revokedNotice: string | null;
  clearRevokedNotice: () => void;
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
  offlineVocabSyncedAt: number | null;
  isOnline: boolean;
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
  hangarState: PilotHangarState;
  gemBreakdown: GemBreakdown;
  purchasePilotGear: (itemId: string) => Promise<boolean>;
  equipPilotGear: (slot: PilotGearSlot, itemId: string) => Promise<void>;
  awardBonusGems: (amount: number, reason?: string) => void;
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
  const [revokedNotice, setRevokedNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const clearRevokedNotice = useCallback(() => setRevokedNotice(null), []);

  const [firestoreLevels, setFirestoreLevels] = useState<LevelDoc[]>([]);
  const [firestoreLessons, setFirestoreLessons] = useState<LessonDoc[]>([]);
  const [firestoreReadings, setFirestoreReadings] = useState<ReadingPassageDoc[]>([]);
  const [readingPassagesLoaded, setReadingPassagesLoaded] = useState(false);
  const [readingPassagesLoading, setReadingPassagesLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgressDoc>>({});
  const [quizResults, setQuizResults] = useState<QuizResultDoc[]>([]);
  const [vocabMap, setVocabMap] = useState<Record<string, UserVocabularyDoc>>({});
  const [offlineVocabSyncedAt, setOfflineVocabSyncedAt] = useState<number | null>(null);
  const isOnline = useOnlineStatus();
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
  const [hangarState, setHangarState] = useState<PilotHangarState>(DEFAULT_HANGAR_STATE);
  const hangarStateRef = useRef<PilotHangarState>(DEFAULT_HANGAR_STATE);
  hangarStateRef.current = hangarState;

  const autoSeededRef = useRef(false);
  const quotaToastShownRef = useRef(false);
  const lastLeaderboardSigRef = useRef('');
  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const profileRef = useRef<UserProfile | null>(null);
  const trackedAccessUidRef = useRef<string | null>(null);
  const pendingAccessSecondsRef = useRef(0);
  const lastAccessTickMsRef = useRef(Date.now());
  const lastSyncedAccessSecondsRef = useRef(0);
  const hasFlushedAccessOnceRef = useRef(false);
  const flushingAccessRef = useRef(false);

  useEffect(() => {
    profileRef.current = profile;
    if (!profile?.uid) {
      return;
    }
    if (trackedAccessUidRef.current !== profile.uid) {
      trackedAccessUidRef.current = profile.uid;
      pendingAccessSecondsRef.current = 0;
      lastAccessTickMsRef.current = Date.now();
      lastSyncedAccessSecondsRef.current = Math.max(0, Math.floor(profile.totalAccessSeconds ?? 0));
      hasFlushedAccessOnceRef.current = false;
    } else if (typeof profile.totalAccessSeconds === 'number' && Number.isFinite(profile.totalAccessSeconds)) {
      lastSyncedAccessSecondsRef.current = Math.max(
        lastSyncedAccessSecondsRef.current,
        Math.floor(profile.totalAccessSeconds)
      );
    }
  }, [profile]);

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
        setOfflineVocabSyncedAt(null);
        setProgressHydrated(false);
        setQuizHydrated(false);
        setVocabHydrated(false);
        autoSeededRef.current = false;
        lastLeaderboardSigRef.current = '';
        trackedAccessUidRef.current = null;
        pendingAccessSecondsRef.current = 0;
        lastSyncedAccessSecondsRef.current = 0;
        hasFlushedAccessOnceRef.current = false;
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
      if (!navigator.onLine) {
        return;
      }
      const code = (err as { code?: string } | null)?.code;
      if (code === 'unavailable' || code === 'failed-precondition') {
        return;
      }
      handleFirestoreError(err, op, path);
    };

    const buildFallbackProfile = (): UserProfile => {
      const cached = readOfflineProfileCache(firebaseUser.uid);
      if (cached) return cached;
      return {
        uid: firebaseUser.uid,
        fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Học viên',
        email: firebaseUser.email || '',
        currentLevel: 'A1',
        streakDays: 1,
        lastStudyDate: '',
        dailyGoalMinutes: 20,
        reminderEnabled: true,
      };
    };

    const attachSubscriptions = (isRootAdmin: boolean) => {
      unsubscribers.push(
        subscribeUserProfile(
          firebaseUser.uid,
          (p) => {
            if (cancelled) return;
            if (p) {
              setProfile(p);
              saveOfflineProfileCache(p);
            } else if (!isRootAdmin && navigator.onLine) {
              void checkUserRevoked(firebaseUser.uid).then((revoked) => {
                if (cancelled || !revoked) return;
                const msg = revoked.reason
                  ? `Tài khoản của bạn đã bị quản trị viên xóa khỏi hệ thống. Lý do: ${revoked.reason}`
                  : 'Tài khoản của bạn đã bị quản trị viên xóa khỏi hệ thống.';
                setRevokedNotice(msg);
                addToast('error', msg);
                void signOut(auth);
              });
            }
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
              // Avoid overwriting cached offline words with an empty offline snapshot
              if (Object.keys(vMap).length > 0 || navigator.onLine) {
                setVocabMap(vMap);
                const syncedAt = saveOfflineVocabCache(firebaseUser.uid, vMap);
                setOfflineVocabSyncedAt(syncedAt);
              }
              setVocabHydrated(true);
            }
          },
          handleSubError('user_vocabulary', OperationType.LIST)
        )
      );
      unsubscribers.push(
        subscribePilotHangar(
          firebaseUser.uid,
          (remoteHangar) => {
            if (!cancelled) {
              setHangarState((prev) => {
                const mergedOwned = Array.from(
                  new Set([...prev.ownedItemIds, ...remoteHangar.ownedItemIds])
                );
                const merged: PilotHangarState = {
                  ownedItemIds: mergedOwned,
                  equipped: remoteHangar.equipped,
                  spentGems: Math.max(prev.spentGems, remoteHangar.spentGems),
                  bonusGems: Math.max(prev.bonusGems, remoteHangar.bonusGems),
                };
                try {
                  window.localStorage.setItem(
                    `pilot_hangar_v1_${firebaseUser.uid}`,
                    JSON.stringify(merged)
                  );
                } catch {
                  // Ignore storage quota errors
                }
                return merged;
              });
            }
          },
          () => {
            // Keep local hangar state seamlessly if Firestore is temporarily offline or quota-limited
          }
        )
      );
    };

    const bootstrap = async () => {
      setDataLoading(true);

      // Hydrate cached 3D Pilot Hangar state immediately for instant UI responsiveness
      try {
        const rawHangar = window.localStorage.getItem(`pilot_hangar_v1_${firebaseUser.uid}`);
        if (rawHangar) {
          const parsed = JSON.parse(rawHangar) as Partial<PilotHangarState>;
          setHangarState({
            ownedItemIds: Array.isArray(parsed.ownedItemIds)
              ? Array.from(new Set([...DEFAULT_HANGAR_STATE.ownedItemIds, ...parsed.ownedItemIds]))
              : [...DEFAULT_HANGAR_STATE.ownedItemIds],
            equipped: {
              ...DEFAULT_HANGAR_STATE.equipped,
              ...(parsed.equipped || {}),
            },
            spentGems: Math.max(0, Math.floor(Number(parsed.spentGems ?? 0) || 0)),
            bonusGems: Math.max(0, Math.floor(Number(parsed.bonusGems ?? 0) || 0)),
          });
        } else {
          setHangarState(DEFAULT_HANGAR_STATE);
        }
      } catch {
        setHangarState(DEFAULT_HANGAR_STATE);
      }

      // Hydrate offline cached vocabulary & profile immediately so learned words remain viewable offline
      const cachedVocab = readOfflineVocabCache(firebaseUser.uid);
      if (cachedVocab) {
        setVocabMap(cachedVocab.vocabMap);
        setOfflineVocabSyncedAt(cachedVocab.savedAt);
        setVocabHydrated(true);
      } else {
        void readOfflineVocabFromCacheStorage(firebaseUser.uid).then((cacheSnap) => {
          if (!cancelled && cacheSnap && Object.keys(cacheSnap.vocabMap).length > 0) {
            setVocabMap((prev) => (Object.keys(prev).length > 0 ? prev : cacheSnap.vocabMap));
            setOfflineVocabSyncedAt((prev) => prev ?? cacheSnap.savedAt);
            setVocabHydrated(true);
          }
        });
      }

      const cachedProfile = readOfflineProfileCache(firebaseUser.uid);
      if (cachedProfile) {
        setProfile((prev) => prev ?? cachedProfile);
      }

      const isRootAdmin =
        firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      // If starting completely offline, hydrate immediately from local cache & Firestore IndexedDB cache
      if (!navigator.onLine) {
        setProfile((prev) => prev ?? buildFallbackProfile());
        setIsAdmin(isRootAdmin);
        attachSubscriptions(isRootAdmin);
        if (!cancelled) setDataLoading(false);
        return;
      }

      try {
        if (!isRootAdmin) {
          const revoked = await checkUserRevoked(firebaseUser.uid);
          if (cancelled) return;
          if (revoked) {
            const msg = revoked.reason
              ? `Tài khoản này đã bị quản trị viên xóa khỏi hệ thống. Lý do: ${revoked.reason}`
              : 'Tài khoản này đã bị quản trị viên xóa khỏi hệ thống.';
            setRevokedNotice(msg);
            addToast('error', msg);
            try {
              window.sessionStorage.removeItem('pilot-admin-vault-session');
            } catch {
              // Ignore storage errors
            }
            await signOut(auth);
            return;
          }
        }

        const [ensuredProfile, adminFlag] = await Promise.all([
          ensureUserProfile(firebaseUser),
          checkIsAdmin(firebaseUser),
        ]);
        if (cancelled) return;
        setProfile(ensuredProfile);
        saveOfflineProfileCache(ensuredProfile);
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

        attachSubscriptions(isRootAdmin);
      } catch (err) {
        if (!cancelled) {
          if (isFirestoreQuotaError(err)) {
            notifyQuotaExceeded();
            setProfile((prev) => prev ?? buildFallbackProfile());
          } else if (!navigator.onLine) {
            setProfile((prev) => prev ?? buildFallbackProfile());
            setIsAdmin(isRootAdmin);
            attachSubscriptions(isRootAdmin);
          } else {
            setProfile((prev) => prev ?? buildFallbackProfile());
            attachSubscriptions(isRootAdmin);
            addToast(
              'info',
              'Không thể kết nối máy chủ lúc này. Đang sử dụng dữ liệu từ vựng đã lưu trong bộ nhớ đệm.'
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

  const extendedReadingIds = useMemo(
    () => new Set(DEFAULT_READING_PASSAGES.slice(8).map((p) => p.passageId)),
    []
  );

  const hasExtendedReadingsInFirestore = useMemo(
    () => firestoreReadings.some((p) => extendedReadingIds.has(p.passageId)),
    [firestoreReadings, extendedReadingIds]
  );

  const readingPassagesSeeded =
    firestoreReadings.length > 0 && hasExtendedReadingsInFirestore;

  const readingPassages = useMemo<ReadingPassageDoc[]>(() => {
    if (firestoreReadings.length === 0) return DEFAULT_READING_PASSAGES;
    if (hasExtendedReadingsInFirestore) {
      return [...firestoreReadings].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    }
    const existingIds = new Set(firestoreReadings.map((p) => p.passageId));
    const missingExtended = DEFAULT_READING_PASSAGES.filter(
      (p) => extendedReadingIds.has(p.passageId) && !existingIds.has(p.passageId)
    );
    return [...firestoreReadings, ...missingExtended].sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999)
    );
  }, [firestoreReadings, hasExtendedReadingsInFirestore, extendedReadingIds]);

  const flushAccessTime = useCallback(
    async (minPendingSeconds: number) => {
      if (
        flushingAccessRef.current ||
        quotaExceeded ||
        !firebaseUser ||
        !firebaseUser.emailVerified
      ) {
        return;
      }
      const currentProfile = profileRef.current;
      if (!currentProfile?.uid) return;

      const pending = Math.floor(pendingAccessSecondsRef.current);
      if (pending < minPendingSeconds) return;

      const uid = currentProfile.uid;
      const baseTotal = Math.max(
        0,
        Math.floor(currentProfile.totalAccessSeconds ?? 0),
        lastSyncedAccessSecondsRef.current
      );
      const nextTotal = Math.min(315360000, baseTotal + pending);

      pendingAccessSecondsRef.current = Math.max(0, pendingAccessSecondsRef.current - pending);
      flushingAccessRef.current = true;
      try {
        await updateUserAccessTime(uid, nextTotal);
        lastSyncedAccessSecondsRef.current = Math.max(lastSyncedAccessSecondsRef.current, nextTotal);
        hasFlushedAccessOnceRef.current = true;
        setProfile((prev) =>
          prev && prev.uid === uid
            ? {
                ...prev,
                totalAccessSeconds: Math.max(prev.totalAccessSeconds ?? 0, nextTotal),
              }
            : prev
        );
      } catch (err) {
        if (isFirestoreQuotaError(err)) {
          notifyQuotaExceeded();
        } else {
          pendingAccessSecondsRef.current += pending;
        }
      } finally {
        flushingAccessRef.current = false;
      }
    },
    [quotaExceeded, firebaseUser, notifyQuotaExceeded]
  );

  // Track cumulative active visible app access duration (quota-friendly: flushes at 30s once, then every 2 minutes or on tab hide)
  useEffect(() => {
    if (quotaExceeded || !firebaseUser || !firebaseUser.emailVerified || !profile?.uid) {
      return;
    }

    lastAccessTickMsRef.current = Date.now();

    const accumulateDelta = () => {
      const now = Date.now();
      const rawDeltaSec = Math.floor((now - lastAccessTickMsRef.current) / 1000);
      lastAccessTickMsRef.current = now;
      if (rawDeltaSec > 0) {
        // Clamp each interval step so sleep/hibernation doesn't inflate active duration
        pendingAccessSecondsRef.current += Math.min(30, rawDeltaSec);
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        accumulateDelta();
        const flushThreshold = hasFlushedAccessOnceRef.current ? 120 : 30;
        if (pendingAccessSecondsRef.current >= flushThreshold) {
          void flushAccessTime(flushThreshold);
        }
      } else {
        lastAccessTickMsRef.current = Date.now();
      }
    }, 15_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        accumulateDelta();
        void flushAccessTime(15);
      } else {
        lastAccessTickMsRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quotaExceeded, firebaseUser, profile?.uid, flushAccessTime]);

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
    const quizDurationFloor = quizResults.reduce(
      (sum, r) => sum + (Number.isFinite(r.durationSeconds) ? Math.max(0, Math.floor(r.durationSeconds)) : 0),
      0
    );
    const effectiveAccessSeconds = Math.max(
      0,
      Math.floor(profile.totalAccessSeconds ?? 0),
      quizDurationFloor
    );
    const firstLoginAt =
      profile.createdAt ??
      (firebaseUser.metadata?.creationTime ? new Date(firebaseUser.metadata.creationTime) : undefined);
    const firstLoginMs = toTimestampMillis(firstLoginAt) ?? '';

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
      effectiveAccessSeconds,
      firstLoginMs,
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
      totalAccessSeconds: effectiveAccessSeconds,
      firstLoginAt,
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
            totalAccessSeconds: effectiveAccessSeconds,
            firstLoginAt,
            isPublic: true,
          };
          const exists = prev.some((e) => e.uid === profile.uid);
          const merged = exists
            ? prev.map((e) =>
                e.uid === profile.uid
                  ? {
                      ...e,
                      ...nextEntry,
                      totalAccessSeconds: Math.max(e.totalAccessSeconds ?? 0, effectiveAccessSeconds),
                      firstLoginAt: e.firstLoginAt ?? firstLoginAt,
                    }
                  : e
              )
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
    setRevokedNotice(null);
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
      setRevokedNotice(null);
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
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      const rawDeltaSec = Math.floor((now - lastAccessTickMsRef.current) / 1000);
      lastAccessTickMsRef.current = now;
      if (rawDeltaSec > 0) {
        pendingAccessSecondsRef.current += Math.min(30, rawDeltaSec);
      }
    }
    await flushAccessTime(5).catch(() => undefined);
    try {
      window.sessionStorage.removeItem('pilot-admin-vault-session');
    } catch {
      // Ignore storage errors
    }
    await signOut(auth);
    addToast('info', 'Đã đăng xuất khỏi tài khoản.');
  }, [addToast, flushAccessTime]);

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
      if (!navigator.onLine) {
        addToast(
          'info',
          'Bạn đang ở chế độ ngoại tuyến. Bạn có thể xem lại toàn bộ từ vựng đã học; việc cập nhật trạng thái mới cần kết nối mạng.'
        );
        return;
      }
      recordStudyActivity();
      const wasLearned = Boolean(vocabMap[vocab.id]?.isLearned);
      await toggleUserVocabularyState(
        profile,
        lesson,
        vocab,
        changes,
        vocabMap[vocab.id],
        progressMap[lesson.lessonId]
      );
      if (changes.isLearned && !wasLearned) {
        addToast('success', `Đã thuộc "${vocab.word}" · +3 Ngọc kiến thức!`);
      }
    },
    [profile, vocabMap, progressMap, recordStudyActivity, addToast]
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
      const wasCompleted = Boolean(progressMap[params.lesson.lessonId]?.lessonCompleted);
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
      const quizGems =
        Math.round((Math.max(0, Math.min(100, params.score)) / 100) * 20) +
        (params.score >= 100 ? 8 : 0);
      const completedNow = !wasCompleted && params.score >= 60;
      const lessonBonus = completedNow ? getLessonGemReward(params.lesson) : 0;
      const totalGained = quizGems + lessonBonus;
      addToast(
        'success',
        completedNow
          ? `Hoàn thành bài học (${params.score}%) · Nhận +${totalGained} Ngọc kiến thức!`
          : `Đã lưu kết quả kiểm tra (${params.score}%) · Nhận +${quizGems} Ngọc!`
      );
      return id;
    },
    [profile, progressMap, addToast, recordStudyActivity]
  );

  const gemBreakdown = useMemo(
    () =>
      computeGemBreakdown({
        profile,
        lessons,
        progressMap,
        vocabMap,
        quizResults,
        bonusGems: hangarState.bonusGems,
        spentGems: hangarState.spentGems,
      }),
    [profile, lessons, progressMap, vocabMap, quizResults, hangarState.bonusGems, hangarState.spentGems]
  );

  const persistHangar = useCallback(
    async (uid: string, next: PilotHangarState) => {
      setHangarState(next);
      try {
        window.localStorage.setItem(`pilot_hangar_v1_${uid}`, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      if (!navigator.onLine) return;
      try {
        await savePilotHangarState(uid, next);
      } catch (err) {
        if (isFirestoreQuotaError(err)) {
          notifyQuotaExceeded();
        }
      }
    },
    [notifyQuotaExceeded]
  );

  const purchasePilotGear = useCallback(
    async (itemId: string): Promise<boolean> => {
      const uid = profile?.uid || firebaseUser?.uid;
      if (!uid) return false;
      const item = PILOT_GEAR_CATALOG.find((g) => g.id === itemId);
      if (!item) return false;

      const current = hangarStateRef.current;
      if (current.ownedItemIds.includes(item.id)) {
        return true;
      }

      if (gemBreakdown.availableGems < item.priceGems) {
        addToast(
          'info',
          `Bạn cần thêm ${item.priceGems - gemBreakdown.availableGems} Ngọc để mở khóa "${item.nameVi}".`
        );
        return false;
      }

      const next: PilotHangarState = {
        ownedItemIds: Array.from(new Set([...current.ownedItemIds, item.id])),
        equipped: {
          ...current.equipped,
          [item.slot]: item.id,
        },
        spentGems: current.spentGems + item.priceGems,
        bonusGems: current.bonusGems,
      };
      await persistHangar(uid, next);
      addToast('success', `Đã mở khóa và trang bị "${item.nameVi}" (-${item.priceGems} Ngọc)!`);
      return true;
    },
    [profile?.uid, firebaseUser?.uid, gemBreakdown.availableGems, persistHangar, addToast]
  );

  const equipPilotGear = useCallback(
    async (slot: PilotGearSlot, itemId: string): Promise<void> => {
      const uid = profile?.uid || firebaseUser?.uid;
      if (!uid) return;
      const current = hangarStateRef.current;
      if (!current.ownedItemIds.includes(itemId)) return;
      const next: PilotHangarState = {
        ...current,
        equipped: {
          ...current.equipped,
          [slot]: itemId,
        },
      };
      await persistHangar(uid, next);
    },
    [profile?.uid, firebaseUser?.uid, persistHangar]
  );

  const awardBonusGems = useCallback(
    (amount: number, reason?: string) => {
      const uid = profile?.uid || firebaseUser?.uid;
      const safeAdd = Math.max(0, Math.min(200, Math.floor(amount)));
      if (!uid || safeAdd <= 0) return;
      const current = hangarStateRef.current;
      const next: PilotHangarState = {
        ...current,
        bonusGems: current.bonusGems + safeAdd,
      };
      void persistHangar(uid, next);
      if (reason) {
        addToast('success', `${reason} (+${safeAdd} Ngọc)`);
      }
    },
    [profile?.uid, firebaseUser?.uid, persistHangar, addToast]
  );

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        authReady,
        needsEmailVerification,
        revokedNotice,
        clearRevokedNotice,
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
        offlineVocabSyncedAt,
        isOnline,
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
        hangarState,
        gemBreakdown,
        purchasePilotGear,
        equipPilotGear,
        awardBonusGems,
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
