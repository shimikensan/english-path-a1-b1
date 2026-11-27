import type { AppRoute, QuizResultDoc, UserVocabularyDoc } from '../types';
import { getLocalDateString, toTimestampMillis } from './helpers';

export type DailyChallengeId = 'daily_quiz' | 'daily_vocab_10' | 'daily_ai_chat';

export const DAILY_ALL_CLEAR_BONUS_ID = 'daily_all_clear_bonus';
export const DAILY_ALL_CLEAR_BONUS_GEMS = 25;
export const DAILY_CHALLENGES_UPDATED_EVENT = 'pilot-daily-challenges-updated';
export const DAILY_CHALLENGES_CELEBRATE_EVENT = 'pilot-daily-challenges-celebrate';

const DAILY_STORAGE_PREFIX = 'pilot_daily_challenges_v1_';
const AI_CHAT_STORAGE_PREFIX = 'pilot_ai_chat_v1_';

export interface DailyChallengeDefinition {
  id: DailyChallengeId;
  titleVi: string;
  descriptionVi: string;
  target: number;
  unitVi: string;
  rewardGems: number;
  actionLabelVi: string;
  route: AppRoute;
}

export const DAILY_CHALLENGE_DEFINITIONS: DailyChallengeDefinition[] = [
  {
    id: 'daily_quiz',
    titleVi: 'Hoàn thành 1 bài kiểm tra',
    descriptionVi: 'Hoàn tất bất kỳ bài kiểm tra năng lực hoặc bài học nào trong ngày.',
    target: 1,
    unitVi: 'bài',
    rewardGems: 25,
    actionLabelVi: 'Làm kiểm tra',
    route: 'quizzes',
  },
  {
    id: 'daily_vocab_10',
    titleVi: 'Học 10 từ vựng',
    descriptionVi: 'Đánh dấu đã thuộc 10 từ vựng tiếng Anh mới trong ngày hôm nay.',
    target: 10,
    unitVi: 'từ',
    rewardGems: 30,
    actionLabelVi: 'Học từ vựng',
    route: 'vocabulary',
  },
  {
    id: 'daily_ai_chat',
    titleVi: 'Gửi 1 tin nhắn cho AI',
    descriptionVi: 'Trò chuyện thực hành tiếng Anh cùng gia sư AI ít nhất 1 lượt.',
    target: 1,
    unitVi: 'tin nhắn',
    rewardGems: 20,
    actionLabelVi: 'Nhắn tin AI',
    route: 'ai-tutor',
  },
];

interface StoredDailyChallengeProgress {
  dateKey: string;
  quizCount: number;
  learnedVocabIds: string[];
  aiMessageCount: number;
  claimedIds: string[];
  celebrationShown?: boolean;
}

export interface DailyChallengeItemState extends DailyChallengeDefinition {
  progress: number;
  percent: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyChallengesSummary {
  dateKey: string;
  items: DailyChallengeItemState[];
  completedCount: number;
  claimedCount: number;
  totalCount: number;
  totalPossibleGems: number;
  claimedGemsToday: number;
  allCompleted: boolean;
  allClearBonusGems: number;
  allClearBonusClaimed: boolean;
  unclaimedReadyCount: number;
  unclaimedReadyGems: number;
  celebrationShown: boolean;
}

function getStorageKey(uid: string, dateKey: string): string {
  return `${DAILY_STORAGE_PREFIX}${uid}_${dateKey}`;
}

function createEmptyStored(dateKey: string): StoredDailyChallengeProgress {
  return {
    dateKey,
    quizCount: 0,
    learnedVocabIds: [],
    aiMessageCount: 0,
    claimedIds: [],
    celebrationShown: false,
  };
}

function readStoredProgress(uid: string, dateKey: string): StoredDailyChallengeProgress {
  if (typeof window === 'undefined' || !uid) {
    return createEmptyStored(dateKey);
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid, dateKey));
    if (!raw) return createEmptyStored(dateKey);
    const parsed = JSON.parse(raw) as Partial<StoredDailyChallengeProgress>;
    if (!parsed || typeof parsed !== 'object') return createEmptyStored(dateKey);
    return {
      dateKey,
      quizCount: typeof parsed.quizCount === 'number' && parsed.quizCount > 0 ? Math.floor(parsed.quizCount) : 0,
      learnedVocabIds: Array.isArray(parsed.learnedVocabIds)
        ? Array.from(new Set(parsed.learnedVocabIds.filter((v): v is string => typeof v === 'string' && v.length > 0)))
        : [],
      aiMessageCount:
        typeof parsed.aiMessageCount === 'number' && parsed.aiMessageCount > 0
          ? Math.floor(parsed.aiMessageCount)
          : 0,
      claimedIds: Array.isArray(parsed.claimedIds)
        ? Array.from(new Set(parsed.claimedIds.filter((v): v is string => typeof v === 'string' && v.length > 0)))
        : [],
      celebrationShown: Boolean(parsed.celebrationShown),
    };
  } catch {
    return createEmptyStored(dateKey);
  }
}

function writeStoredProgress(uid: string, data: StoredDailyChallengeProgress): void {
  if (typeof window === 'undefined' || !uid) return;
  try {
    window.localStorage.setItem(getStorageKey(uid, data.dateKey), JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(DAILY_CHALLENGES_UPDATED_EVENT, { detail: { uid, dateKey: data.dateKey } }));
  } catch {
    // Ignore localStorage quota or private-mode errors
  }
}

function scanTodayAiUserMessages(todayKey: string): number {
  if (typeof window === 'undefined') return 0;
  let count = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(AI_CHAT_STORAGE_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const msg of parsed) {
        if (
          msg &&
          typeof msg === 'object' &&
          msg.role === 'user' &&
          typeof msg.timestamp === 'number' &&
          Number.isFinite(msg.timestamp)
        ) {
          if (getLocalDateString(new Date(msg.timestamp)) === todayKey) {
            count += 1;
          }
        }
      }
    }
  } catch {
    return count;
  }
  return count;
}

export function recordDailyQuizCompleted(uid?: string | null): void {
  if (!uid) return;
  const today = getLocalDateString();
  const current = readStoredProgress(uid, today);
  writeStoredProgress(uid, {
    ...current,
    quizCount: current.quizCount + 1,
  });
}

export function recordDailyVocabLearned(uid?: string | null, vocabId?: string): void {
  if (!uid) return;
  const today = getLocalDateString();
  const current = readStoredProgress(uid, today);
  const id = vocabId && vocabId.trim().length > 0 ? vocabId.trim() : `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (current.learnedVocabIds.includes(id)) return;
  writeStoredProgress(uid, {
    ...current,
    learnedVocabIds: [...current.learnedVocabIds, id],
  });
}

export function recordDailyAiMessage(uid?: string | null): void {
  if (!uid) return;
  const today = getLocalDateString();
  const current = readStoredProgress(uid, today);
  writeStoredProgress(uid, {
    ...current,
    aiMessageCount: current.aiMessageCount + 1,
  });
}

export function claimDailyChallengeReward(uid: string | null | undefined, rewardId: string): boolean {
  if (!uid || !rewardId) return false;
  const today = getLocalDateString();
  const current = readStoredProgress(uid, today);
  if (current.claimedIds.includes(rewardId)) {
    return false;
  }
  writeStoredProgress(uid, {
    ...current,
    claimedIds: [...current.claimedIds, rewardId],
  });
  return true;
}

export function markDailyCelebrationShown(uid?: string | null): boolean {
  if (!uid) return false;
  const today = getLocalDateString();
  const current = readStoredProgress(uid, today);
  if (current.celebrationShown) return false;
  writeStoredProgress(uid, {
    ...current,
    celebrationShown: true,
  });
  return true;
}

export function claimAllAvailableDailyRewards(params: {
  uid?: string | null;
  quizResults: QuizResultDoc[];
  vocabMap: Record<string, UserVocabularyDoc>;
}): { totalClaimedGems: number; claimedIds: string[] } {
  const uid = params.uid;
  if (!uid) return { totalClaimedGems: 0, claimedIds: [] };
  const summary = computeDailyChallengesState(params);
  const today = summary.dateKey;
  const current = readStoredProgress(uid, today);

  const nextClaimed = new Set<string>(current.claimedIds);
  const newlyClaimedIds: string[] = [];
  let totalClaimedGems = 0;

  for (const item of summary.items) {
    if (item.completed && !nextClaimed.has(item.id)) {
      nextClaimed.add(item.id);
      newlyClaimedIds.push(item.id);
      totalClaimedGems += item.rewardGems;
    }
  }

  if (summary.allCompleted && !nextClaimed.has(DAILY_ALL_CLEAR_BONUS_ID)) {
    nextClaimed.add(DAILY_ALL_CLEAR_BONUS_ID);
    newlyClaimedIds.push(DAILY_ALL_CLEAR_BONUS_ID);
    totalClaimedGems += summary.allClearBonusGems;
  }

  if (newlyClaimedIds.length > 0 || !current.celebrationShown) {
    writeStoredProgress(uid, {
      ...current,
      claimedIds: Array.from(nextClaimed),
      celebrationShown: true,
    });
  }

  return {
    totalClaimedGems,
    claimedIds: newlyClaimedIds,
  };
}

export interface DailyCelebrationTriggerDetail {
  awardedGems?: number;
  alreadyAwarded?: boolean;
}

export function triggerDailyCelebrationPopup(detail?: DailyCelebrationTriggerDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<DailyCelebrationTriggerDetail>(DAILY_CHALLENGES_CELEBRATE_EVENT, {
      detail: detail ?? {},
    })
  );
}

export function computeDailyChallengesState(params: {
  uid?: string | null;
  quizResults: QuizResultDoc[];
  vocabMap: Record<string, UserVocabularyDoc>;
}): DailyChallengesSummary {
  const today = getLocalDateString();
  const uid = params.uid || '';
  const stored = readStoredProgress(uid, today);

  // 1. Quizzes completed today (combine live local counter with Firestore quizResults)
  let firestoreQuizzesToday = 0;
  for (const result of params.quizResults) {
    const ms = toTimestampMillis(result.completedAt);
    if (ms !== null && getLocalDateString(new Date(ms)) === today) {
      firestoreQuizzesToday += 1;
    }
  }
  const quizzesToday = Math.max(stored.quizCount, firestoreQuizzesToday);

  // 2. Vocabulary learned today (deduplicate local learned IDs + Firestore vocabMap updated today)
  const learnedTodaySet = new Set<string>(stored.learnedVocabIds);
  for (const [vocabKey, doc] of Object.entries(params.vocabMap)) {
    if (!doc?.isLearned) continue;
    const ms = toTimestampMillis(doc.updatedAt);
    if (ms !== null && getLocalDateString(new Date(ms)) === today) {
      learnedTodaySet.add(vocabKey);
    }
  }
  const vocabLearnedToday = learnedTodaySet.size;

  // 3. AI messages sent today (combine live local counter with stored AI tutor chat history)
  const aiMessagesToday = Math.max(stored.aiMessageCount, scanTodayAiUserMessages(today));

  const progressByChallenge: Record<DailyChallengeId, number> = {
    daily_quiz: quizzesToday,
    daily_vocab_10: vocabLearnedToday,
    daily_ai_chat: aiMessagesToday,
  };

  const items: DailyChallengeItemState[] = DAILY_CHALLENGE_DEFINITIONS.map((def) => {
    const rawProgress = progressByChallenge[def.id] ?? 0;
    const progress = Math.min(def.target, Math.max(0, rawProgress));
    const percent = Math.min(100, Math.round((progress / def.target) * 100));
    const completed = progress >= def.target;
    const claimed = stored.claimedIds.includes(def.id);
    return {
      ...def,
      progress,
      percent,
      completed,
      claimed,
    };
  });

  const completedCount = items.filter((item) => item.completed).length;
  const claimedCount = items.filter((item) => item.claimed).length;
  const allCompleted = completedCount === items.length;
  const allClearBonusClaimed = stored.claimedIds.includes(DAILY_ALL_CLEAR_BONUS_ID);

  const missionGemsTotal = items.reduce((sum, item) => sum + item.rewardGems, 0);
  const totalPossibleGems = missionGemsTotal + DAILY_ALL_CLEAR_BONUS_GEMS;

  const claimedGemsToday =
    items.reduce((sum, item) => sum + (item.claimed ? item.rewardGems : 0), 0) +
    (allClearBonusClaimed ? DAILY_ALL_CLEAR_BONUS_GEMS : 0);

  const unclaimedReadyCount =
    items.filter((item) => item.completed && !item.claimed).length +
    (allCompleted && !allClearBonusClaimed ? 1 : 0);

  const unclaimedReadyGems =
    items.reduce((sum, item) => sum + (item.completed && !item.claimed ? item.rewardGems : 0), 0) +
    (allCompleted && !allClearBonusClaimed ? DAILY_ALL_CLEAR_BONUS_GEMS : 0);

  return {
    dateKey: today,
    items,
    completedCount,
    claimedCount,
    totalCount: items.length,
    totalPossibleGems,
    claimedGemsToday,
    allCompleted,
    allClearBonusGems: DAILY_ALL_CLEAR_BONUS_GEMS,
    allClearBonusClaimed,
    unclaimedReadyCount,
    unclaimedReadyGems,
    celebrationShown: Boolean(stored.celebrationShown),
  };
}

export function formatTimeUntilMidnightVi(now = new Date()): string {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${Math.max(1, minutes)} phút`;
  }
  return `${hours}g ${String(minutes).padStart(2, '0')}p`;
}
