import type {
  LessonDoc,
  QuizResultDoc,
  UserProfile,
  UserProgressDoc,
  UserVocabularyDoc,
} from '../types';

export type PilotGearSlot =
  | 'helmet'
  | 'goggles'
  | 'suit'
  | 'scarf'
  | 'backpack'
  | 'companion'
  | 'aircraft';

export type AircraftCategory = 'helicopter' | 'civilian' | 'fighter' | 'spacecraft';

export type PilotGearRarity = 'starter' | 'rare' | 'epic' | 'legendary';

export interface PilotGearItem {
  id: string;
  slot: PilotGearSlot;
  nameVi: string;
  subtitleVi: string;
  descriptionVi: string;
  priceGems: number;
  rarity: PilotGearRarity;
  swatchHex: string;
  accentHex: string;
  aircraftCategory?: AircraftCategory;
  specVi?: string;
}

export interface EquippedPilotGear {
  helmet: string;
  goggles: string;
  suit: string;
  scarf: string;
  backpack: string;
  companion: string;
  aircraft: string;
}

export interface PilotHangarState {
  ownedItemIds: string[];
  equipped: EquippedPilotGear;
  spentGems: number;
  bonusGems: number;
}

export interface GemBreakdown {
  fromLessons: number;
  fromStudyTime: number;
  fromTimeMilestones: number;
  fromVocabulary: number;
  fromQuizzes: number;
  fromStreak: number;
  fromGames: number;
  totalEarned: number;
  spentGems: number;
  availableGems: number;
  completedLessonsCount: number;
  studyMinutes: number;
  nextMilestoneMinutes: number | null;
  nextMilestoneBonus: number;
}

export const DEFAULT_EQUIPPED_GEAR: EquippedPilotGear = {
  helmet: 'helmet_cadet',
  goggles: 'goggles_classic',
  suit: 'suit_bomber',
  scarf: 'scarf_white',
  backpack: 'backpack_none',
  companion: 'companion_none',
  aircraft: 'aircraft_none',
};

export const DEFAULT_OWNED_ITEMS: string[] = [
  'helmet_cadet',
  'goggles_classic',
  'suit_bomber',
  'scarf_white',
  'backpack_none',
  'companion_none',
  'aircraft_none',
];

export const DEFAULT_HANGAR_STATE: PilotHangarState = {
  ownedItemIds: [...DEFAULT_OWNED_ITEMS],
  equipped: { ...DEFAULT_EQUIPPED_GEAR },
  spentGems: 0,
  bonusGems: 0,
};

export const PILOT_GEAR_SLOT_LABELS: Record<PilotGearSlot, string> = {
  helmet: 'Mũ bay',
  goggles: 'Kính phi công',
  suit: 'Trang phục',
  scarf: 'Khăn & Áo choàng',
  backpack: 'Phản lực & Cánh',
  companion: 'Bạn đồng hành',
  aircraft: 'Máy bay Hangar',
};

export const AIRCRAFT_CATEGORY_LABELS: Record<AircraftCategory, string> = {
  helicopter: 'Trực thăng',
  civilian: 'Máy bay dân dụng',
  fighter: 'Tiêm kích',
  spacecraft: 'Tàu vũ trụ',
};

export const PILOT_GEAR_RARITY_META: Record<
  PilotGearRarity,
  { labelVi: string; textClass: string }
> = {
  starter: {
    labelVi: 'Mặc định',
    textClass: 'text-slate-500 dark:text-slate-400',
  },
  rare: {
    labelVi: 'Hiếm',
    textClass: 'text-sky-600 dark:text-sky-400',
  },
  epic: {
    labelVi: 'Sử thi',
    textClass: 'text-violet-600 dark:text-violet-400',
  },
  legendary: {
    labelVi: 'Huyền thoại',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
};

export const PILOT_GEAR_CATALOG: PilotGearItem[] = [
  // --- HELMETS ---
  {
    id: 'helmet_cadet',
    slot: 'helmet',
    nameVi: 'Mũ Phi công Tập sự',
    subtitleVi: 'Da nâu cổ điển · Tai nghe đồng',
    descriptionVi: 'Chiếc mũ da phi công truyền thống gọn nhẹ, sẵn sàng cho những chặng bay đầu tiên.',
    priceGems: 0,
    rarity: 'starter',
    swatchHex: '#7A4A2B',
    accentHex: '#D99B38',
  },
  {
    id: 'helmet_captain',
    slot: 'helmet',
    nameVi: 'Mũ Cơ trưởng Hải quân',
    subtitleVi: 'Lưỡi trai xanh đậm · Viền vàng kim',
    descriptionVi: 'Biểu tượng uy nghiêm của cơ trưởng với phù hiệu đôi cánh vàng sáng bóng.',
    priceGems: 60,
    rarity: 'rare',
    swatchHex: '#132743',
    accentHex: '#F5C451',
  },
  {
    id: 'helmet_jet',
    slot: 'helmet',
    nameVi: 'Mũ Phản lực Siêu thanh',
    subtitleVi: 'Vỏ gốm trắng bóng · Sọc cam khí động',
    descriptionVi: 'Thiết kế khí động học chịu áp suất tầng bình lưu kèm micro liên lạc không lưu.',
    priceGems: 140,
    rarity: 'epic',
    swatchHex: '#F1F5F9',
    accentHex: '#FF6B00',
  },
  {
    id: 'helmet_astro',
    slot: 'helmet',
    nameVi: 'Mũ Chỉ huy Vũ trụ',
    subtitleVi: 'Titan đen bóng · Vòng hào quang vàng',
    descriptionVi: 'Mũ bay thế hệ tương lai có vòng định vị phát sáng dành cho phi công bậc thầy.',
    priceGems: 260,
    rarity: 'legendary',
    swatchHex: '#0F172A',
    accentHex: '#38BDF8',
  },

  // --- GOGGLES ---
  {
    id: 'goggles_classic',
    slot: 'goggles',
    nameVi: 'Kính Phi công Cổ điển',
    subtitleVi: 'Gọng đồng · Tròng xanh biển',
    descriptionVi: 'Cặp kính gió tròn viền kim loại cổ điển bảo vệ tầm nhìn giữa tầng mây.',
    priceGems: 0,
    rarity: 'starter',
    swatchHex: '#B47B38',
    accentHex: '#38BDF8',
  },
  {
    id: 'goggles_aviator_gold',
    slot: 'goggles',
    nameVi: 'Kính râm Aviator Vàng',
    subtitleVi: 'Tròng tráng gương · Gọng mạ vàng',
    descriptionVi: 'Phong cách phi công huyền thoại chống chói nắng trên đường băng rực rỡ.',
    priceGems: 50,
    rarity: 'rare',
    swatchHex: '#F59E0B',
    accentHex: '#FEF08A',
  },
  {
    id: 'goggles_hud_cyan',
    slot: 'goggles',
    nameVi: 'Kính HUD Điện tử Xanh',
    subtitleVi: 'Màn hình hiển thị thông số bay',
    descriptionVi: 'Kính chiến thuật phát sáng xanh lam hiển thị độ cao, tốc độ và từ vựng trực tiếp.',
    priceGems: 130,
    rarity: 'epic',
    swatchHex: '#06B6D4',
    accentHex: '#67E8F9',
  },
  {
    id: 'goggles_solar_visor',
    slot: 'goggles',
    nameVi: 'Kính Hoàng hôn Siêu thanh',
    subtitleVi: 'Tấm chắn ánh cam hổ phách phản quang',
    descriptionVi: 'Tấm kính che toàn mắt ánh vàng cam rực rỡ như bình minh trên tầng bình lưu.',
    priceGems: 220,
    rarity: 'legendary',
    swatchHex: '#FF6B00',
    accentHex: '#FDE047',
  },

  // --- SUITS ---
  {
    id: 'suit_bomber',
    slot: 'suit',
    nameVi: 'Áo khoác Da Phi công',
    subtitleVi: 'Da bò ấm áp · Cổ lông cừu kem',
    descriptionVi: 'Chiếc áo khoác bomber huyền thoại gắn liền với hình ảnh Cậu bé Pilot.',
    priceGems: 0,
    rarity: 'starter',
    swatchHex: '#8B4F2B',
    accentHex: '#F5E6D3',
  },
  {
    id: 'suit_navy_captain',
    slot: 'suit',
    nameVi: 'Đồng phục Cơ trưởng Navy',
    subtitleVi: 'Vest xanh tím than · 4 vạch cầu vai vàng',
    descriptionVi: 'Bộ lễ phục hàng không lịch lãm với cà vạt tối màu và phù hiệu đôi cánh.',
    priceGems: 80,
    rarity: 'rare',
    swatchHex: '#172554',
    accentHex: '#FACC15',
  },
  {
    id: 'suit_orange_test',
    slot: 'suit',
    nameVi: 'Bộ đồ bay Cam Phản lực',
    subtitleVi: 'Cam tín hiệu · Đai bảo hộ đen',
    descriptionVi: 'Trang phục chuyên dụng của phi công thử nghiệm máy bay tốc độ cao.',
    priceGems: 160,
    rarity: 'epic',
    swatchHex: '#EA580C',
    accentHex: '#1E293B',
  },
  {
    id: 'suit_platinum_ace',
    slot: 'suit',
    nameVi: 'Giáp bay Bạch kim Vũ trụ',
    subtitleVi: 'Trắng ngọc trai · Lõi năng lượng xanh',
    descriptionVi: 'Bộ giáp bay công nghệ cao phát sáng lõi ngực, dành riêng cho học viên kiên trì.',
    priceGems: 300,
    rarity: 'legendary',
    swatchHex: '#E2E8F0',
    accentHex: '#0EA5E9',
  },

  // --- SCARF / CAPE ---
  {
    id: 'scarf_white',
    slot: 'scarf',
    nameVi: 'Khăn lụa Trắng Cổ điển',
    subtitleVi: 'Lụa mềm tung bay trong gió',
    descriptionVi: 'Chiếc khăn choàng trắng đặc trưng phấp phới mỗi khi máy bay lăn bánh.',
    priceGems: 0,
    rarity: 'starter',
    swatchHex: '#F8FAFC',
    accentHex: '#CBD5E1',
  },
  {
    id: 'scarf_crimson',
    slot: 'scarf',
    nameVi: 'Khăn Đỏ Hỏa tiễn',
    subtitleVi: 'Đỏ rực nhiệt huyết · Viền cam',
    descriptionVi: 'Tạo điểm nhấn nổi bật đầy năng lượng giữa bầu trời xanh thẳm.',
    priceGems: 45,
    rarity: 'rare',
    swatchHex: '#DC2626',
    accentHex: '#FB923C',
  },
  {
    id: 'scarf_gold',
    slot: 'scarf',
    nameVi: 'Khăn Hoàng kim Chiến thắng',
    subtitleVi: 'Sợi kim tuyến vàng rực rỡ',
    descriptionVi: 'Phần thưởng xứng đáng cho những chuỗi ngày học tiếng Anh không ngơi nghỉ.',
    priceGems: 110,
    rarity: 'epic',
    swatchHex: '#EAB308',
    accentHex: '#FEF08A',
  },
  {
    id: 'scarf_aero_cape',
    slot: 'scarf',
    nameVi: 'Áo choàng Năng lượng Lam',
    subtitleVi: 'Áo choàng bay viền phát sáng xanh',
    descriptionVi: 'Chiếc áo choàng khí động phủ sau lưng giúp phi công tỏa sáng như siêu anh hùng.',
    priceGems: 210,
    rarity: 'legendary',
    swatchHex: '#1D4ED8',
    accentHex: '#38BDF8',
  },

  // --- BACKPACK / WINGS ---
  {
    id: 'backpack_none',
    slot: 'backpack',
    nameVi: 'Gọn nhẹ (Không mang)',
    subtitleVi: 'Tối giản di chuyển linh hoạt',
    descriptionVi: 'Giữ dáng đứng gọn gàng, khoe trọn bộ trang phục phi công phía sau.',
    priceGems: 0,
    rarity: 'starter',
    swatchHex: '#64748B',
    accentHex: '#94A3B8',
  },
  {
    id: 'backpack_chute',
    slot: 'backpack',
    nameVi: 'Ba lô Dù bay Cổ điển',
    subtitleVi: 'Vải dù kaki · Khóa thép chắc chắn',
    descriptionVi: 'Túi dù an toàn tiêu chuẩn mang đậm chất phiêu lưu bầu trời.',
    priceGems: 70,
    rarity: 'rare',
    swatchHex: '#4D7C5D',
    accentHex: '#D97706',
  },
  {
    id: 'backpack_jetpack',
    slot: 'backpack',
    nameVi: 'Động cơ Phản lực Đôi',
    subtitleVi: 'Titan phay xước · Vòi phun ánh lam',
    descriptionVi: 'Cặp ống phản lực kép phát sáng năng lượng xanh giúp cất cánh tức thì.',
    priceGems: 180,
    rarity: 'epic',
    swatchHex: '#475569',
    accentHex: '#38BDF8',
  },
  {
    id: 'backpack_wings',
    slot: 'backpack',
    nameVi: 'Đôi cánh Cơ khí Phượng hoàng',
    subtitleVi: 'Cánh sải kim loại · Đèn dẫn hướng cam',
    descriptionVi: 'Tuyệt tác cánh cơ khí sải rộng gắn đèn định vị cam rực rỡ trên bục hangar.',
    priceGems: 320,
    rarity: 'legendary',
    swatchHex: '#F8FAFC',
    accentHex: '#FF6B00',
  },

  // --- COMPANION ---
  {
    id: 'companion_none',
    slot: 'companion',
    nameVi: 'Chưa trang bị',
    subtitleVi: 'Bay độc lập một mình',
    descriptionVi: 'Chọn thêm bạn đồng hành bay lượn xung quanh nhân vật phi công 3D của bạn.',
    priceGems: 0,
    rarity: 'starter',
    swatchHex: '#64748B',
    accentHex: '#94A3B8',
  },
  {
    id: 'companion_biplane',
    slot: 'companion',
    nameVi: 'Máy bay Cánh quạt Mini',
    subtitleVi: 'Cánh đôi màu cam · Chóng xoay liên tục',
    descriptionVi: 'Mô hình phi cơ cánh quạt đáng yêu bay lượn vòng tròn bên cạnh phi công.',
    priceGems: 90,
    rarity: 'rare',
    swatchHex: '#FF6B00',
    accentHex: '#FACC15',
  },
  {
    id: 'companion_drone',
    slot: 'companion',
    nameVi: 'Drone Radar Hộ vệ',
    subtitleVi: '4 cánh quạt · Mắt quét xanh lam',
    descriptionVi: 'Thiết bị bay thông minh lơ lửng theo sát hỗ trợ dẫn đường và nhắc bài.',
    priceGems: 200,
    rarity: 'epic',
    swatchHex: '#0F172A',
    accentHex: '#22D3EE',
  },
  {
    id: 'companion_crystal',
    slot: 'companion',
    nameVi: 'Vệ tinh Ngọc Năng lượng',
    subtitleVi: 'Khối pha lê đa diện phát sáng vàng lam',
    descriptionVi: 'Viên ngọc trí tuệ quay quanh quỹ đạo tỏa ánh sáng kết tinh từ kiến thức.',
    priceGems: 340,
    rarity: 'legendary',
    swatchHex: '#0EA5E9',
    accentHex: '#FBBF24',
  },

  // 7. AIRCRAFT FLEET (Helicopter -> Civilian -> Fighter Jet -> Spacecraft)
  {
    id: 'aircraft_none',
    slot: 'aircraft',
    nameVi: 'Chưa triển khai máy bay',
    subtitleVi: 'Sàn xoay trống · Chỉ hiển thị Phi công 3D',
    descriptionVi: 'Tạm cất máy bay vào nhà chứa để ngắm cận cảnh trang phục nhân vật Phi công.',
    priceGems: 0,
    rarity: 'starter',
    swatchHex: '#334155',
    accentHex: '#94A3B8',
  },
  {
    id: 'aircraft_heli_scout',
    slot: 'aircraft',
    aircraftCategory: 'helicopter',
    nameVi: 'Trực thăng Trinh sát H-120',
    subtitleVi: 'Trực thăng · Cánh quạt 4 lá xoay liên tục',
    specVi: 'Tốc độ 260 km/h · Trần bay 4.500 m',
    descriptionVi: 'Trực thăng hạng nhẹ sơn xanh hàng không với cabin kính vòm rộng và càng trượt đôi linh hoạt.',
    priceGems: 160,
    rarity: 'rare',
    swatchHex: '#0284C7',
    accentHex: '#FF8524',
  },
  {
    id: 'aircraft_heli_rescue',
    slot: 'aircraft',
    aircraftCategory: 'helicopter',
    nameVi: 'Trực thăng Cứu hộ Viper-9',
    subtitleVi: 'Trực thăng · Rô-to 5 lá & đèn pha tìm kiếm',
    specVi: 'Tốc độ 310 km/h · 2 thùng nhiên liệu hông',
    descriptionVi: 'Phiên bản trực thăng tuần tra cứu hộ màu đỏ-trắng nổi bật kèm đèn rọi công suất cao.',
    priceGems: 260,
    rarity: 'rare',
    swatchHex: '#DC2626',
    accentHex: '#F8FAFC',
  },
  {
    id: 'aircraft_civil_prop',
    slot: 'aircraft',
    aircraftCategory: 'civilian',
    nameVi: 'Phi cơ Cá nhân Cessna Skyhawk',
    subtitleVi: 'Dân dụng · Cánh cao & cánh quạt mũi',
    specVi: 'Tốc độ 230 km/h · Tầm bay 1.185 km',
    descriptionVi: 'Máy bay huấn luyện dân dụng kinh điển, cánh quạt trước xoay mượt và bánh đáp 3 điểm chuẩn xác.',
    priceGems: 340,
    rarity: 'rare',
    swatchHex: '#F8FAFC',
    accentHex: '#0284C7',
  },
  {
    id: 'aircraft_civil_airliner',
    slot: 'aircraft',
    aircraftCategory: 'civilian',
    nameVi: 'Máy bay Dân dụng A350 SkyLiner',
    subtitleVi: 'Dân dụng · 2 động cơ tuabin phản lực',
    specVi: 'Tốc độ 910 km/h · Xuyên lục địa 15.000 km',
    descriptionVi: 'Chuyên cơ chở khách thân rộng với cánh xuôi đầu cong winglet cam và cặp động cơ tuabin phát sáng.',
    priceGems: 520,
    rarity: 'epic',
    swatchHex: '#F8FAFC',
    accentHex: '#0F2B5B',
  },
  {
    id: 'aircraft_fighter_falcon',
    slot: 'aircraft',
    aircraftCategory: 'fighter',
    nameVi: 'Tiêm kích F-16 Chim Ưng',
    subtitleVi: 'Tiêm kích · Buồng lái mạ vàng & đốt sau',
    specVi: 'Tốc độ Mach 2.0 · Trần bay 15.200 m',
    descriptionVi: 'Chiến đấu cơ siêu thanh cánh tam giác sắc lẹm cùng luồng đốt sau (afterburner) rực lửa.',
    priceGems: 750,
    rarity: 'epic',
    swatchHex: '#64748B',
    accentHex: '#0EA5E9',
  },
  {
    id: 'aircraft_fighter_stealth',
    slot: 'aircraft',
    aircraftCategory: 'fighter',
    nameVi: 'Tiêm kích Tàng hình F-22 Bóng Đêm',
    subtitleVi: 'Tiêm kích · Đa diện tàng hình & đuôi chữ V',
    specVi: 'Tốc độ Mach 2.25 · Động cơ vector đôi',
    descriptionVi: 'Tiêm kích thế hệ 5 phủ sơn đen titan viền cam neon với cặp ống xả plasma xanh siêu cơ động.',
    priceGems: 1050,
    rarity: 'legendary',
    swatchHex: '#1E293B',
    accentHex: '#FF6B00',
  },
  {
    id: 'aircraft_space_shuttle',
    slot: 'aircraft',
    aircraftCategory: 'spacecraft',
    nameVi: 'Tàu Con thoi Quỹ đạo Explorer',
    subtitleVi: 'Tàu vũ trụ · Gốm chịu nhiệt & 3 động cơ tên lửa',
    specVi: 'Tốc độ 28.000 km/h · Quỹ đạo Trái Đất',
    descriptionVi: 'Tàu con thoi du hành không gian thân trắng bụng gốm đen cùng cụm 3 động cơ đẩy phát sáng xanh dương.',
    priceGems: 1400,
    rarity: 'legendary',
    swatchHex: '#F1F5F9',
    accentHex: '#2563EB',
  },
  {
    id: 'aircraft_space_starship',
    slot: 'aircraft',
    aircraftCategory: 'spacecraft',
    nameVi: 'Phi thuyền Liên sao Nova-X',
    subtitleVi: 'Tàu vũ trụ · Vòng năng lượng lượng tử xoay',
    specVi: 'Tốc độ Warp · Du hành Liên hành tinh',
    descriptionVi: 'Chiến hạm vũ trụ tối thượng chế tác từ titan và vàng, trang bị vòng lượng tử quay liên tục cùng động cơ ion.',
    priceGems: 1950,
    rarity: 'legendary',
    swatchHex: '#E2E8F0',
    accentHex: '#22D3EE',
  },
];

export const PILOT_AIRCRAFT_CATALOG: PilotGearItem[] = PILOT_GEAR_CATALOG.filter(
  (item) => item.slot === 'aircraft'
);

export const PILOT_GEAR_BY_ID: Record<string, PilotGearItem> = Object.fromEntries(
  PILOT_GEAR_CATALOG.map((item) => [item.id, item])
);

// --- Lesson-Dependent & Time-Based Gem Reward System ---

const LEVEL_BASE_GEMS: Record<string, number> = {
  A1: 20,
  A2: 30,
  B1: 45,
  B2: 60,
  C1: 80,
  ESP: 75,
  TOEIC: 65,
};

/**
 * Each lesson yields a distinct Gem reward based on its CEFR difficulty,
 * estimated duration, and vocabulary volume.
 */
export function getLessonGemReward(lesson: Pick<LessonDoc, 'levelId' | 'estimatedMinutes' | 'vocabulary'>): number {
  const base = LEVEL_BASE_GEMS[lesson.levelId] ?? 25;
  const durationBonus = Math.round(Math.max(5, lesson.estimatedMinutes || 15) * 0.8);
  const vocabBonus = Math.min(20, lesson.vocabulary?.length ?? 0);
  return base + durationBonus + vocabBonus;
}

export const STUDY_TIME_MILESTONES: Array<{ minutes: number; bonusGems: number; labelVi: string }> = [
  { minutes: 10, bonusGems: 15, labelVi: 'Khởi động 10 phút' },
  { minutes: 30, bonusGems: 30, labelVi: 'Tập trung 30 phút' },
  { minutes: 60, bonusGems: 65, labelVi: 'Chặng bay 1 giờ' },
  { minutes: 180, bonusGems: 150, labelVi: 'Phi công bền bỉ 3 giờ' },
  { minutes: 600, bonusGems: 400, labelVi: 'Cơ trưởng kỳ cựu 10 giờ' },
];

export function computeGemBreakdown(params: {
  profile: UserProfile | null;
  lessons: LessonDoc[];
  progressMap: Record<string, UserProgressDoc>;
  vocabMap: Record<string, UserVocabularyDoc>;
  quizResults: QuizResultDoc[];
  bonusGems: number;
  spentGems: number;
}): GemBreakdown {
  const { profile, lessons, progressMap, vocabMap, quizResults, bonusGems, spentGems } = params;

  const lessonById = new Map<string, LessonDoc>();
  for (const l of lessons) {
    lessonById.set(l.lessonId, l);
  }

  let fromLessons = 0;
  let completedLessonsCount = 0;
  for (const prog of Object.values(progressMap)) {
    const lesson = lessonById.get(prog.lessonId);
    if (prog.lessonCompleted) {
      completedLessonsCount++;
      fromLessons += lesson
        ? getLessonGemReward(lesson)
        : (LEVEL_BASE_GEMS[prog.levelId] ?? 25) + 15;
    } else if ((prog.vocabularyLearned?.length ?? 0) >= 3) {
      // Partial engagement credit for actively studying a lesson
      fromLessons += 6;
    }
  }

  const totalAccessSeconds = Math.max(0, Math.floor(profile?.totalAccessSeconds ?? 0));
  const studyMinutes = Math.floor(totalAccessSeconds / 60);
  // +2 Gems per minute (+1 every 30s) so learners feel steady growth as they spend time learning
  const fromStudyTime = Math.floor(totalAccessSeconds / 30);

  let fromTimeMilestones = 0;
  let nextMilestoneMinutes: number | null = null;
  let nextMilestoneBonus = 0;
  for (const m of STUDY_TIME_MILESTONES) {
    if (studyMinutes >= m.minutes) {
      fromTimeMilestones += m.bonusGems;
    } else if (nextMilestoneMinutes === null) {
      nextMilestoneMinutes = m.minutes;
      nextMilestoneBonus = m.bonusGems;
    }
  }

  const learnedVocabCount = Object.values(vocabMap).filter((v) => v.isLearned).length;
  const fromVocabulary = learnedVocabCount * 3;

  let fromQuizzes = 0;
  for (const r of quizResults) {
    const scoreGems = Math.round((Math.max(0, Math.min(100, r.score)) / 100) * 20);
    const perfectBonus = r.score >= 100 ? 8 : 0;
    fromQuizzes += scoreGems + perfectBonus;
  }

  const streakDays = Math.max(0, profile?.streakDays ?? 0);
  const fromStreak = streakDays * 10 + (streakDays >= 7 ? 50 : 0);

  const safeBonus = Math.max(0, Math.floor(bonusGems));
  const safeSpent = Math.max(0, Math.floor(spentGems));
  // Starter welcome gift of 30 gems so new learners immediately see their vault alive
  const welcomeBonus = profile ? 30 : 0;

  const totalEarned =
    welcomeBonus +
    fromLessons +
    fromStudyTime +
    fromTimeMilestones +
    fromVocabulary +
    fromQuizzes +
    fromStreak +
    safeBonus;

  return {
    fromLessons,
    fromStudyTime: fromStudyTime + welcomeBonus,
    fromTimeMilestones,
    fromVocabulary,
    fromQuizzes,
    fromStreak,
    fromGames: safeBonus,
    totalEarned,
    spentGems: safeSpent,
    availableGems: Math.max(0, totalEarned - safeSpent),
    completedLessonsCount,
    studyMinutes,
    nextMilestoneMinutes,
    nextMilestoneBonus,
  };
}

/**
 * Fallback deterministic Knowledge Gem estimate for leaderboard rows whose
 * `gemsEarned` field has not been freshly synced from the learner's device yet.
 */
export function estimateLeaderboardGems(entry: {
  gemsEarned?: number;
  completedLessons: number;
  learnedVocabCount: number;
  averageQuizScore: number;
  streakDays: number;
  totalAccessSeconds?: number;
}): number {
  if (typeof entry.gemsEarned === 'number' && Number.isFinite(entry.gemsEarned) && entry.gemsEarned >= 0) {
    return Math.floor(entry.gemsEarned);
  }
  const welcome = 30;
  const fromLessons = Math.max(0, entry.completedLessons) * 45;
  const fromVocab = Math.max(0, entry.learnedVocabCount) * 3;
  const sec = Math.max(0, Math.floor(entry.totalAccessSeconds ?? 0));
  const mins = Math.floor(sec / 60);
  const fromTime = Math.floor(sec / 30);
  let fromMilestones = 0;
  for (const m of STUDY_TIME_MILESTONES) {
    if (mins >= m.minutes) fromMilestones += m.bonusGems;
  }
  const streak = Math.max(0, entry.streakDays);
  const fromStreak = streak * 10 + (streak >= 7 ? 50 : 0);
  const fromQuizEst =
    entry.averageQuizScore > 0 && entry.completedLessons > 0
      ? Math.round((entry.averageQuizScore / 100) * 20) * entry.completedLessons
      : 0;
  return welcome + fromLessons + fromVocab + fromTime + fromMilestones + fromStreak + fromQuizEst;
}
