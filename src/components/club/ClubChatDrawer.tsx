import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, Sparkles, Volume2, X } from 'lucide-react';
import type { ClubAvatarGender, ClubMemberDoc, ClubMessageDoc, LearnerCEFRLevel } from '../../types';
import { speakEnglish } from '../../utils/speech';

const AVATAR_SHEET_SRC = '/assets/aistudio/image_cacf8f7c.png';

interface ClubChatDrawerProps {
  partner: ClubMemberDoc;
  currentUserUid: string;
  currentUserLevel: LearnerCEFRLevel;
  messages: ClubMessageDoc[];
  isPartnerTyping: boolean;
  sending: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
  onSpeakingChange?: (speakerUid: string | null) => void;
  onClose: () => void;
}

const STARTERS_BY_LEVEL: Record<LearnerCEFRLevel, string[]> = {
  A1: [
    'Hi! Nice to meet you. What is your name?',
    'How are you today?',
    'What hobbies do you like?',
  ],
  A2: [
    'Hey! How is your English practice going today?',
    'What did you do this morning?',
    'Do you like reading English stories or watching movies?',
  ],
  B1: [
    'Hi there! What English topic are you focusing on this week?',
    'If you could travel anywhere right now, where would you go?',
    'What is the most useful English phrase you learned recently?',
  ],
  B2: [
    'Hey! Would you like to practice a quick everyday conversation in English?',
    'What strategy has helped you improve your English fluency the most?',
    'Tell me about a memorable challenge you overcame recently.',
  ],
  C1: [
    'Hello! Care to debate an interesting topic or practice natural idioms together?',
    'What nuance of English communication do you find most fascinating?',
    'How do you keep your active vocabulary sharp in daily life?',
  ],
};

function formatMessageTime(ms?: number): string {
  if (!ms) return '';
  try {
    const d = new Date(ms);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ChibiAvatarThumb({
  gender,
  size = 'md',
}: {
  gender: ClubAvatarGender;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const dimClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const bgTone =
    gender === 'male'
      ? 'bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:border-sky-800'
      : 'bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800';

  if (imgFailed) {
    return (
      <div
        className={`${dimClass} rounded-xl border ${bgTone} flex items-center justify-center text-xs font-extrabold shrink-0 ${
          gender === 'male' ? 'text-sky-700 dark:text-sky-300' : 'text-rose-700 dark:text-rose-300'
        }`}
      >
        {gender === 'male' ? 'NAM' : 'NỮ'}
      </div>
    );
  }

  return (
    <div className={`${dimClass} rounded-xl border ${bgTone} overflow-hidden relative shrink-0`}>
      <img
        src={AVATAR_SHEET_SRC}
        alt={gender === 'male' ? 'Nhân vật Nam' : 'Nhân vật Nữ'}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`w-[215%] h-[185%] max-w-none object-cover select-none pointer-events-none ${
          gender === 'male'
            ? '-translate-x-[6%] -translate-y-[4%]'
            : '-translate-x-[51%] -translate-y-[4%]'
        }`}
      />
    </div>
  );
}

export function ClubChatDrawer({
  partner,
  currentUserUid,
  currentUserLevel,
  messages,
  isPartnerTyping,
  sending,
  onSendMessage,
  onTypingChange,
  onSpeakingChange,
  onClose,
}: ClubChatDrawerProps) {
  const [draft, setDraft] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const starters = useMemo(
    () => STARTERS_BY_LEVEL[currentUserLevel] ?? STARTERS_BY_LEVEL.A2,
    [currentUserLevel]
  );

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isPartnerTyping, partner.uid]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
      onTypingChange(false);
    };
  }, [partner.uid, onTypingChange]);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    onTypingChange(val.trim().length > 0);
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    if (val.trim().length > 0) {
      typingTimerRef.current = window.setTimeout(() => {
        onTypingChange(false);
      }, 2400);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = draft.trim();
    if (!clean || sending) return;
    setDraft('');
    onTypingChange(false);
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    await onSendMessage(clean);
  };

  const handleSpeak = (msg: ClubMessageDoc) => {
    setSpeakingId(msg.id);
    onSpeakingChange?.(msg.senderUid);
    speakEnglish(msg.text, {
      onEnd: () => {
        setSpeakingId((prev) => (prev === msg.id ? null : prev));
        onSpeakingChange?.(null);
      },
    });
  };

  return (
    <aside
      aria-label={`Trò chuyện tiếng Anh với ${partner.displayName}`}
      className="absolute top-3 right-3 bottom-3 w-[min(390px,calc(100%-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-20"
    >
      {/* Partner Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ChibiAvatarThumb gender={partner.avatarGender} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {partner.displayName}
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-[#FF6B00]/12 text-[#D94E00] dark:text-[#FF8524] text-[10px] font-extrabold shrink-0">
                {partner.currentLevel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  partner.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              <span className="truncate">
                {partner.isOnline ? 'Đang trong phòng 3D' : 'Đang ngoại tuyến (lưu tin nhắn)'}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          aria-label="Đóng khung nhắn tin"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Partner English Greeting Note */}
      {partner.statusText && (
        <div className="px-4 py-2 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
          <span className="font-semibold">Lời chào:</span> “{partner.statusText}”
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 bg-slate-50/60 dark:bg-slate-950/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 px-2">
            <div className="w-11 h-11 rounded-2xl bg-[#FF6B00]/12 text-[#FF6B00] flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Bắt đầu luyện tiếng Anh với {partner.displayName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
              Nhấn vào một câu mở đầu gợi ý bên dưới hoặc tự gõ câu tiếng Anh để trò chuyện trực tiếp.
            </p>
            <div className="mt-4 w-full space-y-2 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                Gợi ý mở lời (CEFR {currentUserLevel})
              </div>
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => handleDraftChange(starter)}
                  className="w-full text-left px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#FF6B00] text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                >
                  “{starter}”
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderUid === currentUserUid;
            const isSpeaking = speakingId === msg.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                    isMine
                      ? 'bg-[#FF6B00] text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <div
                    className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] ${
                      isMine ? 'text-orange-100' : 'text-slate-400 dark:text-slate-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.createdAtMs)}</span>
                    <button
                      type="button"
                      onClick={() => handleSpeak(msg)}
                      title="Nghe phát âm tiếng Anh"
                      className={`inline-flex items-center gap-1 font-semibold transition-colors ${
                        isMine
                          ? 'hover:text-white'
                          : isSpeaking
                            ? 'text-[#FF6B00]'
                            : 'hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{isSpeaking ? 'Đang đọc' : 'Nghe'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isPartnerTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {partner.displayName}
            </span>
            <span>đang nhập tin nhắn tiếng Anh...</span>
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Quick Starter Chips when chat already started */}
      {messages.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleDraftChange(s)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6B00]/12 hover:text-[#D94E00] dark:hover:text-[#FF8524] text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap transition-colors shrink-0"
            >
              {s.length > 34 ? `${s.slice(0, 34)}…` : s}
            </button>
          ))}
        </div>
      )}

      {/* Message Composer */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-end gap-2"
      >
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          maxLength={1000}
          placeholder={`Nhắn tiếng Anh cho ${partner.displayName}...`}
          className="flex-1 resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] max-h-28"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="px-3.5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E55E00] disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors shrink-0"
          aria-label="Gửi tin nhắn tiếng Anh"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
