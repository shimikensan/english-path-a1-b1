import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Crown,
  Gem,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { PILOT_RANKS } from '../data/levels';
import type { LearnerCEFRLevel } from '../types';
import {
  playFireworkSalvoSfx,
  playLevelUpFanfare,
  useCockpitAudio,
} from '../utils/cockpitAudio';
import {
  CEFR_LEVEL_ORDER,
  getCefrLevelIndex,
  isCefrProgressionLevel,
  isHigherCefrLevel,
  LEVEL_UP_CELEBRATE_EVENT,
  type LevelUpCelebrationDetail,
} from '../utils/levelCelebration';

interface LevelUpCelebrationModalProps {
  onStartNextLevel: (nextLevel: LearnerCEFRLevel) => void;
  onOpenRoadmap: () => void;
}

interface LevelVisualTheme {
  accentHex: string;
  secondaryHex: string;
  sunburstGradient: string;
  auraGradient: string;
  ringBorder: string;
  emblemGradient: string;
  badgeTextClass: string;
  ctaGradient: string;
  fireworkPalette: string[];
}

const LEVEL_THEMES: Record<LearnerCEFRLevel, LevelVisualTheme> = {
  A1: {
    accentHex: '#38BDF8',
    secondaryHex: '#FBBF24',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.42) 12deg, transparent 24deg, transparent 45deg, rgba(251,191,36,0.48) 57deg, transparent 69deg, transparent 90deg, rgba(56,189,248,0.42) 102deg, transparent 114deg, transparent 135deg, rgba(251,191,36,0.48) 147deg, transparent 159deg, transparent 180deg, rgba(56,189,248,0.42) 192deg, transparent 204deg, transparent 225deg, rgba(251,191,36,0.48) 237deg, transparent 249deg, transparent 270deg, rgba(56,189,248,0.42) 282deg, transparent 294deg, transparent 315deg, rgba(251,191,36,0.48) 327deg, transparent 339deg)',
    auraGradient:
      'radial-gradient(circle, rgba(56,189,248,0.42) 0%, rgba(251,191,36,0.22) 45%, transparent 72%)',
    ringBorder: 'border-sky-300/70',
    emblemGradient: 'from-sky-400 via-blue-500 to-amber-400',
    badgeTextClass: 'text-sky-300',
    ctaGradient: 'bg-gradient-to-r from-[#FF6B00] to-amber-500 hover:from-[#FF7E1F] hover:to-amber-400',
    fireworkPalette: ['#38BDF8', '#FBBF24', '#FDE047', '#FF6B00', '#FFFFFF', '#7DD3FC'],
  },
  A2: {
    accentHex: '#FF8524',
    secondaryHex: '#FACC15',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(255,133,36,0.46) 12deg, transparent 24deg, transparent 45deg, rgba(250,204,21,0.5) 57deg, transparent 69deg, transparent 90deg, rgba(255,133,36,0.46) 102deg, transparent 114deg, transparent 135deg, rgba(250,204,21,0.5) 147deg, transparent 159deg, transparent 180deg, rgba(255,133,36,0.46) 192deg, transparent 204deg, transparent 225deg, rgba(250,204,21,0.5) 237deg, transparent 249deg, transparent 270deg, rgba(255,133,36,0.46) 282deg, transparent 294deg, transparent 315deg, rgba(250,204,21,0.5) 327deg, transparent 339deg)',
    auraGradient:
      'radial-gradient(circle, rgba(255,107,0,0.45) 0%, rgba(250,204,21,0.24) 45%, transparent 72%)',
    ringBorder: 'border-amber-300/75',
    emblemGradient: 'from-amber-400 via-[#FF6B00] to-rose-500',
    badgeTextClass: 'text-amber-300',
    ctaGradient: 'bg-gradient-to-r from-[#FF6B00] to-amber-500 hover:from-[#FF7E1F] hover:to-amber-400',
    fireworkPalette: ['#FF6B00', '#FACC15', '#FB923C', '#FDE047', '#38BDF8', '#FFFFFF'],
  },
  B1: {
    accentHex: '#34D399',
    secondaryHex: '#FBBF24',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(52,211,153,0.46) 12deg, transparent 24deg, transparent 45deg, rgba(251,191,36,0.52) 57deg, transparent 69deg, transparent 90deg, rgba(52,211,153,0.46) 102deg, transparent 114deg, transparent 135deg, rgba(251,191,36,0.52) 147deg, transparent 159deg, transparent 180deg, rgba(52,211,153,0.46) 192deg, transparent 204deg, transparent 225deg, rgba(251,191,36,0.52) 237deg, transparent 249deg, transparent 270deg, rgba(52,211,153,0.46) 282deg, transparent 294deg, transparent 315deg, rgba(251,191,36,0.52) 327deg, transparent 339deg)',
    auraGradient:
      'radial-gradient(circle, rgba(16,185,129,0.42) 0%, rgba(251,191,36,0.25) 45%, transparent 72%)',
    ringBorder: 'border-emerald-300/75',
    emblemGradient: 'from-emerald-400 via-teal-500 to-amber-400',
    badgeTextClass: 'text-emerald-300',
    ctaGradient: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400',
    fireworkPalette: ['#34D399', '#FBBF24', '#38BDF8', '#FDE047', '#FF8524', '#FFFFFF'],
  },
  B2: {
    accentHex: '#A78BFA',
    secondaryHex: '#FBBF24',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(167,139,250,0.46) 12deg, transparent 24deg, transparent 45deg, rgba(251,191,36,0.52) 57deg, transparent 69deg, transparent 90deg, rgba(167,139,250,0.46) 102deg, transparent 114deg, transparent 135deg, rgba(251,191,36,0.52) 147deg, transparent 159deg, transparent 180deg, rgba(167,139,250,0.46) 192deg, transparent 204deg, transparent 225deg, rgba(251,191,36,0.52) 237deg, transparent 249deg, transparent 270deg, rgba(167,139,250,0.46) 282deg, transparent 294deg, transparent 315deg, rgba(251,191,36,0.52) 327deg, transparent 339deg)',
    auraGradient:
      'radial-gradient(circle, rgba(139,92,246,0.44) 0%, rgba(251,191,36,0.25) 45%, transparent 72%)',
    ringBorder: 'border-violet-300/75',
    emblemGradient: 'from-violet-400 via-indigo-500 to-amber-400',
    badgeTextClass: 'text-violet-300',
    ctaGradient: 'bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400',
    fireworkPalette: ['#A78BFA', '#FBBF24', '#38BDF8', '#F472B6', '#FDE047', '#FFFFFF'],
  },
  C1: {
    accentHex: '#FACC15',
    secondaryHex: '#FDE68A',
    sunburstGradient:
      'conic-gradient(from 0deg, transparent 0deg, rgba(250,204,21,0.55) 12deg, transparent 24deg, transparent 45deg, rgba(255,133,36,0.48) 57deg, transparent 69deg, transparent 90deg, rgba(250,204,21,0.55) 102deg, transparent 114deg, transparent 135deg, rgba(255,133,36,0.48) 147deg, transparent 159deg, transparent 180deg, rgba(250,204,21,0.55) 192deg, transparent 204deg, transparent 225deg, rgba(255,133,36,0.48) 237deg, transparent 249deg, transparent 270deg, rgba(250,204,21,0.55) 282deg, transparent 294deg, transparent 315deg, rgba(255,133,36,0.48) 327deg, transparent 339deg)',
    auraGradient:
      'radial-gradient(circle, rgba(250,204,21,0.5) 0%, rgba(255,107,0,0.26) 45%, transparent 72%)',
    ringBorder: 'border-amber-200/85',
    emblemGradient: 'from-yellow-300 via-amber-400 to-[#FF6B00]',
    badgeTextClass: 'text-amber-200',
    ctaGradient: 'bg-gradient-to-r from-amber-500 to-[#FF6B00] hover:from-amber-400 hover:to-[#FF7E1F]',
    fireworkPalette: ['#FDE047', '#FBBF24', '#FF6B00', '#38BDF8', '#FFFFFF', '#F472B6'],
  },
};

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
  burstStyle: 'chrysanthemum' | 'double_ring' | 'willow';
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  radius: number;
  gravity: number;
  drag: number;
  twinkle: boolean;
}

interface StardustMote {
  x: number;
  y: number;
  vy: number;
  drift: number;
  phase: number;
  radius: number;
  alpha: number;
  color: string;
}

interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export function LevelUpCelebrationModal({
  onStartNextLevel,
  onOpenRoadmap,
}: LevelUpCelebrationModalProps) {
  const { profile, lessons } = useApp();
  const { audioEnabled, toggleAudio } = useCockpitAudio();
  const [celebration, setCelebration] = useState<LevelUpCelebrationDetail | null>(null);
  const [salvoCounter, setSalvoCounter] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTrackedUserRef = useRef<string | null>(null);
  const prevLevelRef = useRef<LearnerCEFRLevel | null>(null);
  const recentEventAtRef = useRef<number>(0);

  const openCelebration = useCallback((detail: LevelUpCelebrationDetail) => {
    recentEventAtRef.current = Date.now();
    setCelebration(detail);
    setSalvoCounter((c) => c + 1);
    playLevelUpFanfare();
  }, []);

  const handleClose = useCallback(() => {
    setCelebration(null);
  }, []);

  // Listen to explicit level-completion & replay celebration events
  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const custom = event as CustomEvent<LevelUpCelebrationDetail>;
      if (!custom.detail) return;
      openCelebration(custom.detail);
    };
    window.addEventListener(LEVEL_UP_CELEBRATE_EVENT, onCelebrate);
    return () => window.removeEventListener(LEVEL_UP_CELEBRATE_EVENT, onCelebrate);
  }, [openCelebration]);

  // Also detect upward profile.currentLevel promotions (e.g. manual or external rank-up)
  useEffect(() => {
    if (!profile?.uid || !isCefrProgressionLevel(profile.currentLevel)) {
      lastTrackedUserRef.current = null;
      prevLevelRef.current = null;
      return;
    }

    if (lastTrackedUserRef.current !== profile.uid) {
      lastTrackedUserRef.current = profile.uid;
      prevLevelRef.current = profile.currentLevel;
      return;
    }

    const previous = prevLevelRef.current;
    prevLevelRef.current = profile.currentLevel;

    if (!previous || !isHigherCefrLevel(profile.currentLevel, previous)) {
      return;
    }

    // Avoid duplicate modal if saveQuizAttempt just dispatched the completion celebration
    if (Date.now() - recentEventAtRef.current < 4000) {
      return;
    }

    const prevIdx = getCefrLevelIndex(profile.currentLevel) - 1;
    const completedLevel = prevIdx >= 0 ? CEFR_LEVEL_ORDER[prevIdx] : previous;
    const totalLessonsInLevel = lessons.filter(
      (l) => l.isPublished !== false && l.levelId === completedLevel
    ).length;

    openCelebration({
      completedLevel,
      promotedToLevel: profile.currentLevel,
      totalLessonsInLevel,
      bonusGems: 0,
      isReplay: false,
      triggerKind: 'rank_promoted',
    });
  }, [profile?.uid, profile?.currentLevel, lessons, openCelebration]);

  // Lock body scroll & listen to Escape while open
  useEffect(() => {
    if (!celebration) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [celebration, handleClose]);

  // Multi-stage Fireworks + Radiant Stardust Canvas Engine
  useEffect(() => {
    if (!celebration) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = LEVEL_THEMES[celebration.completedLevel] || LEVEL_THEMES.A1;
    const palette = theme.fireworkPalette;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Accessible static luminous starburst constellation for prefers-reduced-motion
    if (reducedMotion) {
      ctx.clearRect(0, 0, width, height);
      const bursts = [
        { cx: width * 0.16, cy: height * 0.22, r: 58, color: palette[0] },
        { cx: width * 0.84, cy: height * 0.2, r: 64, color: palette[1] },
        { cx: width * 0.2, cy: height * 0.78, r: 48, color: palette[2] },
        { cx: width * 0.82, cy: height * 0.76, r: 54, color: palette[3] },
      ];
      for (const b of bursts) {
        for (let i = 0; i < 18; i++) {
          const angle = (Math.PI * 2 * i) / 18;
          ctx.beginPath();
          ctx.moveTo(b.cx + Math.cos(angle) * 10, b.cy + Math.sin(angle) * 10);
          ctx.lineTo(b.cx + Math.cos(angle) * b.r, b.cy + Math.sin(angle) * b.r);
          ctx.strokeStyle = b.color;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(
            b.cx + Math.cos(angle) * b.r,
            b.cy + Math.sin(angle) * b.r,
            2.4,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = 0.8;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const shockRings: ShockRing[] = [];
    const motes: StardustMote[] = Array.from({ length: 42 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.28 + Math.random() * 0.55,
      drift: 0.25 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      radius: 1.1 + Math.random() * 2.1,
      alpha: 0.25 + Math.random() * 0.5,
      color: palette[Math.floor(Math.random() * palette.length)],
    }));

    const pickColor = () => palette[Math.floor(Math.random() * palette.length)];

    const launchRocket = (preferredX?: number) => {
      const startX =
        preferredX !== undefined
          ? preferredX
          : width * (0.12 + Math.random() * 0.76);
      const targetY = height * (0.14 + Math.random() * 0.34);
      const styles: Rocket['burstStyle'][] = ['chrysanthemum', 'double_ring', 'willow'];
      rockets.push({
        x: startX,
        y: height + 10,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -(11.5 + Math.random() * 3.8),
        targetY,
        color: pickColor(),
        trail: [],
        burstStyle: styles[Math.floor(Math.random() * styles.length)],
      });
    };

    const explodeAt = (
      x: number,
      y: number,
      baseColor: string,
      style: Rocket['burstStyle']
    ) => {
      const secondary = pickColor();
      shockRings.push({
        x,
        y,
        radius: 6,
        maxRadius: 72 + Math.random() * 38,
        alpha: 0.65,
        color: baseColor,
      });

      if (style === 'double_ring') {
        const outerCount = 44;
        for (let i = 0; i < outerCount; i++) {
          const angle = (Math.PI * 2 * i) / outerCount + (Math.random() - 0.5) * 0.08;
          const speed = 4.6 + Math.random() * 1.4;
          sparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 3 === 0 ? '#FFFFFF' : baseColor,
            alpha: 1,
            decay: 0.013 + Math.random() * 0.008,
            radius: 2.3 + Math.random() * 1.1,
            gravity: 0.06,
            drag: 0.968,
            twinkle: i % 4 === 0,
          });
        }
        const innerCount = 24;
        for (let i = 0; i < innerCount; i++) {
          const angle = (Math.PI * 2 * i) / innerCount;
          const speed = 2.4 + Math.random() * 0.8;
          sparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: secondary,
            alpha: 1,
            decay: 0.016 + Math.random() * 0.008,
            radius: 1.9 + Math.random() * 0.9,
            gravity: 0.055,
            drag: 0.97,
            twinkle: true,
          });
        }
        return;
      }

      if (style === 'willow') {
        const count = 48;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.6 + Math.random() * 4.2;
          sparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.8,
            color: i % 2 === 0 ? '#FDE047' : baseColor,
            alpha: 1,
            decay: 0.009 + Math.random() * 0.006,
            radius: 1.8 + Math.random() * 1.2,
            gravity: 0.095,
            drag: 0.982,
            twinkle: true,
          });
        }
        return;
      }

      // Chrysanthemum burst
      const count = 52;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.14;
        const speed = 2.2 + Math.random() * 4.8;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: i % 4 === 0 ? secondary : baseColor,
          alpha: 1,
          decay: 0.013 + Math.random() * 0.009,
          radius: 1.9 + Math.random() * 1.4,
          gravity: 0.065,
          drag: 0.968,
          twinkle: i % 5 === 0,
        });
      }
    };

    // Grand opening salvo (immediate aerial bursts + staggered rockets)
    explodeAt(width * 0.22, height * 0.26, palette[0], 'double_ring');
    explodeAt(width * 0.78, height * 0.24, palette[1], 'chrysanthemum');
    launchRocket(width * 0.32);
    launchRocket(width * 0.68);
    launchRocket(width * 0.5);

    const timeouts: number[] = [
      window.setTimeout(() => {
        launchRocket(width * 0.18);
        launchRocket(width * 0.82);
      }, 360),
      window.setTimeout(() => {
        launchRocket(width * 0.42);
        launchRocket(width * 0.58);
      }, 820),
    ];

    let frameId = 0;
    let tick = 0;

    const animate = () => {
      tick += 1;
      // Soft trail fade over transparent canvas
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      // Periodic celebratory launches while modal stays open
      if (tick % 46 === 0 && rockets.length < 4 && sparks.length < 460) {
        launchRocket();
      }
      if (tick % 110 === 0 && rockets.length < 5 && sparks.length < 420) {
        launchRocket(width * 0.2);
        launchRocket(width * 0.8);
      }

      // Floating stardust motes
      for (const m of motes) {
        m.y -= m.vy;
        m.x += Math.sin(tick * 0.02 + m.phase) * m.drift;
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        const shimmer = 0.55 + 0.45 * Math.sin(tick * 0.08 + m.phase);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.globalAlpha = m.alpha * shimmer;
        ctx.fill();
      }

      // Shockwave rings at firework burst centers
      for (let i = shockRings.length - 1; i >= 0; i--) {
        const ring = shockRings[i];
        ring.radius += (ring.maxRadius - ring.radius) * 0.12 + 1.4;
        ring.alpha -= 0.028;
        if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
          shockRings.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = Math.max(0, ring.alpha);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Ascending rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 9) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.16;

        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t];
          const ratio = (t + 1) / r.trail.length;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.5 + ratio * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.globalAlpha = ratio * 0.72;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.95;
        ctx.fill();

        if (r.y <= r.targetY || r.vy >= -1.2) {
          explodeAt(r.x, r.y, r.color, r.burstStyle);
          rockets.splice(i, 1);
        }
      }

      // Burst sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= s.drag;
        s.vy = s.vy * s.drag + s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;

        if (s.alpha <= 0.01) {
          sparks.splice(i, 1);
          continue;
        }

        const twinkleFactor = s.twinkle ? 0.55 + 0.45 * Math.sin(tick * 0.35 + i) : 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.alpha * twinkleFactor);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      timeouts.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('resize', resize);
    };
  }, [celebration, salvoCounter]);

  if (typeof document === 'undefined') return null;

  const theme = celebration
    ? LEVEL_THEMES[celebration.completedLevel] || LEVEL_THEMES.A1
    : LEVEL_THEMES.A1;
  const completedRank = celebration ? PILOT_RANKS[celebration.completedLevel] : null;
  const promotedRank =
    celebration && celebration.promotedToLevel
      ? PILOT_RANKS[celebration.promotedToLevel]
      : null;

  const handleExtraFireworks = () => {
    setSalvoCounter((c) => c + 1);
    playFireworkSalvoSfx();
  };

  const handleReplayAnthem = () => {
    playLevelUpFanfare({ forcePlay: true });
  };

  const handlePrimaryAction = () => {
    if (!celebration) return;
    const nextLevel = celebration.promotedToLevel;
    handleClose();
    if (nextLevel) {
      onStartNextLevel(nextLevel);
    } else {
      onOpenRoadmap();
    }
  };

  return createPortal(
    <AnimatePresence>
      {celebration && (
        <motion.div
          key="levelup-celebration-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="levelup-celebration-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-slate-950/78 backdrop-blur-md overflow-y-auto"
          onClick={handleClose}
        >
          {/* Full-screen Fireworks & Stardust Canvas */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none"
          />

          {/* Central Radiant Ceremony Card */}
          <motion.div
            key={`${celebration.completedLevel}-${celebration.promotedToLevel ?? 'MAX'}`}
            initial={{ opacity: 0, scale: 0.86, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl bg-slate-950/92 border border-white/15 shadow-2xl overflow-hidden text-white"
          >
            {/* Subtle luminous top rim */}
            <div
              aria-hidden="true"
              className="h-1.5 w-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.accentHex}, ${theme.secondaryHex}, transparent)`,
              }}
            />

            {/* Audio Controls (top-left) */}
            <div className="absolute top-3.5 left-4 z-20 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReplayAnthem}
                title="Phát lại bản nhạc chúc mừng hào hùng"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-200 bg-white/10 hover:bg-white/15 border border-white/15 transition-colors whitespace-nowrap"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Nhạc chúc mừng</span>
              </button>
              <button
                type="button"
                onClick={toggleAudio}
                aria-label={audioEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
                title={audioEnabled ? 'Đang bật âm thanh (nhấn để tắt)' : 'Đang tắt âm thanh (nhấn để bật)'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  audioEnabled
                    ? 'text-slate-200 border-white/15 bg-white/5 hover:bg-white/15'
                    : 'text-slate-400 border-white/10 bg-white/5 hover:text-white'
                }`}
              >
                {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng thông báo thăng cấp"
              className="absolute top-4 right-4 z-20 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative px-6 pt-8 pb-6 sm:px-8 sm:pt-9 sm:pb-7 text-center">
              {/* Radiant Sunburst Halo + Expanding Shockwaves + Pilot Emblem */}
              <div className="relative mx-auto w-44 h-44 flex items-center justify-center mb-4">
                {/* Rotating Sunburst Rays */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-12 rounded-full levelup-sunburst-spin pointer-events-none opacity-85"
                  style={{
                    background: theme.sunburstGradient,
                    maskImage:
                      'radial-gradient(circle, black 26%, rgba(0,0,0,0.45) 58%, transparent 74%)',
                    WebkitMaskImage:
                      'radial-gradient(circle, black 26%, rgba(0,0,0,0.45) 58%, transparent 74%)',
                  }}
                />

                {/* Pulsing Radial Aura */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 rounded-full levelup-halo-pulse pointer-events-none"
                  style={{ background: theme.auraGradient }}
                />

                {/* Expanding Luminous Rings */}
                <div
                  aria-hidden="true"
                  className={`absolute inset-4 rounded-full border-2 ${theme.ringBorder} levelup-shockwave-1 pointer-events-none`}
                />
                <div
                  aria-hidden="true"
                  className={`absolute inset-4 rounded-full border ${theme.ringBorder} levelup-shockwave-2 pointer-events-none`}
                />

                {/* Core Rank Medallion */}
                <motion.div
                  initial={{ scale: 0.6, rotate: -14 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}
                  className={`relative z-10 w-28 h-28 rounded-full bg-gradient-to-br ${theme.emblemGradient} p-[3px] shadow-[0_0_40px_rgba(251,191,36,0.45)]`}
                >
                  <div className="w-full h-full rounded-full bg-slate-950/90 flex flex-col items-center justify-center gap-0.5 border border-white/20">
                    {celebration.promotedToLevel ? (
                      <Crown className="w-8 h-8 text-amber-300 drop-shadow" />
                    ) : (
                      <Trophy className="w-8 h-8 text-amber-300 drop-shadow" />
                    )}
                    <span className="text-xl font-black tracking-tight text-white leading-none">
                      {celebration.promotedToLevel ?? celebration.completedLevel}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/90">
                      {celebration.promotedToLevel ? 'THĂNG CẤP' : 'CHINH PHỤC'}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Headline */}
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.badgeTextClass} mb-2`}>
                {celebration.isReplay
                  ? `Dấu ấn hoàn thành CEFR ${celebration.completedLevel}`
                  : celebration.triggerKind === 'rank_promoted'
                    ? 'Lễ phong quân hàm phi công'
                    : `Hoàn thành 100% chặng CEFR ${celebration.completedLevel}`}
              </p>

              <h2
                id="levelup-celebration-title"
                className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight"
              >
                {celebration.promotedToLevel
                  ? `Chúc mừng thăng cấp ${celebration.promotedToLevel}!`
                  : `Chinh phục đỉnh cao CEFR ${celebration.completedLevel}!`}
              </h2>

              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                {celebration.promotedToLevel
                  ? `Bạn đã xuất sắc hoàn tất toàn bộ lộ trình ${celebration.completedLevel} và chính thức nhận cấp bậc ${promotedRank?.rankVi ?? celebration.promotedToLevel} (${promotedRank?.callsign ?? celebration.promotedToLevel}).`
                  : `Bạn đã làm chủ toàn bộ chặng bay ${celebration.completedLevel} và đạt danh hiệu cao quý ${completedRank?.rankVi ?? 'Cơ trưởng Huấn luyện'}.`}
              </p>

              {/* Rank Promotion Transition Strip */}
              <div className="mt-5 rounded-xl bg-white/[0.06] border border-white/10 p-4">
                {celebration.promotedToLevel ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Hoàn thành · {celebration.completedLevel}
                      </div>
                      <div className="text-sm font-bold text-slate-200 truncate">
                        {completedRank?.rankVi ?? celebration.completedLevel}
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-amber-400/15 border border-amber-300/35 flex items-center justify-center shrink-0">
                      <ArrowRight className="w-4 h-4 text-amber-300" />
                    </div>

                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                        Cấp bậc mới · {celebration.promotedToLevel}
                      </div>
                      <div className="text-sm font-extrabold text-white truncate">
                        {promotedRank?.rankVi ?? celebration.promotedToLevel}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2.5 text-sm font-bold text-amber-200">
                    <Award className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>
                      {completedRank?.rankVi ?? 'Cơ trưởng Huấn luyện'} ({completedRank?.callsign ?? 'Flight Commander'})
                    </span>
                  </div>
                )}

                {/* Completion metrics & Promotion Gem Reward */}
                <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-200 tabular-nums">
                  {celebration.totalLessonsInLevel > 0 && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      100% ({celebration.totalLessonsInLevel}/{celebration.totalLessonsInLevel} bài học)
                    </span>
                  )}

                  {celebration.bonusGems > 0 && !celebration.isReplay && (
                    <span className="inline-flex items-center gap-1.5 font-bold text-sky-300">
                      <Gem className="w-4 h-4" />
                      Thưởng thăng cấp +{celebration.bonusGems} Ngọc
                    </span>
                  )}

                  {celebration.promotedToLevel && promotedRank && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-amber-200">
                      <Compass className="w-4 h-4" />
                      {promotedRank.stage}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all whitespace-nowrap ${theme.ctaGradient}`}
                >
                  {celebration.promotedToLevel
                    ? `Khám phá chặng ${celebration.promotedToLevel}`
                    : 'Xem đường bay'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleExtraFireworks}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-200 bg-white/10 hover:bg-white/15 border border-white/15 transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Bắn thêm pháo hoa
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
