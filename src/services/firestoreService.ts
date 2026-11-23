import { sendPasswordResetEmail, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ALL_DEFAULT_LESSONS,
  DEFAULT_LEVELS,
  DEFAULT_READING_PASSAGES,
  getDefaultLessonsByLevel,
} from '../data';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  isFirestoreQuotaError,
  OperationType,
} from '../firebase';
import type {
  AdminRecord,
  AdminSecurityVaultDoc,
  ClubAvatarGender,
  ClubMemberDoc,
  ClubMessageDoc,
  FeedbackCategory,
  FeedbackStatus,
  LeaderboardEntryDoc,
  LearnerCEFRLevel,
  LessonDoc,
  LevelDoc,
  QuizRating,
  QuizResultDoc,
  ReadingPassageDoc,
  RevokedUserDoc,
  UserFeedbackDoc,
  UserProfile,
  UserProgressDoc,
  UserVocabularyDoc,
  VocabularyItem,
} from '../types';
import { calculateUpdatedStreak, sanitizeId, truncate } from '../utils/helpers';

// --- Lightweight Local TTL Cache (cuts repeat Firestore read units on reloads) ---

const CACHE_KEY_LEVELS = 'pilot_fs_cache_levels_v1';
const CACHE_KEY_LESSONS = 'pilot_fs_cache_lessons_v1';
const CACHE_KEY_LEADERBOARD = 'pilot_fs_cache_leaderboard_v1';
const CACHE_KEY_READINGS = 'pilot_fs_cache_readings_v1';

const CURRICULUM_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const LEADERBOARD_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

interface CachedPayload<T> {
  savedAt: number;
  data: T;
}

function readLocalCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || typeof parsed.savedAt !== 'number' || !Array.isArray(parsed.data)) {
      return null;
    }
    if (Date.now() - parsed.savedAt > maxAgeMs) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function readStaleLocalCache<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || !Array.isArray(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeLocalCache<T>(key: string, data: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearCurriculumCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY_LEVELS);
    window.localStorage.removeItem(CACHE_KEY_LESSONS);
  } catch {
    // Ignore storage errors
  }
}

export function clearLeaderboardCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY_LEADERBOARD);
  } catch {
    // Ignore storage errors
  }
}

export function getCachedLeaderboardSnapshot(): LeaderboardEntryDoc[] {
  return readStaleLocalCache<LeaderboardEntryDoc[]>(CACHE_KEY_LEADERBOARD) ?? [];
}

function sortLeaderboardEntries(entries: LeaderboardEntryDoc[]): LeaderboardEntryDoc[] {
  return [...entries].sort((a, b) => {
    if (b.completionPercent !== a.completionPercent) {
      return b.completionPercent - a.completionPercent;
    }
    if (b.completedLessons !== a.completedLessons) {
      return b.completedLessons - a.completedLessons;
    }
    if (b.learnedVocabCount !== a.learnedVocabCount) {
      return b.learnedVocabCount - a.learnedVocabCount;
    }
    if (b.averageQuizScore !== a.averageQuizScore) {
      return b.averageQuizScore - a.averageQuizScore;
    }
    return b.streakDays - a.streakDays;
  });
}

// --- User Profile & RBAC ---

export async function ensureUserProfile(
  firebaseUser: User,
  preferredName?: string,
  preferredLevel: LearnerCEFRLevel = 'A1'
): Promise<UserProfile> {
  const path = `users/${firebaseUser.uid}`;
  const ref = doc(db, 'users', firebaseUser.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { lastLogin: serverTimestamp() });
      const data = snap.data() as UserProfile;
      return data;
    }

    const displayName = truncate(
      preferredName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Học viên',
      100
    );
    const email = truncate(firebaseUser.email || '', 200);

    const payload = {
      uid: firebaseUser.uid,
      fullName: displayName || 'Học viên',
      email,
      currentLevel: preferredLevel,
      streakDays: 1,
      lastStudyDate: '',
      dailyGoalMinutes: 20,
      reminderEnabled: true,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    await setDoc(ref, payload);
    return {
      ...payload,
      createdAt: new Date(),
      lastLogin: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfileData(
  uid: string,
  updates: {
    fullName?: string;
    currentLevel?: LearnerCEFRLevel;
    dailyGoalMinutes?: number;
    reminderEnabled?: boolean;
  }
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  const payload: Record<string, unknown> = {
    lastLogin: serverTimestamp(),
  };
  if (updates.fullName !== undefined) {
    payload.fullName = truncate(updates.fullName, 100) || 'Học viên';
  }
  if (updates.currentLevel !== undefined) {
    payload.currentLevel = updates.currentLevel;
  }
  if (updates.dailyGoalMinutes !== undefined) {
    payload.dailyGoalMinutes = Math.min(240, Math.max(5, Math.round(updates.dailyGoalMinutes)));
  }
  if (updates.reminderEnabled !== undefined) {
    payload.reminderEnabled = Boolean(updates.reminderEnabled);
  }

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordStudyActivityStreak(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  const ref = doc(db, 'users', profile.uid);
  const next = calculateUpdatedStreak(profile.streakDays, profile.lastStudyDate);
  const safeStreak = Math.min(10000, Math.max(0, Math.round(next.streakDays)));
  if (next.lastStudyDate === profile.lastStudyDate && safeStreak === profile.streakDays) {
    return;
  }
  try {
    await updateDoc(ref, {
      streakDays: safeStreak,
      lastStudyDate: truncate(next.lastStudyDate, 20),
      lastLogin: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function checkIsAdmin(firebaseUser: User): Promise<boolean> {
  if (!firebaseUser.emailVerified) return false;
  if (firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const path = `admins/${firebaseUser.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', firebaseUser.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

// --- Levels & Lessons Fetching & Subscriptions ---

export async function fetchLevelsOnce(
  isAdmin: boolean,
  forceRefresh = false
): Promise<LevelDoc[]> {
  if (!forceRefresh && !isAdmin) {
    const cached = readLocalCache<LevelDoc[]>(CACHE_KEY_LEVELS, CURRICULUM_CACHE_TTL_MS);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const path = 'levels';
  const q = isAdmin
    ? query(collection(db, path))
    : query(collection(db, path), where('isPublished', '==', true));

  try {
    const snapshot = await getDocs(q);
    const items = snapshot.docs
      .map((d) => d.data() as LevelDoc)
      .sort((a, b) => a.order - b.order);
    if (!isAdmin && items.length > 0) {
      writeLocalCache(CACHE_KEY_LEVELS, items);
    }
    return items;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      const stale = readStaleLocalCache<LevelDoc[]>(CACHE_KEY_LEVELS);
      if (stale && stale.length > 0) {
        return stale;
      }
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchLessonsOnce(
  isAdmin: boolean,
  forceRefresh = false
): Promise<LessonDoc[]> {
  if (!forceRefresh && !isAdmin) {
    const cached = readLocalCache<LessonDoc[]>(CACHE_KEY_LESSONS, CURRICULUM_CACHE_TTL_MS);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const path = 'lessons';
  const q = isAdmin
    ? query(collection(db, path))
    : query(collection(db, path), where('isPublished', '==', true));

  try {
    const snapshot = await getDocs(q);
    const items = snapshot.docs
      .map((d) => d.data() as LessonDoc)
      .sort((a, b) => a.order - b.order);
    if (!isAdmin && items.length > 0) {
      writeLocalCache(CACHE_KEY_LESSONS, items);
    }
    return items;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      const stale = readStaleLocalCache<LessonDoc[]>(CACHE_KEY_LESSONS);
      if (stale && stale.length > 0) {
        return stale;
      }
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeLevels(
  isAdmin: boolean,
  onData: (levels: LevelDoc[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'levels';
  const q = isAdmin
    ? query(collection(db, path))
    : query(collection(db, path), where('isPublished', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as LevelDoc)
        .sort((a, b) => a.order - b.order);
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export function subscribeLessons(
  isAdmin: boolean,
  onData: (lessons: LessonDoc[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'lessons';
  const q = isAdmin
    ? query(collection(db, path))
    : query(collection(db, path), where('isPublished', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as LessonDoc)
        .sort((a, b) => a.order - b.order);
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

// --- User Progress, Vocabulary & Quiz Results Subscriptions ---

export function subscribeUserProgress(
  uid: string,
  onData: (progressMap: Record<string, UserProgressDoc>) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'user_progress';
  const q = query(collection(db, path), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, UserProgressDoc> = {};
      snapshot.docs.forEach((d) => {
        const item = { id: d.id, ...(d.data() as UserProgressDoc) };
        map[item.lessonId] = item;
      });
      onData(map);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export function subscribeQuizResults(
  uid: string,
  onData: (results: QuizResultDoc[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'quiz_results';
  const q = query(collection(db, path), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as QuizResultDoc) }))
        .sort((a, b) => {
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
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export function subscribeUserVocabulary(
  uid: string,
  onData: (vocabMap: Record<string, UserVocabularyDoc>) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'user_vocabulary';
  const q = query(collection(db, path), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, UserVocabularyDoc> = {};
      snapshot.docs.forEach((d) => {
        const item = { id: d.id, ...(d.data() as UserVocabularyDoc) };
        map[item.vocabularyId] = item;
      });
      onData(map);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

// --- Learner Progress Mutations ---

export async function toggleUserVocabularyState(
  profile: UserProfile,
  lesson: LessonDoc,
  vocab: VocabularyItem,
  changes: { isFavorite?: boolean; isLearned?: boolean },
  existingVocabDoc?: UserVocabularyDoc,
  existingProgressDoc?: UserProgressDoc
): Promise<void> {
  const uid = profile.uid;
  const vocabDocId = `${uid}_${vocab.id}`;
  const vocabPath = `user_vocabulary/${vocabDocId}`;
  const vocabRef = doc(db, 'user_vocabulary', vocabDocId);

  const nextFavorite = changes.isFavorite ?? existingVocabDoc?.isFavorite ?? false;
  const nextLearned = changes.isLearned ?? existingVocabDoc?.isLearned ?? false;

  try {
    const snap = await getDoc(vocabRef);
    if (snap.exists()) {
      await updateDoc(vocabRef, {
        isFavorite: nextFavorite,
        isLearned: nextLearned,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(vocabRef, {
        uid,
        vocabularyId: vocab.id,
        lessonId: lesson.lessonId,
        levelId: lesson.levelId,
        word: truncate(vocab.word, 100),
        ipa: truncate(vocab.ipa, 100),
        partOfSpeech: truncate(vocab.partOfSpeech, 40),
        meaningVi: truncate(vocab.meaningVi, 250),
        exampleEn: truncate(vocab.exampleEn, 350),
        exampleVi: truncate(vocab.exampleVi, 350),
        isFavorite: nextFavorite,
        isLearned: nextLearned,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, vocabPath);
  }

  // Sync learned vocabulary array on user_progress when isLearned toggles
  if (changes.isLearned !== undefined) {
    const progressId = `${uid}_${lesson.lessonId}`;
    const progressPath = `user_progress/${progressId}`;
    const progressRef = doc(db, 'user_progress', progressId);
    const prevLearned = new Set(existingProgressDoc?.vocabularyLearned || []);
    if (nextLearned) {
      prevLearned.add(vocab.id);
    } else {
      prevLearned.delete(vocab.id);
    }
    const nextLearnedList = Array.from(prevLearned).slice(0, 40);

    try {
      const pSnap = await getDoc(progressRef);
      if (pSnap.exists()) {
        await updateDoc(progressRef, {
          vocabularyLearned: nextLearnedList,
          lastStudyAt: serverTimestamp(),
        });
      } else {
        await setDoc(progressRef, {
          uid,
          lessonId: lesson.lessonId,
          levelId: lesson.levelId,
          vocabularyLearned: nextLearnedList,
          lessonCompleted: false,
          quizBestScore: 0,
          quizAttempts: 0,
          createdAt: serverTimestamp(),
          lastStudyAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, progressPath);
    }

    await recordStudyActivityStreak(profile);
  }
}

export async function submitQuizAttempt(params: {
  profile: UserProfile;
  lesson: LessonDoc;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  rating: QuizRating;
  durationSeconds: number;
  existingProgress?: UserProgressDoc;
}): Promise<string> {
  const {
    profile,
    lesson,
    score,
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    rating,
    durationSeconds,
    existingProgress,
  } = params;

  const uid = profile.uid;
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));
  const resultId = `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const resultPath = `quiz_results/${resultId}`;

  try {
    await setDoc(doc(db, 'quiz_results', resultId), {
      uid,
      lessonId: lesson.lessonId,
      lessonTitle: truncate(lesson.title, 160) || 'Bài học',
      levelId: lesson.levelId,
      score: safeScore,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      rating,
      durationSeconds: Math.min(7200, Math.max(0, Math.round(durationSeconds))),
      completedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, resultPath);
  }

  const progressId = `${uid}_${lesson.lessonId}`;
  const progressPath = `user_progress/${progressId}`;
  const progressRef = doc(db, 'user_progress', progressId);
  const bestScore = Math.max(existingProgress?.quizBestScore ?? 0, safeScore);
  const attempts = Math.min(1000, (existingProgress?.quizAttempts ?? 0) + 1);

  try {
    const pSnap = await getDoc(progressRef);
    if (pSnap.exists()) {
      const serverData = pSnap.data() as Partial<UserProgressDoc>;
      const serverBest = Math.min(100, Math.max(serverData.quizBestScore ?? 0, bestScore));
      const serverAttempts = Math.min(1000, Math.max(attempts, (serverData.quizAttempts ?? 0) + 1));
      await updateDoc(progressRef, {
        lessonCompleted: true,
        quizBestScore: serverBest,
        quizAttempts: serverAttempts,
        lastStudyAt: serverTimestamp(),
      });
    } else {
      await setDoc(progressRef, {
        uid,
        lessonId: lesson.lessonId,
        levelId: lesson.levelId,
        vocabularyLearned: (existingProgress?.vocabularyLearned ?? []).slice(0, 40),
        lessonCompleted: true,
        quizBestScore: bestScore,
        quizAttempts: attempts,
        createdAt: serverTimestamp(),
        lastStudyAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, progressPath);
  }

  await recordStudyActivityStreak(profile);

  return resultId;
}

// --- Admin Curriculum & Seeding Mutations ---

export async function seedCurriculumToFirestore(
  targetLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'ESP'
): Promise<{
  levelsCount: number;
  lessonsCount: number;
}> {
  const levelsToSeed = targetLevel
    ? DEFAULT_LEVELS.filter((l) => l.levelId === targetLevel)
    : DEFAULT_LEVELS;
  const lessonsToSeed = targetLevel
    ? getDefaultLessonsByLevel(targetLevel)
    : ALL_DEFAULT_LESSONS;

  try {
    // Write levels first
    const levelBatch = writeBatch(db);
    for (const lvl of levelsToSeed) {
      const ref = doc(db, 'levels', lvl.levelId);
      levelBatch.set(ref, {
        levelId: lvl.levelId,
        name: truncate(lvl.name, 100),
        subtitle: truncate(lvl.subtitle, 150),
        description: truncate(lvl.description, 600),
        order: lvl.order,
        isPublished: true,
        updatedAt: serverTimestamp(),
      });
    }
    await levelBatch.commit();

    // Write lessons in batches of 10 to stay well under Firestore write payload limits
    for (let i = 0; i < lessonsToSeed.length; i += 10) {
      const chunk = lessonsToSeed.slice(i, i + 10);
      const batch = writeBatch(db);
      for (const lesson of chunk) {
        const ref = doc(db, 'lessons', lesson.lessonId);
        const existing = await getDoc(ref);
        if (existing.exists()) {
          batch.update(ref, {
            levelId: lesson.levelId,
            topic: truncate(lesson.topic, 120),
            topicOrder: lesson.topicOrder,
            title: truncate(lesson.title, 160),
            description: truncate(lesson.description, 600),
            order: lesson.order,
            estimatedMinutes: lesson.estimatedMinutes,
            isPublished: lesson.isPublished,
            vocabulary: lesson.vocabulary.slice(0, 40),
            sentencePatterns: lesson.sentencePatterns.slice(0, 20),
            grammar: lesson.grammar,
            quiz: lesson.quiz.slice(0, 40),
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(ref, {
            lessonId: lesson.lessonId,
            levelId: lesson.levelId,
            topic: truncate(lesson.topic, 120),
            topicOrder: lesson.topicOrder,
            title: truncate(lesson.title, 160),
            description: truncate(lesson.description, 600),
            order: lesson.order,
            estimatedMinutes: lesson.estimatedMinutes,
            isPublished: lesson.isPublished,
            vocabulary: lesson.vocabulary.slice(0, 40),
            sentencePatterns: lesson.sentencePatterns.slice(0, 20),
            grammar: lesson.grammar,
            quiz: lesson.quiz.slice(0, 40),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
    }

    clearCurriculumCache();
    return { levelsCount: levelsToSeed.length, lessonsCount: lessonsToSeed.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'lessons');
  }
}

export async function adminSaveLevel(level: Omit<LevelDoc, 'updatedAt' | 'bannerImage'>): Promise<void> {
  const cleanId = sanitizeId(level.levelId, 32).toUpperCase();
  const path = `levels/${cleanId}`;
  const ref = doc(db, 'levels', cleanId);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        name: truncate(level.name, 100),
        subtitle: truncate(level.subtitle, 150),
        description: truncate(level.description, 600),
        order: Math.max(1, Math.min(100, Number(level.order) || 1)),
        isPublished: Boolean(level.isPublished),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        levelId: cleanId,
        name: truncate(level.name, 100),
        subtitle: truncate(level.subtitle, 150),
        description: truncate(level.description, 600),
        order: Math.max(1, Math.min(100, Number(level.order) || 1)),
        isPublished: Boolean(level.isPublished),
        updatedAt: serverTimestamp(),
      });
    }
    clearCurriculumCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminDeleteLevel(levelId: string): Promise<void> {
  const path = `levels/${levelId}`;
  try {
    await deleteDoc(doc(db, 'levels', levelId));
    clearCurriculumCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminSaveLesson(lesson: LessonDoc): Promise<void> {
  const cleanLessonId = sanitizeId(lesson.lessonId, 80);
  const path = `lessons/${cleanLessonId}`;
  const ref = doc(db, 'lessons', cleanLessonId);
  try {
    const existing = await getDoc(ref);
    const editableFields = {
      levelId: sanitizeId(lesson.levelId, 32).toUpperCase(),
      topic: truncate(lesson.topic, 120),
      topicOrder: Math.max(1, Math.min(100, Number(lesson.topicOrder) || 1)),
      title: truncate(lesson.title, 160),
      description: truncate(lesson.description, 600),
      order: Math.max(1, Math.min(500, Number(lesson.order) || 1)),
      estimatedMinutes: Math.max(5, Math.min(180, Number(lesson.estimatedMinutes) || 20)),
      isPublished: Boolean(lesson.isPublished),
      vocabulary: lesson.vocabulary.slice(0, 40),
      sentencePatterns: lesson.sentencePatterns.slice(0, 20),
      grammar: lesson.grammar,
      quiz: lesson.quiz.slice(0, 40),
      updatedAt: serverTimestamp(),
    };
    if (existing.exists()) {
      await updateDoc(ref, editableFields);
    } else {
      await setDoc(ref, {
        lessonId: cleanLessonId,
        ...editableFields,
        createdAt: serverTimestamp(),
      });
    }
    clearCurriculumCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminDeleteLesson(lessonId: string): Promise<void> {
  const path = `lessons/${lessonId}`;
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
    clearCurriculumCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminListAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => {
      const data = d.data() as Partial<UserProfile>;
      return {
        uid: d.id,
        fullName: (typeof data.fullName === 'string' && data.fullName.trim()) || data.email?.split('@')[0] || 'Phi công tập sự',
        email: typeof data.email === 'string' ? data.email : '',
        currentLevel:
          data.currentLevel === 'A2' ||
          data.currentLevel === 'B1' ||
          data.currentLevel === 'B2' ||
          data.currentLevel === 'C1'
            ? data.currentLevel
            : 'A1',
        streakDays: Number.isFinite(Number(data.streakDays)) ? Math.max(0, Math.round(Number(data.streakDays))) : 1,
        lastStudyDate: typeof data.lastStudyDate === 'string' ? data.lastStudyDate : '',
        dailyGoalMinutes: Number.isFinite(Number(data.dailyGoalMinutes)) ? Number(data.dailyGoalMinutes) : 20,
        reminderEnabled: typeof data.reminderEnabled === 'boolean' ? data.reminderEnabled : true,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function adminListAllQuizResults(): Promise<QuizResultDoc[]> {
  const path = 'quiz_results';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizResultDoc) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function adminListAdmins(): Promise<AdminRecord[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as AdminRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function adminGrantAdmin(
  targetUser: { uid: string; email: string },
  grantedByUid: string
): Promise<void> {
  const path = `admins/${targetUser.uid}`;
  try {
    await setDoc(doc(db, 'admins', targetUser.uid), {
      uid: targetUser.uid,
      email: truncate(targetUser.email, 200),
      grantedBy: grantedByUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function adminRevokeAdmin(targetUid: string): Promise<void> {
  const path = `admins/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'admins', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Admin Security Vault (Secondary Management Password) ---

export async function adminGetSecurityVault(): Promise<AdminSecurityVaultDoc | null> {
  const path = 'admin_security/vault';
  try {
    const snap = await getDoc(doc(db, 'admin_security', 'vault'));
    if (!snap.exists()) return null;
    return snap.data() as AdminSecurityVaultDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function adminSaveSecurityVault(params: {
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
  saltHex: string;
  hashHex: string;
  adminUid: string;
  adminEmail: string;
}): Promise<AdminSecurityVaultDoc> {
  const path = 'admin_security/vault';
  const ref = doc(db, 'admin_security', 'vault');
  try {
    const existing = await getDoc(ref);
    const cleanEmail = truncate(params.adminEmail, 200);
    if (existing.exists()) {
      await updateDoc(ref, {
        algorithm: params.algorithm,
        iterations: params.iterations,
        saltHex: params.saltHex,
        hashHex: params.hashHex,
        updatedBy: params.adminUid,
        updatedByEmail: cleanEmail,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        configId: 'vault',
        algorithm: params.algorithm,
        iterations: params.iterations,
        saltHex: params.saltHex,
        hashHex: params.hashHex,
        updatedBy: params.adminUid,
        updatedByEmail: cleanEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    const fresh = await getDoc(ref);
    return fresh.data() as AdminSecurityVaultDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminResetSecurityVault(): Promise<void> {
  const path = 'admin_security/vault';
  try {
    await deleteDoc(doc(db, 'admin_security', 'vault'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Public Learner Completion Leaderboard (PII-Free Projection) ---

export async function fetchPublicLeaderboardOnce(
  forceRefresh = false
): Promise<{ entries: LeaderboardEntryDoc[]; fromCache: boolean }> {
  if (!forceRefresh) {
    const cached = readLocalCache<LeaderboardEntryDoc[]>(
      CACHE_KEY_LEADERBOARD,
      LEADERBOARD_CACHE_TTL_MS
    );
    if (cached) {
      return { entries: sortLeaderboardEntries(cached), fromCache: true };
    }
  }

  const path = 'leaderboard';
  const q = query(collection(db, path), where('isPublic', '==', true));

  try {
    const snapshot = await getDocs(q);
    const items = sortLeaderboardEntries(
      snapshot.docs.map((d) => d.data() as LeaderboardEntryDoc)
    );
    writeLocalCache(CACHE_KEY_LEADERBOARD, items);
    return { entries: items, fromCache: false };
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribePublicLeaderboard(
  onData: (entries: LeaderboardEntryDoc[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'leaderboard';
  const q = query(collection(db, path), where('isPublic', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = sortLeaderboardEntries(
        snapshot.docs.map((d) => d.data() as LeaderboardEntryDoc)
      );
      writeLocalCache(CACHE_KEY_LEADERBOARD, items);
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export async function syncUserLeaderboardEntry(entry: {
  uid: string;
  displayName: string;
  currentLevel: LearnerCEFRLevel;
  completedLessons: number;
  totalLessons: number;
  completionPercent: number;
  learnedVocabCount: number;
  averageQuizScore: number;
  streakDays: number;
  isPublic?: boolean;
}): Promise<void> {
  const path = `leaderboard/${entry.uid}`;
  const ref = doc(db, 'leaderboard', entry.uid);

  const safeLevel: LearnerCEFRLevel =
    entry.currentLevel === 'A2' ||
    entry.currentLevel === 'B1' ||
    entry.currentLevel === 'B2' ||
    entry.currentLevel === 'C1'
      ? entry.currentLevel
      : 'A1';

  const mutableFields = {
    displayName: truncate(entry.displayName.trim() || 'Phi công tập sự', 100) || 'Phi công tập sự',
    currentLevel: safeLevel,
    completedLessons: Math.max(0, Math.min(500, Math.round(entry.completedLessons))),
    totalLessons: Math.max(1, Math.min(500, Math.round(entry.totalLessons))),
    completionPercent: Math.max(0, Math.min(100, Math.round(entry.completionPercent))),
    learnedVocabCount: Math.max(0, Math.min(5000, Math.round(entry.learnedVocabCount))),
    averageQuizScore: Math.max(0, Math.min(100, Math.round(entry.averageQuizScore))),
    streakDays: Math.max(0, Math.min(10000, Math.round(entry.streakDays))),
    isPublic: entry.isPublic ?? true,
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, mutableFields);
    } else {
      await setDoc(ref, {
        uid: entry.uid,
        ...mutableFields,
      });
    }
    clearLeaderboardCache();
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

const VALID_FIRESTORE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export async function adminSyncAllUsersLeaderboard(
  publishedLessons: LessonDoc[]
): Promise<{ syncedUsers: number; removedOrphans: number; totalLessons: number }> {
  const effectiveLessons =
    publishedLessons.length > 0
      ? publishedLessons.filter((l) => l.isPublished !== false)
      : ALL_DEFAULT_LESSONS;

  const totalLessons = Math.max(1, Math.min(500, effectiveLessons.length));
  const totalVocab = Math.max(
    1,
    effectiveLessons.reduce((sum, l) => sum + l.vocabulary.length, 0)
  );
  const validLessonIds = new Set(effectiveLessons.map((l) => l.lessonId));

  try {
    const [usersSnap, progressSnap, vocabSnap, quizSnap, leaderboardSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'user_progress')),
      getDocs(collection(db, 'user_vocabulary')),
      getDocs(collection(db, 'quiz_results')),
      getDocs(collection(db, 'leaderboard')),
    ]);

    const completedLessonsByUid = new Map<string, Set<string>>();
    progressSnap.docs.forEach((d) => {
      const p = d.data() as Partial<UserProgressDoc>;
      if (!p.uid || !p.lessonCompleted || !p.lessonId) return;
      if (validLessonIds.size > 0 && !validLessonIds.has(p.lessonId)) return;
      let set = completedLessonsByUid.get(p.uid);
      if (!set) {
        set = new Set<string>();
        completedLessonsByUid.set(p.uid, set);
      }
      set.add(p.lessonId);
    });

    const learnedVocabByUid = new Map<string, number>();
    vocabSnap.docs.forEach((d) => {
      const v = d.data() as Partial<UserVocabularyDoc>;
      if (!v.uid || !v.isLearned) return;
      learnedVocabByUid.set(v.uid, (learnedVocabByUid.get(v.uid) ?? 0) + 1);
    });

    const quizScoresByUid = new Map<string, { sum: number; count: number }>();
    quizSnap.docs.forEach((d) => {
      const q = d.data() as Partial<QuizResultDoc>;
      if (!q.uid || typeof q.score !== 'number' || !Number.isFinite(q.score)) return;
      const cur = quizScoresByUid.get(q.uid) ?? { sum: 0, count: 0 };
      cur.sum += q.score;
      cur.count += 1;
      quizScoresByUid.set(q.uid, cur);
    });

    const existingLeaderboardMap = new Map<string, LeaderboardEntryDoc>();
    leaderboardSnap.docs.forEach((d) => {
      existingLeaderboardMap.set(d.id, d.data() as LeaderboardEntryDoc);
    });

    const validUserDocs = usersSnap.docs
      .filter((d) => VALID_FIRESTORE_ID_REGEX.test(d.id))
      .map((d) => ({ id: d.id, data: d.data() as Partial<UserProfile> }));

    const validUserIds = new Set(validUserDocs.map((u) => u.id));
    let syncedUsers = 0;

    const buildEntryPayload = (uid: string, user: Partial<UserProfile>) => {
      const completedLessons = Math.min(500, completedLessonsByUid.get(uid)?.size ?? 0);
      const learnedVocabCount = Math.min(5000, learnedVocabByUid.get(uid) ?? 0);
      const quizAgg = quizScoresByUid.get(uid);
      const averageQuizScore =
        quizAgg && quizAgg.count > 0
          ? Math.min(100, Math.max(0, Math.round(quizAgg.sum / quizAgg.count)))
          : 0;

      const lessonRatio = Math.min(1, completedLessons / totalLessons);
      const vocabRatio = Math.min(1, learnedVocabCount / totalVocab);
      const completionPercent = Math.min(
        100,
        Math.max(0, Math.round((lessonRatio * 0.6 + vocabRatio * 0.4) * 100))
      );

      const safeLevel: LearnerCEFRLevel =
        user.currentLevel === 'A2' ||
        user.currentLevel === 'B1' ||
        user.currentLevel === 'B2' ||
        user.currentLevel === 'C1'
          ? user.currentLevel
          : 'A1';

      const rawName =
        (typeof user.fullName === 'string' && user.fullName.trim()) ||
        (typeof user.email === 'string' && user.email.split('@')[0]?.trim()) ||
        'Phi công tập sự';
      const safeName = truncate(rawName, 100) || 'Phi công tập sự';

      const rawStreak = Number(user.streakDays);
      const safeStreak = Number.isFinite(rawStreak)
        ? Math.max(0, Math.min(10000, Math.round(rawStreak)))
        : 1;

      return {
        displayName: safeName,
        currentLevel: safeLevel,
        completedLessons,
        totalLessons,
        completionPercent,
        learnedVocabCount,
        averageQuizScore,
        streakDays: safeStreak,
        isPublic: true,
        updatedAt: serverTimestamp(),
      };
    };

    // Only upsert user accounts that are missing or whose fields actually changed
    const docsToWrite = validUserDocs.filter(({ id: uid, data: user }) => {
      const existing = existingLeaderboardMap.get(uid);
      if (!existing || existing.uid !== uid) return true;
      const next = buildEntryPayload(uid, user);
      return (
        existing.displayName !== next.displayName ||
        existing.currentLevel !== next.currentLevel ||
        existing.completedLessons !== next.completedLessons ||
        existing.totalLessons !== next.totalLessons ||
        existing.completionPercent !== next.completionPercent ||
        existing.learnedVocabCount !== next.learnedVocabCount ||
        existing.averageQuizScore !== next.averageQuizScore ||
        existing.streakDays !== next.streakDays ||
        existing.isPublic !== true
      );
    });

    syncedUsers = validUserDocs.length - docsToWrite.length;

    // Upsert changed/missing user accounts in batches of 150, with resilient per-doc fallback
    for (let i = 0; i < docsToWrite.length; i += 150) {
      const chunk = docsToWrite.slice(i, i + 150);
      const batch = writeBatch(db);

      for (const { id: uid, data: user } of chunk) {
        const ref = doc(db, 'leaderboard', uid);
        const existingEntry = existingLeaderboardMap.get(uid);
        const mutableFields = buildEntryPayload(uid, user);

        if (existingEntry && existingEntry.uid === uid) {
          batch.update(ref, mutableFields);
        } else {
          batch.set(ref, {
            uid,
            ...mutableFields,
          });
        }
      }

      try {
        await batch.commit();
        syncedUsers += chunk.length;
      } catch (batchErr) {
        if (isFirestoreQuotaError(batchErr)) {
          throw batchErr;
        }
        // Fallback to per-document sync so one malformed legacy doc never blocks the rest
        for (const { id: uid, data: user } of chunk) {
          try {
            const ref = doc(db, 'leaderboard', uid);
            const existingEntry = existingLeaderboardMap.get(uid);
            const mutableFields = buildEntryPayload(uid, user);
            if (existingEntry && existingEntry.uid === uid) {
              await updateDoc(ref, mutableFields);
            } else {
              await setDoc(ref, { uid, ...mutableFields });
            }
            syncedUsers += 1;
          } catch (docErr) {
            if (isFirestoreQuotaError(docErr)) {
              throw docErr;
            }
            console.warn(`Skipped leaderboard sync for user ${uid}:`, docErr);
          }
        }
      }
    }

    // Remove orphan leaderboard docs whose user account no longer exists in /users
    const orphanIds = Array.from(existingLeaderboardMap.keys()).filter(
      (id) => !validUserIds.has(id) && VALID_FIRESTORE_ID_REGEX.test(id)
    );
    let removedOrphans = 0;
    for (let i = 0; i < orphanIds.length; i += 150) {
      const chunk = orphanIds.slice(i, i + 150);
      const delBatch = writeBatch(db);
      chunk.forEach((id) => delBatch.delete(doc(db, 'leaderboard', id)));
      try {
        await delBatch.commit();
        removedOrphans += chunk.length;
      } catch (delErr) {
        if (isFirestoreQuotaError(delErr)) {
          throw delErr;
        }
        console.warn('Failed to remove orphan leaderboard docs:', delErr);
      }
    }

    clearLeaderboardCache();
    return { syncedUsers, removedOrphans, totalLessons };
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'leaderboard');
  }
}

// --- User Feedback & Admin Triage (On-Demand Reads to Conserve Quota) ---

const VALID_FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug', 'content', 'feature', 'ui_ux', 'other'];
const VALID_FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'reviewing', 'resolved', 'closed'];

function getTimestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof (ts as { toMillis?: unknown }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export interface SubmitUserFeedbackInput {
  category: FeedbackCategory;
  contextPage: string;
  title: string;
  content: string;
  rating: number;
}

export async function submitUserFeedback(
  profile: UserProfile,
  input: SubmitUserFeedbackInput
): Promise<UserFeedbackDoc> {
  const safeTitle = truncate(input.title.trim(), 120);
  const safeContent = truncate(input.content.trim(), 2000);
  if (safeTitle.length < 3) {
    throw new Error('Tiêu đề góp ý cần ít nhất 3 ký tự.');
  }
  if (safeContent.length < 5) {
    throw new Error('Nội dung góp ý cần ít nhất 5 ký tự.');
  }

  const feedbackId = `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const safeCategory: FeedbackCategory = VALID_FEEDBACK_CATEGORIES.includes(input.category)
    ? input.category
    : 'other';
  const safeLevel: LearnerCEFRLevel =
    profile.currentLevel === 'A2' ||
    profile.currentLevel === 'B1' ||
    profile.currentLevel === 'B2' ||
    profile.currentLevel === 'C1'
      ? profile.currentLevel
      : 'A1';
  const safeRating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
  const safeName = truncate(profile.fullName.trim() || 'Phi công tập sự', 100) || 'Phi công tập sự';
  const safeEmail = truncate(profile.email.trim() || 'learner@example.com', 200);
  const safeContext = truncate(input.contextPage.trim(), 80);

  const payload = {
    uid: profile.uid,
    userName: safeName,
    userEmail: safeEmail,
    userLevel: safeLevel,
    category: safeCategory,
    contextPage: safeContext,
    title: safeTitle,
    content: safeContent,
    rating: safeRating,
    status: 'new' as FeedbackStatus,
    adminNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'user_feedback', feedbackId), payload);
    const now = new Date();
    return {
      id: feedbackId,
      uid: payload.uid,
      userName: payload.userName,
      userEmail: payload.userEmail,
      userLevel: payload.userLevel,
      category: payload.category,
      contextPage: payload.contextPage,
      title: payload.title,
      content: payload.content,
      rating: payload.rating,
      status: 'new',
      adminNote: '',
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, `user_feedback/${feedbackId}`);
  }
}

export async function fetchMyFeedback(uid: string): Promise<UserFeedbackDoc[]> {
  try {
    const q = query(collection(db, 'user_feedback'), where('uid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as UserFeedbackDoc) }))
      .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, 'user_feedback');
  }
}

export async function adminListAllFeedback(): Promise<UserFeedbackDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'user_feedback'));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as UserFeedbackDoc) }))
      .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, 'user_feedback');
  }
}

export async function adminUpdateFeedback(
  feedbackId: string,
  patch: { status: FeedbackStatus; adminNote: string }
): Promise<void> {
  const safeId = sanitizeId(feedbackId, 128);
  const safeStatus: FeedbackStatus = VALID_FEEDBACK_STATUSES.includes(patch.status)
    ? patch.status
    : 'reviewing';
  const safeNote = truncate(patch.adminNote.trim(), 1000);

  try {
    await updateDoc(doc(db, 'user_feedback', safeId), {
      status: safeStatus,
      adminNote: safeNote,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `user_feedback/${safeId}`);
  }
}

export async function adminDeleteFeedback(feedbackId: string): Promise<void> {
  const safeId = sanitizeId(feedbackId, 128);
  try {
    await deleteDoc(doc(db, 'user_feedback', safeId));
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, `user_feedback/${safeId}`);
  }
}

// --- Bilingual Reading Comprehension Passages (Cached On-Demand Reads + Admin CRUD) ---

export function clearReadingPassagesCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY_READINGS);
  } catch {
    // Ignore storage errors
  }
}

function normalizeReadingLevel(raw: string): LearnerCEFRLevel {
  if (raw === 'A2' || raw === 'B1' || raw === 'B2' || raw === 'C1') return raw;
  return 'A1';
}

export async function fetchReadingPassagesOnce(
  isAdmin: boolean,
  forceRefresh = false
): Promise<ReadingPassageDoc[]> {
  if (!forceRefresh && !isAdmin) {
    const cached = readLocalCache<ReadingPassageDoc[]>(CACHE_KEY_READINGS, CURRICULUM_CACHE_TTL_MS);
    if (cached) {
      return cached;
    }
  }
  try {
    const q = isAdmin
      ? collection(db, 'reading_passages')
      : query(collection(db, 'reading_passages'), where('isPublished', '==', true));
    const snap = await getDocs(q);
    const items = snap.docs
      .map((d) => d.data() as ReadingPassageDoc)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    if (!isAdmin && items.length > 0) {
      writeLocalCache(CACHE_KEY_READINGS, items);
    }
    return items;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      const stale = readStaleLocalCache<ReadingPassageDoc[]>(CACHE_KEY_READINGS);
      if (stale) return stale;
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, 'reading_passages');
  }
}

export async function adminSaveReadingPassage(
  passage: ReadingPassageDoc,
  isNew: boolean
): Promise<void> {
  const safeId = sanitizeId(passage.passageId || `read_${Date.now().toString(36)}`, 80);
  const safeTitleEn = truncate(passage.titleEn, 160);
  const safeTitleVi = truncate(passage.titleVi, 160);
  const safeCategory = truncate(passage.category || 'Động lực & Cuộc sống', 60) || 'Động lực & Cuộc sống';
  const safeContentEn = truncate(passage.contentEn, 3000);
  const safeContentVi = truncate(passage.contentVi, 3500);

  if (safeTitleEn.length < 1 || safeTitleVi.length < 1) {
    throw new Error('Tiêu đề tiếng Anh và tiếng Việt không được để trống.');
  }
  if (safeContentEn.length < 10 || safeContentVi.length < 10) {
    throw new Error('Nội dung bài đọc tiếng Anh và bản dịch tiếng Việt cần tối thiểu 10 ký tự.');
  }

  const safeKeyPhrases = (passage.keyPhrases || [])
    .slice(0, 12)
    .map((kp) => ({
      phrase: truncate(kp.phrase || '', 120),
      meaningVi: truncate(kp.meaningVi || '', 200),
    }))
    .filter((kp) => kp.phrase.length > 0 && kp.meaningVi.length > 0);

  const mutableFields = {
    titleEn: safeTitleEn,
    titleVi: safeTitleVi,
    levelId: normalizeReadingLevel(passage.levelId),
    category: safeCategory,
    contentEn: safeContentEn,
    contentVi: safeContentVi,
    keyPhrases: safeKeyPhrases,
    estimatedMinutes: Math.max(1, Math.min(30, Math.round(Number(passage.estimatedMinutes) || 3))),
    order: Math.max(1, Math.min(500, Math.round(Number(passage.order) || 1))),
    isPublished: Boolean(passage.isPublished),
    updatedAt: serverTimestamp(),
  };

  try {
    const ref = doc(db, 'reading_passages', safeId);
    if (isNew) {
      await setDoc(ref, {
        passageId: safeId,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
    } else {
      const existingSnap = await getDoc(ref);
      if (existingSnap.exists()) {
        await updateDoc(ref, mutableFields);
      } else {
        await setDoc(ref, {
          passageId: safeId,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
      }
    }
    clearReadingPassagesCache();
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `reading_passages/${safeId}`
    );
  }
}

export async function adminDeleteReadingPassage(passageId: string): Promise<void> {
  const safeId = sanitizeId(passageId, 80);
  try {
    await deleteDoc(doc(db, 'reading_passages', safeId));
    clearReadingPassagesCache();
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, `reading_passages/${safeId}`);
  }
}

export async function seedReadingPassagesToFirestore(
  onProgress?: (written: number, total: number) => void
): Promise<{ createdCount: number; totalCount: number }> {
  try {
    const existingSnap = await getDocs(collection(db, 'reading_passages'));
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const missing = DEFAULT_READING_PASSAGES.filter((p) => !existingIds.has(p.passageId));

    if (missing.length > 0) {
      const CHUNK_SIZE = 50;
      let written = 0;
      for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
        const chunk = missing.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const passage of chunk) {
          const ref = doc(db, 'reading_passages', passage.passageId);
          batch.set(ref, {
            passageId: passage.passageId,
            titleEn: truncate(passage.titleEn, 160),
            titleVi: truncate(passage.titleVi, 160),
            levelId: normalizeReadingLevel(passage.levelId),
            category: truncate(passage.category, 60),
            contentEn: truncate(passage.contentEn, 3000),
            contentVi: truncate(passage.contentVi, 3500),
            keyPhrases: passage.keyPhrases.slice(0, 12).map((kp) => ({
              phrase: truncate(kp.phrase, 120),
              meaningVi: truncate(kp.meaningVi, 200),
            })),
            estimatedMinutes: Math.max(1, Math.min(30, Math.round(passage.estimatedMinutes))),
            order: Math.max(1, Math.min(500, Math.round(passage.order))),
            isPublished: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        written += chunk.length;
        onProgress?.(written, missing.length);
      }
    }

    clearReadingPassagesCache();
    return {
      createdCount: missing.length,
      totalCount: existingIds.size + missing.length,
    };
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'reading_passages');
  }
}

// --- Admin User Password Reset, Account Deletion & Revocation ---

export async function checkUserRevoked(uid: string): Promise<RevokedUserDoc | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'revoked_users', uid));
    if (!snap.exists()) return null;
    return snap.data() as RevokedUserDoc;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      return null;
    }
    return null;
  }
}

export async function adminListRevokedUsers(): Promise<RevokedUserDoc[]> {
  const path = 'revoked_users';
  try {
    const snap = await getDocs(collection(db, path));
    const list = snap.docs.map((d) => d.data() as RevokedUserDoc);
    return list.sort((a, b) => {
      const ta =
        a.revokedAt && typeof a.revokedAt === 'object' && 'toMillis' in a.revokedAt
          ? (a.revokedAt as { toMillis: () => number }).toMillis()
          : 0;
      const tb =
        b.revokedAt && typeof b.revokedAt === 'object' && 'toMillis' in b.revokedAt
          ? (b.revokedAt as { toMillis: () => number }).toMillis()
          : 0;
      return tb - ta;
    });
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function adminRestoreRevokedUser(targetUid: string): Promise<void> {
  const safeUid = sanitizeId(targetUid, 128);
  const path = `revoked_users/${safeUid}`;
  try {
    await deleteDoc(doc(db, 'revoked_users', safeUid));
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminSendUserPasswordResetEmail(targetEmail: string): Promise<void> {
  const cleanEmail = targetEmail.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Địa chỉ email của tài khoản không hợp lệ.');
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        throw new Error('Địa chỉ email không đúng định dạng.');
      case 'auth/user-not-found':
        throw new Error('Không tìm thấy tài khoản tương ứng trên Firebase Authentication.');
      case 'auth/too-many-requests':
        throw new Error('Đã gửi quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau ít phút.');
      case 'auth/operation-not-allowed':
        throw new Error(
          'Phương thức đăng nhập Email/Mật khẩu chưa được bật trên Firebase Console.'
        );
      default:
        throw new Error(
          error instanceof Error
            ? `Không thể gửi email đặt lại mật khẩu: ${error.message}`
            : 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.'
        );
    }
  }
}

export async function adminDeleteUserAccount(params: {
  targetUser: UserProfile;
  adminUid: string;
  adminEmail: string;
  reason?: string;
}): Promise<{ deletedDocsCount: number; revokedRecord: RevokedUserDoc }> {
  const { targetUser, adminUid, adminEmail, reason } = params;
  const targetUid = targetUser.uid;
  const normalizedTargetEmail = targetUser.email.trim().toLowerCase();

  if (!targetUid) {
    throw new Error('Không xác định được mã tài khoản cần xóa.');
  }
  if (targetUid === adminUid) {
    throw new Error('Bạn không thể tự xóa tài khoản quản trị đang đăng nhập.');
  }
  if (normalizedTargetEmail === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Không thể xóa tài khoản Quản trị gốc của hệ thống.');
  }

  try {
    const [
      progressSnap,
      quizSnap,
      vocabSnap,
      feedbackSnap,
      adminSnap,
      leaderboardSnap,
      clubMemberSnap,
      userSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'user_progress'), where('uid', '==', targetUid))),
      getDocs(query(collection(db, 'quiz_results'), where('uid', '==', targetUid))),
      getDocs(query(collection(db, 'user_vocabulary'), where('uid', '==', targetUid))),
      getDocs(query(collection(db, 'user_feedback'), where('uid', '==', targetUid))),
      getDoc(doc(db, 'admins', targetUid)),
      getDoc(doc(db, 'leaderboard', targetUid)),
      getDoc(doc(db, 'club_members', targetUid)),
      getDoc(doc(db, 'users', targetUid)),
    ]);

    const refsToDelete: DocumentReference[] = [];
    progressSnap.docs.forEach((d) => refsToDelete.push(d.ref));
    quizSnap.docs.forEach((d) => refsToDelete.push(d.ref));
    vocabSnap.docs.forEach((d) => refsToDelete.push(d.ref));
    feedbackSnap.docs.forEach((d) => refsToDelete.push(d.ref));
    if (adminSnap.exists()) refsToDelete.push(adminSnap.ref);
    if (leaderboardSnap.exists()) refsToDelete.push(leaderboardSnap.ref);
    if (clubMemberSnap.exists()) refsToDelete.push(clubMemberSnap.ref);
    if (userSnap.exists()) refsToDelete.push(userSnap.ref);

    // Record revocation BEFORE or atomically with deletion so a concurrent login cannot recreate the profile
    const revokedRef = doc(db, 'revoked_users', targetUid);
    const existingRevoked = await getDoc(revokedRef);
    if (existingRevoked.exists()) {
      await deleteDoc(revokedRef);
    }

    const cleanReason = truncate(
      (reason ?? '').trim() || 'Tài khoản đã bị quản trị viên xóa khỏi hệ thống.',
      300
    );
    const cleanFullName = truncate(targetUser.fullName.trim() || 'Học viên', 100);
    const cleanEmail = truncate(targetUser.email.trim() || 'unknown@user.local', 200);
    const cleanAdminEmail = truncate(adminEmail.trim() || BOOTSTRAPPED_ADMIN_EMAIL, 200);

    await setDoc(revokedRef, {
      uid: targetUid,
      email: cleanEmail,
      fullName: cleanFullName,
      reason: cleanReason,
      revokedBy: adminUid,
      revokedByEmail: cleanAdminEmail,
      revokedAt: serverTimestamp(),
    });

    // Execute cascade deletes in safe chunks of 400 (well under Firestore's 500-op batch limit)
    const BATCH_LIMIT = 400;
    for (let i = 0; i < refsToDelete.length; i += BATCH_LIMIT) {
      const chunk = refsToDelete.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    clearLeaderboardCache();

    return {
      deletedDocsCount: refsToDelete.length,
      revokedRecord: {
        uid: targetUid,
        email: cleanEmail,
        fullName: cleanFullName,
        reason: cleanReason,
        revokedBy: adminUid,
        revokedByEmail: cleanAdminEmail,
        revokedAt: new Date(),
      },
    };
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.DELETE, `users/${targetUid}`);
  }
}

// --- 3D English Club Presence & 1-on-1 Direct Messaging ---

export function buildClubPairId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

function clampClubNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(min, Math.min(max, Math.round(val * 100) / 100));
}

export async function upsertClubMemberPresence(params: {
  uid: string;
  displayName: string;
  currentLevel: LearnerCEFRLevel;
  avatarGender: ClubAvatarGender;
  statusText: string;
  posX: number;
  posZ: number;
  rotationY: number;
  isOnline: boolean;
}): Promise<void> {
  const path = `club_members/${params.uid}`;
  const ref = doc(db, 'club_members', params.uid);

  const safeLevel: LearnerCEFRLevel =
    params.currentLevel === 'A2' ||
    params.currentLevel === 'B1' ||
    params.currentLevel === 'B2' ||
    params.currentLevel === 'C1'
      ? params.currentLevel
      : 'A1';
  const safeGender: ClubAvatarGender = params.avatarGender === 'female' ? 'female' : 'male';
  const safeName = truncate(params.displayName.trim() || 'Phi công tập sự', 100) || 'Phi công tập sự';
  const safeStatus = truncate(params.statusText.trim(), 120);
  const safePosX = clampClubNumber(params.posX, -20, 20);
  const safePosZ = clampClubNumber(params.posZ, -20, 20);
  const safeRotY = clampClubNumber(params.rotationY, -10, 10);

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        displayName: safeName,
        currentLevel: safeLevel,
        avatarGender: safeGender,
        statusText: safeStatus,
        posX: safePosX,
        posZ: safePosZ,
        rotationY: safeRotY,
        isOnline: Boolean(params.isOnline),
        lastActiveAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: params.uid,
        displayName: safeName,
        currentLevel: safeLevel,
        avatarGender: safeGender,
        statusText: safeStatus,
        posX: safePosX,
        posZ: safePosZ,
        rotationY: safeRotY,
        isOnline: Boolean(params.isOnline),
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function setClubMemberOffline(uid: string): Promise<void> {
  if (!uid) return;
  const ref = doc(db, 'club_members', uid);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) return;
    await updateDoc(ref, {
      isOnline: false,
      lastActiveAt: serverTimestamp(),
    });
  } catch {
    // Best-effort offline update on page leave/unmount
  }
}

export function subscribeClubMembers(
  onData: (members: ClubMemberDoc[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'club_members';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as ClubMemberDoc)
        .filter((m) => Boolean(m && m.uid))
        .sort((a, b) => {
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          return getTimestampMillis(b.lastActiveAt) - getTimestampMillis(a.lastActiveAt);
        });
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else if (!isFirestoreQuotaError(error)) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export function subscribeUserClubMessages(
  uid: string,
  onData: (messages: ClubMessageDoc[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'club_messages';
  // Single-clause query avoids needing a composite Firestore index; sort in-memory by createdAt
  const q = query(collection(db, path), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ClubMessageDoc[] = snapshot.docs
        .map((d) => {
          const data = d.data() as Omit<ClubMessageDoc, 'id'>;
          return {
            ...data,
            id: d.id,
            createdAtMs: getTimestampMillis(data.createdAt) || Date.now(),
          };
        })
        .sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else if (!isFirestoreQuotaError(error)) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export async function sendClubDirectMessage(params: {
  messageId: string;
  senderUid: string;
  senderName: string;
  senderAvatar: ClubAvatarGender;
  receiverUid: string;
  text: string;
}): Promise<ClubMessageDoc> {
  const safeId = sanitizeId(params.messageId, 128);
  const path = `club_messages/${safeId}`;
  const cleanText = truncate(params.text.trim(), 1000);
  if (!cleanText) {
    throw new Error('Vui lòng nhập nội dung tin nhắn tiếng Anh.');
  }
  if (!params.receiverUid || params.receiverUid === params.senderUid) {
    throw new Error('Không thể gửi tin nhắn cho chính mình.');
  }

  const pairId = buildClubPairId(params.senderUid, params.receiverUid);
  const participants: [string, string] = [params.senderUid, params.receiverUid];
  const safeSenderName = truncate(params.senderName.trim() || 'Phi công tập sự', 100) || 'Phi công tập sự';
  const safeAvatar: ClubAvatarGender = params.senderAvatar === 'female' ? 'female' : 'male';

  try {
    await setDoc(doc(db, 'club_messages', safeId), {
      pairId,
      participants,
      senderUid: params.senderUid,
      senderName: safeSenderName,
      senderAvatar: safeAvatar,
      receiverUid: params.receiverUid,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
    return {
      id: safeId,
      pairId,
      participants,
      senderUid: params.senderUid,
      senderName: safeSenderName,
      senderAvatar: safeAvatar,
      receiverUid: params.receiverUid,
      text: cleanText,
      createdAt: new Date(),
      createdAtMs: Date.now(),
    };
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}



