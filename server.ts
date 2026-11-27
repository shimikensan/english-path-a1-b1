import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOTSTRAPPED_ADMIN_EMAIL = 'buocngoat2020@gmail.com';
const CLUB_MUSIC_DIR = path.resolve(__dirname, 'uploads', 'club-music');
const SAFE_MUSIC_FILE_REGEX = /^club_bgm_[0-9]+_[a-f0-9]{12}\.(mp3|wav|ogg|m4a|webm)$/;
const MAX_AUDIO_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig | null {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as FirebaseAppletConfig;
  } catch {
    return null;
  }
}

const FIREBASE_CONFIG = loadFirebaseAppletConfig();

function detectVerifiedAudioFormat(buf: Buffer): { ext: string; mime: string } | null {
  if (!buf || buf.length < 12) return null;
  // MP3 with ID3v2 tag ("ID3")
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return { ext: 'mp3', mime: 'audio/mpeg' };
  }
  // Raw MP3 MPEG frame sync (0xFF followed by 0xE0..0xFF)
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    return { ext: 'mp3', mime: 'audio/mpeg' };
  }
  // WAV ("RIFF" .... "WAVE")
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x41 &&
    buf[10] === 0x56 &&
    buf[11] === 0x45
  ) {
    return { ext: 'wav', mime: 'audio/wav' };
  }
  // OGG ("OggS")
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) {
    return { ext: 'ogg', mime: 'audio/ogg' };
  }
  // M4A / MP4 audio (offset 4..7 == "ftyp")
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return { ext: 'm4a', mime: 'audio/mp4' };
  }
  // WebM / Matroska EBML header (0x1A 0x45 0xDF 0xA3)
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { ext: 'webm', mime: 'audio/webm' };
  }
  return null;
}

function getMimeBySafeExt(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    case '.m4a':
      return 'audio/mp4';
    case '.webm':
      return 'audio/webm';
    default:
      return 'application/octet-stream';
  }
}

function resolveConfinedMusicPath(fileName: string): string | null {
  if (!SAFE_MUSIC_FILE_REGEX.test(fileName)) return null;
  const resolved = path.resolve(CLUB_MUSIC_DIR, fileName);
  if (!resolved.startsWith(CLUB_MUSIC_DIR + path.sep)) return null;
  return resolved;
}

async function verifyAdminBearerToken(
  authHeader: string | undefined
): Promise<{ uid: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length > 4096 || !FIREBASE_CONFIG?.apiKey) return null;

  try {
    // 1. Verify Firebase ID Token via official Firebase Identity Toolkit lookup
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookupRes.ok) return null;
    const lookupJson = (await lookupRes.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = lookupJson.users?.[0];
    if (!user?.localId || !user.email || !user.emailVerified) return null;

    // 2. Bootstrapped root admin check
    if (user.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      return { uid: user.localId, email: user.email };
    }

    // 3. Secondary admin verification via Firestore /admins/{uid} using caller's own verified token
    const databaseId = FIREBASE_CONFIG.firestoreDatabaseId || '(default)';
    const adminDocUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_CONFIG.projectId)}/databases/${encodeURIComponent(databaseId)}/documents/admins/${encodeURIComponent(user.localId)}`;
    const adminRes = await fetch(adminDocUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (adminRes.ok) {
      return { uid: user.localId, email: user.email };
    }
    return null;
  } catch {
    return null;
  }
}

const ALLOWED_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'ESP']);

interface ScenarioMeta {
  id: string;
  titleEn: string;
  contextEn: string;
}

const SCENARIO_MAP: Record<string, ScenarioMeta> = {
  daily: {
    id: 'daily',
    titleEn: 'Everyday Conversation & Small Talk',
    contextEn:
      'Casual daily life topics such as morning routines, hobbies, coffee shops, weekend plans, and meeting new friends.',
  },
  work: {
    id: 'work',
    titleEn: 'Workplace & Job Interviews',
    contextEn:
      'Professional workplace communication, team stand-ups, explaining projects, job interview answers, and polite requests.',
  },
  aviation: {
    id: 'aviation',
    titleEn: 'Cockpit, Travel & Airport Briefing',
    contextEn:
      'Airport check-in, flight boarding, pre-flight cockpit briefing, weather updates, and clear international travel communication.',
  },
  uav_rf: {
    id: 'uav_rf',
    titleEn: 'RF Jamming & Counter-UAV Operations (ESP)',
    contextEn:
      'Technical English for radio frequency spectrum monitoring, drone detection, directional jamming, signal telemetry, and field coordination.',
  },
  security: {
    id: 'security',
    titleEn: 'Security Screening & Checkpoint Operations (ESP)',
    contextEn:
      'Operational English for baggage X-ray inspection, passenger screening instructions, restricted items, and calm incident reporting.',
  },
  food_lab: {
    id: 'food_lab',
    titleEn: 'Food Safety & Laboratory Testing (ESP)',
    contextEn:
      'Technical English for sample collection, microbiological assays, contamination limits, QA/QC documentation, and lab safety compliance.',
  },
};

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 18000,
    },
  });
}

function getLevelGuidance(level: string): string {
  switch (level) {
    case 'A1':
      return 'CEFR A1 (Beginner): Use very short, clear sentences, high-frequency everyday words, and slow, encouraging pacing.';
    case 'A2':
      return 'CEFR A2 (Elementary): Use simple connected sentences, practical daily expressions, and gently introduce useful linking phrases.';
    case 'B1':
      return 'CEFR B1 (Intermediate): Use natural everyday English with moderate idioms, clear explanations, and follow-up opinion questions.';
    case 'B2':
      return 'CEFR B2 (Upper-Intermediate): Use fluent, nuanced vocabulary, phrasal verbs, and ask the learner to elaborate or justify views.';
    case 'C1':
      return 'CEFR C1 (Advanced): Use sophisticated, idiomatic, precise English and challenge the learner with subtle phrasing and abstract ideas.';
    case 'ESP':
      return 'Specialized Professional English (ESP): Use authentic operational and technical terminology while remaining clear, supportive, and concise.';
    default:
      return 'CEFR B1 (Intermediate): Use natural, clear English appropriate for an active learner.';
  }
}

function buildTextCoachSystemInstruction(params: {
  level: string;
  scenario: string;
  learnerName?: string;
  targetWords?: string[];
}): string {
  const scenarioMeta = SCENARIO_MAP[params.scenario] || SCENARIO_MAP.daily;
  const targetList =
    params.targetWords && params.targetWords.length > 0
      ? `Target active vocabulary words the learner is trying to practice: ${params.targetWords.slice(0, 10).join(', ')}. Track which of these appear (even in inflected forms) in the learner's latest message inside "usedTargetWords", and gently encourage using remaining ones.`
      : 'No fixed target word list was supplied, so return an empty array for "usedTargetWords".';

  return [
    `You are Captain Pilot AI, an expert English communication coach helping a Vietnamese learner build active English vocabulary through realistic messaging practice.`,
    params.learnerName ? `Learner name: ${params.learnerName}.` : '',
    `Proficiency level: ${getLevelGuidance(params.level)}`,
    `Roleplay scenario: ${scenarioMeta.titleEn} — ${scenarioMeta.contextEn}`,
    targetList,
    `Instructions:`,
    `- Respond naturally in English in "replyEn" (2-4 sentences, ending with a clear engaging question so the learner keeps practicing).`,
    `- Provide an accurate, natural Vietnamese translation of your reply in "replyVi".`,
    `- Evaluate the learner's latest message: if there is a grammar, spelling, or awkward phrasing error (or if they wrote in Vietnamese asking how to say something), give a friendly, specific Vietnamese explanation + corrected English sentence in "correction". If their English was already solid and natural, return an empty string "" for "correction".`,
    `- Always provide one upgraded, more natural or idiomatic English way to express what the learner just said in "naturalSuggestion" (if the learner greeted or started the session, give a useful starter phrase).`,
    `- Suggest 2 to 3 high-value active vocabulary words or collocations directly useful for the next turn in "activeVocab" (word, ipa, meaningVi, exampleEn).`,
    `- Provide 2 to 3 short English response ideas in "followUpHints" that the learner can adapt to reply.`,
  ]
    .filter(Boolean)
    .join('\n');
}

const CHAT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    replyEn: { type: Type.STRING },
    replyVi: { type: Type.STRING },
    correction: { type: Type.STRING },
    naturalSuggestion: { type: Type.STRING },
    activeVocab: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          ipa: { type: Type.STRING },
          meaningVi: { type: Type.STRING },
          exampleEn: { type: Type.STRING },
        },
        required: ['word', 'ipa', 'meaningVi', 'exampleEn'],
      },
    },
    followUpHints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    usedTargetWords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'replyEn',
    'replyVi',
    'correction',
    'naturalSuggestion',
    'activeVocab',
    'followUpHints',
    'usedTargetWords',
  ],
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI_TIMEOUT_${timeoutMs}`));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function isTransientAiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('high demand') ||
    msg.includes('AI_TIMEOUT') ||
    msg.includes('timed out') ||
    msg.includes('fetch failed')
  );
}

function formatFriendlyAiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (raw.includes('GEMINI_API_KEY')) {
    return {
      status: 500,
      message: 'Máy chủ chưa được cấu hình khóa API Gemini.',
    };
  }
  if (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('high demand') ||
    raw.includes('AI_TIMEOUT')
  ) {
    return {
      status: 503,
      message: 'Hệ thống AI đang tạm thời quá tải do lưu lượng cao. Vui lòng thử gửi lại sau vài giây.',
    };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Bạn gửi tin nhắn hơi nhanh. Hãy đợi vài giây rồi thử lại nhé.',
    };
  }
  return {
    status: 500,
    message: 'Không thể kết nối tới trợ lý AI lúc này. Vui lòng thử lại sau giây lát.',
  };
}

function parseJsonResponseText(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(unfenced) as Record<string, unknown>;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // --- Admin 3D English Club Background Music Upload, Streaming & Cleanup ---
  fs.mkdirSync(CLUB_MUSIC_DIR, { recursive: true });

  app.post(
    '/api/club/music/upload',
    express.raw({
      type: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/wave',
        'audio/ogg',
        'audio/mp4',
        'audio/x-m4a',
        'audio/m4a',
        'audio/webm',
        'application/octet-stream',
      ],
      limit: '15mb',
    }),
    async (req, res) => {
      try {
        const admin = await verifyAdminBearerToken(req.headers.authorization);
        if (!admin) {
          res.status(403).json({ error: 'Chỉ quản trị viên đã xác thực mới có quyền tải nhạc nền.' });
          return;
        }

        const audioBuffer = Buffer.isBuffer(req.body) ? req.body : null;
        if (!audioBuffer || audioBuffer.length === 0) {
          res.status(400).json({ error: 'Không nhận được dữ liệu tệp âm thanh.' });
          return;
        }
        if (audioBuffer.length > MAX_AUDIO_UPLOAD_BYTES) {
          res.status(413).json({ error: 'Tệp nhạc vượt quá giới hạn tối đa 15 MB.' });
          return;
        }

        const detected = detectVerifiedAudioFormat(audioBuffer);
        if (!detected) {
          res.status(400).json({
            error: 'Định dạng âm thanh không hợp lệ. Vui lòng chọn tệp MP3, WAV, OGG, M4A hoặc WebM.',
          });
          return;
        }

        const storedFileName = `club_bgm_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${detected.ext}`;
        const destPath = resolveConfinedMusicPath(storedFileName);
        if (!destPath) {
          res.status(500).json({ error: 'Không thể tạo đường dẫn lưu trữ tệp nhạc an toàn.' });
          return;
        }

        await fs.promises.writeFile(destPath, audioBuffer, { mode: 0o640 });

        res.json({
          storedFileName,
          audioUrl: `/api/club/music/files/${storedFileName}`,
          mimeType: detected.mime,
          fileSizeBytes: audioBuffer.length,
        });
      } catch (err) {
        console.error('Club music upload error:', err);
        res.status(500).json({ error: 'Không thể lưu tệp nhạc nền lúc này. Vui lòng thử lại.' });
      }
    }
  );

  app.get('/api/club/music/files/:fileName', async (req, res) => {
    const fileName = String(req.params.fileName ?? '');
    const filePath = resolveConfinedMusicPath(fileName);
    if (!filePath) {
      res.status(400).json({ error: 'Tên tệp âm thanh không hợp lệ.' });
      return;
    }

    try {
      const stat = await fs.promises.stat(filePath);
      const total = stat.size;
      const mimeType = getMimeBySafeExt(fileName);
      const rangeHeader = req.headers.range;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (rangeHeader && /^bytes=\d*-\d*$/.test(rangeHeader)) {
        const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
        const start = startStr ? parseInt(startStr, 10) : 0;
        const end = endStr ? Math.min(total - 1, parseInt(endStr, 10)) : total - 1;
        if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
          res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
          return;
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', String(end - start + 1));
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }

      res.setHeader('Content-Length', String(total));
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.status(404).json({ error: 'Không tìm thấy tệp nhạc nền yêu cầu.' });
    }
  });

  app.delete('/api/club/music/files/:fileName', async (req, res) => {
    const admin = await verifyAdminBearerToken(req.headers.authorization);
    if (!admin) {
      res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền xóa tệp nhạc nền.' });
      return;
    }
    const fileName = String(req.params.fileName ?? '');
    const filePath = resolveConfinedMusicPath(fileName);
    if (!filePath) {
      res.status(400).json({ error: 'Tên tệp âm thanh không hợp lệ.' });
      return;
    }
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // File may already be deleted
    }
    res.json({ ok: true });
  });

  // Multi-turn English Text Chat & Active Vocabulary Coach
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const {
        message,
        history = [],
        level = 'A1',
        scenario = 'daily',
        learnerName = '',
        targetWords = [],
      } = req.body ?? {};

      if (typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Vui lòng nhập nội dung tin nhắn tiếng Anh.' });
        return;
      }

      if (message.length > 2000) {
        res.status(400).json({ error: 'Tin nhắn quá dài (tối đa 2000 ký tự).' });
        return;
      }

      const safeLevel = ALLOWED_LEVELS.has(String(level)) ? String(level) : 'A1';
      const safeScenario = SCENARIO_MAP[String(scenario)] ? String(scenario) : 'daily';
      const safeTargetWords = Array.isArray(targetWords)
        ? targetWords.filter((w): w is string => typeof w === 'string' && w.trim().length > 0).slice(0, 10)
        : [];

      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (item): item is { role: 'user' | 'model'; text: string } =>
                Boolean(item) &&
                (item.role === 'user' || item.role === 'model') &&
                typeof item.text === 'string' &&
                item.text.trim().length > 0
            )
            .slice(-14)
        : [];

      const contents = [
        ...safeHistory.map((item) => ({
          role: item.role,
          parts: [{ text: item.text }],
        })),
        {
          role: 'user',
          parts: [{ text: message.trim() }],
        },
      ];

      const systemInstruction = buildTextCoachSystemInstruction({
        level: safeLevel,
        scenario: safeScenario,
        learnerName: typeof learnerName === 'string' ? learnerName.slice(0, 60) : '',
        targetWords: safeTargetWords,
      });

      const ai = getAIClient();

      let rawText: string | undefined;
      try {
        const primaryResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents,
            config: {
              systemInstruction,
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
              responseMimeType: 'application/json',
              responseSchema: CHAT_RESPONSE_SCHEMA,
            },
          }),
          7000
        );
        rawText = primaryResponse.text?.trim();
      } catch (primaryErr) {
        if (!isTransientAiError(primaryErr)) {
          throw primaryErr;
        }
        console.warn('gemini-4-hydrogen transient error, switching to gemini-3.1-flash-lite:', primaryErr);
        const fallbackResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: CHAT_RESPONSE_SCHEMA,
            },
          }),
          14000
        );
        rawText = fallbackResponse.text?.trim();
      }

      if (!rawText) {
        res.status(502).json({ error: 'AI không trả về nội dung phản hồi. Vui lòng thử lại.' });
        return;
      }

      const parsed = parseJsonResponseText(rawText);
      res.json(parsed);
    } catch (error) {
      console.error('AI Chat endpoint error:', error);
      const { status, message } = formatFriendlyAiError(error);
      res.status(status).json({ error: message });
    }
  });

  const TRANSLATE_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      wordOrPhrase: {
        type: Type.STRING,
        description: 'The normalized English word, phrase, or sentence being translated.',
      },
      ipa: {
        type: Type.STRING,
        description:
          'Accurate IPA phonetic transcription enclosed in slashes (e.g. /ˈpaɪ.lət/) for single words or short idioms, or empty string for full sentences.',
      },
      partOfSpeech: {
        type: Type.STRING,
        description:
          'Vietnamese part of speech label such as "danh từ (n)", "động từ (v)", "tính từ (adj)", "cụm từ", or "Câu / Đoạn văn".',
      },
      meaningVi: {
        type: Type.STRING,
        description:
          'Clear, natural, concise Vietnamese meaning or translation tailored to the context sentence if provided.',
      },
      noteVi: {
        type: Type.STRING,
        description:
          'Optional very short Vietnamese usage or grammar note (max 1 concise sentence), or empty string if unnecessary.',
      },
    },
    required: ['wordOrPhrase', 'ipa', 'partOfSpeech', 'meaningVi', 'noteVi'],
  };

  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { text, context } = (req.body ?? {}) as {
        text?: unknown;
        context?: unknown;
      };

      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Thiếu văn bản tiếng Anh cần tra nghĩa.' });
        return;
      }

      const cleanedText = text.trim().replace(/\s+/g, ' ').slice(0, 500);
      const cleanedContext =
        typeof context === 'string' ? context.trim().replace(/\s+/g, ' ').slice(0, 300) : '';

      const isSingleOrShort = cleanedText.split(/\s+/).length <= 3 && cleanedText.length <= 45;
      const systemInstruction = [
        'Bạn là từ điển Anh–Việt chính xác, ngắn gọn, chuyên hỗ trợ người Việt học tiếng Anh.',
        'Trả về JSON đúng theo schema yêu cầu, KHÔNG dùng markdown.',
        isSingleOrShort
          ? 'Với từ đơn hoặc cụm từ ngắn: cung cấp phiên âm IPA chuẩn (trong dấu /.../), từ loại bằng tiếng Việt (ví dụ: danh từ (n), động từ (v), tính từ (adj), cụm động từ), nghĩa tiếng Việt tự nhiên sát ngữ cảnh nhất (ngắn gọn, dễ hiểu), và ghi chú ngữ pháp/cách dùng cực ngắn nếu hữu ích (hoặc chuỗi rỗng "").'
          : 'Với câu hoặc đoạn văn tiếng Anh: để ipa là "", partOfSpeech là "Câu / Đoạn văn", dịch meaningVi sang tiếng Việt tự nhiên, sát nghĩa và mạch lạc, và noteVi chỉ ghi ngắn gọn điểm ngữ pháp/thành ngữ nổi bật nếu có (hoặc chuỗi rỗng "").',
      ].join('\n');

      const promptText = cleanedContext
        ? `Dịch sang tiếng Việt: "${cleanedText}"\nNgữ cảnh câu chứa từ này: "${cleanedContext}"`
        : `Dịch sang tiếng Việt: "${cleanedText}"`;

      const ai = getAIClient();
      let rawText: string | undefined;

      try {
        const primaryResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: promptText,
            config: {
              systemInstruction,
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
              responseMimeType: 'application/json',
              responseSchema: TRANSLATE_RESPONSE_SCHEMA,
            },
          }),
          6000
        );
        rawText = primaryResponse.text?.trim();
      } catch (primaryErr) {
        if (!isTransientAiError(primaryErr)) {
          throw primaryErr;
        }
        console.warn(
          'gemini-4-hydrogen translate transient error, switching to gemini-3.1-flash-lite:',
          primaryErr
        );
        const fallbackResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: promptText,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: TRANSLATE_RESPONSE_SCHEMA,
            },
          }),
          10000
        );
        rawText = fallbackResponse.text?.trim();
      }

      if (!rawText) {
        res.status(502).json({ error: 'Không nhận được kết quả dịch từ AI. Vui lòng thử lại.' });
        return;
      }

      const parsed = parseJsonResponseText(rawText) as {
        wordOrPhrase?: string;
        ipa?: string;
        partOfSpeech?: string;
        meaningVi?: string;
        noteVi?: string;
      };

      res.json({
        wordOrPhrase: parsed.wordOrPhrase?.trim() || cleanedText,
        ipa: parsed.ipa?.trim() || '',
        partOfSpeech: parsed.partOfSpeech?.trim() || (isSingleOrShort ? 'Từ vựng' : 'Câu / Đoạn văn'),
        meaningVi: parsed.meaningVi?.trim() || '',
        noteVi: parsed.noteVi?.trim() || '',
      });
    } catch (error) {
      console.error('AI Translate endpoint error:', error);
      const { status, message } = formatFriendlyAiError(error);
      res.status(status).json({ error: message });
    }
  });

  // Always return JSON for unknown /api/* routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Không tìm thấy API yêu cầu.' });
  });

  // Global JSON error handler for Express middleware errors
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (req.path.startsWith('/api')) {
        console.error('Express API middleware error:', err);
        res.status(500).json({ error: 'Lỗi xử lý yêu cầu trên máy chủ. Vui lòng thử lại.' });
        return;
      }
      next(err);
    }
  );

  const server = http.createServer(app);

  // --- Real-Time 3D English Club WebSocket Hub (/ws/club) ---
  interface ClubClientState {
    ws: WebSocket;
    uid: string;
    displayName: string;
    currentLevel: string;
    avatarGender: 'male' | 'female';
    statusText: string;
    posX: number;
    posZ: number;
    rotationY: number;
  }

  const CLUB_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
  const CLUB_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);
  const clubSockets = new Map<WebSocket, ClubClientState>();

  const clampClubCoord = (v: unknown, fallback = 0): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(-6.5, Math.min(6.5, Math.round(n * 100) / 100));
  };

  const clampClubRot = (v: unknown, fallback = 0): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(-6.5, Math.min(6.5, Math.round(n * 100) / 100));
  };

  const safeSend = (socket: WebSocket, payload: Record<string, unknown>) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  };

  const broadcastClub = (payload: Record<string, unknown>, exclude?: WebSocket) => {
    const raw = JSON.stringify(payload);
    clubSockets.forEach((_state, sock) => {
      if (sock !== exclude && sock.readyState === WebSocket.OPEN) {
        sock.send(raw);
      }
    });
  };

  const getUniqueClubRoster = () => {
    const byUid = new Map<string, Omit<ClubClientState, 'ws'>>();
    clubSockets.forEach((state) => {
      byUid.set(state.uid, {
        uid: state.uid,
        displayName: state.displayName,
        currentLevel: state.currentLevel,
        avatarGender: state.avatarGender,
        statusText: state.statusText,
        posX: state.posX,
        posZ: state.posZ,
        rotationY: state.rotationY,
      });
    });
    return Array.from(byUid.values());
  };

  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

  server.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(req.url || '/', 'http://localhost').pathname;
    } catch {
      return;
    }
    if (pathname !== '/ws/club') {
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    ws.on('message', (rawData) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(rawData)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'club:join') {
        const uid = typeof msg.uid === 'string' && CLUB_ID_REGEX.test(msg.uid) ? msg.uid : '';
        if (!uid) return;
        const displayName =
          typeof msg.displayName === 'string' && msg.displayName.trim()
            ? msg.displayName.trim().slice(0, 100)
            : 'Pilot Learner';
        const currentLevel =
          typeof msg.currentLevel === 'string' && CLUB_LEVELS.has(msg.currentLevel)
            ? msg.currentLevel
            : 'A1';
        const avatarGender: 'male' | 'female' = msg.avatarGender === 'female' ? 'female' : 'male';
        const statusText =
          typeof msg.statusText === 'string' ? msg.statusText.trim().slice(0, 120) : '';
        const posX = clampClubCoord(msg.posX, 0);
        const posZ = clampClubCoord(msg.posZ, 1.8);
        const rotationY = clampClubRot(msg.rotationY, 0);

        const state: ClubClientState = {
          ws,
          uid,
          displayName,
          currentLevel,
          avatarGender,
          statusText,
          posX,
          posZ,
          rotationY,
        };
        clubSockets.set(ws, state);

        // Send authoritative snapshot to the joining client
        safeSend(ws, {
          type: 'club:roster',
          members: getUniqueClubRoster(),
        });

        // Notify everyone else of this active member
        broadcastClub(
          {
            type: 'club:member_joined',
            member: {
              uid,
              displayName,
              currentLevel,
              avatarGender,
              statusText,
              posX,
              posZ,
              rotationY,
            },
          },
          ws
        );
        return;
      }

      const sender = clubSockets.get(ws);
      if (!sender) return;

      if (msg.type === 'club:move') {
        sender.posX = clampClubCoord(msg.posX, sender.posX);
        sender.posZ = clampClubCoord(msg.posZ, sender.posZ);
        sender.rotationY = clampClubRot(msg.rotationY, sender.rotationY);
        broadcastClub(
          {
            type: 'club:member_moved',
            uid: sender.uid,
            posX: sender.posX,
            posZ: sender.posZ,
            rotationY: sender.rotationY,
          },
          ws
        );
        return;
      }

      if (msg.type === 'club:wave') {
        broadcastClub({
          type: 'club:member_waved',
          uid: sender.uid,
          at: Date.now(),
        });
        return;
      }

      if (msg.type === 'club:talk') {
        const durationMs =
          typeof msg.durationMs === 'number' && Number.isFinite(msg.durationMs)
            ? Math.max(800, Math.min(8000, Math.round(msg.durationMs)))
            : 3200;
        broadcastClub({
          type: 'club:member_talked',
          uid: sender.uid,
          until: Date.now() + durationMs,
        });
        return;
      }

      if (msg.type === 'club:typing') {
        const receiverUid =
          typeof msg.receiverUid === 'string' && CLUB_ID_REGEX.test(msg.receiverUid)
            ? msg.receiverUid
            : '';
        if (!receiverUid || receiverUid === sender.uid) return;
        const isTyping = Boolean(msg.isTyping);
        clubSockets.forEach((client, sock) => {
          if (client.uid === receiverUid) {
            safeSend(sock, {
              type: 'club:typing',
              senderUid: sender.uid,
              isTyping,
            });
          }
        });
        return;
      }

      if (msg.type === 'club:dm') {
        const receiverUid =
          typeof msg.receiverUid === 'string' && CLUB_ID_REGEX.test(msg.receiverUid)
            ? msg.receiverUid
            : '';
        const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 1000) : '';
        const messageId =
          typeof msg.id === 'string' && CLUB_ID_REGEX.test(msg.id)
            ? msg.id
            : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        if (!receiverUid || receiverUid === sender.uid || !text) return;

        const pairId = [sender.uid, receiverUid].sort().join('_');
        const dmPayload = {
          type: 'club:dm',
          message: {
            id: messageId,
            pairId,
            participants: [sender.uid, receiverUid],
            senderUid: sender.uid,
            senderName: sender.displayName,
            senderAvatar: sender.avatarGender,
            receiverUid,
            text,
            createdAtMs: Date.now(),
          },
        };

        clubSockets.forEach((client, sock) => {
          if (client.uid === receiverUid || (client.uid === sender.uid && sock !== ws)) {
            safeSend(sock, dmPayload);
          }
        });
      }
    });

    ws.on('close', () => {
      const leaving = clubSockets.get(ws);
      if (!leaving) return;
      clubSockets.delete(ws);

      // Only broadcast leave if no other open tab belongs to this uid
      let stillConnected = false;
      clubSockets.forEach((client) => {
        if (client.uid === leaving.uid) stillConnected = true;
      });
      if (!stillConnected) {
        broadcastClub({
          type: 'club:member_left',
          uid: leaving.uid,
        });
      }
    });

    ws.on('error', () => {
      clubSockets.delete(ws);
    });
  });

  // Mount Vite middleware in development, static dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cockpit server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
