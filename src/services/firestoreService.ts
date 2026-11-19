import type { User } from 'firebase/auth';
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
  type Unsubscribe,
} from 'firebase/firestore';
import { ALL_DEFAULT_LESSONS, DEFAULT_LEVELS, getDefaultLessonsByLevel } from '../data';
import { BOOTSTRAPPED_ADMIN_EMAIL, db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AdminRecord,
  AdminSecurityVaultDoc,
  LessonDoc,
  LevelDoc,
  QuizRating,
  QuizResultDoc,
  UserProfile,
  UserProgressDoc,
  UserVocabularyDoc,
  VocabularyItem,
} from '../types';
import { calculateUpdatedStreak, sanitizeId, truncate } from '../utils/helpers';

// --- User Profile & RBAC ---

export async function ensureUserProfile(
  firebaseUser: User,
  preferredName?: string,
  preferredLevel: 'A1' | 'A2' | 'B1' = 'A1'
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
    currentLevel?: 'A1' | 'A2' | 'B1';
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
  if (next.lastStudyDate === profile.lastStudyDate && next.streakDays === profile.streakDays) {
    return;
  }
  try {
    await updateDoc(ref, {
      streakDays: next.streakDays,
      lastStudyDate: next.lastStudyDate,
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
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// --- Levels & Lessons Subscriptions ---

export function subscribeLevels(
  isAdmin: boolean,
  onData: (levels: LevelDoc[]) => void
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
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeLessons(
  isAdmin: boolean,
  onData: (lessons: LessonDoc[]) => void
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
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- User Progress, Vocabulary & Quiz Results Subscriptions ---

export function subscribeUserProgress(
  uid: string,
  onData: (progressMap: Record<string, UserProgressDoc>) => void
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
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeQuizResults(
  uid: string,
  onData: (results: QuizResultDoc[]) => void
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
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserVocabulary(
  uid: string,
  onData: (vocabMap: Record<string, UserVocabularyDoc>) => void
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
      handleFirestoreError(error, OperationType.LIST, path);
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
      await recordStudyActivityStreak(profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, progressPath);
    }
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
  const resultId = `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const resultPath = `quiz_results/${resultId}`;

  try {
    await setDoc(doc(db, 'quiz_results', resultId), {
      uid,
      lessonId: lesson.lessonId,
      lessonTitle: truncate(lesson.title, 160),
      levelId: lesson.levelId,
      score: Math.min(100, Math.max(0, Math.round(score))),
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
  const bestScore = Math.max(existingProgress?.quizBestScore ?? 0, Math.round(score));
  const attempts = (existingProgress?.quizAttempts ?? 0) + 1;

  try {
    const pSnap = await getDoc(progressRef);
    if (pSnap.exists()) {
      await updateDoc(progressRef, {
        lessonCompleted: true,
        quizBestScore: bestScore,
        quizAttempts: attempts,
        lastStudyAt: serverTimestamp(),
      });
    } else {
      await setDoc(progressRef, {
        uid,
        lessonId: lesson.lessonId,
        levelId: lesson.levelId,
        vocabularyLearned: existingProgress?.vocabularyLearned ?? [],
        lessonCompleted: true,
        quizBestScore: bestScore,
        quizAttempts: attempts,
        createdAt: serverTimestamp(),
        lastStudyAt: serverTimestamp(),
      });
    }
    await recordStudyActivityStreak(profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, progressPath);
  }

  return resultId;
}

// --- Admin Curriculum & Seeding Mutations ---

export async function seedCurriculumToFirestore(targetLevel?: 'A1' | 'A2' | 'B1'): Promise<{
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminDeleteLevel(levelId: string): Promise<void> {
  const path = `levels/${levelId}`;
  try {
    await deleteDoc(doc(db, 'levels', levelId));
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminDeleteLesson(lessonId: string): Promise<void> {
  const path = `lessons/${lessonId}`;
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminListAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as UserProfile);
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

