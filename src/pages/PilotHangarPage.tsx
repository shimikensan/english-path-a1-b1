import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Gamepad2,
  Gem,
  GraduationCap,
  Lock,
  Plane,
  Rocket,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Timer,
} from 'lucide-react';
import { AircraftPurchaseAnimation } from '../components/pilot3d/AircraftPurchaseAnimation';
import { HangarLofiPlayer } from '../components/pilot3d/HangarLofiPlayer';
import {
  Pilot3DCanvas,
  type HangarCameraPresetId,
} from '../components/pilot3d/Pilot3DCanvas';
import { useApp } from '../context/AppContext';
import {
  AIRCRAFT_CATEGORY_LABELS,
  getLessonGemReward,
  PILOT_AIRCRAFT_CATALOG,
  PILOT_GEAR_CATALOG,
  PILOT_GEAR_RARITY_META,
  PILOT_GEAR_SLOT_LABELS,
  STUDY_TIME_MILESTONES,
  type AircraftCategory,
  type EquippedPilotGear,
  type PilotGearItem,
  type PilotGearSlot,
} from '../data/pilotGearCatalog';
import type { AppRoute } from '../types';
import {
  playAircraftFlyby,
  playCorrectChime,
  playLevelFanfare,
  playTileClick,
} from '../utils/gameSfx';
import { formatAccessDurationVi } from '../utils/helpers';

interface PilotHangarPageProps {
  onOpenLesson: (lessonId: string) => void;
  onNavigate: (route: AppRoute) => void;
}

type ShopSection = 'gear' | 'aircraft';
type AircraftFilter = 'ALL' | AircraftCategory;

const PERSONAL_SLOT_ORDER: Exclude<PilotGearSlot, 'aircraft'>[] = [
  'helmet',
  'goggles',
  'suit',
  'scarf',
  'backpack',
  'companion',
];

const ALL_SLOT_ORDER: PilotGearSlot[] = [...PERSONAL_SLOT_ORDER, 'aircraft'];

const AIRCRAFT_CATEGORY_ORDER: AircraftCategory[] = [
  'helicopter',
  'uav',
  'civilian',
  'fighter',
  'bomber',
  'spacecraft',
];

export function PilotHangarPage({ onOpenLesson, onNavigate }: PilotHangarPageProps) {
  const {
    profile,
    lessons,
    progressMap,
    hangarState,
    gemBreakdown,
    purchasePilotGear,
    equipPilotGear,
  } = useApp();

  const [shopSection, setShopSection] = useState<ShopSection>('gear');
  const [activeSlot, setActiveSlot] = useState<Exclude<PilotGearSlot, 'aircraft'>>('helmet');
  const [aircraftFilter, setAircraftFilter] = useState<AircraftFilter>('ALL');
  const [previewGear, setPreviewGear] = useState<Partial<EquippedPilotGear>>({});
  const [celebrateCounter, setCelebrateCounter] = useState(0);
  const [requestedPreset, setRequestedPreset] = useState<HangarCameraPresetId | undefined>(undefined);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchasedAircraftEvent, setPurchasedAircraftEvent] = useState<{
    item: PilotGearItem;
    key: number;
  } | null>(null);
  const [questLevelFilter, setQuestLevelFilter] = useState<string>('ALL');

  const clearPurchaseAnimation = useCallback(() => {
    setPurchasedAircraftEvent(null);
  }, []);

  const ownedSet = useMemo(() => new Set(hangarState.ownedItemIds), [hangarState.ownedItemIds]);

  const effectiveEquipped = useMemo<EquippedPilotGear>(
    () => ({
      ...hangarState.equipped,
      ...previewGear,
    }),
    [hangarState.equipped, previewGear]
  );

  const previewedUnownedItems = useMemo(() => {
    const list: PilotGearItem[] = [];
    for (const slot of ALL_SLOT_ORDER) {
      const id = previewGear[slot];
      if (!id || ownedSet.has(id)) continue;
      const item = PILOT_GEAR_CATALOG.find((g) => g.id === id);
      if (item) list.push(item);
    }
    return list;
  }, [previewGear, ownedSet]);

  const activePreviewItem = useMemo(() => {
    const targetSlot: PilotGearSlot = shopSection === 'aircraft' ? 'aircraft' : activeSlot;
    const previewId = previewGear[targetSlot];
    if (previewId) {
      const found = PILOT_GEAR_CATALOG.find((g) => g.id === previewId);
      if (found && !ownedSet.has(found.id)) return found;
    }
    return previewedUnownedItems[0] ?? null;
  }, [shopSection, activeSlot, previewGear, ownedSet, previewedUnownedItems]);

  const itemsInSlot = useMemo(
    () => PILOT_GEAR_CATALOG.filter((item) => item.slot === activeSlot),
    [activeSlot]
  );

  const filteredAircrafts = useMemo(() => {
    if (aircraftFilter === 'ALL') return PILOT_AIRCRAFT_CATALOG;
    return PILOT_AIRCRAFT_CATALOG.filter(
      (item) => item.id === 'aircraft_none' || item.aircraftCategory === aircraftFilter
    );
  }, [aircraftFilter]);

  const unlockedGearCount = useMemo(
    () => PILOT_GEAR_CATALOG.filter((item) => item.slot !== 'aircraft' && ownedSet.has(item.id)).length,
    [ownedSet]
  );
  const totalGearCount = useMemo(
    () => PILOT_GEAR_CATALOG.filter((item) => item.slot !== 'aircraft').length,
    []
  );
  const unlockedAircraftCount = useMemo(
    () =>
      PILOT_AIRCRAFT_CATALOG.filter(
        (item) => item.id !== 'aircraft_none' && ownedSet.has(item.id)
      ).length,
    [ownedSet]
  );
  const totalAircraftCount = PILOT_AIRCRAFT_CATALOG.length - 1;

  const handleSwitchShopSection = (section: ShopSection) => {
    playTileClick();
    setShopSection(section);
    if (section === 'aircraft') {
      setRequestedPreset(
        effectiveEquipped.aircraft && effectiveEquipped.aircraft !== 'aircraft_none'
          ? 'aircraft'
          : 'full'
      );
    } else {
      setRequestedPreset('full');
    }
  };

  const handlePreviewItem = (item: PilotGearItem) => {
    playTileClick();
    setPreviewGear((prev) => ({
      ...prev,
      [item.slot]: item.id,
    }));
    if (item.slot === 'aircraft' && item.id !== 'aircraft_none') {
      setRequestedPreset('aircraft');
    }
  };

  const handleClearPreview = () => {
    playTileClick();
    setPreviewGear({});
  };

  const handleEquipOwned = async (item: PilotGearItem) => {
    playCorrectChime();
    setPreviewGear((prev) => {
      const next = { ...prev };
      delete next[item.slot];
      return next;
    });
    await equipPilotGear(item.slot, item.id);
    if (item.slot === 'aircraft') {
      setRequestedPreset(item.id === 'aircraft_none' ? 'full' : 'aircraft');
    }
    setCelebrateCounter((c) => c + 1);
  };

  const handlePurchase = async (item: PilotGearItem) => {
    if (purchasingId) return;
    setPurchasingId(item.id);
    try {
      const ok = await purchasePilotGear(item.id);
      if (ok) {
        setPreviewGear((prev) => {
          const next = { ...prev };
          delete next[item.slot];
          return next;
        });
        if (item.slot === 'aircraft' && item.id !== 'aircraft_none') {
          playAircraftFlyby();
          setRequestedPreset('aircraft');
          setPurchasedAircraftEvent({ item, key: Date.now() });
        } else {
          playLevelFanfare();
        }
        setCelebrateCounter((c) => c + 1);
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const lessonQuests = useMemo(() => {
    return lessons
      .filter((l) => (questLevelFilter === 'ALL' ? true : l.levelId === questLevelFilter))
      .map((lesson) => ({
        lesson,
        gems: getLessonGemReward(lesson),
        completed: Boolean(progressMap[lesson.lessonId]?.lessonCompleted),
      }))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.gems - a.gems;
      })
      .slice(0, 8);
  }, [lessons, progressMap, questLevelFilter]);

  const nextMilestoneProgressPct = useMemo(() => {
    if (!gemBreakdown.nextMilestoneMinutes) return 100;
    const prevMilestone =
      STUDY_TIME_MILESTONES.filter((m) => m.minutes < gemBreakdown.nextMilestoneMinutes!).slice(-1)[0]
        ?.minutes ?? 0;
    const span = Math.max(1, gemBreakdown.nextMilestoneMinutes - prevMilestone);
    const done = Math.max(0, gemBreakdown.studyMinutes - prevMilestone);
    return Math.min(100, Math.round((done / span) * 100));
  }, [gemBreakdown.nextMilestoneMinutes, gemBreakdown.studyMinutes]);

  const previewBannerText = useMemo(() => {
    if (previewedUnownedItems.length === 0) return null;
    if (previewedUnownedItems.length === 1) {
      const only = previewedUnownedItems[0];
      return `Đang xem thử 3D: ${only.nameVi} (${only.priceGems.toLocaleString('vi-VN')} Ngọc)`;
    }
    const totalPrice = previewedUnownedItems.reduce((sum, i) => sum + i.priceGems, 0);
    return `Đang phối thử ${previewedUnownedItems.length} vật phẩm (Tổng ${totalPrice.toLocaleString('vi-VN')} Ngọc)`;
  }, [previewedUnownedItems]);

  const gemSources = [
    {
      label: 'Hoàn thành bài học (tùy độ khó & độ dài bài)',
      value: gemBreakdown.fromLessons,
      detail: `${gemBreakdown.completedLessonsCount} bài đã hoàn thành`,
      icon: GraduationCap,
      accent: 'text-[#D94E00] dark:text-[#FF8524]',
    },
    {
      label: 'Thời gian học tích lũy (+2 Ngọc/phút + quà tân binh)',
      value: gemBreakdown.fromStudyTime,
      detail: formatAccessDurationVi(profile?.totalAccessSeconds ?? 0),
      icon: Timer,
      accent: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Thưởng cột mốc thời gian học',
      value: gemBreakdown.fromTimeMilestones,
      detail: gemBreakdown.nextMilestoneMinutes
        ? `Mốc tới: ${gemBreakdown.nextMilestoneMinutes} phút (+${gemBreakdown.nextMilestoneBonus} Ngọc)`
        : 'Đã mở khóa toàn bộ mốc thời gian',
      icon: Award,
      accent: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Từ vựng đã thuộc (+3 Ngọc/từ)',
      value: gemBreakdown.fromVocabulary,
      detail: `${Math.round(gemBreakdown.fromVocabulary / 3)} từ vựng`,
      icon: BookOpen,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Điểm kiểm tra trắc nghiệm (tối đa +28 Ngọc/lần)',
      value: gemBreakdown.fromQuizzes,
      detail: 'Thưởng cao hơn khi đạt 100%',
      icon: CheckCircle2,
      accent: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Chuỗi ngày bay & Game từ vựng',
      value: gemBreakdown.fromStreak + gemBreakdown.fromGames,
      detail: `Chuỗi ${profile?.streakDays ?? 1} ngày · +${gemBreakdown.fromGames} Ngọc từ Game`,
      icon: Flame,
      accent: 'text-rose-600 dark:text-rose-400',
    },
  ];

  const renderShopCard = (item: PilotGearItem) => {
    const isOwned = ownedSet.has(item.id);
    const isEquipped = hangarState.equipped[item.slot] === item.id;
    const isPreviewing = previewGear[item.slot] === item.id;
    const canAfford = gemBreakdown.availableGems >= item.priceGems;
    const rarityMeta = PILOT_GEAR_RARITY_META[item.rarity];
    const missingGems = Math.max(0, item.priceGems - gemBreakdown.availableGems);
    const isAircraft = item.slot === 'aircraft';

    return (
      <div
        key={item.id}
        className={`rounded-xl border p-3.5 transition-all ${
          isEquipped
            ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10'
            : isPreviewing
              ? 'border-[#FF6B00] bg-[#FF6B00]/6 dark:bg-[#FF6B00]/10'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Dual-tone PBR material swatch */}
          <div
            className="w-11 h-11 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700 relative overflow-hidden flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${item.swatchHex} 0%, ${item.swatchHex} 58%, ${item.accentHex} 58%, ${item.accentHex} 100%)`,
            }}
          >
            {isAircraft && item.id !== 'aircraft_none' && (
              <span className="w-6 h-6 rounded-md bg-slate-950/65 text-white flex items-center justify-center">
                {item.aircraftCategory === 'spacecraft' ? (
                  <Rocket className="w-3.5 h-3.5" />
                ) : (
                  <Plane className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug truncate">
                  {item.nameVi}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={`font-semibold ${rarityMeta.textClass}`}>
                    {rarityMeta.labelVi}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.subtitleVi}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0 tabular-nums">
                {isOwned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    {isEquipped ? (isAircraft ? 'Đang triển khai' : 'Đang mặc') : 'Đã sở hữu'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm font-extrabold text-sky-600 dark:text-sky-400">
                    <Gem className="w-3.5 h-3.5" />
                    {item.priceGems.toLocaleString('vi-VN')}
                  </span>
                )}
              </div>
            </div>

            {item.specVi && (
              <div className="text-[11px] font-semibold text-[#D94E00] dark:text-[#FF8524]">
                {item.specVi}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {item.descriptionVi}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {isOwned ? (
                isEquipped ? (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {isAircraft
                      ? 'Đang đỗ trên sàn bay Hangar 3D'
                      : 'Đang hiển thị trên Phi công 3D'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleEquipOwned(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-bold transition-opacity cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isAircraft
                      ? item.id === 'aircraft_none'
                        ? 'Cất máy bay'
                        : 'Triển khai ra Hangar'
                      : 'Trang bị ngay'}
                  </button>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePreviewItem(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      isPreviewing
                        ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-[#D94E00] dark:text-[#FF8524]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isPreviewing ? 'Đang xem 3D' : isAircraft ? 'Xem thử 3D' : 'Thử 3D'}
                  </button>

                  <motion.button
                    type="button"
                    whileTap={canAfford ? { scale: 0.96 } : undefined}
                    disabled={!canAfford || purchasingId === item.id}
                    onClick={() => void handlePurchase(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      canAfford
                        ? 'bg-[#FF6B00] hover:bg-[#FF7E1F] text-white cursor-pointer'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? (
                      <>
                        <Gem className="w-3.5 h-3.5" />
                        {purchasingId === item.id
                          ? 'Đang mở khóa...'
                          : `Mua · ${item.priceGems.toLocaleString('vi-VN')} Ngọc`}
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Thiếu {missingGems.toLocaleString('vi-VN')} Ngọc
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <AircraftPurchaseAnimation
        purchaseEvent={purchasedAircraftEvent}
        onComplete={clearPurchaseAnimation}
      />

      {/* Top Gem Vault Header */}
      <section className="rounded-2xl bg-gradient-to-br from-[#07111F] via-[#0D1F38] to-[#132B4D] border border-slate-700/80 p-5 sm:p-7 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#FF8524]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Hangar Phi công & Phi đội Máy bay 3D</span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="text-sky-300">
                Trang bị: {unlockedGearCount}/{totalGearCount}
              </span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="text-amber-300">
                Máy bay: {unlockedAircraftCount}/{totalAircraftCount}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Cậu bé Pilot 3D & Gian hàng Phi đội
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tích lũy Ngọc kiến thức qua thời gian học và từng bài học A1–C1 để nâng cấp Phi công, nhận thú cưng đồng hành 3D và sở hữu phi đội máy bay chiến đấu huyền thoại từ Mỹ – Nga như UAV MQ-9 Reaper, B-2 Spirit, Su-57, Tu-160 đến tàu vũ trụ liên sao.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="rounded-xl bg-slate-900/80 border border-sky-500/35 px-5 py-3.5 min-w-[210px]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                Ngọc hiện có
              </div>
              <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                <Gem className="w-5 h-5 text-sky-400 self-center shrink-0" />
                <span className="text-3xl font-extrabold text-white">
                  {gemBreakdown.availableGems.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-semibold text-sky-300">Ngọc</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                Tổng tích lũy: {gemBreakdown.totalEarned.toLocaleString('vi-VN')} · Đã mua:{' '}
                {gemBreakdown.spentGems.toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="flex sm:flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('roadmap')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7E1F] text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                Học bài kiếm Ngọc
              </button>
              <button
                type="button"
                onClick={() => onNavigate('games')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-600 bg-slate-800/70 hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                Chơi Game (+2 Ngọc/từ)
              </button>
            </div>
          </div>
        </div>

        {/* Study Time Milestone Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 tabular-nums">
            <Clock className="w-4 h-4 text-[#FF8524] shrink-0" />
            <span>
              Thời gian học:{' '}
              <strong className="text-white">
                {formatAccessDurationVi(profile?.totalAccessSeconds ?? 0)}
              </strong>{' '}
              (+2 Ngọc/phút học)
            </span>
          </div>
          {gemBreakdown.nextMilestoneMinutes ? (
            <div className="flex items-center gap-3 sm:min-w-[280px]">
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-[#FF8524] rounded-full transition-all"
                  style={{ width: `${Math.max(4, nextMilestoneProgressPct)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-amber-300 tabular-nums whitespace-nowrap">
                Mốc {gemBreakdown.nextMilestoneMinutes}p: +{gemBreakdown.nextMilestoneBonus} Ngọc
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-emerald-400">
              Đã chinh phục toàn bộ mốc thưởng thời gian học!
            </span>
          )}
        </div>
      </section>

      {/* Main Split: 3D Pilot + Aircraft Hangar Viewport & Dual Store */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive 3D Hangar Stage */}
        <div className="xl:col-span-7 space-y-4">
          <Pilot3DCanvas
            equipped={effectiveEquipped}
            celebrateTrigger={celebrateCounter}
            requestedPreset={requestedPreset}
            previewBadgeText={previewBannerText}
            className="h-[460px] sm:h-[540px] xl:h-[580px]"
          />

          {/* Preview Action Strip OR Current Loadout Bar */}
          {previewedUnownedItems.length > 0 ? (
            <div className="rounded-xl border border-[#FF6B00]/40 bg-[#FF6B00]/8 dark:bg-[#FF6B00]/12 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-bold text-[#D94E00] dark:text-[#FF8524] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>Chế độ xem thử 3D trong Hangar</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {activePreviewItem
                    ? `${activePreviewItem.nameVi} — ${activePreviewItem.priceGems.toLocaleString('vi-VN')} Ngọc`
                    : previewedUnownedItems.map((i) => i.nameVi).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activePreviewItem && !ownedSet.has(activePreviewItem.id) && (
                  <button
                    type="button"
                    disabled={
                      gemBreakdown.availableGems < activePreviewItem.priceGems ||
                      purchasingId === activePreviewItem.id
                    }
                    onClick={() => void handlePurchase(activePreviewItem)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF6B00] hover:bg-[#FF7E1F] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Gem className="w-3.5 h-3.5" />
                    Mua ngay ({activePreviewItem.priceGems.toLocaleString('vi-VN')} Ngọc)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearPreview}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Bỏ xem thử
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Trang bị & Máy bay đang triển khai
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Nhấn mục bất kỳ để tùy biến
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {ALL_SLOT_ORDER.map((slot) => {
                  const equippedId = hangarState.equipped[slot];
                  const item = PILOT_GEAR_CATALOG.find((g) => g.id === equippedId);
                  const isActive =
                    slot === 'aircraft'
                      ? shopSection === 'aircraft'
                      : shopSection === 'gear' && activeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        if (slot === 'aircraft') {
                          handleSwitchShopSection('aircraft');
                        } else {
                          setShopSection('gear');
                          setActiveSlot(slot);
                        }
                      }}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                        isActive
                          ? 'border-[#FF6B00] bg-[#FF6B00]/8 dark:bg-[#FF6B00]/12'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {PILOT_GEAR_SLOT_LABELS[slot]}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                            style={{ backgroundColor: item.swatchHex }}
                          />
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item?.nameVi || 'Mặc định'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ambient Lo-Fi Study Beats Player */}
          <HangarLofiPlayer />
        </div>

        {/* Right: Dual Store (Pilot Wardrobe + Aircraft Fleet Showroom) */}
        <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
          {/* Primary Store Switcher: Trang bị Phi công vs Gian hàng Máy bay */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70">
            <button
              type="button"
              onClick={() => handleSwitchShopSection('gear')}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                shopSection === 'gear'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Trang bị Phi công</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchShopSection('aircraft')}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                shopSection === 'aircraft'
                  ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs ring-1 ring-[#FF6B00]/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plane className="w-4 h-4 shrink-0" />
              <span>Gian hàng Máy bay</span>
            </button>
          </div>

          {shopSection === 'gear' ? (
            <>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Cửa hàng Trang bị Phi công
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nhấn "Thử 3D" để ướm trực tiếp lên nhân vật trước khi đổi Ngọc.
                </p>
              </div>

              {/* 6 Personal Gear Category Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PERSONAL_SLOT_ORDER.map((slot) => {
                  const slotItems = PILOT_GEAR_CATALOG.filter((g) => g.slot === slot);
                  const ownedInSlot = slotItems.filter((g) => ownedSet.has(g.id)).length;
                  const isSelected = activeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setActiveSlot(slot)}
                      className={`px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#FF6B00] bg-[#FF6B00] text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-[#FF6B00]/40'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">
                        {PILOT_GEAR_SLOT_LABELS[slot]}
                      </div>
                      <div
                        className={`text-[11px] tabular-nums ${
                          isSelected ? 'text-orange-100' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {ownedInSlot}/{slotItems.length} đã mở
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {itemsInSlot.map(renderShopCard)}
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-[#FF6B00]" />
                  Gian hàng Máy bay 3D (6 Hạng)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đủ bộ Trực thăng, UAV không người lái, Tiêm kích &amp; Oanh tạc cơ chiến lược Mỹ – Nga (MQ-9 Reaper, B-2 Spirit, SR-71, Su-57, Tu-160...) — nhấn &ldquo;Xem thử 3D&rdquo; để đưa ngay ra sàn bay.
                </p>
              </div>

              {/* Aircraft Tier Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAircraftFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    aircraftFilter === 'ALL'
                      ? 'border-[#FF6B00] bg-[#FF6B00] text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-[#FF6B00]/40'
                  }`}
                >
                  Tất cả ({totalAircraftCount})
                </button>
                {AIRCRAFT_CATEGORY_ORDER.map((cat) => {
                  const isSelected = aircraftFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAircraftFilter(cat)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#FF6B00] bg-[#FF6B00] text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-[#FF6B00]/40'
                      }`}
                    >
                      {AIRCRAFT_CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredAircrafts.map(renderShopCard)}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Bottom Split: Gem Breakdown Ledger + Lesson-by-Lesson Gem Rewards */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Transparent Knowledge-to-Gems Breakdown */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Gem className="w-4 h-4 text-sky-500" />
              Bảng tính Ngọc Kiến Thức
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ngọc tự động tăng lên mỗi phút bạn học, mỗi từ vựng ghi nhớ và mỗi bài học hoàn tất.
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {gemSources.map((src) => {
              const Icon = src.icon;
              return (
                <div key={src.label} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${src.accent}`} />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {src.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {src.detail}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400 tabular-nums shrink-0">
                    +{src.value.toLocaleString('vi-VN')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Study Time Milestones List */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cột mốc thưởng thời gian học
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STUDY_TIME_MILESTONES.map((m) => {
                const reached = gemBreakdown.studyMinutes >= m.minutes;
                return (
                  <div
                    key={m.minutes}
                    className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      reached
                        ? 'border-emerald-500/40 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate font-medium">
                      {reached ? '✓ ' : ''}
                      {m.labelVi}
                    </span>
                    <span className="font-bold tabular-nums shrink-0">+{m.bonusGems} Ngọc</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Lesson-Dependent Gem Rewards Picker */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Nhiệm vụ bài học kiếm nhiều Ngọc
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bài cấp độ càng cao (B1, B2, C1, Chuyên ngành) và nhiều từ vựng sẽ thưởng số Ngọc càng lớn.
              </p>
            </div>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start">
              {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'ESP'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setQuestLevelFilter(lvl)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    questLevelFilter === lvl
                      ? 'bg-white dark:bg-slate-900 text-[#D94E00] dark:text-[#FF8524] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl === 'ALL' ? 'Tất cả' : lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lessonQuests.map(({ lesson, gems, completed }) => (
              <div
                key={lesson.lessonId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-[#D94E00] dark:text-[#FF8524]">
                      {lesson.levelId}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      {lesson.topic}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                      {lesson.estimatedMinutes} phút · {lesson.vocabulary.length} từ
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {lesson.title}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-extrabold tabular-nums ${
                      completed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-sky-600 dark:text-sky-400'
                    }`}
                  >
                    <Gem className="w-3.5 h-3.5" />
                    {completed ? `Đã nhận +${gems}` : `+${gems} Ngọc`}
                  </span>

                  <button
                    type="button"
                    onClick={() => onOpenLesson(lesson.lessonId)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      completed
                        ? 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        : 'bg-[#FF6B00] hover:bg-[#FF7E1F] text-white'
                    }`}
                  >
                    {completed ? 'Ôn lại' : 'Học ngay'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
