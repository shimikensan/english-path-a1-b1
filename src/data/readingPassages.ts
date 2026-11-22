import type { ReadingPassageDoc } from '../types';
import { COMMUNICATION_ETIQUETTE_PASSAGES } from './readings/communicationEtiquette';
import { EXPERIENCE_DISCOVERY_PASSAGES } from './readings/experienceDiscovery';
import { HEALTH_BALANCE_PASSAGES } from './readings/healthBalance';
import { LEARNING_CAREER_PASSAGES } from './readings/learningCareer';
import { MOTIVATION_LIFE_PASSAGES } from './readings/motivationLife';
import { POSITIVE_HABITS_PASSAGES } from './readings/positiveHabits';

export const READING_CATEGORIES = [
  'Động lực & Cuộc sống',
  'Thói quen tích cực',
  'Giao tiếp & Ứng xử',
  'Sức khỏe & Cân bằng',
  'Học tập & Sự nghiệp',
  'Trải nghiệm & Khám phá',
] as const;

const FEATURED_STARTER_IDS = [
  'read_no_pain_no_gain',
  'read_small_morning_habits',
  'read_power_of_thank_you',
  'read_short_walk_clears_mind',
  'read_learning_from_mistakes',
  'read_art_of_listening',
  'read_digital_detox_focus',
  'read_quiet_resilience',
] as const;

function buildOrderedReadingPassages(): ReadingPassageDoc[] {
  const categoryBuckets: ReadingPassageDoc[][] = [
    MOTIVATION_LIFE_PASSAGES,
    POSITIVE_HABITS_PASSAGES,
    COMMUNICATION_ETIQUETTE_PASSAGES,
    HEALTH_BALANCE_PASSAGES,
    LEARNING_CAREER_PASSAGES,
    EXPERIENCE_DISCOVERY_PASSAGES,
  ];

  const allRaw = categoryBuckets.flat();
  const byId = new Map<string, ReadingPassageDoc>();
  for (const item of allRaw) {
    byId.set(item.passageId, item);
  }

  const featuredSet = new Set<string>(FEATURED_STARTER_IDS);
  const featured: ReadingPassageDoc[] = FEATURED_STARTER_IDS.map((id) => byId.get(id)).filter(
    (item): item is ReadingPassageDoc => Boolean(item)
  );

  // Interleave remaining passages across the 6 categories so learners experience fresh variety
  const remainingBuckets = categoryBuckets.map((bucket) =>
    bucket.filter((item) => !featuredSet.has(item.passageId))
  );
  const maxLen = Math.max(...remainingBuckets.map((b) => b.length));
  const interleaved: ReadingPassageDoc[] = [];

  for (let i = 0; i < maxLen; i++) {
    for (const bucket of remainingBuckets) {
      if (i < bucket.length) {
        interleaved.push(bucket[i]);
      }
    }
  }

  return [...featured, ...interleaved].map((item, idx) => ({
    ...item,
    order: idx + 1,
  }));
}

export const DEFAULT_READING_PASSAGES: ReadingPassageDoc[] = buildOrderedReadingPassages();
