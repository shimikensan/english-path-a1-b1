import { forwardRef, useId } from 'react';
import { Dices, Download, Sparkles } from 'lucide-react';
import type {
  ToeicGroupBadge,
  ToeicGroupBadgeFrame,
  ToeicGroupBadgeIcon,
  ToeicGroupBadgePaletteId,
  ToeicGroupBadgePattern,
  ToeicGroupBadgeShape,
} from '../types';

export interface BadgePaletteDef {
  id: ToeicGroupBadgePaletteId;
  labelVi: string;
  bgStart: string;
  bgEnd: string;
  rim: string;
  rimHighlight: string;
  ribbonBg: string;
  ribbonText: string;
  iconFill: string;
}

export const BADGE_PALETTES: BadgePaletteDef[] = [
  {
    id: 'pilot_orange',
    labelVi: 'Cam Phi Công',
    bgStart: '#10243E',
    bgEnd: '#07111F',
    rim: '#FF6B00',
    rimHighlight: '#FFB347',
    ribbonBg: '#FF6B00',
    ribbonText: '#FFFFFF',
    iconFill: '#FFF5EB',
  },
  {
    id: 'navy_gold',
    labelVi: 'Hải Quân Hoàng Kim',
    bgStart: '#162C52',
    bgEnd: '#09152B',
    rim: '#EAB308',
    rimHighlight: '#FEF08A',
    ribbonBg: '#CA8A04',
    ribbonText: '#FFFBEB',
    iconFill: '#FEF3C7',
  },
  {
    id: 'emerald_ace',
    labelVi: 'Ngọc Lục Bảo',
    bgStart: '#064E3B',
    bgEnd: '#022C22',
    rim: '#10B981',
    rimHighlight: '#6EE7B7',
    ribbonBg: '#059669',
    ribbonText: '#ECFDF5',
    iconFill: '#D1FAE5',
  },
  {
    id: 'royal_violet',
    labelVi: 'Tím Hoàng Gia',
    bgStart: '#3B1D6E',
    bgEnd: '#1E103C',
    rim: '#A855F7',
    rimHighlight: '#E9D5FF',
    ribbonBg: '#7C3AED',
    ribbonText: '#FAF5FF',
    iconFill: '#F3E8FF',
  },
  {
    id: 'crimson_jet',
    labelVi: 'Đỏ Tiêm Kích',
    bgStart: '#7F1D1D',
    bgEnd: '#3B0A0A',
    rim: '#F97316',
    rimHighlight: '#FDBA74',
    ribbonBg: '#DC2626',
    ribbonText: '#FEF2F2',
    iconFill: '#FEE2E2',
  },
  {
    id: 'arctic_cyan',
    labelVi: 'Xanh Bầu Trời',
    bgStart: '#0C4A6E',
    bgEnd: '#082F49',
    rim: '#38BDF8',
    rimHighlight: '#BAE6FD',
    ribbonBg: '#0284C7',
    ribbonText: '#F0F9FF',
    iconFill: '#E0F2FE',
  },
  {
    id: 'obsidian_amber',
    labelVi: 'Đen Vàng Đẳng Cấp',
    bgStart: '#1E293B',
    bgEnd: '#090D16',
    rim: '#F59E0B',
    rimHighlight: '#FDE68A',
    ribbonBg: '#D97706',
    ribbonText: '#FFFBEB',
    iconFill: '#FEF3C7',
  },
  {
    id: 'rose_squad',
    labelVi: 'Hồng Ruby',
    bgStart: '#881337',
    bgEnd: '#4C0519',
    rim: '#FB7185',
    rimHighlight: '#FECDD3',
    ribbonBg: '#E11D48',
    ribbonText: '#FFF1F2',
    iconFill: '#FFE4E6',
  },
];

export const BADGE_SHAPES: { id: ToeicGroupBadgeShape; labelVi: string }[] = [
  { id: 'shield', labelVi: 'Khiên' },
  { id: 'hexagon', labelVi: 'Lục giác' },
  { id: 'wings', labelVi: 'Cánh bay' },
  { id: 'crest', labelVi: 'Gia huy' },
  { id: 'diamond', labelVi: 'Kim cương' },
  { id: 'circle', labelVi: 'Huy chương' },
];

export const BADGE_ICONS: { id: ToeicGroupBadgeIcon; labelVi: string }[] = [
  { id: 'plane', labelVi: 'Phi cơ' },
  { id: 'crown', labelVi: 'Vương miện' },
  { id: 'trophy', labelVi: 'Cúp vàng' },
  { id: 'bolt', labelVi: 'Tia chớp' },
  { id: 'book', labelVi: 'Học thuật' },
  { id: 'compass', labelVi: 'La bàn' },
  { id: 'star', labelVi: 'Ngôi sao' },
  { id: 'flame', labelVi: 'Ngọn lửa' },
];

export const BADGE_PATTERNS: { id: ToeicGroupBadgePattern; labelVi: string }[] = [
  { id: 'rays', labelVi: 'Hào quang' },
  { id: 'stripes', labelVi: 'Sọc chéo' },
  { id: 'grid', labelVi: 'Lưới radar' },
  { id: 'solid', labelVi: 'Trơn tối giản' },
];

export const BADGE_FRAMES: { id: ToeicGroupBadgeFrame; labelVi: string }[] = [
  { id: 'laurel', labelVi: 'Vòng nguyệt quế' },
  { id: 'wings_trim', labelVi: 'Đôi cánh hàng không' },
  { id: 'double', labelVi: 'Viền kép kim loại' },
  { id: 'classic', labelVi: 'Viền cổ điển' },
];

export interface BadgePreset {
  id: string;
  labelVi: string;
  badge: ToeicGroupBadge;
}

export const BADGE_PRESETS: BadgePreset[] = [
  {
    id: 'squad_pilot',
    labelVi: 'Phi đội 850+',
    badge: {
      shape: 'shield',
      icon: 'plane',
      paletteId: 'pilot_orange',
      pattern: 'rays',
      frame: 'wings_trim',
      monogram: '850+',
      motto: 'Sẵn sàng cất cánh',
    },
  },
  {
    id: 'royal_900',
    labelVi: 'Hoàng gia 900+',
    badge: {
      shape: 'crest',
      icon: 'crown',
      paletteId: 'navy_gold',
      pattern: 'rays',
      frame: 'laurel',
      monogram: '900+',
      motto: 'Chinh phục đỉnh cao',
    },
  },
  {
    id: 'emerald_academy',
    labelVi: 'Học viện TOEIC',
    badge: {
      shape: 'hexagon',
      icon: 'book',
      paletteId: 'emerald_ace',
      pattern: 'grid',
      frame: 'double',
      monogram: 'ACE',
      motto: 'Kỷ luật mỗi ngày',
    },
  },
  {
    id: 'speed_bolt',
    labelVi: 'Tia chớp Part 5',
    badge: {
      shape: 'diamond',
      icon: 'bolt',
      paletteId: 'crimson_jet',
      pattern: 'stripes',
      frame: 'classic',
      monogram: 'P5',
      motto: 'Nhanh & Chính xác',
    },
  },
  {
    id: 'sky_navigator',
    labelVi: 'Hoa tiêu 750+',
    badge: {
      shape: 'circle',
      icon: 'compass',
      paletteId: 'arctic_cyan',
      pattern: 'grid',
      frame: 'laurel',
      monogram: '750+',
      motto: 'Đúng hướng mỗi ngày',
    },
  },
  {
    id: 'obsidian_elite',
    labelVi: 'Tinh anh Biệt đội',
    badge: {
      shape: 'wings',
      icon: 'trophy',
      paletteId: 'obsidian_amber',
      pattern: 'stripes',
      frame: 'double',
      monogram: 'TOP1',
      motto: 'Không bỏ cuộc',
    },
  },
];

export function deriveGroupMonogram(groupName?: string, targetScore?: number): string {
  if (targetScore && targetScore >= 450) {
    return `${targetScore}`;
  }
  const clean = (groupName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  if (!clean) return 'TOE';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }
  return words[0].slice(0, 3).toUpperCase();
}

export function getDefaultToeicGroupBadge(
  groupName?: string,
  targetScore?: number
): ToeicGroupBadge {
  const score = targetScore ?? 750;
  const paletteId: ToeicGroupBadgePaletteId =
    score >= 900
      ? 'navy_gold'
      : score >= 850
        ? 'obsidian_amber'
        : score >= 750
          ? 'pilot_orange'
          : score >= 650
            ? 'arctic_cyan'
            : 'emerald_ace';

  const icon: ToeicGroupBadgeIcon =
    score >= 900 ? 'crown' : score >= 850 ? 'trophy' : score >= 750 ? 'plane' : 'compass';

  return {
    shape: 'shield',
    icon,
    paletteId,
    pattern: 'rays',
    frame: 'laurel',
    monogram: deriveGroupMonogram(groupName, targetScore),
    motto: '',
  };
}

export function resolveToeicGroupBadge(
  badge?: ToeicGroupBadge | null,
  groupName?: string,
  targetScore?: number
): ToeicGroupBadge {
  if (!badge) return getDefaultToeicGroupBadge(groupName, targetScore);
  return {
    shape: badge.shape || 'shield',
    icon: badge.icon || 'plane',
    paletteId: badge.paletteId || 'pilot_orange',
    pattern: badge.pattern || 'rays',
    frame: badge.frame || 'laurel',
    monogram: badge.monogram ?? '',
    motto: badge.motto ?? '',
  };
}

function getShapePath(shape: ToeicGroupBadgeShape): string {
  switch (shape) {
    case 'hexagon':
      return 'M60 10 L102 34 L102 82 L60 106 L18 82 L18 34 Z';
    case 'wings':
      return 'M60 12 L94 24 L105 44 L96 62 L88 86 L60 106 L32 86 L24 62 L15 44 L26 24 Z';
    case 'crest':
      return 'M22 18 Q60 8 98 18 L96 60 Q95 92 60 108 Q25 92 24 60 Z';
    case 'diamond':
      return 'M60 8 L104 58 L60 108 L16 58 Z';
    case 'circle':
      return 'M60 12 A46 46 0 1 1 59.99 12 Z';
    case 'shield':
    default:
      return 'M60 10 L98 24 L94 64 C92 84 78 97 60 108 C42 97 28 84 26 64 L22 24 Z';
  }
}

function getInnerShapePath(shape: ToeicGroupBadgeShape): string {
  switch (shape) {
    case 'hexagon':
      return 'M60 17 L95 37 L95 79 L60 99 L25 79 L25 37 Z';
    case 'wings':
      return 'M60 18 L89 29 L98 45 L90 60 L83 82 L60 99 L37 82 L30 60 L22 45 L31 29 Z';
    case 'crest':
      return 'M28 23 Q60 15 92 23 L90 59 Q89 86 60 101 Q31 86 30 59 Z';
    case 'diamond':
      return 'M60 16 L96 58 L60 100 L24 58 Z';
    case 'circle':
      return 'M60 18 A40 40 0 1 1 59.99 18 Z';
    case 'shield':
    default:
      return 'M60 16 L91 28 L88 63 C86 80 74 91 60 100 C46 91 34 80 32 63 L29 28 Z';
  }
}

function renderCenterIcon(icon: ToeicGroupBadgeIcon, fill: string, accent: string) {
  switch (icon) {
    case 'crown':
      return (
        <g transform="translate(60 51)">
          <path
            d="M-19 10 L-22 -10 L-9 0 L0 -15 L9 0 L22 -10 L19 10 Z"
            fill={fill}
            stroke={accent}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect x="-18" y="12" width="36" height="4.5" rx="2" fill={accent} />
          <circle cx="0" cy="-17" r="2.6" fill={accent} />
          <circle cx="-22" cy="-12" r="2.2" fill={accent} />
          <circle cx="22" cy="-12" r="2.2" fill={accent} />
        </g>
      );
    case 'trophy':
      return (
        <g transform="translate(60 51)">
          <path
            d="M-14 -14 H14 V-2 C14 7 8 13 0 13 C-8 13 -14 7 -14 -2 Z"
            fill={fill}
            stroke={accent}
            strokeWidth="1.5"
          />
          <path
            d="M-14 -11 H-21 C-21 -1 -17 4 -12 4 M14 -11 H21 C21 -1 17 4 12 4"
            fill="none"
            stroke={accent}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <rect x="-3.5" y="12" width="7" height="6" fill={accent} />
          <rect x="-11" y="17" width="22" height="4" rx="2" fill={fill} />
        </g>
      );
    case 'bolt':
      return (
        <g transform="translate(60 52)">
          <path
            d="M4 -20 L-15 3 H-2 L-6 20 L15 -4 H2 Z"
            fill={fill}
            stroke={accent}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'book':
      return (
        <g transform="translate(60 52)">
          <path
            d="M-21 -12 C-13 -15 -5 -13 0 -8 C5 -13 13 -15 21 -12 V13 C13 10 5 12 0 16 C-5 12 -13 10 -21 13 Z"
            fill={fill}
            stroke={accent}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <line x1="0" y1="-8" x2="0" y2="16" stroke={accent} strokeWidth="1.8" />
          <line x1="-15" y1="-4" x2="-5" y2="-2" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="-15" y1="3" x2="-5" y2="5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="15" y1="-4" x2="5" y2="-2" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="15" y1="3" x2="5" y2="5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case 'compass':
      return (
        <g transform="translate(60 52)">
          <circle cx="0" cy="0" r="18" fill="none" stroke={accent} strokeWidth="2.2" />
          <circle cx="0" cy="0" r="14" fill="none" stroke={fill} strokeWidth="0.9" strokeOpacity="0.45" />
          <polygon points="0,-14 5,0 0,3 -5,0" fill={accent} />
          <polygon points="0,14 5,0 0,-3 -5,0" fill={fill} />
          <circle cx="0" cy="0" r="2.6" fill="#0F172A" />
        </g>
      );
    case 'star':
      return (
        <g transform="translate(60 52)">
          <polygon
            points="0,-20 5.8,-6.5 20,-5.5 9.2,4 12.4,18 0,10.5 -12.4,18 -9.2,4 -20,-5.5 -5.8,-6.5"
            fill={fill}
            stroke={accent}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'flame':
      return (
        <g transform="translate(60 52)">
          <path
            d="M0 -20 C9 -11 16 -3 14 7 C12 15 6 19 0 19 C-8 19 -15 13 -14 4 C-13 -3 -8 -7 -6 -11 C-5 -6 -2 -5 0 -9 C1 -13 0 -17 0 -20 Z"
            fill={fill}
            stroke={accent}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M0 1 C4 5 6 9 4 13 C2.8 15 1.2 16 0 16 C-3 16 -5.5 13.5 -5 10 C-4.6 7 -2.4 4.5 0 1 Z"
            fill={accent}
          />
        </g>
      );
    case 'plane':
    default:
      return (
        <g transform="translate(60 51)">
          <path
            d="M0 -20 L4.5 -5 L21 4 L21 9 L4.5 4.5 L4 14 L10 18 L10 21 L0 18.5 L-10 21 L-10 18 L-4 14 L-4.5 4.5 L-21 9 L-21 4 L-4.5 -5 Z"
            fill={fill}
            stroke={accent}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </g>
      );
  }
}

export interface ToeicGroupBadgeEmblemProps {
  badge?: ToeicGroupBadge | null;
  groupName?: string;
  targetScore?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_PX: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 44,
  md: 60,
  lg: 84,
  xl: 136,
};

export const ToeicGroupBadgeEmblem = forwardRef<SVGSVGElement, ToeicGroupBadgeEmblemProps>(
  function ToeicGroupBadgeEmblem(
    { badge, groupName, targetScore, size = 'md', className = '' },
    ref
  ) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const resolved = resolveToeicGroupBadge(badge, groupName, targetScore);
    const palette =
      BADGE_PALETTES.find((p) => p.id === resolved.paletteId) ?? BADGE_PALETTES[0];
    const px = SIZE_PX[size];
    const shapePath = getShapePath(resolved.shape);
    const innerShapePath = getInnerShapePath(resolved.shape);
    const displayMonogram =
      resolved.monogram.trim() || deriveGroupMonogram(groupName, targetScore);

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        width={px}
        height={px}
        role="img"
        aria-label={`Huy hiệu nhóm ${groupName || 'TOEIC'}`}
        className={`shrink-0 select-none drop-shadow-[0_6px_14px_rgba(7,17,31,0.28)] ${className}`}
      >
        <defs>
          <linearGradient id={`bg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.bgStart} />
            <stop offset="100%" stopColor={palette.bgEnd} />
          </linearGradient>
          <linearGradient id={`rim_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.rimHighlight} />
            <stop offset="50%" stopColor={palette.rim} />
            <stop offset="100%" stopColor={palette.rimHighlight} />
          </linearGradient>
          <linearGradient id={`gloss_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </linearGradient>
          <clipPath id={`clip_${uid}`}>
            <path d={shapePath} />
          </clipPath>
        </defs>

        {/* Outer Ornament Frame: Aviation Wings Trim */}
        {resolved.frame === 'wings_trim' && (
          <g fill={`url(#rim_${uid})`} opacity="0.92">
            <path d="M22 44 L4 35 L11 47 L6 54 L20 56 Z" />
            <path d="M98 44 L116 35 L109 47 L114 54 L100 56 Z" />
            <path d="M24 61 L9 59 L14 68 L26 69 Z" opacity="0.75" />
            <path d="M96 61 L111 59 L106 68 L94 69 Z" opacity="0.75" />
          </g>
        )}

        {/* Outer Ornament Frame: Laurel Wreath */}
        {resolved.frame === 'laurel' && (
          <g fill="none" stroke={`url(#rim_${uid})`} strokeWidth="2.4" strokeLinecap="round">
            <path d="M24 92 C9 76 8 47 21 28" />
            <path d="M96 92 C111 76 112 47 99 28" />
            <g fill={palette.rimHighlight} stroke="none">
              <ellipse cx="14" cy="40" rx="2.5" ry="5" transform="rotate(-32 14 40)" />
              <ellipse cx="11" cy="54" rx="2.5" ry="5" transform="rotate(-14 11 54)" />
              <ellipse cx="12" cy="68" rx="2.5" ry="5" transform="rotate(8 12 68)" />
              <ellipse cx="17" cy="81" rx="2.5" ry="5" transform="rotate(28 17 81)" />
              <ellipse cx="106" cy="40" rx="2.5" ry="5" transform="rotate(32 106 40)" />
              <ellipse cx="109" cy="54" rx="2.5" ry="5" transform="rotate(14 109 54)" />
              <ellipse cx="108" cy="68" rx="2.5" ry="5" transform="rotate(-8 108 68)" />
              <ellipse cx="103" cy="81" rx="2.5" ry="5" transform="rotate(-28 103 81)" />
            </g>
          </g>
        )}

        {/* Main Emblem Body */}
        <path
          d={shapePath}
          fill={`url(#bg_${uid})`}
          stroke={`url(#rim_${uid})`}
          strokeWidth={resolved.frame === 'double' ? '4.5' : '3.5'}
          strokeLinejoin="round"
        />

        {/* Clipped Inner Pattern & Gloss */}
        <g clipPath={`url(#clip_${uid})`}>
          {resolved.pattern === 'rays' && (
            <g fill={palette.rimHighlight} fillOpacity="0.11">
              <polygon points="60,54 34,6 48,6" />
              <polygon points="60,54 72,6 86,6" />
              <polygon points="60,54 114,30 114,44" />
              <polygon points="60,54 114,72 114,86" />
              <polygon points="60,54 6,30 6,44" />
              <polygon points="60,54 6,72 6,86" />
            </g>
          )}
          {resolved.pattern === 'stripes' && (
            <g stroke={palette.rimHighlight} strokeOpacity="0.14" strokeWidth="7">
              <line x1="6" y1="30" x2="54" y2="-12" />
              <line x1="6" y1="54" x2="78" y2="-12" />
              <line x1="6" y1="78" x2="102" y2="-12" />
              <line x1="12" y1="98" x2="114" y2="4" />
              <line x1="34" y1="112" x2="114" y2="34" />
            </g>
          )}
          {resolved.pattern === 'grid' && (
            <g stroke={palette.rimHighlight} strokeOpacity="0.14" strokeWidth="1">
              <line x1="20" y1="28" x2="100" y2="28" />
              <line x1="20" y1="46" x2="100" y2="46" />
              <line x1="20" y1="64" x2="100" y2="64" />
              <line x1="20" y1="82" x2="100" y2="82" />
              <line x1="36" y1="10" x2="36" y2="110" />
              <line x1="60" y1="10" x2="60" y2="110" />
              <line x1="84" y1="10" x2="84" y2="110" />
            </g>
          )}

          {/* Subtle glossy highlight */}
          <path d={shapePath} fill={`url(#gloss_${uid})`} />
        </g>

        {/* Double Frame Inner Metallic Stroke */}
        {resolved.frame === 'double' && (
          <path
            d={innerShapePath}
            fill="none"
            stroke={palette.rimHighlight}
            strokeOpacity="0.72"
            strokeWidth="1.6"
            strokeDasharray="3 2"
          />
        )}

        {/* Top Accent Star Dot */}
        <circle cx="60" cy="21" r="2.2" fill={palette.rimHighlight} />

        {/* Central Heraldic Icon */}
        {renderCenterIcon(resolved.icon, palette.iconFill, palette.rimHighlight)}

        {/* Lower Monogram Ribbon */}
        {displayMonogram && (
          <g transform="translate(60 90)">
            <path
              d="M-31 -8 L-26 0 L-31 8 H31 L26 0 L31 -8 Z"
              fill={palette.ribbonBg}
              stroke={palette.rimHighlight}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <text
              x="0"
              y="3.8"
              textAnchor="middle"
              fill={palette.ribbonText}
              fontSize={displayMonogram.length >= 4 ? '10.5' : '12'}
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              letterSpacing="0.8"
            >
              {displayMonogram}
            </text>
          </g>
        )}
      </svg>
    );
  }
);

export async function exportBadgeSvgToPng(
  svgElement: SVGSVGElement | null,
  fileName: string
): Promise<boolean> {
  if (!svgElement) return false;
  try {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load SVG'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return false;
    }
    ctx.clearRect(0, 0, 512, 512);
    ctx.drawImage(img, 0, 0, 512, 512);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  }
}

interface ToeicGroupBadgeCustomizerProps {
  value: ToeicGroupBadge;
  onChange: (next: ToeicGroupBadge) => void;
  groupName?: string;
  targetScore?: number;
  previewSvgRef?: React.RefObject<SVGSVGElement | null>;
  onDownloadPng?: () => void;
  compact?: boolean;
}

export function ToeicGroupBadgeCustomizer({
  value,
  onChange,
  groupName,
  targetScore,
  previewSvgRef,
  onDownloadPng,
  compact = false,
}: ToeicGroupBadgeCustomizerProps) {
  const handleRandomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    onChange({
      ...value,
      shape: pick(BADGE_SHAPES).id,
      icon: pick(BADGE_ICONS).id,
      paletteId: pick(BADGE_PALETTES).id,
      pattern: pick(BADGE_PATTERNS).id,
      frame: pick(BADGE_FRAMES).id,
    });
  };

  return (
    <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-12' : 'lg:grid-cols-12'} gap-4 items-start`}>
      {/* Left: Live Emblem Showcase */}
      <div className="lg:col-span-5 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] cockpit-grid p-5 flex flex-col items-center text-center gap-3 text-white">
        <div className="w-full flex items-center justify-between gap-2 text-[11px] font-bold text-[#FF8524]">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Xem trước huy hiệu</span>
          </span>
          <button
            type="button"
            onClick={handleRandomize}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Ngẫu nhiên</span>
          </button>
        </div>

        <div className="py-2">
          <ToeicGroupBadgeEmblem
            ref={previewSvgRef}
            badge={value}
            groupName={groupName || 'Nhóm TOEIC'}
            targetScore={targetScore}
            size="xl"
          />
        </div>

        <div className="space-y-0.5 max-w-full">
          <div className="text-sm font-extrabold text-white truncate">
            {groupName?.trim() || 'Biệt đội chinh phục TOEIC'}
          </div>
          {value.motto.trim() ? (
            <div className="text-xs font-medium text-amber-300/95 truncate">
              &ldquo;{value.motto.trim()}&rdquo;
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">
              Mục tiêu {targetScore ?? 750}+ TOEIC
            </div>
          )}
        </div>

        {onDownloadPng && (
          <button
            type="button"
            onClick={onDownloadPng}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải huy hiệu PNG</span>
          </button>
        )}
      </div>

      {/* Right: Studio Controls */}
      <div className="lg:col-span-7 space-y-3.5">
        {/* Quick Presets */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Mẫu thiết kế chuyên nghiệp
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BADGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...preset.badge,
                    monogram: value.monogram || preset.badge.monogram,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-[#FF6B00] text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {preset.labelVi}
              </button>
            ))}
          </div>
        </div>

        {/* Shape & Icon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hình dáng huy hiệu
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {BADGE_SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ ...value, shape: s.id })}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    value.shape === s.id
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {s.labelVi}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Biểu tượng trung tâm
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {BADGE_ICONS.map((ic) => (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => onChange({ ...value, icon: ic.id })}
                  className={`px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors truncate cursor-pointer ${
                    value.icon === ic.id
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={ic.labelVi}
                >
                  {ic.labelVi}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Palette Swatches */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Bảng màu thương hiệu nhóm
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {BADGE_PALETTES.map((pal) => {
              const active = value.paletteId === pal.id;
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => onChange({ ...value, paletteId: pal.id })}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-[#FF6B00] bg-orange-50/70 dark:bg-orange-950/35'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border-2"
                    style={{
                      backgroundColor: pal.bgStart,
                      borderColor: pal.rim,
                    }}
                  />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    {pal.labelVi}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pattern & Frame */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Họa tiết nền
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BADGE_PATTERNS.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => onChange({ ...value, pattern: pt.id })}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    value.pattern === pt.id
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {pt.labelVi}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Viền trang trí
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BADGE_FRAMES.map((fr) => (
                <button
                  key={fr.id}
                  type="button"
                  onClick={() => onChange({ ...value, frame: fr.id })}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors truncate cursor-pointer ${
                    value.frame === fr.id
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title={fr.labelVi}
                >
                  {fr.labelVi}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Monogram & Motto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Ký hiệu dải ruy-băng (tối đa 4)
            </label>
            <input
              type="text"
              maxLength={4}
              value={value.monogram}
              onChange={(e) =>
                onChange({
                  ...value,
                  monogram: e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9+]/g, '')
                    .slice(0, 4),
                })
              }
              placeholder="850+"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-extrabold uppercase tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Khẩu hiệu / Motto nhóm (tối đa 28 ký tự)
            </label>
            <input
              type="text"
              maxLength={28}
              value={value.motto}
              onChange={(e) => onChange({ ...value, motto: e.target.value.slice(0, 28) })}
              placeholder="Ví dụ: Sẵn sàng cất cánh 850+"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
