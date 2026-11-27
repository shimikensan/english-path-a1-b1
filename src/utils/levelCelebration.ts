import type { LearnerCEFRLevel } from '../types';

export const CEFR_LEVEL_ORDER: readonly LearnerCEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const LEVEL_UP_CELEBRATE_EVENT = 'pilot-level-up-celebrate';

export interface LevelUpCelebrationDetail {
  completedLevel: LearnerCEFRLevel;
  promotedToLevel: LearnerCEFRLevel | null;
  totalLessonsInLevel: number;
  bonusGems: number;
  isReplay?: boolean;
  triggerKind: 'level_completed' | 'rank_promoted';
}

export function isCefrProgressionLevel(levelId: string): levelId is LearnerCEFRLevel {
  return (CEFR_LEVEL_ORDER as readonly string[]).includes(levelId);
}

export function getCefrLevelIndex(level: LearnerCEFRLevel): number {
  return CEFR_LEVEL_ORDER.indexOf(level);
}

export function getNextCefrLevel(level: LearnerCEFRLevel): LearnerCEFRLevel | null {
  const idx = CEFR_LEVEL_ORDER.indexOf(level);
  if (idx < 0 || idx >= CEFR_LEVEL_ORDER.length - 1) return null;
  return CEFR_LEVEL_ORDER[idx + 1];
}

export function isHigherCefrLevel(
  candidate: LearnerCEFRLevel,
  current: LearnerCEFRLevel
): boolean {
  return getCefrLevelIndex(candidate) > getCefrLevelIndex(current);
}

export function getLevelCompletionBonusGems(level: LearnerCEFRLevel): number {
  switch (level) {
    case 'A1':
      return 100;
    case 'A2':
      return 120;
    case 'B1':
      return 150;
    case 'B2':
      return 180;
    case 'C1':
      return 200;
    default:
      return 100;
  }
}

function getStorageKey(uid: string): string {
  return `pilot_level_celebrated_v1_${uid}`;
}

function readCelebratedLevels(uid: string): string[] {
  if (typeof window === 'undefined' || !uid) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function hasCelebratedLevelCompletion(uid: string, level: LearnerCEFRLevel): boolean {
  return readCelebratedLevels(uid).includes(level);
}

export function markLevelCompletionCelebrated(uid: string, level: LearnerCEFRLevel): void {
  if (typeof window === 'undefined' || !uid) return;
  try {
    const existing = readCelebratedLevels(uid);
    if (existing.includes(level)) return;
    window.localStorage.setItem(getStorageKey(uid), JSON.stringify([...existing, level]));
  } catch {
    // Ignore storage quota errors
  }
}

export function dispatchLevelUpCelebration(detail: LevelUpCelebrationDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<LevelUpCelebrationDetail>(LEVEL_UP_CELEBRATE_EVENT, { detail })
  );
}
