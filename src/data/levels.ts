import type { LevelDoc } from '../types';

export const AUTH_HERO_IMAGE = '/src/assets/images/auth_hero_study_1795052122824.jpg';

export const LEVEL_BANNERS: Record<string, string> = {
  A1: '/src/assets/images/level_a1_banner_1795052117279.jpg',
  A2: '/src/assets/images/level_a2_banner_1795052120535.jpg',
  B1: '/src/assets/images/level_b1_banner_1795052119872.jpg',
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
