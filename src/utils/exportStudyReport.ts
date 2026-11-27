import { APP_BRAND, PILOT_RANKS } from '../data';
import type {
  LessonDoc,
  QuizResultDoc,
  UserProfile,
  UserProgressDoc,
  UserVocabularyDoc,
} from '../types';
import {
  formatAccessDurationVi,
  formatTimestampVi,
  getLocalDateString,
  getQuizRatingVi,
  toTimestampMillis,
} from './helpers';

export interface ExportStudyDataInput {
  profile: UserProfile | null;
  lessons: LessonDoc[];
  progressMap: Record<string, UserProgressDoc>;
  vocabMap: Record<string, UserVocabularyDoc>;
  quizResults: QuizResultDoc[];
}

export interface LearnedVocabExportRow {
  vocabularyId: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  exampleEn: string;
  exampleVi: string;
  levelId: string;
  lessonTitle: string;
  isFavorite: boolean;
  updatedAtText: string;
}

export interface QuizExportRow {
  completedAtText: string;
  levelId: string;
  lessonTitle: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  ratingVi: string;
  durationSeconds: number;
}

export interface LessonProgressExportRow {
  levelId: string;
  topic: string;
  lessonTitle: string;
  learnedCount: number;
  totalVocab: number;
  quizBestScore: number;
  quizAttempts: number;
  statusVi: string;
}

export interface StudyReportSummary {
  fullName: string;
  email: string;
  currentLevel: string;
  rankVi: string;
  streakDays: number;
  dailyGoalMinutes: number;
  totalAccessText: string;
  completedLessons: number;
  totalLessons: number;
  completionPercent: number;
  learnedVocabCount: number;
  favoriteVocabCount: number;
  quizAttemptsCount: number;
  averageQuizScore: number;
  bestQuizScore: number;
  exportedAtText: string;
  fileDateStamp: string;
  learnedVocab: LearnedVocabExportRow[];
  quizRows: QuizExportRow[];
  lessonRows: LessonProgressExportRow[];
}

export function buildStudyReportSummary(input: ExportStudyDataInput): StudyReportSummary {
  const { profile, lessons, progressMap, vocabMap, quizResults } = input;
  const lessonById = new Map<string, LessonDoc>();
  for (const lesson of lessons) {
    lessonById.set(lesson.lessonId, lesson);
  }

  // Merge learned vocabulary from vocabMap + progressMap fallback without duplicates
  const learnedByKey = new Map<string, LearnedVocabExportRow>();
  let favoriteVocabCount = 0;

  for (const doc of Object.values(vocabMap)) {
    if (doc.isFavorite) favoriteVocabCount += 1;
    if (!doc.isLearned) continue;
    const lesson = lessonById.get(doc.lessonId);
    learnedByKey.set(doc.vocabularyId, {
      vocabularyId: doc.vocabularyId,
      word: doc.word,
      ipa: doc.ipa || '',
      partOfSpeech: doc.partOfSpeech || '',
      meaningVi: doc.meaningVi || '',
      exampleEn: doc.exampleEn || '',
      exampleVi: doc.exampleVi || '',
      levelId: doc.levelId || lesson?.levelId || '',
      lessonTitle: lesson?.title || doc.lessonId,
      isFavorite: Boolean(doc.isFavorite),
      updatedAtText: formatTimestampVi(doc.updatedAt),
    });
  }

  for (const progress of Object.values(progressMap)) {
    const lesson = lessonById.get(progress.lessonId);
    if (!lesson) continue;
    for (const vocabId of progress.vocabularyLearned || []) {
      if (learnedByKey.has(vocabId)) continue;
      const item = lesson.vocabulary.find((v) => v.id === vocabId);
      if (!item) continue;
      learnedByKey.set(vocabId, {
        vocabularyId: vocabId,
        word: item.word,
        ipa: item.ipa || '',
        partOfSpeech: item.partOfSpeech || '',
        meaningVi: item.meaningVi || '',
        exampleEn: item.exampleEn || '',
        exampleVi: item.exampleVi || '',
        levelId: lesson.levelId,
        lessonTitle: lesson.title,
        isFavorite: Boolean(vocabMap[vocabId]?.isFavorite),
        updatedAtText: formatTimestampVi(progress.lastStudyAt),
      });
    }
  }

  const learnedVocab = Array.from(learnedByKey.values()).sort((a, b) => {
    const levelCmp = a.levelId.localeCompare(b.levelId);
    if (levelCmp !== 0) return levelCmp;
    return a.word.localeCompare(b.word);
  });

  // Sort quiz results newest first
  const sortedQuizzes = [...quizResults].sort((a, b) => {
    const tA = toTimestampMillis(a.completedAt) ?? 0;
    const tB = toTimestampMillis(b.completedAt) ?? 0;
    return tB - tA;
  });

  const quizRows: QuizExportRow[] = sortedQuizzes.map((q) => {
    const lesson = lessonById.get(q.lessonId);
    return {
      completedAtText: formatTimestampVi(q.completedAt),
      levelId: q.levelId || lesson?.levelId || '',
      lessonTitle: q.lessonTitle || lesson?.title || q.lessonId,
      score: Math.round(q.score),
      correctAnswers: q.correctAnswers,
      wrongAnswers: q.wrongAnswers,
      totalQuestions: q.totalQuestions,
      ratingVi: getQuizRatingVi(q.rating).labelVi,
      durationSeconds: Math.max(0, Math.round(q.durationSeconds || 0)),
    };
  });

  const lessonRows: LessonProgressExportRow[] = [];
  let completedLessons = 0;

  const sortedLessons = [...lessons].sort((a, b) => {
    const lvlCmp = a.levelId.localeCompare(b.levelId);
    if (lvlCmp !== 0) return lvlCmp;
    return a.order - b.order;
  });

  for (const lesson of sortedLessons) {
    const p = progressMap[lesson.lessonId];
    if (p?.lessonCompleted) completedLessons += 1;
    const learnedCount = p?.vocabularyLearned?.length ?? 0;
    const quizAttempts = p?.quizAttempts ?? 0;
    if (!p || (learnedCount === 0 && quizAttempts === 0 && !p.lessonCompleted)) {
      continue;
    }
    lessonRows.push({
      levelId: lesson.levelId,
      topic: lesson.topic,
      lessonTitle: lesson.title,
      learnedCount,
      totalVocab: lesson.vocabulary.length,
      quizBestScore: Math.round(p.quizBestScore || 0),
      quizAttempts,
      statusVi: p.lessonCompleted ? 'Hoàn thành' : 'Đang học',
    });
  }

  const totalLessons = lessons.length;
  const completionPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const averageQuizScore =
    quizRows.length > 0
      ? Math.round(quizRows.reduce((sum, item) => sum + item.score, 0) / quizRows.length)
      : 0;
  const bestQuizScore =
    quizRows.length > 0 ? Math.max(...quizRows.map((item) => item.score)) : 0;

  const now = new Date();
  const currentLevel = profile?.currentLevel || 'A1';

  return {
    fullName: profile?.fullName || 'Học viên Pilot',
    email: profile?.email || '',
    currentLevel,
    rankVi: PILOT_RANKS[currentLevel]?.rankVi || 'Học viên Phi công',
    streakDays: profile?.streakDays ?? 0,
    dailyGoalMinutes: profile?.dailyGoalMinutes ?? 20,
    totalAccessText: formatAccessDurationVi(profile?.totalAccessSeconds),
    completedLessons,
    totalLessons,
    completionPercent,
    learnedVocabCount: learnedVocab.length,
    favoriteVocabCount,
    quizAttemptsCount: quizRows.length,
    averageQuizScore,
    bestQuizScore,
    exportedAtText: formatTimestampVi(now),
    fileDateStamp: getLocalDateString(now),
    learnedVocab,
    quizRows,
    lessonRows,
  };
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(cells: Array<string | number | boolean | undefined | null>): string {
  return cells.map(escapeCsvCell).join(',');
}

function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Exports a UTF-8 BOM CSV file compatible with Microsoft Excel and Google Sheets.
 */
export function exportStudyReportCsv(input: ExportStudyDataInput): StudyReportSummary {
  const report = buildStudyReportSummary(input);
  const lines: string[] = [];

  lines.push(toCsvRow([`BÁO CÁO TIẾN ĐỘ HỌC TẬP - ${APP_BRAND.fullName.toUpperCase()}`]));
  lines.push(toCsvRow(['Thời điểm xuất báo cáo', report.exportedAtText]));
  lines.push('');

  lines.push(toCsvRow(['1. THÔNG TIN HỌC VIÊN & TỔNG QUAN']));
  lines.push(toCsvRow(['Chỉ mục', 'Giá trị']));
  lines.push(toCsvRow(['Họ và tên', report.fullName]));
  lines.push(toCsvRow(['Email', report.email]));
  lines.push(toCsvRow(['Cấp độ CEFR', `${report.currentLevel} (${report.rankVi})`]));
  lines.push(toCsvRow(['Chuỗi ngày học liên tiếp', `${report.streakDays} ngày`]));
  lines.push(toCsvRow(['Mục tiêu học mỗi ngày', `${report.dailyGoalMinutes} phút`]));
  lines.push(toCsvRow(['Tổng thời gian truy cập', report.totalAccessText]));
  lines.push(
    toCsvRow([
      'Bài học hoàn thành',
      `${report.completedLessons}/${report.totalLessons} (${report.completionPercent}%)`,
    ])
  );
  lines.push(toCsvRow(['Từ vựng đã học', report.learnedVocabCount]));
  lines.push(toCsvRow(['Từ vựng yêu thích', report.favoriteVocabCount]));
  lines.push(toCsvRow(['Tổng lượt làm trắc nghiệm', report.quizAttemptsCount]));
  lines.push(toCsvRow(['Điểm trắc nghiệm trung bình', `${report.averageQuizScore}%`]));
  lines.push(toCsvRow(['Điểm trắc nghiệm cao nhất', `${report.bestQuizScore}%`]));
  lines.push('');

  lines.push(toCsvRow(['2. LỊCH SỬ ĐIỂM TRẮC NGHIỆM']));
  lines.push(
    toCsvRow([
      'STT',
      'Ngày làm bài',
      'Cấp độ',
      'Bài học',
      'Điểm (%)',
      'Số câu đúng',
      'Số câu sai',
      'Tổng câu',
      'Xếp loại',
      'Thời gian làm (giây)',
    ])
  );
  if (report.quizRows.length === 0) {
    lines.push(toCsvRow(['Chưa có lịch sử làm bài trắc nghiệm.']));
  } else {
    report.quizRows.forEach((row, index) => {
      lines.push(
        toCsvRow([
          index + 1,
          row.completedAtText,
          row.levelId,
          row.lessonTitle,
          `${row.score}%`,
          row.correctAnswers,
          row.wrongAnswers,
          row.totalQuestions,
          row.ratingVi,
          row.durationSeconds,
        ])
      );
    });
  }
  lines.push('');

  lines.push(toCsvRow(['3. DANH SÁCH TỪ VỰNG ĐÃ HỌC']));
  lines.push(
    toCsvRow([
      'STT',
      'Từ tiếng Anh',
      'Phiên âm IPA',
      'Từ loại',
      'Nghĩa tiếng Việt',
      'Cấp độ',
      'Bài học',
      'Yêu thích',
      'Câu ví dụ (EN)',
      'Dịch ví dụ (VI)',
      'Cập nhật',
    ])
  );
  if (report.learnedVocab.length === 0) {
    lines.push(toCsvRow(['Chưa có từ vựng nào được đánh dấu đã học.']));
  } else {
    report.learnedVocab.forEach((row, index) => {
      lines.push(
        toCsvRow([
          index + 1,
          row.word,
          row.ipa,
          row.partOfSpeech,
          row.meaningVi,
          row.levelId,
          row.lessonTitle,
          row.isFavorite ? 'Có' : 'Không',
          row.exampleEn,
          row.exampleVi,
          row.updatedAtText,
        ])
      );
    });
  }
  lines.push('');

  lines.push(toCsvRow(['4. TIẾN ĐỘ CHI TIẾT THEO BÀI HỌC']));
  lines.push(
    toCsvRow([
      'STT',
      'Cấp độ',
      'Chủ đề',
      'Bài học',
      'Từ đã học',
      'Tổng từ vựng',
      'Điểm quiz cao nhất (%)',
      'Số lần thi',
      'Trạng thái',
    ])
  );
  if (report.lessonRows.length === 0) {
    lines.push(toCsvRow(['Chưa có bài học nào được ghi nhận tiến độ.']));
  } else {
    report.lessonRows.forEach((row, index) => {
      lines.push(
        toCsvRow([
          index + 1,
          row.levelId,
          row.topic,
          row.lessonTitle,
          row.learnedCount,
          row.totalVocab,
          `${row.quizBestScore}%`,
          row.quizAttempts,
          row.statusVi,
        ])
      );
    });
  }

  // UTF-8 BOM ensures Excel opens Vietnamese characters cleanly without garbling
  const csvContent = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerFileDownload(blob, `bao-cao-hoc-tap-pilot-${report.fileDateStamp}.csv`);
  return report;
}

// --- High-DPI Canvas-Paginated A4 PDF Generator (100% Vietnamese Unicode & IPA safe) ---

const PAGE_W = 1240; // A4 @ 150 DPI
const PAGE_H = 1754;
const MARGIN_X = 68;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_SAFE_Y = PAGE_H - 74;
const FONT_SANS = '"Inter", "Be Vietnam Pro", "Segoe UI", system-ui, -apple-system, sans-serif';
const FONT_MONO = '"JetBrains Mono", "Consolas", "DejaVu Sans Mono", monospace';

interface PdfTableColumn {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const cleaned = (text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return ['—'];
  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        if (lines.length >= maxLines) {
          lines[maxLines - 1] = truncateCanvasLine(ctx, `${lines[maxLines - 1]}…`, maxWidth);
          return lines;
        }
      }
      // Handle single very long token
      if (ctx.measureText(word).width > maxWidth) {
        current = truncateCanvasLine(ctx, word, maxWidth);
      } else {
        current = word;
      }
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines.slice(0, maxLines) : ['—'];
}

function truncateCanvasLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Generates and downloads a crisp multi-page A4 PDF report with complete
 * Vietnamese diacritics and IPA phonetic accuracy.
 */
export async function exportStudyReportPdf(
  input: ExportStudyDataInput
): Promise<StudyReportSummary> {
  const report = buildStudyReportSummary(input);
  const { jsPDF } = await import('jspdf');

  const pages: HTMLCanvasElement[] = [];
  let ctx!: CanvasRenderingContext2D;
  let y = 0;

  const startNewPage = (isFirstPage: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Trình duyệt không hỗ trợ tạo báo cáo PDF bằng Canvas.');
    }
    ctx = context;
    pages.push(canvas);

    // Crisp white paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.textBaseline = 'top';

    if (isFirstPage) {
      // Executive Cockpit Navy Header Banner
      ctx.fillStyle = '#0B192E';
      ctx.fillRect(0, 0, PAGE_W, 212);

      // Pilot Orange accent stripe
      ctx.fillStyle = '#FF6B00';
      ctx.fillRect(0, 206, PAGE_W, 6);

      // Brand Eyebrow
      ctx.fillStyle = '#FF8C2E';
      ctx.font = `700 17px ${FONT_SANS}`;
      ctx.fillText(APP_BRAND.fullName.toUpperCase(), MARGIN_X, 34);

      // Main Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 34px ${FONT_SANS}`;
      ctx.fillText('BÁO CÁO TIẾN ĐỘ HỌC TẬP CÁ NHÂN', MARGIN_X, 66);

      // Learner metadata line
      ctx.fillStyle = '#CBD5E1';
      ctx.font = `500 18px ${FONT_SANS}`;
      const learnerLine = [
        `Học viên: ${report.fullName}`,
        report.email ? `Email: ${report.email}` : '',
        `Cấp độ: CEFR ${report.currentLevel} (${report.rankVi})`,
      ]
        .filter(Boolean)
        .join('   ·   ');
      ctx.fillText(truncateCanvasLine(ctx, learnerLine, CONTENT_W), MARGIN_X, 118);

      // Export timestamp & goal
      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 16px ${FONT_SANS}`;
      ctx.fillText(
        `Ngày xuất báo cáo: ${report.exportedAtText}   ·   Mục tiêu: ${report.dailyGoalMinutes} phút/ngày   ·   Tổng thời gian học: ${report.totalAccessText}`,
        MARGIN_X,
        154
      );

      y = 244;
    } else {
      // Compact continuation header
      ctx.fillStyle = '#0B192E';
      ctx.fillRect(0, 0, PAGE_W, 56);
      ctx.fillStyle = '#FF6B00';
      ctx.fillRect(0, 54, PAGE_W, 3);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 16px ${FONT_SANS}`;
      ctx.fillText(`BÁO CÁO TIẾN ĐỘ HỌC TẬP · ${report.fullName}`, MARGIN_X, 18);

      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 15px ${FONT_SANS}`;
      const rightLabel = APP_BRAND.fullName;
      const rightWidth = ctx.measureText(rightLabel).width;
      ctx.fillText(rightLabel, PAGE_W - MARGIN_X - rightWidth, 19);

      y = 84;
    }
  };

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > FOOTER_SAFE_Y) {
      startNewPage(false);
    }
  };

  const drawSectionHeading = (title: string, subtitle?: string) => {
    ensureSpace(72);
    // Orange vertical accent bar
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(MARGIN_X, y + 3, 5, 24);

    ctx.fillStyle = '#0F172A';
    ctx.font = `700 22px ${FONT_SANS}`;
    ctx.fillText(title, MARGIN_X + 16, y);

    if (subtitle) {
      ctx.fillStyle = '#64748B';
      ctx.font = `500 15px ${FONT_SANS}`;
      ctx.fillText(subtitle, MARGIN_X + 16, y + 30);
      y += 60;
    } else {
      y += 40;
    }
  };

  const drawTableHeader = (columns: PdfTableColumn[]) => {
    const headerH = 40;
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, headerH, 6);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = `700 15px ${FONT_SANS}`;
    let x = MARGIN_X;
    for (const col of columns) {
      const pad = 12;
      const textW = ctx.measureText(col.label).width;
      let drawX = x + pad;
      if (col.align === 'center') {
        drawX = x + (col.width - textW) / 2;
      } else if (col.align === 'right') {
        drawX = x + col.width - pad - textW;
      }
      ctx.fillText(col.label, drawX, y + 12);
      x += col.width;
    }
    y += headerH;
  };

  const drawTable = (
    columns: PdfTableColumn[],
    rows: Array<{
      cells: Array<{ text: string; subtext?: string; color?: string; bold?: boolean; mono?: boolean }>;
    }>,
    emptyMessage: string
  ) => {
    if (rows.length === 0) {
      ensureSpace(64);
      ctx.fillStyle = '#F8FAFC';
      drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 54, 10);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = `500 16px ${FONT_SANS}`;
      ctx.fillText(emptyMessage, MARGIN_X + 20, y + 18);
      y += 74;
      return;
    }

    ensureSpace(92);
    drawTableHeader(columns);

    const lineHeight = 22;
    const subLineHeight = 19;
    const padX = 12;
    const padY = 11;

    rows.forEach((row, rowIdx) => {
      // Measure wrapped lines per cell
      const measuredCells = row.cells.map((cell, colIdx) => {
        const col = columns[colIdx];
        const maxW = Math.max(30, col.width - padX * 2);
        ctx.font = `${cell.bold ? 700 : 500} 15px ${cell.mono ? FONT_MONO : FONT_SANS}`;
        const primaryLines = wrapCanvasText(ctx, cell.text, maxW, 3);
        let subLines: string[] = [];
        if (cell.subtext) {
          ctx.font = `500 13px ${cell.mono ? FONT_MONO : FONT_SANS}`;
          subLines = wrapCanvasText(ctx, cell.subtext, maxW, 2);
        }
        const height =
          padY * 2 +
          primaryLines.length * lineHeight +
          (subLines.length > 0 ? subLines.length * subLineHeight + 3 : 0);
        return { cell, primaryLines, subLines, height };
      });

      const rowHeight = Math.max(44, ...measuredCells.map((m) => m.height));

      // Page break before row if needed, repeating header cleanly
      if (y + rowHeight > FOOTER_SAFE_Y) {
        startNewPage(false);
        drawTableHeader(columns);
      }

      // Alternating row fill
      ctx.fillStyle = rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(MARGIN_X, y, CONTENT_W, rowHeight);

      // Bottom hairline border
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, y + rowHeight);
      ctx.lineTo(MARGIN_X + CONTENT_W, y + rowHeight);
      ctx.stroke();

      // Render cell texts
      let x = MARGIN_X;
      measuredCells.forEach((measured, colIdx) => {
        const col = columns[colIdx];
        const { cell, primaryLines, subLines } = measured;
        ctx.fillStyle = cell.color || '#1E293B';
        ctx.font = `${cell.bold ? 700 : 500} 15px ${cell.mono ? FONT_MONO : FONT_SANS}`;

        let cellY = y + padY;
        for (const line of primaryLines) {
          const textW = ctx.measureText(line).width;
          let drawX = x + padX;
          if (col.align === 'center') drawX = x + (col.width - textW) / 2;
          else if (col.align === 'right') drawX = x + col.width - padX - textW;
          ctx.fillText(line, drawX, cellY);
          cellY += lineHeight;
        }

        if (subLines.length > 0) {
          cellY += 3;
          ctx.fillStyle = '#2563EB';
          ctx.font = `500 13px ${FONT_MONO}`;
          for (const sLine of subLines) {
            ctx.fillText(sLine, x + padX, cellY);
            cellY += subLineHeight;
          }
        }

        x += col.width;
      });

      y += rowHeight;
    });

    y += 28;
  };

  // --- Page 1: Header + KPI Summary Cards ---
  startNewPage(true);

  const kpiGap = 18;
  const kpiW = (CONTENT_W - kpiGap * 3) / 4;
  const kpiH = 112;
  const kpis = [
    {
      label: 'TỪ VỰNG ĐÃ HỌC',
      value: `${report.learnedVocabCount} từ`,
      sub: `${report.favoriteVocabCount} từ yêu thích`,
      accent: '#FF6B00',
    },
    {
      label: 'ĐIỂM TRẮC NGHIỆM TB',
      value: report.quizAttemptsCount > 0 ? `${report.averageQuizScore}%` : '—',
      sub:
        report.quizAttemptsCount > 0
          ? `${report.quizAttemptsCount} lượt · Cao nhất ${report.bestQuizScore}%`
          : 'Chưa có bài kiểm tra',
      accent: '#2563EB',
    },
    {
      label: 'BÀI HỌC HOÀN THÀNH',
      value: `${report.completedLessons}/${report.totalLessons}`,
      sub: `Đạt ${report.completionPercent}% lộ trình`,
      accent: '#059669',
    },
    {
      label: 'CHUỖI NGÀY HỌC',
      value: `${report.streakDays} ngày`,
      sub: `Truy cập: ${report.totalAccessText}`,
      accent: '#D97706',
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = MARGIN_X + idx * (kpiW + kpiGap);
    ctx.fillStyle = '#F8FAFC';
    drawRoundedRect(ctx, cardX, y, kpiW, kpiH, 12);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top accent bar inside card
    ctx.fillStyle = kpi.accent;
    ctx.fillRect(cardX + 16, y + 14, 34, 4);

    ctx.fillStyle = '#64748B';
    ctx.font = `700 12px ${FONT_SANS}`;
    ctx.fillText(kpi.label, cardX + 16, y + 28);

    ctx.fillStyle = '#0F172A';
    ctx.font = `800 28px ${FONT_SANS}`;
    ctx.fillText(kpi.value, cardX + 16, y + 48);

    ctx.fillStyle = '#475569';
    ctx.font = `500 13px ${FONT_SANS}`;
    ctx.fillText(truncateCanvasLine(ctx, kpi.sub, kpiW - 32), cardX + 16, y + 84);
  });

  y += kpiH + 34;

  // --- Section 1: Quiz History ---
  drawSectionHeading(
    `1. Lịch sử điểm trắc nghiệm (${report.quizRows.length} lượt)`,
    'Tổng hợp kết quả các bài kiểm tra trắc nghiệm gần nhất theo từng bài học.'
  );

  const quizColumns: PdfTableColumn[] = [
    { label: '#', width: 52, align: 'center' },
    { label: 'Ngày làm bài', width: 175 },
    { label: 'Cấp độ', width: 88, align: 'center' },
    { label: 'Bài học', width: 380 },
    { label: 'Đúng / Tổng', width: 125, align: 'center' },
    { label: 'Điểm', width: 100, align: 'center' },
    { label: 'Xếp loại', width: CONTENT_W - 920 },
  ];

  const quizTableRows = report.quizRows.map((row, idx) => {
    const scoreColor =
      row.score >= 80
        ? '#059669'
        : row.score >= 65
          ? '#2563EB'
          : row.score >= 50
            ? '#D97706'
            : '#E11D48';
    return {
      cells: [
        { text: String(idx + 1), color: '#64748B' },
        { text: row.completedAtText, color: '#475569' },
        { text: row.levelId, bold: true, color: '#0F172A' },
        { text: row.lessonTitle, bold: true, color: '#0F172A' },
        { text: `${row.correctAnswers}/${row.totalQuestions}` },
        { text: `${row.score}%`, bold: true, color: scoreColor },
        { text: row.ratingVi, color: scoreColor, bold: true },
      ],
    };
  });

  drawTable(
    quizColumns,
    quizTableRows,
    'Bạn chưa hoàn thành bài kiểm tra trắc nghiệm nào. Hãy vào mục Kiểm tra trắc nghiệm để thử sức!'
  );

  // --- Section 2: Learned Vocabulary ---
  drawSectionHeading(
    `2. Danh sách từ vựng đã học (${report.learnedVocab.length} từ)`,
    'Toàn bộ từ vựng tiếng Anh bạn đã đánh dấu hoàn thành cùng phiên âm IPA và nghĩa tiếng Việt.'
  );

  const vocabColumns: PdfTableColumn[] = [
    { label: '#', width: 52, align: 'center' },
    { label: 'Từ tiếng Anh & Phiên âm IPA', width: 280 },
    { label: 'Từ loại', width: 112, align: 'center' },
    { label: 'Nghĩa tiếng Việt', width: 390 },
    { label: 'Cấp độ · Bài học', width: CONTENT_W - 834 },
  ];

  const vocabTableRows = report.learnedVocab.map((row, idx) => ({
    cells: [
      { text: String(idx + 1), color: '#64748B' },
      {
        text: row.isFavorite ? `${row.word} ★` : row.word,
        subtext: row.ipa || undefined,
        bold: true,
        color: '#0F172A',
      },
      { text: row.partOfSpeech || '—', color: '#475569' },
      { text: row.meaningVi, color: '#1E293B' },
      { text: `${row.levelId} · ${row.lessonTitle}`, color: '#475569' },
    ],
  }));

  drawTable(
    vocabColumns,
    vocabTableRows,
    'Bạn chưa đánh dấu từ vựng nào là đã học. Hãy mở bài học và đánh dấu "Đã thuộc" trên Flashcard!'
  );

  // --- Section 3: Lesson Progress Breakdown (when available) ---
  if (report.lessonRows.length > 0) {
    drawSectionHeading(
      `3. Tiến độ chi tiết theo bài học (${report.lessonRows.length} bài đã bắt đầu)`,
      'Theo dõi tỷ lệ từ vựng đã thuộc và điểm trắc nghiệm cao nhất của từng bài học.'
    );

    const lessonColumns: PdfTableColumn[] = [
      { label: 'Cấp độ', width: 92, align: 'center' },
      { label: 'Bài học & Chủ đề', width: 520 },
      { label: 'Từ đã học', width: 138, align: 'center' },
      { label: 'Điểm cao nhất', width: 155, align: 'center' },
      { label: 'Trạng thái', width: CONTENT_W - 905, align: 'center' },
    ];

    const lessonTableRows = report.lessonRows.map((row) => ({
      cells: [
        { text: row.levelId, bold: true, color: '#0F172A' },
        { text: `${row.lessonTitle} (${row.topic})`, bold: true, color: '#0F172A' },
        { text: `${row.learnedCount}/${row.totalVocab}` },
        {
          text: row.quizAttempts > 0 ? `${row.quizBestScore}% (${row.quizAttempts} lần)` : '—',
          color: row.quizBestScore >= 80 ? '#059669' : '#334155',
          bold: row.quizBestScore >= 80,
        },
        {
          text: row.statusVi,
          bold: true,
          color: row.statusVi === 'Hoàn thành' ? '#059669' : '#D97706',
        },
      ],
    }));

    drawTable(lessonColumns, lessonTableRows, '');
  }

  // Stamp consistent footers with total page count across all pages
  const totalPages = pages.length;
  pages.forEach((canvas, idx) => {
    const pCtx = canvas.getContext('2d');
    if (!pCtx) return;
    pCtx.strokeStyle = '#E2E8F0';
    pCtx.lineWidth = 1.2;
    pCtx.beginPath();
    pCtx.moveTo(MARGIN_X, PAGE_H - 54);
    pCtx.lineTo(PAGE_W - MARGIN_X, PAGE_H - 54);
    pCtx.stroke();

    pCtx.fillStyle = '#64748B';
    pCtx.font = `500 13px ${FONT_SANS}`;
    pCtx.textBaseline = 'top';
    pCtx.fillText(
      `${APP_BRAND.fullName} · Báo cáo học tập cá nhân (${report.exportedAtText})`,
      MARGIN_X,
      PAGE_H - 40
    );

    const pageLabel = `Trang ${idx + 1} / ${totalPages}`;
    const labelW = pCtx.measureText(pageLabel).width;
    pCtx.fillStyle = '#334155';
    pCtx.font = `600 13px ${FONT_SANS}`;
    pCtx.fillText(pageLabel, PAGE_W - MARGIN_X - labelW, PAGE_H - 40);
  });

  // Assemble A4 PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((canvas, idx) => {
    if (idx > 0) pdf.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  pdf.save(`bao-cao-hoc-tap-pilot-${report.fileDateStamp}.pdf`);
  return report;
}
