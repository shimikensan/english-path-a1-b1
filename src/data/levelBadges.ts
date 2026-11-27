import type { LearnerCEFRLevel, LessonDoc, LevelBadgeId, UserProgressDoc } from '../types';

export interface LevelBadgeDefinition {
  id: LevelBadgeId;
  levelId: LearnerCEFRLevel;
  titleVi: string;
  shortTitleVi: string;
  englishTag: string;
  descriptionVi: string;
  unlockCriteriaVi: string;
  stars: 1 | 2 | 3 | 4 | 5;
  /** Primary metallic / heraldic palette */
  palette: {
    primary: string;
    secondary: string;
    highlight: string;
    darkBg: string;
    rim: string;
    textLight: string;
    textDark: string;
  };
}

export const LEVEL_BADGE_IDS: readonly LevelBadgeId[] = [
  'level_a1_pioneer',
  'level_a2_specialist',
  'level_b1_captain',
  'level_b2_strategist',
  'level_c1_commander',
];

const LEVEL_BADGE_ID_SET = new Set<string>(LEVEL_BADGE_IDS);

export const LEVEL_BADGES: readonly LevelBadgeDefinition[] = [
  {
    id: 'level_a1_pioneer',
    levelId: 'A1',
    titleVi: 'Người tiên phong A1',
    shortTitleVi: 'Tiên phong A1',
    englishTag: 'A1 Pioneer',
    descriptionVi: 'Hoàn thành trọn vẹn đường bay nền tảng CEFR A1 và sẵn sàng cất cánh.',
    unlockCriteriaVi: 'Hoàn thành 100% bài học cấp độ A1',
    stars: 1,
    palette: {
      primary: '#0284C7',
      secondary: '#38BDF8',
      highlight: '#E0F2FE',
      darkBg: '#082F49',
      rim: '#7DD3FC',
      textLight: 'text-sky-700',
      textDark: 'dark:text-sky-300',
    },
  },
  {
    id: 'level_a2_specialist',
    levelId: 'A2',
    titleVi: 'Chuyên gia A2',
    shortTitleVi: 'Chuyên gia A2',
    englishTag: 'A2 Specialist',
    descriptionVi: 'Làm chủ toàn bộ chủ đề giao tiếp cơ bản, du lịch và công sở cấp độ A2.',
    unlockCriteriaVi: 'Hoàn thành 100% bài học cấp độ A2',
    stars: 2,
    palette: {
      primary: '#EA580C',
      secondary: '#FF8524',
      highlight: '#FEF3C7',
      darkBg: '#431407',
      rim: '#FDBA74',
      textLight: 'text-[#D94E00]',
      textDark: 'dark:text-[#FF8524]',
    },
  },
  {
    id: 'level_b1_captain',
    levelId: 'B1',
    titleVi: 'Cơ trưởng B1',
    shortTitleVi: 'Cơ trưởng B1',
    englishTag: 'B1 Captain',
    descriptionVi: 'Tự tin giao tiếp độc lập, tranh luận và xử lý tình huống chuẩn trung cấp B1.',
    unlockCriteriaVi: 'Hoàn thành 100% bài học cấp độ B1',
    stars: 3,
    palette: {
      primary: '#059669',
      secondary: '#34D399',
      highlight: '#D1FAE5',
      darkBg: '#022C22',
      rim: '#6EE7B7',
      textLight: 'text-emerald-700',
      textDark: 'dark:text-emerald-300',
    },
  },
  {
    id: 'level_b2_strategist',
    levelId: 'B2',
    titleVi: 'Bậc thầy B2',
    shortTitleVi: 'Bậc thầy B2',
    englishTag: 'B2 Master',
    descriptionVi: 'Thành thạo lập luận sắc bén, đàm phán chuyên nghiệp và phân tích chuyên sâu B2.',
    unlockCriteriaVi: 'Hoàn thành 100% bài học cấp độ B2',
    stars: 4,
    palette: {
      primary: '#6D28D9',
      secondary: '#A78BFA',
      highlight: '#EDE9FE',
      darkBg: '#2E1065',
      rim: '#C4B5FD',
      textLight: 'text-violet-700',
      textDark: 'dark:text-violet-300',
    },
  },
  {
    id: 'level_c1_commander',
    levelId: 'C1',
    titleVi: 'Huyền thoại C1',
    shortTitleVi: 'Huyền thoại C1',
    englishTag: 'C1 Commander',
    descriptionVi: 'Chinh phục đỉnh cao tiếng Anh học thuật, hùng biện chiến lược và điều hành C1.',
    unlockCriteriaVi: 'Hoàn thành 100% bài học cấp độ C1',
    stars: 5,
    palette: {
      primary: '#D97706',
      secondary: '#FACC15',
      highlight: '#FEF9C3',
      darkBg: '#451A03',
      rim: '#FDE047',
      textLight: 'text-amber-700',
      textDark: 'dark:text-amber-300',
    },
  },
];

export const LEVEL_BADGE_BY_ID: Record<LevelBadgeId, LevelBadgeDefinition> = Object.fromEntries(
  LEVEL_BADGES.map((b) => [b.id, b])
) as Record<LevelBadgeId, LevelBadgeDefinition>;

export const LEVEL_BADGE_BY_LEVEL: Record<LearnerCEFRLevel, LevelBadgeDefinition> =
  Object.fromEntries(LEVEL_BADGES.map((b) => [b.levelId, b])) as Record<
    LearnerCEFRLevel,
    LevelBadgeDefinition
  >;

export function isValidLevelBadgeId(value: unknown): value is LevelBadgeId {
  return typeof value === 'string' && LEVEL_BADGE_ID_SET.has(value);
}

export function sanitizeEarnedLevelBadges(raw?: unknown): LevelBadgeId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<LevelBadgeId>();
  for (const item of raw) {
    if (isValidLevelBadgeId(item)) {
      seen.add(item);
    }
  }
  // Preserve canonical A1 -> C1 order
  return LEVEL_BADGE_IDS.filter((id) => seen.has(id));
}

export interface LevelBadgeProgressItem {
  badge: LevelBadgeDefinition;
  earned: boolean;
  completedLessons: number;
  totalLessons: number;
  percent: number;
}

/**
 * Computes exact per-level milestone badge progress from published lessons and user progress.
 */
export function computeLevelBadgeProgress(params: {
  lessons: LessonDoc[];
  progressMap: Record<string, UserProgressDoc>;
}): LevelBadgeProgressItem[] {
  const { lessons, progressMap } = params;
  const published = lessons.filter((l) => l.isPublished !== false);

  return LEVEL_BADGES.map((badge) => {
    const levelLessons = published.filter((l) => l.levelId === badge.levelId);
    const totalLessons = levelLessons.length;
    const completedLessons = levelLessons.filter(
      (l) => Boolean(progressMap[l.lessonId]?.lessonCompleted)
    ).length;
    const percent =
      totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;
    const earned = totalLessons > 0 && completedLessons >= totalLessons;

    return {
      badge,
      earned,
      completedLessons,
      totalLessons,
      percent,
    };
  });
}

/**
 * Returns the canonical ordered array of earned level badge IDs for a learner.
 */
export function computeEarnedLevelBadgeIds(params: {
  lessons: LessonDoc[];
  progressMap: Record<string, UserProgressDoc>;
}): LevelBadgeId[] {
  return computeLevelBadgeProgress(params)
    .filter((item) => item.earned)
    .map((item) => item.badge.id);
}

/**
 * Resolves earned level badges for a leaderboard row.
 * Uses the exact synced `earnedBadges` array when present; otherwise falls back conservatively
 * for legacy entries that have not yet re-synced.
 */
export function resolveLeaderboardBadges(entry: {
  earnedBadges?: LevelBadgeId[];
  currentLevel: LearnerCEFRLevel;
  completedLessons: number;
}): LevelBadgeDefinition[] {
  if (Array.isArray(entry.earnedBadges)) {
    return sanitizeEarnedLevelBadges(entry.earnedBadges).map((id) => LEVEL_BADGE_BY_ID[id]);
  }

  // Conservative legacy fallback based on verified completed lesson thresholds + level progression
  const inferred: LevelBadgeId[] = [];
  const levelOrder: LearnerCEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const currentIdx = levelOrder.indexOf(entry.currentLevel);

  if (currentIdx >= 1 && entry.completedLessons >= 10) {
    inferred.push('level_a1_pioneer');
  }
  if (currentIdx >= 2 && entry.completedLessons >= 20) {
    inferred.push('level_a2_specialist');
  }
  if (currentIdx >= 3 && entry.completedLessons >= 30) {
    inferred.push('level_b1_captain');
  }
  if (currentIdx >= 4 && entry.completedLessons >= 36) {
    inferred.push('level_b2_strategist');
  }

  return inferred.map((id) => LEVEL_BADGE_BY_ID[id]);
}

export function getLevelBadgeForLevel(levelId: LearnerCEFRLevel): LevelBadgeDefinition {
  return LEVEL_BADGE_BY_LEVEL[levelId] ?? LEVEL_BADGES[0];
}
