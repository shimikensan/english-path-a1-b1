import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Mount Vite middleware in development, static dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
