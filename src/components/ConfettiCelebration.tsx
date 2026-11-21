import { useEffect, useRef } from 'react';

interface ConfettiCelebrationProps {
  /** Increment or pass a truthy trigger key to launch a new celebration burst */
  triggerKey: number;
  /** 'grand' launches multi-wave fireworks + side cannons; 'standard' launches a lighter burst */
  intensity?: 'standard' | 'grand';
  /** Duration in ms before particles finish fading out */
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  height: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltSpeed: number;
  shape: 'ribbon' | 'circle' | 'star' | 'spark';
  drag: number;
  gravity: number;
  alpha: number;
  life: number;
  maxLife: number;
}

const COCKPIT_PALETTE = [
  '#FF6B00', // Cockpit Neon Orange
  '#FF9A3C', // Warm Amber
  '#FACC15', // Flight Gold
  '#38BDF8', // Sky Horizon Blue
  '#10B981', // Nominal Emerald
  '#F8FAFC', // Crisp Instrument White
  '#FB7185', // Signal Coral
];

function pickColor(): string {
  return COCKPIT_PALETTE[Math.floor(Math.random() * COCKPIT_PALETTE.length)];
}

export function ConfettiCelebration({
  triggerKey,
  intensity = 'grand',
  durationMs = 3600,
}: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (triggerKey <= 0) return;

    // Respect user accessibility preference for reduced motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];

    const spawnCannon = (originX: number, originY: number, baseAngleRad: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 0.78;
        const angle = baseAngleRad + spread;
        const speed = 9 + Math.random() * 11;
        const shapeRoll = Math.random();
        const shape: Particle['shape'] =
          shapeRoll < 0.65 ? 'ribbon' : shapeRoll < 0.85 ? 'circle' : 'star';

        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: shape === 'ribbon' ? 7 + Math.random() * 6 : 4 + Math.random() * 4,
          height: shape === 'ribbon' ? 4 + Math.random() * 4 : 4 + Math.random() * 4,
          color: pickColor(),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.24,
          tiltAngle: Math.random() * Math.PI * 2,
          tiltSpeed: 0.08 + Math.random() * 0.12,
          shape,
          drag: 0.975 + Math.random() * 0.012,
          gravity: 0.22 + Math.random() * 0.12,
          alpha: 1,
          life: 0,
          maxLife: 110 + Math.random() * 75,
        });
      }
    };

    const spawnFireworkBurst = (cx: number, cy: number, count: number) => {
      const burstAccent = pickColor();
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
        const speed = 3.2 + Math.random() * 6.8;
        const isSpark = Math.random() < 0.55;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: isSpark ? 2.5 + Math.random() * 2.5 : 5 + Math.random() * 4,
          height: isSpark ? 2.5 + Math.random() * 2.5 : 3 + Math.random() * 3,
          color: Math.random() < 0.45 ? burstAccent : pickColor(),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          tiltAngle: Math.random() * Math.PI * 2,
          tiltSpeed: 0.1 + Math.random() * 0.1,
          shape: isSpark ? 'spark' : 'ribbon',
          drag: 0.955 + Math.random() * 0.015,
          gravity: 0.13 + Math.random() * 0.08,
          alpha: 1,
          life: 0,
          maxLife: 70 + Math.random() * 45,
        });
      }
    };

    // Wave 1: Dual cockpit side cannons + central firework burst
    const cannonCount = intensity === 'grand' ? 42 : 26;
    spawnCannon(width * 0.06, height * 0.85, -Math.PI * 0.34, cannonCount);
    spawnCannon(width * 0.94, height * 0.85, -Math.PI * 0.66, cannonCount);
    spawnFireworkBurst(width * 0.5, height * 0.28, intensity === 'grand' ? 38 : 24);

    // Wave 2: Delayed twin aerial bursts for grand celebration
    const timers: number[] = [];
    if (intensity === 'grand') {
      timers.push(
        window.setTimeout(() => {
          spawnFireworkBurst(width * 0.28, height * 0.24, 30);
          spawnFireworkBurst(width * 0.72, height * 0.24, 30);
        }, 420)
      );
      timers.push(
        window.setTimeout(() => {
          spawnFireworkBurst(width * 0.5, height * 0.2, 26);
        }, 880)
      );
    }

    const drawStar = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      outerR: number,
      innerR: number
    ) => {
      context.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI * i) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
    };

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        if (p.life >= p.maxLife || p.y > height + 40) {
          particles.splice(i, 1);
          continue;
        }
        aliveCount += 1;

        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx + Math.sin(p.tiltAngle) * 0.45;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.tiltAngle += p.tiltSpeed;

        const lifeRatio = p.life / p.maxLife;
        p.alpha = lifeRatio > 0.65 ? Math.max(0, 1 - (lifeRatio - 0.65) / 0.35) : 1;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'ribbon') {
          const flutterScale = Math.cos(p.tiltAngle);
          ctx.scale(1, Math.max(0.2, Math.abs(flutterScale)));
          ctx.fillRect(-p.size / 2, -p.height / 2, p.size, p.height);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'spark') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, 0, 0, p.size * 0.75, p.size * 0.34);
        }
        ctx.restore();
      }

      if (aliveCount > 0 || elapsed < durationMs) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [triggerKey, intensity, durationMs]);

  if (triggerKey <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none"
    />
  );
}
