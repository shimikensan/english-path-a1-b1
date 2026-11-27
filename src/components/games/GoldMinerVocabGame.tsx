import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pickaxe, Play, RotateCcw, Trophy, Volume2 } from 'lucide-react';
import type { VocabularyItem } from '../../types';
import {
  playGoldClink,
  playHookLaunch,
  playLevelFanfare,
  playWrongBuzz,
} from '../../utils/gameSfx';
import { speakEnglish } from '../../utils/speech';

export interface GameVocabEntry {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  levelId: string;
}

interface GoldMinerVocabGameProps {
  vocabPool: GameVocabEntry[];
  onHighScore?: (score: number) => void;
  onWordMastered?: () => void;
}

type MinerPhase = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';
type HookState = 'SWINGING' | 'EXTENDING' | 'RETRACTING';

interface GoldNugget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vocab: GameVocabEntry;
  isTarget: boolean;
  isGem: boolean;
  caught: boolean;
  shimmerPhase: number;
}

interface FloatingFeedback {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

const CANVAS_W = 860;
const CANVAS_H = 500;
const SURFACE_Y = 92;
const ORIGIN_X = CANVAS_W / 2;
const ORIGIN_Y = SURFACE_Y - 12;
const ROUND_SECONDS = 90;

function pickRandomItems<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function createNuggetWave(
  pool: GameVocabEntry[],
  previousTargetId?: string
): { target: GameVocabEntry; nuggets: GoldNugget[] } {
  const candidates = pool.filter((v) => v.id !== previousTargetId);
  const usable = candidates.length > 0 ? candidates : pool;
  const target = usable[Math.floor(Math.random() * usable.length)];
  const distractors = pickRandomItems(
    pool.filter((v) => v.id !== target.id && v.word.toLowerCase() !== target.word.toLowerCase()),
    6
  );

  // Place 7 nuggets (1 target gold ingot + 6 distractors) across clean non-overlapping zones
  const slots = [
    { x: 115, y: 205 },
    { x: 265, y: 315 },
    { x: 430, y: 245 },
    { x: 605, y: 325 },
    { x: 745, y: 210 },
    { x: 185, y: 425 },
    { x: 545, y: 430 },
    { x: 720, y: 405 },
  ];
  const chosenSlots = pickRandomItems(slots, 1 + distractors.length);
  const items = [target, ...distractors];

  const nuggets: GoldNugget[] = items.map((vocab, idx) => {
    const slot = chosenSlots[idx];
    const jitterX = (Math.random() - 0.5) * 34;
    const jitterY = (Math.random() - 0.5) * 26;
    const w = Math.max(106, Math.min(168, 36 + vocab.word.length * 11));
    const h = 48;
    return {
      id: `${vocab.id}_${idx}_${Date.now()}`,
      x: Math.max(w / 2 + 16, Math.min(CANVAS_W - w / 2 - 16, slot.x + jitterX)),
      y: Math.max(SURFACE_Y + 78, Math.min(CANVAS_H - 42, slot.y + jitterY)),
      w,
      h,
      vocab,
      isTarget: idx === 0,
      isGem: idx === 0 && Math.random() < 0.35,
      caught: false,
      shimmerPhase: Math.random() * Math.PI * 2,
    };
  });

  return { target, nuggets };
}

export function GoldMinerVocabGame({
  vocabPool,
  onHighScore,
  onWordMastered,
}: GoldMinerVocabGameProps) {
  const [phase, setPhase] = useState<MinerPhase>('TITLE_MENU');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [currentTarget, setCurrentTarget] = useState<GameVocabEntry | null>(null);
  const [statusNotice, setStatusNotice] = useState<{
    text: string;
    tone: 'correct' | 'wrong';
  } | null>(null);
  const [minedWords, setMinedWords] = useState<GameVocabEntry[]>([]);
  const [attemptsCount, setAttemptsCount] = useState(0);

  const filteredPool = useMemo(() => {
    const singleOrShort = vocabPool.filter((v) => v.word.length <= 16);
    const byLevel =
      levelFilter === 'ALL'
        ? singleOrShort
        : singleOrShort.filter((v) => v.levelId === levelFilter);
    return byLevel.length >= 6 ? byLevel : singleOrShort;
  }, [vocabPool, levelFilter]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const phaseRef = useRef<MinerPhase>('TITLE_MENU');
  const poolRef = useRef<GameVocabEntry[]>(filteredPool);
  poolRef.current = filteredPool;
  phaseRef.current = phase;

  const gameStateRef = useRef<{
    angle: number;
    angleDir: number;
    hookState: HookState;
    hookLength: number;
    hookedNugget: GoldNugget | null;
    nuggets: GoldNugget[];
    target: GameVocabEntry | null;
    particles: Particle[];
    floaters: FloatingFeedback[];
  }>({
    angle: 0,
    angleDir: 1,
    hookState: 'SWINGING',
    hookLength: 48,
    hookedNugget: null,
    nuggets: [],
    target: null,
    particles: [],
    floaters: [],
  });

  const loadNextWave = useCallback((prevTargetId?: string) => {
    const pool = poolRef.current;
    if (pool.length === 0) return;
    const { target, nuggets } = createNuggetWave(pool, prevTargetId);
    gameStateRef.current.target = target;
    gameStateRef.current.nuggets = nuggets;
    gameStateRef.current.hookedNugget = null;
    gameStateRef.current.hookState = 'SWINGING';
    gameStateRef.current.hookLength = 48;
    setCurrentTarget(target);
  }, []);

  const startGame = useCallback(() => {
    if (poolRef.current.length < 4) return;
    scoreRef.current = 0;
    comboRef.current = 0;
    setScore(0);
    setCombo(0);
    setTimeLeft(ROUND_SECONDS);
    setMinedWords([]);
    setAttemptsCount(0);
    setStatusNotice(null);
    gameStateRef.current.angle = 0;
    gameStateRef.current.angleDir = 1;
    gameStateRef.current.particles = [];
    gameStateRef.current.floaters = [];
    loadNextWave();
    setPhase('PLAYING');
  }, [loadNextWave]);

  const launchHook = useCallback(() => {
    if (phaseRef.current !== 'PLAYING') return;
    const gs = gameStateRef.current;
    if (gs.hookState !== 'SWINGING') return;
    gs.hookState = 'EXTENDING';
    playHookLaunch();
  }, []);

  // Keyboard launch (Space / ArrowDown)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'PLAYING') return;
      if (e.code === 'Space' || e.key === 'ArrowDown') {
        e.preventDefault();
        launchHook();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [launchHook]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setPhase('GAME_OVER');
          onHighScore?.(scoreRef.current);
          playLevelFanfare();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, onHighScore]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const spawnParticles = (x: number, y: number, color: string, count = 18) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 1.6 + Math.random() * 3.8;
        gameStateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          color,
          size: 3 + Math.random() * 4,
          life: 1,
        });
      }
    };

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const gs = gameStateRef.current;

      // Update physics
      if (gs.hookState === 'SWINGING') {
        gs.angle += gs.angleDir * 1.48 * dt;
        const maxAngle = (70 * Math.PI) / 180;
        if (gs.angle > maxAngle) {
          gs.angle = maxAngle;
          gs.angleDir = -1;
        } else if (gs.angle < -maxAngle) {
          gs.angle = -maxAngle;
          gs.angleDir = 1;
        }
      } else if (gs.hookState === 'EXTENDING') {
        gs.hookLength += 540 * dt;
        const tipX = ORIGIN_X + Math.sin(gs.angle) * gs.hookLength;
        const tipY = ORIGIN_Y + Math.cos(gs.angle) * gs.hookLength;

        // Check collision with any nugget
        for (const n of gs.nuggets) {
          if (n.caught) continue;
          if (
            tipX >= n.x - n.w / 2 - 6 &&
            tipX <= n.x + n.w / 2 + 6 &&
            tipY >= n.y - n.h / 2 - 6 &&
            tipY <= n.y + n.h / 2 + 6
          ) {
            n.caught = true;
            gs.hookedNugget = n;
            gs.hookState = 'RETRACTING';
            setAttemptsCount((a) => a + 1);
            if (n.isTarget) {
              playGoldClink();
              spawnParticles(n.x, n.y, '#FACC15', 22);
            } else {
              playWrongBuzz();
              spawnParticles(n.x, n.y, '#94A3B8', 10);
            }
            break;
          }
        }

        // Retract if out of bounds
        if (
          gs.hookState === 'EXTENDING' &&
          (tipX < 14 || tipX > CANVAS_W - 14 || tipY > CANVAS_H - 14)
        ) {
          gs.hookState = 'RETRACTING';
        }
      } else if (gs.hookState === 'RETRACTING') {
        const retractSpeed = gs.hookedNugget
          ? gs.hookedNugget.isTarget
            ? 430
            : 290
          : 640;
        gs.hookLength -= retractSpeed * dt;

        if (gs.hookLength <= 48) {
          gs.hookLength = 48;
          const reeled = gs.hookedNugget;
          gs.hookedNugget = null;
          gs.hookState = 'SWINGING';

          if (reeled) {
            if (reeled.isTarget) {
              comboRef.current += 1;
              const bonus = reeled.isGem ? 50 : 0;
              const earned = 100 + Math.min(5, comboRef.current - 1) * 25 + bonus;
              scoreRef.current += earned;
              setScore(scoreRef.current);
              setCombo(comboRef.current);
              onHighScore?.(scoreRef.current);
              onWordMastered?.();
              speakEnglish(reeled.vocab.word);
              setMinedWords((prev) => [reeled.vocab, ...prev]);
              setStatusNotice({
                text: `Chính xác! ${reeled.vocab.word} (${reeled.vocab.ipa}) = ${reeled.vocab.meaningVi} (+${earned} điểm)`,
                tone: 'correct',
              });
              gs.floaters.push({
                x: ORIGIN_X,
                y: SURFACE_Y + 34,
                text: `+${earned} · ${reeled.vocab.word}`,
                color: '#FDE047',
                life: 1.25,
              });
              loadNextWave(reeled.vocab.id);
            } else {
              comboRef.current = 0;
              setCombo(0);
              setStatusNotice({
                text: `Chưa đúng! Thỏi “${reeled.vocab.word}” có nghĩa là “${reeled.vocab.meaningVi}”. Hãy tìm lại nhé!`,
                tone: 'wrong',
              });
              gs.floaters.push({
                x: ORIGIN_X,
                y: SURFACE_Y + 34,
                text: `${reeled.vocab.word} = ${reeled.vocab.meaningVi}`,
                color: '#FDA4AF',
                life: 1.4,
              });
            }
          }
        }
      }

      // Update particles & floaters
      gs.particles = gs.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.life -= dt * 1.9;
        return p.life > 0;
      });
      gs.floaters = gs.floaters.filter((f) => {
        f.y -= 32 * dt;
        f.life -= dt;
        return f.life > 0;
      });

      // --- RENDER SCENE ---
      // 1. Sky backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
      skyGrad.addColorStop(0, '#0B192E');
      skyGrad.addColorStop(1, '#1E3A5F');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, SURFACE_Y);

      // 2. Underground layered earth strata
      const earthGrad = ctx.createLinearGradient(0, SURFACE_Y, 0, CANVAS_H);
      earthGrad.addColorStop(0, '#4A2E1B');
      earthGrad.addColorStop(0.45, '#3A2214');
      earthGrad.addColorStop(1, '#26160C');
      ctx.fillStyle = earthGrad;
      ctx.fillRect(0, SURFACE_Y, CANVAS_W, CANVAS_H - SURFACE_Y);

      // Subtle rocky strata lines
      ctx.strokeStyle = 'rgba(255,215,140,0.08)';
      ctx.lineWidth = 2;
      for (let sy = SURFACE_Y + 75; sy < CANVAS_H; sy += 88) {
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.bezierCurveTo(CANVAS_W * 0.3, sy - 14, CANVAS_W * 0.7, sy + 14, CANVAS_W, sy);
        ctx.stroke();
      }

      // Surface grass & wooden beam border
      ctx.fillStyle = '#D97706';
      ctx.fillRect(0, SURFACE_Y - 6, CANVAS_W, 8);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(0, SURFACE_Y + 2, CANVAS_W, 5);

      // 3. Draw Pilot Mining Rig at top center
      ctx.fillStyle = '#1E293B';
      drawRoundRect(ORIGIN_X - 54, SURFACE_Y - 56, 108, 48, 10);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Winch drum wheel
      ctx.beginPath();
      ctx.arc(ORIGIN_X, ORIGIN_Y, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 4. Draw Gold Ingots (English Words)
      const tipX = ORIGIN_X + Math.sin(gs.angle) * gs.hookLength;
      const tipY = ORIGIN_Y + Math.cos(gs.angle) * gs.hookLength;

      for (const n of gs.nuggets) {
        if (n.caught && gs.hookedNugget !== n) continue;
        const drawX = gs.hookedNugget === n ? tipX : n.x;
        const drawY = gs.hookedNugget === n ? tipY + n.h * 0.35 : n.y;
        const left = drawX - n.w / 2;
        const top = drawY - n.h / 2;

        // Soft shadow under ingot
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        drawRoundRect(left + 3, top + 5, n.w, n.h, 12);
        ctx.fill();

        // Gleaming gold bar fill
        const goldGrad = ctx.createLinearGradient(left, top, left, top + n.h);
        if (n.isGem) {
          goldGrad.addColorStop(0, '#FEF08A');
          goldGrad.addColorStop(0.5, '#F59E0B');
          goldGrad.addColorStop(1, '#B45309');
        } else {
          goldGrad.addColorStop(0, '#FDE68A');
          goldGrad.addColorStop(0.55, '#EAB308');
          goldGrad.addColorStop(1, '#A16207');
        }
        ctx.fillStyle = goldGrad;
        drawRoundRect(left, top, n.w, n.h, 12);
        ctx.fill();

        // Specular metallic rim & highlight
        ctx.strokeStyle = '#FEF9C3';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top gloss stripe
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        drawRoundRect(left + 8, top + 5, n.w - 16, 10, 5);
        ctx.fill();

        // Subtle animated sparkle dot on gold nugget
        const shimmer = (Math.sin(now / 360 + n.shimmerPhase) + 1) * 0.5;
        if (shimmer > 0.72) {
          ctx.fillStyle = `rgba(255,255,255,${(shimmer - 0.72) * 3})`;
          ctx.beginPath();
          ctx.arc(left + n.w - 14, top + 12, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bold crisp English word on gold ingot
        ctx.fillStyle = '#1E1B18';
        ctx.font = '800 16px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.vocab.word, drawX, drawY + 2, n.w - 16);
      }

      // 5. Draw Winch Cable & Grappling Claw
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ORIGIN_X, ORIGIN_Y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(-gs.angle);
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, 6);
      ctx.quadraticCurveTo(-14, -4, 0, -4);
      ctx.quadraticCurveTo(14, -4, 12, 6);
      ctx.stroke();
      ctx.fillStyle = '#FF6B00';
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Particles & Floating Score Popups
      for (const p of gs.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const f of gs.floaters) {
        ctx.globalAlpha = Math.min(1, f.life);
        ctx.font = '800 17px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(f.text, f.x + 1, f.y + 1);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, loadNextWave, onHighScore, onWordMastered]);

  const accuracy =
    attemptsCount > 0 ? Math.round((minedWords.length / attemptsCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top Deck Filter & HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn bộ từ vựng Đào vàng">
          {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'ESP'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setLevelFilter(lvl);
                if (phase === 'PLAYING') {
                  setPhase('TITLE_MENU');
                }
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
          <span>
            Thời gian:{' '}
            <strong className={timeLeft <= 15 && phase === 'PLAYING' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>
              {timeLeft}s
            </strong>
          </span>
        </div>
      </div>

      {/* Prominent Vietnamese Target Prompt Banner (when playing) */}
      {phase === 'PLAYING' && currentTarget && (
        <div className="rounded-2xl border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/30 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Yêu cầu tiếng Việt — Hãy gắp đúng thỏi vàng tiếng Anh tương ứng:
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => speakEnglish(currentTarget.word)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Nghe phát âm gợi ý
            </button>
            <button
              type="button"
              onClick={launchHook}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#FF7E1F] cursor-pointer"
            >
              <Pickaxe className="w-3.5 h-3.5" />
              Thả móc (Space)
            </button>
          </div>
        </div>
      )}

      {/* Arena Container */}
      <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden">
        {phase === 'TITLE_MENU' && (
          <div className="p-8 sm:p-12 text-center space-y-5 bg-gradient-to-b from-[#0B192E] via-[#1E293B] to-[#3A2214]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center justify-center">
              <Pickaxe className="w-7 h-7" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl font-extrabold text-white">Đào vàng Từ vựng</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Phía trên hiển thị <strong>nghĩa tiếng Việt</strong>, bên dưới lòng đất là các <strong>thỏi vàng chứa từ tiếng Anh</strong>. Nhấn chuột, chạm màn hình hoặc bấm phím <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs font-mono">Space</kbd> để thả móc gắp đúng thỏi vàng!
              </p>
              <p className="text-xs text-amber-300/90 tabular-nums">
                Kho từ hiện tại: {filteredPool.length} từ vựng · Thời lượng: {ROUND_SECONDS} giây
              </p>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#FF7E1F] transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Bắt đầu đào vàng
            </button>
          </div>
        )}

        {phase === 'PLAYING' && (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={launchHook}
              className="w-full h-auto block cursor-crosshair select-none touch-manipulation"
            />
            {statusNotice && (
              <div
                className={`px-4 py-2.5 text-xs font-semibold border-t ${
                  statusNotice.tone === 'correct'
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/70'
                    : 'bg-rose-950/90 text-rose-200 border-rose-800/70'
                }`}
              >
                {statusNotice.text}
              </div>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-500" />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Kết thúc phiên Đào vàng!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Điểm: <strong className="text-[#D94E00] dark:text-[#FF8C2E]">{score}</strong> · Đào đúng{' '}
                    <strong>{minedWords.length}</strong> thỏi vàng · Chính xác <strong>{accuracy}%</strong>
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

            {minedWords.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Từ vựng bạn vừa đào được ({minedWords.length} từ):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {minedWords.map((v, i) => (
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
                Chưa đào được thỏi vàng nào trong lượt này — hãy thử căn thời điểm móc hướng thẳng vào thỏi vàng rồi nhấn Space nhé!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export helper type converter for callers using lesson VocabularyItem[]
export function toGameVocabEntry(item: VocabularyItem, levelId: string): GameVocabEntry {
  return {
    id: item.id,
    word: item.word,
    ipa: item.ipa || '',
    partOfSpeech: item.partOfSpeech || '',
    meaningVi: item.meaningVi,
    levelId,
  };
}
