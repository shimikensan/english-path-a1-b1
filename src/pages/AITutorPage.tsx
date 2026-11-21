import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Languages,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { VocabularyItem } from '../types';
import { playCorrectBeep } from '../utils/cockpitAudio';
import { LiveConnectionState, LiveVoiceClient } from '../utils/liveAudioClient';
import { speakEnglish } from '../utils/speech';

type PracticeMode = 'voice' | 'chat';
type CEFROption = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'ESP';

interface ScenarioOption {
  id: string;
  labelVi: string;
  subtitleVi: string;
  starters: string[];
}

const SCENARIOS: ScenarioOption[] = [
  {
    id: 'daily',
    labelVi: 'Giao tiếp hằng ngày',
    subtitleVi: 'Lịch trình, sở thích, trò chuyện tự nhiên',
    starters: [
      'Hi! I want to practice talking about my daily routine.',
      'Good evening! What do you usually do on weekends?',
      'Hello! Can we talk about hobbies and favorite food?',
    ],
  },
  {
    id: 'work',
    labelVi: 'Công việc & Phỏng vấn',
    subtitleVi: 'Giới thiệu bản thân, báo cáo nhóm, phỏng vấn',
    starters: [
      'Hello, I am preparing for a job interview in English.',
      'Good morning! Let me give you a quick update on my project.',
      'Could you help me practice explaining my strengths at work?',
    ],
  },
  {
    id: 'aviation',
    labelVi: 'Buồng lái & Hàng không',
    subtitleVi: 'Check-in sân bay, giao tiếp chuyến bay, thời tiết',
    starters: [
      'Good morning, Captain! Ready for our pre-flight briefing.',
      'Excuse me, where is the boarding gate for flight VN214?',
      'Could you check the weather conditions along our flight route?',
    ],
  },
  {
    id: 'uav_rf',
    labelVi: 'Chế áp UAV & Vô tuyến',
    subtitleVi: 'Tần số RF, phát hiện drone, liên lạc kỹ thuật (ESP)',
    starters: [
      'Control, we detected an unauthorized drone on the 2.4 GHz band.',
      'Please verify the directional antenna alignment before activating jamming.',
      'Can we review the spectrum monitoring report for Sector Bravo?',
    ],
  },
  {
    id: 'security',
    labelVi: 'Kiểm tra an ninh',
    subtitleVi: 'Soi chiếu hành lý, hướng dẫn hành khách (ESP)',
    starters: [
      'Good morning, please place your laptop and liquids in a separate tray.',
      'We noticed a restricted item on the X-ray screen. Could you open your bag?',
      'Security team, please report the checkpoint status immediately.',
    ],
  },
  {
    id: 'food_lab',
    labelVi: 'Kiểm nghiệm thực phẩm',
    subtitleVi: 'Lấy mẫu, phân tích vi sinh, báo cáo phòng Lab (ESP)',
    starters: [
      'We just received a new food batch for microbiological testing.',
      'Please verify the sample label and record the storage temperature.',
      'Does this test result comply with the national food safety limit?',
    ],
  },
];

const VOICE_OPTIONS = [
  { id: 'Zephyr', label: 'Zephyr · Ấm áp, rõ ràng' },
  { id: 'Puck', label: 'Puck · Năng động, thân thiện' },
  { id: 'Kore', label: 'Kore · Chuẩn mực, điềm tĩnh' },
  { id: 'Charon', label: 'Charon · Trầm ấm, chuyên nghiệp' },
  { id: 'Fenrir', label: 'Fenrir · Mạnh mẽ, dứt khoát' },
];

const LEVEL_OPTIONS: CEFROption[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'ESP'];

interface ActiveVocabSuggestion {
  word: string;
  ipa: string;
  meaningVi: string;
  exampleEn: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  textEn: string;
  textVi?: string;
  correction?: string;
  naturalSuggestion?: string;
  activeVocab?: ActiveVocabSuggestion[];
  followUpHints?: string[];
  usedTargetWords?: string[];
  timestamp: number;
}

interface LiveTranscriptEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  finalized: boolean;
}

const CHAT_STORAGE_PREFIX = 'pilot_ai_chat_v1_';

function loadStoredChat(scenario: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${scenario}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-30) : [];
  } catch {
    return [];
  }
}

function saveStoredChat(scenario: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`${CHAT_STORAGE_PREFIX}${scenario}`, JSON.stringify(messages.slice(-30)));
  } catch {
    // ignore storage quota errors
  }
}

export function AITutorPage() {
  const { profile, lessons, addToast } = useApp();

  const defaultLevel = (profile?.currentLevel as CEFROption | undefined) || 'A1';
  const [mode, setMode] = useState<PracticeMode>('voice');
  const [level, setLevel] = useState<CEFROption>(defaultLevel);
  const [scenario, setScenario] = useState<string>('daily');
  const [voice, setVoice] = useState<string>('Zephyr');
  const [deckSeed, setDeckSeed] = useState<number>(0);

  // Active target vocabulary words drawn from curriculum matching selected level
  const targetVocabItems = useMemo<VocabularyItem[]>(() => {
    const matchingLessons = lessons.filter((l) => l.levelId === level);
    const pool = (matchingLessons.length > 0 ? matchingLessons : lessons).flatMap(
      (l) => l.vocabulary
    );
    if (pool.length === 0) return [];
    const startIdx = (deckSeed * 6) % pool.length;
    const picked: VocabularyItem[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < pool.length && picked.length < 6; i++) {
      const item = pool[(startIdx + i) % pool.length];
      if (!seen.has(item.word.toLowerCase())) {
        seen.add(item.word.toLowerCase());
        picked.push(item);
      }
    }
    return picked;
  }, [lessons, level, deckSeed]);

  const targetWordsList = useMemo(
    () => targetVocabItems.map((item) => item.word),
    [targetVocabItems]
  );

  // Track which target words the learner has actively used in this session
  const [usedTargetWords, setUsedTargetWords] = useState<string[]>([]);

  // Reset used words when deck or level changes
  useEffect(() => {
    setUsedTargetWords([]);
  }, [level, deckSeed]);

  // --- VOICE LIVE STATE ---
  const liveClientRef = useRef<LiveVoiceClient | null>(null);
  const [liveState, setLiveState] = useState<LiveConnectionState>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [outputLevel, setOutputLevel] = useState<number>(0);
  const [liveError, setLiveError] = useState<string>('');
  const [transcript, setTranscript] = useState<LiveTranscriptEntry[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const targetWordsRef = useRef<string[]>(targetWordsList);

  useEffect(() => {
    targetWordsRef.current = targetWordsList;
  }, [targetWordsList]);

  // Helper to check if user's spoken/written text actively used any target vocabulary
  const detectUsedTargetWords = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const matched = targetWordsRef.current.filter((word) => {
      const root = word.toLowerCase().trim();
      return root.length >= 2 && lower.includes(root);
    });
    if (matched.length > 0) {
      setUsedTargetWords((prev) => {
        const next = new Set(prev);
        let added = false;
        for (const w of matched) {
          if (!next.has(w)) {
            next.add(w);
            added = true;
          }
        }
        if (added) {
          playCorrectBeep();
        }
        return Array.from(next);
      });
    }
  }, []);

  const appendLiveTranscript = useCallback(
    (role: 'user' | 'model', chunk: string) => {
      if (!chunk) return;
      if (role === 'user') {
        detectUsedTargetWords(chunk);
      }
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && !last.finalized) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            text: last.text + chunk,
          };
          return updated;
        }
        const finalizedPrev = prev.map((entry) =>
          entry.finalized ? entry : { ...entry, finalized: true }
        );
        return [
          ...finalizedPrev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            role,
            text: chunk,
            finalized: false,
          },
        ];
      });
    },
    [detectUsedTargetWords]
  );

  const finalizeLiveTranscript = useCallback(() => {
    setTranscript((prev) =>
      prev.map((entry) => (entry.finalized ? entry : { ...entry, finalized: true }))
    );
  }, []);

  const stopLiveSession = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.stop();
      liveClientRef.current = null;
    }
    setIsMuted(false);
    setInputLevel(0);
    setOutputLevel(0);
  }, []);

  const startLiveSession = useCallback(async () => {
    setLiveError('');
    setIsMuted(false);
    setTranscript([]);

    const client = new LiveVoiceClient({
      onStateChange: (nextState) => {
        setLiveState(nextState);
      },
      onInputTranscript: (text) => appendLiveTranscript('user', text),
      onOutputTranscript: (text) => appendLiveTranscript('model', text),
      onTurnComplete: () => finalizeLiveTranscript(),
      onInterrupted: () => finalizeLiveTranscript(),
      onInputLevel: (lvl) => setInputLevel(lvl),
      onOutputLevel: (lvl) => setOutputLevel(lvl),
      onError: (msg) => {
        setLiveError(msg);
        addToast('error', msg);
      },
    });

    liveClientRef.current = client;
    await client.connect({
      level,
      scenario,
      voice,
      learnerName: profile?.fullName || '',
      targetWords: targetWordsList,
    });
  }, [
    level,
    scenario,
    voice,
    profile?.fullName,
    targetWordsList,
    appendLiveTranscript,
    finalizeLiveTranscript,
    addToast,
  ]);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    liveClientRef.current?.setMuted(next);
  };

  // Disconnect live session cleanly on unmount or switching to Text Chat mode
  useEffect(() => {
    if (mode !== 'voice') {
      stopLiveSession();
    }
  }, [mode, stopLiveSession]);

  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.stop();
        liveClientRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [transcript]);

  // --- TEXT CHAT STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStoredChat('daily'));
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>('');
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(loadStoredChat(scenario));
    setChatError('');
  }, [scenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, chatLoading]);

  const currentScenarioMeta = useMemo(
    () => SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0],
    [scenario]
  );

  const handleSendChat = useCallback(
    async (overrideText?: string) => {
      const content = (overrideText ?? chatInput).trim();
      if (!content || chatLoading) return;

      setChatError('');
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        textEn: content,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      saveStoredChat(scenario, updatedHistory);
      if (!overrideText) {
        setChatInput('');
      }
      detectUsedTargetWords(content);
      setChatLoading(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history: messages.slice(-14).map((m) => ({
              role: m.role,
              text: m.textEn,
            })),
            level,
            scenario,
            learnerName: profile?.fullName || '',
            targetWords: targetWordsList,
          }),
        });

        const rawBody = await res.text();
        let data: {
          error?: string;
          replyEn?: string;
          replyVi?: string;
          correction?: string;
          naturalSuggestion?: string;
          activeVocab?: ActiveVocabSuggestion[];
          followUpHints?: string[];
          usedTargetWords?: string[];
        } | null = null;

        if (rawBody.trim()) {
          try {
            data = JSON.parse(rawBody);
          } catch {
            data = null;
          }
        }

        if (!res.ok || !data) {
          const fallbackErr =
            res.status === 503 || res.status === 502 || res.status === 504
              ? 'Máy chủ AI đang tạm thời quá tải hoặc đang khởi động lại. Vui lòng thử gửi lại sau vài giây.'
              : res.status === 404
                ? 'Kết nối tới máy chủ AI chưa sẵn sàng. Hãy tải lại trang và thử lại.'
                : 'Không thể nhận phản hồi hợp lệ từ trợ lý AI. Vui lòng thử lại.';
          throw new Error(data?.error || fallbackErr);
        }

        const aiUsedTargets: string[] = Array.isArray(data.usedTargetWords)
          ? data.usedTargetWords
          : [];
        if (aiUsedTargets.length > 0) {
          setUsedTargetWords((prev) => {
            const next = new Set(prev);
            let newlyAdded = false;
            for (const w of aiUsedTargets) {
              if (!next.has(w)) {
                next.add(w);
                newlyAdded = true;
              }
            }
            if (newlyAdded) {
              playCorrectBeep();
            }
            return Array.from(next);
          });
        }

        const aiMsg: ChatMessage = {
          id: `m-${Date.now()}`,
          role: 'model',
          textEn: data.replyEn || '',
          textVi: data.replyVi || '',
          correction: data.correction || '',
          naturalSuggestion: data.naturalSuggestion || '',
          activeVocab: Array.isArray(data.activeVocab) ? data.activeVocab : [],
          followUpHints: Array.isArray(data.followUpHints) ? data.followUpHints : [],
          usedTargetWords: aiUsedTargets,
          timestamp: Date.now(),
        };

        const nextMessages = [...updatedHistory, aiMsg];
        setMessages(nextMessages);
        saveStoredChat(scenario, nextMessages);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Lỗi kết nối đến trợ lý AI. Vui lòng thử lại.';
        setChatError(msg);
        addToast('error', msg);
      } finally {
        setChatLoading(false);
      }
    },
    [
      chatInput,
      chatLoading,
      messages,
      scenario,
      level,
      profile?.fullName,
      targetWordsList,
      detectUsedTargetWords,
      addToast,
    ]
  );

  const handleClearChat = () => {
    setMessages([]);
    saveStoredChat(scenario, []);
    setChatError('');
    addToast('info', 'Đã làm mới cuộc hội thoại cho chủ đề này.');
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendChat();
    }
  };

  const isLiveConnected = liveState === 'connected';
  const isLiveConnecting = liveState === 'connecting';

  // Compute 16 waveform bar heights from input & output RMS levels
  const waveformBars = useMemo(() => {
    const activeEnergy = Math.max(inputLevel, outputLevel);
    const isAiSpeaking = outputLevel > inputLevel && outputLevel > 0.03;
    const weights = [0.35, 0.55, 0.72, 0.88, 1, 0.85, 0.96, 0.78, 0.92, 1, 0.82, 0.68, 0.9, 0.74, 0.52, 0.38];
    return weights.map((w, idx) => {
      const base = isLiveConnected ? 14 : 8;
      const dynamic = activeEnergy * w * 74;
      const jitter = activeEnergy > 0.02 ? ((idx % 3) * 4) : 0;
      return {
        heightPct: Math.min(100, Math.max(base, Math.round(base + dynamic + jitter))),
        isAiSpeaking,
      };
    });
  }, [inputLevel, outputLevel, isLiveConnected]);

  return (
    <div className="space-y-6">
      {/* Cockpit AI Studio Header + Mode Switch */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid border border-slate-700/80 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF8524]">
              <Radio className="w-4 h-4" />
              <span>COCKPIT AI COACH · ACTIVE VOCABULARY TRAINING</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Luyện nói trực tiếp & Nhắn tin tiếng Anh cùng Cơ trưởng AI
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Thực hành phản xạ nói tiếng Anh thời gian thực hoặc nhắn tin song ngữ có sửa lỗi ngữ pháp,
              gợi ý cách diễn đạt tự nhiên và rèn luyện sử dụng từ vựng chủ động theo đúng cấp độ CEFR.
            </p>
          </div>

          {/* Mode Toggle */}
          <div
            className="inline-flex p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shrink-0 self-start lg:self-center"
            role="tablist"
            aria-label="Chọn chế độ luyện tập AI"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'voice'}
              onClick={() => setMode('voice')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                mode === 'voice'
                  ? 'bg-[#FF6B00] text-white shadow-[0_0_16px_rgba(255,107,0,0.35)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Mic className="w-4 h-4" />
              Luyện nói trực tiếp
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'chat'}
              onClick={() => setMode('chat')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                mode === 'chat'
                  ? 'bg-[#FF6B00] text-white shadow-[0_0_16px_rgba(255,107,0,0.35)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Nhắn tin tiếng Anh
            </button>
          </div>
        </div>
      </section>

      {/* Scenario, Level & Active Vocabulary Deck Controls */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Level & Scenario Config */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 cockpit-radar-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Thiết lập tình huống & trình độ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI tự điều chỉnh tốc độ, từ vựng và độ khó câu hỏi theo cấp độ bạn chọn
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl">
              {LEVEL_OPTIONS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  disabled={isLiveConnected || isLiveConnecting}
                  onClick={() => setLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-50 ${
                    level === lvl
                      ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/35'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {SCENARIOS.map((item) => {
              const active = scenario === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isLiveConnected || isLiveConnecting}
                  onClick={() => {
                    setScenario(item.id);
                    if (item.id === 'uav_rf' || item.id === 'security' || item.id === 'food_lab') {
                      setLevel('ESP');
                    }
                  }}
                  className={`text-left p-3 rounded-xl border transition-colors disabled:opacity-60 ${
                    active
                      ? 'border-[#FF6B00] bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40'
                  }`}
                >
                  <div
                    className={`text-xs font-bold ${
                      active ? 'text-[#D94E00] dark:text-[#FF8524]' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.labelVi}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {item.subtitleVi}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Vocabulary Mission Panel */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 cockpit-radar-panel p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#D94E00] dark:text-[#FF8524]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Nhiệm vụ từ vựng chủ động ({level})</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cố gắng lồng ghép các từ dưới đây khi nói hoặc nhắn tin ({usedTargetWords.length}/{targetVocabItems.length} từ)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeckSeed((s) => s + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Đổi sang bộ 6 từ vựng mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Đổi từ
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {targetVocabItems.map((item) => {
              const isUsed = usedTargetWords.some(
                (w) => w.toLowerCase() === item.word.toLowerCase()
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => speakEnglish(item.word)}
                  title={`Nghe phát âm "${item.word}" — ${item.meaningVi}`}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                    isUsed
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-[#FF6B00]/50 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{item.word}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.meaningVi}
                    </div>
                  </div>
                  {isUsed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MODE 1: REAL-TIME VOICE CONVERSATION (GEMINI LIVE API) */}
      {mode === 'voice' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Cockpit Voice Transceiver Control */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 cockpit-radar-panel p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Kênh thoại trực tiếp · Gemini Live
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Nói tiếng Anh tự nhiên — bạn có thể ngắt lời AI bất cứ lúc nào
                  </p>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                    isLiveConnected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isLiveConnecting
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isLiveConnected
                    ? isMuted
                      ? 'MIC MUTED'
                      : 'LIVE ON AIR'
                    : isLiveConnecting
                      ? 'CONNECTING'
                      : 'STANDBY'}
                </span>
              </div>

              {/* Voice Coach Selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor="ai-voice-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Giọng đọc Cơ trưởng AI
                </label>
                <select
                  id="ai-voice-select"
                  value={voice}
                  disabled={isLiveConnected || isLiveConnecting}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] disabled:opacity-60"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Spectrum Visualizer */}
              <div className="rounded-2xl bg-[#07111F] border border-slate-700/80 p-5 flex flex-col items-center justify-center gap-4">
                <div className="h-24 w-full flex items-center justify-center gap-1.5 px-2">
                  {waveformBars.map((bar, idx) => (
                    <div
                      key={idx}
                      className={`w-2 rounded-full transition-all duration-100 ${
                        !isLiveConnected
                          ? 'bg-slate-700'
                          : bar.isAiSpeaking
                            ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.55)]'
                            : isMuted
                              ? 'bg-slate-600'
                              : 'bg-[#FF6B00] shadow-[0_0_8px_rgba(255,107,0,0.55)]'
                      }`}
                      style={{ height: `${bar.heightPct}%` }}
                    />
                  ))}
                </div>
                <div className="text-xs font-medium text-slate-300 text-center">
                  {isLiveConnecting && 'Đang mở kết nối thoại thời gian thực với Cơ trưởng AI...'}
                  {isLiveConnected &&
                    (outputLevel > 0.03
                      ? 'Cơ trưởng AI đang nói... (bạn có thể nói xen vào bất cứ lúc nào)'
                      : isMuted
                        ? 'Micro đang tạm tắt — nhấn "Bật Mic" để tiếp tục trả lời'
                        : 'Đang lắng nghe bạn nói tiếng Anh...')}
                  {!isLiveConnected &&
                    !isLiveConnecting &&
                    'Nhấn nút bên dưới để bắt đầu buổi luyện nói 1-1 bằng tiếng Anh'}
                </div>
              </div>

              {liveError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{liveError}</span>
                </div>
              )}
            </div>

            {/* Primary Voice Controls */}
            <div className="space-y-3">
              {!isLiveConnected && !isLiveConnecting ? (
                <button
                  type="button"
                  onClick={() => void startLiveSession()}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-sm font-bold transition-colors shadow-[0_0_20px_rgba(255,107,0,0.3)]"
                >
                  <Mic className="w-5 h-5" />
                  Bắt đầu luyện nói trực tiếp
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={!isLiveConnected}
                    onClick={handleToggleMute}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-colors disabled:opacity-50 ${
                      isMuted
                        ? 'border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isMuted ? 'Bật Mic' : 'Tắt Mic'}
                  </button>
                  <button
                    type="button"
                    onClick={stopLiveSession}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors"
                  >
                    {isLiveConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PhoneOff className="w-4 h-4" />
                    )}
                    Kết thúc
                  </button>
                </div>
              )}

              {/* Quick spoken starter cues */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Câu gợi ý để đọc to (hoặc nhấn để gửi khi đang kết nối):
                </p>
                <div className="space-y-1.5">
                  {currentScenarioMeta.starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => {
                        if (isLiveConnected) {
                          appendLiveTranscript('user', starter);
                          finalizeLiveTranscript();
                          liveClientRef.current?.sendTextPrompt(starter);
                        } else {
                          speakEnglish(starter);
                        }
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#FF6B00]/50 bg-slate-50/80 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="line-clamp-1">{starter}</span>
                      <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Real-Time Transcript Panel */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 cockpit-radar-panel p-6 flex flex-col min-h-[460px] max-h-[640px]">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bản ghi hội thoại trực tiếp (Live Transcript)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hiển thị lời nói của bạn và phản hồi từ Cơ trưởng AI theo thời gian thực
                </p>
              </div>
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTranscript([])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa bản ghi
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/12 border border-[#FF6B00]/30 text-[#FF6B00] flex items-center justify-center mb-4">
                    <Radio className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Chưa có đoạn hội thoại nào
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                    Nhấn <strong>&ldquo;Bắt đầu luyện nói trực tiếp&rdquo;</strong> bên trái, cấp quyền Micro và nói chuyện trực tiếp bằng tiếng Anh với Cơ trưởng AI.
                  </p>
                </div>
              ) : (
                transcript.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex flex-col ${
                      entry.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1 px-1">
                      {entry.role === 'user' ? profile?.fullName || 'Bạn' : 'Cơ trưởng AI'}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        entry.role === 'user'
                          ? 'bg-[#FF6B00] text-white rounded-br-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                      }`}
                    >
                      {entry.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </section>
      )}

      {/* MODE 2: ENGLISH TEXT CHAT & ACTIVE VOCABULARY COACH */}
      {mode === 'chat' && (
        <section className="bg-white dark:bg-slate-900 cockpit-radar-panel flex flex-col min-h-[540px] max-h-[760px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nhắn tin tiếng Anh · {currentScenarioMeta.labelVi} ({level})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mỗi tin nhắn đều nhận phản hồi tiếng Anh tự nhiên, góp ý sửa lỗi ngữ pháp & từ vựng gợi ý
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Làm mới hội thoại
              </button>
            )}
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-center max-w-xl mx-auto space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/12 border border-[#FF6B00]/30 text-[#FF6B00] flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Bắt đầu nhắn tin tiếng Anh chủ động
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Viết một câu tiếng Anh bất kỳ (hoặc chọn 1 câu mở đầu bên dưới). Đừng ngại mắc lỗi — Cơ trưởng AI sẽ sửa lỗi nhẹ nhàng và gợi ý cách diễn đạt tự nhiên như người bản xứ.
                  </p>
                </div>
                <div className="w-full space-y-2 text-left">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                    Chọn nhanh câu mở đầu:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {currentScenarioMeta.starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        disabled={chatLoading}
                        onClick={() => void handleSendChat(starter)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#FF6B00] bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-between gap-3"
                      >
                        <span>{starter}</span>
                        <Send className="w-4 h-4 text-[#FF6B00] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const translationVisible = Boolean(showTranslations[msg.id]);

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1 px-1">
                        {profile?.fullName || 'Bạn'}
                      </span>
                      <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-[#FF6B00] text-white px-4 py-3 text-sm leading-relaxed shadow-xs">
                        {msg.textEn}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex flex-col items-start space-y-2.5 max-w-[92%]">
                    <span className="text-[11px] font-semibold text-[#D94E00] dark:text-[#FF8524] px-1">
                      Cơ trưởng AI · {level}
                    </span>

                    <div className="w-full rounded-2xl rounded-bl-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 space-y-3.5">
                      {/* Main English Reply */}
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm sm:text-[15px] font-medium text-slate-900 dark:text-white leading-relaxed">
                          {msg.textEn}
                        </p>
                        <button
                          type="button"
                          onClick={() => speakEnglish(msg.textEn)}
                          title="Nghe phát âm tiếng Anh"
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#FF6B00] hover:border-[#FF6B00]/50 transition-colors shrink-0"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Toggle Vietnamese Translation */}
                      {msg.textVi && (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setShowTranslations((prev) => ({
                                ...prev,
                                [msg.id]: !prev[msg.id],
                              }))
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#D94E00] dark:hover:text-[#FF8524] transition-colors"
                          >
                            <Languages className="w-3.5 h-3.5" />
                            {translationVisible ? 'Ẩn bản dịch tiếng Việt' : 'Xem bản dịch tiếng Việt'}
                          </button>
                          {translationVisible && (
                            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 rounded-lg px-3 py-2 leading-relaxed">
                              {msg.textVi}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Grammar / Phrasing Correction */}
                      {msg.correction && msg.correction.trim().length > 0 && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 px-3.5 py-2.5 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                          <div className="font-bold text-amber-800 dark:text-amber-300">
                            Góp ý chỉnh sửa câu vừa rồi:
                          </div>
                          <p className="leading-relaxed">{msg.correction}</p>
                        </div>
                      )}

                      {/* Natural Phrasing Upgrade */}
                      {msg.naturalSuggestion && msg.naturalSuggestion.trim().length > 0 && (
                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2.5 flex items-start justify-between gap-2.5">
                          <div className="text-xs text-emerald-950 dark:text-emerald-200 space-y-0.5">
                            <div className="font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                              <Wand2 className="w-3.5 h-3.5" />
                              Diễn đạt tự nhiên hơn:
                            </div>
                            <p className="leading-relaxed font-medium">{msg.naturalSuggestion}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => speakEnglish(msg.naturalSuggestion!)}
                            title="Nghe câu gợi ý"
                            className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 shrink-0"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Active Vocabulary Suggestions */}
                      {msg.activeVocab && msg.activeVocab.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Từ vựng chủ động gợi ý dùng tiếp
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.activeVocab.map((v, vIdx) => (
                              <button
                                key={`${msg.id}-v-${vIdx}`}
                                type="button"
                                onClick={() => speakEnglish(v.word)}
                                className="text-left p-2.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 hover:border-[#FF6B00]/50 transition-colors space-y-0.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {v.word}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {v.ipa}
                                  </span>
                                </div>
                                <div className="text-xs text-[#D94E00] dark:text-[#FF8524] font-medium">
                                  {v.meaningVi}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                                  &ldquo;{v.exampleEn}&rdquo;
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Reply Hints */}
                      {msg.followUpHints && msg.followUpHints.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Gợi ý trả lời (nhấn để điền vào khung nhập và tùy chỉnh):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.followUpHints.map((hint, hIdx) => (
                              <button
                                key={`${msg.id}-h-${hIdx}`}
                                type="button"
                                onClick={() => setChatInput(hint)}
                                className="text-left px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#FF6B00] text-xs text-slate-700 dark:text-slate-200 transition-colors"
                              >
                                {hint}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {chatLoading && (
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF6B00]" />
                <span>Cơ trưởng AI đang phân tích câu tiếng Anh và soạn phản hồi...</span>
              </div>
            )}

            {chatError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{chatError}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Composer Bar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
            <div className="flex items-end gap-3">
              <textarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Nhập tin nhắn tiếng Anh của bạn... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)"
                disabled={chatLoading}
                className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] disabled:opacity-60"
              />
              <button
                type="button"
                disabled={chatLoading || !chatInput.trim()}
                onClick={() => void handleSendChat()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-50 text-white text-sm font-bold transition-colors shrink-0 shadow-[0_0_16px_rgba(255,107,0,0.25)]"
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Gửi</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
