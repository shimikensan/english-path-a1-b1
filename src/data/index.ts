import type { LessonDoc } from '../types';
import { LESSONS_A1 } from './lessonsA1';
import { LESSONS_A2 } from './lessonsA2';
import { LESSONS_B1 } from './lessonsB1';
import { ESP_ACRONYMS, ESP_SCENARIOS, ESP_TRACKS, LESSONS_ESP } from './lessonsESP';

export { APP_BRAND, AUTH_HERO_IMAGE, DEFAULT_LEVELS, LEVEL_BANNERS, PILOT_RANKS } from './levels';
export { ESP_ACRONYMS, ESP_SCENARIOS, ESP_TRACKS, LESSONS_A1, LESSONS_A2, LESSONS_B1, LESSONS_ESP };
export type { EspAcronymItem, EspScenarioItem, EspTrackId, EspTrackMeta } from './lessonsESP';

export const ALL_DEFAULT_LESSONS: LessonDoc[] = [
  ...LESSONS_A1,
  ...LESSONS_A2,
  ...LESSONS_B1,
  ...LESSONS_ESP,
];

export function getDefaultLessonsByLevel(levelId: string): LessonDoc[] {
  if (levelId === 'A1') return LESSONS_A1;
  if (levelId === 'A2') return LESSONS_A2;
  if (levelId === 'B1') return LESSONS_B1;
  if (levelId === 'ESP') return LESSONS_ESP;
  return [];
}
