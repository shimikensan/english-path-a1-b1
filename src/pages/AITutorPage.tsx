import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Languages,
  Loader2,
  MessageSquare,
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
import { speakEnglish } from '../utils/speech';

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
  const [level, setLevel] = useState<CEFROption>(defaultLevel);
  const [scenario, setScenario] = useState<string>('daily');
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
  const targetWordsRef = useRef<string[]>(targetWordsList);

  useEffect(() => {
    targetWordsRef.current = targetWordsList;
  }, [targetWordsList]);

  useEffect(() => {
    setUsedTargetWords([]);
  }, [level, deckSeed]);

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

  // --- TEXT CHAT STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStoredChat('daily'));
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('');
  const [autoSpeakChat, setAutoSpeakChat] = useState<boolean>(false);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(loadStoredChat(scenario));
    setChatError('');
    setLastFailedMessage('');
  }, [scenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, chatLoading]);

  const currentScenarioMeta = useMemo(
    () => SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0],
    [scenario]
  );

  const handleSendChat = useCallback(
    async (overrideText?: string, isRetry = false) => {
      const content = (overrideText ?? chatInput).trim();
      if (!content || chatLoading) return;

      setChatError('');
      setLastFailedMessage('');

      const baseMessages =
        isRetry &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' &&
        messages[messages.length - 1].textEn === content
          ? messages.slice(0, -1)
          : messages;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        textEn: content,
        timestamp: Date.now(),
      };

      const updatedHistory = [...baseMessages, userMsg];
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
            history: baseMessages.slice(-14).map((m) => ({
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
                ? 'Không tìm thấy API /api/ai/chat trên máy chủ hiện tại. Hãy kiểm tra bản deploy mới nhất và biến môi trường GEMINI_API_KEY.'
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
        if (autoSpeakChat && aiMsg.textEn) {
          speakEnglish(aiMsg.textEn);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Lỗi kết nối đến trợ lý AI. Vui lòng thử lại.';
        setChatError(msg);
        setLastFailedMessage(content);
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
      autoSpeakChat,
      addToast,
    ]
  );

  const handleClearChat = () => {
    setMessages([]);
    saveStoredChat(scenario, []);
    setChatError('');
    setLastFailedMessage('');
    addToast('info', 'Đã làm mới cuộc hội thoại cho chủ đề này.');
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendChat();
    }
  };

  return (
    <div className="space-y-6">
      {/* Cockpit AI Chat Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid border border-slate-700/80 rounded-2xl p-6 text-white">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF8524]">
            <MessageSquare className="w-4 h-4" />
            <span>COCKPIT AI COACH · ACTIVE VOCABULARY CHAT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Nhắn tin tiếng Anh chủ động cùng Cơ trưởng AI
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Luyện phản xạ viết và giao tiếp tiếng Anh theo từng chủ đề, nhận góp ý sửa lỗi ngữ pháp,
            cách diễn đạt tự nhiên hơn và nhiệm vụ ứng dụng từ vựng chủ động theo đúng cấp độ CEFR.
          </p>
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
                AI tự điều chỉnh từ vựng và độ khó câu hỏi theo cấp độ bạn chọn
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl">
              {LEVEL_OPTIONS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
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
                  onClick={() => {
                    setScenario(item.id);
                    if (item.id === 'uav_rf' || item.id === 'security' || item.id === 'food_lab') {
                      setLevel('ESP');
                    }
                  }}
                  className={`text-left p-3 rounded-xl border transition-colors ${
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
                Cố gắng lồng ghép các từ dưới đây khi nhắn tin ({usedTargetWords.length}/{targetVocabItems.length} từ)
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

      {/* ENGLISH TEXT CHAT & ACTIVE VOCABULARY COACH */}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoSpeakChat((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                autoSpeakChat
                  ? 'border-[#FF6B00]/50 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {autoSpeakChat ? 'Tự đọc phản hồi: Bật' : 'Tự đọc phản hồi: Tắt'}
            </button>
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
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-700 dark:text-rose-300">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{chatError}</span>
              </div>
              {lastFailedMessage && (
                <button
                  type="button"
                  disabled={chatLoading}
                  onClick={() => void handleSendChat(lastFailedMessage, true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Thử gửi lại
                </button>
              )}
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
    </div>
  );
}
