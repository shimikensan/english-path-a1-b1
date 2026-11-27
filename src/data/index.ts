import type { LessonDoc } from '../types';
import { LESSONS_A1 } from './lessonsA1';
import { LESSONS_A2 } from './lessonsA2';
import { LESSONS_B1 } from './lessonsB1';
import { LESSONS_B2 } from './lessonsB2';
import { LESSONS_C1 } from './lessonsC1';
import { ESP_ACRONYMS, ESP_SCENARIOS, ESP_TRACKS, LESSONS_ESP } from './lessonsESP';
import {
  LESSONS_TOEIC,
  TOEIC_CATEGORIES,
  TOEIC_PART5_DRILLS,
  TOEIC_TOPICS,
  TOEIC_WORD_FAMILIES,
} from './lessonsTOEIC';

export { APP_BRAND, AUTH_HERO_IMAGE, DEFAULT_LEVELS, LEVEL_BANNERS, PILOT_RANKS } from './levels';
export {
  ESP_ACRONYMS,
  ESP_SCENARIOS,
  ESP_TRACKS,
  LESSONS_A1,
  LESSONS_A2,
  LESSONS_B1,
  LESSONS_B2,
  LESSONS_C1,
  LESSONS_ESP,
  LESSONS_TOEIC,
  TOEIC_CATEGORIES,
  TOEIC_PART5_DRILLS,
  TOEIC_TOPICS,
  TOEIC_WORD_FAMILIES,
};
export type { EspAcronymItem, EspScenarioItem, EspTrackId, EspTrackMeta } from './lessonsESP';
export type {
  ToeicCategoryId,
  ToeicCategoryMeta,
  ToeicPart5Question,
  ToeicTopicMeta,
  ToeicWordFamilyItem,
} from './lessonsTOEIC';
export { ESP_VISUAL_CARDS, ESP_VOCAB_IMAGE_MAP } from './espVisualCards';
export type { EspVisualVocabCard } from './espVisualCards';
export { DEFAULT_READING_PASSAGES, READING_CATEGORIES } from './readingPassages';

export const ALL_DEFAULT_LESSONS: LessonDoc[] = [
  ...LESSONS_A1,
  ...LESSONS_A2,
  ...LESSONS_B1,
  ...LESSONS_B2,
  ...LESSONS_C1,
  ...LESSONS_ESP,
  ...LESSONS_TOEIC,
];

export function getDefaultLessonsByLevel(levelId: string): LessonDoc[] {
  if (levelId === 'A1') return LESSONS_A1;
  if (levelId === 'A2') return LESSONS_A2;
  if (levelId === 'B1') return LESSONS_B1;
  if (levelId === 'B2') return LESSONS_B2;
  if (levelId === 'C1') return LESSONS_C1;
  if (levelId === 'ESP') return LESSONS_ESP;
  if (levelId === 'TOEIC') return LESSONS_TOEIC;
  return [];
}
