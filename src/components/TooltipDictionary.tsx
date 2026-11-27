import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Languages, Loader2, RefreshCw, Volume2, WifiOff, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  buildLocalCurriculumDictionary,
  extractEnglishTextAtPoint,
  lookupCachedTranslation,
  lookupLocalDictionary,
  saveCachedTranslation,
  type DictionaryEntry,
} from '../utils/localDictionary';
import { speakEnglish } from '../utils/speech';

const LONG_PRESS_DURATION_MS = 420;
const HOLD_FEEDBACK_DELAY_MS = 135;
const MOVE_CANCEL_THRESHOLD_PX = 10;
const TOOLTIP_MAX_WIDTH = 340;
const VIEWPORT_MARGIN = 12;

interface HoldRingState {
  x: number;
  y: number;
  visible: boolean;
}

interface TooltipSession {
  x: number;
  y: number;
  word: string;
  sentence: string;
  mode: 'word' | 'sentence';
  loading: boolean;
  entry: DictionaryEntry | null;
  error: string | null;
  offlineMiss: boolean;
}

function isIgnoredTarget(el: HTMLElement | null): boolean {
  if (!el) return true;
  if (el.closest('[data-tooltip-dictionary="true"]')) return true;
  if (el.closest('[data-no-tooltip-dict="true"]')) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'CANVAS') {
    return true;
  }
  if (el.isContentEditable || el.closest('[contenteditable="true"]')) {
    return true;
  }
  return false;
}

function getSourceLabel(source: DictionaryEntry['source']): string {
  switch (source) {
    case 'curriculum':
      return 'Từ điển bài học';
    case 'reading':
      return 'Kho bài đọc';
    case 'cache':
      return 'Bộ nhớ đệm';
    case 'ai':
      return 'Từ điển AI';
  }
}

export function TooltipDictionary() {
  const { lessons, readingPassages, isOnline } = useApp();

  const localDict = useMemo(
    () => buildLocalCurriculumDictionary(lessons, readingPassages),
    [lessons, readingPassages]
  );

  const [holdRing, setHoldRing] = useState<HoldRingState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipSession | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number }>({
    width: TOOLTIP_MAX_WIDTH,
    height: 170,
  });

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const suppressClickUntilRef = useRef<number>(0);
  const suppressContextMenuUntilRef = useRef<number>(0);

  const localDictRef = useRef(localDict);
  localDictRef.current = localDict;
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const closeTooltip = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setTooltip(null);
  }, []);

  const resolveLookup = useCallback(
    async (
      queryText: string,
      contextSentence: string,
      anchorX: number,
      anchorY: number,
      word: string,
      sentence: string,
      mode: 'word' | 'sentence'
    ) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      // Tier 1: Instant 0ms lookup in local curriculum & reading dictionary
      const localHit = lookupLocalDictionary(localDictRef.current, queryText);
      if (localHit) {
        setTooltip({
          x: anchorX,
          y: anchorY,
          word,
          sentence,
          mode,
          loading: false,
          entry: localHit,
          error: null,
          offlineMiss: false,
        });
        return;
      }

      // Tier 2: Instant 0ms lookup in persistent localStorage cache
      const cacheHit = lookupCachedTranslation(queryText);
      if (cacheHit) {
        setTooltip({
          x: anchorX,
          y: anchorY,
          word,
          sentence,
          mode,
          loading: false,
          entry: cacheHit,
          error: null,
          offlineMiss: false,
        });
        return;
      }

      // Offline check before calling server AI endpoint
      if (!isOnlineRef.current) {
        setTooltip({
          x: anchorX,
          y: anchorY,
          word,
          sentence,
          mode,
          loading: false,
          entry: null,
          error: null,
          offlineMiss: true,
        });
        return;
      }

      // Tier 3: Fast server-side Gemini translation API
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setTooltip({
        x: anchorX,
        y: anchorY,
        word,
        sentence,
        mode,
        loading: true,
        entry: null,
        error: null,
        offlineMiss: false,
      });

      try {
        const response = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: queryText,
            context: mode === 'word' ? contextSentence : '',
          }),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as {
          wordOrPhrase?: string;
          ipa?: string;
          partOfSpeech?: string;
          meaningVi?: string;
          noteVi?: string;
          error?: string;
        };

        if (!response.ok || !payload.meaningVi) {
          throw new Error(
            payload.error || 'Không thể tra nghĩa lúc này. Vui lòng thử lại sau.'
          );
        }

        const aiEntry: DictionaryEntry = {
          text: payload.wordOrPhrase || queryText,
          ipa: payload.ipa || '',
          partOfSpeech: payload.partOfSpeech || (mode === 'sentence' ? 'Câu / Đoạn văn' : 'Từ vựng'),
          meaningVi: payload.meaningVi,
          noteVi: payload.noteVi || undefined,
          source: 'ai',
        };

        saveCachedTranslation(queryText, {
          text: aiEntry.text,
          ipa: aiEntry.ipa,
          partOfSpeech: aiEntry.partOfSpeech,
          meaningVi: aiEntry.meaningVi,
          noteVi: aiEntry.noteVi,
        });

        if (abortControllerRef.current !== controller) return;
        setTooltip({
          x: anchorX,
          y: anchorY,
          word,
          sentence,
          mode,
          loading: false,
          entry: aiEntry,
          error: null,
          offlineMiss: false,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể kết nối máy chủ từ điển. Vui lòng thử lại.';
        setTooltip({
          x: anchorX,
          y: anchorY,
          word,
          sentence,
          mode,
          loading: false,
          entry: null,
          error: message,
          offlineMiss: false,
        });
      }
    },
    []
  );

  // Measure tooltip box whenever its content changes so viewport clamping stays accurate
  useEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setTooltipSize({ width: rect.width, height: rect.height });
    }
  }, [tooltip]);

  // Global long-press detection & dismissal handlers
  useEffect(() => {
    let activePointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let feedbackTimer: number | null = null;
    let triggerTimer: number | null = null;

    const clearPendingHold = () => {
      activePointerId = null;
      if (feedbackTimer !== null) {
        window.clearTimeout(feedbackTimer);
        feedbackTimer = null;
      }
      if (triggerTimer !== null) {
        window.clearTimeout(triggerTimer);
        triggerTimer = null;
      }
      setHoldRing(null);
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Only respond to primary button / primary touch
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const targetEl = e.target as HTMLElement | null;

      // Clicking outside the tooltip closes it cleanly
      if (!targetEl?.closest('[data-tooltip-dictionary="true"]')) {
        setTooltip((prev) => {
          if (prev) {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            return null;
          }
          return prev;
        });
      }

      if (isIgnoredTarget(targetEl)) return;

      // Pre-check if there is actually English text at this point before showing any hold ring
      const initialSelection = window.getSelection()?.toString().trim() ?? '';
      const candidate = extractEnglishTextAtPoint(e.clientX, e.clientY, targetEl);
      if (!candidate) return;
      const candidateFromSelection = Boolean(initialSelection && candidate.word === initialSelection);

      clearPendingHold();
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;

      feedbackTimer = window.setTimeout(() => {
        setHoldRing({ x: startX, y: startY, visible: true });
      }, HOLD_FEEDBACK_DELAY_MS);

      triggerTimer = window.setTimeout(() => {
        const finalX = startX;
        const finalY = startY;
        clearPendingHold();

        // Preserve selected phrase captured at pointerdown, or extract word/sentence at point
        const extracted = candidateFromSelection
          ? candidate
          : extractEnglishTextAtPoint(finalX, finalY, targetEl) || candidate;
        if (!extracted) return;

        // Prevent trailing click/contextmenu on the underlying interactive card/button
        const now = Date.now();
        suppressClickUntilRef.current = now + 450;
        suppressContextMenuUntilRef.current = now + 500;

        // Subtle tactile haptic feedback on supported mobile devices
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(12);
          } catch {
            // Ignore vibration permission errors
          }
        }

        const isMultiWordSelection =
          !extracted.sentence && extracted.word.trim().split(/\s+/).length >= 4;

        void resolveLookup(
          extracted.word,
          extracted.sentence,
          finalX,
          finalY,
          extracted.word,
          extracted.sentence,
          isMultiWordSelection ? 'sentence' : 'word'
        );
      }, LONG_PRESS_DURATION_MS);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD_PX) {
        clearPendingHold();
      }
    };

    const handlePointerEnd = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId === activePointerId) {
        clearPendingHold();
      }
    };

    const handleScroll = () => {
      if (activePointerId !== null) {
        clearPendingHold();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearPendingHold();
        closeTooltip();
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (Date.now() < suppressClickUntilRef.current) {
        const targetEl = e.target as HTMLElement | null;
        if (!targetEl?.closest('[data-tooltip-dictionary="true"]')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (Date.now() < suppressContextMenuUntilRef.current) {
        e.preventDefault();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerEnd, { passive: true });
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickCapture, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      clearPendingHold();
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickCapture, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [closeTooltip, resolveLookup]);

  const handleToggleSentenceMode = () => {
    if (!tooltip || !tooltip.sentence) return;
    if (tooltip.mode === 'word') {
      void resolveLookup(
        tooltip.sentence,
        '',
        tooltip.x,
        tooltip.y,
        tooltip.word,
        tooltip.sentence,
        'sentence'
      );
    } else {
      void resolveLookup(
        tooltip.word,
        tooltip.sentence,
        tooltip.x,
        tooltip.y,
        tooltip.word,
        tooltip.sentence,
        'word'
      );
    }
  };

  const handleRetry = () => {
    if (!tooltip) return;
    const targetQuery = tooltip.mode === 'sentence' && tooltip.sentence ? tooltip.sentence : tooltip.word;
    void resolveLookup(
      targetQuery,
      tooltip.sentence,
      tooltip.x,
      tooltip.y,
      tooltip.word,
      tooltip.sentence,
      tooltip.mode
    );
  };

  // Compute viewport-clamped floating position (prefer above pointer, flip below if near top)
  const position = useMemo(() => {
    if (!tooltip || typeof window === 'undefined') {
      return { left: 0, top: 0, placement: 'top' as const };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(tooltipSize.width || TOOLTIP_MAX_WIDTH, vw - VIEWPORT_MARGIN * 2);
    const height = tooltipSize.height || 170;

    let left = tooltip.x - width / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(vw - width - VIEWPORT_MARGIN, left));

    const gap = 16;
    const topAbove = tooltip.y - height - gap;
    const topBelow = tooltip.y + gap;

    if (topAbove >= VIEWPORT_MARGIN) {
      return { left, top: topAbove, placement: 'top' as const };
    }
    const clampedBelow = Math.min(vh - height - VIEWPORT_MARGIN, topBelow);
    return {
      left,
      top: Math.max(VIEWPORT_MARGIN, clampedBelow),
      placement: 'bottom' as const,
    };
  }, [tooltip, tooltipSize]);

  const activeDisplayText =
    tooltip?.entry?.text ||
    (tooltip?.mode === 'sentence' && tooltip.sentence ? tooltip.sentence : tooltip?.word || '');

  return (
    <>
      {/* Subtle circular long-press hold indicator at pointer coordinates */}
      {holdRing?.visible && (
        <div
          aria-hidden="true"
          className="fixed z-[95] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: holdRing.x, top: holdRing.y }}
        >
          <span className="block w-10 h-10 rounded-full border-2 border-[#FF6B00]/80 bg-[#FF6B00]/10 animate-ping" />
        </div>
      )}

      {/* Floating Tooltip Dictionary Card */}
      {tooltip && (
        <div
          ref={tooltipRef}
          data-tooltip-dictionary="true"
          role="dialog"
          aria-label="Từ điển nhanh Anh - Việt"
          className="fixed z-[100] w-[min(340px,calc(100vw-24px))] rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_18px_45px_-12px_rgba(15,23,42,0.28)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] text-left overflow-hidden transition-opacity duration-150"
          style={{
            left: `${position.left}px`,
            top: `${position.top}px`,
          }}
        >
          {/* Top accent hairline */}
          <div className="h-0.5 w-full bg-gradient-to-r from-[#FF6B00] via-blue-500 to-cyan-400" />

          <div className="p-3.5 space-y-2.5">
            {/* Header row: English text + Audio + Close */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FF6B00] dark:text-[#FF8C2E]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Từ điển nhấn giữ</span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {activeDisplayText}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => speakEnglish(activeDisplayText)}
                  className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors cursor-pointer"
                  aria-label={`Nghe phát âm ${activeDisplayText}`}
                  title="Nghe phát âm tiếng Anh"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={closeTooltip}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Đóng từ điển"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body: Loading / Offline / Error / Translation Result */}
            {tooltip.loading && (
              <div className="flex items-center gap-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF6B00] shrink-0" />
                <span>Đang tra nghĩa tiếng Việt...</span>
              </div>
            )}

            {!tooltip.loading && tooltip.offlineMiss && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Từ này chưa có trong kho ngoại tuyến. Hãy kết nối mạng để tra nghĩa chi tiết bằng AI.
                </span>
              </div>
            )}

            {!tooltip.loading && tooltip.error && (
              <div className="space-y-2 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 p-2.5">
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  {tooltip.error}
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử tra lại</span>
                </button>
              </div>
            )}

            {!tooltip.loading && tooltip.entry && (
              <div className="space-y-2">
                {/* Unboxed metadata line with clean middle-dot separators */}
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {tooltip.entry.ipa && (
                    <>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {tooltip.entry.ipa}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  {tooltip.entry.partOfSpeech && (
                    <>
                      <span>{tooltip.entry.partOfSpeech}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span className="text-slate-400 dark:text-slate-500">
                    {getSourceLabel(tooltip.entry.source)}
                  </span>
                </div>

                {/* Primary Vietnamese meaning */}
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {tooltip.entry.meaningVi}
                </p>

                {/* Optional brief usage/example note */}
                {tooltip.entry.noteVi && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2">
                    {tooltip.entry.noteVi}
                  </p>
                )}
              </div>
            )}

            {/* Sentence context switch action */}
            {tooltip.sentence && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleToggleSentenceMode}
                  disabled={tooltip.loading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Languages className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {tooltip.mode === 'word' ? 'Dịch cả câu này' : 'Quay lại nghĩa từ'}
                  </span>
                </button>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Nhấn ngoài để đóng
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
