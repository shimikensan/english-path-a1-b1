import type { LevelDoc } from '../types';

export const APP_BRAND = {
  fullName: 'Học tiếng Anh cùng Cậu bé Pilot',
  shortName: 'Cậu bé Pilot',
  tagline: 'Đường bay tiếng Anh CEFR A1–B1',
  copyright: 'VanBien@copyright',
} as const;

export const PILOT_RANKS: Record<string, { stage: string; rankVi: string; callsign: string }> = {
  A1: { stage: 'Chặng 1 · Cất cánh', rankVi: 'Học viên Phi công', callsign: 'Cadet' },
  A2: { stage: 'Chặng 2 · Vượt mây', rankVi: 'Cơ phó', callsign: 'First Officer' },
  B1: { stage: 'Chặng 3 · Chinh phục bầu trời', rankVi: 'Cơ trưởng', callsign: 'Captain' },
};

export const AUTH_HERO_IMAGE = '/src/assets/images/pilot_boy_auth_hero_1795055571818.jpg';

export const LEVEL_BANNERS: Record<string, string> = {
  A1: '/src/assets/images/pilot_level_a1_runway_1795055570904.jpg',
  A2: '/src/assets/images/pilot_level_a2_clouds_1795055572291.jpg',
  B1: '/src/assets/images/pilot_level_b1_horizon_1795055571975.jpg',
};

export const DEFAULT_LEVELS: LevelDoc[] = [
  {
    levelId: 'A1',
    name: 'Level A1 — Beginner',
    subtitle: 'Nền tảng giao tiếp cơ bản hằng ngày',
    description:
      'Làm chủ 10 chủ đề thiết yếu từ chào hỏi, thời gian, gia đình, nghề nghiệp đến mua sắm và địa điểm trong thành phố. Phù hợp người mới bắt đầu hoặc mất gốc.',
    order: 1,
    isPublished: true,
  },
  {
    levelId: 'A2',
    name: 'Level A2 — Elementary',
    subtitle: 'Mở rộng diễn đạt quá khứ, du lịch & công việc',
    description:
      'Phát triển khả năng kể chuyện quá khứ, lên kế hoạch tương lai, so sánh, giao tiếp khi đi du lịch, chăm sóc sức khỏe và trao đổi trong học tập, công sở.',
    order: 2,
    isPublished: true,
  },
  {
    levelId: 'B1',
    name: 'Level B1 — Intermediate',
    subtitle: 'Giao tiếp độc lập, tranh luận & tiếng Anh học thuật – công việc',
    description:
      'Tự tin thảo luận về giao tiếp, môi trường, văn hóa, xã hội, phát triển bản thân, truyền thông và kinh doanh với cấu trúc ngữ pháp trung cấp chuẩn CEFR.',
    order: 3,
    isPublished: true,
  },
];
