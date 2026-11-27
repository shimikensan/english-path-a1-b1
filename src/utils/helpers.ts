import type { QuizQuestion, QuizRating } from '../types';

export function getQuizRating(scorePercent: number): QuizRating {
  if (scorePercent >= 90) return 'Excellent';
  if (scorePercent >= 80) return 'Very Good';
  if (scorePercent >= 65) return 'Good';
  if (scorePercent >= 50) return 'Need More Practice';
  return 'Keep Learning';
}

export function getQuizRatingVi(rating: QuizRating): {
  labelVi: string;
  descriptionVi: string;
  tone: 'emerald' | 'blue' | 'amber' | 'rose';
} {
  switch (rating) {
    case 'Excellent':
      return {
        labelVi: 'Xuất sắc',
        descriptionVi: 'Bạn đã nắm vững toàn bộ kiến thức bài học này!',
        tone: 'emerald',
      };
    case 'Very Good':
      return {
        labelVi: 'Rất tốt',
        descriptionVi: 'Nền tảng vững chắc, chỉ cần ôn thêm một vài chi tiết nhỏ.',
        tone: 'blue',
      };
    case 'Good':
      return {
        labelVi: 'Khá tốt',
        descriptionVi: 'Bạn đã hiểu phần lớn nội dung, hãy xem lại các câu chưa đúng.',
        tone: 'blue',
      };
    case 'Need More Practice':
      return {
        labelVi: 'Cần luyện tập thêm',
        descriptionVi: 'Hãy ôn lại phần từ vựng và ngữ pháp rồi thử làm lại bài kiểm tra.',
        tone: 'amber',
      };
    default:
      return {
        labelVi: 'Tiếp tục cố gắng',
        descriptionVi: 'Đừng nản lòng! Hãy học lại Flashcard và mẫu câu trước khi thi lại.',
        tone: 'rose',
      };
  }
}

export function getQuestionTypeLabelVi(type: QuizQuestion['type']): string {
  switch (type) {
    case 'vocab_en_to_vi':
      return 'Từ vựng Anh → Việt';
    case 'vocab_vi_to_en':
      return 'Từ vựng Việt → Anh';
    case 'fill_blank':
      return 'Điền từ vào chỗ trống';
    case 'sentence_pattern':
      return 'Mẫu câu giao tiếp';
    case 'grammar':
      return 'Ngữ pháp trọng tâm';
    case 'word_order':
      return 'Sắp xếp thành câu';
    case 'reading_comprehension':
      return 'Đọc hiểu đoạn văn';
    default:
      return 'Trắc nghiệm';
  }
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface ShuffledQuizQuestion extends QuizQuestion {
  shuffledOptions: string[];
  shuffledCorrectIndex: number;
}

export function prepareShuffledQuiz(questions: QuizQuestion[]): ShuffledQuizQuestion[] {
  const randomizedQuestions = shuffleArray(questions);
  return randomizedQuestions.map((q) => {
    const indexed = q.options.map((text, idx) => ({ text, isCorrect: idx === q.correctIndex }));
    const mixed = shuffleArray(indexed);
    const shuffledCorrectIndex = mixed.findIndex((item) => item.isCorrect);
    return {
      ...q,
      shuffledOptions: mixed.map((item) => item.text),
      shuffledCorrectIndex: shuffledCorrectIndex >= 0 ? shuffledCorrectIndex : 0,
    };
  });
}

export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateUpdatedStreak(
  currentStreak: number,
  lastStudyDate: string
): { streakDays: number; lastStudyDate: string } {
  const today = getLocalDateString();
  if (!lastStudyDate) {
    return { streakDays: 1, lastStudyDate: today };
  }
  if (lastStudyDate === today) {
    return { streakDays: Math.max(1, currentStreak), lastStudyDate: today };
  }
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);
  if (lastStudyDate === yesterday) {
    return { streakDays: Math.max(1, currentStreak) + 1, lastStudyDate: today };
  }
  return { streakDays: 1, lastStudyDate: today };
}

export function sanitizeId(input: string, maxLength = 80): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
  return cleaned || `id_${Date.now()}`;
}

export function truncate(str: string, maxLen: number): string {
  return (str ?? '').trim().slice(0, maxLen);
}

function toValidDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'object') {
    const record = value as {
      toDate?: () => Date;
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof record.toDate === 'function') {
      const d = record.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (typeof record.toMillis === 'function') {
      const d = new Date(record.toMillis());
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof record.seconds === 'number') {
      const d = new Date(record.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof record._seconds === 'number') {
      const d = new Date(record._seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function toTimestampMillis(value: unknown): number | null {
  const date = toValidDate(value);
  return date ? date.getTime() : null;
}

export function formatTimestampVi(value: unknown): string {
  const date = toValidDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDateVi(value: unknown): string {
  const date = toValidDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function formatAccessDurationVi(totalSeconds?: number | null): string {
  if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '—';
  }
  const rounded = Math.floor(totalSeconds);
  if (rounded < 60) {
    return `${rounded} giây`;
  }
  const totalMinutes = Math.floor(rounded / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} giờ`;
  }
  return `${hours} giờ ${minutes} phút`;
}
