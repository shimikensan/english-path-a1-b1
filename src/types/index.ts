import type { Timestamp } from 'firebase/firestore';

export type LearnerCEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type CEFRLevelId = LearnerCEFRLevel | 'ESP' | 'TOEIC' | string;

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'phrase'
  | 'preposition'
  | 'conjunction'
  | 'pronoun';

export type QuizQuestionType =
  | 'vocab_en_to_vi'
  | 'vocab_vi_to_en'
  | 'fill_blank'
  | 'sentence_pattern'
  | 'grammar'
  | 'word_order'
  | 'reading_comprehension';

export type QuizRating =
  | 'Excellent'
  | 'Very Good'
  | 'Good'
  | 'Need More Practice'
  | 'Keep Learning';

export interface VocabularyItem {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: PartOfSpeech;
  meaningVi: string;
  exampleEn: string;
  exampleVi: string;
  category?: string;
}

export interface DialogueLine {
  speaker: string;
  en: string;
  vi: string;
}

export interface SentencePattern {
  id: string;
  structure: string;
  meaningVi: string;
  usageVi: string;
  exampleEn: string;
  exampleVi: string;
  dialogue: DialogueLine[];
}

export interface GrammarExample {
  en: string;
  vi: string;
  highlight?: string;
}

export interface GrammarMistake {
  wrong: string;
  right: string;
  explanationVi: string;
}

export interface GrammarMiniExercise {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanationVi: string;
}

export interface GrammarContent {
  title: string;
  summaryVi: string;
  formula: string;
  usageVi: string[];
  examples: GrammarExample[];
  commonMistakes: GrammarMistake[];
  miniPractice: GrammarMiniExercise[];
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  passage?: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanationVi: string;
}

export interface LevelDoc {
  levelId: string;
  name: string;
  subtitle: string;
  description: string;
  order: number;
  isPublished: boolean;
  bannerImage?: string;
  updatedAt?: Timestamp | Date | string;
}

export interface LessonDoc {
  lessonId: string;
  levelId: string;
  topic: string;
  topicOrder: number;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  isPublished: boolean;
  vocabulary: VocabularyItem[];
  sentencePatterns: SentencePattern[];
  grammar: GrammarContent;
  quiz: QuizQuestion[];
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  currentLevel: LearnerCEFRLevel;
  streakDays: number;
  lastStudyDate: string;
  dailyGoalMinutes: number;
  reminderEnabled: boolean;
  createdAt?: Timestamp | Date;
  lastLogin?: Timestamp | Date;
  totalAccessSeconds?: number;
}

export interface AdminRecord {
  uid: string;
  email: string;
  grantedBy: string;
  createdAt?: Timestamp | Date;
}

export interface RevokedUserDoc {
  uid: string;
  email: string;
  fullName: string;
  reason: string;
  revokedBy: string;
  revokedByEmail: string;
  revokedAt?: Timestamp | Date;
}

export interface AdminSecurityVaultDoc {
  configId: 'vault';
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
  saltHex: string;
  hashHex: string;
  updatedBy: string;
  updatedByEmail: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface UserProgressDoc {
  id?: string;
  uid: string;
  lessonId: string;
  levelId: string;
  vocabularyLearned: string[];
  lessonCompleted: boolean;
  quizBestScore: number;
  quizAttempts: number;
  createdAt?: Timestamp | Date;
  lastStudyAt?: Timestamp | Date;
}

export interface QuizResultDoc {
  id?: string;
  uid: string;
  lessonId: string;
  lessonTitle: string;
  levelId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  rating: QuizRating;
  durationSeconds: number;
  completedAt?: Timestamp | Date;
}

export interface UserVocabularyDoc {
  id?: string;
  uid: string;
  vocabularyId: string;
  lessonId: string;
  levelId: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  exampleEn: string;
  exampleVi: string;
  isFavorite: boolean;
  isLearned: boolean;
  updatedAt?: Timestamp | Date;
}

export interface LeaderboardPilotEquipped {
  helmet: string;
  goggles: string;
  suit: string;
  scarf: string;
  backpack: string;
  companion: string;
  aircraft?: string;
}

export interface LeaderboardEntryDoc {
  uid: string;
  displayName: string;
  currentLevel: LearnerCEFRLevel;
  completedLessons: number;
  totalLessons: number;
  completionPercent: number;
  learnedVocabCount: number;
  averageQuizScore: number;
  streakDays: number;
  gemsEarned?: number;
  totalAccessSeconds?: number;
  firstLoginAt?: Timestamp | Date;
  pilotEquipped?: LeaderboardPilotEquipped;
  isPublic: boolean;
  updatedAt?: Timestamp | Date;
}

export type FeedbackCategory = 'bug' | 'content' | 'feature' | 'ui_ux' | 'other';

export type FeedbackStatus = 'new' | 'reviewing' | 'resolved' | 'closed';

export interface UserFeedbackDoc {
  id?: string;
  uid: string;
  userName: string;
  userEmail: string;
  userLevel: LearnerCEFRLevel;
  category: FeedbackCategory;
  contextPage: string;
  title: string;
  content: string;
  rating: number;
  status: FeedbackStatus;
  adminNote: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface ReadingKeyPhrase {
  phrase: string;
  meaningVi: string;
}

export interface ReadingPassageDoc {
  passageId: string;
  titleEn: string;
  titleVi: string;
  levelId: LearnerCEFRLevel;
  category: string;
  contentEn: string;
  contentVi: string;
  keyPhrases: ReadingKeyPhrase[];
  estimatedMinutes: number;
  order: number;
  isPublished: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export type ClubAvatarGender = 'male' | 'female';

export interface ClubPilotEquipped {
  helmet: string;
  goggles: string;
  suit: string;
  scarf: string;
  backpack: string;
  companion: string;
}

export interface ClubMemberDoc {
  uid: string;
  displayName: string;
  currentLevel: LearnerCEFRLevel;
  avatarGender: ClubAvatarGender;
  pilotEquipped?: ClubPilotEquipped;
  statusText: string;
  posX: number;
  posZ: number;
  rotationY: number;
  isOnline: boolean;
  joinedAt?: Timestamp | Date;
  lastActiveAt?: Timestamp | Date;
}

export interface ClubMessageDoc {
  id: string;
  pairId: string;
  participants: [string, string];
  senderUid: string;
  senderName: string;
  senderAvatar: ClubAvatarGender;
  receiverUid: string;
  text: string;
  createdAt?: Timestamp | Date;
  createdAtMs?: number;
}

export type ClubMusicMode = 'builtin_see_you_again' | 'uploaded';

export interface ClubMusicConfigDoc {
  configId: 'music';
  mode: ClubMusicMode;
  title: string;
  artist: string;
  audioUrl: string;
  fileName: string;
  storedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  defaultVolume: number;
  enabled: boolean;
  updatedBy: string;
  updatedByName: string;
  updatedAt?: Timestamp | Date;
}

export type StoryCollectionId = 'grimm' | 'andersen' | 'aesop' | 'perrault' | 'originals';

export interface StorySentence {
  en: string;
  vi: string;
}

export interface StoryGlossaryItem {
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
}

export interface StoryGrammarPoint {
  title: string;
  formula: string;
  explanationVi: string;
  exampleEn: string;
  exampleVi: string;
}

export interface StoryComprehensionQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanationVi: string;
}

export interface EnglishStory {
  id: string;
  titleEn: string;
  titleVi: string;
  author: string;
  collection: StoryCollectionId;
  levelId: LearnerCEFRLevel;
  estimatedMinutes: number;
  coverImage: string;
  summaryVi: string;
  moralVi: string;
  sentences: StorySentence[];
  glossary: StoryGlossaryItem[];
  grammarPoints: StoryGrammarPoint[];
  quiz: StoryComprehensionQuestion[];
}

export interface PilotHangarDoc {
  uid: string;
  ownedItemIds: string[];
  equipped: {
    helmet: string;
    goggles: string;
    suit: string;
    scarf: string;
    backpack: string;
    companion: string;
    aircraft?: string;
  };
  spentGems: number;
  bonusGems: number;
  updatedAt: unknown;
}

export interface ToeicGroupMemberInfo {
  uid: string;
  displayName: string;
  currentLevel: LearnerCEFRLevel;
  joinedAtMs: number;
}

export type ToeicGroupBadgeShape =
  | 'shield'
  | 'hexagon'
  | 'wings'
  | 'crest'
  | 'diamond'
  | 'circle';

export type ToeicGroupBadgeIcon =
  | 'plane'
  | 'crown'
  | 'trophy'
  | 'bolt'
  | 'book'
  | 'compass'
  | 'star'
  | 'flame';

export type ToeicGroupBadgePaletteId =
  | 'pilot_orange'
  | 'navy_gold'
  | 'emerald_ace'
  | 'royal_violet'
  | 'crimson_jet'
  | 'arctic_cyan'
  | 'obsidian_amber'
  | 'rose_squad';

export type ToeicGroupBadgePattern = 'solid' | 'stripes' | 'rays' | 'grid';

export type ToeicGroupBadgeFrame = 'classic' | 'double' | 'laurel' | 'wings_trim';

export interface ToeicGroupBadge {
  shape: ToeicGroupBadgeShape;
  icon: ToeicGroupBadgeIcon;
  paletteId: ToeicGroupBadgePaletteId;
  pattern: ToeicGroupBadgePattern;
  frame: ToeicGroupBadgeFrame;
  monogram: string;
  motto: string;
}

export interface ToeicGroupDoc {
  groupId: string;
  name: string;
  description: string;
  inviteCode: string;
  targetScore: number;
  maxMembers: number;
  creatorUid: string;
  creatorName: string;
  memberUids: string[];
  members: Record<string, ToeicGroupMemberInfo>;
  isPublic: boolean;
  badge?: ToeicGroupBadge;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface ToeicGroupVocabDoc {
  entryId: string;
  groupId: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  exampleEn: string;
  exampleVi: string;
  noteVi: string;
  topicLabel: string;
  sourceVocabId: string;
  sourceLessonId: string;
  sharedByUid: string;
  sharedByName: string;
  likedByUids: string[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface ToeicChallengeQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanationVi: string;
}

export interface ToeicChallengeParticipant {
  uid: string;
  displayName: string;
  ready: boolean;
  score: number;
  correctCount: number;
  answeredCount: number;
  finished: boolean;
  finishedAtMs: number;
}

export type ToeicChallengeStatus = 'waiting' | 'active' | 'finished';

export interface ToeicGroupChallengeDoc {
  challengeId: string;
  groupId: string;
  title: string;
  scopeLabel: string;
  hostUid: string;
  hostName: string;
  status: ToeicChallengeStatus;
  questionCount: number;
  timeLimitSeconds: number;
  questions: ToeicChallengeQuestion[];
  participantUids: string[];
  participants: Record<string, ToeicChallengeParticipant>;
  isQuickChallenge?: boolean;
  invitedUids?: string[];
  startedAtMs: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type AppRoute =
  | 'dashboard'
  | 'pilot-hangar'
  | 'roadmap'
  | 'specialized'
  | 'toeic'
  | 'ai-tutor'
  | 'english-club'
  | 'vocabulary'
  | 'patterns'
  | 'reading'
  | 'stories'
  | 'games'
  | 'practice'
  | 'quizzes'
  | 'saved'
  | 'progress'
  | 'leaderboard'
  | 'feedback'
  | 'account'
  | 'lesson'
  | 'admin';

export type LessonTab = 'vocabulary' | 'patterns' | 'grammar' | 'quiz';
