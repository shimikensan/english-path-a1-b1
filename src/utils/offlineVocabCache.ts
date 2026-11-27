import type { UserProfile, UserVocabularyDoc } from '../types';

const OFFLINE_VOCAB_KEY_PREFIX = 'pilot_offline_vocab_v1_';
const OFFLINE_PROFILE_KEY_PREFIX = 'pilot_offline_profile_v1_';
const OFFLINE_LAST_UID_KEY = 'pilot_offline_last_uid_v1';
const OFFLINE_CACHE_NAME = 'pilot-offline-vocab-v1';
const OFFLINE_CACHE_URL_PREFIX = '/__offline_vocab__/';

export interface OfflineVocabSnapshot {
  uid: string;
  savedAt: number;
  vocabMap: Record<string, UserVocabularyDoc>;
}

export interface OfflineProfileSnapshot {
  uid: string;
  fullName: string;
  email: string;
  currentLevel: UserProfile['currentLevel'];
  streakDays: number;
  lastStudyDate: string;
  dailyGoalMinutes: number;
  reminderEnabled: boolean;
  totalAccessSeconds?: number;
  savedAt: number;
}

function stripNonSerializableVocab(
  vocabMap: Record<string, UserVocabularyDoc>
): Record<string, UserVocabularyDoc> {
  const clean: Record<string, UserVocabularyDoc> = {};
  for (const [key, item] of Object.entries(vocabMap)) {
    if (!item || !item.vocabularyId) continue;
    clean[key] = {
      uid: item.uid,
      vocabularyId: item.vocabularyId,
      lessonId: item.lessonId,
      levelId: item.levelId,
      word: item.word,
      ipa: item.ipa,
      partOfSpeech: item.partOfSpeech,
      meaningVi: item.meaningVi,
      exampleEn: item.exampleEn,
      exampleVi: item.exampleVi,
      isFavorite: Boolean(item.isFavorite),
      isLearned: Boolean(item.isLearned),
    };
  }
  return clean;
}

export function saveOfflineVocabCache(
  uid: string,
  vocabMap: Record<string, UserVocabularyDoc>
): number {
  const savedAt = Date.now();
  const payload: OfflineVocabSnapshot = {
    uid,
    savedAt,
    vocabMap: stripNonSerializableVocab(vocabMap),
  };

  try {
    window.localStorage.setItem(`${OFFLINE_VOCAB_KEY_PREFIX}${uid}`, JSON.stringify(payload));
    window.localStorage.setItem(OFFLINE_LAST_UID_KEY, uid);
  } catch {
    // Ignore localStorage quota errors
  }

  // Also persist into Cache Storage so the Service Worker / DevTools cache always retains an offline snapshot
  if (typeof window !== 'undefined' && 'caches' in window) {
    void window.caches
      .open(OFFLINE_CACHE_NAME)
      .then((cache) => {
        const response = new Response(JSON.stringify(payload), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
        return cache.put(`${OFFLINE_CACHE_URL_PREFIX}${encodeURIComponent(uid)}.json`, response);
      })
      .catch(() => {
        // Ignore Cache API errors in restricted contexts
      });
  }

  return savedAt;
}

export function readOfflineVocabCache(uid: string): OfflineVocabSnapshot | null {
  try {
    const raw = window.localStorage.getItem(`${OFFLINE_VOCAB_KEY_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineVocabSnapshot;
    if (!parsed || typeof parsed.vocabMap !== 'object' || parsed.vocabMap === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function readOfflineVocabFromCacheStorage(
  uid: string
): Promise<OfflineVocabSnapshot | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(OFFLINE_CACHE_NAME);
    const res = await cache.match(`${OFFLINE_CACHE_URL_PREFIX}${encodeURIComponent(uid)}.json`);
    if (!res) return null;
    const parsed = (await res.json()) as OfflineVocabSnapshot;
    if (!parsed || typeof parsed.vocabMap !== 'object' || parsed.vocabMap === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readLastOfflineVocabCache(): OfflineVocabSnapshot | null {
  try {
    const lastUid = window.localStorage.getItem(OFFLINE_LAST_UID_KEY);
    if (!lastUid) return null;
    return readOfflineVocabCache(lastUid);
  } catch {
    return null;
  }
}

export function saveOfflineProfileCache(profile: UserProfile): void {
  const payload: OfflineProfileSnapshot = {
    uid: profile.uid,
    fullName: profile.fullName,
    email: profile.email,
    currentLevel: profile.currentLevel,
    streakDays: profile.streakDays,
    lastStudyDate: profile.lastStudyDate,
    dailyGoalMinutes: profile.dailyGoalMinutes,
    reminderEnabled: profile.reminderEnabled,
    totalAccessSeconds: profile.totalAccessSeconds,
    savedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(`${OFFLINE_PROFILE_KEY_PREFIX}${profile.uid}`, JSON.stringify(payload));
    window.localStorage.setItem(OFFLINE_LAST_UID_KEY, profile.uid);
  } catch {
    // Ignore storage errors
  }
}

export function readOfflineProfileCache(uid: string): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(`${OFFLINE_PROFILE_KEY_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineProfileSnapshot;
    if (!parsed || !parsed.uid) return null;
    return {
      uid: parsed.uid,
      fullName: parsed.fullName,
      email: parsed.email,
      currentLevel: parsed.currentLevel,
      streakDays: parsed.streakDays,
      lastStudyDate: parsed.lastStudyDate,
      dailyGoalMinutes: parsed.dailyGoalMinutes,
      reminderEnabled: parsed.reminderEnabled,
      totalAccessSeconds: parsed.totalAccessSeconds,
    };
  } catch {
    return null;
  }
}
