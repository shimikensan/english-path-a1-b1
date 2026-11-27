import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Play, RotateCcw, Target, Trophy, Volume2 } from 'lucide-react';
import type { GameVocabEntry } from './GoldMinerVocabGame';
import { playCorrectChime, playLevelFanfare, playWrongBuzz } from '../../utils/gameSfx';
import { speakEnglish } from '../../utils/speech';

interface VocabCatcherGameProps {
  vocabPool: GameVocabEntry[];
  onHighScore?: (score: number) => void;
  onWordMastered?: () => void;
}

type CatcherPhase = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

interface FallingWordToken {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  swayOffset: number;
  vocab: GameVocabEntry;
  isTarget: boolean;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const CANVAS_W = 860;
const CANVAS_H = 500;
const BASKET_W = 148;
const BASKET_H = 38;
const BASKET_Y = CANVAS_H - 52;
const MAX_LIVES = 3;

export function VocabCatcherGame({
  vocabPool,
  onHighScore,
  onWordMastered,
}: VocabCatcherGameProps) {
  const [phase, setPhase] = useState<CatcherPhase>('TITLE_MENU');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [speedTier, setSpeedTier] = useState(1);
  const [currentTarget, setCurrentTarget] = useState<GameVocabEntry | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'correct' | 'wrong' } | null>(
    null
  );
  const [caughtWords, setCaughtWords] = useState<GameVocabEntry[]>([]);

  const filteredPool = useMemo(() => {
    const clean = vocabPool.filter((v) => v.word.length <= 16);
    const byLevel =
      levelFilter === 'ALL' ? clean : clean.filter((v) => v.levelId === levelFilter);
    return byLevel.length >= 6 ? byLevel : clean;
  }, [vocabPool, levelFilter]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef(filteredPool);
  poolRef.current = filteredPool;

  const stateRef = useRef<{
    basketX: number;
    keys: { left: boolean; right: boolean };
    tokens: FallingWordToken[];
    particles: BurstParticle[];
    popups: ScorePopup[];
    target: GameVocabEntry | null;
    score: number;
    combo: number;
    lives: number;
    caughtCount: number;
    spawnTimer: number;
    sinceLastTargetSpawn: number;
  }>({
    basketX: CANVAS_W / 2,
    keys: { left: false, right: false },
    tokens: [],
    particles: [],
    popups: [],
    target: null,
    score: 0,
    combo: 0,
    lives: MAX_LIVES,
    caughtCount: 0,
    spawnTimer: 0.4,
    sinceLastTargetSpawn: 0,
  });

  const pickNewTarget = useCallback((excludeId?: string) => {
    const pool = poolRef.current;
    if (pool.length === 0) return null;
    const candidates = pool.filter((v) => v.id !== excludeId);
    const list = candidates.length > 0 ? candidates : pool;
    const next = list[Math.floor(Math.random() * list.length)];
    stateRef.current.target = next;
    stateRef.current.sinceLastTargetSpawn = 2; // Ensure the new target spawns very soon
    setCurrentTarget(next);
    return next;
  }, []);

  const startGame = useCallback(() => {
    if (poolRef.current.length < 4) return;
    const st = stateRef.current;
    st.basketX = CANVAS_W / 2;
    st.keys = { left: false, right: false };
    st.tokens = [];
    st.particles = [];
    st.popups = [];
    st.score = 0;
    st.combo = 0;
    st.lives = MAX_LIVES;
    st.caughtCount = 0;
    st.spawnTimer = 0.25;
    st.sinceLastTargetSpawn = 2;

    setScore(0);
    setCombo(0);
    setLives(MAX_LIVES);
    setSpeedTier(1);
    setCaughtWords([]);
    setFeedback(null);
    pickNewTarget();
    setPhase('PLAYING');
  }, [pickNewTarget]);

  // Keyboard movement (ArrowLeft / ArrowRight / A / D)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        stateRef.current.keys.left = true;
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        stateRef.current.keys.right = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        stateRef.current.keys.left = false;
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        stateRef.current.keys.right = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Pointer (Mouse / Touch) tracking over canvas
  const updateBasketFromClientX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = ((clientX - rect.left) / rect.width) * CANVAS_W;
    stateRef.current.basketX = Math.max(
      BASKET_W / 2 + 10,
      Math.min(CANVAS_W - BASKET_W / 2 - 10, relX)
    );
  };

  // Main 60fps Canvas Loop
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const spawnBurst = (x: number, y: number, color: string) => {
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
        const sp = 1.8 + Math.random() * 3.5;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 1.5,
          color,
          size: 3 + Math.random() * 3.5,
          life: 1,
        });
      }
    };

    const spawnToken = () => {
      const st = stateRef.current;
      const pool = poolRef.current;
      if (!st.target || pool.length === 0) return;

      const hasActiveTarget = st.tokens.some((t) => t.isTarget);
      const shouldSpawnTarget =
        !hasActiveTarget && (st.sinceLastTargetSpawn >= 2 || Math.random() < 0.42);

      let vocab: GameVocabEntry;
      let isTarget = false;

      if (shouldSpawnTarget) {
        vocab = st.target;
        isTarget = true;
        st.sinceLastTargetSpawn = 0;
      } else {
        const distractors = pool.filter(
          (v) =>
            v.id !== st.target?.id &&
            v.word.toLowerCase() !== st.target?.word.toLowerCase()
        );
        vocab =
          distractors.length > 0
            ? distractors[Math.floor(Math.random() * distractors.length)]
            : st.target;
        isTarget = vocab.id === st.target.id;
        st.sinceLastTargetSpawn = isTarget ? 0 : st.sinceLastTargetSpawn + 1;
      }

      const tier = 1 + Math.floor(st.caughtCount / 5);
      const w = Math.max(106, Math.min(176, 36 + vocab.word.length * 10.5));
      const h = 42;

      // Pick x position avoiding overlap with recently spawned tokens near top
      let x = w / 2 + 24 + Math.random() * (CANVAS_W - w - 48);
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate = w / 2 + 24 + Math.random() * (CANVAS_W - w - 48);
        const crowded = st.tokens.some(
          (t) => t.y < 140 && Math.abs(t.x - candidate) < (t.w + w) * 0.55
        );
        if (!crowded) {
          x = candidate;
          break;
        }
      }

      st.tokens.push({
        id: `${vocab.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x,
        y: -36,
        w,
        h,
        speed: 96 + tier * 17 + Math.random() * 24,
        swayOffset: Math.random() * Math.PI * 2,
        vocab,
        isTarget,
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const st = stateRef.current;

      // Move basket by keyboard
      const keySpeed = 540;
      if (st.keys.left) st.basketX -= keySpeed * dt;
      if (st.keys.right) st.basketX += keySpeed * dt;
      st.basketX = Math.max(
        BASKET_W / 2 + 10,
        Math.min(CANVAS_W - BASKET_W / 2 - 10, st.basketX)
      );

      // Spawn timer
      const tier = 1 + Math.floor(st.caughtCount / 5);
      st.spawnTimer -= dt;
      if (st.spawnTimer <= 0 && st.tokens.length < 6) {
        spawnToken();
        st.spawnTimer = Math.max(0.85, 1.55 - tier * 0.1);
      }

      // Update falling tokens & collisions
      const remaining: FallingWordToken[] = [];
      let ended = false;

      for (const tok of st.tokens) {
        tok.y += tok.speed * dt;
        const swayX = tok.x + Math.sin(now / 520 + tok.swayOffset) * 14;

        // Basket catch collision box
        const hitX = Math.abs(swayX - st.basketX) <= BASKET_W / 2 + tok.w * 0.36;
        const hitY =
          tok.y + tok.h / 2 >= BASKET_Y - 8 && tok.y - tok.h / 2 <= BASKET_Y + BASKET_H * 0.6;

        if (hitX && hitY) {
          if (tok.isTarget) {
            st.combo += 1;
            st.caughtCount += 1;
            const earned = 100 + Math.min(6, st.combo - 1) * 20;
            st.score += earned;
            const nextTier = 1 + Math.floor(st.caughtCount / 5);
            setScore(st.score);
            setCombo(st.combo);
            setSpeedTier(nextTier);
            onHighScore?.(st.score);
            onWordMastered?.();
            playCorrectChime();
            speakEnglish(tok.vocab.word);
            spawnBurst(swayX, BASKET_Y - 6, '#34D399');
            st.popups.push({
              x: swayX,
              y: BASKET_Y - 24,
              text: `+${earned} · ${tok.vocab.word}`,
              color: '#6EE7B7',
              life: 1.2,
            });
            setCaughtWords((prev) => [tok.vocab, ...prev]);
            setFeedback({
              text: `Tuyệt vời! ${tok.vocab.word} (${tok.vocab.ipa}) = ${tok.vocab.meaningVi} (+${earned} điểm)`,
              tone: 'correct',
            });

            // Switch target and refresh isTarget flag on remaining airborne tokens
            const nextTarget = pickNewTarget(tok.vocab.id);
            for (const other of remaining) {
              other.isTarget = other.vocab.id === nextTarget?.id;
            }
          } else {
            st.combo = 0;
            st.lives -= 1;
            setCombo(0);
            setLives(st.lives);
            playWrongBuzz();
            spawnBurst(swayX, BASKET_Y - 6, '#FB7185');
            st.popups.push({
              x: swayX,
              y: BASKET_Y - 24,
              text: `${tok.vocab.word} = ${tok.vocab.meaningVi}`,
              color: '#FDA4AF',
              life: 1.4,
            });
            setFeedback({
              text: `Nhầm rồi! “${tok.vocab.word}” nghĩa là “${tok.vocab.meaningVi}”. (-1 tim)`,
              tone: 'wrong',
            });

            if (st.lives <= 0) {
              ended = true;
              break;
            }
          }
          continue;
        }

        // Token fell past bottom edge
        if (tok.y - tok.h / 2 > CANVAS_H + 10) {
          if (tok.isTarget) {
            st.combo = 0;
            setCombo(0);
            st.sinceLastTargetSpawn = 2;
            setFeedback({
              text: `Bạn vừa để lọt từ mục tiêu “${tok.vocab.word}” (${tok.vocab.meaningVi}) — đón lại ở đợt kế tiếp nhé!`,
              tone: 'wrong',
            });
          }
          continue;
        }

        remaining.push(tok);
      }

      if (ended) {
        onHighScore?.(st.score);
        playLevelFanfare();
        setPhase('GAME_OVER');
        return;
      }

      st.tokens = remaining;

      // Update particles & popups
      st.particles = st.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.life -= dt * 2;
        return p.life > 0;
      });
      st.popups = st.popups.filter((p) => {
        p.y -= 34 * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // --- RENDER SKY ARENA ---
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, '#071529');
      bgGrad.addColorStop(0.65, '#0F294A');
      bgGrad.addColorStop(1, '#1A3A63');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Soft drifting clouds in background
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 4; i++) {
        const cx = ((now * 0.018 * (i + 1) + i * 240) % (CANVAS_W + 180)) - 90;
        const cy = 65 + i * 74;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.arc(cx + 26, cy - 8, 34, 0, Math.PI * 2);
        ctx.arc(cx + 54, cy, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw falling parachute word capsules
      for (const tok of st.tokens) {
        const drawX = tok.x + Math.sin(now / 520 + tok.swayOffset) * 14;
        const left = drawX - tok.w / 2;
        const top = tok.y - tok.h / 2;

        // Parachute canopy above token
        ctx.strokeStyle = 'rgba(226,232,240,0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(drawX - 18, top - 16);
        ctx.lineTo(drawX - 8, top);
        ctx.moveTo(drawX + 18, top - 16);
        ctx.lineTo(drawX + 8, top);
        ctx.stroke();

        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(drawX, top - 16, 20, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        // Word capsule body (uniform clean styling so players read the word rather than guessing by color!)
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(left, top, tok.w, tok.h, 12);
        ctx.fill();
        ctx.strokeStyle = '#93C5FD';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = '800 16px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tok.vocab.word, drawX, tok.y + 1, tok.w - 16);
      }

      // Draw Pilot Catcher Basket at bottom
      const bx = st.basketX - BASKET_W / 2;
      const basketGrad = ctx.createLinearGradient(bx, BASKET_Y, bx, BASKET_Y + BASKET_H);
      basketGrad.addColorStop(0, '#FF8C2E');
      basketGrad.addColorStop(1, '#D94E00');
      ctx.fillStyle = basketGrad;
      drawRoundRect(bx, BASKET_Y, BASKET_W, BASKET_H, 14);
      ctx.fill();
      ctx.strokeStyle = '#FED7AA';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Catcher wings
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(bx - 16, BASKET_Y + 14);
      ctx.lineTo(bx + 2, BASKET_Y + 6);
      ctx.lineTo(bx + 2, BASKET_Y + 26);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx + BASKET_W + 16, BASKET_Y + 14);
      ctx.lineTo(bx + BASKET_W - 2, BASKET_Y + 6);
      ctx.lineTo(bx + BASKET_W - 2, BASKET_Y + 26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PILOT CATCHER', st.basketX, BASKET_Y + BASKET_H / 2 + 1);

      // Particles & Score popups
      for (const p of st.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const pop of st.popups) {
        ctx.globalAlpha = Math.min(1, pop.life);
        ctx.font = '800 16px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
      }
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, pickNewTarget, onHighScore, onWordMastered]);

  return (
    <div className="space-y-4">
      {/* Level Deck Selector & Live HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn bộ từ vựng Hứng từ">
          {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'ESP'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setLevelFilter(lvl);
                if (phase === 'PLAYING') setPhase('TITLE_MENU');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                levelFilter === lvl
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lvl === 'ALL' ? 'Tất cả cấp độ' : lvl === 'ESP' ? 'Chuyên ngành' : `CEFR ${lvl}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          <span>
            Điểm: <strong className="text-[#D94E00] dark:text-[#FF8C2E]">{score}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Combo: <strong className="text-emerald-600 dark:text-emerald-400">x{Math.max(1, combo)}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>Cấp tốc độ {speedTier}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1" aria-label={`Còn ${lives} mạng`}>
            {Array.from({ length: MAX_LIVES }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-4 h-4 ${
                  idx < lives
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </span>
        </div>
      </div>

      {/* Prominent Target Meaning Banner */}
      {phase === 'PLAYING' && currentTarget && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/80 dark:bg-blue-950/30 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Hãy hứng từ tiếng Anh có nghĩa tiếng Việt là:
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {currentTarget.meaningVi}
              {currentTarget.partOfSpeech && (
                <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  ({currentTarget.partOfSpeech})
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => speakEnglish(currentTarget.word)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Nghe phát âm gợi ý
          </button>
        </div>
      )}

      {/* Canvas Play Area */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden">
        {phase === 'TITLE_MENU' && (
          <div className="p-8 sm:p-12 text-center space-y-5 bg-gradient-to-b from-[#071529] via-[#0F294A] to-[#1A3A63]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/20 border border-sky-400/50 text-sky-300 flex items-center justify-center">
              <Target className="w-7 h-7" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl font-extrabold text-white">Hứng từ vựng theo nghĩa</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Di chuyển giỏ <strong>Pilot Catcher</strong> bằng <strong>chuột, kéo tay</strong> hoặc phím{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs font-mono">←</kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs font-mono">→</kbd> để hứng đúng từ tiếng Anh khớp với nghĩa tiếng Việt phía trên và né các từ sai!
              </p>
              <p className="text-xs text-sky-300/90 tabular-nums">
                Kho từ hiện tại: {filteredPool.length} từ vựng · 3 mạng sống · Tốc độ tăng dần theo combo
              </p>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#FF7E1F] transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Bắt đầu hứng từ
            </button>
          </div>
        )}

        {phase === 'PLAYING' && (
          <div>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onMouseMove={(e) => updateBasketFromClientX(e.clientX)}
              onTouchStart={(e) => {
                if (e.touches[0]) updateBasketFromClientX(e.touches[0].clientX);
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) updateBasketFromClientX(e.touches[0].clientX);
              }}
              className="w-full h-auto block cursor-ew-resize select-none touch-none"
            />
            {feedback && (
              <div
                className={`px-4 py-2.5 text-xs font-semibold border-t ${
                  feedback.tone === 'correct'
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/70'
                    : 'bg-rose-950/90 text-rose-200 border-rose-800/70'
                }`}
              >
                {feedback.text}
              </div>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-sky-500" />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Hoàn thành lượt chơi Hứng từ vựng!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Điểm số: <strong className="text-[#D94E00] dark:text-[#FF8C2E]">{score}</strong> · Hứng đúng{' '}
                    <strong>{caughtWords.length}</strong> từ · Cấp tốc độ đạt được: <strong>{speedTier}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={startGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#FF7E1F] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Chơi lại ngay
              </button>
            </div>

            {caughtWords.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Từ vựng bạn vừa ôn luyện ({caughtWords.length} từ):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {caughtWords.map((v, i) => (
                    <div
                      key={`${v.id}-${i}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white">{v.word}</span>{' '}
                        <span className="font-mono text-blue-600 dark:text-blue-400">{v.ipa}</span>
                        <div className="text-slate-600 dark:text-slate-400 truncate">
                          {v.meaningVi}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakEnglish(v.word)}
                        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 shrink-0 cursor-pointer"
                        aria-label={`Nghe phát âm ${v.word}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hãy di chuyển giỏ thật khéo léo để hứng đúng từ tiếng Anh khớp nghĩa ở lượt tới nhé!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
