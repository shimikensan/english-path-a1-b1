import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  CheckCircle2,
  Gem,
  Plane,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { PILOT_RANKS } from '../../data';
import { resolveLeaderboardBadges } from '../../data/levelBadges';
import {
  DEFAULT_EQUIPPED_GEAR,
  PILOT_GEAR_CATALOG,
  PILOT_GEAR_RARITY_META,
  PILOT_GEAR_SLOT_LABELS,
  type EquippedPilotGear,
  type PilotGearSlot,
} from '../../data/pilotGearCatalog';
import type { LeaderboardEntryDoc } from '../../types';
import { LevelBadgeStrip } from '../LevelBadgeEmblem';
import { Pilot3DCanvas, type HangarCameraPresetId } from './Pilot3DCanvas';

export type RankedLeaderboardEntry = LeaderboardEntryDoc & {
  globalRank: number;
  gemsCount: number;
};

interface LeaderboardPilotModalProps {
  entry: RankedLeaderboardEntry | null;
  liveOwnEquipped?: EquippedPilotGear;
  isCurrentUser?: boolean;
  onClose: () => void;
}

const SLOT_ORDER: PilotGearSlot[] = [
  'aircraft',
  'helmet',
  'goggles',
  'suit',
  'scarf',
  'backpack',
  'companion',
];

export function LeaderboardPilotModal({
  entry,
  liveOwnEquipped,
  isCurrentUser = false,
  onClose,
}: LeaderboardPilotModalProps) {
  const [celebrateTrigger, setCelebrateTrigger] = useState(0);
  const [requestedPreset, setRequestedPreset] = useState<HangarCameraPresetId>('full');

  useEffect(() => {
    if (!entry) return;
    setCelebrateTrigger(0);
    setRequestedPreset('full');
  }, [entry?.uid]);

  useEffect(() => {
    if (!entry) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [entry, onClose]);

  const resolvedEquipped = useMemo<EquippedPilotGear>(() => {
    if (isCurrentUser && liveOwnEquipped) {
      return liveOwnEquipped;
    }
    const raw = entry?.pilotEquipped;
    return {
      helmet: raw?.helmet || DEFAULT_EQUIPPED_GEAR.helmet,
      goggles: raw?.goggles || DEFAULT_EQUIPPED_GEAR.goggles,
      suit: raw?.suit || DEFAULT_EQUIPPED_GEAR.suit,
      scarf: raw?.scarf || DEFAULT_EQUIPPED_GEAR.scarf,
      backpack: raw?.backpack || DEFAULT_EQUIPPED_GEAR.backpack,
      companion: raw?.companion || DEFAULT_EQUIPPED_GEAR.companion,
      aircraft: raw?.aircraft || DEFAULT_EQUIPPED_GEAR.aircraft,
    };
  }, [entry?.pilotEquipped, isCurrentUser, liveOwnEquipped]);

  const gearById = useMemo(
    () => new Map(PILOT_GEAR_CATALOG.map((item) => [item.id, item])),
    []
  );

  const equippedRows = useMemo(() => {
    return SLOT_ORDER.map((slot) => {
      const id = resolvedEquipped[slot];
      const item = gearById.get(id);
      return {
        slot,
        slotLabel: PILOT_GEAR_SLOT_LABELS[slot],
        item,
        id,
      };
    });
  }, [resolvedEquipped, gearById]);

  const earnedBadges = useMemo(
    () => (entry ? resolveLeaderboardBadges(entry) : []),
    [entry]
  );

  if (!entry || typeof document === 'undefined') return null;

  const pilotRank = PILOT_RANKS[entry.currentLevel] || PILOT_RANKS.A1;
  const hasAircraft =
    Boolean(resolvedEquipped.aircraft) && resolvedEquipped.aircraft !== 'aircraft_none';
  const hasSyncedCustomGear = Boolean(isCurrentUser || entry.pilotEquipped);

  const modalContent = (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs px-3 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-pilot-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-950/70">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#D94E00] dark:text-[#FF8524] tabular-nums">
                <Trophy className="w-3.5 h-3.5" />
                Hạng #{entry.globalRank}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {pilotRank.rankVi} · CEFR {entry.currentLevel}
              </span>
            </div>
            <h3
              id="leaderboard-pilot-modal-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate mt-0.5"
            >
              Phi công 3D của {entry.displayName}
              {isCurrentUser && (
                <span className="ml-1.5 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
                  (Bạn)
                </span>
              )}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCelebrateTrigger((c) => c + 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vẫy chào</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Đóng cửa sổ Phi công 3D"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Grid: 3D Hangar Canvas + Equipped Gear & Stats */}
        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
          {/* Left: Interactive 3D Pilot Canvas */}
          <div className="lg:col-span-7 p-4 sm:p-5 bg-slate-950/95 flex flex-col gap-2.5 min-h-0">
            <Pilot3DCanvas
              equipped={resolvedEquipped}
              celebrateTrigger={celebrateTrigger}
              requestedPreset={requestedPreset}
              previewBadgeText={null}
              className="h-[320px] sm:h-[380px] lg:h-full lg:min-h-[420px] w-full flex-1"
            />
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>Kéo chuột hoặc vuốt để xoay 360° · Cuộn để phóng to/thu nhỏ</span>
              {hasAircraft && (
                <button
                  type="button"
                  onClick={() =>
                    setRequestedPreset((prev) => (prev === 'aircraft' ? 'full' : 'aircraft'))
                  }
                  className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <Plane className="w-3.5 h-3.5" />
                  <span>{requestedPreset === 'aircraft' ? 'Góc toàn cảnh' : 'Soi máy bay Hangar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Stats + Equipped Gear Breakdown */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col gap-4 min-h-0 lg:overflow-y-auto">
            {/* Key Stats Row */}
            <div className="grid grid-cols-3 gap-2.5 tabular-nums shrink-0">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 sm:p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Hoàn thiện</div>
                <div className="text-lg font-extrabold text-[#D94E00] dark:text-[#FF8524] mt-0.5">
                  {entry.completionPercent}%
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 sm:p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Gem className="w-3 h-3 text-sky-500" />
                  Ngọc
                </div>
                <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
                  {entry.gemsCount.toLocaleString('vi-VN')}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 sm:p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Từ vựng</div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {entry.learnedVocabCount}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Hoàn thành {entry.completedLessons}/{entry.totalLessons} bài học
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                Cấp độ CEFR {entry.currentLevel}
              </span>
            </div>

            {/* Earned CEFR Level Badges */}
            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Huy hiệu cấp độ
                </h4>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                  {earnedBadges.length}/5
                </span>
              </div>
              <LevelBadgeStrip
                badges={earnedBadges}
                size="sm"
                showHighestTitle
                emptyLabel="Chưa mở khóa huy hiệu cấp độ"
              />
            </div>

            {/* Equipped Gear Inventory */}
            <div className="space-y-2 pt-2.5 border-t border-slate-200 dark:border-slate-800 pb-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Trang bị 3D đang mang
                </h4>
                {!hasSyncedCustomGear && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Bộ mặc định
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {equippedRows.map(({ slot, slotLabel, item }) => {
                  const rarityMeta = item
                    ? PILOT_GEAR_RARITY_META[item.rarity]
                    : PILOT_GEAR_RARITY_META.starter;
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/15 dark:border-white/20"
                          style={{ backgroundColor: item?.swatchHex ?? '#64748B' }}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            {slotLabel}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item?.nameVi ?? 'Chưa trang bị'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-bold shrink-0 ${rarityMeta.textClass}`}
                      >
                        {rarityMeta.labelVi}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
