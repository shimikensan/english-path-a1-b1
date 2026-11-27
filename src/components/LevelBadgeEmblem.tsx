import { useId } from 'react';
import { Award, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import {
  type LevelBadgeDefinition,
  type LevelBadgeProgressItem,
} from '../data/levelBadges';
import { dispatchLevelUpCelebration, getNextCefrLevel } from '../utils/levelCelebration';

interface LevelBadgeEmblemProps {
  badge: LevelBadgeDefinition;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  locked?: boolean;
  className?: string;
}

const SIZE_PX: Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 22,
  sm: 30,
  md: 44,
  lg: 68,
};

/**
 * Custom heraldic aviation shield & pilot wings SVG medallion for CEFR A1–C1 level badges.
 * Distinct silhouette features scale with rank:
 *  - A1: Pioneer Wing & Single Star
 *  - A2: Twin Aviation Wings & Dual Stars
 *  - B1: Captain Triple Chevron & Three Stars
 *  - B2: Stratosphere Winged Crest & Four Stars
 *  - C1: Crowned Commander Crest & Five Stars
 */
export function LevelBadgeEmblem({
  badge,
  size = 'md',
  locked = false,
  className = '',
}: LevelBadgeEmblemProps) {
  const uid = useId().replace(/:/g, '');
  const px = SIZE_PX[size];

  const primary = locked ? '#64748B' : badge.palette.primary;
  const secondary = locked ? '#94A3B8' : badge.palette.secondary;
  const highlight = locked ? '#CBD5E1' : badge.palette.highlight;
  const darkBg = locked ? '#1E293B' : badge.palette.darkBg;
  const rim = locked ? '#94A3B8' : badge.palette.rim;

  // Star x-coordinates centered along top arc inside shield
  const starCount = badge.stars;
  const starSpacing = starCount >= 5 ? 8.2 : starCount === 4 ? 9.5 : 11;
  const starStartX = 48 - ((starCount - 1) * starSpacing) / 2;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={locked ? `${badge.titleVi} (chưa đạt)` : `Huy hiệu ${badge.titleVi}`}
      className={`shrink-0 select-none ${locked ? 'opacity-55 grayscale' : ''} ${className}`}
    >
      <defs>
        <linearGradient id={`shield-bg-${uid}`} x1="16" y1="8" x2="80" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={secondary} />
          <stop offset="48%" stopColor={primary} />
          <stop offset="100%" stopColor={darkBg} />
        </linearGradient>
        <linearGradient id={`rim-${uid}`} x1="12" y1="6" x2="84" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="50%" stopColor={rim} />
          <stop offset="100%" stopColor={primary} />
        </linearGradient>
        <linearGradient id={`wing-${uid}`} x1="6" y1="30" x2="90" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="55%" stopColor={secondary} />
          <stop offset="100%" stopColor={primary} />
        </linearGradient>
        <linearGradient id={`sheen-${uid}`} x1="20" y1="12" x2="72" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Pilot Wings Flanking Crest */}
      <g opacity={locked ? 0.55 : 0.95}>
        {/* Left Wing */}
        <path
          d="M24 38 L5 31 L9 39 L22 43 Z"
          fill={`url(#wing-${uid})`}
          stroke={darkBg}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M23 45 L8 42 L13 49 L24 51 Z"
          fill={`url(#wing-${uid})`}
          stroke={darkBg}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {badge.stars >= 2 && (
          <path
            d="M24 52 L13 52 L17 58 L26 57 Z"
            fill={rim}
            stroke={darkBg}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        )}

        {/* Right Wing */}
        <path
          d="M72 38 L91 31 L87 39 L74 43 Z"
          fill={`url(#wing-${uid})`}
          stroke={darkBg}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M73 45 L88 42 L83 49 L72 51 Z"
          fill={`url(#wing-${uid})`}
          stroke={darkBg}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {badge.stars >= 2 && (
          <path
            d="M72 52 L83 52 L79 58 L70 57 Z"
            fill={rim}
            stroke={darkBg}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        )}
      </g>

      {/* C1 Imperial Crown Accent */}
      {badge.levelId === 'C1' && (
        <path
          d="M36 17 L40 8 L48 14 L56 8 L60 17 Z"
          fill={highlight}
          stroke={darkBg}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}

      {/* Outer Metallic Shield */}
      <path
        d="M48 12 L75 21 V48 C75 66 63.5 79.5 48 86 C32.5 79.5 21 66 21 48 V21 L48 12 Z"
        fill={`url(#rim-${uid})`}
        stroke={darkBg}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Inner Enamel Shield */}
      <path
        d="M48 17 L70.5 24.6 V47.8 C70.5 63 60.8 74.6 48 80.2 C35.2 74.6 25.5 63 25.5 47.8 V24.6 L48 17 Z"
        fill={`url(#shield-bg-${uid})`}
      />

      {/* Subtle Gloss Sheen */}
      <path
        d="M48 17 L70.5 24.6 V44 C59 42 40 46 25.5 52 V24.6 L48 17 Z"
        fill={`url(#sheen-${uid})`}
      />

      {/* Top Star Arc (1 to 5 stars matching CEFR tier) */}
      <g>
        {Array.from({ length: starCount }).map((_, idx) => {
          const cx = starStartX + idx * starSpacing;
          const distFromCenter = Math.abs(idx - (starCount - 1) / 2);
          const cy = 28.5 + distFromCenter * 1.4;
          const r = starCount >= 5 ? 2.5 : 2.9;
          return (
            <polygon
              key={idx}
              points={`${cx},${cy - r} ${cx + r * 0.32},${cy - r * 0.32} ${cx + r},${cy - r * 0.25} ${cx + r * 0.45},${cy + r * 0.2} ${cx + r * 0.62},${cy + r} ${cx},${cy + r * 0.52} ${cx - r * 0.62},${cy + r} ${cx - r * 0.45},${cy + r * 0.2} ${cx - r},${cy - r * 0.25} ${cx - r * 0.32},${cy - r * 0.32}`}
              fill={highlight}
            />
          );
        })}
      </g>

      {/* Bold CEFR Level Monogram */}
      <text
        x="48"
        y="55"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="24"
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5"
      >
        {badge.levelId}
      </text>

      {/* Aviation Rank Chevron Stripes at Bottom */}
      <g stroke={highlight} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.92">
        <path d="M37 64 L48 69.5 L59 64" />
        {badge.stars >= 3 && <path d="M40 69.5 L48 73.5 L56 69.5" opacity="0.78" />}
      </g>
    </svg>
  );
}

interface LevelBadgeStripProps {
  badges: LevelBadgeDefinition[];
  size?: 'xs' | 'sm';
  showHighestTitle?: boolean;
  emptyLabel?: string;
  className?: string;
}

/**
 * Compact, zero-pill badge strip displaying a learner's earned CEFR crests
 * with clean native tooltips and optional highest-badge title text.
 */
export function LevelBadgeStrip({
  badges,
  size = 'xs',
  showHighestTitle = false,
  emptyLabel,
  className = '',
}: LevelBadgeStripProps) {
  if (badges.length === 0) {
    if (!emptyLabel) return null;
    return (
      <span className={`text-xs text-slate-400 dark:text-slate-500 ${className}`}>
        {emptyLabel}
      </span>
    );
  }

  const highest = badges[badges.length - 1];

  return (
    <div className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <div className="inline-flex items-center -space-x-1 shrink-0">
        {badges.map((b) => (
          <span
            key={b.id}
            title={`${b.titleVi} — ${b.unlockCriteriaVi}`}
            className="inline-flex transition-transform duration-150 hover:scale-115 hover:z-10"
          >
            <LevelBadgeEmblem badge={b} size={size} />
          </span>
        ))}
      </div>
      {showHighestTitle && highest && (
        <span
          title={badges.map((b) => b.titleVi).join(' · ')}
          className={`text-xs font-bold truncate ${highest.palette.textLight} ${highest.palette.textDark}`}
        >
          {highest.titleVi}
        </span>
      )}
    </div>
  );
}

interface LevelBadgeShowcaseProps {
  items: LevelBadgeProgressItem[];
  onStartRoadmap?: () => void;
}

/**
 * Full Profile showcase section displaying all 5 CEFR milestone badges,
 * live completion progress per level, and instant celebration replay for unlocked crests.
 */
export function LevelBadgeShowcase({ items, onStartRoadmap }: LevelBadgeShowcaseProps) {
  const earnedItems = items.filter((i) => i.earned);
  const highestEarned = earnedItems.length > 0 ? earnedItems[earnedItems.length - 1].badge : null;

  return (
    <section
      aria-labelledby="profile-badges-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
            <Award className="w-4 h-4 shrink-0" />
            <span>Huy hiệu chinh phục cấp độ CEFR</span>
          </div>
          <h2
            id="profile-badges-heading"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
          >
            Bộ sưu tập Huy hiệu Phi công
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Hoàn thành 100% bài học của từng cấp độ để mở khóa huy hiệu tương ứng. Huy hiệu bạn đạt được sẽ tự động hiển thị trên hồ sơ cá nhân và Bảng xếp hạng học viên.
          </p>
        </div>

        <div className="sm:text-right shrink-0 tabular-nums space-y-0.5">
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {earnedItems.length}/{items.length}{' '}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              huy hiệu
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {highestEarned ? (
              <>
                Cao nhất:{' '}
                <strong
                  className={`font-bold ${highestEarned.palette.textLight} ${highestEarned.palette.textDark}`}
                >
                  {highestEarned.titleVi}
                </strong>
              </>
            ) : (
              'Hoàn thành chặng A1 để nhận huy hiệu đầu tiên'
            )}
          </div>
        </div>
      </div>

      {/* 5-Badge Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {items.map((item) => {
          const { badge, earned, completedLessons, totalLessons, percent } = item;
          const remaining = Math.max(0, totalLessons - completedLessons);

          return (
            <div
              key={badge.id}
              className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                earned
                  ? 'border-slate-200 dark:border-slate-700/90 bg-slate-50/70 dark:bg-slate-950/60'
                  : 'border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative my-1">
                  <LevelBadgeEmblem badge={badge} size="lg" locked={!earned} />
                  {!earned && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400"
                    >
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <h3
                  className={`mt-2 text-sm font-bold leading-snug ${
                    earned
                      ? `${badge.palette.textLight} ${badge.palette.textDark}`
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {badge.titleVi}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {badge.descriptionVi}
                </p>
              </div>

              {/* Progress / Action Footer */}
              <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800 space-y-2 tabular-nums">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    {completedLessons}/{totalLessons} bài
                  </span>
                  {earned ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã đạt
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {percent}%
                    </span>
                  )}
                </div>

                <div className="h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${earned ? 100 : Math.max(percent > 0 ? 6 : 0, percent)}%`,
                      backgroundColor: earned ? badge.palette.primary : '#94A3B8',
                    }}
                  />
                </div>

                {earned ? (
                  <button
                    type="button"
                    onClick={() =>
                      dispatchLevelUpCelebration({
                        completedLevel: badge.levelId,
                        promotedToLevel: getNextCefrLevel(badge.levelId),
                        totalLessonsInLevel: totalLessons,
                        bonusGems: 0,
                        isReplay: true,
                        triggerKind: 'level_completed',
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/10 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Xem lễ vinh danh
                  </button>
                ) : (
                  <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-1">
                    {totalLessons > 0 ? `Còn ${remaining} bài để mở khóa` : 'Chưa mở chặng'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {earnedItems.length === 0 && onStartRoadmap && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onStartRoadmap}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D94E00] dark:text-[#FF8524] hover:underline cursor-pointer"
          >
            Bắt đầu chinh phục huy hiệu Người tiên phong A1 →
          </button>
        </div>
      )}
    </section>
  );
}
