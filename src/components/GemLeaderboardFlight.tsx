import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Gem, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playGemCascade } from '../utils/gameSfx';

interface GemLeaderboardFlightProps {
  onOpenLeaderboard?: () => void;
}

interface FlightGeometry {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  usesFloatingDock: boolean;
}

interface GemParticleSpec {
  id: number;
  burstX: number;
  burstY: number;
  midX: number;
  midY: number;
  size: number;
  delay: number;
  duration: number;
  rotateStart: number;
  rotateEnd: number;
  primaryColor: string;
  facetColor: string;
  highlightColor: string;
}

const GEM_PALETTES = [
  { primary: '#38BDF8', facet: '#0284C7', highlight: '#E0F2FE' },
  { primary: '#0EA5E9', facet: '#0369A1', highlight: '#BAE6FD' },
  { primary: '#F59E0B', facet: '#D97706', highlight: '#FEF3C7' },
  { primary: '#22D3EE', facet: '#0891B2', highlight: '#CFFAFE' },
  { primary: '#FF8524', facet: '#D94E00', highlight: '#FFEDD5' },
];

const IMPACT_SPARKS = [
  { dx: -36, dy: -28, size: 7, delay: 0 },
  { dx: 38, dy: -24, size: 6, delay: 0.03 },
  { dx: -44, dy: 12, size: 5, delay: 0.05 },
  { dx: 42, dy: 18, size: 7, delay: 0.02 },
  { dx: -16, dy: -42, size: 6, delay: 0.04 },
  { dx: 20, dy: 38, size: 5, delay: 0.06 },
  { dx: -24, dy: 34, size: 6, delay: 0.03 },
  { dx: 10, dy: -40, size: 8, delay: 0.01 },
];

export const LEADERBOARD_GEM_IMPACT_EVENT = 'pilot-leaderboard-gem-impact';

function FacetedGemSvg({
  size,
  primary,
  facet,
  highlight,
}: {
  size: number;
  primary: string;
  facet: string;
  highlight: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      className="drop-shadow-[0_4px_10px_rgba(14,165,233,0.55)]"
      aria-hidden="true"
    >
      <polygon points="14,2 25,10 14,26 3,10" fill={primary} />
      <polygon points="14,2 25,10 14,12" fill={highlight} fillOpacity="0.72" />
      <polygon points="14,12 25,10 14,26" fill={facet} fillOpacity="0.88" />
      <polygon points="3,10 14,12 14,26" fill={primary} fillOpacity="0.92" />
      <polygon points="8,10 14,4 20,10 14,12" fill={highlight} fillOpacity="0.65" />
    </svg>
  );
}

function measureFlightGeometry(): FlightGeometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Origin: earned gems display on the completed lesson summary card
  const originEl = document.querySelector<HTMLElement>('[data-gem-origin="lesson-reward"]');
  let startX = vw * 0.55;
  let startY = vh * 0.4;
  if (originEl) {
    const r = originEl.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh) {
      startX = r.left + r.width / 2;
      startY = r.top + r.height / 2;
    }
  }

  // Destination: visible Leaderboard button in the desktop sidebar
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>('[data-gem-target="leaderboard"]')
  );
  const visibleTarget = targets.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.bottom <= vh;
  });

  if (visibleTarget) {
    const r = visibleTarget.getBoundingClientRect();
    return {
      startX,
      startY,
      targetX: r.left + Math.min(34, r.width * 0.25),
      targetY: r.top + r.height / 2,
      usesFloatingDock: false,
    };
  }

  // Fallback for mobile / Focus Mode where sidebar is hidden: floating Leaderboard Arrival Dock at top-right
  return {
    startX,
    startY,
    targetX: Math.max(80, vw - 130),
    targetY: 88,
    usesFloatingDock: true,
  };
}

export function GemLeaderboardFlight({ onOpenLeaderboard }: GemLeaderboardFlightProps) {
  const { gemFlightEvent, clearGemFlight, gemBreakdown } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const [geometry, setGeometry] = useState<FlightGeometry | null>(null);
  const [impactActive, setImpactActive] = useState(false);

  useEffect(() => {
    if (!gemFlightEvent) {
      setGeometry(null);
      setImpactActive(false);
      return;
    }

    let cancelled = false;
    let raf2: number | undefined;
    let impactTimer: number | undefined;
    let clearTimer: number | undefined;

    // Wait 2 animation frames so QuizSection's completion card mounts before measuring coordinates
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const measured = measureFlightGeometry();
        setGeometry(measured);

        if (!prefersReducedMotion) {
          playGemCascade();
        }

        const impactDelayMs = prefersReducedMotion ? 120 : 620;
        impactTimer = window.setTimeout(() => {
          if (cancelled) return;
          setImpactActive(true);
          window.dispatchEvent(
            new CustomEvent(LEADERBOARD_GEM_IMPACT_EVENT, {
              detail: {
                amount: gemFlightEvent.amount,
                key: gemFlightEvent.key,
              },
            })
          );
        }, impactDelayMs);

        const totalLifetimeMs = prefersReducedMotion ? 2100 : 2550;
        clearTimer = window.setTimeout(() => {
          if (!cancelled) {
            clearGemFlight();
          }
        }, totalLifetimeMs);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      if (raf2 !== undefined) window.cancelAnimationFrame(raf2);
      if (impactTimer !== undefined) window.clearTimeout(impactTimer);
      if (clearTimer !== undefined) window.clearTimeout(clearTimer);
    };
  }, [gemFlightEvent, clearGemFlight, prefersReducedMotion]);

  const particles = useMemo<GemParticleSpec[]>(() => {
    if (!gemFlightEvent || !geometry || prefersReducedMotion) return [];

    const count = Math.min(18, Math.max(10, Math.round(gemFlightEvent.amount / 3.5)));
    const { startX, startY, targetX, targetY } = geometry;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    // Perpendicular unit vector for graceful curved arc separation
    const perpX = -dy / dist;
    const perpY = dx / dist;

    return Array.from({ length: count }, (_, idx) => {
      const t = count > 1 ? idx / (count - 1) : 0.5;
      const angle = (idx / count) * Math.PI * 2 + (idx % 3) * 0.25;
      const burstRadius = 38 + (idx % 4) * 18;
      const burstX = startX + Math.cos(angle) * burstRadius;
      const burstY = startY + Math.sin(angle) * (burstRadius * 0.78) - 18;

      const arcSign = idx % 2 === 0 ? 1 : -1;
      const arcSpread = (42 + (idx % 5) * 26) * arcSign;
      const midX = startX + dx * (0.45 + (t - 0.5) * 0.14) + perpX * arcSpread;
      const midY = startY + dy * (0.45 + (t - 0.5) * 0.14) + perpY * arcSpread - 28;

      const palette = GEM_PALETTES[idx % GEM_PALETTES.length];
      return {
        id: idx,
        burstX,
        burstY,
        midX,
        midY,
        size: 17 + (idx % 4) * 3,
        delay: idx * 0.042,
        duration: 0.92 + (idx % 3) * 0.09,
        rotateStart: (idx % 2 === 0 ? -1 : 1) * (20 + idx * 8),
        rotateEnd: (idx % 2 === 0 ? 1 : -1) * (240 + idx * 18),
        primaryColor: palette.primary,
        facetColor: palette.facet,
        highlightColor: palette.highlight,
      };
    });
  }, [gemFlightEvent, geometry, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {gemFlightEvent && geometry && (
        <div
          key={gemFlightEvent.key}
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          aria-live="polite"
        >
          {/* Floating Leaderboard Arrival Dock when sidebar is hidden (mobile / Focus Mode) */}
          {geometry.usesFloatingDock && (
            <motion.button
              type="button"
              onClick={() => {
                clearGemFlight();
                onOpenLeaderboard?.();
              }}
              initial={{ opacity: 0, y: -18, scale: 0.92 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: impactActive ? [1, 1.07, 1] : 1,
              }}
              exit={{ opacity: 0, y: -14, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="pointer-events-auto fixed top-16 right-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0B1728]/95 border border-sky-400/50 shadow-xl text-white cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <Trophy className="w-4 h-4" />
              </span>
              <div className="text-left min-w-0">
                <div className="text-[11px] font-semibold text-sky-300 leading-tight">
                  Bảng xếp hạng
                </div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold tabular-nums">
                  <Gem className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{gemBreakdown.totalEarned.toLocaleString('vi-VN')}</span>
                  <span className="text-emerald-400">+{gemFlightEvent.amount}</span>
                </div>
              </div>
            </motion.button>
          )}

          {/* Origin golden-azure glow pulse where the gems launch */}
          {!prefersReducedMotion && (
            <motion.div
              initial={{
                x: geometry.startX - 36,
                y: geometry.startY - 36,
                scale: 0.35,
                opacity: 0.9,
              }}
              animate={{
                scale: [0.35, 1.85],
                opacity: [0.9, 0],
              }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 left-0 w-[72px] h-[72px] rounded-full border-2 border-sky-400/80"
            />
          )}

          {/* Individual flying crystal gem particles along curved trajectories */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: geometry.startX - p.size / 2,
                y: geometry.startY - p.size / 2,
                scale: 0.25,
                opacity: 0,
                rotate: p.rotateStart,
              }}
              animate={{
                x: [
                  geometry.startX - p.size / 2,
                  p.burstX - p.size / 2,
                  p.midX - p.size / 2,
                  geometry.targetX - p.size / 2,
                ],
                y: [
                  geometry.startY - p.size / 2,
                  p.burstY - p.size / 2,
                  p.midY - p.size / 2,
                  geometry.targetY - p.size / 2,
                ],
                scale: [0.25, 1.18, 0.98, 0.32],
                opacity: [0, 1, 1, 0],
                rotate: [p.rotateStart, p.rotateStart * 0.4, p.rotateEnd * 0.6, p.rotateEnd],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                times: [0, 0.22, 0.64, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="fixed top-0 left-0 will-change-transform"
            >
              <FacetedGemSvg
                size={p.size}
                primary={p.primaryColor}
                facet={p.facetColor}
                highlight={p.highlightColor}
              />
            </motion.div>
          ))}

          {/* Destination impact burst rings + sparks + floating +Ngọc counter */}
          {impactActive && (
            <>
              {!prefersReducedMotion && (
                <>
                  <motion.div
                    initial={{
                      x: geometry.targetX - 28,
                      y: geometry.targetY - 28,
                      scale: 0.3,
                      opacity: 0.95,
                    }}
                    animate={{ scale: [0.3, 2.25], opacity: [0.95, 0] }}
                    transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed top-0 left-0 w-14 h-14 rounded-full border-2 border-sky-400"
                  />
                  <motion.div
                    initial={{
                      x: geometry.targetX - 24,
                      y: geometry.targetY - 24,
                      scale: 0.35,
                      opacity: 0.85,
                    }}
                    animate={{ scale: [0.35, 1.9], opacity: [0.85, 0] }}
                    transition={{ duration: 0.68, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed top-0 left-0 w-12 h-12 rounded-full border-2 border-[#FF8524]"
                  />

                  {IMPACT_SPARKS.map((spark, idx) => (
                    <motion.span
                      key={idx}
                      initial={{
                        x: geometry.targetX - spark.size / 2,
                        y: geometry.targetY - spark.size / 2,
                        scale: 0,
                        opacity: 0,
                      }}
                      animate={{
                        x: geometry.targetX + spark.dx - spark.size / 2,
                        y: geometry.targetY + spark.dy - spark.size / 2,
                        scale: [0, 1.2, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 0.65,
                        delay: spark.delay,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="fixed top-0 left-0 rounded-full"
                      style={{
                        width: spark.size,
                        height: spark.size,
                        backgroundColor: idx % 2 === 0 ? '#38BDF8' : '#FF8524',
                      }}
                    />
                  ))}
                </>
              )}

              {/* Floating +XX Ngọc impact readout rising above the Leaderboard target */}
              {!geometry.usesFloatingDock && (
                <motion.div
                  initial={{
                    x: geometry.targetX + 18,
                    y: geometry.targetY - 12,
                    opacity: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    x: geometry.targetX + 18,
                    y: geometry.targetY - 46,
                    opacity: [0, 1, 1, 0],
                    scale: [0.8, 1.08, 1, 0.96],
                  }}
                  transition={{
                    duration: 1.55,
                    times: [0, 0.18, 0.72, 1],
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="fixed top-0 left-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1728]/95 border border-sky-400/55 shadow-lg text-xs font-extrabold text-sky-300 tabular-nums whitespace-nowrap"
                >
                  <Gem className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>+{gemFlightEvent.amount} Ngọc · Bảng xếp hạng</span>
                </motion.div>
              )}
            </>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
