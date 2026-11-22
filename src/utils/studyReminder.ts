import type { QuizResultDoc, UserProfile, UserProgressDoc, UserVocabularyDoc } from '../types';

export const STUDY_INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 giờ
export const REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000; // Kiểm tra định kỳ mỗi 15 phút
export const REMINDER_REPEAT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // Nhắc lại định kỳ tối đa mỗi 4 giờ

function getLastStudyStorageKey(uid: string): string {
  return `pilot_last_study_ts_v1_${uid}`;
}

function getReminderShownStorageKey(uid: string): string {
  return `pilot_study_reminder_shown_v1_${uid}`;
}

export function extractTimestampMs(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (typeof value === 'object') {
    const rec = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
    if (typeof rec.toMillis === 'function') {
      const ms = rec.toMillis();
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
    if (typeof rec.toDate === 'function') {
      const d = rec.toDate();
      const ms = d instanceof Date ? d.getTime() : NaN;
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
    if (typeof rec.seconds === 'number' && Number.isFinite(rec.seconds) && rec.seconds > 0) {
      return rec.seconds * 1000;
    }
  }
  return null;
}

/**
 * Fallback parser for profile.lastStudyDate ("YYYY-MM-DD") when exact Firestore timestamps
 * are absent. Uses end-of-day local time (23:59:59) to avoid false positives under 24 hours.
 */
export function parseLastStudyDateFallbackMs(dateStr?: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return null;
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  if (!y || !m || !d) return null;
  const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
  const ms = endOfDay.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function readLocalLastStudyMs(uid: string): number | null {
  if (!uid) return null;
  try {
    const raw = window.localStorage.getItem(getLastStudyStorageKey(uid));
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalLastStudyMs(uid: string, ts = Date.now()): void {
  if (!uid) return;
  try {
    window.localStorage.setItem(getLastStudyStorageKey(uid), String(Math.round(ts)));
  } catch {
    // Ignore storage quota errors
  }
}

export function readLastReminderShownMs(uid: string): number {
  if (!uid) return 0;
  try {
    const raw = window.localStorage.getItem(getReminderShownStorageKey(uid));
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function writeLastReminderShownMs(uid: string, ts = Date.now()): void {
  if (!uid) return;
  try {
    window.localStorage.setItem(getReminderShownStorageKey(uid), String(Math.round(ts)));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearLastReminderShownMs(uid: string): void {
  if (!uid) return;
  try {
    window.localStorage.removeItem(getReminderShownStorageKey(uid));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Resolves the learner's most recent study timestamp in milliseconds across
 * Firestore progress, quiz attempts, vocabulary study, local study heartbeat,
 * and profile fallbacks.
 */
export function computeLastStudyTimestampMs(params: {
  uid: string;
  profile: UserProfile | null;
  progressMap: Record<string, UserProgressDoc>;
  quizResults: QuizResultDoc[];
  vocabMap: Record<string, UserVocabularyDoc>;
}): number | null {
  const { uid, profile, progressMap, quizResults, vocabMap } = params;
  let latestMs = 0;

  const consider = (ts: number | null) => {
    if (ts && ts > latestMs) {
      latestMs = ts;
    }
  };

  for (const prog of Object.values(progressMap)) {
    consider(extractTimestampMs(prog.lastStudyAt));
  }

  for (const res of quizResults) {
    consider(extractTimestampMs(res.completedAt));
  }

  for (const vocab of Object.values(vocabMap)) {
    consider(extractTimestampMs(vocab.updatedAt));
  }

  consider(readLocalLastStudyMs(uid));

  // Only fall back to date-level or account creation timestamps if no exact study activity exists
  if (latestMs === 0 && profile) {
    consider(parseLastStudyDateFallbackMs(profile.lastStudyDate));
    if (latestMs === 0) {
      consider(extractTimestampMs(profile.createdAt));
    }
  }

  return latestMs > 0 ? latestMs : null;
}

export function formatInactivityDurationVi(elapsedMs: number): string {
  const safeMs = Math.max(STUDY_INACTIVITY_THRESHOLD_MS, elapsedMs);
  const totalHours = Math.floor(safeMs / (60 * 60 * 1000));

  if (totalHours < 48) {
    return `${totalHours} giờ`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (days < 7 && remainingHours > 0) {
    return `${days} ngày ${remainingHours} giờ`;
  }

  return `${days} ngày`;
}

export function buildStudyReminderCopy(params: {
  elapsedMs: number;
  streakDays: number;
  dailyGoalMinutes: number;
}): { title: string; message: string } {
  const durationText = formatInactivityDurationVi(params.elapsedMs);
  const goalMinutes = Math.max(5, Math.min(30, params.dailyGoalMinutes || 15));

  if (params.streakDays >= 3) {
    return {
      title: 'Nhắc nhở quay lại luyện tập',
      message: `Đã ${durationText} kể từ phiên học cuối cùng của bạn. Dành ${goalMinutes} phút ôn tập ngay để giữ vững chuỗi ${params.streakDays} ngày bay nhé!`,
    };
  }

  return {
    title: 'Đã đến lúc quay lại buồng lái!',
    message: `Đã ${durationText} kể từ phiên học cuối cùng của bạn. Hãy dành ${goalMinutes} phút luyện từ vựng hoặc làm bài tập để duy trì đà tiến bộ nhé!`,
  };
}
