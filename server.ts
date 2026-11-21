import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_VOICES = new Set(['Zephyr', 'Puck', 'Kore', 'Charon', 'Fenrir']);
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

function buildVoiceSystemInstruction(params: {
  level: string;
  scenario: string;
  learnerName?: string;
  targetWords?: string[];
}): string {
  const scenarioMeta = SCENARIO_MAP[params.scenario] || SCENARIO_MAP.daily;
  const targetList =
    params.targetWords && params.targetWords.length > 0
      ? `Active vocabulary words the learner is practicing today: ${params.targetWords.slice(0, 8).join(', ')}. Naturally weave 1-2 of these words into your questions and warmly praise the learner if they use any of them.`
      : '';

  return [
    `You are Captain Pilot AI, a warm, encouraging real-time English speaking coach for Vietnamese learners inside the "Học tiếng Anh cùng Cậu bé Pilot" cockpit training platform.`,
    params.learnerName ? `The learner's name is ${params.learnerName}.` : '',
    `Target proficiency: ${getLevelGuidance(params.level)}`,
    `Active roleplay scenario: ${scenarioMeta.titleEn}. Context: ${scenarioMeta.contextEn}`,
    targetList,
    `Coaching rules for real-time voice:`,
    `1. Speak primarily in natural, clear English. Only use a brief Vietnamese hint if the learner explicitly asks in Vietnamese or seems stuck.`,
    `2. Keep each spoken turn concise (2 to 4 sentences) and ALWAYS end with one engaging open-ended question so the learner actively speaks and produces vocabulary.`,
    `3. If the learner makes a noticeable grammar or word-choice mistake, gently recast the correct phrase naturally ("Nice try! A smoother way to say that is...") without breaking conversational flow.`,
    `4. Never read out markdown symbols, asterisks, or bullet points.`,
  ]
    .filter(Boolean)
    .join('\n');
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

function sendWsJson(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Multi-turn English Text Chat & Active Vocabulary Coach (gemini-4-hydrogen)
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
            .slice(-16)
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

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: buildTextCoachSystemInstruction({
            level: safeLevel,
            scenario: safeScenario,
            learnerName: typeof learnerName === 'string' ? learnerName.slice(0, 60) : '',
            targetWords: safeTargetWords,
          }),
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
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
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        res.status(502).json({ error: 'AI không trả về nội dung phản hồi. Vui lòng thử lại.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error) {
      console.error('AI Chat endpoint error:', error);
      const message =
        error instanceof Error ? error.message : 'Không thể kết nối tới trợ lý AI. Vui lòng thử lại.';
      res.status(500).json({ error: message });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || '/', 'http://localhost');
      if (parsedUrl.pathname === '/api/ai/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  // Real-Time Voice Conversation Bridge using Gemini Live API (gemini-3.8-live)
  wss.on('connection', (clientWs, request) => {
    const parsedUrl = new URL(request.url || '/', 'http://localhost');
    const rawLevel = parsedUrl.searchParams.get('level') || 'A1';
    const rawScenario = parsedUrl.searchParams.get('scenario') || 'daily';
    const rawVoice = parsedUrl.searchParams.get('voice') || 'Zephyr';
    const learnerName = (parsedUrl.searchParams.get('learnerName') || '').slice(0, 60);
    const rawTargetWords = parsedUrl.searchParams.get('targetWords') || '';

    const level = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : 'A1';
    const scenario = SCENARIO_MAP[rawScenario] ? rawScenario : 'daily';
    const voice = ALLOWED_VOICES.has(rawVoice) ? rawVoice : 'Zephyr';
    const targetWords = rawTargetWords
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 8);

    let ai: GoogleGenAI;
    try {
      ai = getAIClient();
    } catch (err) {
      sendWsJson(clientWs, {
        type: 'error',
        error: err instanceof Error ? err.message : 'Thiếu cấu hình GEMINI_API_KEY.',
      });
      clientWs.close();
      return;
    }

    let closedByClient = false;

    const sessionPromise = ai.live
      .connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: buildVoiceSystemInstruction({
            level,
            scenario,
            learnerName,
            targetWords,
          }),
        },
        callbacks: {
          onopen: () => {
            sendWsJson(clientWs, {
              type: 'ready',
              level,
              scenario,
              voice,
            });
          },
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (!content) return;

            if (content.inputTranscription?.text) {
              sendWsJson(clientWs, {
                type: 'inputTranscript',
                text: content.inputTranscription.text,
              });
            }

            if (content.outputTranscription?.text) {
              sendWsJson(clientWs, {
                type: 'outputTranscript',
                text: content.outputTranscription.text,
              });
            }

            for (const part of content.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendWsJson(clientWs, {
                  type: 'audio',
                  audio: part.inlineData.data,
                });
              }
            }

            if (content.interrupted) {
              sendWsJson(clientWs, { type: 'interrupted' });
            }

            if (content.turnComplete) {
              sendWsJson(clientWs, { type: 'turnComplete' });
            }
          },
          onerror: (err: unknown) => {
            console.error('Gemini Live session error:', err);
            const msg =
              err instanceof Error
                ? err.message
                : 'Kết nối thoại trực tiếp với Gemini Live bị gián đoạn.';
            sendWsJson(clientWs, { type: 'error', error: msg });
          },
          onclose: () => {
            if (!closedByClient) {
              sendWsJson(clientWs, { type: 'closed' });
            }
          },
        },
      })
      .catch((err) => {
        console.error('Failed to connect to Gemini Live:', err);
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể khởi tạo phiên luyện nói trực tiếp Gemini Live.';
        sendWsJson(clientWs, { type: 'error', error: msg });
        clientWs.close();
        return null;
      });

    clientWs.on('message', (rawData) => {
      let parsed: { audio?: string; text?: string; audioStreamEnd?: boolean };
      try {
        parsed = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      void sessionPromise.then((session) => {
        if (!session || closedByClient) return;
        try {
          if (typeof parsed.audio === 'string' && parsed.audio.length > 0) {
            session.sendRealtimeInput({
              audio: {
                data: parsed.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (typeof parsed.text === 'string' && parsed.text.trim().length > 0) {
            session.sendRealtimeInput({
              text: parsed.text.trim(),
            });
          } else if (parsed.audioStreamEnd) {
            session.sendRealtimeInput({ audioStreamEnd: true });
          }
        } catch (err) {
          console.error('Error forwarding Live input:', err);
        }
      });
    });

    const cleanup = () => {
      closedByClient = true;
      void sessionPromise.then((session) => {
        if (session) {
          try {
            session.close();
          } catch {
            // ignore close error
          }
        }
      });
    };

    clientWs.on('close', cleanup);
    clientWs.on('error', cleanup);
  });

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

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cockpit server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
