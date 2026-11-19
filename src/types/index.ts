import type { Timestamp } from 'firebase/firestore';

export type CEFRLevelId = 'A1' | 'A2' | 'B1' | string;

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
  currentLevel: 'A1' | 'A2' | 'B1';
  streakDays: number;
  lastStudyDate: string;
  dailyGoalMinutes: number;
  reminderEnabled: boolean;
  createdAt?: Timestamp | Date;
  lastLogin?: Timestamp | Date;
}

export interface AdminRecord {
  uid: string;
  email: string;
  grantedBy: string;
  createdAt?: Timestamp | Date;
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

export interface LeaderboardEntryDoc {
  uid: string;
  displayName: string;
  currentLevel: 'A1' | 'A2' | 'B1';
  completedLessons: number;
  totalLessons: number;
  completionPercent: number;
  learnedVocabCount: number;
  averageQuizScore: number;
  streakDays: number;
  isPublic: boolean;
  updatedAt?: Timestamp | Date;
}

export type AppRoute =
  | 'dashboard'
  | 'roadmap'
  | 'vocabulary'
  | 'patterns'
  | 'practice'
  | 'quizzes'
  | 'saved'
  | 'progress'
  | 'leaderboard'
  | 'account'
  | 'lesson'
  | 'admin';

export type LessonTab = 'vocabulary' | 'patterns' | 'grammar' | 'quiz';
