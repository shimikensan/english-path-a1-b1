import type { LessonDoc } from '../types';
import { LESSONS_A1 } from './lessonsA1';
import { LESSONS_A2 } from './lessonsA2';
import { LESSONS_B1 } from './lessonsB1';

export { AUTH_HERO_IMAGE, DEFAULT_LEVELS, LEVEL_BANNERS } from './levels';
export { LESSONS_A1, LESSONS_A2, LESSONS_B1 };

export const ALL_DEFAULT_LESSONS: LessonDoc[] = [
  ...LESSONS_A1,
  ...LESSONS_A2,
  ...LESSONS_B1,
];

export function getDefaultLessonsByLevel(levelId: string): LessonDoc[] {
  if (levelId === 'A1') return LESSONS_A1;
  if (levelId === 'A2') return LESSONS_A2;
  if (levelId === 'B1') return LESSONS_B1;
  return [];
}
