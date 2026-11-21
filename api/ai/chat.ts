import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(
  req: IncomingMessage & { body?: unknown }
): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function parseJsonResponseText(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(unfenced) as Record<string, unknown>;
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Phương thức không được hỗ trợ. Hãy sử dụng POST.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, {
      error:
        'Máy chủ chưa có biến môi trường GEMINI_API_KEY. Hãy thêm GEMINI_API_KEY trong phần Environment Variables (ví dụ Vercel Settings) rồi deploy lại.',
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const {
      message,
      history = [],
      level = 'A1',
      scenario = 'daily',
      learnerName = '',
      targetWords = [],
    } = body;

    if (typeof message !== 'string' || !message.trim()) {
      sendJson(res, 400, { error: 'Vui lòng nhập nội dung tin nhắn tiếng Anh.' });
      return;
    }

    if (message.length > 2000) {
      sendJson(res, 400, { error: 'Tin nhắn quá dài (tối đa 2000 ký tự).' });
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
              typeof item === 'object' &&
              ((item as { role?: unknown }).role === 'user' ||
                (item as { role?: unknown }).role === 'model') &&
              typeof (item as { text?: unknown }).text === 'string' &&
              ((item as { text: string }).text).trim().length > 0
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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 18000,
      },
    });

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
      sendJson(res, 502, { error: 'AI không trả về nội dung phản hồi. Vui lòng thử lại.' });
      return;
    }

    const parsed = parseJsonResponseText(rawText);
    sendJson(res, 200, parsed);
  } catch (error) {
    console.error('Vercel /api/ai/chat error:', error);
    const raw = error instanceof Error ? error.message : String(error ?? '');
    if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('AI_TIMEOUT')) {
      sendJson(res, 503, {
        error: 'Hệ thống AI đang tạm thời quá tải. Vui lòng thử gửi lại sau vài giây.',
      });
      return;
    }
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
      sendJson(res, 429, {
        error: 'Bạn gửi tin nhắn hơi nhanh. Hãy đợi vài giây rồi thử lại nhé.',
      });
      return;
    }
    sendJson(res, 500, {
      error: 'Không thể kết nối tới trợ lý AI lúc này. Vui lòng thử lại sau giây lát.',
    });
  }
}
