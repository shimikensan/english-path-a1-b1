import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Gem, X } from 'lucide-react';
import {
  AIRCRAFT_CATEGORY_LABELS,
  PILOT_GEAR_RARITY_META,
  type AircraftCategory,
  type PilotGearItem,
} from '../../data/pilotGearCatalog';

interface AircraftPurchaseAnimationProps {
  purchaseEvent: { item: PilotGearItem; key: number } | null;
  onComplete: () => void;
}

interface FlightProfile {
  x: string[];
  y: string[];
  rotate: number[];
  scale: number[];
  duration: number;
  times: number[];
  trailAngle: number;
}

const FLIGHT_PROFILES: Record<AircraftCategory, FlightProfile> = {
  helicopter: {
    x: ['-22vw', '28vw', '62vw', '118vw'],
    y: ['24vh', '6vh', '2vh', '-18vh'],
    rotate: [6, 10, 8, -4],
    scale: [0.85, 1.12, 1.08, 0.92],
    duration: 2.35,
    times: [0, 0.35, 0.65, 1],
    trailAngle: -10,
  },
  uav: {
    x: ['-24vw', '32vw', '66vw', '122vw'],
    y: ['18vh', '2vh', '-4vh', '-18vh'],
    rotate: [-6, -4, -5, -8],
    scale: [0.84, 1.16, 1.1, 0.9],
    duration: 2.05,
    times: [0, 0.36, 0.68, 1],
    trailAngle: -9,
  },
  civilian: {
    x: ['-26vw', '30vw', '68vw', '122vw'],
    y: ['26vh', '4vh', '-8vh', '-26vh'],
    rotate: [-14, -10, -8, -12],
    scale: [0.82, 1.15, 1.1, 0.9],
    duration: 2.15,
    times: [0, 0.38, 0.7, 1],
    trailAngle: -14,
  },
  fighter: {
    x: ['-30vw', '36vw', '64vw', '128vw'],
    y: ['14vh', '-2vh', '-8vh', '-24vh'],
    rotate: [-8, -6, -10, -14],
    scale: [0.78, 1.25, 1.15, 0.85],
    duration: 1.75,
    times: [0, 0.36, 0.62, 1],
    trailAngle: -10,
  },
  bomber: {
    x: ['-28vw', '30vw', '64vw', '124vw'],
    y: ['20vh', '2vh', '-6vh', '-22vh'],
    rotate: [-10, -7, -6, -10],
    scale: [0.82, 1.22, 1.16, 0.9],
    duration: 2.2,
    times: [0, 0.38, 0.68, 1],
    trailAngle: -11,
  },
  spacecraft: {
    x: ['-24vw', '28vw', '66vw', '120vw'],
    y: ['34vh', '6vh', '-14vh', '-40vh'],
    rotate: [-28, -22, -18, -24],
    scale: [0.8, 1.22, 1.12, 0.86],
    duration: 2.1,
    times: [0, 0.38, 0.68, 1],
    trailAngle: -22,
  },
};

const SPARK_OFFSETS = [
  { x: -110, y: -42, delay: 0.35, size: 7 },
  { x: -65, y: 52, delay: 0.42, size: 5 },
  { x: -18, y: -64, delay: 0.38, size: 8 },
  { x: 38, y: 48, delay: 0.46, size: 6 },
  { x: 84, y: -50, delay: 0.4, size: 7 },
  { x: 122, y: 26, delay: 0.48, size: 5 },
  { x: -85, y: 12, delay: 0.44, size: 6 },
  { x: 56, y: -14, delay: 0.36, size: 8 },
];

function AircraftVectorSilhouette({
  category,
  swatchHex,
  accentHex,
}: {
  category: AircraftCategory;
  swatchHex: string;
  accentHex: string;
}) {
  if (category === 'helicopter') {
    return (
      <svg
        viewBox="0 0 220 110"
        className="w-44 h-24 sm:w-56 sm:h-28 drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)]"
        aria-hidden="true"
      >
        {/* Main spinning rotor blur */}
        <motion.rect
          x="36"
          y="16"
          width="148"
          height="5"
          rx="2.5"
          fill="#E2E8F0"
          animate={{ scaleX: [1, 0.35, 1], opacity: [0.95, 0.55, 0.95] }}
          transition={{ duration: 0.14, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '110px 18px' }}
        />
        <rect x="106" y="18" width="8" height="16" rx="2" fill="#334155" />
        {/* Tail boom & fin */}
        <path d="M24 52 L92 48 L92 60 L28 59 Z" fill={swatchHex} />
        <path d="M18 36 L34 36 L40 56 L22 56 Z" fill={accentHex} />
        {/* Tail rotor */}
        <motion.circle
          cx="22"
          cy="44"
          r="9"
          fill="none"
          stroke="#F8FAFC"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.25, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '22px 44px' }}
        />
        {/* Cabin body */}
        <path
          d="M84 36 C110 30, 152 34, 174 52 C180 58, 178 72, 162 74 L92 74 C80 74, 76 62, 84 36 Z"
          fill={swatchHex}
        />
        {/* Accent livery stripe */}
        <path d="M86 58 L174 58 L168 65 L84 65 Z" fill={accentHex} />
        {/* Tinted glass cockpit */}
        <path
          d="M128 38 C148 39, 164 46, 171 55 L128 55 Z"
          fill="#38BDF8"
          fillOpacity="0.88"
        />
        {/* Landing skids */}
        <path
          d="M96 74 L92 88 M152 74 L156 88 M80 88 L172 88 C176 88, 179 85, 181 82"
          stroke="#CBD5E1"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }

  if (category === 'civilian') {
    return (
      <svg
        viewBox="0 0 240 110"
        className="w-48 h-24 sm:w-64 sm:h-28 drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)]"
        aria-hidden="true"
      >
        {/* Tail stabilizer */}
        <path d="M24 22 L48 22 L66 52 L34 52 Z" fill={accentHex} />
        {/* Fuselage */}
        <path
          d="M28 50 L182 46 C206 46, 224 54, 228 62 C222 68, 202 72, 178 72 L36 68 C26 67, 22 58, 28 50 Z"
          fill={swatchHex}
        />
        {/* Cheatline stripe */}
        <path d="M32 61 L218 60 L212 65 L34 65 Z" fill={accentHex} />
        {/* Cockpit windshield */}
        <path d="M192 50 L211 53 L206 58 L190 57 Z" fill="#0F172A" />
        {/* Passenger windows */}
        {[82, 94, 106, 118, 130, 142, 154, 166, 178].map((wx) => (
          <rect key={wx} x={wx} y="53" width="6" height="4.5" rx="1.5" fill="#38BDF8" />
        ))}
        {/* Swept main wing & turbofan */}
        <path d="M106 64 L154 64 L118 86 L92 86 Z" fill="#CBD5E1" />
        <ellipse cx="122" cy="79" rx="14" ry="5.5" fill="#475569" />
        <ellipse cx="134" cy="79" rx="3" ry="5" fill={accentHex} />
      </svg>
    );
  }

  if (category === 'uav') {
    return (
      <svg
        viewBox="0 0 250 110"
        className="w-52 h-24 sm:w-64 sm:h-28 drop-shadow-[0_14px_24px_rgba(0,0,0,0.5)]"
        aria-hidden="true"
      >
        {/* Spinning rear pusher prop */}
        <motion.rect
          x="32"
          y="42"
          width="5"
          height="32"
          rx="2.5"
          fill="#E2E8F0"
          animate={{ scaleY: [1, 0.25, 1], opacity: [0.95, 0.5, 0.95] }}
          transition={{ duration: 0.12, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '34px 58px' }}
        />
        {/* V-Tail */}
        <path d="M36 54 L58 30 L72 30 L56 54 Z" fill={accentHex} />
        {/* Slender UAV fuselage + bulbous SATCOM dome */}
        <path
          d="M36 54 L168 48 C184 36, 212 38, 228 56 C220 66, 198 68, 170 66 L36 62 Z"
          fill={swatchHex}
        />
        {/* Under-chin targeting sensor */}
        <circle cx="196" cy="68" r="6" fill="#0F172A" />
        <circle cx="199" cy="68" r="2.5" fill="#38BDF8" />
        {/* High-aspect swept wing + underwing pod */}
        <path d="M98 58 L142 58 L108 92 L88 90 Z" fill={swatchHex} stroke={accentHex} strokeWidth="1.5" />
        <rect x="114" y="69" width="28" height="4.5" rx="2" fill="#0F172A" />
      </svg>
    );
  }

  if (category === 'bomber') {
    return (
      <svg
        viewBox="0 0 260 115"
        className="w-56 h-24 sm:w-72 sm:h-28 drop-shadow-[0_16px_28px_rgba(0,0,0,0.58)]"
        aria-hidden="true"
      >
        {/* Stealth heat exhaust trail */}
        <motion.path
          d="M66 56 L18 60 L66 64 Z"
          fill="#FB923C"
          animate={{ scaleX: [0.8, 1.25, 0.9], opacity: [0.75, 1, 0.7] }}
          transition={{ duration: 0.18, repeat: Infinity }}
          style={{ transformOrigin: '66px 60px' }}
        />
        {/* Iconic flying-wing B-2 / strategic bomber profile */}
        <path
          d="M32 60 L122 34 L240 58 L146 72 L112 88 L64 70 Z"
          fill={swatchHex}
          stroke={accentHex}
          strokeWidth="2"
        />
        {/* Blended dorsal cockpit dome */}
        <path d="M138 42 C164 38, 194 44, 212 54 L142 54 Z" fill={accentHex} fillOpacity="0.4" />
        <path d="M174 44 L200 49 L194 54 L172 52 Z" fill="#38BDF8" />
      </svg>
    );
  }

  if (category === 'fighter') {
    return (
      <svg
        viewBox="0 0 250 110"
        className="w-52 h-24 sm:w-64 sm:h-28 drop-shadow-[0_14px_26px_rgba(0,0,0,0.5)]"
        aria-hidden="true"
      >
        {/* Pulsing afterburner flame */}
        <motion.path
          d="M44 52 L6 59 L44 66 Z"
          fill="#FF6B00"
          animate={{ scaleX: [0.85, 1.3, 0.95], opacity: [0.85, 1, 0.8] }}
          transition={{ duration: 0.16, repeat: Infinity }}
          style={{ transformOrigin: '44px 59px' }}
        />
        <motion.path
          d="M44 55 L18 59 L44 63 Z"
          fill="#FEF08A"
          animate={{ scaleX: [0.9, 1.25, 0.9] }}
          transition={{ duration: 0.12, repeat: Infinity }}
          style={{ transformOrigin: '44px 59px' }}
        />
        {/* Vertical stabilizer */}
        <path d="M46 28 L66 28 L88 50 L54 50 Z" fill={accentHex} />
        {/* Main sleek fuselage */}
        <path
          d="M44 50 L152 46 L236 59 L154 69 L44 67 Z"
          fill={swatchHex}
        />
        {/* Accent tactical nose & wing stripe */}
        <path d="M186 51 L236 59 L186 65 Z" fill={accentHex} />
        {/* Bubble canopy */}
        <path
          d="M138 47 C154 37, 178 39, 192 50 L138 50 Z"
          fill="#38BDF8"
          fillOpacity="0.92"
        />
        {/* Delta wing */}
        <path d="M74 62 L162 62 L116 86 L62 82 Z" fill={swatchHex} stroke={accentHex} strokeWidth="2" />
      </svg>
    );
  }

  // spacecraft
  return (
    <svg
      viewBox="0 0 250 120"
      className="w-52 h-24 sm:w-64 sm:h-28 drop-shadow-[0_14px_28px_rgba(14,165,233,0.45)]"
      aria-hidden="true"
    >
      {/* Ion plasma plume */}
      <motion.path
        d="M52 54 L4 64 L52 74 Z"
        fill="#22D3EE"
        animate={{ scaleX: [0.85, 1.35, 0.9], opacity: [0.8, 1, 0.78] }}
        transition={{ duration: 0.18, repeat: Infinity }}
        style={{ transformOrigin: '52px 64px' }}
      />
      <motion.path
        d="M52 59 L20 64 L52 69 Z"
        fill="#F8FAFC"
        animate={{ scaleX: [0.9, 1.2, 0.9] }}
        transition={{ duration: 0.14, repeat: Infinity }}
        style={{ transformOrigin: '52px 64px' }}
      />
      {/* Quantum warp ring halo */}
      <motion.ellipse
        cx="116"
        cy="64"
        rx="20"
        ry="42"
        fill="none"
        stroke={accentHex}
        strokeWidth="3.5"
        strokeDasharray="10 6"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '116px 64px' }}
      />
      {/* Upper tail fin */}
      <path d="M58 26 L84 26 L108 50 L68 50 Z" fill={swatchHex} />
      {/* Hull */}
      <path
        d="M54 50 L166 44 C198 44, 224 54, 236 64 C224 74, 198 80, 164 80 L54 76 Z"
        fill={swatchHex}
      />
      {/* Heat-shield underbelly */}
      <path d="M60 72 L222 68 C210 76, 188 80, 162 80 L58 76 Z" fill="#0F172A" />
      {/* Energy accent band */}
      <path d="M138 46 L154 45 L154 78 L138 78 Z" fill={accentHex} />
      {/* Orbital viewport */}
      <path d="M174 51 L202 55 L198 63 L172 62 Z" fill="#38BDF8" />
      {/* Swept delta wing */}
      <path d="M88 68 L168 68 L128 96 L74 90 Z" fill={swatchHex} stroke={accentHex} strokeWidth="2" />
    </svg>
  );
}

export function AircraftPurchaseAnimation({
  purchaseEvent,
  onComplete,
}: AircraftPurchaseAnimationProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!purchaseEvent) return;
    const timeoutMs = prefersReducedMotion ? 2200 : 2800;
    const timer = window.setTimeout(onComplete, timeoutMs);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [purchaseEvent, onComplete, prefersReducedMotion]);

  const item = purchaseEvent?.item;
  const category: AircraftCategory = item?.aircraftCategory ?? 'civilian';
  const profile = FLIGHT_PROFILES[category];
  const rarityMeta = item ? PILOT_GEAR_RARITY_META[item.rarity] : null;

  return (
    <AnimatePresence>
      {purchaseEvent && item && (
        <motion.div
          key={purchaseEvent.key}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center"
        >
          {/* Subtle contrast vignette (compositor-only, no backdrop-filter over WebGL) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.42, 0.32, 0] }}
            transition={{ duration: prefersReducedMotion ? 2.1 : 2.7, times: [0, 0.16, 0.78, 1] }}
            className="absolute inset-0 bg-gradient-to-tr from-[#06101E] via-[#0B1E38]/75 to-[#06101E]/60"
          />

          {!prefersReducedMotion && (
            <>
              {/* High-speed contrail & slipstream ribbons sweeping across the viewport */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${profile.trailAngle}deg)` }}
              >
                <motion.div
                  initial={{ x: '-110vw', opacity: 0, scaleX: 0.4 }}
                  animate={{ x: ['-110vw', '10vw', '120vw'], opacity: [0, 0.85, 0], scaleX: [0.5, 1.2, 0.6] }}
                  transition={{ duration: profile.duration * 0.92, ease: [0.16, 1, 0.3, 1] }}
                  className="w-[75vw] h-1.5 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${item.accentHex} 55%, #FFFFFF 100%)`,
                  }}
                />
                <motion.div
                  initial={{ x: '-120vw', opacity: 0 }}
                  animate={{ x: ['-120vw', '5vw', '115vw'], opacity: [0, 0.5, 0] }}
                  transition={{
                    duration: profile.duration * 0.96,
                    delay: 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute translate-y-4 w-[65vw] h-0.5 rounded-full bg-gradient-to-r from-transparent via-sky-300 to-white"
                />
                <motion.div
                  initial={{ x: '-115vw', opacity: 0 }}
                  animate={{ x: ['-115vw', '14vw', '125vw'], opacity: [0, 0.45, 0] }}
                  transition={{
                    duration: profile.duration * 0.9,
                    delay: 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute -translate-y-4 w-[58vw] h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/80 to-white"
                />
              </div>

              {/* Supersonic / Launch shockwave ring at center */}
              <motion.div
                initial={{ scale: 0.25, opacity: 0 }}
                animate={{ scale: [0.25, 2.3], opacity: [0, 0.75, 0] }}
                transition={{ duration: 0.85, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="absolute w-44 h-44 rounded-full border-2"
                style={{ borderColor: item.accentHex }}
              />

              {/* Celebratory starlight / spark particles */}
              {SPARK_OFFSETS.map((spark, idx) => (
                <motion.span
                  key={idx}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: spark.x,
                    y: spark.y,
                    scale: [0, 1.15, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.9,
                    delay: spark.delay,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute rounded-full"
                  style={{
                    width: spark.size,
                    height: spark.size,
                    backgroundColor: idx % 2 === 0 ? item.accentHex : '#F8FAFC',
                  }}
                />
              ))}

              {/* Main flying aircraft sweeping across the screen */}
              <div className="absolute inset-0 flex items-center">
                <motion.div
                  initial={{
                    x: profile.x[0],
                    y: profile.y[0],
                    rotate: profile.rotate[0],
                    scale: profile.scale[0],
                    opacity: 0,
                  }}
                  animate={{
                    x: profile.x,
                    y: profile.y,
                    rotate: profile.rotate,
                    scale: profile.scale,
                    opacity: [0, 1, 1, 0.95],
                  }}
                  transition={{
                    duration: profile.duration,
                    times: profile.times,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="will-change-transform"
                >
                  <AircraftVectorSilhouette
                    category={category}
                    swatchHex={item.swatchHex}
                    accentHex={item.accentHex}
                  />
                </motion.div>
              </div>
            </>
          )}

          {/* Bottom-center acquisition confirmation banner (interactive dismiss) */}
          <motion.div
            initial={{ y: prefersReducedMotion ? 0 : 40, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: prefersReducedMotion ? 0 : 24, opacity: 0, scale: 0.96 }}
            transition={{
              type: 'spring',
              stiffness: 340,
              damping: 26,
              delay: prefersReducedMotion ? 0 : 0.22,
            }}
            className="pointer-events-auto absolute bottom-8 sm:bottom-12 left-4 right-4 sm:left-auto sm:right-auto sm:w-full sm:max-w-md rounded-2xl bg-[#0B1728]/95 border border-slate-700/90 shadow-2xl px-5 py-4 text-white"
          >
            <div className="flex items-start gap-3.5">
              <div
                className="w-12 h-12 rounded-xl shrink-0 border border-white/15 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${item.swatchHex} 0%, ${item.swatchHex} 55%, ${item.accentHex} 55%, ${item.accentHex} 100%)`,
                }}
              >
                <CheckCircle2 className="w-6 h-6 text-white drop-shadow" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <span>Đã bàn giao vào Hangar 3D</span>
                  <span className="text-slate-500" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-sky-300">{AIRCRAFT_CATEGORY_LABELS[category]}</span>
                </div>

                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug truncate">
                  {item.nameVi}
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 tabular-nums">
                  {rarityMeta && <span>{rarityMeta.labelVi}</span>}
                  {item.specVi && (
                    <>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#FF8524] font-semibold truncate">{item.specVi}</span>
                    </>
                  )}
                </div>

                <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-sky-300 tabular-nums">
                  <Gem className="w-3.5 h-3.5 text-sky-400" />
                  <span>Đã đổi {item.priceGems.toLocaleString('vi-VN')} Ngọc</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onComplete}
                aria-label="Đóng thông báo mua máy bay"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
